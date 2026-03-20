export const G        = 350;
export const DT       = 0.008;  // 서브스텝당 dt — 총 시뮬시간(×SUBSTEPS)은 유지
export const SUBSTEPS = 4;      // 프레임당 4회 적분 → 정밀도↑, 궤적 밀도↑
export const M1       = 12;     // physics.js / butterfly.js 기본값 참조용
export const M2       =  6;

export const TRAIL_MAX        = 4500;   // 라인 모드 (+25% 연장)
export const TRAIL_MAX_COMET  = 1800;   // 코맷 (도트 절반 빈도)
export const TRAIL_MAX_GLOW   = 1200;   // 글로우 (올챙이)
export const TRAIL_MAX_RIBBON =  900;   // 리본 (퍼프 폴리곤)
export const TRAIL_MAX_SPARK  = 1500;   // 스파크 (중력 드리프트 점)

// 모드별 페이드 속도
export const TRAIL_FADE_LINE   = 0.00112; // ~893 프레임 (+25% 연장)
export const TRAIL_FADE_COMET  = 0.0020;  // ~500 프레임
export const TRAIL_FADE_GLOW   = 0.0038;  // ~263 프레임
export const TRAIL_FADE_RIBBON = 0.0030;  // ~333 프레임
export const TRAIL_FADE_SPARK  = 0.0055;  // ~182 프레임

export const PINK   = [255,  20, 147];  // 핫핑크
export const MINT   = [ 57, 255, 183];  // 사이버 민트
export const CYAN   = [  0, 200, 255];  // 일렉트릭 시안
export const VIOLET = [200,   0, 255];  // 네온 바이올렛
export const ORANGE = [255, 100,   0];  // 네온 오렌지
export const LIME   = [100, 255,  50];  // 네온 라임
export const RED    = [255,  20,  60];  // 네온 레드
export const AZURE  = [  0,  80, 255];  // 딥 애저
export const BG     = [  0,   5,  10];

// ── 프리셋 씬 ─────────────────────────────────────────────────────────────────
// env, mass, style, mirror, 초기 각도/속도, 슬라이더 값(0~100)
export const PRESETS = [
  { label: 'DEFAULT',   env: 'CHAOS', mass: 'STANDARD',style: 'glow',  mirror: false, a1: 2.20, a2: 2.50, a1v:  0.30, a2v: -0.30, speed: 50, trail: 50 },
  { label: 'BUTTERFLY', env: 'CHAOS', mass: 'FEATHER', style: 'glow',  mirror: false, a1: 2.26, a2: 2.67, a1v:  0.30, a2v: -0.40, speed: 48, trail: 52 },
  { label: 'STORM',     env: 'CHAOS', mass: 'IRON',    style: 'comet', mirror: false, a1: 1.88, a2: 3.10, a1v:  0.90, a2v: -0.70, speed: 58, trail: 46 },
  { label: 'ORBIT',     env: 'SPACE', mass: 'STANDARD',style: 'line',  mirror: true,  a1: 1.57, a2: 2.36, a1v:  0.55, a2v:  0.40, speed: 40, trail: 22 },
  { label: 'RIPPLE',    env: 'WATER', mass: 'IRON',    style: 'glow',  mirror: true,  a1: 2.51, a2: 2.83, a1v: -0.45, a2v:  0.50, speed: 44, trail: 38 },
  { label: 'SPARK',     env: 'EARTH', mass: 'FEATHER', style: 'comet', mirror: false, a1: 2.04, a2: 3.14, a1v:  0.60, a2v: -0.50, speed: 62, trail: 55 },
];
