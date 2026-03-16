export const G        = 350;
export const DT       = 0.008;  // 서브스텝당 dt — 총 시뮬시간(×SUBSTEPS)은 유지
export const SUBSTEPS = 4;      // 프레임당 4회 적분 → 정밀도↑, 궤적 밀도↑
export const M1       = 12;     // physics.js / butterfly.js 기본값 참조용
export const M2       =  6;

export const TRAIL_MAX        = 3600;   // 라인 모드
export const TRAIL_MAX_COMET  = 1800;   // 코맷 (도트 절반 빈도)
export const TRAIL_MAX_GLOW   = 1200;   // 글로우 (올챙이)

// 모드별 페이드 속도
export const TRAIL_FADE_LINE  = 0.0014; // ~714 프레임
export const TRAIL_FADE_COMET = 0.0020; // ~500 프레임 (이전 대비 40% 길어짐)
export const TRAIL_FADE_GLOW  = 0.0038; // ~263 프레임 (이전 대비 47% 길어짐)

export const PINK   = [255,  20, 147];  // 핫핑크
export const MINT   = [ 57, 255, 183];  // 사이버 민트
export const CYAN   = [  0, 200, 255];  // 일렉트릭 시안
export const VIOLET = [200,   0, 255];  // 네온 바이올렛
export const ORANGE = [255, 100,   0];  // 네온 오렌지
export const LIME   = [100, 255,  50];  // 네온 라임
export const RED    = [255,  20,  60];  // 네온 레드
export const AZURE  = [  0,  80, 255];  // 딥 애저
export const BG     = [  0,   5,  10];
