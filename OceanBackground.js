// ==============================
// OceanBackground (바다 배경)
// ==============================
class OceanBackground {
  constructor() {
    // 배경은 정적이므로 생성자에서 특별한 초기화 불필요
  }

  // 정적인 하늘 + 바다 배경 그리기
  paintStaticScene(pg) {
    pg.push();
    pg.background(0, 0, 0, 0);

    const topColorArray = weatherColors.topColor || [90, 220, 230];
    const midColorArray = weatherColors.midColor || [30, 160, 165];
    const bottomColorArray = weatherColors.bottomColor || [5, 30, 70];

    const waterTop = pg.color(...topColorArray);
    const waterMid = pg.color(...midColorArray);
    const waterBottom = pg.color(...bottomColorArray);

    // 1) 하늘 그라디언트 (바다 톤과 조화롭게)
    const surfY = int(SURFACE_Y);
    // 배경이 확장되었을 때 하늘 부분도 확장 (위쪽에 추가 하늘 공간)
    const extraSkyHeight = pg.height > BASE_H ? (pg.height - BASE_H) : 0;
    const skyStartY = 0; // 배경은 항상 y=0부터 시작
    const skyEndY = surfY + extraSkyHeight; // 하늘 부분 확장

    // 바다 색상 톤 + 현재 테마에 따라 하늘 색상 조정
    // 기본값: 바다 톤과 비슷한 푸른 하늘
    let skyTopDeep, skyMid, skyLow;

    // 현재 선택된 테마 이름 확인 (있다면)
    let themeName = null;
    if (typeof currentOceanThemeIndex === 'number' &&
        currentOceanThemeIndex >= 0 &&
        typeof OCEAN_THEMES !== 'undefined' &&
        currentOceanThemeIndex < OCEAN_THEMES.length) {
      themeName = OCEAN_THEMES[currentOceanThemeIndex].name;
    }

    if (themeName === 'Sunset Ocean') {
      // 따뜻한 선셋 하늘 (보라 → 코랄 → 오렌지)
      skyTopDeep = pg.color(40, 15, 60);     // 위: 딥 퍼플
      skyMid     = pg.color(120, 60, 130);   // 중간: 보라-코랄
      skyLow     = pg.color(255, 170, 120);  // 수면 근처: 선셋 오렌지
    } else if (themeName === 'Golden Ocean') {
      // 황금빛 일몰 하늘 (보라 → 골드 오렌지)
      skyTopDeep = pg.color(35, 10, 40);     // 위: 짙은 보라
      skyMid     = pg.color(150, 90, 80);    // 중간: 따뜻한 브라운-오렌지
      skyLow     = pg.color(255, 210, 150);  // 수면 근처: 밝은 골드
    } else if (themeName === 'Coral Reef') {
      // 코랄 바다와 채도가 맞는 민트빛 하늘
      skyTopDeep = pg.color(20, 60, 70);     // 위: 딥 틸
      skyMid     = pg.color(70, 180, 180);   // 중간: 청록
      skyLow     = pg.color(180, 255, 230);  // 수면 근처: 밝은 민트
    } else {
      // 디폴트: 바다 topColor를 기반으로 한 푸른 하늘
      skyTopDeep = pg.color(
        topColorArray[0] * 0.15,
        topColorArray[1] * 0.35,
        topColorArray[2] * 0.55
      );
      skyMid = pg.color(
        topColorArray[0] * 0.25,
        topColorArray[1] * 0.50,
        topColorArray[2] * 0.70
      );
      skyLow = pg.color(
        topColorArray[0] * 0.60,
        topColorArray[1] * 0.80,
        topColorArray[2] * 0.95
      );
    }

    for (let y = skyStartY; y < skyEndY; y++) {
      // 하늘 그라디언트를 확장된 높이에 맞게 조정
      let t = (y - extraSkyHeight) / max(1, surfY);
      t = constrain(t, 0, 1); // 0~1 범위로 제한
      let c;

      // 위 1/3 : 진파랑 → 중간
      if (t < 0.33) {
        c = pg.lerpColor(skyTopDeep, skyMid, t / 0.33);
      }
      // 가운데 : 자연스러운 그라디언트
      else if (t < 0.7) {
        let tt = (t - 0.33) / (0.7 - 0.33);
        c = pg.lerpColor(skyMid, skyMid, tt);
      }
      // 아래 30% : 중간 → 밝은 하늘색
      else {
        let tt = (t - 0.7) / 0.3;
        c = pg.lerpColor(skyMid, skyLow, tt);
      }

      pg.stroke(c);
      pg.line(0, y, pg.width, y);
    }

    // 2) 구름 (noise로 자연스러운 패턴)
    pg.noStroke();

    // 중간 레이어 구름들
    this.drawCloud(pg, pg.width * 0.3, surfY * 0.5, 120, 25);
    this.drawCloud(pg, pg.width * 0.7, surfY * 0.55, 100, 22);
    this.drawCloud(pg, pg.width * 0.5, surfY * 0.4, 90, 20);
    
    // 위쪽 작은 구름 조각들
    this.drawCloud(pg, pg.width * 0.2, surfY * 0.25, 60, 15);
    this.drawCloud(pg, pg.width * 0.8, surfY * 0.2, 50, 12);
    this.drawCloud(pg, pg.width * 0.6, surfY * 0.3, 55, 14);

    // 2-1) 별 반짝임 효과 (어두운 날에만)
    if (this.isDarkSky(skyTopDeep)) {
      this.drawStars(pg, surfY);
    }
    
    // 2-2) 해 (밝은 날에만)
    if (!this.isDarkSky(skyTopDeep)) {
      this.drawSun(pg, surfY);
    }

    // 3) 바다 그라디언트 (SURFACE_Y ~ bottom)
    // 하늘과 바다 경계를 자연스럽게 연결
    const skyBottomColor = skyLow; // 하늘의 마지막 색상
    
    // 더 영롱하고 다양한 스펙트럼을 위한 중간 색상 생성
    // 기본 색상들을 더 채도 높게 조정
    const waterTopBright = pg.color(
      min(255, topColorArray[0] * 1.15),
      min(255, topColorArray[1] * 1.1),
      min(255, topColorArray[2] * 1.05)
    );
    const waterTopVibrant = pg.color(
      min(255, topColorArray[0] * 0.95),
      min(255, topColorArray[1] * 1.2),
      min(255, topColorArray[2] * 1.15)
    );
    const waterMidBright = pg.color(
      min(255, midColorArray[0] * 1.2),
      min(255, midColorArray[1] * 1.15),
      min(255, midColorArray[2] * 1.1)
    );
    const waterMidDeep = pg.color(
      min(255, midColorArray[0] * 0.85),
      min(255, midColorArray[1] * 0.9),
      min(255, midColorArray[2] * 0.95)
    );
    const waterBottomDeep = pg.color(
      min(255, bottomColorArray[0] * 1.1),
      min(255, bottomColorArray[1] * 1.05),
      min(255, bottomColorArray[2] * 1.0)
    );
    
    for (let y = surfY; y < pg.height; y++) {
      let t = (y - surfY) / (pg.height - surfY);
      t = constrain(t, 0, 1);

      // 수면 바로 아래는 하늘 색상과 자연스럽게 연결
      let c;
      if (t < 0.06) {
        const tt = t / 0.06;
        // smoothstep으로 더 부드럽게
        const smoothTt = tt * tt * (3 - 2 * tt);
        c = pg.lerpColor(skyBottomColor, waterTop, smoothTt);
      } else {
        // 더 풍부한 다단계 그라디언트 - 경계 없이 부드럽게 전환
        const depth = (t - 0.06) / 0.94;
        // 전체 구간에 대해 더 부드러운 smoothstep 적용
        const s = depth * depth * depth * (depth * (depth * 6 - 15) + 10); // smootherstep (5차 함수)
        
        // 색상 키포인트 배열 (0.0 ~ 1.0 사이의 위치와 색상)
        const colorStops = [
          { pos: 0.0, color: waterTop },
          { pos: 0.2, color: waterTopVibrant },
          { pos: 0.4, color: waterTopBright },
          { pos: 0.6, color: waterMidBright },
          { pos: 0.8, color: waterMidDeep },
          { pos: 1.0, color: waterBottomDeep }
        ];
        
        // s 값에 따라 두 색상 사이를 부드럽게 보간
        let c1, c2, tLocal;
        for (let i = 0; i < colorStops.length - 1; i++) {
          if (s >= colorStops[i].pos && s <= colorStops[i + 1].pos) {
            // 현재 구간 내에서의 위치 (0~1)
            tLocal = (s - colorStops[i].pos) / (colorStops[i + 1].pos - colorStops[i].pos);
            // smoothstep으로 더 부드럽게
            const smoothT = tLocal * tLocal * (3 - 2 * tLocal);
            c1 = colorStops[i].color;
            c2 = colorStops[i + 1].color;
            c = pg.lerpColor(c1, c2, smoothT);
            break;
          }
        }
      }

      // 수면 근처 노란빛 (더 영롱하게, 부드러운 페이드)
      if (t < 0.18) {
        let yellowAmount = (0.18 - t) / 0.18;
        // smoothstep으로 부드러운 페이드
        yellowAmount = yellowAmount * yellowAmount * (3 - 2 * yellowAmount);
        let yellowTint = pg.color(255, 245, 170, yellowAmount * 40);
        c = pg.lerpColor(c, yellowTint, yellowAmount * 0.3);
      }
      
      // 중간 깊이에서 청록/시안 톤 추가 (더 영롱한 느낌, 부드러운 페이드)
      if (t > 0.15 && t < 0.5) {
        let normalizedT = (t - 0.15) / 0.35;
        // 부드러운 sin 곡선
        let cyanAmount = sin(normalizedT * PI) * 0.15;
        let cyanTint = pg.color(
          min(255, red(c) + cyanAmount * 20),
          min(255, green(c) + cyanAmount * 30),
          min(255, blue(c) + cyanAmount * 25)
        );
        c = pg.lerpColor(c, cyanTint, abs(cyanAmount));
      }
      
      // 깊은 곳에서 보라/인디고 톤 추가 (스펙트럼 다양성, 부드러운 페이드)
      if (t > 0.6 && t < 0.9) {
        let normalizedT = (t - 0.6) / 0.3;
        // 부드러운 sin 곡선
        let purpleAmount = sin(normalizedT * PI) * 0.12;
        let purpleTint = pg.color(
          min(255, red(c) + purpleAmount * 15),
          min(255, green(c) + purpleAmount * 10),
          min(255, blue(c) + purpleAmount * 20)
        );
        c = pg.lerpColor(c, purpleTint, abs(purpleAmount));
      }

      pg.stroke(c);
      pg.line(0, y, pg.width, y);
    }

    // 수평 방향 물결 결 (바다 부분만)
    pg.noStroke();
    for (let y = surfY; y < pg.height; y += 2) {
      let depth = (y - surfY) / (pg.height - surfY);
      let baseC = pg.lerpColor(waterTop, waterBottom, depth * 0.9);

      if (depth < 0.2) {
        let yellowAmount = (0.2 - depth) / 0.2;
        let yellowTint = pg.color(255, 240, 180);
        baseC = pg.lerpColor(baseC, yellowTint, yellowAmount * 0.15);
      }

      for (let x = 0; x < pg.width; ) {
        let blockW = int(random(3, 14));
        let jitter = random(-15, 20);
        let r = constrain(red(baseC) + jitter, 0, 255);
        let g = constrain(green(baseC) + jitter, 0, 255);
        let b = constrain(blue(baseC) + jitter, 0, 255);
        let cPatch = pg.color(r, g, b, 70);
        pg.fill(cPatch);
        pg.rect(x, y, blockW, 2);
        x += blockW;
      }
    }

    // 4) 빛줄기 효과 (가장 뒤 레이어로 먼저 그림)
    // this.drawLightShafts(pg); // 빛줄기 효과 비활성화

    // 5) 바닥 돌/흙 패턴
    this.drawFloorStones(pg, bottomColorArray);

    // 6) 양쪽 암벽 (앞 레이어로 나중에 그림)
    this.drawCliff(pg, true, bottomColorArray);
    this.drawCliff(pg, false, bottomColorArray);

    // 🌊 7) 수중 반짝임 (caustics)
    this.drawCaustics(pg);

    pg.pop();
  }

  // 벽처럼 noise 함수를 사용한 자연스러운 구름
  drawCloud(pg, cx, cy, w, h) {
    pg.push();
    pg.noStroke();

    // 구름의 기본 투명도 범위 (각 구름마다 다르게)
    const baseAlphaMin = 120; // 최소 투명도 (더 투명한 구름)
    const baseAlphaMax = 240; // 최대 투명도 (덜 투명한 구름)
    const alphaVariation = noise(cx * 0.01, cy * 0.01); // 구름 위치에 따른 투명도 변화
    const baseAlpha = map(alphaVariation, 0, 1, baseAlphaMin, baseAlphaMax);

    // 구름의 기본 색상 (투명도는 다양하게)
    const cloudTop = pg.color(255, 255, 255, baseAlpha);      // 위쪽 흰색
    const cloudBottom = pg.color(200, 220, 240, baseAlpha * 0.9);   // 아래쪽 하늘색 톤

    // noise 시드 (각 구름마다 다른 패턴)
    const noiseSeedX = cx * 0.01;
    const noiseSeedY = cy * 0.01;

    for (let yy = -h / 2; yy <= h / 2; yy++) {
      // 세로 위치에 따른 높이 팩터 (가운데가 두껍고 양 끝이 얇음)
      let heightFactor = 1 - abs(yy) / (h * 0.6);
      if (heightFactor <= 0) continue;

      // noise로 자연스러운 윤곽 만들기
      let noiseY = noiseSeedY + yy * 0.05;
      let baseWidth = w * heightFactor;
      
      // 양쪽 끝을 noise로 자연스럽게
      let leftNoise = noise(noiseSeedX, noiseY) * 0.3;
      let rightNoise = noise(noiseSeedX + 1, noiseY) * 0.3;
      
      let leftEdge = cx - baseWidth / 2 + leftNoise * baseWidth;
      let rightEdge = cx + baseWidth / 2 - rightNoise * baseWidth;

      // 각 행을 블록 단위로 그리기 (벽처럼)
      for (let x = int(leftEdge); x <= int(rightEdge); ) {
        // 블록 크기 (noise로 변화)
        let blockNoise = noise(x * 0.02, noiseY);
        let blockW = int(map(blockNoise, 0, 1, 2, 6));
        
        // 블록 내에서 구름 밀도 결정
        let blockCenterX = x + blockW / 2;
        let distFromCenter = abs(blockCenterX - cx) / (baseWidth / 2);
        let density = map(distFromCenter, 0, 1, 0.9, 0.3);
        density *= heightFactor; // 위아래로 갈수록 밀도 감소
        
        // 블록 내 각 픽셀
        for (let xx = 0; xx < blockW && x + xx <= rightEdge; xx++) {
          let px = x + xx;
          if (px < 0 || px >= pg.width) continue;
          
          // noise로 자연스러운 밀도 변화
          let pixelNoise = noise(px * 0.05, (cy + yy) * 0.05);
          if (pixelNoise < density) {
            // 세로 위치에 따른 색상 변화
            let tY = map(yy, -h / 2, h / 2, 0, 1);
            let cloudCol = pg.lerpColor(cloudTop, cloudBottom, tY * 0.4);
            
            // 살짝 하늘색 섞기
            if (tY < 0.3) {
              let skyMix = pg.color(180, 220, 255, 200);
              cloudCol = pg.lerpColor(cloudCol, skyMix, 0.2);
            }
            
            // 블록 단위로 색상 변화 (벽처럼)
            let jitter = map(blockNoise, 0, 1, -8, 8);
            let r = constrain(red(cloudCol) + jitter, 0, 255);
            let g = constrain(green(cloudCol) + jitter, 0, 255);
            let b = constrain(blue(cloudCol) + jitter, 0, 255);
            
            // 각 픽셀의 투명도를 다양하게 (noise 기반)
            let pixelAlphaNoise = noise(px * 0.1, (cy + yy) * 0.1);
            let baseAlpha = alpha(cloudCol);
            // 투명도 범위: 기본 알파의 40% ~ 100% (일부는 더 투명하게)
            let pixelAlpha = map(pixelAlphaNoise, 0, 1, baseAlpha * 0.4, baseAlpha);
            
            pg.fill(r, g, b, pixelAlpha);
            pg.rect(px, int(cy + yy), 1, 1);
          }
        }
        
        x += blockW;
      }
    }

    pg.pop();
  }

  drawCliff(pg, isLeft, oceanBottomColor) {
    pg.push();
    let baseX = isLeft ? 0 : pg.width;
    let dir = isLeft ? 1 : -1;
    
    // 바다 색상에 맞춰 암벽 색상 조정 (어두운 톤 유지)
    // 바다 색상을 기반으로 하되, 더 어둡게 조정
    const baseR = oceanBottomColor[0] || 5;
    const baseG = oceanBottomColor[1] || 30;
    const baseB = oceanBottomColor[2] || 70;
    
    // 암벽 뒷면 (더 어둡게)
    let cliffBack = pg.color(
      max(3, baseR * 0.3),
      max(20, baseG * 0.4),
      max(40, baseB * 0.6)
    );
    
    // 암벽 앞면 (약간 밝게, 하지만 여전히 어두운 톤)
    let cliffFront = pg.color(
      max(8, baseR * 0.5),
      max(40, baseG * 0.7),
      max(80, baseB * 0.9)
    );
    
    // 연한 돌 색상 (밝은 바다 색상)
    let lightStoneColor = pg.color(
      min(255, baseR + 50),
      min(255, baseG + 60),
      min(255, baseB + 70)
    );
    
    const surfY = int(SURFACE_Y);

    // 암벽 기본 형태 그리기
    for (let layer = 0; layer < 3; layer++) {
      let col = pg.lerpColor(cliffFront, cliffBack, layer / 2.0);
      col.setAlpha(230 - layer * 60);
      pg.fill(col);
      pg.noStroke();

      pg.beginShape();
      let yStart = surfY;
      pg.vertex(baseX, yStart);
      for (let y = yStart; y <= pg.height; y += 4) {
        let noiseVal = noise(layer * 50 + y * 0.08);
        let yProgress = (y - surfY) / (pg.height - surfY);
        // 아래로 갈수록 더 넓어지게 (0.08 → 0.25)
        let wideningOffset = yProgress * pg.width * lerp(0.08, 0.25, yProgress);
        // 위쪽에서는 벽에 붙어서 시작 (yProgress에 따라 점진적으로 offset 증가)
        let baseOffset = lerp(0, 8 + layer * 3, yProgress);
        let offset = dir * (baseOffset + noiseVal * 10 + wideningOffset);
        pg.vertex(baseX + offset, y);
      }
      pg.vertex(baseX, pg.height);
      pg.endShape(pg.CLOSE);
    }

    // 돌 패턴 추가 (아래로 갈수록 더 많아지고 연한 돌도 증가)
    pg.noStroke();
    for (let y = surfY; y <= pg.height; y += 2) {
      let yProgress = (y - surfY) / (pg.height - surfY);
      
      // 아래로 갈수록 돌 밀도 증가 (0.15 → 0.7)
      let stoneDensity = lerp(0.15, 0.7, yProgress);
      // 아래로 갈수록 연한 돌 비율 증가 (0.08 → 0.4)
      let lightStoneRatio = lerp(0.08, 0.4, yProgress);
      
      // 각 레이어의 암벽 위치를 계산하여 돌 그리기
      for (let layer = 0; layer < 3; layer++) {
        let noiseVal = noise(layer * 50 + y * 0.08);
        // 아래로 갈수록 더 넓어지게 (0.08 → 0.25)
        let wideningOffset = yProgress * pg.width * lerp(0.08, 0.25, yProgress);
        // 위쪽에서는 벽에 붙어서 시작 (yProgress에 따라 점진적으로 offset 증가)
        let baseOffset = lerp(0, 8 + layer * 3, yProgress);
        let offset = dir * (baseOffset + noiseVal * 10 + wideningOffset);
        let cliffX = baseX + offset;
        
        // 암벽 영역 내에서 돌 그리기
        // 아래로 갈수록 돌이 차지하는 부분이 더 크게 (12 → 25)
        let cliffWidth = lerp(12 + layer * 2, 25 + layer * 3, yProgress);
        
        for (let xOffset = 0; xOffset < cliffWidth; xOffset += 2) {
          let x = isLeft ? (cliffX - cliffWidth + xOffset) : (cliffX + xOffset);
          
          // 화면 밖이면 스킵
          if (x < 0 || x >= pg.width) continue;
          
          // 돌 밀도에 따라 랜덤하게 그리기
          if (random() < stoneDensity) {
            // 연한 돌인지 결정
            let isLightStone = random() < lightStoneRatio;
            
            let stoneColor;
            if (isLightStone) {
              // 연한 돌
              let jitter = random(-8, 15);
              let r = constrain(red(lightStoneColor) + jitter, 0, 255);
              let g = constrain(green(lightStoneColor) + jitter, 0, 255);
              let b = constrain(blue(lightStoneColor) + jitter, 0, 255);
              stoneColor = pg.color(r, g, b, 95);
            } else {
              // 일반 돌
              let baseStoneColor = pg.lerpColor(cliffFront, cliffBack, layer / 2.0);
              let jitter = random(-12, 12);
              let r = constrain(red(baseStoneColor) + jitter, 0, 255);
              let g = constrain(green(baseStoneColor) + jitter, 0, 255);
              let b = constrain(blue(baseStoneColor) + jitter, 0, 255);
              stoneColor = pg.color(r, g, b, 85);
            }
            
            pg.fill(stoneColor);
            pg.rect(x, y, 2, 2);
          }
        }
      }
    }

    pg.pop();
  }

  // ==============================
  // 바닥 돌/흙 패턴 (암벽과 이어지게)
  // ==============================
  drawFloorStones(pg, oceanBottomColor) {
    pg.push();
    pg.noStroke();

    const surfY = int(SURFACE_Y);
    const floorStart = int(pg.height * 0.95); // 바닥 시작 위치 (훨씬 더 얇게)
    
    // 암벽과 같은 색상 사용
    const baseR = oceanBottomColor[0] || 5;
    const baseG = oceanBottomColor[1] || 30;
    const baseB = oceanBottomColor[2] || 70;
    
    // 암벽 앞면 색상 (돌과 같은 색상) - 더 진하게
    let cliffFront = pg.color(
      max(5, baseR * 0.4),
      max(30, baseG * 0.6),
      max(70, baseB * 0.8)
    );
    
    // 진한 돌 색상 (딱딱한 느낌)
    let darkStoneColor = pg.color(
      max(3, baseR * 0.3),
      max(20, baseG * 0.5),
      max(50, baseB * 0.7)
    );
    
    // 연한 돌 색상 (비율 줄임)
    let lightStoneColor = pg.color(
      min(255, baseR + 40),
      min(255, baseG + 50),
      min(255, baseB + 60)
    );

    for (let y = floorStart; y <= pg.height; y += 2) {
      let floorProgress = (y - floorStart) / (pg.height - floorStart);
      
      // 양쪽 암벽이 바닥에서 만나는 위치 계산
      let yProgress = (y - surfY) / (pg.height - surfY);
      let wideningOffset = yProgress * pg.width * lerp(0.08, 0.25, yProgress);
      
      // 왼쪽 암벽 끝 위치
      let leftNoiseVal = noise(50 + y * 0.08);
      let leftCliffX = 0 + (8 + leftNoiseVal * 10 + wideningOffset);
      let leftCliffWidth = lerp(12, 25, yProgress);
      let leftCliffEnd = min(pg.width, leftCliffX);
      
      // 오른쪽 암벽 시작 위치
      let rightNoiseVal = noise(100 + y * 0.08);
      let rightCliffX = pg.width - (8 + rightNoiseVal * 10 + wideningOffset);
      let rightCliffWidth = lerp(12, 25, yProgress);
      let rightCliffStart = max(0, rightCliffX);
      
      // 바닥 돌 밀도 (아래로 갈수록 증가, 겹쳐 보이도록 높게)
      let stoneDensity = lerp(0.7, 0.95, floorProgress);
      // 진한 돌 비율 (딱딱한 느낌을 위해 높게)
      let darkStoneRatio = lerp(0.5, 0.7, floorProgress);
      // 연한 돌 비율 (줄임)
      let lightStoneRatio = lerp(0.1, 0.2, floorProgress);
      
      // 바닥 전체에 돌 패턴 그리기 (겹쳐 보이도록 여러 레이어)
      for (let layer = 0; layer < 2; layer++) {
        for (let x = 0; x < pg.width; x += 2) {
          // 암벽 영역은 이미 돌이 있으므로 스킵하거나, 더 밀도 높게
          let isOnLeftCliff = x < leftCliffEnd;
          let isOnRightCliff = x >= rightCliffStart;
          
          // 암벽 영역이면 더 밀도 높게, 중간 영역이면 일반 밀도
          let currentDensity = (isOnLeftCliff || isOnRightCliff) ? 
                               min(1.0, stoneDensity * 1.1) : stoneDensity;
          
          // 레이어마다 약간 다른 밀도
          let layerDensity = currentDensity * (1 - layer * 0.3);
          
          if (random() < layerDensity) {
            // 돌 타입 결정 (진한 돌 우선)
            let rand = random();
            let stoneColor;
            
            if (rand < darkStoneRatio) {
              // 진한 돌 (딱딱한 느낌)
              let jitter = random(-8, 8);
              let r = constrain(red(darkStoneColor) + jitter, 0, 255);
              let g = constrain(green(darkStoneColor) + jitter, 0, 255);
              let b = constrain(blue(darkStoneColor) + jitter, 0, 255);
              stoneColor = pg.color(r, g, b, 100);
            } else if (rand < darkStoneRatio + lightStoneRatio) {
              // 연한 돌
              let jitter = random(-6, 10);
              let r = constrain(red(lightStoneColor) + jitter, 0, 255);
              let g = constrain(green(lightStoneColor) + jitter, 0, 255);
              let b = constrain(blue(lightStoneColor) + jitter, 0, 255);
              stoneColor = pg.color(r, g, b, 90);
            } else {
              // 일반 돌
              let jitter = random(-10, 10);
              let r = constrain(red(cliffFront) + jitter, 0, 255);
              let g = constrain(green(cliffFront) + jitter, 0, 255);
              let b = constrain(blue(cliffFront) + jitter, 0, 255);
              stoneColor = pg.color(r, g, b, 95);
            }
            
            // 레이어에 따라 약간 다른 위치로 겹쳐 보이게
            let offsetX = layer * 1;
            let offsetY = layer * 1;
            
            pg.fill(stoneColor);
            pg.rect(x + offsetX, y + offsetY, 2, 2);
          }
        }
      }
    }

    pg.pop();
  }

  // ==============================
  // 수중 반짝임 (Caustics) - 돌 위에만 그리기
  // ==============================
  drawCaustics(pg) {
    pg.push();
    pg.noStroke();

    const surfY = int(SURFACE_Y);
    const time = millis() * 0.001; // 시간 기반 움직임

    // 물결 패턴 기본 색상 (밝은 청록빛)
    const glow = pg.color(120, 220, 255, 35); // 투명도 있는 하늘빛

    for (let y = surfY; y < pg.height; y += 4) {
      let yProgress = (y - surfY) / (pg.height - surfY);
      
      // 양쪽 암벽 영역 계산 (아래로 갈수록 더 넓어짐)
      let wideningOffset = yProgress * pg.width * lerp(0.08, 0.25, yProgress);
      
      // 왼쪽 암벽 영역
      let leftNoiseVal = noise(50 + y * 0.08);
      let leftCliffX = 0 + (8 + leftNoiseVal * 10 + wideningOffset);
      let leftCliffWidth = lerp(12, 25, yProgress);
      let leftCliffStart = max(0, leftCliffX - leftCliffWidth);
      let leftCliffEnd = min(pg.width, leftCliffX);
      
      // 오른쪽 암벽 영역
      let rightNoiseVal = noise(100 + y * 0.08);
      let rightCliffX = pg.width - (8 + rightNoiseVal * 10 + wideningOffset);
      let rightCliffWidth = lerp(12, 25, yProgress);
      let rightCliffStart = max(0, rightCliffX);
      let rightCliffEnd = min(pg.width, rightCliffX + rightCliffWidth);
      
      for (let x = 0; x < pg.width; x += 4) {
        // 암벽 영역 내에만 반짝임 그리기
        let isOnCliff = (x >= leftCliffStart && x < leftCliffEnd) || 
                        (x >= rightCliffStart && x < rightCliffEnd);
        
        if (isOnCliff) {
          // 퍼린 노이즈 값으로 패턴 생성
          const n = noise(x * 0.05 + time * 0.6, y * 0.05 + time * 0.4);
          const brightness = pow(n, 6.0); // 밝은 영역만 강조 (exponent ↑)

          if (brightness > 0.55) {
            // 반짝이는 점만 찍기
            const alpha = map(brightness, 0.55, 1, 0, 150);
            pg.fill(red(glow), green(glow), blue(glow), alpha);
            pg.rect(x, y, 4, 4);
          }
        }
      }
    }

    pg.pop();
  }

  // ==============================
  // 빛줄기 효과 (Light Shafts) - 생겼다 사라졌다
  // ==============================
  drawLightShafts(pg) {
    pg.push();
    pg.blendMode(ADD);
    pg.noStroke();

    const surfY = int(SURFACE_Y);
    const time = millis() * 0.0005; // 시간 기반 애니메이션

    // 여러 개의 빛줄기 (더 많이 겹치도록 증가)
    const shaftCount = 5;
    
    // 모든 빛줄기가 시작하는 위쪽 점 (수면 위 중앙)
    const startX = pg.width * 0.5;
    const startY = surfY * 0.3; // 수면 위쪽
    
    // 각 빛줄기의 퍼짐 각도 (중앙에서 좌우로 퍼짐, 겹치도록 가깝게)
    const spreadAngle = [-0.12, -0.06, 0, 0.06, 0.12]; // 각 빛줄기의 각도 (겹치도록)
    
    for (let i = 0; i < shaftCount; i++) {
      const cycleTime = (time + i * 2) % 8; // 8초 주기
      
      // 페이드 인/아웃 효과 (0~2초: 페이드 인, 2~6초: 유지, 6~8초: 페이드 아웃)
      let alpha = 0;
      if (cycleTime < 2) {
        // 페이드 인
        alpha = map(cycleTime, 0, 2, 0, 1);
      } else if (cycleTime < 6) {
        // 유지
        alpha = 1;
      } else {
        // 페이드 아웃
        alpha = map(cycleTime, 6, 8, 1, 0);
      }
      
      // 빛줄기가 보일 때만 그리기
      if (alpha <= 0.1) continue;

      const glowColor = pg.color(255, 240, 180, alpha * 30); // 알파값 70 → 30으로 낮춤

      // ✅ 여기서 한 번만 "위쪽 중심 / 아래쪽 중심" 계산
      const topDistance = surfY - startY;
      const bottomDistance = pg.height - startY;

      const topXCenter    = startX + topDistance    * spreadAngle[i];
      const bottomXCenter = startX + bottomDistance * spreadAngle[i];

      const topY = surfY;
      const bottomY = pg.height;

      const topWidth = 3;
      const bottomWidth = 50;

      const segments = 20;
      for (let seg = 0; seg < segments; seg++) {
        const t1 = seg / segments;
        const t2 = (seg + 1) / segments;

        const y1 = lerp(topY, bottomY, t1);
        const y2 = lerp(topY, bottomY, t2);

        // ✅ 세그먼트마다 중심은 위/아래 중심을 lerp 해서 "완전 직선"
        const xCenter1 = lerp(topXCenter, bottomXCenter, t1);
        const xCenter2 = lerp(topXCenter, bottomXCenter, t2);

        const width1 = lerp(topWidth, bottomWidth, t1);
        const width2 = lerp(topWidth, bottomWidth, t2);

        const depthAlpha = lerp(0.3, 1.0, t1);
        const finalAlpha = alpha * 30 * depthAlpha; // 알파값 70 → 30으로 낮춤

        pg.fill(
          red(glowColor),
          green(glowColor),
          blue(glowColor),
          finalAlpha
        );

        pg.beginShape();
        pg.vertex(xCenter1 - width1 / 2, y1);
        pg.vertex(xCenter1 + width1 / 2, y1);
        pg.vertex(xCenter2 + width2 / 2, y2);
        pg.vertex(xCenter2 - width2 / 2, y2);
        pg.endShape(pg.CLOSE);
      }
    }

    pg.pop();
    pg.blendMode(BLEND);
  }

  // ==============================
  // 별 반짝임 효과 (어두운 하늘에만)
  // ==============================
  isDarkSky(skyColor) {
    // 하늘 색상의 밝기를 계산 (RGB 평균)
    const brightness = (red(skyColor) + green(skyColor) + blue(skyColor)) / 3;
    // 밝기가 60 이하이면 어두운 하늘로 판단
    return brightness < 60;
  }

  drawStars(pg, surfY) {
    pg.push();
    pg.noStroke();

    const time = millis() * 0.001; // 시간 기반 애니메이션
    const starCount = 80; // 별 개수

    // 별 위치를 고정하기 위해 noise 기반 seed 사용
    randomSeed(12345); // 고정된 seed로 항상 같은 위치에 별 생성

    for (let i = 0; i < starCount; i++) {
      // 별 위치 (하늘 영역 내)
      const x = random(0, pg.width);
      const y = random(0, surfY * 0.8); // 하늘 위쪽 80% 영역

      // 각 별의 고유한 반짝임 속도와 밝기
      const starSeed = i * 100;
      const twinkleSpeed = 0.5 + (i % 3) * 0.3; // 속도 다양화
      const twinklePhase = (time * twinkleSpeed + starSeed * 0.01) % TWO_PI;
      
      // 반짝임 효과 (sin 파형 사용)
      const twinkle = (sin(twinklePhase) + 1) * 0.5; // 0~1 사이 값
      
      // 밝기 변화 (어두워졌다 밝아졌다)
      const minBrightness = 0.3;
      const maxBrightness = 1.0;
      const brightness = lerp(minBrightness, maxBrightness, twinkle);

      // 별 크기 (작은 별과 큰 별)
      const starSize = (i % 5 === 0) ? 2 : 1; // 5개마다 큰 별

      // 별 색상 (밝기에 따라)
      const starAlpha = brightness * 255;
      pg.fill(255, 255, 255, starAlpha);

      // 별 그리기 (픽셀 스타일)
      if (starSize === 1) {
        // 작은 별 (1픽셀)
        pg.rect(x, y, 1, 1);
      } else {
        // 큰 별 (십자가 모양)
        pg.rect(x, y, 1, 1);
        pg.rect(x - 1, y, 1, 1);
        pg.rect(x + 1, y, 1, 1);
        pg.rect(x, y - 1, 1, 1);
        pg.rect(x, y + 1, 1, 1);
      }
    }

    // seed 초기화 (다른 랜덤 함수에 영향 주지 않도록)
    randomSeed(millis());

    pg.pop();
  }

  // ==============================
  // 해 그리기 (밝은 하늘에만)
  // ==============================
  drawSun(pg, surfY) {
    pg.push();
    pg.noStroke();

    // 해 위치 (하늘 위쪽 중앙에서 약간 오른쪽)
    const sunX = pg.width * 0.65;
    const sunY = surfY * 0.35;
    const sunRadius = 12; // 해 반지름

    // 해 중심 색상 (밝은 노란색)
    const sunCoreColor = pg.color(255, 240, 180, 255);
    // 해 외곽 색상 (더 밝은 노란색)
    const sunOuterColor = pg.color(255, 255, 200, 200);

    // 해 그리기 (픽셀 스타일, 원형)
    for (let dy = -sunRadius; dy <= sunRadius; dy++) {
      for (let dx = -sunRadius; dx <= sunRadius; dx++) {
        const dist = sqrt(dx * dx + dy * dy);
        
        if (dist <= sunRadius) {
          // 중심에서의 거리에 따라 색상 변화
          const t = dist / sunRadius;
          const sunColor = pg.lerpColor(sunCoreColor, sunOuterColor, t);
          
          pg.fill(sunColor);
          pg.rect(sunX + dx, sunY + dy, 1, 1);
        }
      }
    }

    // 해 주변 빛 효과 (반짝임)
    const time = millis() * 0.001;
    const rayCount = 8;
    for (let i = 0; i < rayCount; i++) {
      const angle = (TWO_PI / rayCount) * i + time * 0.1;
      const rayLength = sunRadius + 3 + sin(time * 2 + i) * 2;
      const rayX = sunX + cos(angle) * rayLength;
      const rayY = sunY + sin(angle) * rayLength;
      
      // 빛줄기 색상 (밝은 노란색, 반투명)
      const rayAlpha = 150 + sin(time * 2 + i) * 50;
      pg.fill(255, 250, 200, rayAlpha);
      pg.rect(rayX, rayY, 1, 1);
      
      // 빛줄기 주변 작은 점들
      if (i % 2 === 0) {
        const smallRayX = sunX + cos(angle) * (rayLength - 2);
        const smallRayY = sunY + sin(angle) * (rayLength - 2);
        pg.fill(255, 255, 220, rayAlpha * 0.7);
        pg.rect(smallRayX, smallRayY, 1, 1);
      }
    }

    pg.pop();
  }
}

