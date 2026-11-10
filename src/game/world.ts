// 한 스테이지의 진행 (화면과 분리: 그리기는 render.ts)
import { Grid, TILE } from '../core/map.ts';
import { STAGES, stageRows, arenaStart, type Stage } from '../core/levels.ts';
import { PHYS, moveBody, groundAhead, overlap, type Body } from '../core/physics.ts';

export interface Input { left: boolean; right: boolean; down: boolean; jump: boolean; jumpPressed: boolean; barkPressed: boolean }

export type PlayerState = 'normal' | 'hurt' | 'dead' | 'win';
export interface Player {
  b: Body; dir: 1 | -1; hp: number; maxHp: number; inv: number; barkT: number; barkCd: number;
  coyote: number; buffer: number; air: number; cut: boolean; drop: number; state: PlayerState; t: number; anim: number;
  safeX: number; safeY: number; safeT: number; onPlat: Plat | null; flip: number;
}
export interface Enemy {
  kind: 'w' | 'h' | 'f' | 'd' | 'r' | 's' | 't'; look: string; b: Body; dir: 1 | -1; t: number; stun: number; alert: number;
  dead: boolean; ax: number; ay: number; phase: number; respawn: number; state: string;
}
export interface Item { kind: 'bone' | 'heart' | 'memory' | 'firefly'; x: number; y: number; got: boolean; t: number }
export interface Plat { kind: '-' | '|' | '_'; x: number; y: number; w: number; h: number; ox: number; oy: number; t: number; dx: number; dy: number; fall: number; gone: number; vy: number }
export interface Spring { x: number; y: number; squash: number }
export interface Check { x: number; y: number; on: boolean }
export interface Proj { kind: string; x: number; y: number; w: number; h: number; vx: number; vy: number; grav: number; life: number; warn: number; dead: boolean }
export interface Fx { kind: 'dust' | 'star' | 'spark' | 'text' | 'poof' | 'splash'; x: number; y: number; vx: number; vy: number; life: number; max: number; text?: string; color?: string }

export interface Boss {
  kind: Stage['boss']; b: Body; hp: number; max: number; dir: 1 | -1; state: string; t: number; inv: number;
  mode: 'move' | 'wind' | 'stun'; prevMode?: 'move' | 'wind' | 'stun'; frame: number; count: number; shake: number; awake: boolean; dead: number; flash: number;
}

const BOSS_SIZE: Record<string, [number, number]> = {
  rooster: [26, 28], crow: [28, 18], boar: [34, 24], crayfish: [38, 22], bat: [30, 18], goat: [30, 28], bulldog: [36, 26], cat: [32, 22],
};

/** 받침에 맞는 조사 (꼬꼬대장이 / 까마귀 왕이 / 털장갑을 / 크레파스를) */
export function josa(word: string, withFinal: string, without: string): string {
  const c = word.charCodeAt(word.length - 1);
  const has = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
  return word + (has ? withFinal : without);
}

/** 던지는 적의 모습 → 던지는 것 */
const THROWN: Record<string, string> = { squirrel: 'acorn', chick: 'acorn', frog: 'drop', mole: 'pebble', rabbit: 'snowbit', raccoon: 'pebble', owl: 'acorn' };

export class World {
  stage: Stage;
  grid: Grid;
  p: Player;
  enemies: Enemy[] = [];
  items: Item[] = [];
  plats: Plat[] = [];
  springs: Spring[] = [];
  checks: Check[] = [];
  proj: Proj[] = [];
  fx: Fx[] = [];
  decor: Array<{ x: number; y: number; kind: 'D' | 'T'; seed: number }> = [];
  boss: Boss | null = null;
  arenaX: number;
  locked = false;
  bones = 0;
  totalBones = 0;
  memory = false;
  light = 70;
  cam = { x: 0, y: 0, shake: 0 };
  time = 0;
  events: string[] = [];
  toast = ''; toastT = 0;
  done = 0;            // 보스를 이긴 뒤 흐른 시간 (2.5초 지나면 끝)
  respawnX: number; respawnY: number;
  readonly viewW: number; readonly viewH: number;

  constructor(stageIndex: number, viewW = 320, viewH = 180) {
    this.viewW = viewW; this.viewH = viewH;
    this.stage = STAGES[stageIndex];
    const raw = new Grid(stageRows(this.stage));
    this.grid = raw.terrainOnly();
    this.arenaX = arenaStart(this.stage) * TILE;
    let px = 32, py = 100;
    let n = 0;
    for (let y = 0; y < raw.h; y++) for (let x = 0; x < raw.w; x++) {
      const c = raw.at(x, y), cx = x * TILE, cy = y * TILE;
      switch (c) {
        case 'P': px = cx; py = cy; break;
        case 'b':
          // 동굴은 뼈다귀 넷 중 하나를 반딧불로
          if (this.stage.dark && n++ % 4 === 1) this.items.push({ kind: 'firefly', x: cx + 8, y: cy + 8, got: false, t: x });
          else { this.items.push({ kind: 'bone', x: cx + 8, y: cy + 8, got: false, t: x }); this.totalBones++; }
          break;
        case 'H': this.items.push({ kind: 'heart', x: cx + 8, y: cy + 8, got: false, t: x }); break;
        case 'M': this.items.push({ kind: 'memory', x: cx + 8, y: cy + 8, got: false, t: x }); break;
        case 'F': this.items.push({ kind: 'firefly', x: cx + 8, y: cy + 8, got: false, t: x }); break;
        case 'S': this.springs.push({ x: cx, y: cy + 8, squash: 0 }); break;
        case 'C': this.checks.push({ x: cx, y: cy, on: false }); break;
        case '-': case '|': case '_': {
          const w = c === '_' ? 28 : 32;  // 떨어지는 발판도 넉넉하게 (사이 20px)
          this.plats.push({ kind: c, x: cx + 8 - w / 2, y: cy, w, h: 6, ox: cx + 8 - w / 2, oy: cy, t: x * 0.7, dx: 0, dy: 0, fall: 0, gone: 0, vy: 0 });
          break;
        }
        case 'D': case 'T': this.decor.push({ x: cx, y: cy, kind: c, seed: x * 31 + y * 7 }); break;
        case 'X': this.spawnBoss(cx, cy); break;
        case 'w': case 'h': case 'f': case 'd': case 'r': case 's': case 't': this.spawnEnemy(c, cx, cy); break;
      }
    }
    this.p = {
      b: { x: px + 1, y: py + 2, w: 14, h: 14, vx: 0, vy: 0, onGround: false }, dir: 1, hp: 3, maxHp: 3, inv: 0, barkT: 0, barkCd: 0,
      coyote: 0, buffer: 0, air: 1, cut: false, drop: 0, state: 'normal', t: 0, anim: 0, safeX: px, safeY: py, safeT: 0, onPlat: null, flip: 0,
    };
    this.respawnX = px; this.respawnY = py;
    this.cam.x = Math.max(0, px - viewW / 3);
    this.cam.y = this.grid.h * TILE - viewH;
  }

  private spawnEnemy(c: Enemy['kind'], x: number, y: number): void {
    const look = this.stage.look[c];
    const size: Record<string, [number, number]> = { w: [15, 11], h: [14, 11], f: [16, 11], d: [9, 12], r: [14, 14], s: [16, 11], t: [14, 13] };
    const [w, h] = size[c];
    this.enemies.push({ kind: c, look, b: { x: x + (16 - w) / 2, y: y + 16 - h, w, h, vx: 0, vy: 0, onGround: false }, dir: -1, t: Math.random() * 2, stun: 0, alert: 0, dead: false, ax: x, ay: y, phase: x * 0.13, respawn: 0, state: c === 'd' ? 'hang' : c === 'r' ? 'spawner' : 'go' });
  }

  private spawnBoss(x: number, y: number): void {
    const [w, h] = BOSS_SIZE[this.stage.boss];
    this.boss = { kind: this.stage.boss, b: { x, y: y + 16 - h, w, h, vx: 0, vy: 0, onGround: false }, hp: this.stage.bossHp, max: this.stage.bossHp, dir: -1, state: 'idle', t: 0, inv: 0, mode: 'move', frame: 0, count: 0, shake: 0, awake: false, dead: 0, flash: 0 };
  }

  say(t: string): void { this.toast = t; this.toastT = 2.6; }
  ev(e: string): void { this.events.push(e); }
  puff(kind: Fx['kind'], x: number, y: number, n = 1, opt: Partial<Fx> = {}): void {
    for (let i = 0; i < n; i++) this.fx.push({ kind, x, y, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 60 - 10, life: 0.5, max: 0.5, ...opt });
  }

  // ───────────── 진행 ─────────────
  update(dt: number, inp: Input): void {
    this.time += dt;
    if (this.toastT > 0) this.toastT -= dt;
    this.updatePlats(dt);
    this.updatePlayer(dt, inp);
    this.updateEnemies(dt);
    if (this.boss) this.updateBoss(dt);
    this.updateProj(dt);
    this.updateItems(dt);
    for (const s of this.springs) s.squash = Math.max(0, s.squash - dt * 4);
    for (const f of this.fx) { f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.kind !== 'text') f.vy += 200 * dt; }
    this.fx = this.fx.filter((f) => f.life > 0);
    this.updateCamera(dt);
    if (this.boss && this.boss.hp <= 0) {
      this.done += dt;
      if (this.done > 0.05 && this.p.state === 'normal') { this.p.state = 'win'; this.ev('win'); }
    }
  }

  private updatePlats(dt: number): void {
    for (const pl of this.plats) {
      const px = pl.x, py = pl.y;
      if (pl.kind === '-') { pl.t += dt; pl.x = pl.ox + Math.sin(pl.t * 0.9) * 48; }
      else if (pl.kind === '|') { pl.t += dt; pl.y = pl.oy - (1 - Math.cos(pl.t * 0.8)) * 26; }
      else {
        if (pl.gone > 0) { pl.gone -= dt; if (pl.gone <= 0) { pl.x = pl.ox; pl.y = pl.oy; pl.fall = 0; pl.vy = 0; } }
        else if (pl.fall > 0) { pl.fall += dt; if (pl.fall > 0.6) { pl.vy += PHYS.gravity * dt * 0.6; pl.y += pl.vy * dt; if (pl.y > this.grid.h * TILE + 40) pl.gone = 2.5; } }
      }
      pl.dx = pl.x - px; pl.dy = pl.y - py;
    }
  }

  private platAt(b: Body, prevBottom: number): Plat | null {
    for (const pl of this.plats) {
      if (pl.gone > 0) continue;
      if (b.x + b.w > pl.x + 1 && b.x < pl.x + pl.w - 1 && prevBottom <= pl.y + 1 + Math.max(0, pl.dy) && b.y + b.h >= pl.y && b.vy >= 0) return pl;
    }
    return null;
  }

  private updatePlayer(dt: number, inp: Input): void {
    const p = this.p, b = p.b, st = this.stage;
    p.t += dt; p.inv = Math.max(0, p.inv - dt); p.barkCd = Math.max(0, p.barkCd - dt); p.barkT = Math.max(0, p.barkT - dt); p.drop = Math.max(0, p.drop - dt);
    if (p.state === 'dead') {
      b.vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity * dt); b.y += b.vy * dt;
      if (p.t > 1.6) this.restart();
      return;
    }
    if (p.state === 'win') { b.vx *= 0.9; b.vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity * dt); moveBody(b, dt, this.grid); return; }
    const ice = st.ice, rain = st.rain;
    const want = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const hurtLock = p.state === 'hurt' && p.inv > 0.9;
    if (want && !hurtLock) {
      p.dir = want > 0 ? 1 : -1;
      const acc = b.onGround ? (ice ? PHYS.iceAccel : PHYS.accel) : PHYS.airAccel;
      b.vx += want * acc * dt;
      if (Math.abs(b.vx) > PHYS.run) b.vx = Math.sign(b.vx) * Math.max(PHYS.run, Math.abs(b.vx) - acc * dt);
    } else if (b.onGround) {
      const fr = ice ? PHYS.iceFriction : rain ? 700 : PHYS.friction;
      b.vx = Math.sign(b.vx) * Math.max(0, Math.abs(b.vx) - fr * dt);
    }
    if (st.wind && !this.locked) b.vx += st.wind * dt * (b.onGround ? 1.2 : 2);
    // 점프 (땅을 막 벗어나도·땅에 닿기 직전에 눌러도 되게)
    p.coyote = b.onGround ? PHYS.coyote : p.coyote - dt;
    p.buffer = inp.jumpPressed ? PHYS.buffer : p.buffer - dt;
    if (b.onGround) p.air = 1;
    if (p.buffer > 0 && p.coyote > 0 && !hurtLock) {
      if (inp.down && this.onOneway()) { p.drop = 0.25; }
      else { b.vy = -PHYS.jump; p.cut = false; this.ev('jump'); this.puff('dust', b.x + b.w / 2, b.y + b.h, 3); }
      p.buffer = 0; p.coyote = 0; b.onGround = false;
    } else if (inp.jumpPressed && p.coyote <= 0 && p.air > 0 && !hurtLock) {
      // 2단 점프 (공중에서 한 번 더)
      p.air--; p.buffer = 0; b.vy = -PHYS.jump2; p.cut = false; p.flip = 0.35;
      this.ev('jump2'); this.puff('spark', b.x + b.w / 2, b.y + b.h, 6, { color: '#fff4de', vy: 40 });
    }
    p.flip = Math.max(0, p.flip - dt);
    if (!inp.jump && b.vy < 0 && !p.cut) { b.vy *= PHYS.jumpCut; p.cut = true; }
    // 짖기
    if (inp.barkPressed && p.barkCd <= 0) { p.barkT = 0.32; p.barkCd = 0.5; this.ev('bark'); this.bark(); }
    // 움직이기
    b.vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity * dt);
    const prevBottom = b.y + b.h;
    if (p.onPlat) { b.x += p.onPlat.dx; b.y += p.onPlat.dy; }
    const res = moveBody(b, dt, this.grid, { dropThrough: p.drop > 0 });
    if (res.landed) { this.puff('dust', b.x + b.w / 2, b.y + b.h, 2); this.ev('land'); }
    // 움직이는 발판
    p.onPlat = null;
    if (p.drop <= 0) {
      const pl = this.platAt(b, prevBottom);
      if (pl) {
        b.y = pl.y - b.h; b.vy = 0; b.onGround = true; p.onPlat = pl;
        if (pl.kind === '_' && pl.fall === 0) { pl.fall = 0.001; this.ev('creak'); }
      }
    }
    // 스프링
    for (const s of this.springs) {
      if (b.vy >= 0 && overlap(b, { x: s.x + 1, y: s.y - 2, w: 14, h: 8 }) && prevBottom <= s.y + 4) {
        b.y = s.y - b.h; b.vy = -PHYS.spring; p.cut = true; p.air = 1; s.squash = 1; this.ev('spring');
      }
    }
    // 보스 방 잠금
    if (!this.locked && this.boss && b.x > this.arenaX + 24) { this.locked = true; this.boss.awake = true; this.ev('boss');
      // 보스 방 근처 작은 적은 달아난다 (보스와만 싸우게)
      for (const e of this.enemies) if (!e.dead && e.b.x > this.arenaX - this.viewW) { e.dead = true; e.respawn = 0; this.puff('poof', e.b.x + e.b.w / 2, e.b.y + e.b.h / 2, 6); }
      this.say(`${josa(this.stage.bossName, '이', '가')} 나타났다!`); }
    if (this.locked && b.x < this.arenaX) { b.x = this.arenaX; b.vx = Math.max(0, b.vx); }
    // 가시·물·구덩이
    const cx0 = Math.floor((b.x + 2) / TILE), cx1 = Math.floor((b.x + b.w - 2) / TILE), cy = Math.floor((b.y + b.h - 3) / TILE);
    let water = false, thorn = false;
    for (let x = cx0; x <= cx1; x++) { const c = this.grid.at(x, cy); if (c === '~') water = true; if (c === '^') thorn = true; }
    if (water) { this.puff('splash', b.x + b.w / 2, b.y + b.h, 8, { color: '#9fd3f0' }); this.ev('splash'); this.fallBack(); return; }
    if (b.y > this.grid.h * TILE + 8) { this.fallBack(); return; }
    if (thorn) this.hurt(b.x + b.w / 2 - p.dir * 4);
    // 안전한 자리 기억 (물·구덩이에 빠지면 여기로)
    if (b.onGround && !p.onPlat) {
      p.safeT += dt;
      const ok = this.grid.solid(cx0, cy + 1) && this.grid.solid(cx1, cy + 1);
      if (p.safeT > 0.25 && ok) { p.safeX = b.x; p.safeY = b.y; }
    } else p.safeT = 0;
    if (p.state === 'hurt' && p.inv <= 0.6) p.state = 'normal';
    p.anim += Math.abs(b.vx) * dt;
  }

  private onOneway(): boolean {
    const b = this.p.b;
    const ty = Math.floor((b.y + b.h + 1) / TILE);
    return this.grid.oneway(Math.floor((b.x + b.w / 2) / TILE), ty) || this.p.onPlat !== null;
  }

  /** 앞쪽을 짖으면: 적은 잠깐 굳고, 가시 적은 웅크린다. 일부 보스는 이때 기절 */
  private bark(): void {
    const p = this.p, b = p.b;
    const box = { x: p.dir > 0 ? b.x + b.w - 2 : b.x - 46, y: b.y - 14, w: 48, h: 34 };
    this.fx.push({ kind: 'text', x: b.x + b.w / 2 + p.dir * 16, y: b.y - 6, vx: p.dir * 20, vy: -20, life: 0.6, max: 0.6, text: '멍!' });
    for (const e of this.enemies) {
      if (e.dead || e.kind === 'r' || e.kind === 'd') continue;
      if (overlap(box, e.b)) { e.stun = e.kind === 's' ? 2.6 : 1.8; this.puff('star', e.b.x + e.b.w / 2, e.b.y, 3); }
    }
    for (const q of this.proj) if (!q.dead && q.kind.startsWith('nut:') && overlap(box, q)) { q.dead = true; this.puff('poof', q.x + q.w / 2, q.y + q.h / 2, 4); }
    const bo = this.boss;
    if (bo && bo.hp > 0 && bo.awake && overlap({ ...box, x: box.x - 30 * (p.dir > 0 ? 0 : 1), w: box.w + 30, y: box.y - 20, h: box.h + 30 }, bo.b)) this.bossBarked(bo);
  }

  hurt(fromX: number): void {
    const p = this.p;
    if (p.inv > 0 || p.state === 'dead' || p.state === 'win') return;
    p.hp--; p.inv = 1.3; p.state = 'hurt'; this.ev('hurt');
    p.b.vx = (p.b.x + p.b.w / 2 < fromX ? -1 : 1) * 130; p.b.vy = -200;
    this.cam.shake = 0.25;
    if (p.hp <= 0) { p.state = 'dead'; p.t = 0; p.b.vy = -260; this.ev('dead'); }
  }

  /** 물·구덩이: 하트 하나 잃고 안전한 자리로 */
  private fallBack(): void {
    const p = this.p;
    p.hp--; this.ev('hurt');
    if (p.hp <= 0) { p.state = 'dead'; p.t = 0; p.b.vy = -200; p.b.y = Math.min(p.b.y, this.grid.h * TILE); this.ev('dead'); return; }
    p.b.x = p.safeX; p.b.y = p.safeY; p.b.vx = 0; p.b.vy = 0; p.inv = 1.4; p.state = 'hurt';
  }

  /** 하트가 다 떨어지면 마지막 쉼터에서 다시 (하트 가득) */
  private restart(): void {
    const p = this.p;
    p.hp = p.maxHp; p.state = 'normal'; p.inv = 1.5; p.b.x = this.respawnX + 1; p.b.y = this.respawnY + 2; p.b.vx = 0; p.b.vy = 0; p.safeX = p.b.x; p.safeY = p.b.y;
    if (this.boss && this.locked) {
      // 보스 방에서 졌으면 보스 체력도 처음으로, 방 앞에서 다시
      this.locked = false; this.boss.hp = this.boss.max; this.boss.awake = false; this.boss.state = 'idle'; this.boss.mode = 'move';
      const [[bx, by]] = new Grid(stageRows(this.stage)).find('X');
      this.boss.b.x = bx * TILE; this.boss.b.y = by * TILE + 16 - this.boss.b.h; this.boss.b.vx = 0; this.boss.b.vy = 0;
      this.proj = [];
    }
    this.ev('respawn');
  }

  private updateEnemies(dt: number): void {
    const p = this.p;
    for (const e of this.enemies) {
      e.t += dt;
      if (e.dead) {
        if (e.kind === 'd' && e.respawn > 0) { e.respawn -= dt; if (e.respawn <= 0) { e.dead = false; e.state = 'hang'; e.b.x = e.ax + 3; e.b.y = e.ay + 4; e.b.vy = 0; } }
        continue;
      }
      if (Math.abs(e.b.x - p.b.x) > this.viewW * 1.2 && e.kind !== 'r') continue; // 멀리 있으면 쉬기
      const st = e.stun > 0;
      e.stun = Math.max(0, e.stun - dt);
      const b = e.b;
      switch (e.kind) {
        case 'w': case 's': {
          // 콩이를 보면 '!' 하고 쫓아온다 (같은 높이, 앞뒤 80px)
          const dx = p.b.x - b.x, seen = Math.abs(dx) < 84 && Math.abs(p.b.y - b.y) < 22 && p.state === 'normal';
          if (!st && seen && e.state !== 'chase' && e.alert <= 0) { e.state = 'chase'; e.alert = 0.5; e.t = 0; e.dir = dx > 0 ? 1 : -1; b.vy = -90; }
          if (e.state === 'chase' && (e.t > 2.2 || !seen && e.t > 0.8)) { e.state = 'go'; e.alert = -1.2; }
          e.alert = e.alert > 0 ? Math.max(0, e.alert - dt) : Math.min(0, e.alert + dt);
          if (!st) {
            const chase = e.state === 'chase' && e.alert <= 0;
            if (chase) e.dir = dx > 0 ? 1 : -1;
            b.vx = e.dir * (chase ? (e.kind === 's' ? 48 : 64) : e.kind === 's' ? 22 : 30);
            if (e.alert > 0) b.vx = 0;
            if (b.onGround && !groundAhead(b, e.dir, this.grid)) { if (chase) b.vx = 0; else { e.dir = -e.dir as 1 | -1; b.vx = 0; } }
          } else b.vx = 0;
          b.vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity * dt);
          if (moveBody(b, dt, this.grid).wall && e.state !== 'chase') e.dir = -e.dir as 1 | -1;
          break;
        }
        case 'h':
          b.vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity * dt);
          if (!st && b.onGround) {
            b.vx = 0;
            const near = Math.abs(p.b.x - b.x) < 120;
            if (e.t > (near ? 0.9 : 1.6)) { e.t = 0; e.dir = p.b.x < b.x ? -1 : 1; b.vy = near ? -300 : -230; b.vx = e.dir * (near ? 80 : 45); }
          }
          if (moveBody(b, dt, this.grid).wall) b.vx = -b.vx;
          break;
        case 'f':
          if (!st) {
            if (e.state === 'swoop') {
              // 콩이 쪽으로 내리꽂았다가
              b.x += b.vx * dt; b.y += b.vy * dt;
              if (e.t > 0.55 || this.grid.solid(Math.floor((b.x + b.w / 2) / TILE), Math.floor((b.y + b.h) / TILE))) { e.state = 'back'; e.t = 0; }
            } else if (e.state === 'back') {
              // 제자리로 돌아감
              const tx = e.ax + Math.sin(e.phase * 0.9) * 46, ty = e.ay - 6;
              b.x += (tx - b.x) * Math.min(1, dt * 3); b.y += (ty - b.y) * Math.min(1, dt * 3);
              if (e.t > 1.4) { e.state = 'go'; e.t = 0; }
            } else if (e.state !== 'aim') {
              e.phase += dt;
              b.x = e.ax + Math.sin(e.phase * 0.9) * 46;
              b.y = e.ay - 6 + Math.sin(e.phase * 2.3) * 7;
              e.dir = Math.cos(e.phase * 0.9) > 0 ? 1 : -1;
              const dx = p.b.x + p.b.w / 2 - (b.x + b.w / 2), dy = p.b.y - b.y;
              if (e.t > 2 && Math.abs(dx) < 56 && dy > 10 && dy < 110 && p.state === 'normal') { e.state = 'aim'; e.t = 0; e.alert = 0.45; }
            }
            if (e.state === 'aim') {
              // 덮치기 전에 잠깐 멈춰 '!' (피할 틈)
              b.y = e.ay - 6 - Math.min(1, e.t * 3) * 4;
              if (e.t > 0.45) {
                const dx = p.b.x + p.b.w / 2 - (b.x + b.w / 2), dy = p.b.y - b.y;
                e.state = 'swoop'; e.t = 0; this.ev('swoop');
                const l = Math.hypot(dx, dy) || 1; b.vx = (dx / l) * 170; b.vy = (Math.max(20, dy) / l) * 170; e.dir = dx > 0 ? 1 : -1;
              }
            }
            e.alert = Math.max(0, e.alert - dt);
          }
          break;
        case 't': {
          // 던지는 적: 콩이가 보이면 포물선으로 던진다
          b.vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity * dt); b.vx = 0; moveBody(b, dt, this.grid);
          const dx = p.b.x + p.b.w / 2 - (b.x + b.w / 2);
          if (!st) {
            e.dir = dx > 0 ? 1 : -1;
            if (Math.abs(dx) < 170 && Math.abs(p.b.y - b.y) < 90 && e.t > 2.1 && p.state === 'normal') {
              e.t = 0; e.alert = 0.35;
              const T = 0.85, vx = Math.max(-150, Math.min(150, dx / T)), vy = (p.b.y - b.y - 0.5 * 700 * T * T) / T;
              this.proj.push({ kind: 'nut:' + (THROWN[e.look] ?? 'pebble'), x: b.x + b.w / 2 - 4, y: b.y - 2, w: 8, h: 8, vx, vy: Math.max(-330, vy), grav: 700, life: 3, warn: 0, dead: false });
              this.ev('throw');
            }
          }
          e.alert = Math.max(0, e.alert - dt);
          break;
        }
        case 'd': {
          if (e.state === 'hang') {
            b.x = e.ax + 3; b.y = e.ay + 4;
            const under = p.b.x + p.b.w > b.x - 18 && p.b.x < b.x + b.w + 18 && p.b.y > b.y;
            if (under) { e.state = 'shake'; e.t = 0; }
          } else if (e.state === 'shake') {
            b.x = e.ax + 3 + Math.sin(e.t * 60) * 1;
            if (e.t > 0.35) e.state = 'drop';
          } else {
            b.vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity * dt);
            const r = moveBody(b, dt, this.grid);
            if (b.onGround || r.landed || b.y > this.grid.h * TILE) { e.dead = true; e.respawn = 3; this.puff('poof', b.x + b.w / 2, b.y + b.h, 5); this.ev('break'); }
          }
          break;
        }
        case 'r': {
          // 굴러오는 것을 내보내는 자리: 플레이어가 가까우면 3초마다
          if (e.state === 'spawner') {
            const near = p.b.x > e.ax - this.viewW && p.b.x < e.ax + 32;
            if (near && e.t > 3.2) {
              e.t = 0;
              this.proj.push({ kind: 'roll:' + e.look, x: e.ax, y: e.ay + 2, w: 14, h: 14, vx: -72, vy: 0, grav: PHYS.gravity, life: 12, warn: 0, dead: false });
            }
          }
          break;
        }
      }
      // 플레이어와 부딪힘
      if (e.kind === 'r' && e.state === 'spawner') continue;
      if (p.state === 'dead' || p.state === 'win') continue;
      if (!overlap(p.b, b)) continue;
      const stomp = p.b.vy > 40 && p.b.y + p.b.h - b.y < 10;
      if (stomp && (e.kind !== 's' || st)) {
        e.dead = true; e.respawn = e.kind === 'd' ? 3 : 0;
        p.b.vy = -(PHYS.jump * 0.78); p.cut = false; p.air = 1;
        this.puff('star', b.x + b.w / 2, b.y, 5); this.ev('stomp');
      } else if (!st || e.kind === 'd') this.hurt(b.x + b.w / 2);
    }
  }

  private updateProj(dt: number): void {
    const p = this.p;
    for (const q of this.proj) {
      if (q.warn > 0) { q.warn -= dt; continue; }
      q.life -= dt;
      q.vy = Math.min(PHYS.maxFall, q.vy + q.grav * dt);
      if (q.kind.startsWith('roll:')) {
        const body: Body = { x: q.x, y: q.y, w: q.w, h: q.h, vx: q.vx, vy: q.vy, onGround: false };
        const r = moveBody(body, dt, this.grid);
        q.x = body.x; q.y = body.y; q.vy = body.vy;
        if (r.wall || q.y > this.grid.h * TILE) q.dead = true;
      } else { q.x += q.vx * dt; q.y += q.vy * dt; }
      if (q.life <= 0) q.dead = true;
      if (q.kind === 'icicle' || q.kind === 'pinecone' || q.kind === 'egg' || (q.kind.startsWith('nut:') && q.vy > 0)) {
        const gy = Math.floor((q.y + q.h) / TILE);
        if (this.grid.solid(Math.floor((q.x + q.w / 2) / TILE), gy)) { q.dead = true; this.puff('poof', q.x + q.w / 2, q.y + q.h, 5); this.ev('break'); }
      }
      if (!q.dead && p.state !== 'dead' && overlap(p.b, q)) {
        // 굴러오는 것은 밟으면 튕겨 오름
        if (q.kind.startsWith('roll:') && p.b.vy > 40 && p.b.y + p.b.h - q.y < 9) { p.b.vy = -PHYS.jump * 0.8; this.ev('stomp'); }
        else { this.hurt(q.x + q.w / 2); if (q.kind !== 'wave') q.dead = true; }
      }
    }
    this.proj = this.proj.filter((q) => !q.dead);
  }

  private updateItems(dt: number): void {
    const b = this.p.b;
    for (const it of this.items) {
      if (it.got) continue;
      it.t += dt;
      if (Math.abs(it.x - (b.x + b.w / 2)) < 12 && Math.abs(it.y - (b.y + b.h / 2)) < 13) {
        it.got = true;
        if (it.kind === 'bone') { this.bones++; this.ev('bone'); this.puff('spark', it.x, it.y, 3, { color: '#fff4de' }); }
        else if (it.kind === 'heart') { this.p.hp = Math.min(this.p.maxHp, this.p.hp + 1); this.ev('heart'); }
        else if (it.kind === 'firefly') { this.light = Math.min(116, this.light + 14); this.ev('bone'); this.puff('spark', it.x, it.y, 6, { color: '#fff6a8' }); }
        else { this.memory = true; this.ev('memory'); this.say(`하나의 ${josa(this.stage.memory, '을', '를')} 찾았다!`); this.puff('spark', it.x, it.y, 14, { color: '#ffe36b' }); }
      }
    }
    for (const c of this.checks) {
      if (!c.on && Math.abs(c.x + 8 - (b.x + b.w / 2)) < 14 && Math.abs(c.y + 8 - (b.y + b.h / 2)) < 16) {
        c.on = true; this.respawnX = c.x; this.respawnY = c.y; this.p.hp = this.p.maxHp; this.ev('check');
        this.say('물을 마시고 기운이 났다! (여기서 다시 시작)');
      }
    }
  }

  private updateCamera(dt: number): void {
    const p = this.p.b;
    const maxX = this.grid.w * TILE - this.viewW;
    let tx = p.x + p.w / 2 - this.viewW * 0.42 + this.p.dir * 18;
    if (this.locked) tx = this.arenaX;
    tx = Math.max(0, Math.min(maxX, tx));
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * (this.locked ? 4 : 7));
    const maxY = this.grid.h * TILE - this.viewH;
    const ty = Math.max(0, Math.min(maxY, p.y + p.h / 2 - this.viewH * 0.55));
    this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 5);
    this.cam.shake = Math.max(0, this.cam.shake - dt);
  }

  // ───────────── 보스 ─────────────
  private bossBarked(bo: Boss): void {
    if (bo.mode === 'stun' || bo.inv > 0) return;
    if (bo.kind === 'bat' && bo.state !== 'fall') { bo.state = 'fall'; bo.t = 0; bo.mode = 'stun'; this.ev('bossStun'); this.puff('star', bo.b.x + bo.b.w / 2, bo.b.y, 6); }
    else if (bo.kind === 'cat' && bo.b.onGround) { bo.state = 'stun'; bo.t = 0; bo.mode = 'stun'; bo.b.vx = 0; this.ev('bossStun'); this.puff('star', bo.b.x + bo.b.w / 2, bo.b.y, 6); }
    else { bo.flash = 0.15; }
  }

  private hitBoss(bo: Boss): void {
    bo.hp--; bo.inv = 0.9; bo.flash = 0.3; this.cam.shake = 0.3;
    this.puff('star', bo.b.x + bo.b.w / 2, bo.b.y, 8);
    if (bo.hp <= 0) { bo.state = 'defeat'; bo.t = 0; bo.mode = 'stun'; bo.b.vy = -200; this.ev('bossDown'); this.say(`${josa(this.stage.bossName, '을', '를')} 이겼다!`); this.proj = []; return; }
    this.ev('bossHit');
    // 맞은 뒤 다시 움직이기 시작 (조금 더 빨라짐)
    bo.state = bo.kind === 'crow' || bo.kind === 'bat' ? 'rise' : 'walk'; bo.t = 0; bo.mode = 'move';
    if (bo.kind === 'cat') { bo.state = 'perch'; }
  }

  private updateBoss(dt: number): void {
    const bo = this.boss!, b = bo.b, p = this.p;
    bo.inv = Math.max(0, bo.inv - dt); bo.flash = Math.max(0, bo.flash - dt);
    bo.t += dt; bo.frame += dt;
    if (!bo.awake) { b.vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity * dt); moveBody(b, dt, this.grid); return; }
    if (bo.state === 'defeat') { bo.dead += dt; b.vy += PHYS.gravity * dt * 0.5; b.y += b.vy * dt; b.x += bo.dir * -20 * dt; return; }
    const speedUp = 1.1 + (bo.max - bo.hp) * 0.12;
    const left = this.arenaX + 4, right = this.arenaX + 20 * TILE - b.w - 4;
    const toward = (p.b.x + p.b.w / 2 < b.x + b.w / 2 ? -1 : 1) as 1 | -1;
    const fly = bo.kind === 'crow' || bo.kind === 'bat';
    const ground = () => { b.vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity * dt); return moveBody(b, dt, this.grid); };
    const clampX = () => { if (b.x < left) { b.x = left; return true; } if (b.x > right) { b.x = right; return true; } return false; };

    switch (bo.kind) {
      case 'rooster': case 'boar': case 'goat': {
        // 걷다가 → 몸을 웅크리고 → 돌진 → 벽에 부딪혀 어지러움
        if (bo.state === 'idle' || bo.state === 'walk') {
          bo.mode = 'move'; bo.dir = toward; b.vx = bo.dir * 42 * speedUp;
          if (bo.kind === 'boar' && b.onGround && p.b.y + p.b.h < b.y && Math.abs(p.b.x - b.x) < 50 && bo.t > 0.8) { b.vy = -330; bo.t = 0; }
          if (bo.t > 1.6 / speedUp) { bo.state = 'wind'; bo.t = 0; }
        } else if (bo.state === 'wind') {
          bo.mode = 'wind'; b.vx = 0; bo.dir = toward; if (bo.t > 0.6) { bo.state = 'charge'; bo.t = 0; this.ev('charge'); }
        } else if (bo.state === 'charge') {
          bo.mode = 'move'; b.vx = bo.dir * 200 * speedUp;
          if (Math.random() < dt * 20) this.puff('dust', b.x + b.w / 2, b.y + b.h, 1);
        } else if (bo.state === 'stun') {
          bo.mode = 'stun'; b.vx = 0; if (bo.t > 2.1) { bo.state = 'walk'; bo.t = 0; }
        }
        const r = ground();
        const hitWall = r.wall || clampX();
        if (bo.state === 'charge' && hitWall) {
          bo.state = 'stun'; bo.t = 0; this.cam.shake = 0.4; this.ev('thud');
          if (bo.kind !== 'rooster') this.rain(bo.kind === 'goat' ? 'icicle' : 'pinecone', bo.kind === 'goat' ? 4 : 3);
        }
        break;
      }
      case 'crow': case 'bat': {
        const top = (this.grid.h - 9) * TILE;
        if (bo.state === 'idle' || bo.state === 'fly') {
          bo.mode = 'move'; bo.state = 'fly';
          const cx = this.arenaX + 10 * TILE;
          if (bo.kind === 'crow') { b.x = cx - b.w / 2 + Math.sin(bo.t * 0.9 * speedUp) * 120; b.y = top + Math.sin(bo.t * 2.2) * 10; }
          else { b.x = cx - b.w / 2 + Math.sin(bo.t * 1.1 * speedUp) * 110; b.y = top + 10 + Math.sin(bo.t * 2.2 * speedUp) * 22; }
          bo.dir = Math.cos(bo.t) > 0 ? 1 : -1;
          if (bo.kind === 'crow' && bo.hp <= 2 && Math.floor(bo.t * 1.3) !== Math.floor((bo.t - dt) * 1.3)) this.proj.push({ kind: 'feather', x: b.x + b.w / 2, y: b.y + b.h, w: 8, h: 8, vx: 0, vy: 30, grav: 60, life: 5, warn: 0, dead: false });
          if (bo.t > 2.6 / speedUp) { bo.state = 'wind'; bo.t = 0; }
        } else if (bo.state === 'wind') {
          bo.mode = 'wind'; bo.dir = toward; if (bo.t > 0.5) { bo.state = 'dive'; bo.t = 0; this.ev('charge'); const dx = p.b.x - b.x, dy = p.b.y - b.y; const l = Math.hypot(dx, dy) || 1; b.vx = (dx / l) * 190 * speedUp; b.vy = (dy / l) * 190 * speedUp; }
        } else if (bo.state === 'dive') {
          bo.mode = 'move'; b.x += b.vx * dt; b.y += b.vy * dt;
          const gy = (this.grid.h - 3) * TILE - b.h;
          if (b.y >= gy) {
            b.y = gy; b.vx = 0; b.vy = 0;
            if (bo.kind === 'crow') { bo.state = 'stun'; bo.t = 0; this.cam.shake = 0.3; this.ev('thud'); } else { bo.state = 'rise'; bo.t = 0; }
          }
          if (bo.kind === 'bat' && bo.t > 1.2) { bo.state = 'rise'; bo.t = 0; }
          clampX();
        } else if (bo.state === 'fall') {
          b.vy += PHYS.gravity * dt; b.y += b.vy * dt; const gy = (this.grid.h - 3) * TILE - b.h; if (b.y >= gy) { b.y = gy; b.vy = 0; bo.state = 'stun'; bo.t = 0; this.ev('thud'); }
        } else if (bo.state === 'stun') {
          bo.mode = 'stun'; if (bo.t > 2) { bo.state = 'rise'; bo.t = 0; }
        } else if (bo.state === 'rise' || bo.state === 'walk') {
          bo.mode = 'move'; b.y -= 90 * dt; if (b.y <= top) { b.y = top; bo.state = 'fly'; bo.t = 0; }
        }
        break;
      }
      case 'crayfish': {
        if (bo.state === 'idle' || bo.state === 'walk') {
          bo.mode = 'move'; bo.dir = toward; b.vx = bo.dir * 26 * speedUp;
          if (Math.floor(bo.t * 0.7) !== Math.floor((bo.t - dt) * 0.7)) this.proj.push({ kind: 'bubble', x: b.x + (bo.dir > 0 ? b.w : 0), y: b.y + 4, w: 10, h: 10, vx: bo.dir * 60, vy: -30, grav: -6, life: 4, warn: 0, dead: false });
          if (Math.abs(p.b.x - b.x - b.w / 2) < 70 || bo.t > 3) { bo.state = 'wind'; bo.t = 0; }
        } else if (bo.state === 'wind') { bo.mode = 'wind'; b.vx = 0; if (bo.t > 0.7) { bo.state = 'slam'; bo.t = 0; this.ev('thud'); this.cam.shake = 0.25; } }
        else if (bo.state === 'slam') {
          bo.mode = 'stun'; b.vx = 0;
          const claw = { x: bo.dir > 0 ? b.x + b.w : b.x - 26, y: b.y + 4, w: 26, h: b.h - 4 };
          if (bo.t < 0.3 && overlap(p.b, claw)) this.hurt(claw.x + 13);
          if (bo.t > 1.7) { bo.state = 'walk'; bo.t = 0; }
        }
        ground(); clampX();
        break;
      }
      case 'bulldog': {
        if (bo.state === 'idle' || bo.state === 'walk') {
          bo.mode = 'move'; bo.dir = toward; b.vx = bo.dir * 38 * speedUp;
          if (bo.t > 1.4 / speedUp && b.onGround) { bo.state = 'wind'; bo.t = 0; }
        } else if (bo.state === 'wind') { bo.mode = 'wind'; b.vx = 0; if (bo.t > 0.45) { bo.state = 'jump'; bo.t = 0; b.vy = -390; b.vx = toward * Math.min(150, Math.abs(p.b.x - b.x) * 1.1); this.ev('jump'); } }
        else if (bo.state === 'jump') { bo.mode = 'move'; }
        else if (bo.state === 'stun') { bo.mode = 'stun'; b.vx = 0; if (bo.t > 1.9) { bo.state = 'walk'; bo.t = 0; } }
        const r = ground(); clampX();
        if (bo.state === 'jump' && r.landed && bo.t > 0.2) {
          bo.state = 'stun'; bo.t = 0; this.cam.shake = 0.5; this.ev('thud'); b.vx = 0;
          for (const d of [-1, 1]) this.proj.push({ kind: 'wave', x: b.x + b.w / 2 - 6, y: b.y + b.h - 10, w: 12, h: 10, vx: d * 150, vy: 0, grav: 0, life: 2.2, warn: 0, dead: false });
        }
        break;
      }
      case 'cat': {
        if (bo.state === 'idle' || bo.state === 'perch') {
          // 벽 위에 올라앉았다가
          bo.mode = 'move'; b.vx = 0; b.vy = 0;
          const side = bo.count % 2 ? right : left;
          b.x += (side - b.x) * Math.min(1, dt * 6); b.y += ((this.grid.h - 7) * TILE - b.y) * Math.min(1, dt * 6);
          bo.dir = toward;
          if (bo.t > 0.6 && bo.t - dt <= 0.6) this.proj.push({ kind: 'can', x: b.x + b.w / 2, y: b.y, w: 10, h: 10, vx: (p.b.x - b.x) * 0.9, vy: -200, grav: PHYS.gravity * 0.8, life: 3, warn: 0, dead: false });
          if (bo.t > 1.2 / speedUp) { bo.state = 'pounce'; bo.t = 0; b.vy = -260; b.vx = (p.b.x - b.x) * 1.4; this.ev('charge'); }
        } else if (bo.state === 'pounce') {
          bo.mode = 'move'; const r = ground(); clampX();
          if (b.onGround && bo.t > 0.2) { bo.state = 'prowl'; bo.t = 0; bo.count++; }
          void r;
        } else if (bo.state === 'prowl') {
          bo.mode = 'move'; bo.dir = toward; b.vx = bo.dir * 95 * speedUp; ground(); clampX();
          if (bo.t > 0.9) { if (bo.count % 3 === 0) { bo.state = 'stun'; bo.t = 0; } else { bo.state = 'perch'; bo.t = 0; } }
        } else if (bo.state === 'stun' || bo.state === 'walk') {
          bo.mode = 'stun'; b.vx = 0; ground(); if (bo.t > 1.8) { bo.state = 'perch'; bo.t = 0; bo.mode = 'move'; }
        }
        break;
      }
    }

    // 기절에서 막 깨어난 보스는 잠깐 안 아프게 (겹쳐 있다가 갑자기 맞지 않게)
    if (bo.prevMode === 'stun' && bo.mode !== 'stun') bo.inv = Math.max(bo.inv, 0.5);
    bo.prevMode = bo.mode;
    // 플레이어와 부딪힘: 기절했을 때 밟으면 한 대
    if (p.state === 'dead' || p.state === 'win') return;
    if (overlap(p.b, { x: b.x + 3, y: b.y + 2, w: b.w - 6, h: b.h - 2 })) {
      const fromTop = p.b.vy > 30 && p.b.y + p.b.h - b.y < 12;
      if (fromTop) {
        p.b.vy = -PHYS.jump * 0.95; p.cut = false; p.air = 1;
        if (bo.mode === 'stun' && bo.inv <= 0) this.hitBoss(bo); else this.ev('bonk');
      } else if (bo.mode !== 'stun' && bo.inv <= 0) this.hurt(b.x + b.w / 2);
    }
  }

  /** 보스 방 위에서 떨어지는 것 (그림자로 미리 알려 줌) */
  private rain(kind: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const x = this.arenaX + 32 + Math.random() * (20 * TILE - 80);
      this.proj.push({ kind, x, y: this.cam.y - 10, w: 8, h: 12, vx: 0, vy: 0, grav: PHYS.gravity * 0.7, life: 4, warn: 0.5 + i * 0.25, dead: false });
    }
  }
}
