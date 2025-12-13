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
}

