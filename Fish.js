// ==============================
// Fish (쇼핑 물고기) - 쇼핑 관련
// ==============================
class Fish {
  constructor() {
    this.x = random(50, BASE_W - 50);
    // 더 넓은 세로 범위에 분포하도록 Y 범위 확장
    this.baseY = random(BASE_H * 0.4, BASE_H * 1.05);
    this.y = this.baseY;
    
    this.size = random(3, 6 * 0.7); // 물고기 크기 (작은 태그 무리, 최대 크기 0.7배)
    this.vx = random(-0.2, 0.2);
    this.vy = random(-0.05, 0.05);
    
    this.bobOffset = random(TWO_PI);
    this.bobSpeed = random(0.015, 0.025);
    this.bobAmount = random(0.5, 1.5);
    
    this.facingRight = this.vx > 0;
    
    this.shoppingData = null; // JSON에서 로드한 쇼핑 데이터
    this.dismissed = false; // "그냥 지나치기"를 누른 물고기는 다시 모달이 뜨지 않음
    
    // 플랑크톤 반짝임 효과를 위한 파티클들 (찜 개수에 따라 밀도 조절)
    this.planktons = [];
    const planktonCount = 15; // 기본 플랑크톤 개수
    for (let i = 0; i < planktonCount; i++) {
      this.planktons.push({
        x: random(-this.size * 3, this.size * 3),
        y: random(-this.size * 2, this.size * 2),
        size: random(0.3, 1.2),
        alpha: random(80, 200),
        twinkleSpeed: random(0.08, 0.18),
        phase: random(TWO_PI)
      });
    }
    
    this.timeOffset = random(TWO_PI);
    this.phaseOffset = random(TWO_PI);
  }

  update() {
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
    if (!imgFish || !imgFish.width || imgFish.width === 0) return;

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
    // 물고기 이미지 그리기
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
    const imgWidth = imgFish.width * k * 0.008;
    const imgHeight = imgFish.height * k * 0.008;
    pg.image(imgFish, 0, 0, imgWidth, imgHeight);
    pg.noTint();

    // ==========================
    // 플랑크톤 반짝이 효과 (찜 개수에 따라 밀도 조절)
    // ==========================
    pg.blendMode(ADD);
    const wishlistCount = this.shoppingData ? (this.shoppingData.wishlistCount || 0) : 0;
    const planktonDensity = min(wishlistCount / 10, 1.0); // 찜 개수에 따라 밀도 조절 (최대 1.0)
    
    for (let plankton of this.planktons) {
      const sx = plankton.x;
      const sy = plankton.y;

      // 물고기 주변에 플랑크톤 배치
      const distance = sqrt(sx * sx + sy * sy);
      const maxDistance = this.size * 4;
      
      if (distance < maxDistance) {
        const sparkleAlpha = plankton.alpha * planktonDensity;
        pg.fill(255, 255, 200, sparkleAlpha);
        pg.ellipse(sx, sy, plankton.size, plankton.size);

        pg.fill(255, 255, 255, sparkleAlpha * 0.6);
        pg.ellipse(sx, sy, plankton.size * 0.5, plankton.size * 0.5);
      }
    }
    pg.blendMode(pg.BLEND);

    pg.pop();
  }

  // 글자로 만든 물고기 그리기 (자세히 보기 모드)
  drawTextDetail() {
    if (!this.shoppingData) return { x: 0, y: 0 }; // 데이터가 없으면 그리지 않음
    if (!imgFish || !imgFish.width || imgFish.width === 0) return { x: 0, y: 0 }; // 이미지 없으면 리턴

    const cx = width / 2;
    const cy = height / 2;

    // 1) 텍스트 소스 만들기 (쇼핑 관련 정보)
    let content = "";
    
    if (this.shoppingData.storeName) {
      content += `${this.shoppingData.storeName}  •  `;
    }
    
    if (this.shoppingData.productName) {
      content += `${this.shoppingData.productName}  •  `;
    }
    
    if (this.shoppingData.price) {
      content += `${this.shoppingData.price.toLocaleString()}원  •  `;
    }
    
    if (this.shoppingData.cartCount !== undefined) {
      content += `장바구니 ${this.shoppingData.cartCount}개  •  `;
    }
    
    if (this.shoppingData.wishlistCount !== undefined) {
      content += `찜 ${this.shoppingData.wishlistCount}개  •  `;
    }
    
    if (this.shoppingData.searchTime) {
      content += `탐색 ${this.shoppingData.searchTime}분  •  `;
    }
    
    if (this.shoppingData.category) {
      content += `${this.shoppingData.category}  •  `;
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
    // 물고기 이미지 실루엣 기반으로 텍스트 배치
    // -------------------------
    const fishDisplayWidth = min(width, height) * 0.7; // 화면에 표시할 물고기 크기
    const fishDisplayHeight = fishDisplayWidth * (imgFish.height / imgFish.width); // 비율 유지
    
    // 그리드 크기 (이미지를 샘플링할 간격)
    const gridSize = 10; // 픽셀 단위 그리드 크기 (작은 물고기라 더 작게)
    const scaleX = fishDisplayWidth / imgFish.width;
    const scaleY = fishDisplayHeight / imgFish.height;
    
    // 이미지를 그리드로 샘플링하여 실루엣 위치 찾기
    const headOffsetY = -30; // 화면 중앙 기준 위로 올리기
    const startX = cx - fishDisplayWidth / 2;
    const startY = cy + headOffsetY - fishDisplayHeight / 2;
    
    // 시간 기반 움직임 (탐색 시간에 따라 떼 행동 증가)
    const searchTime = this.shoppingData.searchTime || 0;
    const animationIntensity = 1.0 + (searchTime / 60) * 0.5; // 탐색 시간에 따라 움직임 증가
    const baseTime = frameCount * 0.04 * animationIntensity;
    
    // -------------------------
    // 픽셀 위치 캐싱 (성능 최적화)
    // -------------------------
    if (!this._textPixelPositions) {
      imgFish.loadPixels();
      const fishPixels = imgFish.pixels;

      const pixelPositions = [];
      for (let gridY = 0; gridY < imgFish.height; gridY += gridSize) {
        for (let gridX = 0; gridX < imgFish.width; gridX += gridSize) {
          // 그리드 셀 중심점의 픽셀 확인
          const pixelX = constrain(gridX + gridSize / 2, 0, imgFish.width - 1);
          const pixelY = constrain(gridY + gridSize / 2, 0, imgFish.height - 1);
          
          // 픽셀 인덱스 계산
          const pixelIdx = (pixelY * imgFish.width + pixelX) * 4;
          
          // 알파값 확인 (실루엣 부분인지 체크)
          const alpha = fishPixels[pixelIdx + 3];
          if (alpha < 50) continue; // 투명한 부분은 스킵
          
          // 화면 좌표로 변환
          const x = startX + pixelX * scaleX;
          const y = startY + pixelY * scaleY;
          
          // 텍스트가 이미지 영역을 벗어나지 않도록 체크
          if (x < startX || x > startX + fishDisplayWidth || 
              y < startY || y > startY + fishDisplayHeight) continue;
          
          // 물고기 이미지의 실제 픽셀 색상 사용
          const r = fishPixels[pixelIdx];
          const g = fishPixels[pixelIdx + 1];
          const b = fishPixels[pixelIdx + 2];
          
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
      
      // 물고기 이미지 색상을 바다 테마에 맞게 살짝 조정
      const tRow = (pos.pixelY / imgFish.height);
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
      
      // 움직임 효과 (떼지어 유혹하듯 움직임, 탐색 시간에 따라 증가)
      const waveX = sin(baseTime + pos.pixelY * 0.02) * (1 * animationIntensity);
      const waveY = cos(baseTime * 0.8 + pos.pixelX * 0.015) * (0.8 * animationIntensity);
      
      const finalX = pos.x + waveX;
      const finalY = pos.y + waveY;
      
      // 텍스트 크기 (장바구니 수에 따라 태그 무리 크기 조절)
      const cartCount = this.shoppingData.cartCount || 0;
      const sizeFactor = 1.0 + (cartCount / 20) * 0.3; // 장바구니 수에 따라 크기 증가 (최대 30% 증가)
      let textSizeVal = (8 + tRow * 3) * sizeFactor;
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

    // -------------------------
    // 닫기 버튼 (물고기 아래)
    // -------------------------
    const btnY = cy + headOffsetY + fishDisplayHeight / 2 + 80;
    const btnW = 140;
    const btnH = 35;
    const btnX = cx - btnW / 2;
    
    // 버튼 배경
    fill(60, 120, 180, 240);
    stroke(100, 150, 200);
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

