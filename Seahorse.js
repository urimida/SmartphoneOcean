// ==============================
// Seahorse (해마)
// ==============================

// 팝업 효과를 위한 이징 함수
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * pow(t - 1, 3) + c1 * pow(t - 1, 2);
}

// 해마 텍스트 실루엣용 픽셀 마스크
// '.' = 빈칸, 'X' = 해마 몸
const SEAHORSE_TEXT_MASK = [
  ".....................",
  ".....................",
  "......XX.............",
  ".....XXXXX...........",
  ".XXXXXXXXX...........",
  "...XX......XXX.......",
  ".........XXXXX.......",
  ".......XXXX..........",
  ".....XXXXX...........",
  "...XXXXXX............",
  "....XXXXXX...........",
  ".......XXXXXX........",
  ".........XXXXXX......",
  ".........XXXXXX......",
  "........XXXXX........",
  ".........XXXX........",
  "...........XXXXX.....",
  "..............XXX....",
  ".............XXXX....",
  "..XX.......XXXX......",
  "....XX......XX.......",
  ".......XXXXX.........",
  ".....................",
];

class Seahorse {
  constructor() {
    this.x = random(20, BASE_W - 20);
    // 확장된 배경 높이 기준 (BASE_H * 1.3)
    const totalBgHeight = BASE_H * 1.3;
    // 전체적으로 약간 위쪽으로 올리기 (0.94~0.97 구간)
    this.y = random(totalBgHeight * 0.94, totalBgHeight * 0.97) - 10;
    this.size = random(2, 4) * 1.3 * 1.5; // 해마 크기 1.5배 증가
    this.vx = random(-0.2, 0.2);
    this.bobOffset = random(TWO_PI);
    this.bobSpeed = random(0.02, 0.04);
    this.bobAmount = random(0.3, 0.8);
    this.facingRight = this.vx > 0;
    this.deliveryData = null; // JSON에서 로드한 배달 데이터
    this.dismissed = false; // "그냥 지나치기"를 누른 해마는 다시 모달이 뜨지 않음
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
    
    // 해파리처럼 빛나는 효과를 위한 파티클들
    this.sparkles = [];
    for (let i = 0; i < 20; i++) {
      this.sparkles.push({
        x: random(-this.size * 2, this.size * 2),
        y: random(-this.size * 3, this.size * 3),
        size: random(0.5, 1.5),
        alpha: random(100, 255),
        twinkleSpeed: random(0.05, 0.15)
      });
    }
    
    this.timeOffset = random(TWO_PI);
    this.phaseOffset = random(TWO_PI);
  }

  update() {
    // 이전 위치 저장
    this.prevX = this.x;
    this.prevY = this.y;
    
    this.x += this.vx;

    this.bobOffset += this.bobSpeed;
    this.y += sin(this.bobOffset) * this.bobAmount;

    if (this.vx > 0) this.facingRight = true;
    if (this.vx < 0) this.facingRight = false;

    if (this.x < 15 || this.x > BASE_W - 15) {
      this.vx *= -1;
    }

    // 확장된 배경 높이 기준 (BASE_H * 1.3)
    const totalBgHeight = BASE_H * 1.3;
    const minY = totalBgHeight * 0.94 - 10;
    const maxY = totalBgHeight * 0.97 - 10;
    if (this.y < minY) this.y = minY;
    if (this.y > maxY) this.y = maxY;
    
    // 이동한 거리 계산 (성능 최적화: 제곱 거리로 비교)
    const dx = this.x - this.prevX;
    const dy = this.y - this.prevY;
    const distanceSq = dx * dx + dy * dy;
    
    // 이동할 때마다 뒤쪽에 기포 생성 (빈도 대폭 감소)
    this.bubbleSpawnCounter++;
    if (distanceSq > 0.09 && this.bubbleSpawnCounter >= 15) { // 15프레임마다 기포 생성 (성능 최적화)
      this.bubbleSpawnCounter = 0;
      // 뒤쪽 위치 계산 (이동 방향의 반대)
      const bubbleX = this.prevX - dx * 0.3;
      const bubbleY = this.prevY - dy * 0.3;
      // 바다 안에 있을 때만 기포 생성
      if (bubbleY > SURFACE_Y) {
        spawnBubble(bubbleX + random(-this.size * 0.4, this.size * 0.4), 
                    bubbleY + random(-this.size * 0.3, this.size * 0.3));
      }
    }
    
    // 반짝임 효과 업데이트
    const t = millis() * 0.001 + this.timeOffset;
    for (let sparkle of this.sparkles) {
      sparkle.alpha = 100 + sin(t * sparkle.twinkleSpeed * 10) * 155;
    }
  }

  draw(pg) {
    // 이미지가 로드되지 않았으면 리턴
    if (!imgSeahorse || !imgSeahorse.width || imgSeahorse.width === 0) return;

    pg.push();
    pg.noStroke();

    const baseTime = frameCount * 0.05 + this.phaseOffset;
    
    // 해파리처럼 부드러운 움직임
    const waveX = sin(baseTime * 0.8) * 0.6;
    const waveY = cos(baseTime * 0.6) * 0.4;
    
    const s = this.size;
    const k = s * 0.8; // 해마 크기 조정
    const t = millis() * 0.001 + this.timeOffset;

    // 중심으로 이동
    pg.translate(this.x + waveX, this.y + waveY);

    // 방향 처리
    if (this.facingRight) {
      pg.scale(-1, 1);
    }

    // ==========================
    // 해마 이미지 그리기 (각 개체마다 살짝 다른 색감)
    // ==========================
    pg.imageMode(CENTER);
    // 바다 테마에 맞는 생물 필터 적용
    // 기본 바다 테마 색상
    let tintRGB = null;
    if (typeof getOceanLifeTintRGB === 'function') {
      tintRGB = getOceanLifeTintRGB();
    }
    if (tintRGB) {
      // 해마마다 살짝 다른 색감 (조금 더 주황/초록/파랑 쪽으로 흔들기)
      const hueVariant = noise(this.timeOffset) * 1.0 - 0.5; // -0.5 ~ 0.5
      const r = constrain(tintRGB.r + hueVariant * 40, 0, 255);
      const g = constrain(tintRGB.g + hueVariant * -20, 0, 255);
      const b = constrain(tintRGB.b + hueVariant * 30, 0, 255);
      pg.tint(r, g, b, 235);
    } else {
      pg.noTint();
    }
    const imgWidth = imgSeahorse.width * k * 0.006 * 1.5; // 이미지 크기 조정 (1.5배 추가 확대)
    const imgHeight = imgSeahorse.height * k * 0.006 * 1.5;
    pg.image(imgSeahorse, 0, 0, imgWidth, imgHeight);
    pg.noTint();

    // ==========================
    // 반짝임 효과 (해파리처럼)
    // ==========================
    pg.blendMode(ADD);
    for (let sparkle of this.sparkles) {
      const sx = sparkle.x;
      const sy = sparkle.y;

      // 해마 몸체 내부에만 반짝임
      const a = 2.5 * k;
      const b = 1.5 * k;
      const inside = (sx * sx) / (a * a) + (sy * sy) / (b * b) < 1.0;

      if (inside) {
        const sparkleAlpha = 100 + sin(t * sparkle.twinkleSpeed * 10) * 155;
        pg.fill(255, 255, 255, sparkleAlpha * 0.8);
        pg.ellipse(sx, sy, sparkle.size, sparkle.size);

        pg.fill(200, 220, 255, sparkleAlpha * 0.5);
        pg.ellipse(sx, sy, sparkle.size * 0.6, sparkle.size * 0.6);
      }
    }
    pg.blendMode(pg.BLEND);

    pg.pop();
  }

  // 글자로 만든 해마 그리기 (자세히 보기 모드)
  drawTextDetail() {
    if (!this.deliveryData) return { x: 0, y: 0 }; // 데이터 없으면 패스
    if (!imgSeahorse || !imgSeahorse.width || imgSeahorse.width === 0) return { x: 0, y: 0 }; // 이미지 없으면 리턴

    const cx = width / 2;
    const cy = height / 2;

    // 1) 텍스트 소스 만들기
    let itemsText = this.deliveryData.orderItems.join("  •  ");
    let content = `${this.deliveryData.storeName}  •  ${itemsText}  •  ${this.deliveryData.totalPrice.toLocaleString()}원`;

    if (this.deliveryData.reviewEvent && this.deliveryData.reviewMessage) {
      content += `  •  ${this.deliveryData.reviewMessage}`;
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
    // 해마 이미지 실루엣 기반으로 텍스트 배치
    // -------------------------
    const seahorseDisplayWidth = min(width, height) * 0.6 * 1.5; // 화면에 표시할 해마 크기 (1.5배 확대)
    const seahorseDisplayHeight = seahorseDisplayWidth * (imgSeahorse.height / imgSeahorse.width); // 비율 유지
    
    // 그리드 크기 (이미지를 샘플링할 간격)
    const gridSize = 12; // 픽셀 단위 그리드 크기
    const scaleX = seahorseDisplayWidth / imgSeahorse.width;
    const scaleY = seahorseDisplayHeight / imgSeahorse.height;
    
    // 이미지를 그리드로 샘플링하여 실루엣 위치 찾기
    const headOffsetY = -40; // 화면 중앙 기준 위로 올리기
    const startX = cx - seahorseDisplayWidth / 2;
    const startY = cy + headOffsetY - seahorseDisplayHeight / 2;
    
    // 동물 이름 표시 (텍스트 실루엣 위쪽)
    const nameY = startY - 40;
    textFont(uiFont || 'ThinDungGeunMo');
    textAlign(CENTER, CENTER);
    textSize(24);
    fill(200, 220, 255, 255);
    text("배달 해마", cx, nameY);
    
    // 시간 기반 움직임
    const baseTime = frameCount * 0.04;
    
    // -------------------------
    // 픽셀 위치 캐싱 (성능 최적화)
    // -------------------------
    if (!this._textPixelPositions) {
      imgSeahorse.loadPixels();
      const seahorsePixels = imgSeahorse.pixels;

      const pixelPositions = [];
      for (let gridY = 0; gridY < imgSeahorse.height; gridY += gridSize) {
        for (let gridX = 0; gridX < imgSeahorse.width; gridX += gridSize) {
          // 그리드 셀 중심점의 픽셀 확인
          const pixelX = constrain(gridX + gridSize / 2, 0, imgSeahorse.width - 1);
          const pixelY = constrain(gridY + gridSize / 2, 0, imgSeahorse.height - 1);
          
          // 픽셀 인덱스 계산
          const pixelIdx = (pixelY * imgSeahorse.width + pixelX) * 4;
          
          // 알파값 확인 (실루엣 부분인지 체크)
          const alpha = seahorsePixels[pixelIdx + 3];
          if (alpha < 50) continue; // 투명한 부분은 스킵
          
          // 화면 좌표로 변환
          const x = startX + pixelX * scaleX;
          const y = startY + pixelY * scaleY;
          
          // 텍스트가 이미지 영역을 벗어나지 않도록 체크
          if (x < startX || x > startX + seahorseDisplayWidth || 
              y < startY || y > startY + seahorseDisplayHeight) continue;
          
          // 해마 이미지의 실제 픽셀 색상 사용
          const r = seahorsePixels[pixelIdx];
          const g = seahorsePixels[pixelIdx + 1];
          const b = seahorsePixels[pixelIdx + 2];
          
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
      
      // 해마 이미지 색상을 바다 테마에 맞게 살짝 조정
      const tRow = (pos.pixelY / imgSeahorse.height);
      const oceanTint = lerpColor(
        color(150, 220, 255), // 밝은 바다색
        color(20, 80, 150),   // 어두운 바다색
        tRow * 0.3 // 약간만 섞기
      );
      
      // 원본 색상과 바다 테마 색상을 혼합 (7:3 비율)
      const col = lerpColor(
        color(pos.r, pos.g, pos.b, 250),
        oceanTint,
        0.3
      );
      
      // 움직임 효과 (해마가 살아있는 느낌, 최소화하여 가독성 향상)
      const headFactor = 1.0 - tRow;
      const tailFactor = tRow;
      const waveX = sin(baseTime + pos.pixelY * 0.02) * (1 + headFactor * 1.5);
      const waveY = cos(baseTime * 0.8 + pos.pixelX * 0.015) * (0.8 + headFactor * 1);
      const spiralWave = tailFactor > 0.6 ? sin(baseTime * 0.5 + pos.pixelY * 0.04) * tailFactor * 1.5 : 0;
      
      const finalX = pos.x + waveX + spiralWave;
      const finalY = pos.y + waveY;
      
      // 텍스트 크기
      let size = 10 + tRow * 4; // 최대 14까지
      // 전역 텍스트 크기 스케일 적용
      if (typeof textDetailSizeScale !== 'undefined') {
        size *= textDetailSizeScale;
      }
      
      textSize(size);
      fill(col);
      
      push();
      translate(finalX, finalY);
      // 자연스러운 회전 (최소화)
      const rotation = (waveX + waveY) * 0.03 + spiralWave * 0.05;
      rotate(rotation);
      text(ch, 0, 0);
      pop();
    }

    // 호버링 감지 및 PNG 가장자리 기준 핵심 문장 표시
    const animalCenterX = cx;
    const animalCenterY = cy + headOffsetY;
    const animalRadius = max(seahorseDisplayWidth, seahorseDisplayHeight) / 2;
    
    // 마우스가 동물 영역 위에 있는지 확인
    const mouseDist = dist(mouseX, mouseY, animalCenterX, animalCenterY);
    const isHovering = mouseDist < animalRadius * 1.2;
    
    if (isHovering && this.deliveryData) {
      // 호버 시작 시간 기록
      if (this.hoverStartTime === null) {
        this.hoverStartTime = millis();
      }
      
      // 핵심 문장 추출
      const keyPhrases = [];
      if (this.deliveryData.storeName) keyPhrases.push(this.deliveryData.storeName);
      if (this.deliveryData.orderItems && this.deliveryData.orderItems.length > 0) {
        this.deliveryData.orderItems.forEach(item => {
          if (item.length > 25) {
            keyPhrases.push(item.substring(0, 25) + "...");
          } else {
            keyPhrases.push(item);
          }
        });
      }
      if (this.deliveryData.reviewMessage) {
        const msg = this.deliveryData.reviewMessage;
        if (msg.length > 30) {
          keyPhrases.push(msg.substring(0, 30) + "...");
        } else {
          keyPhrases.push(msg);
        }
      }
      
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

    // ─────────────────────────────
    // 3) 닫기 버튼 (해마 아래)
    // ─────────────────────────────
    const btnY = cy + headOffsetY + seahorseDisplayHeight / 2 + 80;
    const btnW = 140;
    const btnH = 35;
    const btnX = cx - btnW / 2;

    fill(0, 208, 255, 240);
    stroke(0, 208, 255);
    strokeWeight(2);
    rect(btnX, btnY - btnH / 2, btnW, btnH, 10); // UI_MODAL_RADIUS와 동일

    fill(255);
    textSize(14);
    textAlign(CENTER, CENTER);
    text("클릭해서 닫기", cx, btnY);

    return { x: cx, y: btnY };
  }
}

