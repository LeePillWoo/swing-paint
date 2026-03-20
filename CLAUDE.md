# Swing Paint — CLAUDE.md

이중진자 물리 시뮬레이션 기반 인터랙티브 아트 앱.
p5.js 캔버스에 실시간으로 궤적을 그리고, 터치/마우스 입력으로 물리계를 교란한다.

---

## 파일 구조 및 역할

```text
index.html          진입점. UI 마크업(버튼·슬라이더·에너지바·시계) + 인라인 CSS 전체.
                    별도 CSS 파일 없음 — 스타일은 여기서만 수정.

js/constants.js     전역 상수 (G, DT, SUBSTEPS, 트레일 버퍼 크기/페이드, 색상 팔레트, PRESETS 배열)
js/physics.js       라그랑지안 이중진자 RK4 적분기. 환경(ENV)·질량(MASS) 시스템.
                    envMode, massMode, a1/a2/a1v/a2v 를 모듈 변수로 export.
js/effects.js       트레일·파티클·링·배경 렌더 전담. p5 인스턴스를 인수로 받음.
js/audio.js         Web Audio API 사운드. envMode/massMode import해서 피치 보정.
js/hud.js           Telemetry HUD (위상 플롯, 각속도 호, 에너지 스파크라인, TURB 지표).
js/ui.js            DOM 참조·이벤트 바인딩·슬라이더 값 읽기만 담당. 렌더 로직 없음.
js/main.js          p5 인스턴스 생성. 드로우 루프, 인터랙션 상태머신, 모든 시스템 조율.
```

---

## 아키텍처 핵심 패턴

### 모듈 분리 원칙

- **physics.js** 는 p5를 모르고, 순수 수학/물리만 담당.
- **effects.js** 는 `trail[]`, `rings[]`, `particles[]` 배열을 직접 소유. p5 인스턴스를 매 호출 인수로 받음.
- **audio.js** 는 `envMode`, `massMode` 를 physics.js에서 직접 import. main.js 거치지 않음.
- **ui.js** 는 DOM만 건드린다. 상태값을 보유하지 않음.

### 상태머신 (main.js)

```text
idle → pending (pressStart) → dragging (DRAG_THRESHOLD=18px 초과)
                            → idle     (pressEnd: tap or charge)
pending 상태에서 400ms 이상 홀드 → chargeLevel 증가 (최대 1.0 @ 1600ms 추가)
```

### 물리 서브스텝

매 프레임 SUBSTEPS=4 회 RK4 적분. DT=0.008 × timeScale × speedScale.
totalDt가 MAX_DT=0.018 초과 시 추가 분할(subN). NaN 발산 시 resetPendulum().

---

## 환경 모드 (envMode)

| 모드  | 중력(G) | 감쇠(damp) | 특징 |
|-------|---------|------------|------|
| CHAOS | 10      | 0.0        | 준무중력 + 관절 노이즈. 기본값. |
| EARTH | 350     | 0.02       | 정상 중력. 저속 점착 감쇠 + 완전정지 스냅(a1v<0.004 & a2v<0.004 & 각도 미세시). |
| WATER | 100     | 0.30       | 속도² 저항 + 저속 추가 점착. |
| SPACE | 0       | 0.0        | 완전 무중력, 무마찰. |

**주의**: `envMode` 는 physics.js가 export하는 모듈 변수. 변경은 반드시 `cycleEnv()` 또는 `setEnv(mode)`로. 직접 대입 금지.

---

## 질량 모드 (massMode)

| 모드     | M1 | M2 | 특징 |
|----------|----|----|------|
| STANDARD | 12 | 6  | 기본값. m2/m1=0.5 |
| FEATHER  | 3  | 1  | 빠르고 혼돈적 |
| IRON     | 26 | 22 | 느리고 위엄있음 |

cycleMass()는 즉시 currentM1/M2를 갱신함 (updatePhysicsEnv처럼 러프 없음).

---

## 트레일 시스템 (effects.js)

### 트레일 스타일 및 버퍼 크기

| 스타일 | 버퍼 | 페이드 상수 | 특징 |
|--------|------|-------------|------|
| glow   | 1200 | 0.0038      | 테이퍼 스트로크, 3레이어 |
| line   | 4500 | 0.00112     | 극세 레이저, 헤드 글로우 10% 구간 |
| comet  | 1800 | 0.0020      | 2레이어 원, 도트 4서브스텝 중 1회 |
| ribbon | 900  | 0.0030      | 법선 폴리곤, 꼬리→머리 테이퍼 |
| spark  | 1500 | 0.0055      | 불꽃놀이 스파클라. 폭발적 랜덤 초기 벡터(±2.25) + 마찰 감쇠(×0.91) + 중력. alpha 감소에 따라 중력 약화(둥실 효과). |

mirrorMode 활성 시 버퍼 = 500 (4-way 대칭으로 렌더 부하 4배)

### 트레일 포인트 구조

```js
{ x, y, alpha, r, g, b, w, fade, driftY, driftX }
// driftY/driftX: pushTrail 시점에 초기화 (spark 전용이지만 모든 포인트에 존재)
```

### 성능 최적화 (Group 4 완료)

- 모든 렌더러에서 **write-pointer 컴팩션** 사용. `splice(i,1)` 역방향 루프 제거.
- ribbon 법선 배열 `_lx, _ly, _rx, _ry` 모듈 레벨 재사용 (매 프레임 할당 제거).
- `pushTrail` 캡 트림: `splice(0, n)` → `while (trail.length > max) trail.shift()`.
- 거리² 비교: `** 2` → `* 자기자신`.

---

## 프리셋 시스템

`constants.js`의 `PRESETS` 배열 (6개):
DEFAULT → BUTTERFLY → STORM → ORBIT → RIPPLE → SPARK → (다시 DEFAULT)

프리셋 적용 시 호출 순서:

1. `clearTrail()`
2. `setEnv()`, `setMass()`, `setPendulumState()`  ← physics.js
3. `setTrailStyle()`, `setMirrorState()`           ← effects.js
4. `setMirrorActive()`, `setStyleLabel()`, `setEnvLabel()`, `setMassLabel()`, `setPresetLabel()`, `setSliderValues()` ← ui.js

**프리셋 버튼 초기 텍스트**: "DEFAULT" (index=0). 클릭 시 index+1부터 순환.

---

## 오디오 시스템

스케일 순환: `PENTA → BLUES → MUTE → PENTA`

- **MUTE**: 진자 각도 기반 멜로디(`soundNote`)만 음소거. 탭/차지/플릭 효과음은 정상 재생.
- **스테레오 패닝**: bob2의 x 위치(0~1)를 `pos.x2 / p.width` 로 soundNote에 전달.
- **화음**: velNorm > 0.55 또는 CHAOS 모드일 때 완전5도(freq × 1.498) 추가.
- `ensureAudio()`: 첫 인터랙션 시 AudioContext 생성. 브라우저 자동재생 정책 대응.

---

## 배경 시스템 (renderBg)

`effects.js`의 `renderBg(p, env, energy, cx, cy)`.
`p.background()` 직후, `renderTrail()` 이전에 호출됨 (main.js draw 루프).

| ENV   | 효과 |
|-------|------|
| SPACE | 130개 별 (한 번 생성 후 캐시, `_stars`). 창 리사이즈 시 `resetBg()` 로 초기화. 피벗 네뷸라 글로우. |
| WATER | 피벗에서 천천히 퍼지는 파문 링 4개 (`_waterPhase` 상태). |
| CHAOS | 맥동하는 사인파 수평 그리드 라인. |
| EARTH | 효과 없음 (배경 그대로). |

---

## 인터랙션 주의사항

### UI 클릭 분리

`isUITouch(event)` 로 버튼/슬라이더 영역 클릭을 캔버스 이벤트와 완전 분리.
`#env-panel, #style-panel, #slider-panel, #ui-bar, #hud-toggle` 이 타겟이면 캔버스 인터랙션 무시.

### 차지 시스템

- hold 400ms 이상 → chargeLevel 증가 시작 (최대 풀차지 1600ms).
- chargeLevel > 0 이면 pending 중 dampForDrag 비활성화 (penulum 자유 회전 유지).
- 드래그 전환 시 chargeLevel 즉시 0 초기화.
- chargeLevel > 0.12 이면 charge 릴리즈, 그 미만이면 tap 처리.

### 자동 교란

2분(AUTO_NUDGE_MS) 무조작 시 랜덤 좌표에 `applyImpulse` 적용.
모든 인터랙션(버튼 포함)에서 `lastInteractAt = Date.now()` 갱신.

---

## HUD

우측 상단, 기본 비활성. HUD 버튼으로 토글.

표시 항목:

- 위상 플롯 (a1 vs a2 어트랙터, 180프레임 히스토리)
- ω1/ω2 각속도 호 + 수치
- 에너지 스파크라인 (200프레임, kU 단위)
- MASS 바 (M1/M2)
- ENV 바 (G, DAMP, CHAOS%)
- TURB 지표 (에너지 변동계수 σ/|μ|, 시안→레드)

모바일(`p.width < 600`): 스케일 `Math.max(0.6, Math.min(p.width/480, 1.0))` 적용.

---

## 현재 구현 완료 상태

| 그룹 | 항목 | 상태 |
|------|------|------|
| 1 | 프리셋 씬 6개 (DEFAULT/BUTTERFLY/STORM/ORBIT/RIPPLE/SPARK) | ✅ |
| 1 | HUD 확장 (TURB 지표, 에너지 히스토리 200f, 모바일 스케일) | ✅ |
| 2 | 홀드-차지 임펄스 시스템 + 차지 비주얼 | ✅ |
| 2 | 오디오 스케일 (PENTA/BLUES/MUTE), 스테레오 패닝, 화음 | ✅ |
| 3 | 트레일 스타일 추가 (RIBBON, SPARK) | ✅ |
| 3 | 환경별 동적 배경 (SPACE 별필드, WATER 파문, CHAOS 그리드) | ✅ |
| 3 | EARTH 팔 글로우 + 레이어드 피벗 시각 | ✅ |
| 4 | 성능 최적화 (write-pointer, 배열 재사용, shift 교체) | ✅ |
| 5 | ribbon 렌더 버그 수정 (_lx/_rx 이름 불일치) | ✅ |
| 5 | spark 스파클라 효과 (폭발 벡터, 마찰 감쇠, alpha 기반 중력 약화) | ✅ |

---

## 코딩 규칙 및 주의사항

1. **p5 의존성 전파 금지**: physics.js, constants.js, audio.js는 p5를 import하거나 참조하지 않는다. p5 인스턴스는 main.js에서만 생성되고, effects.js/hud.js에는 인수로 전달된다.

2. **모듈 변수 직접 대입 금지**: `envMode`, `massMode`, `trailStyle`, `mirrorMode` 는 반드시 제공된 setter 함수로만 변경. ES 모듈 live binding이지만 외부에서 대입하면 내부 로직과 불일치.

3. **trail 배열은 effects.js가 소유**: main.js는 `pushTrail()`, `clearTrail()`만 호출. trail 배열을 직접 읽거나 조작하지 않는다.

4. **write-pointer 패턴 유지**: effects.js의 모든 컴팩션 루프는 write-pointer 방식. 새로운 렌더러 추가 시 `splice(i, 1)` 역방향 루프 사용 금지.

5. **clearTrail() 필수 호출 시점**: 프리셋 변경, 트레일 스타일 변경(toggleMirror 내부에서 자동), windowResized. 이 외에 트레일을 비울 이유가 생기면 명시적으로 호출.

6. **PRESETS 배열 수정 시**: index.html의 PRESET 버튼 초기 텍스트("DEFAULT")는 PRESETS[0].label과 일치해야 한다. main.js의 `_presetIdx = 0` 도 함께 확인.

7. **오디오 컨텍스트**: `ensureAudio()`는 반드시 사용자 인터랙션 핸들러 내에서 호출. 브라우저 자동재생 정책으로 인해 draw 루프에서 직접 생성 불가.

8. **renderBg 호출 순서**: `p.background()` → `renderBg()` → `renderTrail()` → 나머지 렌더. 순서 바꾸면 배경이 트레일을 덮음.

9. **windowResized 시 반드시**: `clearTrail()`, `resetBg()`, `resetPendulum(p)` 세 개 모두 호출. resetBg 누락 시 SPACE 별이 구 캔버스 크기 기준으로 남음.
