// ==============================
// Swimmer (이미지 기반 다이버)
// ==============================
class Swimmer {
  constructor() {
    this.x = BASE_W * 0.5;
    this.y = BASE_H * 0.45;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0.15;
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
    
    // 손 인식으로 움직이기 (키보드 입력이 없을 때만)
    const hasKeyboardInput = keyIsDown(LEFT_ARROW) || keyIsDown(RIGHT_ARROW) || 
                              keyIsDown(UP_ARROW) || keyIsDown(DOWN_ARROW);
    
    if (!hasKeyboardInput && typeof handControlEnabled !== 'undefined' && handControlEnabled) {
      // 손이 최근 1초 이내에 감지되었는지 확인
      const handDetectedRecently = (millis() - lastHandTime) < 1000;
      
      if (handDetectedRecently && typeof currentHandData !== 'undefined' && currentHandData && currentHandData.keypoints) {
        // 손 마디 데이터 가져오기 (손목 제외, 1~20번 마디 사용)
        const keypoints = currentHandData.keypoints;
        if (keypoints.length > 1) {
          // 각 방향에 포함된 마디 개수 세기
          let upCount = 0;
          let downCount = 0;
          let leftCount = 0;
          let rightCount = 0;
          
          // 화면 영역 경계값 (33% 기준)
          const topBound = 0.33;
          const bottomBound = 0.67;
          const leftBound = 0.33;
          const rightBound = 0.67;
          
          // 손목(0번) 제외하고 모든 마디 확인
          for (let i = 1; i < keypoints.length; i++) {
            const kp = keypoints[i];
            // 비디오 좌표를 화면 비율(0~1)로 변환 (좌우 반전 고려)
            const kpX = 1.0 - (kp.x / video.width);
            const kpY = kp.y / video.height;
            
            // 각 방향에 포함되는지 확인
            if (kpY < topBound) upCount++;
            if (kpY > bottomBound) downCount++;
            if (kpX < leftBound) leftCount++;
            if (kpX > rightBound) rightCount++;
          }
          
          // 위/아래 중 더 많은 쪽으로 이동
          if (upCount > downCount && upCount > 0) {
            this.vy -= this.speed;
          } else if (downCount > upCount && downCount > 0) {
            this.vy += this.speed;
          }
          
          // 좌/우 중 더 많은 쪽으로 이동 (스켈레톤 반대 방향)
          if (leftCount > rightCount && leftCount > 0) {
            this.vx += this.speed; // 손이 왼쪽에 있으면 오른쪽으로 이동
          } else if (rightCount > leftCount && rightCount > 0) {
            this.vx -= this.speed; // 손이 오른쪽에 있으면 왼쪽으로 이동
          }
        }
      }
    }

    // 이동
    this.x += this.vx;
    this.y += this.vy;

    // 속도
    const speed = sqrt(this.vx * this.vx + this.vy * this.vy);

    // 버블 생성
    if (speed > 0.05 && random() < BUBBLE_SPAWN_PROB_SWIM) {
      const bubbleX = this.x + random(-3, 3);
      const bubbleY = this.y + random(-2, 2);
      spawnBubble(bubbleX, bubbleY);
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
    
    pg.pop();
    pg.pop();
  }
}

