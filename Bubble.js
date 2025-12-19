// ==============================
// 버블 (월드 좌표 기준으로만 관리)
// ==============================

// 스마트폰 생활 관련 단어 리스트
const SMARTPHONE_WORDS = [
  '알림', '좋아요', '댓글', '공유', '스크롤', '스와이프', '탭', '클릭',
  '인스타', '페이스북', '유튜브', '틱톡', '트위터', '카카오톡', '라인',
  '앱', '알림', '푸시', '배지', '알림음', '진동', '무음',
  '스마트폰', '아이폰', '갤럭시', '안드로이드', 'iOS',
  '카메라', '사진', '셀카', '필터', '스토리', '피드',
  '쇼핑', '배달', '주문', '리뷰', '찜', '장바구니',
  '게임', '앱게임', '레벨업', '아이템', '코인',
  '뉴스', '기사', '트렌드', '핫이슈', '검색',
  '메시지', '채팅', '이모지', '스티커', '읽음',
  '영상', '숏폼', '릴스', '스트리밍', '라이브',
  '웹툰', '웹소설', '독서', '북마크', '다음화',
  '소셜미디어', 'SNS', '팔로우', '팔로워', '구독',
  '노티', '알림창', '배터리', '충전', '와이파이',
  '데이터', 'LTE', '5G', '인터넷', '온라인'
];

function spawnBubble(worldX, worldY, isTextBubble = false) {
  if (bubbles.length >= MAX_BUBBLES) {
    bubbles.shift(); // 오래된 것부터 제거
  }
  bubbles.push(new Bubble(worldX, worldY, isTextBubble));
  
  // 텍스트 기포일 때만 카운트
  if (isTextBubble && typeof totalTextBubblesSpawned !== 'undefined') {
    totalTextBubblesSpawned++;
  }
}

class Bubble {
  constructor(worldX, worldY, isTextBubble = false) {
    this.x = worldX;
    this.y = worldY;
    this.size = random(0.8, 1.3);
    this.speed = random(0.3, 0.8);
    this.wobbleX = 0;
    this.wobbleSpeed = random(0.02, 0.05);
    this.wobbleAmount = random(0.5, 1.5);
    this.alpha = random(150, 220);
    
    // 텍스트 기포 속성
    this.isTextBubble = isTextBubble;
    if (isTextBubble) {
      this.text = random(SMARTPHONE_WORDS);
      this.textSize = random(5, 6); // 글자 크기 반으로 줄임
      this.textAlpha = 255; // 최대 해상도를 위해 항상 최대값
      this.textWobbleSpeed = random(0.01, 0.03); // 움직임 최소화로 픽셀 깨짐 방지
      this.textWobbleAmount = random(0.3, 0.8); // 움직임 범위 최소화
      this.rotation = 0; // 회전 제거로 픽셀 깨짐 방지
      this.rotationSpeed = 0; // 회전 속도 제거
    }
  }

  update() {
    this.y -= this.speed;
    this.wobbleX = sin(frameCount * this.wobbleSpeed) * this.wobbleAmount;
    
    // 텍스트 기포 애니메이션 (회전 제거로 픽셀 깨짐 방지)
    // 회전 없이 움직임만 최소화
  }

  draw(pg) {
    pg.push();
    
    if (this.isTextBubble) {
      // 텍스트 기포 그리기 (선명도 최적화)
      // 픽셀 정렬을 정확하게 하기 위해 소수점 사용
      const drawX = this.x + this.wobbleX;
      const drawY = this.y;
      
      // 텍스트 폰트 설정
      if (typeof uiFont !== 'undefined' && uiFont) {
        pg.textFont(uiFont);
      }
      
      pg.textAlign(CENTER, CENTER);
      pg.textSize(this.textSize);
      
      // 보글보글 효과를 위한 위치 조정 (움직임 최소화, 회전 없음)
      const textWobbleX = sin(frameCount * this.textWobbleSpeed) * this.textWobbleAmount;
      const textWobbleY = cos(frameCount * this.textWobbleSpeed * 1.3) * this.textWobbleAmount * 0.2;
      
      // 픽셀 정렬을 더 정교하게 (소수점 처리로 정밀도 향상)
      const finalX = drawX + textWobbleX;
      const finalY = drawY + textWobbleY;
      
      // 픽셀 정렬을 더 정교하게 (소수점 처리로 정밀도 향상)
      // 픽셀 단위로 정확히 정렬하여 깨짐 방지
      const pixelAlignedX = Math.floor(finalX) + 0.5;
      const pixelAlignedY = Math.floor(finalY) + 0.5;
      
      pg.push();
      pg.translate(pixelAlignedX, pixelAlignedY);
      
      // 정교하고 선명한 텍스트 렌더링
      // 진한 외곽선으로 선명도와 정교함 향상
      pg.stroke(5, 20, 60, 255); // 더 진한 외곽선으로 대비 향상
      pg.strokeWeight(0.5); // 얇고 정교한 외곽선
      pg.fill(255, 255, 255, 255); // 순수 흰색으로 최대 선명도
      pg.text(this.text, 0, 0);
      
      pg.pop();
    } else {
      // 일반 기포 그리기
      pg.noStroke();
      pg.fill(180, 240, 255, this.alpha);
      let drawX = int(this.x + this.wobbleX);
      let drawY = int(this.y);
      pg.rect(drawX, drawY, 1, 1);
    }
    
    pg.pop();
  }

  isOffWorld() {
    return this.y < SURFACE_Y - 10; // 수면 조금 위에서 사라지게 처리
  }
}


