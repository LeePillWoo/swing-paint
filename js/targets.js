let targets     = [];
let score       = 0;
let nextSpawnMs = 3000;

export function getScore() { return score; }

export function resetTargets() {
  targets     = [];
  score       = 0;
  nextSpawnMs = 3000;
}

// 매 프레임 호출. 충돌 시 true 반환
export function updateTargets(p, x2, y2) {
  // 스폰
  if (p.millis() > nextSpawnMs) {
    const r        = Math.max(12, 42 - score * 1.4);
    const margin   = r + 60;
    targets.push({
      x: p.random(margin, p.width  - margin),
      y: p.random(margin, p.height - margin),
      r,
      life:    5.0,
      maxLife: 5.0,
    });
    const interval = Math.max(1000, 3800 - score * 90);
    nextSpawnMs = p.millis() + interval;
  }

  // 충돌 & 수명 체크
  let hit = false;
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    t.life -= p.deltaTime / 1000;
    if (t.life <= 0) { targets.splice(i, 1); continue; }

    if (Math.hypot(x2 - t.x, y2 - t.y) < t.r + 7) {
      targets.splice(i, 1);
      score++;
      hit = true;
    }
  }
  return hit;
}

export function renderTargets(p) {
  const pulse = Math.sin(p.millis() * 0.006) * 3;
  for (const t of targets) {
    const ratio = t.life / t.maxLife;
    const a     = ratio * 220;

    // 바깥 글로우
    p.noFill();
    p.stroke(57, 255, 183, a * 0.25);
    p.strokeWeight(1);
    p.circle(t.x, t.y, (t.r + pulse + 12) * 2);

    // 메인 링
    p.stroke(57, 255, 183, a * 0.85);
    p.strokeWeight(1.6);
    p.circle(t.x, t.y, (t.r + pulse) * 2);

    // 수명 아크 (남은 시간 표시)
    p.stroke(57, 255, 183, a * 0.45);
    p.strokeWeight(2.2);
    p.arc(t.x, t.y,
          (t.r + pulse + 7) * 2, (t.r + pulse + 7) * 2,
          -p.HALF_PI, -p.HALF_PI + p.TWO_PI * ratio);
  }
}
