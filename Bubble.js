// ==============================
// 버블 (월드 좌표 기준으로만 관리)
// ==============================
function spawnBubble(worldX, worldY) {
  // 성능 최적화: 기포가 너무 많으면 생성하지 않음
  if (bubbles.length >= MAX_BUBBLES) {
    return; // 기포 생성 스킵
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
    this._shouldRemove = false; // 제거 플래그 초기화
  }

  update() {
    this.y -= this.speed;
    // 성능 최적화: wobble 계산 간소화
    this.wobbleX = sin(frameCount * this.wobbleSpeed) * this.wobbleAmount;
    // 화면 밖으로 나가면 즉시 제거 대상으로 표시
    if (this.y < SURFACE_Y - 20) {
      this._shouldRemove = true;
    }
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
    // 성능 최적화: 플래그가 있으면 즉시 반환
    if (this._shouldRemove) return true;
    return this.y < SURFACE_Y - 10; // 수면 조금 위에서 사라지게 처리
  }
}


