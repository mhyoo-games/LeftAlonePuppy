// 보스 방 자동 플레이: 간단한 규칙으로 움직이는 봇이 8 보스를 모두 이길 수 있는지 본다.
// node scripts/bossbot.ts  (tests/core.test.ts 에서도 씀)
import { World, type Input } from '../src/game/world.ts';
import { STAGES } from '../src/core/levels.ts';

export function botFight(stage: number, maxT = 240, seedLog = false): { won: boolean; time: number; hurts: number; deaths: number } {
  const w = new World(stage);
  // 보스 방 바로 앞으로
  w.p.b.x = w.arenaX - 16; w.p.b.y = (w.grid.h - 5) * 16; w.respawnX = w.p.b.x; w.respawnY = w.p.b.y;
  let hurts = 0, deaths = 0, jumpHeld = 0, wasJump = false;
  const dt = 1 / 120;
  for (let t = 0; t < maxT; t += dt) {
    const p = w.p, bo = w.boss!, pb = p.b;
    const inp: Input = { left: false, right: false, down: false, jump: false, jumpPressed: false, barkPressed: false };
    const pcx = pb.x + pb.w / 2;
    let wantJump = false;
    if (!w.locked) { inp.right = true; if (pb.onGround && Math.random() < 0.02) wantJump = true; }
    else if (bo.hp > 0) {
      const bcx = bo.b.x + bo.b.w / 2, dx = bcx - pcx, adx = Math.abs(dx);
      if (bo.mode === 'stun' && bo.inv <= 0) {
        // 다가가서 위에서 밟기
        if (adx > 4) { if (dx > 0) inp.right = true; else inp.left = true; }
        if (pb.onGround && adx < 46) wantJump = true;
        if (!pb.onGround && pb.vy < 0) wantJump = true;   // 높게
      } else {
        // 떨어져 있기 (벽에 몰리면 반대쪽으로 넘어가기)
        const lo = w.arenaX + 24, hi = w.arenaX + 19 * 16;
        const away = dx > 0 ? -1 : 1;
        const room = away < 0 ? pcx - lo : hi - pcx;
        if (adx < 110) { if (room > 30) { if (away < 0) inp.left = true; else inp.right = true; } else { if (away < 0) inp.right = true; else inp.left = true; if (pb.onGround && adx < 70) wantJump = true; } }
        if (adx < 60 && pb.onGround && (bo.state === 'charge' || bo.state === 'prowl' || bo.state === 'dive')) wantJump = true;
        // 박쥐·고양이: 몸을 돌려 멍! (짖는 건 보는 쪽으로만)
        const barkable = bo.kind === 'bat' ? (bo.state === 'dive' || bo.state === 'wind' || bo.b.y + bo.b.h > pb.y - 18) : bo.kind === 'cat' ? bo.b.onGround : false;
        if (barkable && adx < 64) {
          const face = dx > 0 ? 1 : -1;
          inp.left = face < 0; inp.right = face > 0;
          if (p.dir === face) inp.barkPressed = true;
        }
      }
      for (const q of w.proj) {
        if (q.warn > 0) { if (Math.abs(q.x - pcx) < 14) { if (q.x > pcx) inp.left = true; else inp.right = true; } continue; }
        const qx = q.x + q.w / 2, qy = q.y + q.h / 2;
        const coming = (q.vx > 0 && qx < pcx) || (q.vx < 0 && qx > pcx);
        if (coming && Math.abs(qx - pcx) < 34 && Math.abs(qy - (pb.y + pb.h / 2)) < 24 && pb.onGround) wantJump = true;
        if (q.vy > 0 && Math.abs(qx - pcx) < 14 && qy < pb.y) { inp.left = qx > pcx; inp.right = !inp.left; }
      }
    }
    if (wantJump) jumpHeld = 0.25;
    inp.jump = jumpHeld > 0; jumpHeld -= dt;
    inp.jumpPressed = inp.jump && !wasJump; wasJump = inp.jump;
    w.update(dt, inp);
    for (const e of w.events) { if (e === 'hurt') hurts++; if (e === 'dead') deaths++; }
    w.events.length = 0;
    if (w.done > 0.5) { if (seedLog) console.log(STAGES[stage].bossName, '이김', t.toFixed(1)); return { won: true, time: t, hurts, deaths }; }
  }
  return { won: false, time: maxT, hurts, deaths };
}

const argv1 = (globalThis as { process?: { argv: string[] } }).process?.argv[1];
if (import.meta.url === `file://${argv1}`) {
  for (let i = 0; i < STAGES.length; i++) {
    const rs = Array.from({ length: 5 }, () => botFight(i));
    const won = rs.filter((r) => r.won);
    console.log(`${i + 1} ${STAGES[i].bossName.padEnd(8)} 이김 ${won.length}/5  평균 ${(won.reduce((s, r) => s + r.time, 0) / (won.length || 1)).toFixed(1)}초  맞음 ${(rs.reduce((s, r) => s + r.hurts, 0) / 5).toFixed(1)}  쓰러짐 ${(rs.reduce((s, r) => s + r.deaths, 0) / 5).toFixed(1)}`);
  }
}
