// ==============================
// MiniFish (웹소설 미니 물고기) - 웹소설 관련
// ==============================

// 팝업 효과를 위한 이징 함수
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * pow(t - 1, 3) + c1 * pow(t - 1, 2);
}

class MiniFish {
  constructor() {
    this.x = random(50, BASE_W - 50);
    // 더 넓은 세로 범위에 분포하도록 Y 범위 확장
    this.baseY = random(BASE_H * 0.4, BASE_H * 1.05);
    this.y = this.baseY;
    
    // 크기를 0.5배로 축소 (기존 2~4 → 1~2)
    this.size = random(2, 4) * 0.5; // 미니 물고기 크기 (더 작게)
    this.vx = random(-0.2, 0.2);
    this.vy = random(-0.05, 0.05);
    
    this.bobOffset = random(TWO_PI);
    this.bobSpeed = random(0.015, 0.025);
    this.bobAmount = random(0.5, 1.5);
    
    this.facingRight = this.vx > 0;
    
    this.novelData = null; // JSON에서 로드한 웹소설 데이터
    this.dismissed = false; // "그냥 지나치기"를 누른 미니 물고기는 다시 모달이 뜨지 않음
    this.hoverStartTime = null; // 호버 시작 시간
    
    // 기포 생성을 위한 이전 위치 추적
    this.prevX = this.x;
    this.prevY = this.y;
    this.bubbleSpawnCounter = 0; // 기포 생성 간격 제어
    
    // 키워드 팡팡 효과를 위한 변수들
    this.popupKeywords = []; // {phrase, x, y, startTime, scale, angle}
    this.lastMouseX = -1;
    this.lastMouseY = -1;
    this.lastKeywordSpawnTime = 0; // 마지막 키워드 생성 시간
    
    // 플랑크톤 반짝임 효과를 위한 파티클들
    this.planktons = [];
    const planktonCount = 10; // 기본 플랑크톤 개수 (미니라서 더 적게)
    for (let i = 0; i < planktonCount; i++) {
      this.planktons.push({
        x: random(-this.size * 3, this.size * 3),
        y: random(-this.size * 2, this.size * 2),
        size: random(0.3, 1.0),
        alpha: random(80, 200),
        twinkleSpeed: random(0.08, 0.18),
        phase: random(TWO_PI)
      });
    }
    
    this.timeOffset = random(TWO_PI);
    this.phaseOffset = random(TWO_PI);
  }

  update() {
    // 이전 위치 저장
    this.prevX = this.x;
    this.prevY = this.y;
    
    // 떼지어 움직이는 느낌 (유혹하듯)
    this.x += this.vx;
    
    // 위아래 부드러운 움직임
    this.bobOffset += this.bobSpeed;
    this.y = this.baseY + sin(this.bobOffset) * this.bobAmount;
    
    // 방향 전환
    if (this.vx > 0) this.facingRight = true;
    if (this.vx < 0) this.facingRight = false;
    
    // 경계 처리
    if (this.x < 30 || this.x > BASE_W - 30) {
      this.vx *= -1;
    }
    
    // Y 범위 제한 (더 넓게)
    if (this.y < BASE_H * 0.35) this.y = BASE_H * 0.35;
    if (this.y > BASE_H * 1.1) this.y = BASE_H * 1.1;
    
    // 이동한 거리 계산 (성능 최적화: 제곱 거리로 비교)
    const dx = this.x - this.prevX;
    const dy = this.y - this.prevY;
    const distanceSq = dx * dx + dy * dy;
    
    // 이동할 때마다 뒤쪽에 기포 생성 (빈도 대폭 감소)
    this.bubbleSpawnCounter++;
    if (distanceSq > 0.09 && this.bubbleSpawnCounter >= 20) { // 20프레임마다 기포 생성 (성능 최적화, 미니라서 덜 자주)
      this.bubbleSpawnCounter = 0;
      // 뒤쪽 위치 계산 (이동 방향의 반대)
      const bubbleX = this.prevX - dx * 0.3;
      const bubbleY = this.prevY - dy * 0.3;
      // 바다 안에 있을 때만 기포 생성
      if (bubbleY > SURFACE_Y) {
        spawnBubble(bubbleX + random(-this.size * 0.5, this.size * 0.5), 
                    bubbleY + random(-this.size * 0.3, this.size * 0.3));
      }
    }
    
    // 플랑크톤 반짝임 효과 업데이트
    const t = millis() * 0.001 + this.timeOffset;
    for (let plankton of this.planktons) {
      plankton.alpha = 80 + sin(t * plankton.twinkleSpeed * 10 + plankton.phase) * 120;
      // 떼 행동: 플랑크톤이 살짝 움직임
      const moveAmount = 0.3;
      plankton.x += sin(t * 0.5 + plankton.phase) * moveAmount * 0.1;
      plankton.y += cos(t * 0.7 + plankton.phase) * moveAmount * 0.1;
    }
  }

  draw(pg) {
    // 이미지가 로드되지 않았으면 리턴
    if (!imgMiniFish || !imgMiniFish.width || imgMiniFish.width === 0) return;

    pg.push();
    pg.noStroke();

    // 중심으로 이동
    pg.translate(this.x, this.y);

    // 방향 반대로: 왼쪽을 볼 때 반전
    if (!this.facingRight) {
      pg.scale(-1, 1);
    }

    const s = this.size;
    const k = s;
    const t = millis() * 0.001 + this.timeOffset;

    // ==========================
    // 미니 물고기 이미지 그리기
    // ==========================
    pg.imageMode(CENTER);
    // 바다 테마에 맞는 생물 필터 적용
    let tintRGB = null;
    if (typeof getOceanLifeTintRGB === 'function') {
      tintRGB = getOceanLifeTintRGB();
    }
    if (tintRGB) {
      pg.tint(tintRGB.r, tintRGB.g, tintRGB.b, 235);
    } else {
      pg.noTint();
    }
    const imgWidth = imgMiniFish.width * k * 0.008;
    const imgHeight = imgMiniFish.height * k * 0.008;
    pg.image(imgMiniFish, 0, 0, imgWidth, imgHeight);
    pg.noTint();

    // ==========================
    // 플랑크톤 반짝이 효과
    // ==========================
    pg.blendMode(ADD);
    
    for (let plankton of this.planktons) {
      const sx = plankton.x;
      const sy = plankton.y;

      // 물고기 주변에 플랑크톤 배치
      const distance = sqrt(sx * sx + sy * sy);
      const maxDistance = this.size * 4;
      
      if (distance < maxDistance) {
        const sparkleAlpha = plankton.alpha;
        pg.fill(255, 255, 200, sparkleAlpha);
        pg.ellipse(sx, sy, plankton.size, plankton.size);

        pg.fill(255, 255, 255, sparkleAlpha * 0.6);
        pg.ellipse(sx, sy, plankton.size * 0.5, plankton.size * 0.5);
      }
    }
    pg.blendMode(pg.BLEND);

    pg.pop();
  }

  // 글자로 만든 미니 물고기 그리기 (자세히 보기 모드)
  drawTextDetail() {
    if (!this.novelData) return { x: 0, y: 0 }; // 데이터가 없으면 그리지 않음
    if (!imgMiniFish || !imgMiniFish.width || imgMiniFish.width === 0) return { x: 0, y: 0 }; // 이미지 없으면 리턴

    const cx = width / 2;
    const cy = height / 2;

    // 1) 텍스트 소스 만들기 (웹소설 관련 정보)
    let content = "";
    
    if (this.novelData.title) {
      content += `${this.novelData.title}  •  `;
    }
    
    if (this.novelData.author) {
      content += `${this.novelData.author}  •  `;
    }
    
    if (this.novelData.genre) {
      content += `${this.novelData.genre}  •  `;
    }
    
    if (this.novelData.viewCount !== undefined) {
      content += `조회수 ${this.novelData.viewCount.toLocaleString()}  •  `;
    }
    
    if (this.novelData.likeCount !== undefined) {
      content += `좋아요 ${this.novelData.likeCount.toLocaleString()}  •  `;
    }
    
    if (this.novelData.readTime) {
      content += `읽은 시간 ${this.novelData.readTime}분  •  `;
    }
    
    if (this.novelData.platform) {
      content += `${this.novelData.platform}  •  `;
    }

    content = content.toUpperCase();

    // 글자가 모자라지 않게 충분히 반복
    while (content.length < 2000) {
      content += "   •   " + content;
    }

    let idx = 0; // content에서 꺼낼 문자 인덱스

    noStroke();
    textFont(uiFont || 'ThinDungGeunMo');
    textAlign(CENTER, CENTER);

    // -------------------------
    // 미니 물고기 이미지 실루엣 기반으로 텍스트 배치
    // -------------------------
    const minifishDisplayWidth = min(width, height) * 0.6; // 화면에 표시할 미니 물고기 크기
    const minifishDisplayHeight = minifishDisplayWidth * (imgMiniFish.height / imgMiniFish.width); // 비율 유지
    
    // 그리드 크기 (이미지를 샘플링할 간격)
    const gridSize = 8; // 픽셀 단위 그리드 크기 (미니라서 더 작게)
    const scaleX = minifishDisplayWidth / imgMiniFish.width;
    const scaleY = minifishDisplayHeight / imgMiniFish.height;
    
    // 이미지를 그리드로 샘플링하여 실루엣 위치 찾기
    const headOffsetY = -20; // 화면 중앙 기준 위로 올리기
    const startX = cx - minifishDisplayWidth / 2;
    const startY = cy + headOffsetY - minifishDisplayHeight / 2;
    
    // 동물 이름 표시 (텍스트 실루엣 위쪽)
    const nameY = startY - 40;
    textFont(uiFont || 'ThinDungGeunMo');
    textAlign(CENTER, CENTER);
    textSize(24);
    fill(200, 220, 255, 255);
    text("웹소설 미니 물고기", cx, nameY);
    
    // 시간 기반 움직임 (읽은 시간에 따라 떼 행동 증가)
    const readTime = this.novelData.readTime || 0;
    const animationIntensity = 1.0 + (readTime / 60) * 0.5; // 읽은 시간에 따라 움직임 증가
    const baseTime = frameCount * 0.04 * animationIntensity;
    
    // -------------------------
    // 픽셀 위치 캐싱 (성능 최적화)
    // -------------------------
    if (!this._textPixelPositions) {
      imgMiniFish.loadPixels();
      const minifishPixels = imgMiniFish.pixels;

      const pixelPositions = [];
      for (let gridY = 0; gridY < imgMiniFish.height; gridY += gridSize) {
        for (let gridX = 0; gridX < imgMiniFish.width; gridX += gridSize) {
          // 그리드 셀 중심점의 픽셀 확인
          const pixelX = constrain(gridX + gridSize / 2, 0, imgMiniFish.width - 1);
          const pixelY = constrain(gridY + gridSize / 2, 0, imgMiniFish.height - 1);
          
          // 픽셀 인덱스 계산
          const pixelIdx = (pixelY * imgMiniFish.width + pixelX) * 4;
          
          // 알파값 확인 (실루엣 부분인지 체크)
          const alpha = minifishPixels[pixelIdx + 3];
          if (alpha < 50) continue; // 투명한 부분은 스킵
          
          // 화면 좌표로 변환
          const x = startX + pixelX * scaleX;
          const y = startY + pixelY * scaleY;
          
          // 텍스트가 이미지 영역을 벗어나지 않도록 체크
          if (x < startX || x > startX + minifishDisplayWidth || 
              y < startY || y > startY + minifishDisplayHeight) continue;
          
          // 미니 물고기 이미지의 실제 픽셀 색상 사용
          const r = minifishPixels[pixelIdx];
          const g = minifishPixels[pixelIdx + 1];
          const b = minifishPixels[pixelIdx + 2];
          
          // 위치와 색상 정보 저장
          pixelPositions.push({
            pixelX: pixelX,
            pixelY: pixelY,
            x: x,
            y: y,
            r: r,
            g: g,
            b: b,
            pixelIdx: pixelIdx
          });
        }
      }

      // 행별로 정렬 (y 좌표 먼저, 그 다음 x 좌표)
      pixelPositions.sort((a, b) => {
        // 먼저 y 좌표로 정렬 (위에서 아래로)
        if (Math.abs(a.y - b.y) > gridSize) {
          return a.y - b.y;
        }
        // 같은 행 내에서는 x 좌표로 정렬 (왼쪽에서 오른쪽으로)
        return a.x - b.x;
      });

      this._textPixelPositions = pixelPositions;
    }

    const pixelPositions = this._textPixelPositions;
    
    // 정렬된 순서대로 텍스트 배치
    for (let i = 0; i < pixelPositions.length; i++) {
      const pos = pixelPositions[i];
      
      const ch = content[idx++ % content.length];
      if (ch === ' ' || ch === '\n') {
        idx++; // 공백이면 다음 문자로
        continue;
      }
      
      // 미니 물고기 이미지 색상을 바다 테마에 맞게 살짝 조정
      const tRow = (pos.pixelY / imgMiniFish.height);
      const oceanTint = lerpColor(
        color(150, 220, 255), // 밝은 바다색
        color(80, 180, 230),  // 어두운 바다색
        tRow * 0.3 // 약간만 섞기
      );
      
      // 원본 색상과 바다 테마 색상을 혼합 (7:3 비율)
      const col = lerpColor(
        color(pos.r, pos.g, pos.b, 250),
        oceanTint,
        0.3
      );
      
      // 움직임 효과 (떼지어 유혹하듯 움직임, 읽은 시간에 따라 증가)
      const waveX = sin(baseTime + pos.pixelY * 0.02) * (1 * animationIntensity);
      const waveY = cos(baseTime * 0.8 + pos.pixelX * 0.015) * (0.8 * animationIntensity);
      
      const finalX = pos.x + waveX;
      const finalY = pos.y + waveY;
      
      // 텍스트 크기 (조회수에 따라 크기 조절)
      const viewCount = this.novelData.viewCount || 0;
      const sizeFactor = 1.0 + (viewCount / 10000) * 0.2; // 조회수에 따라 크기 증가 (최대 20% 증가)
      // 기본 크기를 0.05배로 축소 (0.1의 50%)
      let textSizeVal = (6 + tRow * 2) * sizeFactor * 0.05;
      // 전역 텍스트 크기 스케일 적용
      if (typeof textDetailSizeScale !== 'undefined') {
        textSizeVal *= textDetailSizeScale;
      }
      
      textSize(textSizeVal);
      textStyle(BOLD);
      fill(col);
      
      push();
      translate(finalX, finalY);
      // 자연스러운 회전 (떼 행동)
      const rotation = (waveX + waveY) * 0.03 * animationIntensity;
      rotate(rotation);
      text(ch, 0, 0);
      pop();
    }

    // 호버링 감지 및 PNG 가장자리 기준 핵심 문장 표시
    const animalCenterX = cx;
    const animalCenterY = cy + headOffsetY;
    const animalRadius = max(minifishDisplayWidth, minifishDisplayHeight) / 2;
    
    // 마우스가 동물 영역 위에 있는지 확인
    const mouseDist = dist(mouseX, mouseY, animalCenterX, animalCenterY);
    const isHovering = mouseDist < animalRadius * 1.2;
    
    if (isHovering && this.novelData) {
      // 호버 시작 시간 기록
      if (this.hoverStartTime === null) {
        this.hoverStartTime = millis();
      }
      
      // 핵심 문장 추출
      const keyPhrases = [];
      if (this.novelData.title) {
        const title = this.novelData.title;
        if (title.length > 25) {
          keyPhrases.push(title.substring(0, 25) + "...");
        } else {
          keyPhrases.push(title);
        }
      }
      if (this.novelData.author) keyPhrases.push(this.novelData.author);
      if (this.novelData.genre) keyPhrases.push(this.novelData.genre);
      if (this.novelData.platform) keyPhrases.push(this.novelData.platform);
      
      // 마우스 위치가 변경되었는지 확인 (팡팡 효과 트리거)
      const mouseMoved = (this.lastMouseX !== mouseX || this.lastMouseY !== mouseY);
      const currentTime = millis();
      const timeSinceLastSpawn = currentTime - this.lastKeywordSpawnTime;
      
      // 3초에 1번만 키워드 생성 (천천히 나타나도록)
      if (mouseMoved && keyPhrases.length > 0 && timeSinceLastSpawn >= 300) {
        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;
        this.lastKeywordSpawnTime = currentTime;
        
        // 마우스 위치 근처에서 키워드 팡팡 효과 (한 번에 1개만)
        const phrase = keyPhrases[floor(random(keyPhrases.length))];
        const angle = random(TWO_PI);
        const distance = random(30, 60); // 마우스로부터의 거리
        const popupX = mouseX + cos(angle) * distance;
        const popupY = mouseY + sin(angle) * distance;
        
        this.popupKeywords.push({
          phrase: phrase,
          x: popupX,
          y: popupY,
          startTime: currentTime,
          angle: angle,
          distance: distance
        });
      } else if (mouseMoved) {
        // 마우스는 움직였지만 시간 제한으로 키워드 생성 안 함
        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;
      }
      
      // 팡팡 효과 키워드들 업데이트 및 그리기
      const drawTime = millis();
      push();
      textFont(uiFont || 'ThinDungGeunMo');
      textAlign(CENTER, CENTER);
      textSize(14);
      
      for (let i = this.popupKeywords.length - 1; i >= 0; i--) {
        const keyword = this.popupKeywords[i];
        const elapsed = drawTime - keyword.startTime;
        const popDuration = 800; // 팝업 애니메이션 시간 (더 천천히)
        const fadeDuration = 4000; // 페이드아웃 시간 (더 길게)
        
        if (elapsed < 0) continue; // 아직 나타나지 않음
        
        if (elapsed > popDuration + fadeDuration) {
          // 완전히 사라짐
          this.popupKeywords.splice(i, 1);
          continue;
        }
        
        // 팡팡 효과 (스케일 애니메이션, 더 천천히)
        let scaleValue = 1;
        if (elapsed < popDuration) {
          const popProgress = elapsed / popDuration;
          // 더 부드럽고 천천히 나타나도록 조정
          scaleValue = easeOutBack(constrain(popProgress, 0, 1));
        }
        
        // 페이드아웃
        let alpha = 255;
        if (elapsed > popDuration) {
          const fadeProgress = (elapsed - popDuration) / fadeDuration;
          alpha = 255 * (1 - fadeProgress);
        }
        
        // 위치에 약간의 움직임 추가 (팡팡 효과)
        const wobbleX = sin(elapsed * 0.01) * 2;
        const wobbleY = cos(elapsed * 0.015) * 2;
        const finalX = keyword.x + wobbleX;
        const finalY = keyword.y + wobbleY;
        
        if (alpha > 0) {
          const textW = textWidth(keyword.phrase) + 20;
          const textH = 24;
          
          push();
          translate(finalX, finalY);
          scale(scaleValue);
          
          // 배경 (약간 반투명)
          fill(0, 0, 0, alpha * 0.7);
          noStroke();
          rect(-textW / 2, -textH / 2, textW, textH, 6);
          
          // 텍스트
          fill(255, 255, 200, alpha);
          text(keyword.phrase, 0, 0);
          pop();
        }
      }
      pop();
    } else {
      // 호버가 끝나면 시간 리셋 및 키워드 초기화
      this.hoverStartTime = null;
      this.popupKeywords = [];
      this.lastMouseX = -1;
      this.lastMouseY = -1;
    }

    // -------------------------
    // 닫기 버튼 (미니 물고기 아래)
    // -------------------------
    const btnY = cy + headOffsetY + minifishDisplayHeight / 2 + 80;
    const btnW = 140;
    const btnH = 35;
    const btnX = cx - btnW / 2;
    
    // 버튼 배경
    fill(0, 208, 255, 240);
    stroke(0, 208, 255);
    strokeWeight(2);
    rect(btnX, btnY - btnH / 2, btnW, btnH, 10); // UI_MODAL_RADIUS와 동일
    
    // 버튼 텍스트
    fill(255);
    textSize(14);
    textAlign(CENTER, CENTER);
    text("클릭해서 닫기", cx, btnY);

    // 닫기 버튼 위치 반환
    return { x: cx, y: btnY };
  }
}

