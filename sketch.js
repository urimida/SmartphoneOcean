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
let fishes = []; // 쇼핑 물고기들
let minifishes = []; // 웹소설 미니 물고기들
let birds = [];  // 하늘 위 새들
let cameraY = 0;

// 다이버 이미지
let imgSide1, imgSide2, imgSide3, imgUp;
let imgNote; // 노트 이미지
let imgSeahorse; // 해마 이미지
let imgWhale; // 고래 이미지
let imgFish; // 물고기 이미지
let imgMiniFish; // 미니 물고기 이미지
let imagesLoaded = false; // 이미지 로드 완료 플래그

// 모달 관련 변수
let jellyfishData = []; // JSON에서 로드한 해파리 채팅 데이터
let deliveryData = []; // JSON에서 로드한 배달 데이터
let shortformData = []; // JSON에서 로드한 숏폼 데이터
let shoppingData = []; // JSON에서 로드한 쇼핑 데이터
let novelData = []; // JSON에서 로드한 웹소설 데이터
let currentModal = null; // 현재 표시 중인 모달 (null 또는 {type: 'jellyfish'/'seahorse'/'whale'/'fish'/'minifish', jellyfish/seahorse/whale/fish/minifish, data})
let showChatDetail = false; // 채팅 상세 보기 여부
let showDeliveryDetail = false; // 배달 상세 보기 여부
let showShortformDetail = false; // 숏폼 상세 보기 여부
let showShoppingDetail = false; // 쇼핑 상세 보기 여부
let showNovelDetail = false; // 웹소설 상세 보기 여부
let showNoteConfirm = false; // 탐사 일지 확인 모달 표시 여부
let showNoteBook = false; // 수첩 화면 표시 여부
let showSummaryText = false; // 3페이지에서 요약 텍스트 표시 여부
let summaryTypingIndex = 0; // 타이핑 애니메이션 인덱스
let summaryTypingSpeed = 12; // 타이핑 속도 (프레임당 문자 수, 더 빠르게)
let summaryTextComplete = false; // 텍스트 타이핑 완료 여부
let summaryTextLength = 0; // 요약 텍스트 길이 (타이핑 인덱스 추적용)
let cachedPlatformCounts = null; // 플랫폼 카운트 캐시
let lastPlatformCountUpdate = 0; // 마지막 플랫폼 카운트 업데이트 시간
let cachedSummaryLines = []; // 줄바꿈된 텍스트 캐시
let lastSummaryTextCache = ''; // 마지막 캐시된 텍스트

// 모달 렌더링 최적화: 모달 상태 변경 추적
let lastModalState = null; // 마지막 모달 상태 (재렌더링 최소화용)
let modalStateChanged = true; // 모달 상태가 변경되었는지 여부
let noteBookPage = 0; // 수첩 현재 페이지 (0, 1, 2)
let lastClosedJellyfish = null; // 마지막으로 닫은 해파리 (같은 해파리에서 바로 다시 열리지 않도록)
let lastClosedSeahorse = null; // 마지막으로 닫은 해마
let lastClosedWhale = null; // 마지막으로 닫은 고래
let lastClosedFish = null; // 마지막으로 닫은 물고기
let lastClosedMiniFish = null; // 마지막으로 닫은 미니 물고기
const INTERACTION_DISTANCE = 25; // 해파리/해마/고래와 상호작용 가능한 거리
let closeHintX = 0;
let closeHintY = 0;

// 모달 잠금 플래그 (모달이 열려있는 동안 다른 모달이 열리지 않도록)
let isModalLocked = false;

// 모달이 열려있는지 확인하는 헬퍼 함수 (해양 분위기 선택은 제외 - 항상 접근 가능)
function isAnyModalOpen() {
  return isModalLocked ||
         currentModal !== null || 
         showChatDetail || 
         showDeliveryDetail || 
         showShortformDetail || 
         showShoppingDetail || 
         showNovelDetail || 
         showPrologue || 
         showNoteBook || 
         showNoteConfirm;
}

// 모달을 여는 함수 (잠금 체크)
function openModal(modalData) {
  // 이미 모달이 열려있으면 무시
  if (isAnyModalOpen()) {
    return false;
  }
  
  // 모달 잠금 설정
  isModalLocked = true;
  currentModal = modalData;
  modalStateChanged = true; // 모달 상태 변경 플래그
  // 블러 캐시 무효화 (새 모달이 열릴 때)
  if (pgBlurred._cached) {
    pgBlurred._cacheInvalidated = true;
  }
  return true;
}

// 모달을 닫는 함수
function closeModal() {
  isModalLocked = false;
  currentModal = null;
  showChatDetail = false;
  showDeliveryDetail = false;
  showShortformDetail = false;
  showShoppingDetail = false;
  showNovelDetail = false;
  modalStateChanged = true; // 모달 상태 변경 플래그
  // 블러 캐시 무효화 (모달이 닫힐 때)
  if (pgBlurred._cached) {
    pgBlurred._cacheInvalidated = true;
  }
}

// 텍스트 디테일 모드에서 글자 크기 조절
let textDetailSizeScale = 1.3; // 기본값 1.3 (130%), 0.5 ~ 2.0 범위
const TEXT_SIZE_MIN = 0.5;
const TEXT_SIZE_MAX = 2.0;
const TEXT_SIZE_STEP = 0.1;
let isDraggingTextSize = false; // 슬라이더 드래그 중인지

// 프롤로그 관련 변수
let showPrologue = true; // 프롤로그 표시 여부
let prologueStep = 0; // 현재 프롤로그 단계 (0, 1, 2)
const PROLOGUE_MESSAGES = [
  "당신은 디지털 오션에 빠졌습니다.",
  "이 세상을 자유롭게 즐기세요.",
  "충분히 즐겼다면\nAI가 분석한 해양 탐사 일지로\n당신의 여정을 확인하세요."
]; 

// -----------------------
// 성능 관련 상수
// -----------------------
const MAX_BUBBLES = 60;   // 버블 최대 개수 제한 (성능 최적화: 100 -> 60)
const BUBBLE_SPAWN_PROB_SWIM = 0.15; // 기포 생성 확률 감소 (0.3 -> 0.15)
const BUBBLE_SPAWN_PROB_MOUSE = 0.1; // 기포 생성 확률 감소 (0.2 -> 0.1)

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

// 현재 선택된 바다 테마 인덱스
let currentOceanThemeIndex = -1;

// 해양 분위기(바다 테마) 선택 오버레이 표시 여부
let showOceanThemeOverlay = false;
let oceanThemeScrollOffset = 0; // 스크롤 오프셋

// 공통 모달 스타일 상수 (코너 반경 R, 배경 알파)
const UI_MODAL_RADIUS = 10;
const UI_MODAL_BG_ALPHA = 240;

// 노트(탐사 일지) 버튼 위치 및 후광/이동 효과 상태
let noteBtnCenterX = 0;
let noteBtnCenterY = 0;

let noteGlow = {
  active: false,
  startX: 0,
  startY: 0,
  progress: 0 // 0.0 ~ 1.0
};

let noteHalo = {
  active: false,
  timer: 0 // 프레임 기반 카운터
};

// 수첩(탐사 일지)에 한 번이라도 내용이 들어갔는지 여부
let hasNoteContent = false;

// 탐사 통계 변수
let explorationStartTime = 0; // 탐사 시작 시간 (밀리초)
let totalDistanceTraveled = 0; // 총 이동 거리
let totalBubblesSpawned = 0; // 총 기포 생성 개수 (호흡 횟수)
let totalTextBubblesSpawned = 0; // 스위머가 방출한 텍스트 기포 개수
let oceanThemeChangeCount = 0; // 배경(모드) 변경 횟수
let lastSwimmerX = 0; // 이전 프레임의 다이버 X 위치
let lastSwimmerY = 0; // 이전 프레임의 다이버 Y 위치
let isInitialThemeSet = false; // 초기 테마 설정 여부 (초기화 시 카운트하지 않기 위해)

// 현재 바다 색상에 맞는 생물 필터 색상 (살짝만 섞어서 전체 톤 맞추기)
function getOceanLifeTintRGB() {
  if (!weatherColors || !weatherColors.midColor) return null;
  const mc = weatherColors.midColor;
  const r = mc[0];
  const g = mc[1];
  const b = mc[2];
  const mix = 0.35; // 0이면 흰색, 1이면 바다색 그대로
  return {
    r: lerp(255, r, mix),
    g: lerp(255, g, mix),
    b: lerp(255, b, mix)
  };
}

// 손 인식 관련 변수
let video;
let handpose;

let handControlEnabled = false; // 손 제어 활성화 여부

// 전역 UI 폰트 (ThinDungGeunMo)
let uiFont;
// 제목용 폰트 (DungGeunMo - 더 두꺼운 폰트)
let titleFont;

// 물방울 사운드 (HTML5 Audio 사용)
let bubbleSoundAudio = null;
// shine 효과음 (HTML5 Audio 사용)
let shineSoundAudio = null;
// 배경음악 (HTML5 Audio 사용)
let seaSoundAudio = null;
// 수영 효과음 (HTML5 Audio 사용)
let swimmingSoundAudio = null;
let isSwimming = false; // 현재 수영 중인지 여부

function preload() {
  uiFont = loadFont('src/fonts/ThinDungGeunMo.ttf');
  titleFont = loadFont('src/fonts/DungGeunMo.ttf');
}
let handCenterX = 0.5; // 손 중심 X (0~1)
let handCenterY = 0.5; // 손 중심 Y (0~1)
let prevHandCenterX = 0.5; // 이전 손 중심 X (움직임 방향 계산용)
let prevHandCenterY = 0.5; // 이전 손 중심 Y (움직임 방향 계산용)
let handDeltaX = 0; // 손의 X 방향 움직임 (-1 ~ 1)
let handDeltaY = 0; // 손의 Y 방향 움직임 (-1 ~ 1)
let lastHandTime = 0; // 마지막으로 손을 감지한 시간
let currentHandData = null; // 현재 손 데이터 (관절 표시용)

// 조이스틱 상태 (손바닥 기반)
let joyX = 0; // -1 ~ 1
let joyY = 0; // -1 ~ 1
let joyCenterX = 0.5; // 캘리브레이션된 중심 X (0~1)
let joyCenterY = 0.5; // 캘리브레이션된 중심 Y (0~1)
const JOY_SMOOTH = 0.25;   // 0~1 (클수록 빠르게 따라감)
const JOY_DEADZONE = 0.08; // 0~1, 중심 데드존

// 제스처 감지 상태
let lastJoySignX = 0;
let lastJoyFlipTime = 0;
let lastWaveTime = 0;
let lastFistTime = 0;
// 손 흔들기 제스처로 텍스트 표시 (텍스트 상세 모드에서)
let gestureWaveDetected = false;
let gestureWaveTime = 0;
const GESTURE_WAVE_DURATION = 2000; // 2초 동안 텍스트 표시
// 양손 박수 감지
let lastClapTime = 0;
let previousHandsDistance = Infinity; // 이전 프레임의 양손 거리

// 표정 인식 관련 변수
let currentEmotion = 'neutral'; // 현재 감정 ('happy', 'sad', 'angry', 'surprised', 'neutral')
let emotionConfidence = 0.5; // 감정 신뢰도 (0~1)
let emotionPercent = 50; // 표정 상태 퍼센트 (0~100)
let lastEmotionUpdateTime = 0; // 마지막 표정 업데이트 시간
const EMOTION_UPDATE_INTERVAL = 2000; // 표정 업데이트 간격 (2초)
let faceApi = null; // Face API 인스턴스 (나중에 사용 가능)

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
  const extraSkyHeight = BASE_H * 0.3;
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
  
  // 고래 이미지 로드
  imgWhale = loadImage('src/imgs/whale.png');
  
  // 물고기 이미지 로드
  imgFish = loadImage('src/imgs/fish.png');
  
  // 미니 물고기 이미지 로드
  imgMiniFish = loadImage('src/imgs/minifish.png');

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

  // 물고기 초기화 (3~6마리)
  fishes = [];
  let fishCount = int(random(3, 7));
  for (let i = 0; i < fishCount; i++) {
    fishes.push(new Fish());
  }

  // 쇼핑 데이터 로드
  loadJSON('shoppings.json', (data) => {
    shoppingData = data;
    // 물고기에 데이터 할당
    for (let i = 0; i < fishes.length; i++) {
      if (shoppingData.length > 0) {
        fishes[i].shoppingData = shoppingData[int(random(shoppingData.length))];
      }
    }
  });

  // 미니 물고기 초기화 (4~8마리)
  minifishes = [];
  let minifishCount = int(random(4, 9));
  for (let i = 0; i < minifishCount; i++) {
    minifishes.push(new MiniFish());
  }

  // 웹소설 데이터 로드
  loadJSON('novels.json', (data) => {
    // novels.json은 { novels: [...], reviews: [...] } 구조
    novelData = data.novels || data; // novels 배열 사용, 없으면 기존 구조로 폴백
    // 미니 물고기에 데이터 할당 (리뷰 정보도 함께 연결)
    for (let i = 0; i < minifishes.length; i++) {
      if (novelData.length > 0) {
        const novel = novelData[int(random(novelData.length))];
        // 해당 소설의 리뷰 찾기
        if (data.reviews && Array.isArray(data.reviews)) {
          const novelReviews = data.reviews.find(r => r.title === novel.title);
          if (novelReviews && novelReviews.items) {
            novel.reviews = novelReviews.items;
          }
        }
        minifishes[i].novelData = novel;
      }
    }
  });

  // 새 초기화 (하늘 위를 천천히 날아다님)
  birds = [];
  let birdCount = int(random(2, 5));
  for (let i = 0; i < birdCount; i++) {
    birds.push(new Bird());
  }

  // 탐사 통계 초기화
  explorationStartTime = millis();
  totalDistanceTraveled = 0;
  totalBubblesSpawned = 0; // 호흡 횟수 초기화
  totalTextBubblesSpawned = 0; // 텍스트 기포 개수 초기화
  oceanThemeChangeCount = 0; // 모드 변경 횟수 초기화
  isInitialThemeSet = false; // 초기 테마 설정 플래그 초기화
  if (swimmer) {
    lastSwimmerX = swimmer.x;
    lastSwimmerY = swimmer.y;
  }
  
  // 표정 상태 초기화 (랜덤 값으로 시작)
  generateRandomEmotion();
  lastEmotionUpdateTime = millis();
  
  // 물방울 사운드 초기화 (HTML5 Audio)
  initBubbleSound();
  // shine 효과음 초기화 (HTML5 Audio)
  initShineSound();
  // 배경음악 초기화 (HTML5 Audio)
  initSeaSound();
  // 수영 효과음 초기화 (HTML5 Audio)
  initSwimmingSound();
}

// 물방울 사운드 초기화 함수
function initBubbleSound() {
  try {
    // HTML5 Audio 요소 생성
    bubbleSoundAudio = new Audio('src/sound/bubble.mp3');
    bubbleSoundAudio.volume = 0.3; // 볼륨 설정
    bubbleSoundAudio.preload = 'auto'; // 미리 로드
    
    // 로드 완료 이벤트
    bubbleSoundAudio.addEventListener('loadeddata', () => {
      console.log('물방울 소리 로드 완료');
    });
    
    // 에러 처리
    bubbleSoundAudio.addEventListener('error', (e) => {
      console.error('Error loading bubble sound:', e);
    });
  } catch (e) {
    console.error('Audio not supported:', e);
  }
}

// shine 효과음 초기화 함수
function initShineSound() {
  try {
    // HTML5 Audio 요소 생성
    shineSoundAudio = new Audio('src/sound/shine.mp3');
    shineSoundAudio.volume = 0.4; // 볼륨 설정
    shineSoundAudio.preload = 'auto'; // 미리 로드
    
    // 로드 완료 이벤트
    shineSoundAudio.addEventListener('loadeddata', () => {
      console.log('shine 효과음 로드 완료');
    });
    
    // 에러 처리
    shineSoundAudio.addEventListener('error', (e) => {
      console.error('Error loading shine sound:', e);
    });
    } catch (e) {
    console.error('Audio not supported:', e);
  }
}

// 배경음악 초기화 함수
function initSeaSound() {
  try {
    // HTML5 Audio 요소 생성
    seaSoundAudio = new Audio('src/sound/seasound.mp3');
    seaSoundAudio.volume = 0.3; // 배경음악 볼륨 설정 (적당한 크기)
    seaSoundAudio.loop = true; // 반복 재생
    seaSoundAudio.preload = 'auto'; // 미리 로드
    
    // 로드 완료 이벤트 - 로드 완료 후 재생 시작
    seaSoundAudio.addEventListener('loadeddata', () => {
      console.log('배경음악 로드 완료');
      // 사용자 상호작용 후 재생을 위해 첫 클릭 시 재생 시작
      // 또는 바로 재생 시도
      const playPromise = seaSoundAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('배경음악 재생 시작');
          })
          .catch(error => {
            console.log('배경음악 자동 재생 실패 (사용자 상호작용 필요):', error);
            // 사용자 상호작용이 필요할 수 있으므로, 첫 클릭 시 재생 시도
          });
      }
    });
    
    // 에러 처리
    seaSoundAudio.addEventListener('error', (e) => {
      console.error('Error loading sea sound:', e);
    });
    
    // 재생이 끝났을 때 다시 시작 (loop가 작동하지 않는 경우 대비)
    seaSoundAudio.addEventListener('ended', () => {
      seaSoundAudio.currentTime = 0;
      seaSoundAudio.play().catch(error => {
        console.log('배경음악 재시작 실패:', error);
      });
    });
  } catch (e) {
    console.error('Audio not supported:', e);
  }
}

// 수영 효과음 초기화 함수
function initSwimmingSound() {
  try {
    // HTML5 Audio 요소 생성
    swimmingSoundAudio = new Audio('src/sound/swimming.mp3');
    swimmingSoundAudio.volume = 0.4; // 수영 효과음 볼륨 설정
    swimmingSoundAudio.loop = true; // 반복 재생
    swimmingSoundAudio.preload = 'auto'; // 미리 로드
    
    // 로드 완료 이벤트
    swimmingSoundAudio.addEventListener('loadeddata', () => {
      console.log('수영 효과음 로드 완료');
    });
    
    // 에러 처리
    swimmingSoundAudio.addEventListener('error', (e) => {
      console.error('Error loading swimming sound:', e);
    });
    
    // 재생이 끝났을 때 다시 시작 (loop가 작동하지 않는 경우 대비)
    swimmingSoundAudio.addEventListener('ended', () => {
      if (isSwimming) {
        swimmingSoundAudio.currentTime = 0;
        swimmingSoundAudio.play().catch(error => {
          console.log('수영 효과음 재시작 실패:', error);
        });
      }
    });
  } catch (e) {
    console.error('Audio not supported:', e);
  }
}

// 수영 효과음 재생/정지 함수
function updateSwimmingSound() {
  if (!swimmingSoundAudio || !swimmer) {
    return;
  }
  
  // 스위머의 속도 계산
  const speed = sqrt(swimmer.vx * swimmer.vx + swimmer.vy * swimmer.vy);
  const swimmingThreshold = 0.02; // 수영 중으로 판단하는 최소 속도
  
  const wasSwimming = isSwimming;
  isSwimming = speed > swimmingThreshold;
  
  try {
    if (isSwimming && !wasSwimming) {
      // 수영 시작: 재생 시작
      if (swimmingSoundAudio.paused) {
        swimmingSoundAudio.currentTime = 0;
        const playPromise = swimmingSoundAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            // 재생 실패 시 무시 (사용자 상호작용 필요할 수 있음)
          });
        }
      }
    } else if (!isSwimming && wasSwimming) {
      // 수영 중지: 일시정지
      if (!swimmingSoundAudio.paused) {
        swimmingSoundAudio.pause();
      }
    }
  } catch (e) {
    console.error('Error updating swimming sound:', e);
  }
}

// 물방울 소리 재생 함수 (0초부터 1초까지만 재생)
function playBubbleSound() {
  if (!bubbleSoundAudio) {
    console.log('물방울 소리가 초기화되지 않았습니다.');
    return;
  }
  
  try {
    // 현재 재생 중이면 중지하고 처음부터 다시 시작
    bubbleSoundAudio.pause();
    bubbleSoundAudio.currentTime = 0;
    
    // 0초부터 재생 시작
    const playPromise = bubbleSoundAudio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // 1초 후 자동으로 중지
          setTimeout(() => {
            if (bubbleSoundAudio && !bubbleSoundAudio.paused) {
              bubbleSoundAudio.pause();
              bubbleSoundAudio.currentTime = 0;
            }
          }, 1000);
        })
        .catch(error => {
          console.error('Error playing bubble sound:', error);
        });
    }
  } catch (e) {
    console.error('Error playing bubble sound:', e);
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
    name: '기본 파란 바다',
    topColor: [90, 220, 230],
    midColor: [30, 160, 165],
    bottomColor: [5, 30, 70]
  },
  // 2. 황금빛 바다 (노란빛, 따뜻한 일몰)
  {
    name: '황금빛 바다',
    topColor: [255, 220, 150],
    midColor: [200, 160, 100],
    bottomColor: [80, 50, 30]
  },
  // 3. 에메랄드 바다 (초록빛, 열대 바다)
  {
    name: '에메랄드 바다',
    topColor: [100, 240, 200],
    midColor: [40, 180, 150],
    bottomColor: [10, 80, 60]
  },
  // 4. 일몰 바다 (붉은빛, 따뜻한 톤)
  {
    name: '일몰 바다',
    topColor: [255, 180, 140],
    midColor: [200, 120, 100],
    bottomColor: [60, 30, 40]
  },
  // 5. 청록색 바다 (터키시 블루)
  {
    name: '청록 바다',
    topColor: [120, 250, 255],
    midColor: [60, 200, 220],
    bottomColor: [20, 100, 120]
  },
  // 6. 보라빛 바다 (신비로운 톤)
  {
    name: '보라빛 바다',
    topColor: [180, 160, 240],
    midColor: [120, 100, 180],
    bottomColor: [50, 40, 80]
  },
  // 7. 민트 바다 (연한 초록빛)
  {
    name: '민트 바다',
    topColor: [180, 255, 230],
    midColor: [120, 220, 190],
    bottomColor: [50, 100, 85]
  },
  // 8. 코랄 바다 (핑크-오렌지 톤)
  {
    name: '코랄 바다',
    topColor: [255, 200, 180],
    midColor: [220, 150, 130],
    bottomColor: [100, 60, 50]
  },
  // 9. 딥 블루 (깊은 파란 바다)
  {
    name: '깊은 바다',
    topColor: [60, 180, 220],
    midColor: [30, 120, 160],
    bottomColor: [5, 40, 70]
  },
  // 10. 틸 바다 (청록-녹색 톤)
  {
    name: '틸 바다',
    topColor: [100, 220, 200],
    midColor: [50, 160, 150],
    bottomColor: [15, 80, 75]
  },
  // 11. 핑크빛 바다 (로맨틱한 핑크 톤)
  {
    name: '핑크빛 바다',
    topColor: [255, 200, 220],
    midColor: [240, 150, 180],
    bottomColor: [180, 80, 120]
  }
];

function setRandomOceanTheme() {
  const themeIndex = int(random(OCEAN_THEMES.length));
  const theme = OCEAN_THEMES[themeIndex];
  weatherColors.topColor = theme.topColor;
  weatherColors.midColor = theme.midColor;
  weatherColors.bottomColor = theme.bottomColor;
  
  // 초기화 이후의 변경만 카운트
  if (isInitialThemeSet && currentOceanThemeIndex !== themeIndex) {
    oceanThemeChangeCount++;
  }
  
  currentOceanThemeIndex = themeIndex;
  isInitialThemeSet = true;
  
  // 배경 다시 그리기
  if (oceanBackground && pgBase) {
    oceanBackground.paintStaticScene(pgBase);
  }
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
    
    // 카메라 스트림 중단 시 이벤트 처리 (화면 녹화 프로그램 등으로 인한 중단 방지)
    video.elt.addEventListener('ended', (e) => {
      console.log('비디오 스트림 종료 감지 - 새로고침 방지');
      e.preventDefault();
      e.stopPropagation();
      // 스트림이 중단되어도 페이지 새로고침하지 않음
      return false;
    });
    
    video.elt.addEventListener('error', (e) => {
      console.log('비디오 스트림 오류 감지 - 새로고침 방지');
      e.preventDefault();
      e.stopPropagation();
      // 오류가 발생해도 페이지 새로고침하지 않음
      return false;
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
      maxHands: 2, // 양손 박수 감지를 위해 2로 변경
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

// 손바닥 중심 (0~1 좌표) 계산
function getPalmCenter01(hand) {
  const ids = [0, 5, 9, 13, 17];
  let sx = 0, sy = 0, n = 0;
  for (const id of ids) {
    const kp = hand.keypoints?.[id];
    if (!kp) continue;
    sx += kp.x;
    sy += kp.y;
    n++;
  }
  if (n === 0 || !video || !video.width || !video.height) return null;
  return {
    x01: sx / n / video.width,
    y01: sy / n / video.height,
  };
}

// 손 감지 결과 처리 (조이스틱용)
function gotHands(results) {
  // 결과가 없으면 손이 끊긴 것으로 간주하고 조이스틱을 서서히 0으로 복귀
  if (!results || !Array.isArray(results) || results.length === 0) {
    currentHandData = null;
    joyX = lerp(joyX, 0, 0.12);
    joyY = lerp(joyY, 0, 0.12);
    previousHandsDistance = Infinity; // 양손 거리 초기화
    return;
  }
  
  // 양손 박수 감지 (2개 이상의 손이 감지되고, 손가락이 펴져있고, 두 손이 가까워질 때)
  if (results.length >= 2) {
    const hand1 = results[0];
    const hand2 = results[1];
    const pc1 = getPalmCenter01(hand1);
    const pc2 = getPalmCenter01(hand2);
    
    if (pc1 && pc2 && video && video.width && video.height) {
      // 두 손바닥 중심 사이의 거리 계산 (0~1 정규화)
      const dx = (pc1.x01 - pc2.x01) * video.width;
      const dy = (pc1.y01 - pc2.y01) * video.height;
      const distance = sqrt(dx * dx + dy * dy);
      const normalizedDistance = distance / max(video.width, video.height);
      
      // 두 손이 가까워지고 있는지 확인 (이전보다 가까워졌고, 충분히 가까울 때)
      const now = millis();
      if (normalizedDistance < 0.15 && previousHandsDistance > normalizedDistance && 
          previousHandsDistance < 0.25 && now - lastClapTime > 1000) {
        // 양손 모두 손가락이 펴져있는지 확인 (박수는 손가락을 펴고 침)
        const spread1 = getHandSpread(hand1, pc1);
        const spread2 = getHandSpread(hand2, pc2);
        
        if (spread1 > 0.15 && spread2 > 0.15) { // 손가락이 펴져있음
          lastClapTime = now;
          // 해양 분위기 랜덤 변경
          setRandomOceanTheme();
          console.log('박수 감지: 해양 분위기 변경');
        }
      }
      
      previousHandsDistance = normalizedDistance;
    }
  } else {
    previousHandsDistance = Infinity; // 한 손만 있을 때는 거리 초기화
  }
  
  const hand = results[0];
  currentHandData = hand;
  
  const pc = getPalmCenter01(hand);
  if (!pc) return;

  // flipHorizontal 옵션을 사용하므로 별도의 1-x 반전은 하지 않음
  const x01 = pc.x01;
  const y01 = pc.y01;

  handCenterX = x01;
  handCenterY = y01;
  lastHandTime = millis();

  // 텍스트 상세 모달이 열려있을 때 손 위치를 마우스 커서 위치로 매핑
  const isTextDetailOpen = showChatDetail || showDeliveryDetail || showShortformDetail || showShoppingDetail || showNovelDetail;
  if (isTextDetailOpen && video && video.width && video.height) {
    // 손 위치를 화면 좌표로 변환 (0~1 범위를 화면 크기로 매핑)
    // flipHorizontal 옵션을 사용하므로 x01을 그대로 사용
    const screenX = x01 * width;
    const screenY = y01 * height;
    
    // p5.js의 mouseX, mouseY는 읽기 전용이므로 전역 변수로 관리
    // 실제로는 마우스 이벤트를 시뮬레이션할 수 없으므로, 커스텀 커서를 그리거나
    // 모든 마우스 관련 코드에서 handCenterX/Y를 사용하도록 변경해야 함
    // 여기서는 간단하게 handCenterX/Y를 화면 좌표로 변환하여 저장
    if (typeof window.virtualMouseX === 'undefined') {
      window.virtualMouseX = screenX;
      window.virtualMouseY = screenY;
    } else {
      // 부드러운 이동을 위해 lerp 사용
      window.virtualMouseX = lerp(window.virtualMouseX, screenX, 0.3);
      window.virtualMouseY = lerp(window.virtualMouseY, screenY, 0.3);
    }
  }

  // 조이스틱 벡터 (캘리브레이션된 중심 기준)
  // joyCenterX/Y에서 화면 끝(0 또는 1)까지의 최대 거리를 기준으로 정규화해서
  // 손이 화면 끝 근처까지 가면 조이스틱도 원 가장자리까지 가도록 스케일링
  const maxDX = max(joyCenterX, 1 - joyCenterX);
  const maxDY = max(joyCenterY, 1 - joyCenterY);
  const scaleX = maxDX > 0 ? 1.0 / maxDX : 1.0;
  const scaleY = maxDY > 0 ? 1.0 / maxDY : 1.0;

  // X축: 오른쪽으로 갈수록 +, 왼쪽으로 갈수록 -
  let dx = (x01 - joyCenterX) * scaleX;
  // Y축: 위로 올리면 음수, 아래로 내리면 양수 (p5에서 vy<0이면 위로 이동)
  let dy = (y01 - joyCenterY) * scaleY;

  // 데드존 처리
  let len = Math.hypot(dx, dy);
  if (len < JOY_DEADZONE) {
    dx = 0;
    dy = 0;
  } else {
    // 데드존 밖은 다시 0~1로 리매핑 (부드럽게)
    const newLen = (len - JOY_DEADZONE) / (1 - JOY_DEADZONE);
    const k = Math.min(1, newLen) / (len || 1);
    dx *= k;
    dy *= k;
  }

  // 스무딩 (저역통과 필터)
  joyX = lerp(joyX, dx, JOY_SMOOTH);
  joyY = lerp(joyY, dy, JOY_SMOOTH);

  // -------------------------
  // 제스처 감지 (파형/주먹)
  // -------------------------
  const now = millis();

  // 좌우 빠른 반전 → 손 흔들기(wave)
  const signX = joyX > 0.25 ? 1 : (joyX < -0.25 ? -1 : 0);
  if (signX !== 0) {
    if (lastJoySignX !== 0 && signX !== lastJoySignX && now - lastJoyFlipTime < 300) {
      // 좌우가 짧은 시간 안에 바뀌면 wave로 간주
      if (now - lastWaveTime > 600) {
        lastWaveTime = now;
        handleModalCancelFromGesture();
      }
    }
    if (signX !== lastJoySignX) {
      lastJoySignX = signX;
      lastJoyFlipTime = now;
    }
  }

  // 손가락 모양 기반 간단한 "주먹" 감지: 손바닥 중심에서 손가락 끝까지의 퍼짐이 작으면 주먹
  if (currentHandData && currentHandData.keypoints) {
    const tipIndices = [4, 8, 12, 16, 20];
    let minDx = Infinity, maxDx = -Infinity;
    let minDy = Infinity, maxDy = -Infinity;
    for (const idx of tipIndices) {
      const kp = currentHandData.keypoints[idx];
      if (!kp) continue;
      const tx = kp.x / video.width;
      const ty = kp.y / video.height;
      const dxTip = tx - x01;
      const dyTip = ty - y01;
      minDx = min(minDx, dxTip);
      maxDx = max(maxDx, dxTip);
      minDy = min(minDy, dyTip);
      maxDy = max(maxDy, dyTip);
    }
    if (minDx !== Infinity) {
      const spread = max(abs(maxDx - minDx), abs(maxDy - minDy));
      // 퍼짐이 작고, 손이 카메라 중앙 근처에 있을 때만 주먹으로 인식
      if (spread < 0.12 && now - lastFistTime > 1000) {
        lastFistTime = now;
        handleModalConfirmFromGesture();
      }
    }
  }
}


// ==============================
// 입력 이벤트
// ==============================
function mouseMoved() {
  // 마우스를 움직일 때 버블 생성 (화면 → 월드 좌표로 변환)
  // 마우스로 생성되는 기포는 텍스트 기포로 처리하지 않음 (일반 기포)
  if (random() < BUBBLE_SPAWN_PROB_MOUSE) {
    const vt = viewTransform;
    const worldX = (mouseX - vt.offsetX) / vt.scaleFactor;
    const worldY = mouseY / vt.scaleFactor + cameraY;
    if (worldY > SURFACE_Y + 2) {
      spawnBubble(worldX, worldY, false); // 일반 기포
    }
  }
}

// ==============================
// 메인 루프
// ==============================
function draw() {
  background(0);
  noSmooth();

  // 손 인식 (성능 최적화: 수동 방식일 때만 일정 간격으로)
  if (handControlEnabled && handpose && video && !useEventBasedDetection) {
    const now = millis();
    if (now > nextHandDetectTime) {
      nextHandDetectTime = now + HAND_DETECT_INTERVAL;
      detectHand();
    }
  }

  // 표정 상태 업데이트 (주기적으로 랜덤 값 생성 또는 실제 인식)
  const now = millis();
  if (now - lastEmotionUpdateTime > EMOTION_UPDATE_INTERVAL) {
    updateEmotionState();
    lastEmotionUpdateTime = now;
  }

  // 텍스트 상세 모달이 열려있는지 확인
  const isTextDetailOpen = showChatDetail || showDeliveryDetail || showShortformDetail || showShoppingDetail || showNovelDetail;

  // 뷰 변환 캐시 업데이트
  updateViewTransform();
  const vt = viewTransform;

  // 물결 왜곡 (정적 배경 → wobble 버퍼, 하늘은 고정, 바다는 흔들림)
  // 텍스트 모달이 열려있으면 배경 업데이트 멈춤
  if (!isTextDetailOpen) {
  // 성능 최적화: 프레임 스킵 (2프레임마다 1번만 업데이트)
  const shouldUpdateWobble = frameCount % 2 === 0;
  if (shouldUpdateWobble) {
    const t = millis() * 0.0007;
    // clear 대신 배경을 먼저 복사 (깜빡임 방지)
    pgWobble.copy(pgBase, 0, 0, pgBase.width, pgBase.height, 0, 0, pgBase.width, pgBase.height);
    
    const w = pgBase.width;
    const h = pgBase.height;
    const surfY = int(SURFACE_Y);
    // 바다 부분만 물결 효과 적용 (성능 최적화: 2픽셀 간격으로 스킵)
    for (let y = surfY; y < h; y += 2) {
      let strength = map(y, surfY, h, 1.0, 3.0);
      let offset = int(sin(t + y * 0.16) * strength);
      pgWobble.copy(pgBase, 0, y, w, 2, offset, y, w, 2);
      }
    }
  }

  // 생명체 업데이트 (텍스트 모달이 열려있으면 스위머 업데이트 멈춤)
  if (!isTextDetailOpen) {
  swimmer.update();
    
    // 수영 효과음 업데이트
    updateSwimmingSound();
  
  // 이동 거리 추적
  if (swimmer) {
    const dx = swimmer.x - lastSwimmerX;
    const dy = swimmer.y - lastSwimmerY;
    const distance = sqrt(dx * dx + dy * dy);
    totalDistanceTraveled += distance;
    lastSwimmerX = swimmer.x;
    lastSwimmerY = swimmer.y;
    }
  }

  // 버블 업데이트 및 제거
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.update();
    if (b.isOffWorld()) {
      bubbles.splice(i, 1);
    }
  }

  // 해파리 업데이트 및 상호작용 체크
  for (let i = 0; i < jellyfishes.length; i++) {
    jellyfishes[i].update();
    
    if (!jellyfishes[i].chatData && jellyfishData.length > 0) {
      jellyfishes[i].chatData = jellyfishData[int(random(jellyfishData.length))];
    }
    
    // 성능 최적화: 제곱 거리로 비교 (sqrt 제거)
    const dx = swimmer.x - jellyfishes[i].x;
    const dy = swimmer.y - jellyfishes[i].y;
    const distSq = dx * dx + dy * dy;
    const dist = sqrt(distSq); // 상호작용 체크에만 사용
    
    if (!isAnyModalOpen()) {
      const interactionDistSq = INTERACTION_DISTANCE * INTERACTION_DISTANCE;
      if (distSq < interactionDistSq && jellyfishes[i].chatData && 
          !jellyfishes[i].dismissed && lastClosedJellyfish !== jellyfishes[i]) {
        openModal({ type: 'jellyfish', jellyfish: jellyfishes[i], data: jellyfishes[i].chatData });
      }
      const resetDistSq = (INTERACTION_DISTANCE * 1.5) * (INTERACTION_DISTANCE * 1.5);
      if (lastClosedJellyfish === jellyfishes[i] && distSq > resetDistSq && !jellyfishes[i].dismissed) {
        lastClosedJellyfish = null;
      }
    }
  }

  // 해마 업데이트 및 상호작용 체크
  for (let i = 0; i < seahorses.length; i++) {
    seahorses[i].update();
    
    if (!seahorses[i].deliveryData && deliveryData.length > 0) {
      seahorses[i].deliveryData = deliveryData[int(random(deliveryData.length))];
    }
    
    // 성능 최적화: 제곱 거리로 비교 (sqrt 제거)
    const dx = swimmer.x - seahorses[i].x;
    const dy = swimmer.y - seahorses[i].y;
    const distSq = dx * dx + dy * dy;
    const dist = sqrt(distSq); // 상호작용 체크에만 사용
    
    if (!isAnyModalOpen()) {
      const interactionDistSq = INTERACTION_DISTANCE * INTERACTION_DISTANCE;
      if (distSq < interactionDistSq && seahorses[i].deliveryData && 
          !seahorses[i].dismissed && lastClosedSeahorse !== seahorses[i]) {
        openModal({ type: 'seahorse', seahorse: seahorses[i], data: seahorses[i].deliveryData });
      }
      const resetDistSq = (INTERACTION_DISTANCE * 1.5) * (INTERACTION_DISTANCE * 1.5);
      if (lastClosedSeahorse === seahorses[i] && distSq > resetDistSq && !seahorses[i].dismissed) {
        lastClosedSeahorse = null;
      }
    }
  }

  // 고래 업데이트 및 상호작용 체크
  for (let i = 0; i < whales.length; i++) {
    whales[i].update();
    
    if (!whales[i].shortformData && shortformData.length > 0) {
      whales[i].shortformData = shortformData[int(random(shortformData.length))];
    }
    
    // 성능 최적화: 제곱 거리로 비교 (sqrt 제거)
    const dx = swimmer.x - whales[i].x;
    const dy = swimmer.y - whales[i].y;
    const distSq = dx * dx + dy * dy;
    const dist = sqrt(distSq); // 상호작용 체크에만 사용
    
    if (!isAnyModalOpen()) {
      const interactionDistSq = INTERACTION_DISTANCE * INTERACTION_DISTANCE;
      if (distSq < interactionDistSq && whales[i].shortformData && 
          !whales[i].dismissed && lastClosedWhale !== whales[i]) {
        openModal({ type: 'whale', whale: whales[i], data: whales[i].shortformData });
      }
      const resetDistSq = (INTERACTION_DISTANCE * 1.5) * (INTERACTION_DISTANCE * 1.5);
      if (lastClosedWhale === whales[i] && distSq > resetDistSq && !whales[i].dismissed) {
        lastClosedWhale = null;
      }
    }
  }

  // 물고기 업데이트 및 상호작용 체크
  for (let i = 0; i < fishes.length; i++) {
    fishes[i].update();
    
    if (!fishes[i].shoppingData && shoppingData.length > 0) {
      fishes[i].shoppingData = shoppingData[int(random(shoppingData.length))];
    }
    
    // 성능 최적화: 제곱 거리로 비교 (sqrt 제거)
    const dx = swimmer.x - fishes[i].x;
    const dy = swimmer.y - fishes[i].y;
    const distSq = dx * dx + dy * dy;
    const dist = sqrt(distSq); // 상호작용 체크에만 사용
    
    if (!isAnyModalOpen()) {
      const interactionDistSq = INTERACTION_DISTANCE * INTERACTION_DISTANCE;
      if (distSq < interactionDistSq && fishes[i].shoppingData && 
          !fishes[i].dismissed && lastClosedFish !== fishes[i]) {
        openModal({ type: 'fish', fish: fishes[i], data: fishes[i].shoppingData });
      }
      const resetDistSq = (INTERACTION_DISTANCE * 1.5) * (INTERACTION_DISTANCE * 1.5);
      if (lastClosedFish === fishes[i] && distSq > resetDistSq && !fishes[i].dismissed) {
        lastClosedFish = null;
      }
    }
  }

  // 미니 물고기 업데이트 및 상호작용 체크
  for (let i = 0; i < minifishes.length; i++) {
    minifishes[i].update();
    
    // novelData는 배열이거나 { novels: [...] } 구조일 수 있음
    const novelsArray = Array.isArray(novelData) ? novelData : (novelData.novels || []);
    if (!minifishes[i].novelData && novelsArray.length > 0) {
      minifishes[i].novelData = novelsArray[int(random(novelsArray.length))];
    }
    
    // 성능 최적화: 제곱 거리로 비교 (sqrt 제거)
    const dx = swimmer.x - minifishes[i].x;
    const dy = swimmer.y - minifishes[i].y;
    const distSq = dx * dx + dy * dy;
    const dist = sqrt(distSq); // 상호작용 체크에만 사용
    
    if (!isAnyModalOpen()) {
      const interactionDistSq = INTERACTION_DISTANCE * INTERACTION_DISTANCE;
      if (distSq < interactionDistSq && minifishes[i].novelData && 
          !minifishes[i].dismissed && lastClosedMiniFish !== minifishes[i]) {
        openModal({ type: 'minifish', minifish: minifishes[i], data: minifishes[i].novelData });
      }
      const resetDistSq = (INTERACTION_DISTANCE * 1.5) * (INTERACTION_DISTANCE * 1.5);
      if (lastClosedMiniFish === minifishes[i] && distSq > resetDistSq && !minifishes[i].dismissed) {
        lastClosedMiniFish = null;
      }
    }
  }

  // 새 업데이트
  for (let i = 0; i < birds.length; i++) {
    birds[i].update();
  }

  // 카메라 업데이트 (다이버 따라가기) - 텍스트 모달이 열려있으면 카메라 업데이트 멈춤
  if (!isTextDetailOpen) {
  // 하늘을 더 많이 보이도록 위로 스크롤 가능한 범위 확장
  const extraSkyHeight = BASE_H * 0.3; // 하늘 위쪽 추가 공간
  const totalBgHeight = BASE_H + extraSkyHeight; // 배경 전체 높이
  const minCameraY = 0; // 배경이 y=0부터 시작하므로 최소값은 0
  const maxCameraY = max(0, totalBgHeight - vt.visibleWorldHeight); // 배경 높이를 넘지 않도록
  
  // 다이버가 최대 높이에 도달했을 때, 위로 가려고 하면 카메라만 위로 올라가도록
  const swimmerMaxY = BASE_H * 0.2;
  const isAtMaxHeight = swimmer.y >= swimmerMaxY - 1;
  const followOffset = vt.visibleWorldHeight * 0.35;
  
  let targetCameraY;
  if (isAtMaxHeight && swimmer.vy < 0) {
    targetCameraY = cameraY + swimmer.vy * 1.5;
  } else {
    targetCameraY = swimmer.y - followOffset;
  }
  
  targetCameraY = constrain(targetCameraY, minCameraY, maxCameraY);
  
  // 수직 이동 중일 때는 카메라를 거의 즉시 따라오게 해서 지연 최소화
  const absVy = abs(swimmer.vy);
  const absVx = abs(swimmer.vx);
  const isVerticalMove = absVy > 0.05 && absVy > absVx;
  const follow = isVerticalMove ? 0.65 : 0.12;
  cameraY = lerp(cameraY, targetCameraY, follow);
  }

  // 생명체 렌더 (pgWobble 위에 그림)
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
  for (let i = 0; i < fishes.length; i++) {
    fishes[i].draw(pgWobble);
  }
  for (let i = 0; i < minifishes.length; i++) {
    minifishes[i].draw(pgWobble);
  }
  for (let i = 0; i < birds.length; i++) {
    birds[i].draw(pgWobble);
  }
  swimmer.draw(pgWobble);

  // 카메라 뷰로 화면에 출력
  push();
  translate(vt.offsetX, 0);
  
   // 배경 렌더링 (상세 모드일 때는 블러 적용, 수첩 화면일 때는 어두운 오버레이)
   if (showNoteBook) {
     image(pgWobble, 0, 0, vt.drawW, vt.drawH, 0, cameraY, BASE_W, vt.visibleWorldHeight);
     fill(0, 0, 0, 200);
     noStroke();
     rect(0, 0, width, height);
   } else if ((showChatDetail || showDeliveryDetail || showShortformDetail || showShoppingDetail || showNovelDetail) && currentModal) {
    // 성능 최적화: 블러는 모달이 열릴 때만 한 번 적용하고 캐싱
    // 카메라 위치가 크게 변경되거나 모달 상태가 변경되었을 때만 업데이트
    const cameraMoved = abs(pgBlurred._lastCameraY - cameraY) > 5;
    if (!pgBlurred._cached || pgBlurred._cacheInvalidated || modalStateChanged || cameraMoved) {
      pgBlurred.clear();
      pgBlurred.push();
      pgBlurred.translate(vt.offsetX, 0);
      pgBlurred.image(pgWobble, 0, 0, vt.drawW, vt.drawH, 0, cameraY, BASE_W, vt.visibleWorldHeight);
      pgBlurred.pop();
      pgBlurred.filter(BLUR, 6); // 블러 강도 감소 (8 -> 6)
      pgBlurred._cached = true;
      pgBlurred._cacheInvalidated = false;
      pgBlurred._lastCameraY = cameraY;
      modalStateChanged = false; // 상태 변경 플래그 리셋
    }
    image(pgBlurred, 0, 0);
    fill(0, 0, 0, 180);
    noStroke();
    rect(0, 0, width, height);
  } else {
    image(pgWobble, 0, 0, vt.drawW, vt.drawH, 0, cameraY, BASE_W, vt.visibleWorldHeight);
    if (currentModal) {
      fill(0, 0, 0, 150);
      noStroke();
      rect(0, 0, width, height);
    }
    // 모달이 닫히면 블러 캐시 무효화
    if (pgBlurred._cached) {
      pgBlurred._cacheInvalidated = true;
    }
  }
  pop();
  
  // UI 요소 그리기
  // drawHandGlowEffect(); // 함수가 정의되지 않아 주석 처리
  
  // 수첩 화면이 열려있으면 다른 UI는 그리지 않음
  if (!showNoteBook) {
    if (showPrologue) {
      drawPrologueModal();
    }
    
    drawModal();
    drawExplorationLogButton();
    drawNoteGlowEffect();
    drawOceanMoodSelector();
    drawHandDebug(); // 카메라 디버그 화면 표시

    if (showNoteConfirm) {
      drawInteractionModal("디지털 오션에서 나와\n나의 탐사 일지를 확인하시겠습니까?");
    }
  }
  
  if (showNoteBook) {
    drawNoteBook();
  }
  
  if (showChatDetail || showDeliveryDetail || showShortformDetail || showShoppingDetail || showNovelDetail) {
    drawTextSizeControl();
    // 제스처 감지 플래그 자동 리셋 (일정 시간 후)
    if (gestureWaveDetected && millis() - gestureWaveTime > GESTURE_WAVE_DURATION) {
      gestureWaveDetected = false;
    }
    
    // 텍스트 모달이 열려있을 때 손 위치를 기반으로 커스텀 커서 그리기
    if (handControlEnabled && typeof window.virtualMouseX !== 'undefined' && typeof window.virtualMouseY !== 'undefined') {
      push();
      noCursor(); // 기본 커서 숨기기
      // 커스텀 커서 그리기 (반투명)
      const cursorSize = 20;
      fill(255, 255, 255, 120); // 반투명하게 (200 -> 120)
      stroke(0, 208, 255, 150); // 반투명하게 (255 -> 150)
      strokeWeight(2);
      ellipse(window.virtualMouseX, window.virtualMouseY, cursorSize, cursorSize);
      fill(0, 208, 255, 120); // 반투명하게 (255 -> 120)
      noStroke();
      ellipse(window.virtualMouseX, window.virtualMouseY, cursorSize * 0.4, cursorSize * 0.4);
      pop();
    }
  }
  
  // 탐사일지 버튼 호버링이 아닐 때 기본 커서로 복원
  if (!showNoteBook && !showPrologue) {
    const imgSize = 60 * 2.5;
    const btnX = width - imgSize - 50;
    const btnY = height - imgSize - 60;
    const clickPadding = 20;
    const isHovering = mouseX >= btnX - clickPadding && mouseX <= btnX + imgSize + clickPadding &&
                       mouseY >= btnY - clickPadding && mouseY <= btnY + imgSize + clickPadding;
    if (!isHovering) {
      cursor(ARROW);
    }
  }
}

// 디지털 오션 탐사 일지 버튼 그리기
function drawExplorationLogButton() {
  if (!imgNote) return;
  
  push();
  
  const imgSize = 60 * 2.5;
  const btnX = width - imgSize - 50;
  const btnY = height - imgSize - 60;
  
  // 호버링 체크 (클릭 범위보다 넓게)
  const clickPadding = 20; // 클릭 범위 확장
  const isHovering = mouseX >= btnX - clickPadding && mouseX <= btnX + imgSize + clickPadding &&
                     mouseY >= btnY - clickPadding && mouseY <= btnY + imgSize + clickPadding;
  
  // 호버링 시 포인터 커서로 변경
  if (isHovering && !showNoteBook && !showPrologue) {
    cursor('pointer');
  }
  
  image(imgNote, btnX, btnY, imgSize, imgSize);
  noteBtnCenterX = btnX + imgSize / 2;
  noteBtnCenterY = btnY + imgSize / 2;
  
  pop();
}

// 빛 이동 효과 트리거
function triggerNoteGlow(startX, startY) {
  // 수첩에 내용이 추가되었음을 표시 (한 번이라도 호출되면 true 유지)
  hasNoteContent = true;

  noteGlow.active = true;
  noteGlow.startX = startX;
  noteGlow.startY = startY;
  noteGlow.progress = 0;
  
  // shine 효과음 재생
  playShineSound();
}

// shine 효과음 재생 함수
function playShineSound() {
  if (!shineSoundAudio) {
    return;
  }
  
  try {
    // 현재 재생 중이면 중지하고 처음부터 다시 시작
    shineSoundAudio.pause();
    shineSoundAudio.currentTime = 0;
    
    // 재생 시작
    const playPromise = shineSoundAudio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('Error playing shine sound:', error);
      });
    }
  } catch (e) {
    console.error('Error playing shine sound:', e);
  }
}

// 노트로 이동하는 빛 + 노트 후광 그리기
function drawNoteGlowEffect() {
  push();
  noStroke();

  // 이동하는 빛
  if (noteGlow.active && noteBtnCenterX && noteBtnCenterY) {
    const speed = 0.04;
    noteGlow.progress += speed;
    const t = constrain(noteGlow.progress, 0, 1);
    const easeT = t * t * (3 - 2 * t);
    const x = lerp(noteGlow.startX, noteBtnCenterX, easeT);
    const y = lerp(noteGlow.startY, noteBtnCenterY, easeT);

    blendMode(ADD);
    const coreSize = 16;
    fill(255, 240, 180, 130);
    ellipse(x, y, coreSize, coreSize);
    fill(255, 255, 255, 170);
    ellipse(x, y, coreSize * 0.5, coreSize * 0.5);

    // 꼬리 효과
    const tailCount = 4;
    for (let i = 1; i <= tailCount; i++) {
      const tt = constrain(easeT - i * 0.06, 0, 1);
      if (tt <= 0) continue;
      const px = lerp(noteGlow.startX, noteBtnCenterX, tt);
      const py = lerp(noteGlow.startY, noteBtnCenterY, tt);
      const alpha = 90 * (1 - i / (tailCount + 1));
      const size = coreSize * (0.7 - i * 0.12);
      fill(255, 235, 170, alpha);
      ellipse(px, py, size, size);
    }

    blendMode(BLEND);

    if (noteGlow.progress >= 1.05) {
      noteGlow.active = false;
      noteHalo.active = true;
      noteHalo.timer = 60;
    }
  }

  // 노트 주위 후광
  if (noteBtnCenterX && noteBtnCenterY) {
    // 1) 방금 노트가 채워졌을 때의 강한 후광 (기존 효과)
    if (noteHalo.active) {
      const t = constrain(noteHalo.timer / 60.0, 0, 1);
      const baseSize = 110;
      const outer = baseSize * (1.0 + (1 - t) * 0.3);
      const inner = baseSize * 0.65;

      blendMode(ADD);
      fill(255, 230, 150, 90 * t);
      ellipse(noteBtnCenterX, noteBtnCenterY, outer, outer);
      fill(255, 255, 255, 70 * t);
      ellipse(noteBtnCenterX, noteBtnCenterY, inner, inner);
      blendMode(BLEND);

      noteHalo.timer--;
      if (noteHalo.timer <= 0) {
        noteHalo.active = false;
      }
    }

    // 2) 수첩에 내용이 한 번이라도 들어간 뒤의 "상시 은은한 후광"
    if (hasNoteContent) {
      const baseSize = 105;
      const pulse = 0.9 + sin(millis() * 0.004) * 0.1; // 아주 느린 숨쉬기 느낌

      blendMode(ADD);
      fill(255, 230, 160, 35);
      ellipse(noteBtnCenterX, noteBtnCenterY, baseSize * 1.3 * pulse, baseSize * 1.3 * pulse);

      fill(255, 255, 255, 22);
      ellipse(noteBtnCenterX, noteBtnCenterY, baseSize * 0.8 * pulse, baseSize * 0.8 * pulse);
      blendMode(BLEND);
    }
  }

  pop();
}

// 해양 분위기(바다 테마) 선택 UI
function drawOceanMoodSelector() {
  push();
  noSmooth();

  textFont(uiFont || 'ThinDungGeunMo');
  textAlign(LEFT, CENTER);

  let activeIndex = currentOceanThemeIndex;
  if (activeIndex < 0 || activeIndex >= OCEAN_THEMES.length) {
    activeIndex = 0;
  }
  const activeTheme = OCEAN_THEMES[activeIndex];

  // 메인 바 (왼쪽 위)
  const barHeight = 40;
  const barMarginX = 18;
  const barMarginY = 20;
  const barY = barMarginY + barHeight / 2;

  const label = activeTheme.name;
  const paddingX = 26;
  const swatchWidth = 22;
  const innerGap = 12;
  const toggleGap = 24;
  
  // 텍스트 너비 계산을 위해 실제 사용할 textSize로 설정
  const baseLabelSize = 13;
  const labelSize = baseLabelSize * 1.18;
  textSize(labelSize);
  const labelWidth = textWidth(label);
  // textWidth가 0이면 최소값 사용 (폰트 로딩 전 대비)
  const safeLabelWidth = labelWidth > 0 ? labelWidth : 100;
  const barWidth = paddingX * 2 + swatchWidth + innerGap + safeLabelWidth + toggleGap;

  const barX = barMarginX;

  // 바 배경
  fill(10, 25, 50, 210);
  stroke(90, 140, 200, 235);
  strokeWeight(1.5);
  rect(barX, barY - barHeight / 2, barWidth, barHeight, 10);

  // 컬러 스와치
  const swatchX = barX + paddingX;
  const swatchY = barY;
  const swatchR = 8;
  noStroke();
  const topC = activeTheme.topColor;
  const midC = activeTheme.midColor;
  const botC = activeTheme.bottomColor;
  const cTop = color(topC[0], topC[1], topC[2], 230);
  const cMid = color(midC[0], midC[1], midC[2], 230);
  const cBot = color(botC[0], botC[1], botC[2], 230);
  for (let j = 0; j < swatchR * 2; j++) {
    const t = j / (swatchR * 2);
    let c;
    if (t < 0.5) {
      c = lerpColor(cTop, cMid, t * 2);
    } else {
      c = lerpColor(cMid, cBot, (t - 0.5) * 2);
    }
    stroke(c);
    line(swatchX - swatchR, swatchY - swatchR + j, swatchX + swatchR, swatchY - swatchR + j);
  }

  // 라벨 텍스트
  const labelX = swatchX + swatchR + innerGap + 4;
  const labelY = barY - 2; // 2픽셀 위로 올림
  push();
  textAlign(LEFT, CENTER);

  blendMode(ADD);
  fill(160, 235, 255, 45);
  textSize(labelSize);
  text(label, labelX, labelY);

  blendMode(BLEND);
  fill(235);
  textSize(labelSize);
  text(label, labelX, labelY);
  pop();

  // 토글 표시
  fill(210);
  textAlign(RIGHT, CENTER);
  text(showOceanThemeOverlay ? "▲" : "▼", barX + barWidth - paddingX + 8, barY - 1); // 2픽셀 위로 올림 (1 -> -1)

  // 오버레이 모달 (여러 테마 선택)
  if (showOceanThemeOverlay) {
    // 어두운 배경
    noStroke();
    fill(0, 0, 0, 190);
    rect(0, 0, width, height);

    // 테마 리스트 높이 계산 (스크롤 없이 모두 표시)
    const chipH = 30;
    const chipGapY = 8;
    const innerPadding = 22;
    const titleHeight = 4 + 28 + 26; // 제목 + 서브텍스트 높이
    const totalListHeight = OCEAN_THEMES.length * (chipH + chipGapY) - chipGapY;
    
    // 패널 높이를 모든 항목이 들어가도록 계산
    const panelW = min(width - 80, 420);
    const panelH = titleHeight + totalListHeight + innerPadding * 2;
    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2;

    // 패널 배경
    fill(12, 30, 58, UI_MODAL_BG_ALPHA);
    stroke(120, 170, 230, 240);
    strokeWeight(2);
    rect(panelX, panelY, panelW, panelH, UI_MODAL_RADIUS);

    // 제목
    let cursorY = panelY + innerPadding + 4;
    textFont(uiFont || 'ThinDungGeunMo');
    textAlign(LEFT, TOP);
    fill(235);
    textSize(16);
    text("해양 분위기 선택", panelX + innerPadding, cursorY);
    cursorY += 28;

    textSize(11);
    fill(200, 215);
    text("마음에 드는 바다 색을 골라보세요.", panelX + innerPadding, cursorY);
    cursorY += 26;

    // 테마 리스트 (세로 스택, 스크롤 없음)
    const chipPaddingX = 14;

    for (let i = 0; i < OCEAN_THEMES.length; i++) {
      const theme = OCEAN_THEMES[i];
      const isActiveTheme = i === activeIndex;

      const chipY = cursorY + i * (chipH + chipGapY);

      const chipX = panelX + innerPadding;
      const chipW = panelW - innerPadding * 2;

      // 칩 배경
      if (isActiveTheme) {
        fill(26, 86, 140, UI_MODAL_BG_ALPHA);
        stroke(160, 220, 255, 255);
        strokeWeight(1.5);
      } else {
        fill(15, 35, 70, UI_MODAL_BG_ALPHA);
        stroke(90, 130, 185, 220);
        strokeWeight(1);
      }
      rect(chipX, chipY, chipW, chipH, UI_MODAL_RADIUS);

      // 컬러 스와치
      const sX = chipX + chipPaddingX;
      const sY = chipY + chipH / 2;
      const sR = 7;
      noStroke();
      const tC = theme.topColor;
      const mC = theme.midColor;
      const bC = theme.bottomColor;
      const scTop = color(tC[0], tC[1], tC[2], 230);
      const scMid = color(mC[0], mC[1], mC[2], 230);
      const scBot = color(bC[0], bC[1], bC[2], 230);
      for (let j = 0; j < sR * 2; j++) {
        const tt = j / (sR * 2);
        let c;
        if (tt < 0.5) {
          c = lerpColor(scTop, scMid, tt * 2);
        } else {
          c = lerpColor(scMid, scBot, (tt - 0.5) * 2);
        }
        stroke(c);
        line(sX - sR, sY - sR + j, sX + sR, sY - sR + j);
      }

      // 테마 이름
      const nameX = sX + sR + 8;
      const nameY = sY - 1;
      push();
      textFont(uiFont || 'ThinDungGeunMo');
      textAlign(LEFT, CENTER);
      const baseNameSize = 12;
      const nameSize = baseNameSize * 1.15;
      const glowAlpha = isActiveTheme ? 65 : 45;
      const textAlpha = isActiveTheme ? 240 : 215;

      blendMode(ADD);
      fill(150, 230, 255, glowAlpha);
      textSize(nameSize);
      text(theme.name, nameX, nameY);

      blendMode(BLEND);
      fill(245, 255, 255, textAlpha);
      textSize(nameSize);
      text(theme.name, nameX, nameY);
      pop();
    }
  }

  pop();
}

// 해양 분위기 선택 UI 클릭 처리
function handleOceanMoodClick() {
  textFont(uiFont || 'ThinDungGeunMo');
  textAlign(LEFT, CENTER);

  const barHeight = 40;
  const barMarginX = 18;
  const barMarginY = 20;
  const barY = barMarginY + barHeight / 2;

  let activeIndex = currentOceanThemeIndex;
  if (activeIndex < 0 || activeIndex >= OCEAN_THEMES.length) {
    activeIndex = 0;
  }
  const activeTheme = OCEAN_THEMES[activeIndex];

  const paddingX = 26;
  const swatchWidth = 22;
  const innerGap = 12;
  const toggleGap = 24;
  const label = activeTheme.name;
  
  // 텍스트 너비 계산을 위해 실제 사용할 textSize로 설정
  const baseLabelSize = 13;
  const labelSize = baseLabelSize * 1.18;
  textSize(labelSize);
  const labelWidth = textWidth(label);
  // textWidth가 0이면 최소값 사용 (폰트 로딩 전 대비)
  const safeLabelWidth = labelWidth > 0 ? labelWidth : 100;
  const barWidth = paddingX * 2 + swatchWidth + innerGap + safeLabelWidth + toggleGap;
  const barX = barMarginX;

  // 오버레이가 열려 있을 때: 중앙 패널 클릭 처리
  if (showOceanThemeOverlay) {
    // 테마 리스트 높이 계산 (스크롤 없이 모두 표시)
    const chipH = 30;
    const chipGapY = 8;
    const innerPadding = 22;
    const titleHeight = 4 + 28 + 26; // 제목 + 서브텍스트 높이
    const totalListHeight = OCEAN_THEMES.length * (chipH + chipGapY) - chipGapY;
    
    // 패널 높이를 모든 항목이 들어가도록 계산
    const panelW = min(width - 80, 420);
    const panelH = titleHeight + totalListHeight + innerPadding * 2;
    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2;

    if (mouseX < panelX || mouseX > panelX + panelW ||
        mouseY < panelY || mouseY > panelY + panelH) {
      showOceanThemeOverlay = false;
      oceanThemeScrollOffset = 0; // 스크롤 초기화
      return true;
    }

    let cursorY = panelY + innerPadding + 4;
    cursorY += 28; // 제목
    cursorY += 26; // 서브텍스트

    const chipX = panelX + innerPadding;
    const chipW = panelW - innerPadding * 2;

    for (let i = 0; i < OCEAN_THEMES.length; i++) {
      const chipY = cursorY + i * (chipH + chipGapY);

      if (mouseX >= chipX && mouseX <= chipX + chipW &&
          mouseY >= chipY && mouseY <= chipY + chipH) {
        const theme = OCEAN_THEMES[i];
        
        // 배경 변경 횟수 카운트 (다른 테마로 변경할 때만)
        if (currentOceanThemeIndex !== i) {
          oceanThemeChangeCount++;
        }
        
        weatherColors.topColor = theme.topColor;
        weatherColors.midColor = theme.midColor;
        weatherColors.bottomColor = theme.bottomColor;
        currentOceanThemeIndex = i;
        showOceanThemeOverlay = false;
        oceanThemeScrollOffset = 0; // 스크롤 초기화

        if (oceanBackground && pgBase) {
          oceanBackground.paintStaticScene(pgBase);
        }
        return true;
      }
    }

    return true;
  }

  // 오버레이가 닫혀 있을 때: 메인 바 클릭 시 오버레이 열기
  const barTop = barY - barHeight / 2;
  const barBottom = barY + barHeight / 2;
  if (mouseX >= barX && mouseX <= barX + barWidth &&
      mouseY >= barTop && mouseY <= barBottom) {
    showOceanThemeOverlay = true;
    oceanThemeScrollOffset = 0; // 스크롤 초기화
    return true;
  }

  return false;
}

// 텍스트 크기 조절 UI
function drawTextSizeControl() {
  push();
  noSmooth();
  
  const controlX = width / 2;
  // 닫기 버튼 바로 위에 위치 (닫기 버튼 높이 35, 간격 20)
  const controlY = closeHintY - 35 - 20;
  const sliderW = 300;
  const sliderH = 8;
  const thumbSize = 24;
  
  // 네모박스 제거 - 패널 배경 없이 슬라이더만 표시
  
  const sliderX = controlX - sliderW / 2;
  const sliderY = controlY;
  
  // 슬라이더 트랙
  fill(40, 60, 90, 200);
  stroke(70, 110, 150, 200);
  strokeWeight(1);
  rect(sliderX, sliderY - sliderH / 2, sliderW, sliderH, 4);
  
  const normalizedValue = (textDetailSizeScale - TEXT_SIZE_MIN) / (TEXT_SIZE_MAX - TEXT_SIZE_MIN);
  const thumbX = sliderX + normalizedValue * sliderW;
  
  // 슬라이더 썸 (텍스트 모달이 열려있으면 손 위치 사용)
  const isTextDetailOpen = showChatDetail || showDeliveryDetail || showShortformDetail || showShoppingDetail || showNovelDetail;
  const currentMouseX = isTextDetailOpen && handControlEnabled && typeof window.virtualMouseX !== 'undefined' ? window.virtualMouseX : mouseX;
  const currentMouseY = isTextDetailOpen && handControlEnabled && typeof window.virtualMouseY !== 'undefined' ? window.virtualMouseY : mouseY;
  const isThumbHover = dist(currentMouseX, currentMouseY, thumbX, sliderY) < thumbSize / 2 + 5;
  fill(isThumbHover ? color(120, 180, 240, 255) : color(100, 160, 220, 255));
  stroke(150, 200, 255, 255);
  strokeWeight(2);
  ellipse(thumbX, sliderY, thumbSize, thumbSize);
  
  // 크기 퍼센트 표시 (바 위에 표시)
  fill(200, 220, 255);
  textSize(11);
  textAlign(CENTER, CENTER);
  text(`${int(textDetailSizeScale * 100)}%`, controlX, sliderY - 25);
  
  pop();
}

// 손 인식 디버그 화면 그리기
function drawHandDebug() {
  // 카메라는 계속 사용하지만 화면에는 노출하지 않고,
  // 오른쪽 위에 원형 조정판 + 손 위치를 빛으로만 표현한다.
  if (!handControlEnabled) return;

  push();
  noStroke();

  // --- 중앙 상단 카메라 미리보기 (투명도 0%로 숨김, 하지만 그 자리에 유지) ---
  if (video && video.width && video.height) {
    const camWidth = 260;
    const camHeight = 180;
    const camX = (width - camWidth) / 2;
    const camY = 10;

    // 테두리 패널 (투명도 0%)
    fill(5, 15, 35, 0);
    stroke(120, 170, 230, 0);
    strokeWeight(2);
    rect(camX - 6, camY - 6, camWidth + 12, camHeight + 12, 10);

    // 좌우 반전된 이미지(거울처럼 보이도록) + 손 스켈레톤 (투명도 0%)
    push();
    translate(camX + camWidth, camY);
    scale(-1, 1);
    tint(255, 255, 255, 0); // 이미지 투명도 0%
    image(video, 0, 0, camWidth, camHeight);
    noTint();

    if (currentHandData && currentHandData.keypoints) {
      const scaleX = camWidth / video.width;
      const scaleY = camHeight / video.height;

      // 관절 점들 (좌우 반전: scale(-1,1) 변환을 고려하여 X 좌표 반전) - 투명도 0%
      noStroke();
      for (let i = 0; i < currentHandData.keypoints.length; i++) {
        const kp = currentHandData.keypoints[i];
        // scale(-1,1) 변환이 있으므로 X 좌표를 반전
        const x = camWidth - (kp.x * scaleX);
        const y = kp.y * scaleY;

        if (i === 0) {
          fill(255, 60, 60, 0); // 손목(또는 기준점) - 투명도 0%
          stroke(255, 0);
          strokeWeight(2);
          circle(x, y, 8);
        } else {
          fill(80, 190, 255, 0);
          stroke(255, 0);
          strokeWeight(1);
          circle(x, y, 5);
        }
      }

      // 뼈대 선 연결 (좌우 반전 적용) - 투명도 0%
      stroke(0, 255, 140, 0);
      strokeWeight(1);
      noFill();
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [0, 9], [9, 10], [10, 11], [11, 12],
        [0, 13], [13, 14], [14, 15], [15, 16],
        [0, 17], [17, 18], [18, 19], [19, 20]
      ];
      for (let i = 0; i < connections.length; i++) {
        const [start, end] = connections[i];
        const kpS = currentHandData.keypoints[start];
        const kpE = currentHandData.keypoints[end];
        if (!kpS || !kpE) continue;
        // scale(-1,1) 변환을 고려하여 X 좌표 반전
        const x1 = camWidth - (kpS.x * scaleX);
        const y1 = kpS.y * scaleY;
        const x2 = camWidth - (kpE.x * scaleX);
        const y2 = kpE.y * scaleY;
        line(x1, y1, x2, y2);
      }
    }

    pop();
  }

  // 조정판 위치/크기
  const padRadius = 70;
  const padX = width - padRadius - 30;
  const padY = padRadius + 30;

  // 배경 원형 패널
  fill(5, 15, 35, 220);
  stroke(90, 140, 220, 230);
  strokeWeight(2);
  circle(padX, padY, padRadius * 2);

  // 안쪽 그리드/가이드
  noFill();
  stroke(60, 110, 180, 180);
  strokeWeight(1);
  circle(padX, padY, padRadius * 1.4);
  circle(padX, padY, padRadius * 0.7);
  line(padX - padRadius * 0.9, padY, padX + padRadius * 0.9, padY);
  line(padX, padY - padRadius * 0.9, padX, padY + padRadius * 0.9);

  // 손 위치를 0~1 범위에서 원 안의 좌표로 매핑
  const hasHand = millis() - lastHandTime < 500;
  let hx = padX;
  let hy = padY;
  if (hasHand) {
    // 스무딩/데드존이 적용된 조이스틱 벡터(joyX, joyY)를 시각적으로 조금 더 증폭
    // → 실제 이동 로직에는 원래 joyX/joyY를 사용하고,
    //    조이스틱 UI에서만 1.4배 정도 과장해서 보여줌
    let nx = joyX * 1.4;
    let ny = joyY * 1.4;

    const len = sqrt(nx * nx + ny * ny);
    if (len > 1) {
      nx /= len;
      ny /= len;
    }

    const r = padRadius * 0.7;
    hx = padX + nx * r;
    hy = padY + ny * r;
  }

  // 손 위치를 따라다니는 빛 효과 (손이 인식될 때만 표시)
  if (hasHand) {
    const glowSize = 26;
    const pulse = sin(millis() * 0.006) * 0.15 + 1;

    // 외곽 부드러운 빛
    noStroke();
    blendMode(ADD);
    fill(120, 210, 255, 130);
    circle(hx, hy, glowSize * 1.9 * pulse);

    // 내부 코어
    fill(235, 250, 255, 220);
    circle(hx, hy, glowSize * 0.9 * pulse);
  }

  // 손이 없을 때 안내 텍스트
  blendMode(BLEND);
  if (!hasHand) {
    fill(200, 220, 255, 180);
    textAlign(CENTER, CENTER);
    textFont(uiFont || 'ThinDungGeunMo');
    textSize(11);
    // 안내 문구를 기존보다 5px 아래로 이동
    text("손을 카메라 앞에서\n천천히 움직여보세요", padX, padY + padRadius + 23);
  } else {
    fill(180, 220, 255, 180);
    textAlign(CENTER, CENTER);
    textFont(uiFont || 'ThinDungGeunMo');
    textSize(10);
    text("손 위치", padX, padY + padRadius + 16);
  }

  // 디버그: 조이스틱 값 표시 (중앙 정렬)
  if (hasHand) {
    fill(255, 200, 100);
    textFont(uiFont || 'ThinDungGeunMo');
    textSize(10);
    textAlign(CENTER, CENTER);
    text(`hand: ${handCenterX.toFixed(2)}, ${handCenterY.toFixed(2)}`, padX, padY + padRadius + 35);
    text(`joy:  ${joyX.toFixed(2)}, ${joyY.toFixed(2)}`, padX, padY + padRadius + 50);
    text(`center: ${joyCenterX.toFixed(2)}, ${joyCenterY.toFixed(2)}`, padX, padY + padRadius + 65);
  }

  pop();
}

// 프롤로그 모달 그리기 (1, 2번은 기존 스타일, 3번만 확대)
function drawPrologueModal() {
  if (!showPrologue || prologueStep >= PROLOGUE_MESSAGES.length) return;
  
  push();
  noSmooth();
  
  fill(0, 0, 0, 200);
  noStroke();
  rect(0, 0, width, height);
  
  // 3번 모달(prologueStep === 2)만 확대된 스타일, 1, 2번은 텍스트가 한 줄에 들어가도록 확대
  const isThirdModal = prologueStep === 2;
  const modalW = isThirdModal ? 420 : 420; // 1, 2번도 텍스트가 한 줄에 들어가도록 확대 (300 -> 420)
  const modalH = isThirdModal ? 180 : 160; // 3번만 확대
  const modalX = (width - modalW) / 2;
  const modalY = (height - modalH) / 2;
  const paddingTop = isThirdModal ? 45 : 35; // 3번만 증가
  const paddingBottom = isThirdModal ? 50 : 40; // 3번만 증가
  const paddingLeft = 40; // 모든 모달에 좌우 패딩 40픽셀 (3번 모달과 동일)
  const paddingRight = 40;
  
  fill(20, 40, 60, UI_MODAL_BG_ALPHA);
  stroke(100, 150, 200);
  strokeWeight(2);
  rect(modalX, modalY, modalW, modalH, UI_MODAL_RADIUS);
  
  // 텍스트 표시 (줄바꿈 처리)
  fill(200, 220, 255);
  textSize(16);
  textAlign(CENTER, TOP);
  textFont(titleFont || uiFont || 'ThinDungGeunMo');
  
  const message = PROLOGUE_MESSAGES[prologueStep];
  const textAreaW = modalW - paddingLeft - paddingRight;
  const textCenterX = modalX + modalW / 2;
  
  // 줄바꿈 문자(\n)로 분리하여 여러 줄로 표시
  const lines = message.split('\n');
  const lineHeight = 24; // 줄 간격
  // 3번 모달은 텍스트를 10픽셀 위로 올림, 1, 2번 모달은 10픽셀 아래로 내림
  const startY = isThirdModal ? (modalY + paddingTop - 10) : (modalY + paddingTop + 10);
  
  // 모든 줄을 먼저 자동 줄바꿈 처리
  let allWrappedLines = [];
  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    const wrappedLines = splitKoreanTextIntoLines(lineText, textAreaW, 16);
    allWrappedLines = allWrappedLines.concat(wrappedLines);
  }
  
  // 처리된 모든 줄을 표시
  for (let i = 0; i < allWrappedLines.length; i++) {
    text(allWrappedLines[i], textCenterX, startY + i * lineHeight);
  }
  
  // 버튼 (3번 모달만 버튼을 20픽셀 아래로 내림)
  const btnW = 110;
  const btnH = 30;
  // 3번 모달만 버튼을 20픽셀 아래로 내림 (-20 -> -10)
  const btnY = isThirdModal ? (modalY + modalH - paddingBottom - 10) : (modalY + modalH - paddingBottom - 20);
  const btnX = modalX + modalW / 2 - btnW / 2;
  
  fill(0, 208, 255, UI_MODAL_BG_ALPHA);
  stroke(0, 208, 255);
  rect(btnX, btnY, btnW, btnH, UI_MODAL_RADIUS);
  
  fill(255);
  textSize(12);
  textAlign(CENTER, CENTER);
  text("다음", btnX + btnW / 2, btnY + btnH / 2);
  
  pop();
}

// 한국어 텍스트를 여러 줄로 나누는 함수
function splitKoreanTextIntoLines(text, maxWidth, fontSize) {
  if (!text || text.length === 0) return [];
  
  const lines = [];
  let currentLine = '';
  
  textSize(fontSize);
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // 줄바꿈 문자 처리
    if (char === '\n') {
      if (currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = '';
      } else {
        lines.push(''); // 빈 줄
      }
      continue;
    }
    
    const testLine = currentLine + char;
    const testWidth = textWidth(testLine);
    
    // 줄바꿈이 필요한 경우
    if (testWidth > maxWidth && currentLine.length > 0) {
      // 공백이나 구두점에서 줄바꿈하는 것이 더 자연스러움
      let breakPoint = currentLine.length;
      
      // 뒤에서부터 공백이나 구두점 찾기 (최대 20자까지)
      for (let j = currentLine.length - 1; j >= Math.max(0, currentLine.length - 20); j--) {
        const c = currentLine[j];
        if (c === ' ' || c === ',' || c === '.' || c === '?' || c === '!') {
          breakPoint = j + 1;
          break;
        }
      }
      
      // 줄바꿈 지점이 너무 앞이면 현재 위치에서 줄바꿈
      if (breakPoint < currentLine.length * 0.7) {
        breakPoint = currentLine.length;
      }
      
      lines.push(currentLine.substring(0, breakPoint));
      currentLine = currentLine.substring(breakPoint) + char;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  return lines.length > 0 ? lines : [text];
}

// 모달 그리기
function drawModal() {
  if (!currentModal && !showChatDetail && !showDeliveryDetail && !showShortformDetail && !showShoppingDetail && !showNovelDetail) return;

  push();
  noSmooth();

  // 텍스트 상세 모드 렌더링 (매 프레임 렌더링 - 깜빡임 방지)
  if (showChatDetail && currentModal && currentModal.type === 'jellyfish') {
    const btnPos = currentModal.jellyfish.drawTextDetail();
    closeHintX = btnPos.x;
    closeHintY = btnPos.y;
  } else if (showDeliveryDetail && currentModal && currentModal.type === 'seahorse') {
    const btnPos = currentModal.seahorse.drawTextDetail();
    closeHintX = btnPos.x;
    closeHintY = btnPos.y;
  } else if (showShortformDetail && currentModal && currentModal.type === 'whale') {
    const btnPos = currentModal.whale.drawTextDetail();
    closeHintX = btnPos.x;
    closeHintY = btnPos.y;
  } else if (showShoppingDetail && currentModal && currentModal.type === 'fish') {
    const btnPos = currentModal.fish.drawTextDetail();
    closeHintX = btnPos.x;
    closeHintY = btnPos.y;
  } else if (showNovelDetail && currentModal && currentModal.type === 'minifish') {
    const btnPos = currentModal.minifish.drawTextDetail();
    closeHintX = btnPos.x;
    closeHintY = btnPos.y;
  } else if (currentModal) {
    // 상호작용 모달 렌더링 (매 프레임 렌더링 - 깜빡임 방지)
    if (currentModal.type === 'jellyfish') {
      drawInteractionModal("채팅 해파리인거 같아요.\n자세히 보시겠습니까?");
    } else if (currentModal.type === 'seahorse') {
      drawInteractionModal("배달 해마인거 같아요.\n자세히 보시겠습니까?");
    } else if (currentModal.type === 'whale') {
      drawInteractionModal("숏폼 고래인거 같아요.\n자세히 보시겠습니까?");
    } else if (currentModal.type === 'fish') {
      drawInteractionModal("쇼핑 물고기인거 같아요.\n자세히 보시겠습니까?");
    } else if (currentModal.type === 'minifish') {
      drawInteractionModal("웹소설 미니 물고기인거 같아요.\n자세히 보시겠습니까?");
    }
  }

  pop();
}

// 해파리 형상의 픽셀 위치를 저장하는 함수
function getJellyfishPixels(cx, cy, radius, tentacleCount, tentacleLength) {
  let pixels = [];
  
  // 돔 부분 (더 빽빽하게 하기 위해 더 많은 픽셀 생성)
  // radius를 2배로 늘려서 더 작은 간격으로 픽셀 생성
  const denseRadius = radius * 2;
  for (let ry = -denseRadius; ry <= 0; ry++) {
    for (let rx = -denseRadius; rx <= denseRadius; rx++) {
      const nx = rx / denseRadius;
      const ny = ry / denseRadius;
      const r = sqrt(nx * nx + ny * ny);
      if (r <= 1.0) {
        // 원래 좌표로 변환 (더 작은 간격, 정수로 변환)
        const origX = int(cx + rx / 2);
        const origY = int(cy + ry / 2);
        // r 값도 원래 스케일로 조정
        const origR = r;
        pixels.push({x: origX, y: origY, type: 'dome', r: origR});
      }
    }
  }
  
  // 프린지 (더 빽빽하게 - 모든 픽셀에 추가)
  for (let rx = -radius + 1; rx <= radius - 1; rx++) {
    pixels.push({x: cx + rx, y: cy + 1, type: 'fringe'});
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

// 왼쪽 화살표 그리기 (이전 버튼용)
function drawLeftArrow(x, y, size) {
  push();
  translate(x, y);
  // 화살표 몸통 (가로선)
  const lineLength = size * 0.8;
  stroke(54, 69, 79);
  strokeWeight(2.5);
  line(-lineLength / 2, 0, lineLength / 2, 0);
  // 화살표 머리 (왼쪽 삼각형)
  noStroke();
  triangle(
    -lineLength / 2, 0,
    -lineLength / 2 - size * 0.4, -size * 0.3,
    -lineLength / 2 - size * 0.4, size * 0.3
  );
  pop();
}

// 오른쪽 화살표 그리기 (다음 버튼용)
function drawRightArrow(x, y, size) {
  push();
  translate(x, y);
  // 화살표 몸통 (가로선)
  const lineLength = size * 0.8;
  stroke(54, 69, 79);
  strokeWeight(2.5);
  line(-lineLength / 2, 0, lineLength / 2, 0);
  // 화살표 머리 (오른쪽 삼각형)
  noStroke();
  triangle(
    lineLength / 2, 0,
    lineLength / 2 + size * 0.4, -size * 0.3,
    lineLength / 2 + size * 0.4, size * 0.3
  );
  pop();
}

// 수첩 화면 그리기
function drawNoteBook() {
  push();
  noSmooth();
  
  // 어두운 배경 오버레이
  fill(0, 0, 0, 220);
  noStroke();
  rect(0, 0, width, height);
  
  // 수첩 패널 크기 및 위치
  const notebookW = min(width - 60, 500);
  const notebookH = min(height - 80, 600);
  const notebookX = (width - notebookW) / 2;
  const notebookY = (height - notebookH) / 2;
  
  // 수첩 배경 (노트북 느낌) - 속지 색상으로 통일
  fill(220, 210, 180, 255); // 속지와 동일한 크라프트지 색상
  stroke(180, 170, 150, 255);
  strokeWeight(3);
  rect(notebookX, notebookY, notebookW, notebookH, 8);
  
  // 왼쪽 나선 바인더 (리셋 버튼과 같은 색)
  const binderW = 25;
  fill(0, 208, 255, 240); // 리셋 버튼과 같은 색
  stroke(0, 208, 255, 255); // 리셋 버튼과 같은 색
  strokeWeight(2);
  rect(notebookX, notebookY, binderW, notebookH, 8, 0, 0, 8);
  
  // 나선 구멍들
  const holeCount = 8;
  const holeSpacing = notebookH / (holeCount + 1);
  noStroke();
  fill(0, 200, 245, 240); // 약간 더 어두운 청록색
  for (let i = 1; i <= holeCount; i++) {
    const holeY = notebookY + holeSpacing * i;
    circle(notebookX + binderW / 2, holeY, 6);
  }
  
  // 페이지 내용 영역
  const contentX = notebookX + binderW + 20;
  const contentY = notebookY + 50; // 위쪽 여백 증가 (30 -> 50)
  const contentW = notebookW - binderW - 40;
  const contentH = notebookH - 120; // 높이도 조정하여 전체적으로 균형 맞춤 (100 -> 120)
  
  // 페이지 배경 (더 어두운 크라프트지 느낌의 구릿빛)
  fill(220, 210, 180, 255); // 더 어두운 크라프트지 색상
  noStroke(); // 바깥 스트로크 제거
  rect(contentX, contentY, contentW, contentH, 4);
  
  // 페이지 내용
  textFont(uiFont || 'ThinDungGeunMo');
  textAlign(LEFT, BASELINE); // 베이스라인 정렬로 변경하여 줄에 맞춤
  fill(30, 30, 30, 255);
  textSize(16);
  
  const pageTitleY = contentY + 30; // 제목 위치 여유 증가 (20 -> 30)
  const pageContentY = contentY + 70; // 본문 시작 위치도 조정 (50 -> 70)
  const lineHeight = 24; // 줄 간격선과 맞추기 위해 24로 변경
  const textOffset = -5; // 텍스트를 2픽셀 위로 올리기 위한 오프셋
  
  // 줄 간격선 (노트북 느낌) - 텍스트 시작 위치에 맞춤
  stroke(190, 180, 160, 150); // 더 어두운 크라프트지에 맞게 색상 조정
  strokeWeight(1);
  const lineSpacing = lineHeight; // 텍스트 줄 간격과 동일하게
  // 첫 번째 줄은 pageContentY 위치에 맞춤
  for (let y = pageContentY; y < contentY + contentH - 20; y += lineSpacing) {
    line(contentX + 15, y, contentX + contentW - 15, y);
  }
  
  if (noteBookPage === 0) {
    // 1페이지: 탐사 일지 소개
    fill(50, 80, 120, 255);
    textSize(20);
    textFont(titleFont || uiFont || 'ThinDungGeunMo');
    text("나의 탐사 일지", contentX + 20, pageTitleY);
    
    fill(30, 30, 30, 255);
    textSize(14);
    let y = pageContentY + textOffset + lineHeight;
    text("디지털 오션에서 만난", contentX + 20, y);
    y += lineHeight;
    text("다양한 생명체들을 기록했습니다.", contentX + 20, y);
    y += lineHeight * 2;
    
    // 스티커 크기 설정
    const stickerSize = 24; // 1페이지용 스티커 크기 (2페이지보다 작게)
    const stickerX = contentX + 20; // 스티커는 제일 왼쪽에
    const textOffsetX = stickerSize + 10; // 텍스트는 스티커 오른쪽에
    
    // 각 항목별로 스티커 표시 (무조건 1개씩)
    const lineY = y;
    
    // 채팅 해파리
    const jellyfishLabel = "채팅 해파리: 채팅 기록";
    const stickerY = lineY - stickerSize / 2 - 5;
    
    push();
    tint(255, 255, 255, 77); // 투명도 0.3
    
    // 해파리 픽셀 실루엣 그리기
    const virtRadius = 8;
    const virtTentacles = 8;
    const virtTentacleLen = 12;
    const jellyfishPixels = getJellyfishPixels(0, 0, virtRadius, virtTentacles, virtTentacleLen);
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of jellyfishPixels) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const shapeWidth = maxX - minX + 1;
    const shapeHeight = maxY - minY + 1;
    const scale = min(stickerSize / shapeWidth, stickerSize / shapeHeight) * 0.8;
    
    push();
    translate(stickerX + stickerSize / 2, stickerY + stickerSize / 2);
    noStroke();
    fill(150, 200, 255, 77); // 해파리 색상
    for (const p of jellyfishPixels) {
      const px = (p.x - (minX + maxX) / 2) * scale;
      const py = (p.y - (minY + maxY) / 2) * scale;
      rect(px, py, 2, 2);
    }
    pop();
    
    noTint();
    pop();
    text(jellyfishLabel, contentX + 20 + textOffsetX, lineY);
    y += lineHeight;
    
    // 배달 해마
    const seahorseLabel = "배달 해마: 배달 기록";
    const seahorseStickerY = y - stickerSize / 2 - 5;
    
    if (imgSeahorse && imgSeahorse.width > 0) {
      push();
      tint(255, 255, 255, 77);
      const imgAspect = imgSeahorse.height / imgSeahorse.width;
      const imgW = stickerSize;
      const imgH = stickerSize * imgAspect;
      image(imgSeahorse, stickerX, seahorseStickerY + (stickerSize - imgH) / 2, imgW, imgH);
      noTint();
      pop();
    }
    text(seahorseLabel, contentX + 20 + textOffsetX, y);
    y += lineHeight;
    
    // 숏폼 고래
    const whaleLabel = "숏폼 고래: 숏폼 기록";
    const whaleStickerY = y - stickerSize / 2 - 5;
    
    if (imgWhale && imgWhale.width > 0) {
      push();
      tint(255, 255, 255, 77);
      const imgAspect = imgWhale.height / imgWhale.width;
      const imgW = stickerSize;
      const imgH = stickerSize * imgAspect;
      image(imgWhale, stickerX, whaleStickerY + (stickerSize - imgH) / 2, imgW, imgH);
      noTint();
      pop();
    }
    text(whaleLabel, contentX + 20 + textOffsetX, y);
    y += lineHeight;
    
    // 쇼핑 물고기
    const fishLabel = "쇼핑 물고기: 쇼핑 기록";
    const fishStickerY = y - stickerSize / 2 - 5;
    
    if (imgFish && imgFish.width > 0) {
      push();
      tint(255, 255, 255, 77);
      const imgAspect = imgFish.height / imgFish.width;
      const imgW = stickerSize;
      const imgH = stickerSize * imgAspect;
      image(imgFish, stickerX, fishStickerY + (stickerSize - imgH) / 2, imgW, imgH);
      noTint();
      pop();
    }
    text(fishLabel, contentX + 20 + textOffsetX, y);
    y += lineHeight;
    
    // 웹소설 미니 물고기
    const minifishLabel = "웹소설 미니 물고기: 웹소설 기록";
    const minifishStickerY = y - stickerSize / 2 - 3;
    
    if (imgMiniFish && imgMiniFish.width > 0) {
      push();
      tint(255, 255, 255, 77);
      const imgAspect = imgMiniFish.height / imgMiniFish.width;
      const imgW = stickerSize;
      const imgH = stickerSize * imgAspect;
      image(imgMiniFish, stickerX, minifishStickerY + (stickerSize - imgH) / 2, imgW, imgH);
      noTint();
      pop();
    }
    text(minifishLabel, contentX + 20 + textOffsetX, y);
    y += lineHeight * 2;
    text("이 일지를 통해 당신의", contentX + 20, y);
    y += lineHeight;
    text("디지털 여정을 되돌아보세요.", contentX + 20, y);
  } else if (noteBookPage === 1) {
    // 2페이지: 탐사 통계
    fill(50, 80, 120, 255);
    textSize(20);
    textFont(titleFont || uiFont || 'ThinDungGeunMo');
    text("탐사 통계", contentX + 20, pageTitleY);
    
    fill(30, 30, 30, 255);
    textSize(14);
    let y = pageContentY + textOffset + lineHeight;
    const creatureLabel = "만난 생명체 수:";
    text(creatureLabel, contentX + 20, y);
    
    // 실제로 만난 생명체 수 계산
    let metCount = 0;
    for (let i = 0; i < jellyfishes.length; i++) {
      if (jellyfishes[i].dismissed) metCount++;
    }
    for (let i = 0; i < seahorses.length; i++) {
      if (seahorses[i].dismissed) metCount++;
    }
    for (let i = 0; i < whales.length; i++) {
      if (whales[i].dismissed) metCount++;
    }
    for (let i = 0; i < fishes.length; i++) {
      if (fishes[i].dismissed) metCount++;
    }
    for (let i = 0; i < minifishes.length; i++) {
      if (minifishes[i].dismissed) metCount++;
    }
    
    y += lineHeight;
    text(`총 ${metCount}마리`, contentX + 40, y);
    
    // 만난 생명체 수 텍스트 오른편에 스탬프 배치 (5개씩 4줄)
    const stickerSize = 30; // 스탬프 크기
    const stickersPerRow = 5; // 한 줄에 5개
    const maxRows = 4; // 최대 4줄
    const maxTotalStickers = stickersPerRow * maxRows; // 총 최대 20개
    
    // 모든 dismissed 생물 수집
    const allStickers = [];
    
    // 해파리
    const dismissedJellyfishes = jellyfishes.filter(j => j.dismissed);
    for (let i = 0; i < dismissedJellyfishes.length; i++) {
      allStickers.push({ type: 'jellyfish' });
    }
    
    // 해마
    const dismissedSeahorses = seahorses.filter(s => s.dismissed);
    for (let i = 0; i < dismissedSeahorses.length; i++) {
      allStickers.push({ type: 'seahorse' });
    }
    
    // 고래
    const dismissedWhales = whales.filter(w => w.dismissed);
    for (let i = 0; i < dismissedWhales.length; i++) {
      allStickers.push({ type: 'whale' });
    }
    
    // 물고기
    const dismissedFishes = fishes.filter(f => f.dismissed);
    for (let i = 0; i < dismissedFishes.length; i++) {
      allStickers.push({ type: 'fish' });
    }
    
    // 미니 물고기
    const dismissedMiniFishes = minifishes.filter(m => m.dismissed);
    for (let i = 0; i < dismissedMiniFishes.length; i++) {
      allStickers.push({ type: 'minifish' });
    }
    
    // 최대 20개로 제한
    const stickersToShow = allStickers.slice(0, maxTotalStickers);
    
    // "만난 생명체 수:" 텍스트 오른편에 배치
    const labelWidth = textWidth(creatureLabel);
    const stickerStartX = contentX + 20 + labelWidth + 75; // 텍스트 오른쪽에 75픽셀 간격 (30픽셀 추가)
    const stickerStartY = pageContentY + textOffset + lineHeight - stickerSize / 2; // 텍스트와 수직 정렬
    const stickerSpacing = 8; // 스탬프 간격
    const rowSpacing = stickerSize + 5; // 줄 간격
    
    push();
    tint(255, 255, 255, 77); // 투명도 0.3 (255 * 0.3 ≈ 77)
    
    // 스탬프 그리기 (5개씩 4줄)
    for (let i = 0; i < stickersToShow.length; i++) {
      const sticker = stickersToShow[i];
      const rowIndex = Math.floor(i / stickersPerRow); // 0~3 (4줄)
      const colIndex = i % stickersPerRow; // 0~4 (5개)
      
      const stickerX = stickerStartX + colIndex * (stickerSize + stickerSpacing);
      const stickerY = stickerStartY + rowIndex * rowSpacing;
      
      if (sticker.type === 'jellyfish') {
        // 해파리 픽셀 실루엣 그리기
        const virtRadius = 8;
        const virtTentacles = 8;
        const virtTentacleLen = 12;
        const jellyfishPixels = getJellyfishPixels(0, 0, virtRadius, virtTentacles, virtTentacleLen);
        
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of jellyfishPixels) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
        const shapeWidth = maxX - minX + 1;
        const shapeHeight = maxY - minY + 1;
        const scale = min(stickerSize / shapeWidth, stickerSize / shapeHeight) * 0.8;
        
        push();
        translate(stickerX + stickerSize / 2, stickerY + stickerSize / 2);
        noStroke();
        fill(150, 200, 255, 77); // 해파리 색상
        for (const p of jellyfishPixels) {
          const px = (p.x - (minX + maxX) / 2) * scale;
          const py = (p.y - (minY + maxY) / 2) * scale;
          rect(px, py, 2, 2);
        }
        pop();
      } else if (sticker.type === 'seahorse') {
        if (imgSeahorse && imgSeahorse.width > 0) {
          const imgAspect = imgSeahorse.height / imgSeahorse.width;
          const imgW = stickerSize;
          const imgH = stickerSize * imgAspect;
          image(imgSeahorse, stickerX, stickerY + (stickerSize - imgH) / 2, imgW, imgH);
        }
      } else if (sticker.type === 'whale') {
        if (imgWhale && imgWhale.width > 0) {
          const imgAspect = imgWhale.height / imgWhale.width;
          const imgW = stickerSize;
          const imgH = stickerSize * imgAspect;
          image(imgWhale, stickerX, stickerY + (stickerSize - imgH) / 2, imgW, imgH);
        }
      } else if (sticker.type === 'fish') {
        if (imgFish && imgFish.width > 0) {
          const imgAspect = imgFish.height / imgFish.width;
          const imgW = stickerSize;
          const imgH = stickerSize * imgAspect;
          image(imgFish, stickerX, stickerY + (stickerSize - imgH) / 2, imgW, imgH);
        }
      } else if (sticker.type === 'minifish') {
        if (imgMiniFish && imgMiniFish.width > 0) {
          const imgAspect = imgMiniFish.height / imgMiniFish.width;
          const imgW = stickerSize;
          const imgH = stickerSize * imgAspect;
          image(imgMiniFish, stickerX, stickerY + (stickerSize - imgH) / 2, imgW, imgH);
        }
      }
    }
    
    noTint();
    pop();
    
    y += lineHeight * 2;
    text("수집한 기록:", contentX + 20, y);
    y += lineHeight;
    // 성능 최적화: 이미 계산된 dismissed 배열의 길이 재사용
    text("- 채팅 해파리: " + dismissedJellyfishes.length + "마리", contentX + 40, y);
    y += lineHeight;
    text("- 배달 해마: " + dismissedSeahorses.length + "마리", contentX + 40, y);
    y += lineHeight;
    text("- 숏폼 고래: " + dismissedWhales.length + "마리", contentX + 40, y);
    y += lineHeight;
    text("- 쇼핑 물고기: " + dismissedFishes.length + "마리", contentX + 40, y);
    y += lineHeight;
    text("- 웹소설 미니 물고기: " + dismissedMiniFishes.length + "마리", contentX + 40, y);
    y += lineHeight * 2;
    
    // 탐사 시간 계산
    const elapsedTime = millis() - explorationStartTime;
    const elapsedSeconds = int(elapsedTime / 1000);
    const minutes = int(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const timeLabel = "탐사 시간: ";
    const timeValue = minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;
    text(timeLabel, contentX + 20, y);
    const timeLabelWidth = textWidth(timeLabel);
    text(timeValue, contentX + 20 + timeLabelWidth, y);
    y += lineHeight;
    
    // 이동 거리 표시 (월드 좌표 기준, 픽셀 단위)
    const distanceInPixels = int(totalDistanceTraveled);
    const distanceLabel = "이동 거리: ";
    const distanceValue = `${distanceInPixels.toLocaleString()}픽셀`;
    text(distanceLabel, contentX + 20, y);
    const distanceLabelWidth = textWidth(distanceLabel);
    text(distanceValue, contentX + 20 + distanceLabelWidth, y);
    y += lineHeight;
    
    // 호흡 횟수 표시 (텍스트 기포 개수)
    const breathLabel = "호흡 횟수: ";
    const breathValue = `${totalTextBubblesSpawned.toLocaleString()}회`;
    text(breathLabel, contentX + 20, y);
    const breathLabelWidth = textWidth(breathLabel);
    text(breathValue, contentX + 20 + breathLabelWidth, y);
    y += lineHeight;
    
    // 표정 상태 표시
    const emotionLabel = "표정 상태: ";
    const emotionNames = {
      'happy': '행복',
      'sad': '슬픔',
      'angry': '분노',
      'surprised': '놀람',
      'neutral': '평온'
    };
    const emotionName = emotionNames[currentEmotion] || '평온';
    const emotionValue = `${emotionName} ${emotionPercent}%`;
    text(emotionLabel, contentX + 20, y);
    const emotionLabelWidth = textWidth(emotionLabel);
    text(emotionValue, contentX + 20 + emotionLabelWidth, y);
    y += lineHeight;
    
    // 모드 변경 횟수 표시
    const themeChangeLabel = "모드 변경 횟수: ";
    const themeChangeValue = `${oceanThemeChangeCount.toLocaleString()}회`;
    text(themeChangeLabel, contentX + 20, y);
    const themeChangeLabelWidth = textWidth(themeChangeLabel);
    text(themeChangeValue, contentX + 20 + themeChangeLabelWidth, y);
  } else if (noteBookPage === 2) {
    // 3페이지: 마무리
    // 요약 텍스트가 표시되면 기존 텍스트를 대체
    if (!showSummaryText) {
      fill(50, 80, 120, 255);
      textSize(20);
      textFont(titleFont || uiFont || 'ThinDungGeunMo');
      text("탐사 완료", contentX + 20, pageTitleY);
      
      fill(30, 30, 30, 255);
      textSize(14);
      let y = pageContentY + textOffset + lineHeight;
      text("디지털 오션의 탐사가", contentX + 20, y);
      y += lineHeight;
      text("완료되었습니다.", contentX + 20, y);
      y += lineHeight * 2;
      text("이 일지는 당신의", contentX + 20, y);
      y += lineHeight;
      text("디지털 여정의 기록입니다.", contentX + 20, y);
      y += lineHeight * 2;
      text("언제든지 다시 돌아와서", contentX + 20, y);
      y += lineHeight;
      text("새로운 탐사를 시작할 수 있습니다.", contentX + 20, y);
    }
    
    // 요약 텍스트 표시 (버튼을 누른 후)
    if (showSummaryText) {
      // 메모장이 전체 내용 영역을 차지하도록
      const memoStartY = pageContentY - 50; // 페이지 내용 시작 위치부터 50픽셀 위로
      const memoPadW = contentW; // 전체 너비 사용
      const memoPadX = contentX; // 왼쪽 정렬
      
      // 메모장 내용 영역 (텍스트 크기 계산을 위해 먼저 정의)
      const memoContentX = memoPadX + 30;
      const memoContentY = memoStartY + 30; // 위쪽 패딩 30픽셀
      const memoContentW = memoPadW - 60;
      
      // 플랫폼 카운트 캐싱 (성능 최적화: 500ms마다 업데이트)
      const currentTime = millis();
      if (!cachedPlatformCounts || currentTime - lastPlatformCountUpdate > 500) {
        cachedPlatformCounts = {
          '웹소설': minifishes.filter(m => m.dismissed).length,
          '쇼핑': fishes.filter(f => f.dismissed).length,
          '배달': seahorses.filter(s => s.dismissed).length,
          '숏폼': whales.filter(w => w.dismissed).length,
          '채팅': jellyfishes.filter(j => j.dismissed).length
        };
        lastPlatformCountUpdate = currentTime;
      }
      const platformCounts = cachedPlatformCounts;
      
      // 요약 텍스트 생성 (매 프레임마다 새로 생성하여 실시간 업데이트)
      const elapsedTime = millis() - explorationStartTime;
      const elapsedSeconds = int(elapsedTime / 1000);
      const minutes = int(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      const steps = int(totalDistanceTraveled / 10);
      
      let maxCount = 0;
      let mostFrequentPlatform = '웹소설';
      const platformOrder = ['웹소설', '쇼핑', '배달', '숏폼', '채팅'];
      
      for (const platform of platformOrder) {
        if (platformCounts[platform] > maxCount) {
          maxCount = platformCounts[platform];
          mostFrequentPlatform = platform;
        }
      }
      
      let secondPlatform = '';
      let secondCount = 0;
      for (const platform of platformOrder) {
        if (platform !== mostFrequentPlatform && platformCounts[platform] > secondCount) {
          secondCount = platformCounts[platform];
          secondPlatform = platform;
        }
      }
      
      const emotionNames = {
        'happy': '행복한',
        'sad': '슬픈',
        'angry': '분노한',
        'surprised': '놀란',
        'neutral': '평온한'
      };
      const dominantEmotion = emotionNames[currentEmotion] || '평온한';
      
      let fullText = `당신은 ${minutes}분 ${seconds}초 동안 디지털이라는 바다 속을 천천히 항해했습니다.

그 여정에서 남긴 발걸음은 ${steps.toLocaleString()}걸음, ${totalTextBubblesSpawned.toLocaleString()}번의 디지털 호흡이 파도처럼 흘러갔습니다.

탐사 내내 당신의 얼굴에는 주로 ${dominantEmotion} 감정이 머물렀고,
그 사이 디지털 오션의 풍경은 ${oceanThemeChangeCount}번 모습을 바꾸었습니다.

가장 자주 마주친 곳은 ${mostFrequentPlatform}라는 해류였습니다.`;

      if (secondPlatform && secondCount > 0) {
        fullText += `
그다음으로는 ${secondPlatform}`;
        if (platformCounts['배달'] > 0 && secondPlatform !== '배달') {
          fullText += `, 그리고 배달`;
        }
        fullText += `의 흔적도 함께 떠다니고 있었죠.
`;
      }

      fullText += `
수많은 디지털 생명체들을 지나오며, 당신은 어떤 생각이 들었나요?

이 항해가 충분히 만족스러운 기억으로 남았을 수도, 
혹은 어딘가 허무하게 느껴졌을 수도 있겠습니다.

어떤 감정이든 괜찮습니다. 당신의 디지털 속 시간을 비난하는 것이 아닙니다.

다만, 무심코 흘려보낸 시간이 이렇게 하나의 풍경과 흔적으로 존재했음을
잠시 마주해보는 경험을 제안하고 싶었습니다.

이 바다를 다녀온 지금, 당신의 다음 시간은 어떤 기억으로 남게 될까요?
`;
      
      // 타이핑 애니메이션 (매 프레임마다 업데이트)
      const currentTextLength = fullText.length;
      
      if (!summaryTextComplete) {
        // 타이핑 진행 중
        summaryTypingIndex += summaryTypingSpeed;
        
        // 텍스트 길이가 변경되면 인덱스 조정
        if (summaryTextLength === 0) {
          summaryTextLength = currentTextLength;
        } else if (currentTextLength !== summaryTextLength) {
          // 텍스트가 변경되었을 때 비율 유지
          const ratio = summaryTypingIndex / summaryTextLength;
          summaryTextLength = currentTextLength;
          summaryTypingIndex = int(currentTextLength * ratio);
        }
        
        // 타이핑 인덱스가 텍스트 길이를 초과하지 않도록 제한
        if (summaryTypingIndex >= currentTextLength) {
          summaryTypingIndex = currentTextLength;
          summaryTextComplete = true;
        }
      } else {
        // 타이핑 완료 후에는 항상 전체 텍스트 표시
        summaryTextLength = currentTextLength;
        summaryTypingIndex = currentTextLength;
      }
      
      // 안전하게 텍스트 추출
      const safeTypingIndex = min(summaryTypingIndex, currentTextLength);
      const displayText = fullText.substring(0, safeTypingIndex);
      
      // 요약 텍스트용 작은 글자 크기와 줄 간격
      const summaryTextSize = 11; // 글자 크기 줄이기 (14 -> 11)
      const summaryLineHeight = 16; // 줄 간격 줄이기 (24 -> 16)
      
      // 텍스트 줄바꿈 캐싱 (성능 최적화: 텍스트가 변경될 때만 재계산)
      if (displayText !== lastSummaryTextCache || cachedSummaryLines.length === 0) {
        textSize(summaryTextSize);
        cachedSummaryLines = splitKoreanTextIntoLines(displayText, memoContentW, summaryTextSize);
        lastSummaryTextCache = displayText;
      }
      
      // 텍스트 높이에 맞춰 메모장 크기 계산
      const textHeight = cachedSummaryLines.length * summaryLineHeight;
      const memoPadH = textHeight + 60; // 텍스트 높이 + 여백 (위 30 + 아래 30)
      
      // 메모장 그림자 효과 (먼저 그리기, 작게)
      fill(0, 0, 0, 20);
      noStroke();
      rect(memoPadX + 2, memoStartY + 2, memoPadW, memoPadH, 4);
      
      // 흰 메모장 배경 (줄 없는 메모장, 텍스트 크기에 맞춤)
      fill(255, 255, 255, 255);
      stroke(200, 200, 200, 200);
      strokeWeight(1);
      rect(memoPadX, memoStartY, memoPadW, memoPadH, 4);
      
      // 텍스트 그리기 (메모장 위에)
      textSize(summaryTextSize);
      textAlign(LEFT, TOP);
      fill(30, 30, 30, 255);
      
      let memoTextY = memoContentY;
      
      // 텍스트 그리기 (모든 줄 표시)
      for (let i = 0; i < cachedSummaryLines.length; i++) {
        // 모든 줄 표시
        text(cachedSummaryLines[i], memoContentX, memoTextY);
        memoTextY += summaryLineHeight;
      }
    }
  }
  
  // 페이지 번호 표시
  fill(150, 150, 150, 200);
  textSize(12);
  textAlign(CENTER, BOTTOM);
  text(`${noteBookPage + 1} / 3`, notebookX + notebookW / 2, notebookY + notebookH - 15);
  
  // 이전/다음/리셋 버튼
  const btnW = 80;
  const btnH = 35;
  const btnY = notebookY + notebookH - 60;
  
  // 이전 버튼 (20픽셀 오른쪽으로 이동)
  if (noteBookPage > 0) {
    const prevBtnX = notebookX + 53; // 40 -> 50 (10픽셀 더 오른쪽)
    const isPrevHover = mouseX >= prevBtnX && mouseX <= prevBtnX + btnW &&
                        mouseY >= btnY && mouseY <= btnY + btnH;
    // 아이보리색 배경
    fill(isPrevHover ? 255 : 255, isPrevHover ? 255 : 250, isPrevHover ? 250 : 240, 240);
    stroke(240, 240, 220, 255);
    strokeWeight(2);
    rect(prevBtnX, btnY, btnW, btnH, 6);
    // < 아이콘
    fill(54, 69, 79);
    noStroke();
    textFont(uiFont || 'ThinDungGeunMo');
    textSize(20);
    textAlign(CENTER, CENTER);
    text("<", prevBtnX + btnW / 2, btnY + btnH / 2 - 1);
  }
  
  // 다음 버튼 또는 리셋 버튼 (3페이지에서 요약 텍스트가 표시되면 리셋 버튼으로 변경)
  if (noteBookPage === 2 && showSummaryText) {
    // 리셋 버튼 표시
    const resetBtnX = notebookX + notebookW - btnW - 30;
    const isResetHover = mouseX >= resetBtnX && mouseX <= resetBtnX + btnW &&
                          mouseY >= btnY && mouseY <= btnY + btnH;
    fill(isResetHover ? 0 : 0, isResetHover ? 220 : 208, 255, 240);
    stroke(0, 208, 255, 255);
    strokeWeight(2);
    rect(resetBtnX, btnY, btnW, btnH, 6);
    fill(0);
    textSize(12);
    textAlign(CENTER, CENTER);
    text("리셋", resetBtnX + btnW / 2, btnY + btnH / 2 - 1);
  } else if (noteBookPage < 3) {
    // 다음 버튼 표시
    const nextBtnX = notebookX + notebookW - btnW - 30;
    const isNextHover = mouseX >= nextBtnX && mouseX <= nextBtnX + btnW &&
                        mouseY >= btnY && mouseY <= btnY + btnH;
    // 아이보리색 배경
    fill(isNextHover ? 255 : 255, isNextHover ? 255 : 250, isNextHover ? 250 : 240, 240);
    stroke(240, 240, 220, 255);
    strokeWeight(2);
    rect(nextBtnX, btnY, btnW, btnH, 6);
    // > 아이콘
    fill(54, 69, 79);
    noStroke();
    textFont(uiFont || 'ThinDungGeunMo');
    textSize(20);
    textAlign(CENTER, CENTER);
    text(">", nextBtnX + btnW / 2, btnY + btnH / 2 - 1);
  }
  
  // 닫기 버튼 (우상단)
  const closeBtnSize = 30;
  const closeBtnX = notebookX + notebookW - closeBtnSize - 10;
  const closeBtnY = notebookY + 10;
  const isCloseHover = mouseX >= closeBtnX && mouseX <= closeBtnX + closeBtnSize &&
                       mouseY >= closeBtnY && mouseY <= closeBtnY + closeBtnSize;
  fill(isCloseHover ? 200 : 150, 80, 80, 240);
  stroke(220, 120, 120, 255);
  strokeWeight(2);
  rect(closeBtnX, closeBtnY, closeBtnSize, closeBtnSize, 4);
  fill(255);
  textSize(18);
  textAlign(CENTER, CENTER);
  text("×", closeBtnX + closeBtnSize / 2, closeBtnY + closeBtnSize / 2 - 2);
  
  pop();
}

// 상호작용 모달 그리기
function drawInteractionModal(message) {
  // 탐사일지 확인 모달은 좀 더 넓게
  const modalW = showNoteConfirm ? 360 : 300; // 탐사일지 확인 모달은 360픽셀
  const modalH = 160;
  const modalX = (width - modalW) / 2;
  const modalY = (height - modalH) / 2;
  const paddingTop = 35;
  const paddingBottom = 40;
  
  fill(20, 40, 60, UI_MODAL_BG_ALPHA);
  stroke(100, 150, 200);
  strokeWeight(2);
  rect(modalX, modalY, modalW, modalH, UI_MODAL_RADIUS);
  
  fill(200, 220, 255);
  textSize(16);
  textAlign(CENTER, TOP);
  textFont(titleFont || uiFont || 'ThinDungGeunMo');
  text(message || "채팅 해파리인거 같아요.\n자세히 보시겠습니까?", modalX + modalW / 2, modalY + paddingTop);
  
  const isNoteConfirm = showNoteConfirm;
  const btnW = isNoteConfirm ? 110 : 100;
  const btnH = 30;
  const btnY = modalY + modalH - paddingBottom - 20;
  const btn1X = modalX + modalW / 2 - btnW - 10;
  const btn2X = modalX + modalW / 2 + 10;
  
  const btn1Text = isNoteConfirm ? "예" : "자세히 보기";
  fill(0, 208, 255, UI_MODAL_BG_ALPHA);
  stroke(0, 208, 255);
  rect(btn1X, btnY, btnW, btnH, UI_MODAL_RADIUS);
  fill(255);
  textSize(12);
  textAlign(CENTER, CENTER);
  text(btn1Text, btn1X + btnW / 2, btnY + btnH / 2);
  
  const btn2Text = isNoteConfirm ? "더 둘러보기" : "그냥 지나치기";
  fill(80, 100, 120, UI_MODAL_BG_ALPHA);
  stroke(100, 150, 200);
  rect(btn2X, btnY, btnW, btnH, UI_MODAL_RADIUS);
  fill(255);
  text(btn2Text, btn2X + btnW / 2, btnY + btnH / 2);
}

// 손가락 퍼짐 계산 (박수 감지용)
function getHandSpread(hand, palmCenter) {
  if (!hand || !hand.keypoints || !palmCenter || !video) return 0;
  
  const tipIndices = [4, 8, 12, 16, 20];
  let minDx = Infinity, maxDx = -Infinity;
  let minDy = Infinity, maxDy = -Infinity;
  
  for (const idx of tipIndices) {
    const kp = hand.keypoints[idx];
    if (!kp) continue;
    const tx = kp.x / video.width;
    const ty = kp.y / video.height;
    const dxTip = tx - palmCenter.x01;
    const dyTip = ty - palmCenter.y01;
    minDx = min(minDx, dxTip);
    maxDx = max(maxDx, dxTip);
    minDy = min(minDy, dyTip);
    maxDy = max(maxDy, dyTip);
  }
  
  if (minDx === Infinity) return 0;
  return max(abs(maxDx - minDx), abs(maxDy - minDy));
}

// 제스처/엔터키로 상호작용 모달을 "확인"하는 헬퍼
function handleModalConfirmFromGesture() {
  // 프롤로그 모달 처리
  if (showPrologue) {
    prologueStep++;
    if (prologueStep >= PROLOGUE_MESSAGES.length) {
      showPrologue = false;
    }
    return;
  }
  
  // 수첩 확인 모달
  if (showNoteConfirm) {
    showNoteConfirm = false;
    return;
  }
  
  // 탐사 요약 모달
  if (showSummaryModal) {
    // 리셋 버튼 클릭 처리
    const modalW = min(width - 80, 600);
    const modalH = min(height - 100, 500);
    const modalX = (width - modalW) / 2;
    const modalY = (height - modalH) / 2;
    const btnW = 100;
    const btnH = 40;
    const btnX = modalX + (modalW - btnW) / 2;
    const btnY = modalY + modalH - btnH - 20;
    
    if (mouseX >= btnX && mouseX <= btnX + btnW &&
        mouseY >= btnY && mouseY <= btnY + btnH) {
      // 게임 재시작
      location.reload();
      return;
    }
    return;
  }

  if (!currentModal) return;

  // 이미 상세 모달이 떠 있다면 닫기 버튼 클릭과 동일하게 동작
  if (showChatDetail || showDeliveryDetail || showShortformDetail || showShoppingDetail || showNovelDetail) {
    // 닫기 버튼 클릭과 동일한 로직
    if (showChatDetail && currentModal && currentModal.jellyfish) {
      currentModal.jellyfish.dismissed = true;
      lastClosedJellyfish = currentModal.jellyfish;
    } else if (showDeliveryDetail && currentModal && currentModal.seahorse) {
      currentModal.seahorse.dismissed = true;
      lastClosedSeahorse = currentModal.seahorse;
    } else if (showShortformDetail && currentModal && currentModal.whale) {
      currentModal.whale.dismissed = true;
      lastClosedWhale = currentModal.whale;
    } else if (showShoppingDetail && currentModal && currentModal.fish) {
      currentModal.fish.dismissed = true;
      lastClosedFish = currentModal.fish;
    } else if (showNovelDetail && currentModal && currentModal.minifish) {
      currentModal.minifish.dismissed = true;
      lastClosedMiniFish = currentModal.minifish;
    }
    triggerNoteGlow(closeHintX, closeHintY);
    closeModal();
    // 블러 캐시 무효화
    if (pgBlurred._cached) {
      pgBlurred._cacheInvalidated = true;
    }
    return;
  }

  // 모달 상태 변경 플래그 설정
  modalStateChanged = true;
  
  // 블러 캐시 무효화 (상세 모드 열 때)
  if (pgBlurred._cached) {
    pgBlurred._cacheInvalidated = true;
  }
  
  if (currentModal.type === 'jellyfish') {
    showChatDetail = true;
  } else if (currentModal.type === 'seahorse') {
    showDeliveryDetail = true;
  } else if (currentModal.type === 'whale') {
    showShortformDetail = true;
  } else if (currentModal.type === 'fish') {
    showShoppingDetail = true;
  } else if (currentModal.type === 'minifish') {
    showNovelDetail = true;
  }
}

// 제스처로 상호작용 모달을 "취소"하는 헬퍼
function handleModalCancelFromGesture() {
  // 수첩 확인 모달: 더 둘러보기(=닫기)
  if (showNoteConfirm) {
    showNoteConfirm = false;
    return;
  }

  if (!currentModal) return;

  // 생물 상세 모달이 이미 열려 있으면 텍스트 표시 트리거
  if (showChatDetail || showDeliveryDetail || showShortformDetail || showShoppingDetail || showNovelDetail) {
    gestureWaveDetected = true;
    gestureWaveTime = millis();
    return;
  }

  if (currentModal.type === 'jellyfish' && currentModal.jellyfish) {
    currentModal.jellyfish.dismissed = true;
    lastClosedJellyfish = currentModal.jellyfish;
  } else if (currentModal.type === 'seahorse' && currentModal.seahorse) {
    currentModal.seahorse.dismissed = true;
    lastClosedSeahorse = currentModal.seahorse;
  } else if (currentModal.type === 'whale' && currentModal.whale) {
    currentModal.whale.dismissed = true;
    lastClosedWhale = currentModal.whale;
  } else if (currentModal.type === 'fish' && currentModal.fish) {
    currentModal.fish.dismissed = true;
    lastClosedFish = currentModal.fish;
  } else if (currentModal.type === 'minifish' && currentModal.minifish) {
    currentModal.minifish.dismissed = true;
    lastClosedMiniFish = currentModal.minifish;
  }

  closeModal();
}


// 키보드 입력 처리
function keyPressed() {
  // 새로고침 관련 키 차단 (F5, Ctrl+R, Ctrl+Shift+R 등)
  if (keyCode === 116 || keyCode === 82) { // F5 또는 R 키
    return false; // 기본 동작(새로고침) 방지
  }
  
  // Ctrl 키 조합 차단 (Ctrl+R, Ctrl+Shift+R 등)
  if (keyIsDown(CONTROL) || keyIsDown(17)) {
    if (keyCode === 82 || keyCode === 114) { // R 또는 r
      return false; // 새로고침 방지
    }
  }
  
  // 스크롤 관련 키 입력 차단 (스페이스바, PageUp, PageDown, Home, End 등)
  if (keyCode === 32 || keyCode === PAGE_UP || keyCode === PAGE_DOWN || 
      keyCode === HOME || keyCode === END) {
    return false; // 기본 동작(스크롤) 방지
  }
  
  if (key === 'f' || key === 'F') {
    handControlEnabled = !handControlEnabled;
    console.log('손 인식 토글:', handControlEnabled ? 'ON' : 'OFF');
    return false; // 기본 동작 방지
  }
  
  // 조이스틱 중심 캘리브레이션 (현재 손 위치를 중심으로 설정)
  if (key === 'c' || key === 'C') {
    if (millis() - lastHandTime < 500) {
      joyCenterX = handCenterX;
      joyCenterY = handCenterY;
      console.log('조이스틱 중심 캘리브레이션 완료:', joyCenterX, joyCenterY);
    }
    return false; // 기본 동작 방지
  }

  // 상호작용/수첩 모달에서 엔터키로 "확인" 처리
  if (keyCode === ENTER || keyCode === RETURN) {
    if (showNoteConfirm) {
      // 수첩 모달: 예
      showNoteConfirm = false;
      return false; // 기본 동작 방지
    }
    if (currentModal && !showChatDetail && !showDeliveryDetail && !showShortformDetail && !showShoppingDetail && !showNovelDetail) {
      handleModalConfirmFromGesture();
    }
    return false; // 기본 동작 방지
  }
  
  // 기본 동작 방지 (모든 키 입력에 대해)
  return false;
}

// 마우스 휠 처리 (스크롤 금지)
function mouseWheel(event) {
  // 모든 스크롤 동작 차단
  return false; // 기본 동작(스크롤) 방지
}

function mouseDragged() {
  // 텍스트 크기 조절 슬라이더 드래그 처리
  if (isDraggingTextSize && (showChatDetail || showDeliveryDetail || showShortformDetail || showShoppingDetail || showNovelDetail)) {
    const controlX = width / 2;
    const sliderW = 300;
    const sliderX = controlX - sliderW / 2;
    const currentMouseX = getMouseX();
    const localX = constrain(currentMouseX - sliderX, 0, sliderW);
    const normalizedValue = localX / sliderW;
    textDetailSizeScale = lerp(TEXT_SIZE_MIN, TEXT_SIZE_MAX, normalizedValue);
    return;
  }
  
  // 바다 드래그 시 텍스트 호흡 (텍스트 기포 생성)
  // 모달이 열려있지 않고, 텍스트 크기 조절 중이 아닐 때만 작동
  const isTextDetailOpen = showChatDetail || showDeliveryDetail || showShortformDetail || showShoppingDetail || showNovelDetail;
  const hasModal = currentModal || showNoteConfirm || showPrologue || showNoteBook;
  
  if (!isTextDetailOpen && !hasModal && !isDraggingTextSize) {
    // 마우스 이동 속도 계산
    const dx = mouseX - pmouseX;
    const dy = mouseY - pmouseY;
    const speed = sqrt(dx * dx + dy * dy);
    
    // 속도가 일정 이상일 때만 텍스트 기포 생성 (스위머처럼)
    if (speed > 0.5 && random() < BUBBLE_SPAWN_PROB_SWIM) {
      const vt = viewTransform;
      const worldX = (mouseX - vt.offsetX) / vt.scaleFactor;
      const worldY = mouseY / vt.scaleFactor + cameraY;
      
      // 바다 안에 있을 때만 기포 생성
      if (worldY > SURFACE_Y + 2) {
        const bubbleX = worldX + random(-3, 3);
        const bubbleY = worldY + random(-2, 2);
        spawnBubble(bubbleX, bubbleY, true); // 텍스트 기포
      }
    }
  }
}

// 마우스 릴리스 처리
function mouseReleased() {
  isDraggingTextSize = false;
}

// 마우스 위치 가져오기 (텍스트 모달이 열려있으면 손 위치 사용)
function getMouseX() {
  const isTextDetailOpen = showChatDetail || showDeliveryDetail || showShortformDetail || showShoppingDetail || showNovelDetail;
  if (isTextDetailOpen && handControlEnabled && typeof window.virtualMouseX !== 'undefined') {
    return window.virtualMouseX;
  }
  return mouseX;
}

function getMouseY() {
  const isTextDetailOpen = showChatDetail || showDeliveryDetail || showShortformDetail || showShoppingDetail || showNovelDetail;
  if (isTextDetailOpen && handControlEnabled && typeof window.virtualMouseY !== 'undefined') {
    return window.virtualMouseY;
  }
  return mouseY;
}

// 마우스 클릭 처리
function mousePressed() {
  // 물방울 소리 재생
  playBubbleSound();
  
  // 텍스트 모달이 열려있을 때는 손 위치를 마우스 위치로 사용
  const currentMouseX = getMouseX();
  const currentMouseY = getMouseY();
  
  // 배경음악 재생 시도 (사용자 상호작용 후 재생 가능)
  if (seaSoundAudio && seaSoundAudio.paused) {
    const playPromise = seaSoundAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        // 이미 재생 중이거나 재생할 수 없는 경우 무시
      });
    }
  }
  
  // 모달이 열려있으면 모달 클릭을 최우선 처리 (다른 클릭 무시)
  const hasModal = currentModal || showChatDetail || showDeliveryDetail || showShortformDetail || 
                   showShoppingDetail || showNovelDetail || showNoteConfirm || showPrologue;
  
  // 수첩 화면 버튼 처리
  if (showNoteBook) {
    const notebookW = min(width - 60, 500);
    const notebookH = min(height - 80, 600);
    const notebookX = (width - notebookW) / 2;
    const notebookY = (height - notebookH) / 2;
    
    const btnW = 80;
    const btnH = 35;
    const btnY = notebookY + notebookH - 60;
    
    // 이전 버튼 (20픽셀 오른쪽으로 이동된 위치)
    if (noteBookPage > 0) {
      const prevBtnX = notebookX + 50; // 40 -> 50 (10픽셀 더 오른쪽)
      if (currentMouseX >= prevBtnX && currentMouseX <= prevBtnX + btnW &&
          currentMouseY >= btnY && currentMouseY <= btnY + btnH) {
        noteBookPage--;
        return;
      }
    }
    
    // 다음 버튼 또는 리셋 버튼 처리
    if (noteBookPage === 2 && showSummaryText) {
      // 리셋 버튼 클릭 처리
      const resetBtnX = notebookX + notebookW - btnW - 30;
      if (currentMouseX >= resetBtnX && currentMouseX <= resetBtnX + btnW &&
          currentMouseY >= btnY && currentMouseY <= btnY + btnH) {
        // 게임 재시작
        location.reload();
        return;
      }
    } else if (noteBookPage < 3) {
      // 다음 버튼 클릭 처리
      const nextBtnX = notebookX + notebookW - btnW - 30;
      if (currentMouseX >= nextBtnX && currentMouseX <= nextBtnX + btnW &&
          currentMouseY >= btnY && currentMouseY <= btnY + btnH) {
        if (noteBookPage === 2) {
          // 3페이지에서 다음 버튼을 누르면 요약 텍스트 표시 시작
          showSummaryText = true;
          summaryTypingIndex = 0;
          summaryTextComplete = false;
          summaryTextLength = 0; // 텍스트 길이 초기화
          cachedPlatformCounts = null; // 캐시 초기화
          cachedSummaryLines = []; // 줄바꿈 캐시 초기화
          lastSummaryTextCache = ''; // 텍스트 캐시 초기화
        } else {
          noteBookPage++;
        }
        return;
      }
    }
    
    // 닫기 버튼
    const closeBtnSize = 30;
    const closeBtnX = notebookX + notebookW - closeBtnSize - 10;
    const closeBtnY = notebookY + 10;
    if (currentMouseX >= closeBtnX && currentMouseX <= closeBtnX + closeBtnSize &&
        currentMouseY >= closeBtnY && currentMouseY <= closeBtnY + closeBtnSize) {
      showNoteBook = false;
      return;
    }
    
    // 수첩 화면이 열려있으면 다른 클릭 무시
    return;
  }
  
  // 프롤로그 모달 처리 (1, 2번도 텍스트가 한 줄에 들어가도록 확대, 3번만 확대)
  if (showPrologue) {
    const isThirdModal = prologueStep === 2;
    const modalW = isThirdModal ? 420 : 420; // 1, 2번도 텍스트가 한 줄에 들어가도록 확대 (300 -> 420)
    const modalH = isThirdModal ? 180 : 160; // 3번만 확대
    const modalX = (width - modalW) / 2;
    const modalY = (height - modalH) / 2;
    const paddingBottom = isThirdModal ? 50 : 40; // 3번만 증가
    const btnW = 110;
    const btnH = 30;
    // 3번 모달만 버튼을 20픽셀 아래로 내림 (-20 -> -10)
    const btnY = isThirdModal ? (modalY + modalH - paddingBottom - 10) : (modalY + modalH - paddingBottom - 20);
    const btnX = modalX + modalW / 2 - btnW / 2;
    
    // 다음 버튼 클릭 확인
    if (currentMouseX >= btnX && currentMouseX <= btnX + btnW &&
        currentMouseY >= btnY && currentMouseY <= btnY + btnH) {
      prologueStep++;
      if (prologueStep >= PROLOGUE_MESSAGES.length) {
        showPrologue = false;
      }
      return;
    }
    return; // 프롤로그 중에는 다른 클릭 무시
  }
  
  // 수첩(탐사 일지 버튼) 클릭 처리 - 가장 먼저 처리 (텍스트 동물 상세 모드에서도 작동)
  {
    const imgSize = 60 * 2.5;
    const btnX = width - imgSize - 50;
    const btnY = height - imgSize - 60;
    const clickPadding = 20; // 클릭 범위 확장 (20픽셀 여유)
    if (currentMouseX >= btnX - clickPadding && currentMouseX <= btnX + imgSize + clickPadding &&
        currentMouseY >= btnY - clickPadding && currentMouseY <= btnY + imgSize + clickPadding) {
      showNoteConfirm = true;
      return;
    }
  }

  // 텍스트 크기 조절 슬라이더 클릭/드래그 처리
  if (showChatDetail || showDeliveryDetail || showShortformDetail || showShoppingDetail || showNovelDetail) {
    const controlX = width / 2;
    // 닫기 버튼 바로 위에 위치 (닫기 버튼 높이 35, 간격 20)
    const controlY = closeHintY > 0 ? closeHintY - 35 - 20 : 85; // closeHintY가 설정되지 않았으면 기본값 사용
    const sliderW = 300;
    const sliderH = 8;
    const thumbSize = 24;
    const sliderX = controlX - sliderW / 2;
    const sliderY = controlY; // drawTextSizeControl과 일치
    
    if (currentMouseX >= sliderX - thumbSize / 2 && currentMouseX <= sliderX + sliderW + thumbSize / 2 &&
        currentMouseY >= sliderY - thumbSize / 2 && currentMouseY <= sliderY + thumbSize / 2) {
      const localX = constrain(currentMouseX - sliderX, 0, sliderW);
      const normalizedValue = localX / sliderW;
      textDetailSizeScale = lerp(TEXT_SIZE_MIN, TEXT_SIZE_MAX, normalizedValue);
      isDraggingTextSize = true;
      return;
    }
  }
  
  // 해양 분위기 선택 UI 클릭 처리 (모달보다 우선 - 항상 접근 가능)
  if (handleOceanMoodClick()) {
    return;
  }

  // 모달이 열려있으면 모달 클릭을 최우선 처리
  // 생물 상세 모달 닫기 버튼 처리 (최우선)
  // 카메라 센서 사용 시 손 위치도 함께 체크
  if (showChatDetail || showDeliveryDetail || showShortformDetail || showShoppingDetail || showNovelDetail) {
    const btnW = 140;
    const btnH = 35;
    const btnX = closeHintX - btnW / 2;
    const btnY = closeHintY;
    
    // 실제 마우스 클릭 체크
    const isMouseButtonClick = mouseX >= btnX && mouseX <= btnX + btnW &&
                                mouseY >= btnY - btnH / 2 && mouseY <= btnY + btnH / 2;
    
    // 카메라 센서 사용 시 손 위치로도 클릭 체크
    let isHandButtonClick = false;
    if (handControlEnabled && typeof window.virtualMouseX !== 'undefined' && typeof window.virtualMouseY !== 'undefined') {
      isHandButtonClick = window.virtualMouseX >= btnX && window.virtualMouseX <= btnX + btnW &&
                          window.virtualMouseY >= btnY - btnH / 2 && window.virtualMouseY <= btnY + btnH / 2;
    }
    
    // 마우스 또는 손 중 하나라도 버튼을 클릭했으면 닫기
    const isButtonClick = isMouseButtonClick || isHandButtonClick;
    
    if (isButtonClick) {
      if (showChatDetail && currentModal && currentModal.jellyfish) {
        currentModal.jellyfish.dismissed = true;
        lastClosedJellyfish = currentModal.jellyfish;
      } else if (showDeliveryDetail && currentModal && currentModal.seahorse) {
        currentModal.seahorse.dismissed = true;
        lastClosedSeahorse = currentModal.seahorse;
      } else if (showShortformDetail && currentModal && currentModal.whale) {
        currentModal.whale.dismissed = true;
        lastClosedWhale = currentModal.whale;
      } else if (showShoppingDetail && currentModal && currentModal.fish) {
        currentModal.fish.dismissed = true;
        lastClosedFish = currentModal.fish;
      } else if (showNovelDetail && currentModal && currentModal.minifish) {
        currentModal.minifish.dismissed = true;
        lastClosedMiniFish = currentModal.minifish;
      }
      triggerNoteGlow(closeHintX, closeHintY);
      closeModal();
      // 블러 캐시 무효화
      if (pgBlurred._cached) {
        pgBlurred._cacheInvalidated = true;
      }
      return;
    }
    return;
  }

  // 상호작용 모달 / 수첩 확인 모달 버튼 처리
  {
    // 탐사일지 확인 모달은 좀 더 넓게
    const modalW = showNoteConfirm ? 360 : 300; // 탐사일지 확인 모달은 360픽셀
    const modalH = 160;
    const modalX = (width - modalW) / 2;
    const modalY = (height - modalH) / 2;
    const paddingBottom = 40;
    const btnW = showNoteConfirm ? 110 : 100;
    const btnH = 30;
    const btnY = modalY + modalH - paddingBottom - 20;
    const btn1X = modalX + modalW / 2 - btnW - 10;
    const btn2X = modalX + modalW / 2 + 10;

    // 수첩 확인 모달 처리
    if (showNoteConfirm) {
      const isYes = currentMouseX >= btn1X && currentMouseX <= btn1X + btnW &&
                     currentMouseY >= btnY && currentMouseY <= btnY + btnH;
      const isMoreExplore = currentMouseX >= btn2X && currentMouseX <= btn2X + btnW &&
                            currentMouseY >= btnY && currentMouseY <= btnY + btnH;

      if (isYes) {
        showNoteConfirm = false;
        showNoteBook = true;
        noteBookPage = 0;
        return;
      } else if (isMoreExplore) {
        showNoteConfirm = false;
        return;
      }
      return;
    }

    // 생물 상호작용 모달 버튼 처리
    if (!currentModal) return;

    if (currentMouseX >= btn1X && currentMouseX <= btn1X + btnW &&
        currentMouseY >= btnY && currentMouseY <= btnY + btnH) {
      // 블러 캐시 무효화 (상세 모드 열 때)
      if (pgBlurred._cached) {
        pgBlurred._cacheInvalidated = true;
      }
      
      // 모달 상태 변경 플래그 설정
      modalStateChanged = true;
      
      if (currentModal.type === 'jellyfish') {
        showChatDetail = true;
      } else if (currentModal.type === 'seahorse') {
        showDeliveryDetail = true;
      } else if (currentModal.type === 'whale') {
        showShortformDetail = true;
      } else if (currentModal.type === 'fish') {
        showShoppingDetail = true;
      } else if (currentModal.type === 'minifish') {
        showNovelDetail = true;
      }
    }
    
    if (currentMouseX >= btn2X && currentMouseX <= btn2X + btnW &&
        currentMouseY >= btnY && currentMouseY <= btnY + btnH) {
      if (currentModal.type === 'jellyfish' && currentModal.jellyfish) {
        currentModal.jellyfish.dismissed = true;
        lastClosedJellyfish = currentModal.jellyfish;
      } else if (currentModal.type === 'seahorse' && currentModal.seahorse) {
        currentModal.seahorse.dismissed = true;
        lastClosedSeahorse = currentModal.seahorse;
      } else if (currentModal.type === 'whale' && currentModal.whale) {
        currentModal.whale.dismissed = true;
        lastClosedWhale = currentModal.whale;
      } else if (currentModal.type === 'fish' && currentModal.fish) {
        currentModal.fish.dismissed = true;
        lastClosedFish = currentModal.fish;
      } else if (currentModal.type === 'minifish' && currentModal.minifish) {
        currentModal.minifish.dismissed = true;
        lastClosedMiniFish = currentModal.minifish;
      }
      closeModal();
    }
  }
}

// 표정 상태 업데이트 함수 (랜덤 또는 실제 인식)
function updateEmotionState() {
  // 실제 Face API가 있으면 사용, 없으면 랜덤 값 생성
  if (faceApi && typeof faceApi.detect === 'function' && video) {
    // 실제 표정 인식 시도
    try {
      faceApi.detect(video, (results) => {
        if (results && results.length > 0) {
          const face = results[0];
          if (face.expressions) {
            // 가장 높은 확률의 감정 찾기
            let maxEmotion = 'neutral';
            let maxConfidence = 0;
            for (const emotion in face.expressions) {
              if (face.expressions[emotion] > maxConfidence) {
                maxConfidence = face.expressions[emotion];
                maxEmotion = emotion;
              }
            }
            currentEmotion = maxEmotion;
            emotionConfidence = maxConfidence;
            emotionPercent = int(emotionConfidence * 100);
          }
        } else {
          // 얼굴이 인식되지 않으면 랜덤 값 생성
          generateRandomEmotion();
        }
      });
    } catch (e) {
      console.log('Face API 인식 실패, 랜덤 값 사용:', e);
      generateRandomEmotion();
    }
  } else {
    // Face API가 없거나 인식 실패 시 랜덤 값 생성
    generateRandomEmotion();
  }
}

// 랜덤 표정 상태 생성 함수
function generateRandomEmotion() {
  const emotions = ['happy', 'sad', 'angry', 'surprised', 'neutral'];
  const randomEmotion = emotions[int(random(emotions.length))];
  currentEmotion = randomEmotion;
  // 랜덤 신뢰도 (0.3 ~ 0.95)
  emotionConfidence = random(0.3, 0.95);
  emotionPercent = int(emotionConfidence * 100);
}