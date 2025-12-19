// ==============================
// Swimmer (이미지 기반 다이버)
// ==============================
class Swimmer {
  constructor() {
    this.x = BASE_W * 0.5;
    this.y = BASE_H * 0.45;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0.08; // 전체 이동 속도 0.8배
    this.friction = 0.9;

    this.facingLeft = false;

    // 새로 추가된 값들
    this.bodyAngle = 0;      // 몸 전체 회전 각도
    this.strokePhase = 0;    // 팔/다리 젓는 애니메이션 위상
    this.animationFrame = 0; // 애니메이션 프레임 (번갈아가기용)
    this.scaleFactor = 1.0;  // 크기 보간용 (부드러운 전환)
  }

  update() {
    // 방향키 입력
    if (keyIsDown(LEFT_ARROW)) this.vx -= this.speed;
    if (keyIsDown(RIGHT_ARROW)) this.vx += this.speed;
    if (keyIsDown(UP_ARROW)) this.vy -= this.speed;
    if (keyIsDown(DOWN_ARROW)) this.vy += this.speed;
    
    // 손 인식으로 움직이기 (키보드 입력이 없을 때만, 조이스틱 벡터 사용)
    const hasKeyboardInput = keyIsDown(LEFT_ARROW) || keyIsDown(RIGHT_ARROW) || 
                              keyIsDown(UP_ARROW) || keyIsDown(DOWN_ARROW);
    
    if (!hasKeyboardInput && typeof handControlEnabled !== 'undefined' && handControlEnabled) {
      const handDetectedRecently = (millis() - lastHandTime) < 1000;
      if (handDetectedRecently) {
        const JOY_SPEED = 0.25; // 조이스틱 영향력
        // 필요 시 방향 반전하려면 joyX/joyY에 -1을 곱해 튜닝
        this.vx += joyX * JOY_SPEED;
        this.vy += joyY * JOY_SPEED;
      }
    }

    // 이동
    this.x += this.vx;
    this.y += this.vy;

    // 속도
    const speed = sqrt(this.vx * this.vx + this.vy * this.vy);

    // 버블 생성 (다이버는 텍스트 기포)
    if (speed > 0.05 && random() < BUBBLE_SPAWN_PROB_SWIM) {
      const bubbleX = this.x + random(-3, 3);
      const bubbleY = this.y + random(-2, 2);
      spawnBubble(bubbleX, bubbleY, true); // 텍스트 기포
    }

    // 감속
    this.vx *= this.friction;
    this.vy *= this.friction;

    // 좌우 방향
    if (this.vx > 0.1) this.facingLeft = false;
    if (this.vx < -0.1) this.facingLeft = true;

    // 몸 각도 : 이동 방향을 따라가도록 (수영 방향으로 회전)
    let targetAngle = 0;
    if (speed > 0.05) {
      // 이동 중일 때는 이동 방향으로 회전
      targetAngle = atan2(this.vy, this.vx);
    } else {
      // 가만히 있을 때는 위를 향하도록
      targetAngle = -PI / 2;
    }
    // 약간 부드럽게 보간
    this.bodyAngle = lerp(this.bodyAngle, targetAngle, 0.15);

    // 팔/다리 젓는 위상 증가
    if (speed > 0.02) {
      // 이동 중일 때는 빠르게
      this.strokePhase += 0.18 + speed * 0.12;
      // 애니메이션 프레임 증가 (번갈아가기용)
      this.animationFrame += 0.15;
    } else {
      // 가만히 있을 때는 살살 움직임
      this.strokePhase += 0.05;
      this.animationFrame += 0.03;
    }

    // 크기 보간: 좌우로 움직일 때는 1.4배, 위/아래로 움직일 때는 0.8배
    const absVx = abs(this.vx);
    const absVy = abs(this.vy);
    const isMovingHorizontally = absVx > absVy && (absVx > 0.05);
    const isMovingVertically = absVy > absVx && (absVy > 0.05);
    
    // 위/아래로 이동할 때는 즉시 0.8배 사이즈로 변경
    if (isMovingVertically) {
      this.scaleFactor = 0.8;
    } else {
    const targetScale = isMovingHorizontally ? 1.4 : 1.0;
    this.scaleFactor = lerp(this.scaleFactor, targetScale, 0.2);
    }

    // 수면 아래에서만
    const minY = SURFACE_Y + 8;
    // 배경이 확장되었으므로 확장된 높이까지 내려갈 수 있도록 (BASE_H + extraSkyHeight)
    const extraSkyHeight = BASE_H * 0.3; // sketch.js와 동일한 계산
    const totalBgHeight = BASE_H + extraSkyHeight;
    const maxY = totalBgHeight - 8;
    this.x = constrain(this.x, 8, BASE_W - 8);
    this.y = constrain(this.y, minY, maxY);
  }

  draw(pg) {
    // 이미지가 로드되지 않았으면 리턴
    if (!imgSide1 || !imgSide2 || !imgSide3 || !imgUp) return;

    pg.push();
    pg.translate(this.x, this.y);

    const speed = sqrt(this.vx * this.vx + this.vy * this.vy);
    const absVx = abs(this.vx);
    const absVy = abs(this.vy);

    // 방향 판단: 수직/수평 중 어느 쪽이 더 큰지
    let isVertical = absVy > absVx;
    let isMovingDown = this.vy > 0.05;
    let isMovingUp = this.vy < -0.05;
    let isMovingRight = this.vx > 0.05;
    let isMovingLeft = this.vx < -0.05;

    let currentImg;
    let flipX = false;
    let flipY = false;
    let useAlternate = false;

    if (speed < 0.05) {
      // 가만히 있을 때: up 상태에서 좌우 반전하면서 제자리 헤엄치기
      currentImg = imgUp;
      // 애니메이션 프레임으로 좌우 반전
      flipX = int(this.animationFrame) % 2 === 0;
      flipY = false;
    } else if (isVertical && isMovingDown) {
      // 아래로 갈 때: up 이미지를 위아래 반전해서 양옆으로 번갈아가게
      currentImg = imgUp;
      flipY = true; // 위아래 반전
      // 양옆으로 번갈아가기
      useAlternate = int(this.animationFrame) % 2 === 0;
      flipX = useAlternate; // 한 번은 그대로, 한 번은 좌우 반전
    } else if (isVertical && isMovingUp) {
      // 위로 갈 때: up 이미지를 양옆으로 번갈아가게
      currentImg = imgUp;
      flipY = false;
      // 양옆으로 번갈아가기
      useAlternate = int(this.animationFrame) % 2 === 0;
      flipX = useAlternate; // 한 번은 그대로, 한 번은 좌우 반전
    } else if (isMovingRight) {
      // 오른쪽으로 갈 때: side1, side2, side3을 번갈아가며 사용
      // 모두 반전
      const frameIndex = int(this.animationFrame) % 3;
      if (frameIndex === 0) {
        currentImg = imgSide1;
        flipX = true; // 반전
      } else if (frameIndex === 1) {
        currentImg = imgSide2;
        flipX = true; // 반전
      } else {
        currentImg = imgSide3;
        flipX = true; // 반전
      }
    } else if (isMovingLeft) {
      // 왼쪽으로 갈 때: side1, side2, side3을 번갈아가며 사용
      // 모두 반전 안 함
      const frameIndex = int(this.animationFrame) % 3;
      if (frameIndex === 0) {
        currentImg = imgSide1;
        flipX = false; // 반전 안 함
      } else if (frameIndex === 1) {
        currentImg = imgSide2;
        flipX = false; // 반전 안 함
      } else {
        currentImg = imgSide3;
        flipX = false; // 반전 안 함
      }
    } else {
      // 기본값: 위를 향함
      currentImg = imgUp;
      flipX = false;
      flipY = false;
    }

    // 이미지 그리기
    pg.push();
    
    // 이미지 모드 설정
    pg.imageMode(CENTER);

    // -------- 후광(halo) 효과: 더 작고 동그란, 단계가 많은 그라데이션 --------
    // 중심은 밝고, 짧은 거리 안에서 여러 단계로 투명해졌다가
    // 가장 바깥쪽에만 아주 옅은 링(약 10% 밝기)이 남도록 구성
    const haloBaseSize = 14 * 1.2; // 전체 크기 1.2배 확대
    // 펄스를 매우 느리고 작게 만들어 번쩍거림 방지
    const haloPulse = 1 + sin(millis() * 0.001) * 0.03; // 매우 느리고 작은 펄스
    const haloSizeOuter = haloBaseSize * haloPulse * this.scaleFactor * 1.2;
    const haloSizeInner = haloBaseSize * haloPulse * this.scaleFactor * 0.7;

    pg.push();
    pg.blendMode(pg.ADD);
    pg.noStroke();

    // 중심부(밝은 하얀빛) - 작고 비교적 투명, 완전한 원 형태
    pg.fill(255, 255, 255, 130);
    pg.ellipse(0, 0, haloSizeInner * 0.4, haloSizeInner * 0.4);

    // 더 많은 단계의 그라데이션 레이어
    const layerCount = 12; // 단계 수 (성능 최적화: 20 -> 12)
    for (let i = 0; i < layerCount; i++) {
      const t = i / (layerCount - 1); // 0 ~ 1

      // 반지름: 안쪽에서 바깥으로 점차 커짐 (정원 형태)
      const r = lerp(haloSizeInner * 0.4, haloSizeOuter, t);

      // 알파값 곡선 (전체적으로 더 투명하게 조정):
      //  - 0 ~ 0.3: 110 → 15
      //  - 0.3 ~ 0.7: 15 → 0
      //  - 0.7 ~ 1.0: 0 → 18 (가장자리에서만 아주 옅게)
      let alpha;
      if (t < 0.3) {
        alpha = lerp(110, 15, t / 0.3);
      } else if (t < 0.7) {
        alpha = lerp(15, 0, (t - 0.3) / 0.4);
      } else {
        alpha = lerp(0, 18, (t - 0.7) / 0.3);
      }

      if (alpha <= 0.5) continue; // 극도로 낮은 값은 스킵

      // 감정에 따른 색상 적용 (전역 함수 사용)
      let colR, colG, colB;
      if (typeof getEmotionHaloColor === 'function') {
        const emotionColor = getEmotionHaloColor();
        // 감정 색상과 기본 색상을 그라데이션으로 혼합
        const baseR = 255;
        const baseG = lerp(255, 240, t);
        const baseB = lerp(255, 210, t);
        // 바깥쪽으로 갈수록 감정 색상이 더 강하게 (t가 클수록)
        // 감정 신뢰도도 고려 (전체 레이어에 일관되게 적용)
        const baseEmotionMix = typeof emotionConfidence !== 'undefined' && emotionConfidence > 0 ? emotionConfidence : 0.8;
        const emotionMix = t * 0.9 * baseEmotionMix; // 최대 90%까지 감정 색상 반영
        colR = lerp(baseR, emotionColor.r, emotionMix);
        colG = lerp(baseG, emotionColor.g, emotionMix);
        colB = lerp(baseB, emotionColor.b, emotionMix);
      } else {
        // 기본 색상 (감정 인식이 없을 때)
        colR = 255;
        colG = lerp(255, 240, t);
        colB = lerp(255, 210, t);
      }
      pg.fill(colR, colG, colB, alpha);

      // 완전한 원 (가로/세로 동일)
      pg.ellipse(0, 0, r, r);
    }

    pg.blendMode(pg.BLEND);
    pg.pop();

    // 바다 테마에 맞는 생물 필터 적용 (살짝만 색을 섞어서 톤 맞추기)
    let tintRGB = null;
    if (typeof getOceanLifeTintRGB === 'function') {
      tintRGB = getOceanLifeTintRGB();
    }
    if (tintRGB) {
      pg.tint(tintRGB.r, tintRGB.g, tintRGB.b, 240);
    } else {
      pg.noTint();
    }
    
    // 좌우 반전
    if (flipX) {
      pg.scale(-1, 1);
    }
    
    // 위아래 반전
    if (flipY) {
      pg.scale(1, -1);
    }
    
    // 이미지 크기를 15배 줄이기 (1/15)
    let imgWidth = currentImg.width / 15;
    let imgHeight = currentImg.height / 15;
    
    // 부드럽게 보간된 크기 적용
    imgWidth *= this.scaleFactor;
    imgHeight *= this.scaleFactor;
    
    // 이미지 그리기 (중앙 기준)
    pg.image(currentImg, 0, 0, imgWidth, imgHeight);
    
    // 다음 그리기에는 영향이 없도록 틴트 해제
    pg.noTint();

    pg.pop();
    pg.pop();
  }
}

