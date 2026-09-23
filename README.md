# Swing Paint

이중진자(double pendulum) 물리 시뮬레이션으로 그림을 그리는 인터랙티브 아트 앱.
라그랑지안 방정식을 RK4로 적분해 나온 궤적이 그대로 붓질이 된다.
같은 그림은 두 번 나오지 않는다.

[**▶ 라이브 데모**](https://leepillwoo.github.io/swing-paint/)

![demo](https://img.shields.io/badge/demo-live-brightgreen?link=https://leepillwoo.github.io/swing-paint/)
![HTML5](https://img.shields.io/badge/HTML5-canvas-E34F26)
![p5.js](https://img.shields.io/badge/p5.js-1.9.3-ED225D)
![Web Audio](https://img.shields.io/badge/Web%20Audio-API-4A90D9)
![license](https://img.shields.io/badge/license-MIT-green)

---

## 실행

브라우저에서 [leepillwoo.github.io/swing-paint](https://leepillwoo.github.io/swing-paint/) 로 바로 열 수 있다.

로컬에서 돌리려면 — 빌드 과정 없음. ES 모듈을 쓰기 때문에 `file://` 로 열면 안 되고 로컬 서버가 필요하다.

```bash
python -m http.server 8000
# → http://localhost:8000
```

p5.js는 CDN에서 불러오므로 인터넷 연결이 있어야 한다.

---

## 조작

| 입력 | 동작 |
|------|------|
| 탭/클릭 | 그 지점으로 임펄스 |
| 드래그 | 진자를 직접 끌고 다님 (18px 이상 움직이면 드래그 전환) |
| 길게 누르기 | 0.4초부터 차지 시작, 1.6초에 풀차지 → 놓으면 폭발적 임펄스 |
| 2분 방치 | 자동으로 랜덤 교란이 들어온다 |

---

## 모드

**ENV** — 진자가 사는 세계

| 모드 | 중력 | 감쇠 | 느낌 |
|------|------|------|------|
| CHAOS | 10 | 0.0 | 준무중력 + 관절 노이즈. 기본값 |
| EARTH | 350 | 0.02 | 정상 중력. 결국 멈춘다 |
| WATER | 100 | 0.30 | 속도² 저항. 물속에서 휘젓는 느낌 |
| SPACE | 0 | 0.0 | 완전 무중력, 무마찰. 영원히 돈다 |

**MASS** — STANDARD(12/6) · FEATHER(3/1, 빠르고 혼돈적) · IRON(26/22, 느리고 위엄있음)

**TRAIL** — GLOW(테이퍼 스트로크) · LINE(극세 레이저) · COMET(입자 궤적) · RIBBON(법선 폴리곤 리본) · SPARK(불꽃놀이 스파클라)

**PRESET** — DEFAULT → BUTTERFLY → STORM → ORBIT → RIPPLE → SPARK 순환. ENV·MASS·트레일·미러·슬라이더를 한 번에 세팅한다.

**MIRROR** — 4방향 대칭. 만다라가 나온다.

**SCALE** — PENTA / BLUES / MUTE. 진자 각도가 음이 되고, bob2의 x 위치가 스테레오 패닝이 된다. MUTE는 멜로디만 끄고 타격음은 남는다.

**HUD** — 위상 플롯(a1 vs a2 어트랙터), 각속도 호, 에너지 스파크라인, 난류 지표(TURB).

---

## 구조

```text
index.html          UI 마크업 + 인라인 CSS 전체 (별도 CSS 파일 없음)
js/constants.js     전역 상수, 색상 팔레트, 프리셋 정의
js/physics.js       라그랑지안 RK4 적분기. p5를 모른다
js/effects.js       트레일·파티클·링·배경 렌더
js/audio.js         Web Audio API 사운드 합성
js/hud.js           텔레메트리 HUD
js/ui.js            DOM 참조와 이벤트 바인딩만
js/main.js          p5 인스턴스, 드로우 루프, 인터랙션 상태머신
```

물리는 p5를 import하지 않는다. 렌더러는 p5 인스턴스를 인수로 받는다.
자세한 규칙은 [CLAUDE.md](CLAUDE.md) 참고.

---

## 왜 두 번 다시 같은 그림이 안 나오는가

이중진자는 초기 조건에 민감하게 의존하는 대표적인 혼돈계다.
각도가 0.0001 라디안만 달라도 몇 초 뒤엔 완전히 다른 궤적으로 갈라진다.
매 프레임 4회 서브스텝 RK4로 적분하고, CHAOS 모드에선 관절에 노이즈까지 섞는다.
재현은 불가능하다. 그게 이 앱의 요점이다.

---

## 라이선스

MIT — 자세한 내용은 [LICENSE](LICENSE) 참고.
