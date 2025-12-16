// ==============================
// Jellyfish (해파리)
// ==============================
class Jellyfish {
  constructor() {
    this.x = random(30, BASE_W - 30);
    // 확장된 배경 높이 기준 (BASE_H * 1.3)
    const totalBgHeight = BASE_H * 1.3;
    this.baseY = random(totalBgHeight * 0.96, totalBgHeight * 0.99) - 50;
    this.y = this.baseY;

    this.radius = random(3, 6);
    this.tentacleCount = int(random(5, 8));
    this.tentacleLength = int(random(6, 12));

    this.floatAmp = random(3, 7);
    this.floatSpeed = random(0.002, 0.004);
    this.phaseOffset = random(TWO_PI);

    this.driftSpeed = random(0.06, 0.12);
    
    this.chatData = null; // JSON에서 로드한 채팅 데이터
    this.dismissed = false; // "그냥 지나치기"를 누른 해파리는 다시 모달이 뜨지 않음
  }

  update() {
    const t = millis() * this.floatSpeed + this.phaseOffset;
    this.y = this.baseY + sin(t) * this.floatAmp;

    const nx = noise(t * 0.3);
    this.x += (nx - 0.5) * this.driftSpeed;

    if (this.x < 20) this.x = 20;
    if (this.x > BASE_W - 20) this.x = BASE_W - 20;
  }

  draw(pg) {
    pg.push();
    pg.noStroke();

    const cx = int(this.x);
    const cy = int(this.y);

    // 글로우 & 돔은 기존과 비슷하게, 다만 random 사용은 최소화
    for (let ry = -this.radius; ry <= 0; ry++) {
      for (let rx = -this.radius; rx <= this.radius; rx++) {
        const nx = rx / this.radius;
        const ny = ry / this.radius;
        const r = sqrt(nx * nx + ny * ny);
        if (r <= 1.0) {
          let col;
          if (r > 0.78) {
            col = pg.color(245, 252, 255, 235);
          } else {
            col = pg.color(120, 230, 255, 230);
          }
          const topFactor = map(ry, -this.radius, 0, 1.1, 0.9);
          col.setRed(red(col) * topFactor);
          col.setGreen(green(col) * topFactor);
          col.setBlue(blue(col) * topFactor);

          pg.fill(col);
          pg.rect(cx + rx, cy + ry, 1, 1);
        }
      }
    }

    // 아래 프린지
    pg.fill(240, 250, 255, 200);
    for (let rx = -this.radius + 1; rx <= this.radius - 1; rx++) {
      if ((rx + cx) % 2 === 0) { // random 대신 규칙 패턴 사용
        pg.rect(cx + rx, cy + 1, 1, 1);
      }
    }

    // 촉수
    const baseTime = frameCount * 0.06 + this.phaseOffset;
    for (let i = 0; i < this.tentacleCount; i++) {
      const idxNorm = (i - (this.tentacleCount - 1) / 2) / this.tentacleCount;
      const tentacleBaseX = cx + idxNorm * (this.radius * 1.3);

      for (let j = 0; j < this.tentacleLength; j++) {
        const depth = j / this.tentacleLength;
        const wave = sin(baseTime + i * 0.45 + j * 0.3) * (0.6 + depth * 1.8);
        const px = int(tentacleBaseX + wave);
        const py = int(cy + 2 + j);

        let col;
        if (depth < 0.25) {
          col = pg.color(235, 245, 255, 210);
        } else {
          const mix = depth;
          const r = lerp(230, 150, mix);
          const g = lerp(245, 190, mix);
          const b = lerp(255, 255, mix);
          col = pg.color(r, g, b, lerp(200, 160, depth));
        }
        pg.fill(col);
        pg.rect(px, py, 1, 1);
      }
    }

    pg.pop();
  }

  // 글자로 만든 해파리 (자세히 보기 모드)
  // 머리(돔/프린지)는 기존 영롱한 해파리 느낌 그대로,
  // 다리(촉수)만 텍스트로 표현
  drawTextDetail() {
    if (!this.chatData) return { x: 0, y: 0 }; // 데이터 없으면 패스

    // 1) 텍스트 소스 만들기
    let content = "";
    if (this.chatData.sender) {
      content += `${this.chatData.sender}  •  `;
    }
    if (this.chatData.date) {
      content += `${this.chatData.date}  •  `;
    }
    if (this.chatData.content) {
      content += this.chatData.content;
    }

    // 텍스트가 너무 짧으면 여러 번 반복해서 충분히 확보
    if (!content || content.length < 10) {
      content = "DIGITAL JELLYFISH  •  CHAT  •  ";
    }
    while (content.length < 1200) {
      content += "   •   " + content;
    }

    let idx = 0; // content에서 꺼낼 문자 인덱스

    noStroke();
    textFont(uiFont || 'ThinDungGeunMo');
    textAlign(CENTER, CENTER);

    // 2) 해파리 픽셀 실루엣 생성 (가상의 작은 그리드 상에서)
    //    -> 이후 화면 크기에 맞게 스케일링
    const virtRadius = 18;
    const virtTentacles = 14;
    const virtTentacleLen = 22;

    // 한 번만 생성해서 캐싱 (성능 최적화)
    if (!this.constructor._textPixels) {
      this.constructor._textPixels = getJellyfishPixels(
        0,
        0,
        virtRadius,
        virtTentacles,
        virtTentacleLen
      );
    }
    const pixels = this.constructor._textPixels;

    // 전체 영역의 경계 계산
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pixels) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const shapeWidth = maxX - minX + 1;
    const shapeHeight = maxY - minY + 1;

    const cx = width / 2;
    const totalTargetHeight = height * 0.55; // 화면 높이 대비 해파리 전체 높이
    const cellSize = totalTargetHeight / shapeHeight; // 가상 픽셀 한 칸 크기
    const totalTargetWidth = shapeWidth * cellSize;

    const startX = cx - totalTargetWidth / 2;
    const startY = height * 0.45 - totalTargetHeight * 0.45; // 화면 중앙보다 약간 위

    // 시간에 따른 흔들림
    const baseTime = frameCount * 0.04 + this.phaseOffset;

    // 머리 부분(돔 + 프린지)도 텍스트로 표현 (그라데이션 유지)
    for (const p of pixels) {
      if (p.type !== "dome" && p.type !== "fringe") continue;

      // 텍스트용 문자 추출 (공백/줄바꿈은 건너뛰기)
      let ch = content[idx++ % content.length];
      let safety = 0;
      while ((ch === " " || ch === "\n") && safety < content.length) {
        ch = content[idx++ % content.length];
        safety++;
      }

      const localX = p.x - minX;
      const localY = p.y - minY;
      const x = startX + localX * cellSize + cellSize / 2;
      const y = startY + localY * cellSize + cellSize / 2;

      // 돔의 경우 중심 → 가장자리로 갈수록 더 투명해지는 색 그라디언트
      let col;
      if (p.type === "dome") {
        const rNorm = p.r !== undefined ? p.r : 0.5;
        const inner = color(90, 220, 255, 255);   // 안쪽 시안
        const mid   = color(170, 245, 255, 255);  // 중간
        const outer = color(255, 255, 255, 200);   // 가장자리: 색은 밝지만 약간 투명

        // 중심 → 중간 → 가장자리로 갈수록
        // 색은 약간 더 밝아지지만 알파는 강하게 줄어드는 2단 그라디언트
        const t = constrain(rNorm, 0, 1);
        if (t < 0.6) {
          col = lerpColor(inner, mid, t / 0.6);
        } else {
          col = lerpColor(mid, outer, (t - 0.6) / 0.4);
        }

        // 상단 쪽은 조금 더 밝게 + 살짝 푸른 기 (투명도는 그대로 유지)
        const topFactor = map(localY, -virtRadius, 0, 0.75, 1.0);
        col.setRed(red(col) * topFactor);
        col.setGreen(green(col) * topFactor);
        col.setBlue(blue(col) * topFactor);
      } else {
        // 프린지
        col = color(220, 240, 255, 230);
      }

      // 움직임 효과 (부드러운 흔들림)
      const waveX = sin(baseTime + localY * 0.1) * cellSize * 0.2;
      const waveY = cos(baseTime * 0.8 + localX * 0.08) * cellSize * 0.15;
      const finalX = x + waveX;
      const finalY = y + waveY;

      // 텍스트 크기 (다리와 같은 크기로 맞춤)
      // 촉수의 기본 크기는 cellSize * 0.85이므로 동일하게 설정
      let txtSize = cellSize * 0.85;
      // 전역 텍스트 크기 스케일 적용
      if (typeof textDetailSizeScale !== 'undefined') {
        txtSize *= textDetailSizeScale;
      }

      fill(col);
      textSize(txtSize);

      push();
      translate(finalX, finalY);
      // 부드러운 회전
      const rot = (waveX + waveY) * 0.02 + sin(baseTime * 0.5 + localX * 0.05) * 0.1;
      rotate(rot);
      text(ch, 0, 0);
      pop();
    }

    // 다리(촉수) 부분: 텍스트로 표현
    for (const p of pixels) {
      if (p.type !== "tentacle") continue;

      // 텍스트용 문자 추출 (공백/줄바꿈은 건너뛰기)
      let ch = content[idx++ % content.length];
      let safety = 0;
      while ((ch === " " || ch === "\n") && safety < content.length) {
        ch = content[idx++ % content.length];
        safety++;
      }

      const localX = p.x - minX;
      const localY = p.y - minY;

      // 기본 위치
      let x = startX + localX * cellSize + cellSize / 2;
      let y = startY + localY * cellSize + cellSize / 2;

      const depth = p.depth !== undefined ? p.depth : 0;
      const tentacleIndex = p.tentacleIndex !== undefined ? p.tentacleIndex : 0;

      // 머리에서 멀어질수록(아래로 갈수록) 더 많이 흔들리는 느낌
      const waveStrength = 1.0 + depth * 2.5;

      // 수평/수직 파동
      const waveX =
        sin(baseTime + tentacleIndex * 0.5 + depth * 4.0) *
        cellSize *
        0.4 *
        waveStrength;
      const waveY =
        cos(baseTime * 0.8 + tentacleIndex * 0.3 + depth * 5.0) *
        cellSize *
        0.25 *
        waveStrength;

      x += waveX;
      y += waveY;

      // 색상: 위쪽은 밝고, 아래쪽(끝쪽)은 약간 더 푸른 톤
      const col = lerpColor(
        color(235, 245, 255, 230),
        color(150, 190, 255, 210),
        constrain(depth, 0, 1)
      );

      let txtSize = cellSize * (0.85 + depth * 0.4);
      // 전역 텍스트 크기 스케일 적용
      if (typeof textDetailSizeScale !== 'undefined') {
        txtSize *= textDetailSizeScale;
      }

      fill(col);
      textSize(txtSize);

      push();
      translate(x, y);
      // 파동에 따라 자연스럽게 회전
      const rot =
        (waveX + waveY) * 0.04 +
        sin(baseTime * 0.6 + depth * 6.0 + tentacleIndex * 0.7) * 0.15;
      rotate(rot);
      text(ch, 0, 0);
      pop();
    }

    // 3) 닫기 버튼 (해파리 아래쪽)
    const btnY = startY + totalTargetHeight + 55;
    const btnW = 140;
    const btnH = 35;
    const btnX = cx - btnW / 2;

    fill(60, 120, 180, 240);
    stroke(100, 150, 200);
    strokeWeight(2);
    rect(btnX, btnY - btnH / 2, btnW, btnH, 10); // UI_MODAL_RADIUS와 동일

    fill(255);
    textSize(14);
    textAlign(CENTER, CENTER);
    text("클릭해서 닫기", cx, btnY);

    // sketch.js에서 닫기 영역 계산용 좌표 반환
    return { x: cx, y: btnY };
  }
}

