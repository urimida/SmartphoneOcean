// ==============================
// Seahorse (해마)
// ==============================

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
    this.y = random(totalBgHeight * 0.98, totalBgHeight * 0.99) - 10;
    this.size = random(2, 4) * 1.3;
    this.vx = random(-0.2, 0.2);
    this.bobOffset = random(TWO_PI);
    this.bobSpeed = random(0.02, 0.04);
    this.bobAmount = random(0.3, 0.8);
    this.facingRight = this.vx > 0;
    this.deliveryData = null; // JSON에서 로드한 배달 데이터
    this.dismissed = false; // "그냥 지나치기"를 누른 해마는 다시 모달이 뜨지 않음
    
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
    if (this.y < totalBgHeight * 0.98 - 10) this.y = totalBgHeight * 0.98 - 10;
    if (this.y > totalBgHeight * 0.99 - 10) this.y = totalBgHeight * 0.99 - 10;
    
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
    // 해마 이미지 그리기
    // ==========================
    pg.imageMode(CENTER);
    const imgWidth = imgSeahorse.width * k * 0.006; // 이미지 크기 조정 (2배 확대)
    const imgHeight = imgSeahorse.height * k * 0.006;
    pg.image(imgSeahorse, 0, 0, imgWidth, imgHeight);

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

    // 1) 텍스트 소스 만들기
    let itemsText = this.deliveryData.orderItems.join("  •  ");
    let content = `${this.deliveryData.storeName}  •  ${itemsText}  •  ${this.deliveryData.totalPrice.toLocaleString()}원`;

    if (this.deliveryData.reviewEvent && this.deliveryData.reviewMessage) {
      content += `  •  ${this.deliveryData.reviewMessage}`;
    }

    content = content.toUpperCase();

    // 글자가 모자라지 않게 충분히 반복
    while (content.length < 1000) {
      content += "   •   " + content;
    }

    let idx = 0; // content에서 꺼낼 문자 인덱스

    noStroke();
    textFont("Pretendard");
    textAlign(CENTER, CENTER);

    // ─────────────────────────────
    // 2) 해마 픽셀 마스크 기반으로 텍스트 찍기
    // ─────────────────────────────
    const maskRows = SEAHORSE_TEXT_MASK.length;
    const maskCols = SEAHORSE_TEXT_MASK[0].length;
    const cx = width / 2;
    const totalHeight = height * 0.55;        // 전체 해마 높이
    const cellSize = totalHeight / maskRows;  // 한 칸 크기
    const totalWidth = maskCols * cellSize;
    const startX = cx - totalWidth / 2;
    const startY = height * 0.5 - totalHeight * 0.55; // 화면 중앙 기준 약간 위

    // 시간 기반 움직임을 위한 변수
    const baseTime = frameCount * 0.04; // 해파리보다 약간 느리게
    
    for (let r = 0; r < maskRows; r++) {
      const row = SEAHORSE_TEXT_MASK[r];
      const tRow = r / max(1, maskRows - 1); // 위→아래 그라디언트

      // 위쪽(머리) 밝고 아래쪽(꼬리) 어둡게
      const col = lerpColor(
        color(150, 220, 255, 250),
        color(20, 80, 150, 200),
        tRow
      );

      for (let c = 0; c < maskCols; c++) {
        if (row[c] !== "X") continue; // 빈칸은 스킵

        // 공백/줄바꿈이면 다음 문자로 스킵
        let ch = content[idx++ % content.length];
        while ((ch === " " || ch === "\n") && content.length > 0) {
          ch = content[idx++ % content.length];
        }

        // 기본 위치
        const baseX = startX + c * cellSize + cellSize / 2;
        const baseY = startY + r * cellSize + cellSize / 2;
        
        // 해마의 위치에 따른 움직임 패턴
        // 머리 부분(위쪽)은 더 많이 움직이고, 꼬리 부분(아래쪽)은 덜 움직임
        const headFactor = 1.0 - tRow; // 머리일수록 1에 가까움
        const tailFactor = tRow; // 꼬리일수록 1에 가까움
        
        // 수평 움직임 (좌우로 흔들림)
        const waveX1 = sin(baseTime + c * 0.2 + r * 0.15) * (2 + headFactor * 3);
        const waveX2 = cos(baseTime * 0.7 + c * 0.15) * (1 + headFactor * 2);
        const waveX = waveX1 + waveX2 * 0.5;
        
        // 수직 움직임 (위아래로 흔들림, 머리 부분이 더 많이)
        const waveY1 = sin(baseTime * 0.8 + r * 0.3) * (1.5 + headFactor * 2);
        const waveY2 = cos(baseTime * 0.6 + c * 0.2) * (0.8 + headFactor * 1.5);
        const waveY = waveY1 + waveY2 * 0.4;
        
        // 꼬리 부분은 spiral처럼 회전하는 움직임 추가
        const spiralWave = tailFactor > 0.6 ? sin(baseTime * 0.5 + r * 0.4 + c * 0.3) * tailFactor * 2 : 0;
        
        const x = baseX + waveX + spiralWave;
        const y = baseY + waveY;
        const size = cellSize * 0.85;

        textSize(size);
        fill(col);

        push();
        translate(x, y);
        // 움직임에 따라 자연스럽게 회전 (해파리처럼)
        const rotation = (waveX + waveY) * 0.05 + spiralWave * 0.1;
        rotate(rotation);
        text(ch, 0, 0);
        pop();
      }
    }

    // ─────────────────────────────
    // 3) 닫기 버튼 (해마 아래)
    // ─────────────────────────────
    const btnY = startY + totalHeight + 50;
    const btnW = 140;
    const btnH = 35;
    const btnX = cx - btnW / 2;

    fill(60, 120, 180, 240);
    stroke(100, 150, 200);
    strokeWeight(2);
    rect(btnX, btnY - btnH / 2, btnW, btnH);

    fill(255);
    textSize(14);
    textAlign(CENTER, CENTER);
    text("클릭해서 닫기", cx, btnY);

    return { x: cx, y: btnY };
  }
}

