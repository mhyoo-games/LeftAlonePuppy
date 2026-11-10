import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Grid, assemble, ROWS, TILE } from '../src/core/map.ts';
import { STAGES, CHUNKS, stageRows, arenaStart } from '../src/core/levels.ts';
import { reachable, grabbable, cellKey, standable } from '../src/core/reach.ts';
import { moveBody, jumpReach, PHYS, type Body } from '../src/core/physics.ts';
import { parseSave, clearStage, newSave, unlocked } from '../src/core/save.ts';

test('조각은 줄 길이가 맞고, 땅 무늬는 쓸 수 있는 글자만', () => {
  for (const [k, c] of Object.entries(CHUNKS)) {
    assert.ok(/^[#.~]+$/.test(c.g), k);
    for (const r of c.r) assert.ok(r.length <= c.g.length, `${k}: 줄이 땅보다 김`);
  }
});

test('맵 조립: 14줄, 모든 줄 같은 길이', () => {
  const rows = assemble([CHUNKS.start, CHUNKS.flat]);
  assert.equal(rows.length, ROWS);
  assert.ok(rows.every((r) => r.length === CHUNKS.start.g.length + CHUNKS.flat.g.length));
});

test('점프 물리: 2칸은 넉넉히 오르고, 구덩이 3칸은 건넌다', () => {
  const { up, across } = jumpReach();
  assert.ok(up > TILE * 2.6 && up < TILE * 4, String(up));
  assert.ok(across > TILE * 4, String(across));
  assert.ok(PHYS.spring ** 2 / (2 * PHYS.gravity) > TILE * 7.2, '스프링은 7칸 넘게');
});

test('충돌: 떨어지면 땅 위에 서고, 벽을 뚫지 않는다', () => {
  const g = new Grid(['....', '....', '..#.', '####']);
  const b: Body = { x: 2, y: 0, w: 12, h: 14, vx: 0, vy: 0, onGround: false };
  for (let i = 0; i < 120; i++) { b.vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity / 60); moveBody(b, 1 / 60, g); }
  assert.ok(b.onGround);
  assert.equal(b.y + b.h, 3 * TILE);
  b.vx = 400;
  for (let i = 0; i < 60; i++) moveBody(b, 1 / 60, g);
  assert.ok(b.x + b.w <= 2 * TILE + 0.01, '벽 앞에서 멈춤');
});

test('판자는 위에서만 밟힌다', () => {
  const g = new Grid(['....', '====', '....', '####']);
  const up: Body = { x: 2, y: 2 * TILE + 1, w: 12, h: 14, vx: 0, vy: -200, onGround: false };
  moveBody(up, 1 / 60, g);
  assert.ok(up.y < 2 * TILE, '아래에서 위로는 통과');
  const down: Body = { x: 2, y: 0, w: 12, h: 14, vx: 0, vy: 0, onGround: false };
  for (let i = 0; i < 60; i++) { down.vy += PHYS.gravity / 60; moveBody(down, 1 / 60, g); }
  assert.equal(down.y + down.h, TILE, '위에서는 판자에 선다');
});

for (const s of STAGES) {
  test(`${s.id}. ${s.name}: 시작·쉼터·보스·숨은 물건이 하나씩, 끝까지 갈 수 있음`, () => {
    const g = new Grid(stageRows(s));
    assert.equal(g.find('P').length, 1, '시작점');
    assert.equal(g.find('X').length, 1, '보스');
    assert.equal(g.find('M').length, 1, '숨은 물건');
    assert.ok(g.find('C').length >= 1, '쉼터');
    const [[px, py]] = g.find('P');
    const seen = reachable(g, px, py);
    // 보스 방까지
    const ax = arenaStart(s);
    const inArena = [...seen].some((k) => k % 10000 >= ax + 2);
    assert.ok(inArena, '보스 방에 닿음');
    // 숨은 물건·쉼터
    const [[mx, my]] = g.find('M');
    assert.ok(grabbable(seen, mx, my), `숨은 물건(${mx},${my})을 집을 수 있음`);
    for (const [cx, cy] of g.find('C')) assert.ok(seen.has(cellKey(cx, cy)), '쉼터에 닿음');
    // 뼈다귀의 대부분은 집을 수 있어야
    const bones = g.find('b');
    const ok = bones.filter(([x, y]) => grabbable(seen, x, y)).length;
    assert.ok(ok >= bones.length * 0.9, `뼈다귀 ${ok}/${bones.length}`);
    assert.ok(bones.length >= 20, '뼈다귀가 넉넉히');
    assert.ok(g.w >= 160, '충분히 긴 스테이지');
  });
}

test('스테이지 8개, 보스·물건이 모두 다름', () => {
  assert.equal(STAGES.length, 8);
  assert.equal(new Set(STAGES.map((s) => s.boss)).size, 8);
  assert.equal(new Set(STAGES.map((s) => s.memory)).size, 8);
});

test('서는 칸: 가시·물 위에는 못 선다', () => {
  const g = new Grid(['....', '.^~.', '####']);
  assert.ok(standable(g, 0, 1));
  assert.ok(!standable(g, 1, 1));
  assert.ok(!standable(g, 2, 1));
});

test('저장: 망가진 글은 처음부터, 깬 기록·물건·뼈다귀', () => {
  assert.deepEqual(parseSave('엉망'), newSave());
  let s = clearStage(newSave(), 1, 30, true);
  s = clearStage(s, 1, 10, false);
  assert.equal(s.cleared, 1);
  assert.equal(s.memories[0], true);
  assert.equal(s.bones, 40);
  assert.equal(s.best[0], 30);
  assert.ok(unlocked(s, 2) && !unlocked(s, 3));
  assert.deepEqual(parseSave(JSON.stringify(s)), s);
  assert.equal(parseSave(JSON.stringify({ cleared: 99 })).cleared, 8);
});

// ── 게임 진행 (World) ──
import { World, josa } from '../src/game/world.ts';
import { ENEMY, BOSS } from '../src/gfx/critters.ts';
import { botFight } from '../scripts/bossbot.ts';

test('조사: 받침에 따라 이/가, 을/를', () => {
  assert.equal(josa('꼬꼬대장', '이', '가'), '꼬꼬대장이');
  assert.equal(josa('까마귀 왕', '이', '가'), '까마귀 왕이');
  assert.equal(josa('집게왕', '을', '를'), '집게왕을');
  assert.equal(josa('크레파스', '을', '를'), '크레파스를');
  assert.equal(josa('검은발 대장', '이', '가'), '검은발 대장이');
});

test('스테이지마다 쓰는 적 모습·보스 그림이 모두 있다', () => {
  for (const s of STAGES) {
    for (const [k, name] of Object.entries(s.look)) assert.ok(ENEMY[name], `${s.name} ${k}: ${name} 그림 없음`);
    assert.ok(BOSS[s.boss], s.boss);
  }
  for (const n of ['bone', 'heart', 'memory', 'firefly', 'star', 'bowl', 'pinecone', 'icicle', 'rock']) assert.ok(ENEMY[n], n);
});

test('모든 스테이지가 열리고, 콩이가 땅 위에서 시작한다', () => {
  for (let i = 0; i < STAGES.length; i++) {
    const w = new World(i);
    const idle = { left: false, right: false, down: false, jump: false, jumpPressed: false, barkPressed: false };
    for (let k = 0; k < 120; k++) w.update(1 / 60, idle);
    assert.ok(w.p.b.onGround, `${STAGES[i].name}: 시작 자리에서 서 있지 못함`);
    assert.equal(w.p.hp, w.p.maxHp, `${STAGES[i].name}: 가만히 있는데 다침`);
  }
});

test('보스 방에 들어가면 근처 작은 적은 달아난다', () => {
  const w = new World(1);
  w.p.b.x = w.arenaX + 40; w.p.b.y = (w.grid.h - 5) * TILE;
  w.update(1 / 60, { left: false, right: true, down: false, jump: false, jumpPressed: false, barkPressed: false });
  assert.ok(w.locked);
  assert.ok(w.enemies.every((e) => e.dead || e.b.x < w.arenaX - w.viewW));
});

test('간단한 봇도 보스 8마리를 모두 이길 수 있다 (너무 어렵지 않게)', () => {
  for (let i = 0; i < STAGES.length; i++) {
    const tries = [botFight(i), botFight(i), botFight(i)];
    assert.ok(tries.some((r) => r.won), `${STAGES[i].bossName}: 봇이 한 번도 못 이김`);
  }
});
