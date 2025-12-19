// ==============================
// Whale (고래) - 숏폼 관련
// ==============================

// 팝업 효과를 위한 이징 함수
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * pow(t - 1, 3) + c1 * pow(t - 1, 2);
}

class Whale {
  constructor() {
    this.x = random(50, BASE_W - 50);
    // 더 넓은 세로 범위에 분포하도록 Y 범위 확장
    this.baseY = random(BASE_H * 0.35, BASE_H * 0.95);
    this.y = this.baseY;
    
    this.size = random(10, 13); // 고래 크기 (조금씩만 다르게)
    this.vx = random(-0.15, 0.15);
    this.vy = random(-0.05, 0.05);
    
    this.bobOffset = random(TWO_PI);
    this.bobSpeed = random(0.01, 0.02);
    this.bobAmount = random(1, 2);
    
    this.facingRight = this.vx > 0;
    
    this.shortformData = null; // JSON에서 로드한 숏폼 데이터
    this.dismissed = false; // "그냥 지나치기"를 누른 고래는 다시 모달이 뜨지 않음
    this.hoverStartTime = null; // 호버 시작 시간
    
    // 기포 생성을 위한 이전 위치 추적
    this.prevX = this.x;
    this.prevY = this.y;
    this.bubbleSpawnCounter = 0; // 기포 생성 간격 제어
    
    // 키워드 팡팡 효과 매니저
    this.popupKeywordManager = new PopupKeywordManager();
    
    // 반짝임 효과를 위한 파티클들
    this.sparkles = [];
    for (let i = 0; i < 15; i++) { // 성능 최적화: 30 -> 15
      this.sparkles.push({
        x: random(-this.size, this.size),
        y: random(-this.size * 0.6, this.size * 0.6),
        size: random(0.5, 2),
        alpha: random(100, 255),
        twinkleSpeed: random(0.05, 0.15)
      });
    }
    
    this.timeOffset = random(TWO_PI);
  }

  update() {
    // 이전 위치 저장
    this.prevX = this.x;
    this.prevY = this.y;
    
    // 부드러운 수평 이동
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
    if (this.y < BASE_H * 0.25) this.y = BASE_H * 0.25;
    if (this.y > BASE_H * 1.05) this.y = BASE_H * 1.05;
    
    // 이동한 거리 계산 (성능 최적화: 제곱 거리로 비교)
    const dx = this.x - this.prevX;
    const dy = this.y - this.prevY;
    const distanceSq = dx * dx + dy * dy;
    
    // 이동할 때마다 뒤쪽에 기포 생성 (빈도 대폭 감소, 고래는 1개만)
    this.bubbleSpawnCounter++;
    if (distanceSq > 0.09 && this.bubbleSpawnCounter >= 20) { // 20프레임마다 기포 생성 (성능 최적화: 12 -> 20)
      this.bubbleSpawnCounter = 0;
      // 뒤쪽 위치 계산 (이동 방향의 반대)
      const bubbleX = this.prevX - dx * 0.4;
      const bubbleY = this.prevY - dy * 0.4;
      // 바다 안에 있을 때만 기포 생성
      if (bubbleY > SURFACE_Y) {
        // 성능 최적화: 고래도 1개만 생성
        spawnBubble(bubbleX + random(-this.size * 0.8, this.size * 0.8), 
                    bubbleY + random(-this.size * 0.5, this.size * 0.5));
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
    if (!imgWhale || !imgWhale.width || imgWhale.width === 0) return;

    pg.push();
    pg.noStroke();

    // 중심으로 이동
    pg.translate(this.x, this.y);

    // 방향 반대로: 왼쪽을 볼 때 반전
    if (!this.facingRight) {
      pg.scale(-1, 1);
    }

    // 살짝 대각선으로 헤엄치는 느낌
    pg.rotate(-0.12);

    const s = this.size;
    const k = s;
    const t = millis() * 0.001 + this.timeOffset;

    // ==========================
    // 고래 이미지 그리기 (크기 조금씩 다르게)
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
    const baseSize = 11.5; // 기본 크기 (평균값)
    const sizeFactor = this.size / baseSize; // 크기 비율
    const imgWidth = (imgWhale.width / 15) * sizeFactor; // 기본 크기에 비율 적용
    const imgHeight = (imgWhale.height / 15) * sizeFactor;
    pg.image(imgWhale, 0, 0, imgWidth, imgHeight);
    pg.noTint();

    // ==========================
    // 반짝이 효과
    // ==========================
    pg.blendMode(ADD);
    for (let sparkle of this.sparkles) {
      const sx = sparkle.x;
      const sy = sparkle.y;

      // 고래 몸체 내부에만 반짝임
      const a = 3.7 * k;
      const b = 1.1 * k;
      const inside = (sx * sx) / (a * a) + (sy * sy) / (b * b) < 1.0;

      if (inside) {
        const sparkleAlpha = 100 + sin(t * sparkle.twinkleSpeed * 10) * 155;
        pg.fill(255, 255, 255, sparkleAlpha);
        pg.ellipse(sx, sy, sparkle.size, sparkle.size);

        pg.fill(255, 255, 255, sparkleAlpha * 0.6);
        pg.ellipse(sx, sy, sparkle.size * 0.5, sparkle.size * 0.5);
      }
    }
    pg.blendMode(pg.BLEND);

    pg.pop();
  }

  // 글자로 만든 고래 그리기 (자세히 보기 모드)
  drawTextDetail() {
    if (!this.shortformData) return { x: 0, y: 0 }; // 데이터가 없으면 그리지 않음
    if (!imgWhale || !imgWhale.width || imgWhale.width === 0) return { x: 0, y: 0 }; // 이미지 없으면 리턴

    const cx = width / 2;
    const cy = height / 2;

    // 1) 텍스트 소스 만들기
    // 숏폼 내용 요약
    let summaryText = `SHORTFORM SUMMARY: ${this.shortformData.summary}`;
    
    // 댓글들
    let commentsText = "";
    if (this.shortformData.comments && this.shortformData.comments.length > 0) {
      commentsText = this.shortformData.comments.join("  •  ");
    }
    
    // 전체 텍스트 결합
    let content = `${summaryText}  •  COMMENTS: ${commentsText}`;
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
    // 고래 이미지 실루엣 기반으로 텍스트 배치
    // -------------------------
    const whaleDisplayWidth = min(width, height) * 1; // 화면에 표시할 고래 크기 (확대)
    const whaleDisplayHeight = whaleDisplayWidth * (imgWhale.height / imgWhale.width); // 비율 유지
    
    // 그리드 크기 (이미지를 샘플링할 간격)
    const gridSize = 12; // 픽셀 단위 그리드 크기 (더 작게 조정)
    const scaleX = whaleDisplayWidth / imgWhale.width;
    const scaleY = whaleDisplayHeight / imgWhale.height;
    
    // 이미지를 그리드로 샘플링하여 실루엣 위치 찾기
    const headOffsetY = -60; // 화면 중앙 기준 위로 올리기
    const startX = cx - whaleDisplayWidth / 2;
    const startY = cy + headOffsetY - whaleDisplayHeight / 2;
    
    // 동물 이름 표시 (텍스트 실루엣 위쪽)
    const nameY = startY - 40;
    textFont(typeof titleFont !== 'undefined' && titleFont ? titleFont : (uiFont || 'ThinDungGeunMo'));
    textAlign(CENTER, CENTER);
    textSize(24);
    fill(200, 220, 255, 255);
    // 제목에 컨텐츠 정보 포함 (summary에서 크리에이터나 제목 추출)
    let titleText = "숏폼 고래";
    if (this.shortformData && this.shortformData.summary) {
      const summary = this.shortformData.summary;
      // summary에서 크리에이터 이름 추출 (예: "침착맨", "파카 랄로" 등)
      // 또는 summary의 앞부분을 사용
      const creatorMatch = summary.match(/(침착맨|랄로|파카 랄로|.*?)(?:방송|보고|에서|이|의)/);
      if (creatorMatch && creatorMatch[1]) {
        titleText = `숏폼 고래: ${creatorMatch[1].trim()}`;
      } else {
        // 크리에이터를 찾지 못하면 summary의 앞부분 사용 (최대 10자)
        const shortSummary = summary.length > 10 ? summary.substring(0, 10) + "..." : summary;
        titleText = `숏폼 고래: ${shortSummary}`;
      }
    }
    text(titleText, cx, nameY);
    
    // 시간 기반 움직임
    const baseTime = frameCount * 0.03;
    
    // -------------------------
    // 픽셀 위치 캐싱 (성능 최적화)
    // -------------------------
    if (!this._textPixelPositions) {
      imgWhale.loadPixels();
      const whalePixels = imgWhale.pixels;

      const pixelPositions = [];
      for (let gridY = 0; gridY < imgWhale.height; gridY += gridSize) {
        for (let gridX = 0; gridX < imgWhale.width; gridX += gridSize) {
          // 그리드 셀 중심점의 픽셀 확인
          const pixelX = constrain(gridX + gridSize / 2, 0, imgWhale.width - 1);
          const pixelY = constrain(gridY + gridSize / 2, 0, imgWhale.height - 1);
          
          // 픽셀 인덱스 계산
          const pixelIdx = (pixelY * imgWhale.width + pixelX) * 4;
          
          // 알파값 확인 (실루엣 부분인지 체크)
          const alpha = whalePixels[pixelIdx + 3];
          if (alpha < 50) continue; // 투명한 부분은 스킵
          
          // 화면 좌표로 변환
          const x = startX + pixelX * scaleX;
          const y = startY + pixelY * scaleY;
          
          // 텍스트가 이미지 영역을 벗어나지 않도록 체크
          if (x < startX || x > startX + whaleDisplayWidth || 
              y < startY || y > startY + whaleDisplayHeight) continue;
          
          // 고래 이미지의 실제 픽셀 색상 사용
          const r = whalePixels[pixelIdx];
          const g = whalePixels[pixelIdx + 1];
          const b = whalePixels[pixelIdx + 2];
          
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
      
      // 고래 이미지 색상을 바다 테마에 맞게 살짝 조정 (밝기 유지하면서 톤 조정)
      const tRow = (pos.pixelY / imgWhale.height);
      const oceanTint = lerpColor(
        color(150, 240, 255), // 밝은 바다색
        color(80, 180, 230),  // 어두운 바다색
        tRow * 0.3 // 약간만 섞기
      );
      
      // 원본 색상과 바다 테마 색상을 혼합 (가독성을 위해 더 진하게)
      const col = lerpColor(
        color(pos.r, pos.g, pos.b, 255),
        oceanTint,
        0.2
      );
      
      // 움직임 효과 (고래가 살아있는 느낌, 최소화하여 가독성 향상)
      const waveX = sin(baseTime + pos.pixelY * 0.02) * 1; // 움직임 감소
      const waveY = cos(baseTime * 0.8 + pos.pixelX * 0.015) * 0.8; // 움직임 감소
      
      const finalX = pos.x + waveX;
      const finalY = pos.y + waveY;
      
      // 텍스트 크기 (위쪽 작고 아래쪽 크게, 더 작게 조정)
      let textSizeVal = 8 + tRow * 3; // 최대 11까지
      // 전역 텍스트 크기 스케일 적용
      if (typeof textDetailSizeScale !== 'undefined') {
        textSizeVal *= textDetailSizeScale;
      }
      
      textSize(textSizeVal);
      textStyle(BOLD);
      
      // 외곽선 추가로 가독성 향상
      push();
      translate(finalX, finalY);
      // 자연스러운 회전 (최소화)
      rotate(sin(baseTime + pos.pixelX * 0.01) * 0.05); // 회전 감소
      
      // 외곽선 (어두운 색)
      stroke(20, 40, 80, 200);
      strokeWeight(2);
      fill(col);
      text(ch, 0, 0);
      pop();
    }

    // 호버링 감지 및 PNG 가장자리 기준 핵심 문장 표시
    const animalCenterX = cx;
    const animalCenterY = cy + headOffsetY;
    const animalRadius = max(whaleDisplayWidth, whaleDisplayHeight) / 2;
    
    // 텍스트 모달이 열려있을 때는 손 위치와 마우스 위치 둘 다 확인
    const isTextDetailOpen = typeof showShortformDetail !== 'undefined' && showShortformDetail;
    
    // 마우스 위치로 호버링 확인
    const mouseDist = dist(mouseX, mouseY, animalCenterX, animalCenterY);
    const isMouseHovering = mouseDist < animalRadius * 1.2;
    
    // 손 위치로 호버링 확인 (텍스트 모달이 열려있고 손 위치가 있을 때)
    let isHandHovering = false;
    let handHoverX = width / 2;
    let handHoverY = height / 2;
    if (isTextDetailOpen && typeof window !== 'undefined' && typeof window.virtualMouseX !== 'undefined' && typeof window.virtualMouseY !== 'undefined') {
      const handDist = dist(window.virtualMouseX, window.virtualMouseY, animalCenterX, animalCenterY);
      isHandHovering = handDist < animalRadius * 1.2;
      handHoverX = window.virtualMouseX;
      handHoverY = window.virtualMouseY;
    }
    
    // 마우스 또는 손 중 하나라도 호버링되면 키워드 표시
    const isHovering = isMouseHovering || isHandHovering;
    
    // 제스처 감지 또는 마우스/손 호버링 시 텍스트 표시
    const shouldShowText = isHovering || (typeof gestureWaveDetected !== 'undefined' && gestureWaveDetected);
    
    // 호버링 위치 결정: 마우스가 호버링 중이면 마우스 위치, 손이 호버링 중이면 손 위치, 둘 다면 마우스 우선
    let textX = width / 2;
    let textY = height / 2;
    if (isMouseHovering) {
      textX = mouseX;
      textY = mouseY;
    } else if (isHandHovering) {
      textX = handHoverX;
      textY = handHoverY;
    }
    
    if (shouldShowText && this.shortformData) {
      // 호버 시작 시간 기록
      if (this.hoverStartTime === null) {
        this.hoverStartTime = millis();
      }
      
      // 핵심 문장 추출
      const keyPhrases = [];
      if (this.shortformData.summary) {
        const summary = this.shortformData.summary;
        if (summary.length > 30) {
          keyPhrases.push(summary.substring(0, 30) + "...");
        } else {
          keyPhrases.push(summary);
        }
      }
      if (this.shortformData.comments && this.shortformData.comments.length > 0) {
        this.shortformData.comments.forEach(comment => {
          if (comment.length > 25) {
            keyPhrases.push(comment.substring(0, 25) + "...");
          } else {
            keyPhrases.push(comment);
          }
        });
      }
      
      // 키워드 팡팡 효과 처리
      this.popupKeywordManager.trySpawnKeyword(textX, textY, keyPhrases);
      this.popupKeywordManager.updateAndDraw();
    } else {
      // 호버가 끝나면 시간 리셋 및 키워드 초기화
      this.hoverStartTime = null;
      this.popupKeywordManager.reset();
    }

    // -------------------------
    // 닫기 버튼 (고래 아래)
    // -------------------------
    const btnY = cy + headOffsetY + whaleDisplayHeight / 2 + 115;
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

