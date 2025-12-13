// ==============================
// Whale (고래) - 숏폼 관련
// ==============================
class Whale {
  constructor() {
    this.x = random(50, BASE_W - 50);
    this.baseY = random(BASE_H * 0.4, BASE_H * 0.7);
    this.y = this.baseY;
    
    this.size = random(8, 15); // 고래 크기
    this.vx = random(-0.15, 0.15);
    this.vy = random(-0.05, 0.05);
    
    this.bobOffset = random(TWO_PI);
    this.bobSpeed = random(0.01, 0.02);
    this.bobAmount = random(1, 2);
    
    this.facingRight = this.vx > 0;
    
    this.shortformData = null; // JSON에서 로드한 숏폼 데이터
    this.dismissed = false; // "그냥 지나치기"를 누른 고래는 다시 모달이 뜨지 않음
    
    // 반짝임 효과를 위한 파티클들
    this.sparkles = [];
    for (let i = 0; i < 30; i++) {
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
    
    // Y 범위 제한
    if (this.y < BASE_H * 0.3) this.y = BASE_H * 0.3;
    if (this.y > BASE_H * 0.8) this.y = BASE_H * 0.8;
    
    // 반짝임 효과 업데이트
    const t = millis() * 0.001 + this.timeOffset;
    for (let sparkle of this.sparkles) {
      sparkle.alpha = 100 + sin(t * sparkle.twinkleSpeed * 10) * 155;
    }
  }

  draw(pg) {
    pg.push();
    pg.noStroke();

    // 중심으로 이동
    pg.translate(this.x, this.y);

    // ✅ 이 실루엣은 "기본이 왼쪽을 보는 고래" 기준
    // 따라서 오른쪽을 보게 하려면 X를 뒤집어야 함
    if (this.facingRight) {
      pg.scale(-1, 1);
    }

    // 살짝 대각선으로 헤엄치는 느낌
    pg.rotate(-0.12);

    const s = this.size;
    const k = s;
    const t = millis() * 0.001 + this.timeOffset;

    // ==========================
    // 1) 몸통 + 꼬리 (🐳 고래다운 둥근 머리 + 플루크 꼬리)
    // ==========================
    const topColor = "rgba(20, 60, 120, 0.95)";
    const midColor = "rgba(40, 110, 190, 0.9)";
    const bellyColor = "rgba(150, 220, 255, 0.9)";

    const ctx = pg.drawingContext;
    ctx.save();

    const grad = ctx.createLinearGradient(0, -1.6 * k, 0, 1.2 * k);
    grad.addColorStop(0.0, topColor);
    grad.addColorStop(0.45, midColor);
    grad.addColorStop(1.0, bellyColor);
    ctx.fillStyle = grad;

    ctx.beginPath();

    // 기준: 왼쪽이 머리, 오른쪽이 꼬리
    // 포인트들: "머리 크게 둥글게" + "꼬리자루 얇게" + "플루크 크게"
    ctx.moveTo(-3.6 * k,  0.10 * k);                              // 턱 끝(왼쪽 아래)

    // ---- 윗머리(둥글고 통통) ----
    ctx.quadraticCurveTo(-3.8 * k, -1.15 * k, -2.6 * k, -1.35 * k); // 머리 윗볼륨 크게
    ctx.quadraticCurveTo(-1.1 * k, -1.55 * k,  0.5 * k, -1.00 * k); // 등 라인 시작

    // ---- 몸통(🌊 사진처럼 부드럽게 움푹 파이는 등 라인) ----
    // 1단계: 머리 뒤부터 아주 완만하게 내려가기
    ctx.quadraticCurveTo(
      0.9 * k,  -0.90 * k,   // 컨트롤 포인트 (살짝만 눌러줌)
      1.7 * k,  -0.55 * k    // 중간 지점
    );
    // 2단계: X표 지점에서 가장 깊게 파였다가 꼬리로 자연스럽게 이어짐
    ctx.quadraticCurveTo(
      2.2 * k,  -0.15 * k,   // ✅ 여기서 가장 낮아짐 (움푹)
      2.9 * k,  -0.25 * k    // 꼬리 쪽으로 자연스럽게 이어짐
    );

    // ---- 꼬리자루(얇게, 등 라인과 자연스럽게 연결) ----
    ctx.quadraticCurveTo( 2.95 * k, -0.40 * k,  3.20 * k, -0.25 * k);

    // ---- 플루크(꼬리날) 위쪽 ----
    ctx.quadraticCurveTo( 3.55 * k, -0.95 * k,  4.05 * k, -0.85 * k);
    ctx.quadraticCurveTo( 3.75 * k, -0.20 * k,  3.35 * k, -0.05 * k);

    // ---- 플루크 아래쪽 ----
    ctx.quadraticCurveTo( 3.75 * k,  0.15 * k,  4.05 * k,  0.85 * k);
    ctx.quadraticCurveTo( 3.50 * k,  0.95 * k,  3.20 * k,  0.25 * k);

    // ---- 배 라인(하얀 배 크게) ----
    ctx.quadraticCurveTo( 2.60 * k,  1.15 * k,  1.20 * k,  1.20 * k);
    ctx.quadraticCurveTo(-0.70 * k,  1.25 * k, -2.00 * k,  0.95 * k);

    // ---- 턱(웃는 느낌으로 둥글게 닫기) ----
    ctx.quadraticCurveTo(-3.05 * k,  0.80 * k, -3.55 * k,  0.20 * k);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // ==========================
    // 2) 가슴지느러미 (기존 느낌 유지, 위치만 살짝 조정)
    // ==========================
    pg.push();
    pg.translate(-0.6 * k, 0.48 * k); // 머리(왼쪽)가 커졌으니 중심을 약간 왼쪽으로
    pg.rotate(0.95);
    const finLength = 1.9 * k;
    const finThickness = 0.7 * k;
    pg.fill(40, 120, 190, 230);
    pg.ellipse(0, 0, finLength, finThickness);
    pg.pop();

    // ==========================
    // 3) 등지느러미 (몸통 중앙쯤, 둥근 삼각형)
    // ==========================
    pg.fill(20, 60, 120, 230);
    pg.beginShape();
    pg.curveVertex(0.15 * k, -0.35 * k);
    pg.curveVertex(0.15 * k, -0.35 * k);
    pg.curveVertex(0.00 * k, -0.75 * k);   // 꼭대기 낮추기
    pg.curveVertex(0.55 * k, -0.55 * k);
    pg.curveVertex(0.55 * k, -0.55 * k);
    pg.endShape(pg.CLOSE);

    // ==========================
    // 4) 반짝이 (기존 그대로)
    // ==========================
    pg.blendMode(ADD);
    for (let sparkle of this.sparkles) {
      const sx = sparkle.x;
      const sy = sparkle.y;

      // ✅ SVG 참고 - 실루엣이 바뀌었으니 타원 마스크도 조정(머리쪽 더 큼)
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

    // ==========================
    // 5) 블로우홀 (물 분수 구멍)
    // ==========================
    pg.noStroke();
    pg.fill(200, 240, 255, 180);
    pg.ellipse(-1.2 * s, -1.05 * s, 0.18 * s, 0.10 * s);

    // ==========================
    // 6) 눈 + 볼터치 (SVG 참고)
    // ==========================
    // ✅ 눈은 머리 앞쪽(왼쪽) 위 (통통한 고래 느낌으로 조정)
    pg.fill(255);
    const eyeX = -2.25 * s;
    const eyeY = -0.25 * s;
    pg.ellipse(eyeX, eyeY, 0.32 * s, 0.32 * s);
    pg.fill(0);
    pg.ellipse(eyeX, eyeY, 0.17 * s, 0.17 * s);

    // ✅ 볼터치(SVG 참고, 눈과 더 떨어지게)
    pg.noStroke();
    pg.fill(255, 120, 150, 200);
    pg.ellipse(-1.85 * s, 0.15 * s, 0.32 * s, 0.26 * s);

    pg.pop();
  }

  // 글자로 만든 고래 그리기 (자세히 보기 모드)
  drawTextDetail() {
    if (!this.shortformData) return { x: 0, y: 0 }; // 데이터가 없으면 그리지 않음

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
    while (content.length < 1500) {
      content += "   •   " + content;
    }

    let idx = 0; // content에서 꺼낼 문자 인덱스

    noStroke();
    textFont('Pretendard');
    textAlign(CENTER, CENTER);

    // -------------------------
    // 고래 몸체 (타원형) 부분
    // -------------------------
    const baseWidth = min(width, height) * 0.35; // 고래 몸체 너비
    const baseHeight = min(width, height) * 0.25; // 고래 몸체 높이
    const rows = 8; // 몸체 세로 줄 개수
    const cols = 12; // 몸체 가로 줄 개수
    const headOffsetY = -80; // 화면 중앙 기준 위로 올리기

    // 시간 기반 움직임
    const baseTime = frameCount * 0.03;

    for (let row = 0; row < rows; row++) {
      const tRow = row / max(1, rows - 1);
      
      // 위쪽(머리) 밝고 아래쪽(꼬리) 어둡게
      const col = lerpColor(
        color(150, 240, 255, 250),
        color(80, 180, 230, 200),
        tRow
      );

      // 타원형 몸체를 위한 각 행의 너비 계산
      const yPos = -baseHeight / 2 + (row / (rows - 1)) * baseHeight;
      const ellipseWidth = baseWidth * sqrt(1 - pow((yPos / (baseHeight / 2)), 2));
      const nChars = floor((ellipseWidth * 2) / 20); // 문자 간격 조정

      for (let i = 0; i < nChars; i++) {
        const t = i / max(1, nChars - 1);
        const xPos = -ellipseWidth + t * ellipseWidth * 2;
        
        // 움직임 효과 (고래가 살아있는 느낌)
        const waveX = sin(baseTime + row * 0.2) * 2;
        const waveY = cos(baseTime * 0.8 + row * 0.15) * 1.5;
        
        const x = cx + xPos + waveX;
        const y = cy + yPos + waveY + headOffsetY;

        const ch = content[idx++ % content.length];
        if (ch === ' ' || ch === '\n') continue;

        textSize(14 + row * 0.5); // 아래로 갈수록 약간 크게
        textStyle(BOLD);

        fill(col);
        push();
        translate(x, y);
        // 자연스러운 회전
        rotate(sin(baseTime + row * 0.1) * 0.1);
        text(ch, 0, 0);
        pop();
      }
    }

    // -------------------------
    // 지느러미 부분
    // -------------------------
    // 위쪽 지느러미
    const finStartY = cy + headOffsetY - baseHeight / 2 - 20;
    const finChars = 15;
    for (let i = 0; i < finChars; i++) {
      const t = i / finChars;
      const finX = cx + sin(t * PI) * (baseWidth * 0.3);
      const finY = finStartY - t * 15;
      
      const ch = content[idx++ % content.length];
      if (ch === ' ' || ch === '\n') continue;
      
      fill(120, 220, 255, 200);
      textSize(12);
      textStyle(NORMAL);
      push();
      translate(finX, finY);
      rotate(sin(baseTime + i * 0.2) * 0.15);
      text(ch, 0, 0);
      pop();
    }

    // 꼬리 지느러미
    const tailStartY = cy + headOffsetY + baseHeight / 2 + 10;
    for (let i = 0; i < finChars; i++) {
      const t = i / finChars;
      const tailX = cx + sin(t * PI) * (baseWidth * 0.4);
      const tailY = tailStartY + t * 20;
      
      const ch = content[idx++ % content.length];
      if (ch === ' ' || ch === '\n') continue;
      
      fill(80, 180, 230, 180);
      textSize(12);
      textStyle(NORMAL);
      push();
      translate(tailX, tailY);
      rotate(sin(baseTime + i * 0.2) * 0.15);
      text(ch, 0, 0);
      pop();
    }

    // -------------------------
    // 닫기 버튼 (고래 아래)
    // -------------------------
    const btnY = cy + headOffsetY + baseHeight / 2 + 80;
    const btnW = 140;
    const btnH = 35;
    const btnX = cx - btnW / 2;
    
    // 버튼 배경
    fill(60, 120, 180, 240);
    stroke(100, 150, 200);
    strokeWeight(2);
    rect(btnX, btnY - btnH / 2, btnW, btnH);
    
    // 버튼 텍스트
    fill(255);
    textSize(14);
    textAlign(CENTER, CENTER);
    text("클릭해서 닫기", cx, btnY);

    // 닫기 버튼 위치 반환
    return { x: cx, y: btnY };
  }
}

