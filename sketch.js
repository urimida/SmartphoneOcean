// sketch.js (p5.js global mode)

// 16:9 비율의 기본 픽셀 해상도
const BASE_W = 384;
const BASE_H = 512; // 하늘을 더 많이 보이도록 높이 증가

// 수면 위치 (월드 Y 좌표) – 이 위는 하늘, 아래는 바다
const SURFACE_Y = BASE_H * 0.25;

let pgBase;      // 정적인 바다+하늘 배경
let pgWobble;    // 물결 적용 버퍼
let pgBlurred;   // 블러 처리된 배경 버퍼
let oceanBackground; // 배경 그리기 클래스
let bubbles = []; 
let swimmer;     
let jellyfishes = []; 
let seahorses = []; 
let whales = []; // 고래들
let birds = [];  // 하늘 위 새들
let cameraY = 0;

// 다이버 이미지
let imgSide1, imgSide2, imgSide3, imgUp;
let imgNote; // 노트 이미지
let imgSeahorse; // 해마 이미지
let imagesLoaded = false; // 이미지 로드 완료 플래그

// 모달 관련 변수
let jellyfishData = []; // JSON에서 로드한 해파리 채팅 데이터
let deliveryData = []; // JSON에서 로드한 배달 데이터
let shortformData = []; // JSON에서 로드한 숏폼 데이터
let currentModal = null; // 현재 표시 중인 모달 (null 또는 {type: 'jellyfish'/'seahorse'/'whale', jellyfish/seahorse/whale, data})
let showChatDetail = false; // 채팅 상세 보기 여부
let showDeliveryDetail = false; // 배달 상세 보기 여부
let showShortformDetail = false; // 숏폼 상세 보기 여부
let lastClosedJellyfish = null; // 마지막으로 닫은 해파리 (같은 해파리에서 바로 다시 열리지 않도록)
let lastClosedSeahorse = null; // 마지막으로 닫은 해마
let lastClosedWhale = null; // 마지막으로 닫은 고래
const INTERACTION_DISTANCE = 25; // 해파리/해마/고래와 상호작용 가능한 거리
let closeHintX = 0;
let closeHintY = 0;

// 프롤로그 관련 변수
let showPrologue = true; // 프롤로그 표시 여부
let prologueStep = 0; // 현재 프롤로그 단계 (0, 1, 2)
const PROLOGUE_MESSAGES = [
  "당신은 디지털 오션에 빠졌습니다.",
  "이 세상을 자유롭게 즐기세요.",
  "충분히 즐겼다면, AI가 분석한 해양 탐사 일지로 당신의 여정을 확인하세요."
]; 

// -----------------------
// 성능 관련 상수
// -----------------------
const MAX_BUBBLES = 250;   // 버블 최대 개수 제한
const BUBBLE_SPAWN_PROB_SWIM = 0.3;
const BUBBLE_SPAWN_PROB_MOUSE = 0.2;

// 뷰 변환 캐시 (한 프레임당 한 번 계산)
let viewTransform = {
  scaleFactor: 1,
  drawW: 0,
  drawH: 0,
  offsetX: 0,
  visibleWorldHeight: 0,
};

// 바다 색상 변수 (랜덤 테마 사용)
let weatherColors = {
  topColor: null,
  midColor: null,
  bottomColor: null
};

// 손 인식 관련 변수
let video;
let handpose;
let handControlEnabled = false; // 손 제어 활성화 여부
let handCenterX = 0.5; // 손 중심 X (0~1)
let handCenterY = 0.5; // 손 중심 Y (0~1)
let prevHandCenterX = 0.5; // 이전 손 중심 X (움직임 방향 계산용)
let prevHandCenterY = 0.5; // 이전 손 중심 Y (움직임 방향 계산용)
let handDeltaX = 0; // 손의 X 방향 움직임 (-1 ~ 1)
let handDeltaY = 0; // 손의 Y 방향 움직임 (-1 ~ 1)
let lastHandTime = 0; // 마지막으로 손을 감지한 시간
let currentHandData = null; // 현재 손 데이터 (관절 표시용)

// 손 인식 호출 간격 조절용 (성능 최적화)
const HAND_DETECT_INTERVAL = 150; // ms, 초당 약 6~7번만 호출
let nextHandDetectTime = 0;
let useEventBasedDetection = false; // 이벤트 기반 방식 사용 여부

// ======================
// p5 기본 설정
// ======================
function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noSmooth();

  // 하늘을 더 많이 보이도록 배경 높이 확장
  const extraSkyHeight = BASE_H * 0.3; // 하늘 위쪽 추가 공간
  const totalBgHeight = BASE_H + extraSkyHeight;
  
  pgBase = createGraphics(BASE_W, totalBgHeight);
  pgBase.pixelDensity(1);
  pgBase.noSmooth();

  pgWobble = createGraphics(BASE_W, totalBgHeight);
  pgWobble.pixelDensity(1);
  pgWobble.noSmooth();

  pgBlurred = createGraphics(windowWidth, windowHeight);
  pgBlurred.pixelDensity(1);
  pgBlurred.noSmooth();

  // 다이버 이미지 로드
  imgSide1 = loadImage('src/imgs/side1.png', () => checkImagesLoaded());
  imgSide2 = loadImage('src/imgs/side2.png', () => checkImagesLoaded());
  imgSide3 = loadImage('src/imgs/side3.png', () => checkImagesLoaded());
  imgUp = loadImage('src/imgs/up.png', () => checkImagesLoaded());
  
  // 노트 이미지 로드
  imgNote = loadImage('src/imgs/note.png');
  
  // 해마 이미지 로드
  imgSeahorse = loadImage('src/imgs/seahorse.png');

  // 배경 클래스 초기화
  oceanBackground = new OceanBackground();
  
  // 랜덤 바다 색상 테마 설정
  setRandomOceanTheme();
  oceanBackground.paintStaticScene(pgBase);

  // 손 인식 초기화
  initHandRecognition();

  // 버블 / 생명체 초기화
  bubbles = [];
  swimmer = new Swimmer();

  jellyfishes = [];
  let jellyfishCount = int(random(2, 6));
  for (let i = 0; i < jellyfishCount; i++) {
    jellyfishes.push(new Jellyfish());
  }

  // 해파리 채팅 데이터 로드
  loadJSON('jellyfishes.json', (data) => {
    jellyfishData = data;
    // 해파리에 데이터 할당
    for (let i = 0; i < jellyfishes.length; i++) {
      if (jellyfishData.length > 0) {
        jellyfishes[i].chatData = jellyfishData[int(random(jellyfishData.length))];
      }
    }
  });

  seahorses = [];
  let seahorseCount = int(random(2, 6));
  for (let i = 0; i < seahorseCount; i++) {
    seahorses.push(new Seahorse());
  }

  // 배달 데이터 로드
  loadJSON('deliveries.json', (data) => {
    deliveryData = data;
    // 해마에 데이터 할당
    for (let i = 0; i < seahorses.length; i++) {
      if (deliveryData.length > 0) {
        seahorses[i].deliveryData = deliveryData[int(random(deliveryData.length))];
      }
    }
  });

  // 고래 초기화 (1~3마리만)
  whales = [];
  let whaleCount = int(random(1, 4)); // 1, 2, 또는 3마리
  for (let i = 0; i < whaleCount; i++) {
    whales.push(new Whale());
  }

  // 숏폼 데이터 로드
  loadJSON('shorts.json', (data) => {
    shortformData = data;
    // 고래에 데이터 할당
    for (let i = 0; i < whales.length; i++) {
      if (shortformData.length > 0) {
        whales[i].shortformData = shortformData[int(random(shortformData.length))];
      }
    }
  });

  // 새 초기화 (하늘 위를 천천히 날아다님)
  birds = [];
  let birdCount = int(random(2, 5));
  for (let i = 0; i < birdCount; i++) {
    birds.push(new Bird());
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 이미지 로드 완료 확인
function checkImagesLoaded() {
  if (imgSide1 && imgSide1.width > 0 &&
      imgSide2 && imgSide2.width > 0 &&
      imgSide3 && imgSide3.width > 0 &&
      imgUp && imgUp.width > 0) {
    imagesLoaded = true;
  }
}

// 화면 <-> 월드 좌표 변환 (한 프레임당 한 번만 계산해서 캐시)
function updateViewTransform() {
  const scaleFactor = width / BASE_W;
  const drawW = BASE_W * scaleFactor;
  const drawH = height;
  const offsetX = (width - drawW) / 2;
  const visibleWorldHeight = height / scaleFactor;

  viewTransform.scaleFactor = scaleFactor;
  viewTransform.drawW = drawW;
  viewTransform.drawH = drawH;
  viewTransform.offsetX = offsetX;
  viewTransform.visibleWorldHeight = visibleWorldHeight;
}

// ======================
// 바다 색상 테마
// ======================
const OCEAN_THEMES = [
  // 1. 클래식 블루 (기본 파란 바다)
  {
    name: 'Classic Blue',
    topColor: [90, 220, 230],
    midColor: [30, 160, 165],
    bottomColor: [5, 30, 70]
  },
  // 2. 황금빛 바다 (노란빛, 따뜻한 일몰)
  {
    name: 'Golden Ocean',
    topColor: [255, 220, 150],
    midColor: [200, 160, 100],
    bottomColor: [80, 50, 30]
  },
  // 3. 에메랄드 바다 (초록빛, 열대 바다)
  {
    name: 'Emerald Sea',
    topColor: [100, 240, 200],
    midColor: [40, 180, 150],
    bottomColor: [10, 80, 60]
  },
  // 4. 일몰 바다 (붉은빛, 따뜻한 톤)
  {
    name: 'Sunset Ocean',
    topColor: [255, 180, 140],
    midColor: [200, 120, 100],
    bottomColor: [60, 30, 40]
  },
  // 5. 청록색 바다 (터키시 블루)
  {
    name: 'Turquoise Sea',
    topColor: [120, 250, 255],
    midColor: [60, 200, 220],
    bottomColor: [20, 100, 120]
  },
  // 6. 보라빛 바다 (신비로운 톤)
  {
    name: 'Mystic Purple',
    topColor: [180, 160, 240],
    midColor: [120, 100, 180],
    bottomColor: [50, 40, 80]
  },
  // 7. 민트 바다 (연한 초록빛)
  {
    name: 'Mint Ocean',
    topColor: [180, 255, 230],
    midColor: [120, 220, 190],
    bottomColor: [50, 100, 85]
  },
  // 8. 코랄 바다 (핑크-오렌지 톤)
  {
    name: 'Coral Reef',
    topColor: [255, 200, 180],
    midColor: [220, 150, 130],
    bottomColor: [100, 60, 50]
  },
  // 9. 딥 블루 (깊은 파란 바다)
  {
    name: 'Deep Blue',
    topColor: [60, 180, 220],
    midColor: [30, 120, 160],
    bottomColor: [5, 40, 70]
  },
  // 10. 틸 바다 (청록-녹색 톤)
  {
    name: 'Teal Ocean',
    topColor: [100, 220, 200],
    midColor: [50, 160, 150],
    bottomColor: [15, 80, 75]
  }
];

function setRandomOceanTheme() {
  const theme = OCEAN_THEMES[int(random(OCEAN_THEMES.length))];
  weatherColors.topColor = theme.topColor;
  weatherColors.midColor = theme.midColor;
  weatherColors.bottomColor = theme.bottomColor;
}

// ======================
// 손 인식 초기화
// ======================
function initHandRecognition() {
  // ml5가 로드되었는지 확인
  if (typeof ml5 === 'undefined') {
    console.error('ml5 라이브러리가 로드되지 않았습니다.');
    return;
  }
  
  // 비디오 캡처 생성 (숨김) - 낮은 해상도로 성능 향상
  video = createCapture(VIDEO);
  video.size(160, 120); // 320x240에서 160x120으로 낮춤 (성능 향상)
  video.hide();
  
  // 비디오가 로드될 때까지 대기 (HTML 비디오 요소의 이벤트 사용)
  if (video && video.elt) {
    video.elt.addEventListener('loadedmetadata', () => {
      console.log('비디오 로드 완료');
      initHandPose();
    });
    
    // 비디오가 이미 로드된 경우
    if (video.elt.readyState >= 1) {
      console.log('비디오가 이미 준비됨');
      setTimeout(() => initHandPose(), 100);
    }
  }
  
  // 비디오 로드 실패 시에도 시도 (폴백)
  setTimeout(() => {
    if (video && video.elt) {
      if (!handpose) {
        console.log('비디오 로드 타임아웃, 강제로 초기화 시도');
        initHandPose();
      }
    }
  }, 2000);
}

function initHandPose() {
  if (!video || !video.elt) {
    console.error('비디오가 준비되지 않았습니다.');
    return;
  }
  
  // ml5가 로드되었는지 다시 확인
  if (typeof ml5 === 'undefined') {
    console.error('ml5 라이브러리가 로드되지 않았습니다. index.html에서 ml5 스크립트를 확인하세요.');
    return;
  }
  
  console.log('ml5 버전:', ml5.version || '알 수 없음');
  console.log('사용 가능한 ml5 API:', Object.keys(ml5).filter(key => key.toLowerCase().includes('hand')));
  
  try {
    // ml5.js HandPose 초기화 (성능 최적화)
    const options = {
      flipHorizontal: true, // 좌우 반전
      maxHands: 1,
      runtime: 'mediapipe',
      modelComplexity: 0, // 0으로 낮춰서 성능 향상 (1 -> 0)
      minDetectionConfidence: 0.6, // 약간 높여서 불필요한 감지 줄임
      minTrackingConfidence: 0.6 // 약간 높여서 불필요한 추적 줄임
    };
    
    // handPoseMediaPipe 또는 handPose 사용 시도
    if (ml5.handPoseMediaPipe) {
      console.log('handPoseMediaPipe 사용');
      handpose = ml5.handPoseMediaPipe(video, options, modelReady);
    } else if (ml5.handPose) {
      console.log('handPose 사용');
      handpose = ml5.handPose(video, options, modelReady);
    } else {
      console.error('ml5 handPose API를 찾을 수 없습니다.');
      console.log('사용 가능한 ml5 메서드:', Object.keys(ml5).slice(0, 20));
      return;
    }
  } catch (err) {
    console.error('HandPose 초기화 오류:', err);
    console.error('스택 트레이스:', err.stack);
  }
}

// 모델 준비 완료 콜백
function modelReady() {
  console.log('HandPose 모델 로드 완료');
  handControlEnabled = true;
  
  if (!handpose) {
    console.error('handpose 객체가 생성되지 않았습니다.');
    return;
  }
  
  // 이벤트 기반 방식 사용 시도 (가장 효율적)
  if (handpose && typeof handpose.on === 'function') {
    console.log('이벤트 기반 방식 사용');
    useEventBasedDetection = true;
    handpose.on('predict', (results) => {
      // results가 배열이면 정상 (빈 배열도 정상)
      gotHands(Array.isArray(results) ? results : null);
    });
  } else if (handpose && typeof handpose.detect === 'function') {
    // 폴백: draw()에서 일정 간격으로 호출
    console.log('수동 감지 방식 사용 (draw에서 호출)');
    useEventBasedDetection = false;
    // 첫 번째 호출 시작
    nextHandDetectTime = millis();
  } else {
    console.warn('handpose에 detect 또는 on 메서드가 없습니다.');
    useEventBasedDetection = false;
  }
}

// 손 감지 함수 (단순화)
function detectHand() {
  if (!handControlEnabled || !handpose || !video) {
    return;
  }
  
  // 비디오가 실제로 로드되고 재생 중인지 확인
  if (video.elt && video.elt.readyState < 2) {
    return;
  }
  
  try {
    if (typeof handpose.detect === 'function') {
      // Promise를 반환하는 경우와 콜백을 사용하는 경우 모두 처리
      const result = handpose.detect(video, (error, results) => {
        // 콜백 방식
        if (error) {
          // 실제 에러 객체인 경우만 에러로 처리 (빈 배열은 정상)
          if (error && !Array.isArray(error)) {
            console.error('Hand detection error:', error);
          }
          gotHands(null);
          return;
        }
        // results가 배열이면 정상 (빈 배열도 정상)
        gotHands(Array.isArray(results) ? results : null);
      });
      
      // Promise를 반환하는 경우
      if (result && typeof result.then === 'function') {
        result
          .then((results) => {
            // 결과가 배열이면 정상 (빈 배열도 정상)
            gotHands(Array.isArray(results) ? results : null);
          })
          .catch((error) => {
            // 실제 에러만 처리
            if (error && !Array.isArray(error)) {
              console.error('Hand detection error:', error);
            }
            gotHands(null);
          });
      }
    }
  } catch (err) {
    console.error('Hand detection exception:', err);
  }
}

// 손 감지 결과 처리 (단순화)
function gotHands(results) {
  // results가 null이거나 배열이 아닌 경우 처리
  if (!results) {
    currentHandData = null;
    return;
  }
  
  // results가 배열인지 확인
  if (Array.isArray(results) && results.length > 0) {
    const hand = results[0];
    currentHandData = hand; // 관절 표시를 위해 저장
    
    if (hand.keypoints && hand.keypoints.length > 0) {
      const wrist = hand.keypoints[0]; // 손목
      
      // 좌우 반전된 비디오에 맞춰 X 좌표 반전
      const newHandX = 1.0 - (wrist.x / video.width);
      const newHandY = wrist.y / video.height;
      
      // 손의 움직임 방향 계산 (이전 위치와의 차이)
      handDeltaX = newHandX - prevHandCenterX;
      handDeltaY = newHandY - prevHandCenterY;
      
      // 이전 위치 업데이트
      prevHandCenterX = newHandX;
      prevHandCenterY = newHandY;
      
      // 현재 위치 업데이트
      handCenterX = newHandX;
      handCenterY = newHandY;
      
      lastHandTime = millis();
    }
  } else {
    // 손이 감지되지 않음
    currentHandData = null;
    // 움직임도 초기화
    handDeltaX = 0;
    handDeltaY = 0;
  }
  // draw()에서 일정 간격으로 호출하므로 여기서 재귀 호출 제거
}

// 배경 그리기는 OceanBackground 클래스로 이동됨

// 클래스들은 각각 별도 파일로 분리됨:
// - Swimmer: Swimmer.js
// - Bubble: Bubble.js
// - Jellyfish: Jellyfish.js
// - Seahorse: Seahorse.js
// - Bird: Bird.js

// ==============================
// 입력 이벤트
// ==============================
function mouseMoved() {
  // 마우스를 움직일 때 버블 생성 (화면 → 월드 좌표로 변환)
  if (random() < BUBBLE_SPAWN_PROB_MOUSE) {
    const vt = viewTransform;
    const worldX = (mouseX - vt.offsetX) / vt.scaleFactor;
    const worldY = mouseY / vt.scaleFactor + cameraY;
    if (worldY > SURFACE_Y + 2) {
      spawnBubble(worldX, worldY);
    }
  }
}

// ==============================
// 메인 루프
// ==============================
function draw() {
  background(0);
  noSmooth();

  // 0. 일정 간격으로만 손 인식 (성능 최적화) - 수동 방식일 때만
  if (handControlEnabled && handpose && video && !useEventBasedDetection) {
    const now = millis();
    if (now > nextHandDetectTime) {
      nextHandDetectTime = now + HAND_DETECT_INTERVAL;
      detectHand();
    }
  }

  // 1. 뷰 변환 캐시
  updateViewTransform();
  const vt = viewTransform;

  // 2. 물결 왜곡 (정적 배경 → wobble 버퍼, 하늘은 고정, 바다는 흔들림)
  const t = millis() * 0.0007;
  // clear 대신 배경을 먼저 복사 (깜빡임 방지)
  pgWobble.copy(pgBase, 0, 0, pgBase.width, pgBase.height, 0, 0, pgBase.width, pgBase.height);
  
  const w = pgBase.width;
  const h = pgBase.height;
  const surfY = int(SURFACE_Y);
  // 바다 부분만 물결 효과 적용
  for (let y = surfY; y < h; y++) {
    let strength = map(y, surfY, h, 1.0, 3.0);
    let offset = int(sin(t + y * 0.16) * strength);
    pgWobble.copy(pgBase, 0, y, w, 1, offset, y, w, 1);
  }

  // 3. 생명체 업데이트
  swimmer.update();

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.update();
    if (b.isOffWorld()) {
      bubbles.splice(i, 1);
    }
  }

  for (let i = 0; i < jellyfishes.length; i++) {
    jellyfishes[i].update();
    
    // 해파리 데이터가 없으면 할당
    if (!jellyfishes[i].chatData && jellyfishData.length > 0) {
      jellyfishes[i].chatData = jellyfishData[int(random(jellyfishData.length))];
    }
    
    // 다이버와 해파리 거리 체크
    const dx = swimmer.x - jellyfishes[i].x;
    const dy = swimmer.y - jellyfishes[i].y;
    const dist = sqrt(dx * dx + dy * dy);
    
    if (!currentModal && !showChatDetail && !showDeliveryDetail && !showShortformDetail && !showPrologue) {
      // dismissed된 해파리는 모달이 뜨지 않음
      // 같은 해파리에서 바로 다시 열리지 않도록 체크
      if (dist < INTERACTION_DISTANCE && jellyfishes[i].chatData && 
          !jellyfishes[i].dismissed && lastClosedJellyfish !== jellyfishes[i]) {
        currentModal = { type: 'jellyfish', jellyfish: jellyfishes[i], data: jellyfishes[i].chatData };
      }
      // 해파리에서 멀어지면 lastClosedJellyfish 초기화 (dismissed가 아닌 경우만)
      if (lastClosedJellyfish === jellyfishes[i] && dist > INTERACTION_DISTANCE * 1.5 && !jellyfishes[i].dismissed) {
        lastClosedJellyfish = null;
      }
    }
  }
  for (let i = 0; i < seahorses.length; i++) {
    seahorses[i].update();
    
    // 해마 데이터가 없으면 할당
    if (!seahorses[i].deliveryData && deliveryData.length > 0) {
      seahorses[i].deliveryData = deliveryData[int(random(deliveryData.length))];
    }
    
    // 다이버와 해마 거리 체크
    const dx = swimmer.x - seahorses[i].x;
    const dy = swimmer.y - seahorses[i].y;
    const dist = sqrt(dx * dx + dy * dy);
    
    if (!currentModal && !showChatDetail && !showDeliveryDetail && !showShortformDetail && !showPrologue) {
      // dismissed된 해마는 모달이 뜨지 않음
      // 같은 해마에서 바로 다시 열리지 않도록 체크
      if (dist < INTERACTION_DISTANCE && seahorses[i].deliveryData && 
          !seahorses[i].dismissed && lastClosedSeahorse !== seahorses[i]) {
        currentModal = { type: 'seahorse', seahorse: seahorses[i], data: seahorses[i].deliveryData };
      }
      // 해마에서 멀어지면 lastClosedSeahorse 초기화 (dismissed가 아닌 경우만)
      if (lastClosedSeahorse === seahorses[i] && dist > INTERACTION_DISTANCE * 1.5 && !seahorses[i].dismissed) {
        lastClosedSeahorse = null;
      }
    }
  }
  for (let i = 0; i < whales.length; i++) {
    whales[i].update();
    
    // 고래 데이터가 없으면 할당
    if (!whales[i].shortformData && shortformData.length > 0) {
      whales[i].shortformData = shortformData[int(random(shortformData.length))];
    }
    
    // 다이버와 고래 거리 체크
    const dx = swimmer.x - whales[i].x;
    const dy = swimmer.y - whales[i].y;
    const dist = sqrt(dx * dx + dy * dy);
    
    if (!currentModal && !showChatDetail && !showDeliveryDetail && !showShortformDetail && !showPrologue) {
      // dismissed된 고래는 모달이 뜨지 않음
      // 같은 고래에서 바로 다시 열리지 않도록 체크
      if (dist < INTERACTION_DISTANCE && whales[i].shortformData && 
          !whales[i].dismissed && lastClosedWhale !== whales[i]) {
        currentModal = { type: 'whale', whale: whales[i], data: whales[i].shortformData };
      }
      // 고래에서 멀어지면 lastClosedWhale 초기화 (dismissed가 아닌 경우만)
      if (lastClosedWhale === whales[i] && dist > INTERACTION_DISTANCE * 1.5 && !whales[i].dismissed) {
        lastClosedWhale = null;
      }
    }
  }
  for (let i = 0; i < birds.length; i++) {
    birds[i].update();
  }

  // 4. 카메라 업데이트 (다이버 따라가기)
  // 하늘을 더 많이 보이도록 위로 스크롤 가능한 범위 확장
  const extraSkyHeight = BASE_H * 0.3; // 하늘 위쪽 추가 공간
  const totalBgHeight = BASE_H + extraSkyHeight; // 배경 전체 높이
  const minCameraY = 0; // 배경이 y=0부터 시작하므로 최소값은 0
  const maxCameraY = max(0, totalBgHeight - vt.visibleWorldHeight); // 배경 높이를 넘지 않도록
  
  // 다이버가 최대 높이에 도달했을 때, 위로 가려고 하면 카메라만 위로 올라가도록
  const swimmerMaxY = BASE_H * 0.2; // 다이버 최대 높이
  const isAtMaxHeight = swimmer.y >= swimmerMaxY - 1; // 거의 최대 높이에 도달했는지
  
  let targetCameraY;
  if (isAtMaxHeight && swimmer.vy < 0) {
    // 다이버가 최대 높이에 있고 위로 가려고 하면, 카메라만 위로 올라가도록
    // 다이버는 그 자리에 머물고 카메라는 더 위로 올라감
    targetCameraY = cameraY - abs(swimmer.vy) * 20; // 다이버 속도에 비례하여 카메라만 위로
  } else if (isAtMaxHeight && swimmer.vy > 0) {
    // 다이버가 최대 높이에 있고 아래로 가려고 하면, 다이버를 따라감 (아래로 내려갈 수 있도록)
    targetCameraY = swimmer.y - vt.visibleWorldHeight * 0.35;
  } else {
    // 일반적인 경우: 다이버를 따라감
    targetCameraY = swimmer.y - vt.visibleWorldHeight * 0.35;
  }
  
  // 위로 수영할 때는 더 빠르게 반응하도록 lerp 값 조정
  const lerpSpeed = swimmer.vy < 0 ? 0.2 : 0.12; // 위로 갈 때는 더 빠르게
  cameraY = lerp(cameraY, constrain(targetCameraY, minCameraY, maxCameraY), lerpSpeed);

  // 5. 생명체 렌더 (pgWobble 위에 그림)
  for (let i = 0; i < bubbles.length; i++) {
    bubbles[i].draw(pgWobble);
  }
  for (let i = 0; i < jellyfishes.length; i++) {
    jellyfishes[i].draw(pgWobble);
  }
  for (let i = 0; i < seahorses.length; i++) {
    seahorses[i].draw(pgWobble);
  }
  for (let i = 0; i < whales.length; i++) {
    whales[i].draw(pgWobble);
  }
  for (let i = 0; i < birds.length; i++) {
    birds[i].draw(pgWobble);
  }
  swimmer.draw(pgWobble);

  // 6. 카메라 뷰로 화면에 출력
  push();
  translate(vt.offsetX, 0);
  
  // 해파리 또는 해마 또는 고래 자세히 보기 모드일 때는 블러 처리된 배경 사용
  // 블러는 매 프레임마다 적용하지 않고 필요할 때만 (성능 최적화)
  if ((showChatDetail || showDeliveryDetail || showShortformDetail) && currentModal) {
    // 배경을 블러 버퍼에 복사
    pgBlurred.push();
    pgBlurred.translate(vt.offsetX, 0);
    pgBlurred.image(
      pgWobble,
      0, 0,
      vt.drawW, vt.drawH,
      0, cameraY,
      BASE_W, vt.visibleWorldHeight
    );
    pgBlurred.pop();
    
    // 블러 필터 적용
    pgBlurred.filter(BLUR, 8);
    
    // 블러 처리된 배경을 메인 캔버스에 그리기
    image(pgBlurred, 0, 0);
    
    // 어두운 오버레이 추가 (해마/해파리와 대비되도록)
    fill(0, 0, 0, 180); // 반투명 검은색 오버레이
    noStroke();
    rect(0, 0, width, height);
  } else if (currentModal) {
    // 일반 모달 모드: 블러 없이 그대로 출력하되 어두운 오버레이 추가
    image(
      pgWobble,
      0, 0,
      vt.drawW, vt.drawH,
      0, cameraY,
      BASE_W, vt.visibleWorldHeight
    );
    
    // 어두운 오버레이 추가 (모달과 대비되도록)
    fill(0, 0, 0, 150); // 반투명 검은색 오버레이 (약간 더 밝게)
    noStroke();
    rect(0, 0, width, height);
  } else if (showPrologue) {
    // 프롤로그 모드: 블러 없이 그대로 출력하되 어두운 오버레이는 프롤로그 모달에서 처리
    image(
      pgWobble,
      0, 0,
      vt.drawW, vt.drawH,
      0, cameraY,
      BASE_W, vt.visibleWorldHeight
    );
  } else {
    // 일반 모드: 블러 없이 그대로 출력
    image(
      pgWobble,
      0, 0,
      vt.drawW, vt.drawH,
      0, cameraY,
      BASE_W, vt.visibleWorldHeight
    );
  }
  pop();
  
  // 7. 손 인식 디버그 화면 (오른쪽 위)
  drawHandDebug();
  
  // 8. 프롤로그 모달 (게임 시작 시)
  if (showPrologue) {
    drawPrologueModal();
  }
  
  // 9. 모달 UI (화면 최상단에)
  drawModal();
  
  // 10. 디지털 오션 탐사 일지 버튼 (오른쪽 아래)
  drawExplorationLogButton();
}

// 디지털 오션 탐사 일지 버튼 그리기 (오른쪽 아래)
function drawExplorationLogButton() {
  if (!imgNote) return; // 이미지가 로드되지 않았으면 그리지 않음
  
  push();
  
  const imgSize = 60 * 2.5; // 노트 이미지 크기 (2.5배 크게)
  const btnX = width - imgSize - 50; // 왼쪽으로 더 이동 (마진 증가)
  const btnY = height - imgSize - 60; // 위로 더 이동 (마진 증가)
  
  // 노트 이미지 그리기
  image(imgNote, btnX, btnY, imgSize, imgSize);
  
  pop();
}

// 손 인식 디버그 화면 그리기 (오른쪽 위)
function drawHandDebug() {
  if (!video || !handControlEnabled) return;
  
  push();
  
  // 미니 캠 크기 및 위치
  const camWidth = 200;
  const camHeight = 150;
  const camX = width - camWidth - 10;
  const camY = 10;
  
  // 배경
  fill(0, 150);
  stroke(255, 200);
  strokeWeight(2);
  rect(camX - 5, camY - 5, camWidth + 10, camHeight + 10);
  
  // 비디오 표시 (좌우 반전)
  push();
  translate(camX + camWidth, camY);
  scale(-1, 1);
  image(video, 0, 0, camWidth, camHeight);
  pop();
  
  // 손 관절 표시
  if (currentHandData && currentHandData.keypoints) {
    const scaleX = camWidth / video.width;
    const scaleY = camHeight / video.height;
    
    // 각 관절을 점으로 표시 (영상과 맞추기 위해 반전 제거)
    for (let i = 0; i < currentHandData.keypoints.length; i++) {
      const kp = currentHandData.keypoints[i];
      // 영상이 이미 반전되어 있으므로 스켈레톤은 원래 좌표 사용
      const x = camX + kp.x * scaleX;
      const y = camY + kp.y * scaleY;
      
      // 손목은 빨간색, 나머지는 파란색
      if (i === 0) {
        fill(255, 0, 0);
        stroke(255, 255, 255);
        strokeWeight(2);
        circle(x, y, 8);
      } else {
        fill(0, 150, 255);
        stroke(255, 255, 255);
        strokeWeight(1);
        circle(x, y, 5);
      }
    }
    
    // 손목에서 다른 주요 관절로 선 그리기 (손 구조 표시)
    stroke(0, 255, 0, 150);
    strokeWeight(1);
    noFill();
    
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // 엄지
      [0, 5], [5, 6], [6, 7], [7, 8], // 검지
      [0, 9], [9, 10], [10, 11], [11, 12], // 중지
      [0, 13], [13, 14], [14, 15], [15, 16], // 약지
      [0, 17], [17, 18], [18, 19], [19, 20] // 소지
    ];
    
    for (let i = 0; i < connections.length; i++) {
      const [start, end] = connections[i];
      if (currentHandData.keypoints[start] && currentHandData.keypoints[end]) {
        // 영상이 이미 반전되어 있으므로 스켈레톤은 원래 좌표 사용
        const x1 = camX + currentHandData.keypoints[start].x * scaleX;
        const y1 = camY + currentHandData.keypoints[start].y * scaleY;
        const x2 = camX + currentHandData.keypoints[end].x * scaleX;
        const y2 = camY + currentHandData.keypoints[end].y * scaleY;
        line(x1, y1, x2, y2);
      }
    }
    
    // 손목 위치 텍스트 표시
    fill(255);
    textSize(10);
    textAlign(LEFT);
    text(`손목: (${int(handCenterX * 100)}%, ${int(handCenterY * 100)}%)`, camX, camY + camHeight + 15);
  } else {
    // 손이 감지되지 않을 때
    fill(255, 100);
    textSize(12);
    textAlign(CENTER);
    text('손을 카메라에 보여주세요', camX + camWidth / 2, camY + camHeight / 2);
  }
  
  pop();
}

// 프롤로그 모달 그리기
function drawPrologueModal() {
  if (!showPrologue || prologueStep >= PROLOGUE_MESSAGES.length) return;
  
  push();
  noSmooth();
  
  // 배경 오버레이 (어두운 반투명)
  fill(0, 0, 0, 200);
  noStroke();
  rect(0, 0, width, height);
  
  const modalW = 450; // 모달 너비 증가
  const modalH = 220; // 모달 높이 증가
  const modalX = (width - modalW) / 2;
  const modalY = (height - modalH) / 2;
  const padding = 35; // 모달 내부 패딩 증가
  
  // 모달 배경 (기존 모달 스타일 참고)
  fill(20, 40, 60, 240);
  stroke(100, 150, 200);
  strokeWeight(2);
  rect(modalX, modalY, modalW, modalH);
  
  // 텍스트 영역 설정
  const textAreaW = modalW - padding * 2;
  const textCenterX = modalX + modalW / 2; // 모달 중앙 X 좌표
  const fontSize = 20; // 폰트 크기 약간 증가
  
  fill(200, 220, 255);
  textSize(fontSize);
  textAlign(CENTER, TOP); // 중앙 정렬
  textFont('Pretendard');
  
  const message = PROLOGUE_MESSAGES[prologueStep];
  
  // 한국어 텍스트를 여러 줄로 나누기 (글자 단위로 처리)
  const lines = splitKoreanTextIntoLines(message, textAreaW, fontSize);
  
  // 줄 간격
  const lineHeight = fontSize * 1.5; // 줄 간격 약간 증가
  const totalTextHeight = lines.length * lineHeight;
  const buttonAreaHeight = 60; // 버튼 영역 높이
  const startY = modalY + padding + (modalH - padding * 2 - buttonAreaHeight - totalTextHeight) / 2; // 버튼 공간 제외하고 중앙 정렬
  
  // 각 줄 그리기 (모달 중앙에 정렬)
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], textCenterX, startY + i * lineHeight);
  }
  
  // 다음 버튼
  const btnW = 140; // 버튼 너비 증가
  const btnH = 40; // 버튼 높이 증가
  const btnX = modalX + modalW / 2 - btnW / 2;
  const btnY = modalY + modalH - padding - btnH;
  
  fill(60, 120, 180);
  stroke(100, 150, 200);
  strokeWeight(2);
  rect(btnX, btnY, btnW, btnH);
  
  fill(255);
  textSize(16); // 버튼 텍스트 크기 증가
  textAlign(CENTER, CENTER);
  text("다음", btnX + btnW / 2, btnY + btnH / 2);
  
  pop();
}

// 한국어 텍스트를 여러 줄로 나누는 함수
function splitKoreanTextIntoLines(text, maxWidth, fontSize) {
  const lines = [];
  let currentLine = '';
  
  // 텍스트 크기 설정 (너비 계산을 위해)
  textSize(fontSize);
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const testLine = currentLine + char;
    const testWidth = textWidth(testLine);
    
    if (testWidth > maxWidth && currentLine.length > 0) {
      // 현재 줄이 너무 길면 이전 줄을 저장하고 새 줄 시작
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  
  // 마지막 줄 추가
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  // 빈 배열이면 원본 텍스트 반환
  return lines.length > 0 ? lines : [text];
}

// 모달 그리기
function drawModal() {
  if (!currentModal && !showChatDetail && !showDeliveryDetail && !showShortformDetail) return;

  push(); // 상태 보호
  noSmooth(); // 이 정도만

  if (showChatDetail && currentModal && currentModal.type === 'jellyfish') {
    // 채팅 상세 보기 (글자로 만든 해파리)
    const btnPos = currentModal.jellyfish.drawTextDetail();
    closeHintX = btnPos.x;
    closeHintY = btnPos.y;
  } else if (showDeliveryDetail && currentModal && currentModal.type === 'seahorse') {
    // 배달 상세 보기 (글자로 만든 해마)
    const btnPos = currentModal.seahorse.drawTextDetail();
    closeHintX = btnPos.x;
    closeHintY = btnPos.y;
  } else if (showShortformDetail && currentModal && currentModal.type === 'whale') {
    // 숏폼 상세 보기 (글자로 만든 고래)
    const btnPos = currentModal.whale.drawTextDetail();
    closeHintX = btnPos.x;
    closeHintY = btnPos.y;
  } else if (currentModal) {
    // "자세히 보기 / 그냥 지나치기" 모달 박스
    if (currentModal.type === 'jellyfish') {
      drawInteractionModal("채팅 해파리인거 같아요.\n자세히 보시겠습니까?");
    } else if (currentModal.type === 'seahorse') {
      drawInteractionModal("배달 해마인거 같아요.\n자세히 보시겠습니까?");
    } else if (currentModal.type === 'whale') {
      drawInteractionModal("숏폼 고래인거 같아요.\n자세히 보시겠습니까?");
    }
  }

  pop();
}

// 해파리 형상의 픽셀 위치를 저장하는 함수
function getJellyfishPixels(cx, cy, radius, tentacleCount, tentacleLength) {
  let pixels = [];
  
  // 돔 부분
  for (let ry = -radius; ry <= 0; ry++) {
    for (let rx = -radius; rx <= radius; rx++) {
      const nx = rx / radius;
      const ny = ry / radius;
      const r = sqrt(nx * nx + ny * ny);
      if (r <= 1.0) {
        pixels.push({x: cx + rx, y: cy + ry, type: 'dome', r: r});
      }
    }
  }
  
  // 프린지
  for (let rx = -radius + 1; rx <= radius - 1; rx++) {
    if ((rx + cx) % 2 === 0) {
      pixels.push({x: cx + rx, y: cy + 1, type: 'fringe'});
    }
  }
  
  // 촉수
  for (let i = 0; i < tentacleCount; i++) {
    const idxNorm = (i - (tentacleCount - 1) / 2) / tentacleCount;
    const tentacleBaseX = cx + idxNorm * (radius * 1.3);
    
    for (let j = 0; j < tentacleLength; j++) {
      const depth = j / tentacleLength;
      const wave = sin(i * 0.45 + j * 0.1) * (2 + depth * 8);
      const px = int(tentacleBaseX + wave);
      const py = int(cy + 2 + j);
      pixels.push({x: px, y: py, type: 'tentacle', depth: depth, tentacleIndex: i});
    }
  }
  
  return pixels;
}

// 상호작용 모달 그리기
function drawInteractionModal(message) {
  const modalW = 300;
  const modalH = 160; // 높이 증가
  const modalX = (width - modalW) / 2;
  const modalY = (height - modalH) / 2; // 화면 중앙
  const paddingTop = 35; // 위쪽 패딩 증가
  const paddingBottom = 40; // 아래쪽 패딩 증가
  
  // 배경 (픽셀 스타일)
  fill(20, 40, 60, 240);
  stroke(100, 150, 200);
  strokeWeight(2);
  rect(modalX, modalY, modalW, modalH);
  
  // 텍스트 (픽셀 스타일)
  fill(200, 220, 255);
  textSize(16);
  textAlign(CENTER, TOP);
  textFont('Pretendard');
  text(message || "채팅 해파리인거 같아요.\n자세히 보시겠습니까?", modalX + modalW / 2, modalY + paddingTop);
  
  // 버튼들
  const btnW = 100;
  const btnH = 30;
  const btnY = modalY + modalH - paddingBottom - 20; // 위로 20픽셀 올리기
  const btn1X = modalX + modalW / 2 - btnW - 10;
  const btn2X = modalX + modalW / 2 + 10;
  
  // 자세히 보기 버튼
  fill(60, 120, 180);
  stroke(100, 150, 200);
  rect(btn1X, btnY, btnW, btnH);
  fill(255);
  textSize(12);
  textAlign(CENTER, CENTER);
  text("자세히 보기", btn1X + btnW / 2, btnY + btnH / 2);
  
  // 그냥 지나치기 버튼
  fill(80, 100, 120);
  stroke(100, 150, 200);
  rect(btn2X, btnY, btnW, btnH);
  fill(255);
  text("그냥 지나치기", btn2X + btnW / 2, btnY + btnH / 2);
}

// drawChatDetail과 drawDeliveryDetail 함수는 이제 각각 Jellyfish와 Seahorse 클래스의 drawTextDetail() 메서드로 이동됨

// 키보드 입력 처리 (F키로 손 인식 토글)
function keyPressed() {
  if (key === 'f' || key === 'F') {
    handControlEnabled = !handControlEnabled;
    console.log('손 인식 토글:', handControlEnabled ? 'ON' : 'OFF');
  }
}

// 텍스트를 여러 줄로 나누기
function splitTextIntoLines(text, maxWidth, fontSize) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
    const testWidth = textWidth(testLine) * (fontSize / 12);
    
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// 마우스 클릭 처리
function mousePressed() {
  // 프롤로그 모달 처리
  if (showPrologue) {
    const modalW = 450;
    const modalH = 220;
    const modalX = (width - modalW) / 2;
    const modalY = (height - modalH) / 2;
    const padding = 35;
    const btnW = 140;
    const btnH = 40;
    const btnX = modalX + modalW / 2 - btnW / 2;
    const btnY = modalY + modalH - padding - btnH;
    
    // 다음 버튼 클릭 확인
    if (mouseX >= btnX && mouseX <= btnX + btnW &&
        mouseY >= btnY && mouseY <= btnY + btnH) {
      prologueStep++;
      if (prologueStep >= PROLOGUE_MESSAGES.length) {
        showPrologue = false;
      }
      return;
    }
    return; // 프롤로그 중에는 다른 클릭 무시
  }
  
  if (!currentModal) return;
  
  const modalW = 300;
  const modalH = 120;
  const modalX = (width - modalW) / 2;
  const modalY = height * 0.3;
  
  if (showChatDetail) {
    // 닫기 버튼 영역 클릭 감지
    const btnW = 140;
    const btnH = 35;
    const btnX = closeHintX - btnW / 2;
    const btnY = closeHintY;
    
    // 버튼 영역 내 클릭 확인
    const isButtonClick = mouseX >= btnX && mouseX <= btnX + btnW &&
                          mouseY >= btnY - btnH / 2 && mouseY <= btnY + btnH / 2;
    
    if (isButtonClick) {
      if (currentModal && currentModal.jellyfish) {
        // 상세 정보를 본 해파리는 다시 모달이 뜨지 않도록 표시
        currentModal.jellyfish.dismissed = true;
        lastClosedJellyfish = currentModal.jellyfish;
      }
      showChatDetail = false;
      currentModal = null;
      return;
    }
    return;
  }

  if (showDeliveryDetail) {
    // 닫기 버튼 영역 클릭 감지
    const btnW = 140;
    const btnH = 35;
    const btnX = closeHintX - btnW / 2;
    const btnY = closeHintY;
    
    // 버튼 영역 내 클릭 확인
    const isButtonClick = mouseX >= btnX && mouseX <= btnX + btnW &&
                          mouseY >= btnY - btnH / 2 && mouseY <= btnY + btnH / 2;
    
    if (isButtonClick) {
      if (currentModal && currentModal.seahorse) {
        // 상세 정보를 본 해마는 다시 모달이 뜨지 않도록 표시
        currentModal.seahorse.dismissed = true;
        lastClosedSeahorse = currentModal.seahorse;
      }
      showDeliveryDetail = false;
      currentModal = null;
      return;
    }
    return;
  }

  if (showShortformDetail) {
    // 닫기 버튼 영역 클릭 감지
    const btnW = 140;
    const btnH = 35;
    const btnX = closeHintX - btnW / 2;
    const btnY = closeHintY;
    
    // 버튼 영역 내 클릭 확인
    const isButtonClick = mouseX >= btnX && mouseX <= btnX + btnW &&
                          mouseY >= btnY - btnH / 2 && mouseY <= btnY + btnH / 2;
    
    if (isButtonClick) {
      if (currentModal && currentModal.whale) {
        // 상세 정보를 본 고래는 다시 모달이 뜨지 않도록 표시
        currentModal.whale.dismissed = true;
        lastClosedWhale = currentModal.whale;
      }
      showShortformDetail = false;
      currentModal = null;
      return;
    }
    return;
  }

  // ───── 여기 아래는 기존 모달 버튼 로직 그대로 ─────
  {
    // 모달 버튼들
    const modalW = 300;
    const modalH = 160; // 높이 증가
    const modalX = (width - modalW) / 2;
    const modalY = (height - modalH) / 2;
    const paddingBottom = 40; // 아래쪽 패딩 증가
    const btnW = 100;
    const btnH = 30;
    const btnY = modalY + modalH - paddingBottom - 20; // 위로 20픽셀 올리기
    const btn1X = modalX + modalW / 2 - btnW - 10;
    const btn2X = modalX + modalW / 2 + 10;
    
    // 자세히 보기 버튼
    if (mouseX >= btn1X && mouseX <= btn1X + btnW &&
        mouseY >= btnY && mouseY <= btnY + btnH) {
      if (currentModal && currentModal.type === 'jellyfish') {
        showChatDetail = true;
      } else if (currentModal && currentModal.type === 'seahorse') {
        showDeliveryDetail = true;
      } else if (currentModal && currentModal.type === 'whale') {
        showShortformDetail = true;
      }
    }
    
    // 그냥 지나치기 버튼
    if (mouseX >= btn2X && mouseX <= btn2X + btnW &&
        mouseY >= btnY && mouseY <= btnY + btnH) {
      if (currentModal && currentModal.type === 'jellyfish' && currentModal.jellyfish) {
        // 이 해파리는 더 이상 모달이 뜨지 않도록 표시
        currentModal.jellyfish.dismissed = true;
        lastClosedJellyfish = currentModal.jellyfish;
      } else if (currentModal && currentModal.type === 'seahorse' && currentModal.seahorse) {
        // 이 해마는 더 이상 모달이 뜨지 않도록 표시
        currentModal.seahorse.dismissed = true;
        lastClosedSeahorse = currentModal.seahorse;
      } else if (currentModal && currentModal.type === 'whale' && currentModal.whale) {
        // 이 고래는 더 이상 모달이 뜨지 않도록 표시
        currentModal.whale.dismissed = true;
        lastClosedWhale = currentModal.whale;
      }
      currentModal = null;
      showChatDetail = false;
      showDeliveryDetail = false;
      showShortformDetail = false;
    }
  }
}