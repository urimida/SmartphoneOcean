// ==============================
// Bird (새 - 하늘 위 V자 픽셀 새)
// ==============================
class Bird {
  constructor() {
    this.reset();
  }

  reset() {
    this.dir = random() < 0.5 ? 1 : -1;
    this.speed = random(0.2, 0.5);
    this.y = random(SURFACE_Y * 0.25, SURFACE_Y * 0.8);
    this.x = this.dir > 0 ? -20 : BASE_W + 20;
  }

  update() {
    this.x += this.speed * this.dir;
    if (this.dir > 0 && this.x > BASE_W + 20) this.reset();
    if (this.dir < 0 && this.x < -20) this.reset();
  }

  draw(pg) {
    const cx = int(this.x);
    const cy = int(this.y);
    pg.push();
    pg.noStroke();
    pg.fill(90, 120, 160);
    if (this.dir > 0) {
      // 오른쪽으로 나는 V자
      pg.rect(cx - 2, cy, 1, 1);
      pg.rect(cx - 1, cy - 1, 1, 1);
      pg.rect(cx, cy, 1, 1);
    } else {
      // 왼쪽으로 나는 V자
      pg.rect(cx + 2, cy, 1, 1);
      pg.rect(cx + 1, cy - 1, 1, 1);
      pg.rect(cx, cy, 1, 1);
    }
    pg.pop();
  }
}


