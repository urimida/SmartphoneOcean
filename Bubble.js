// ==============================
// 버블 (월드 좌표 기준으로만 관리)
// ==============================
function spawnBubble(worldX, worldY) {
  if (bubbles.length >= MAX_BUBBLES) {
    bubbles.shift(); // 오래된 것부터 제거
  }
  bubbles.push(new Bubble(worldX, worldY));
}

class Bubble {
  constructor(worldX, worldY) {
    this.x = worldX;
    this.y = worldY;
    this.size = random(0.8, 1.3);
    this.speed = random(0.3, 0.8);
    this.wobbleX = 0;
    this.wobbleSpeed = random(0.02, 0.05);
    this.wobbleAmount = random(0.5, 1.5);
    this.alpha = random(150, 220);
  }

  update() {
    this.y -= this.speed;
    this.wobbleX = sin(frameCount * this.wobbleSpeed) * this.wobbleAmount;
  }

  draw(pg) {
    pg.push();
    pg.noStroke();
    pg.fill(180, 240, 255, this.alpha);
    let drawX = int(this.x + this.wobbleX);
    let drawY = int(this.y);
    pg.rect(drawX, drawY, 1, 1);
    pg.pop();
  }

  isOffWorld() {
    return this.y < SURFACE_Y - 10; // 수면 조금 위에서 사라지게 처리
  }
}


