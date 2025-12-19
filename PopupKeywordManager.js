// ==============================
// PopupKeywordManager - 텍스트 팡팡 효과 관리 클래스
// ==============================
class PopupKeywordManager {
  constructor() {
    this.popupKeywords = []; // {phrase, x, y, startTime, angle, distance}
    this.lastKeywordSpawnTime = 0; // 마지막 키워드 생성 시간
    this.lastMouseX = -1;
    this.lastMouseY = -1;
    
    // 설정값
    this.spawnInterval = 300; // 키워드 생성 간격 (ms, 0.3초)
    this.popDuration = 800; // 팝업 애니메이션 시간 (ms)
    this.fadeDuration = 4000; // 페이드아웃 시간 (ms)
    this.distanceMin = 30; // 마우스로부터 최소 거리
    this.distanceMax = 60; // 마우스로부터 최대 거리
  }

  // 키워드 생성 (마우스 이동 시 호출)
  trySpawnKeyword(mouseX, mouseY, keyPhrases) {
    if (!keyPhrases || keyPhrases.length === 0) return;
    
    const mouseMoved = (this.lastMouseX !== mouseX || this.lastMouseY !== mouseY);
    const currentTime = millis();
    const timeSinceLastSpawn = currentTime - this.lastKeywordSpawnTime;
    
    // 0.3초(300ms)에 1번만 키워드 생성
    if (mouseMoved && timeSinceLastSpawn >= this.spawnInterval) {
      this.lastMouseX = mouseX;
      this.lastMouseY = mouseY;
      this.lastKeywordSpawnTime = currentTime;
      
      // 마우스 위치 근처에서 키워드 팡팡 효과 (한 번에 1개만)
      const phrase = keyPhrases[floor(random(keyPhrases.length))];
      const angle = random(TWO_PI);
      const distance = random(this.distanceMin, this.distanceMax);
      const popupX = mouseX + cos(angle) * distance;
      const popupY = mouseY + sin(angle) * distance;
      
      this.popupKeywords.push({
        phrase: phrase,
        x: popupX,
        y: popupY,
        startTime: currentTime,
        angle: angle,
        distance: distance
      });
    } else if (mouseMoved) {
      // 마우스는 움직였지만 시간 제한으로 키워드 생성 안 함
      this.lastMouseX = mouseX;
      this.lastMouseY = mouseY;
    }
  }

  // 키워드 업데이트 및 렌더링
  updateAndDraw() {
    const drawTime = millis();
    push();
    textFont(uiFont || 'ThinDungGeunMo');
    textAlign(CENTER, CENTER);
    textSize(14);
    
    for (let i = this.popupKeywords.length - 1; i >= 0; i--) {
      const keyword = this.popupKeywords[i];
      const elapsed = drawTime - keyword.startTime;
      
      if (elapsed < 0) continue; // 아직 나타나지 않음
      
      if (elapsed > this.popDuration + this.fadeDuration) {
        // 완전히 사라짐
        this.popupKeywords.splice(i, 1);
        continue;
      }
      
      // 팡팡 효과 (스케일 애니메이션, 더 천천히)
      let scaleValue = 1;
      if (elapsed < this.popDuration) {
        const popProgress = elapsed / this.popDuration;
        // 더 부드럽고 천천히 나타나도록 조정
        scaleValue = easeOutBack(constrain(popProgress, 0, 1));
      }
      
      // 페이드아웃
      let alpha = 255;
      if (elapsed > this.popDuration) {
        const fadeProgress = (elapsed - this.popDuration) / this.fadeDuration;
        alpha = 255 * (1 - fadeProgress);
      }
      
      // 위치에 약간의 움직임 추가 (팡팡 효과)
      const wobbleX = sin(elapsed * 0.01) * 2;
      const wobbleY = cos(elapsed * 0.015) * 2;
      const finalX = keyword.x + wobbleX;
      const finalY = keyword.y + wobbleY;
      
      if (alpha > 0) {
        const textW = textWidth(keyword.phrase) + 20;
        const textH = 24;
        
        push();
        translate(finalX, finalY);
        scale(scaleValue);
        
        // 배경 (하얀 바탕)
        fill(255, 255, 255, alpha);
        noStroke();
        rect(-textW / 2, -textH / 2, textW, textH, 6);
        
        // 텍스트 (파란 글자)
        fill(50, 100, 200, alpha);
        text(keyword.phrase, 0, 0);
        pop();
      }
    }
    pop();
  }

  // 초기화 (호버가 끝났을 때)
  reset() {
    this.popupKeywords = [];
    this.lastMouseX = -1;
    this.lastMouseY = -1;
    this.lastKeywordSpawnTime = 0;
  }
}

