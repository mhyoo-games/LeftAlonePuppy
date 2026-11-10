// 스테이지 그리기: 배경(테마별) → 땅 → 물건·적·보스·콩이 → 날씨·어둠 → 화면 위 정보
import { TILE } from '../core/map.ts';
import type { Theme } from '../core/levels.ts';
import type { World } from '../game/world.ts';
import { OUT } from './pix.ts';
import { frames, bossSprite } from './critters.ts';
import type { PupSprites, PupPose } from './puppy.ts';

export const VW = 320, VH = 180;

// Kenney Tiny Farm 묶음 그림 (12칸 × 11줄, 16px)
let sheet: HTMLImageElement | null = null;
export function loadSheet(src: string): Promise<void> {
  return new Promise((res) => { const im = new Image(); im.onload = () => { sheet = im; res(); }; im.onerror = () => res(); im.src = src; });
}
export function kenney(g: CanvasRenderingContext2D, i: number, x: number, y: number, s = 1, flip = false): void {
  if (!sheet) return;
  const sx = (i % 12) * 16, sy = Math.floor(i / 12) * 16;
  if (flip) { g.save(); g.translate(Math.round(x) + 16 * s, Math.round(y)); g.scale(-1, 1); g.drawImage(sheet, sx, sy, 16, 16, 0, 0, 16 * s, 16 * s); g.restore(); }
  else g.drawImage(sheet, sx, sy, 16, 16, Math.round(x), Math.round(y), 16 * s, 16 * s);
}
// 자주 쓰는 Kenney 칸 번호
export const K = { pine: 15, pineS: 27, bush: 39, deadTree: 2, sunflower: 83, wheat: 68, wheat2: 66, wheat3: 67, sprout: 64, carrot: 8, tomato: 44, cabbage: 54, rock: 77, rock2: 89, barrel: 85, crate: 75, sack: 74, bucket: 72, hay: 96, hay2: 97, trough: 110, girl: 108, farmer: 109, sheep: 120, cow: 121, chicken: 122, egg: 125, berry: 78, grass: 80, sapling: 81, can: 84, shovel: 86 };

interface Look { sky: [string, string]; far: string; mid: string; top: string; edge: string; body: string; dot: string; plank: string; thorn: string }
const LOOK: Record<Theme, Look> = {
  farm: { sky: ['#8fd3ff', '#e2f6ff'], far: '#a8dc8a', mid: '#84c669', top: '#84c669', edge: '#4e974c', body: '#eaa56c', dot: '#cf8254', plank: '#cf8254', thorn: '#4e974c' },
  field: { sky: ['#ffd88a', '#fff3d6'], far: '#f3cf72', mid: '#e8b84f', top: '#c6e58d', edge: '#84c669', body: '#eaa56c', dot: '#cf8254', plank: '#fdbe53', thorn: '#4e974c' },
  forest: { sky: ['#a7dcc0', '#e3f4e6'], far: '#6fae7a', mid: '#4e974c', top: '#4e974c', edge: '#2f6b45', body: '#b86542', dot: '#8a4a2e', plank: '#b86542', thorn: '#2f6b45' },
  river: { sky: ['#8cc8ff', '#dff1ff'], far: '#a9c7e6', mid: '#84c669', top: '#fec99c', edge: '#eaa56c', body: '#cf8254', dot: '#b86542', plank: '#5fb85a', thorn: '#4e974c' },
  cave: { sky: ['#1b1426', '#2c2140'], far: '#2a2038', mid: '#3a2d52', top: '#8b9bb4', edge: '#52607c', body: '#3f3a56', dot: '#2e2a42', plank: '#8b9bb4', thorn: '#b48cff' },
  snow: { sky: ['#bcd6f5', '#eef5ff'], far: '#e4ecf8', mid: '#ffffff', top: '#ffffff', edge: '#c0cbdc', body: '#8b9bb4', dot: '#6e7d99', plank: '#c0cbdc', thorn: '#cfe9ff' },
  town: { sky: ['#ffb27a', '#ffe2c2'], far: '#e59a73', mid: '#c97a55', top: '#c0cbdc', edge: '#8b9bb4', body: '#a0705a', dot: '#7f5444', plank: '#e5484d', thorn: '#8b9bb4' },
  city: { sky: ['#1f2742', '#3c4a6e'], far: '#2b3556', mid: '#36416a', top: '#8b9bb4', edge: '#52607c', body: '#3a4258', dot: '#2d3346', plank: '#8b9bb4', thorn: '#c0cbdc' },
};

const DECOR: Record<Theme, number[]> = {
  farm: [K.sunflower, K.sack, K.bucket, K.cabbage, K.carrot, K.hay2],
  field: [K.wheat, K.wheat2, K.wheat3, K.sunflower, K.sprout],
  forest: [K.bush, K.berry, K.rock, K.sapling, K.grass],
  river: [K.rock, K.grass, K.bush, K.sapling],
  cave: [K.rock, K.rock2],
  snow: [K.rock2, K.pineS],
  town: [K.barrel, K.crate, K.sack, K.bucket, K.trough],
  city: [K.crate, K.barrel, K.bucket],
};
const TREES: Record<Theme, number[]> = { farm: [K.pine, K.bush], field: [K.sunflower, K.wheat], forest: [K.pine, K.pineS], river: [K.bush, K.pineS], cave: [K.rock2], snow: [K.pineS, K.pine], town: [K.barrel, K.crate], city: [K.crate] };

function hash(n: number): number { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); return (n ^ (n >>> 15)) >>> 0; }

// ── 배경: 하늘 → 먼 산·건물 → 가까운 나무 (시차) ──
export function drawBackground(g: CanvasRenderingContext2D, theme: Theme, camX: number, t: number): void {
  const L = LOOK[theme];
  const grd = g.createLinearGradient(0, 0, 0, VH);
  grd.addColorStop(0, L.sky[0]); grd.addColorStop(1, L.sky[1]);
  g.fillStyle = grd; g.fillRect(0, 0, VW, VH);
  if (theme === 'farm' || theme === 'field' || theme === 'river' || theme === 'snow') {
    // 해와 구름
    g.fillStyle = theme === 'field' ? '#fff3b0' : '#fffbe0'; g.beginPath(); g.arc(250, 34, 14, 0, 7); g.fill();
    for (let i = 0; i < 4; i++) {
      const x = ((i * 110 - camX * 0.08 + t * 4) % 440 + 440) % 440 - 60;
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.beginPath(); g.ellipse(x, 30 + i * 9, 20, 6, 0, 0, 7); g.ellipse(x + 14, 26 + i * 9, 13, 6, 0, 0, 7); g.fill();
    }
  }
  if (theme === 'city') {
    g.fillStyle = '#fdf6c8'; g.beginPath(); g.arc(60, 30, 9, 0, 7); g.fill();
  }
  // 먼 언덕·산·건물
  const far = (k: number) => (((k - camX * 0.15) % 640) + 640) % 640 - 160;
  g.fillStyle = L.far;
  for (let i = 0; i < 5; i++) {
    const x = far(i * 160);
    if (theme === 'snow' || theme === 'river') { g.beginPath(); g.moveTo(x, 130); g.lineTo(x + 70, 50 + (i % 2) * 18); g.lineTo(x + 150, 130); g.fill(); if (theme === 'snow') { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x + 52, 72 + (i % 2) * 13); g.lineTo(x + 70, 50 + (i % 2) * 18); g.lineTo(x + 88, 72 + (i % 2) * 13); g.fill(); g.fillStyle = L.far; } }
    else if (theme === 'town' || theme === 'city') { for (let j = 0; j < 4; j++) { const h = 40 + ((i * 4 + j) * 37) % 50; g.fillRect(x + j * 38, 140 - h, 32, h); if (theme === 'city') { g.fillStyle = '#ffe58a'; for (let wy = 140 - h + 6; wy < 132; wy += 10) for (let wx = 4; wx < 28; wx += 9) if (hash(i * 97 + j * 13 + wy + wx) % 3 === 0) g.fillRect(x + j * 38 + wx, wy, 4, 5); g.fillStyle = L.far; } } }
    else if (theme === 'cave') { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 30, 40 + (i % 3) * 12); g.lineTo(x + 60, 0); g.fill(); g.beginPath(); g.moveTo(x + 80, 180); g.lineTo(x + 110, 120); g.lineTo(x + 140, 180); g.fill(); }
    else { g.beginPath(); g.ellipse(x + 80, 140, 110, 46 + (i % 2) * 14, 0, Math.PI, 0); g.fill(); }
  }
  // 가까운 층
  const mid = (k: number) => (((k - camX * 0.4) % 480) + 480) % 480 - 80;
  g.fillStyle = L.mid;
  if (theme === 'farm') {
    // 빨간 헛간 (Kenney 헛간 벽 + 코드 지붕)
    const x = mid(60);
    g.fillStyle = '#c34b35'; g.beginPath(); g.moveTo(x - 6, 104); g.lineTo(x + 24, 80); g.lineTo(x + 54, 104); g.fill();
    g.fillStyle = OUT; g.fillRect(x - 6, 104, 60, 2);
    for (const [i, row] of [[102, 0], [114, 1], [126, 2]] as const) for (let c = 0; c < 3; c++) kenney(g, i + c, x + c * 16, 106 + row * 16);
    kenney(g, K.cow, mid(260), 138); kenney(g, K.sheep, mid(300), 140, 1, true);
    for (let i = 0; i < 6; i++) kenney(g, K.pine, mid(140 + i * 70 + (i % 2) * 20), 126, 1);
  } else if (theme === 'field') {
    for (let i = 0; i < 24; i++) kenney(g, [K.wheat, K.wheat2, K.wheat3][i % 3], mid(i * 20), 140 - (i % 3) * 3);
  } else if (theme === 'forest') {
    for (let i = 0; i < 9; i++) kenney(g, i % 2 ? K.pine : K.pineS, mid(i * 54), 96 + (i % 3) * 6, 2);
  } else if (theme === 'river') {
    for (let i = 0; i < 7; i++) kenney(g, i % 3 ? K.bush : K.pineS, mid(i * 70), 132, 1);
  } else if (theme === 'snow') {
    for (let i = 0; i < 7; i++) { kenney(g, K.pine, mid(i * 70), 116, 2); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(mid(i * 70) + 10, 118, 12, 3); }
  } else if (theme === 'town') {
    for (let i = 0; i < 4; i++) { const x = mid(i * 120); g.fillStyle = '#f4f4f2'; g.fillRect(x, 112, 70, 34); g.fillStyle = ['#e5484d', '#3e9bd8', '#5fb85a', '#fdbe53'][i]; for (let k = 0; k < 7; k++) g.fillRect(x + k * 10, 106, 6, 10); g.fillStyle = '#ffffff'; for (let k = 0; k < 7; k++) g.fillRect(x + k * 10 + 6, 106, 4, 10); kenney(g, K.crate, x + 8, 130); kenney(g, K.barrel, x + 40, 130); }
  } else if (theme === 'city') {
    for (let i = 0; i < 6; i++) { const x = mid(i * 90); g.fillStyle = '#2d3554'; g.fillRect(x, 90, 50, 70); g.fillStyle = '#ffd96b'; for (let wy = 96; wy < 150; wy += 12) for (let wx = 6; wx < 44; wx += 12) if (hash(i * 31 + wy * 7 + wx) % 2) g.fillRect(x + wx, wy, 6, 7); }
  } else if (theme === 'cave') {
    for (let i = 0; i < 6; i++) { const x = mid(i * 90); g.fillStyle = '#6b52a0'; g.beginPath(); g.moveTo(x, 150); g.lineTo(x + 6, 128); g.lineTo(x + 12, 150); g.fill(); g.fillStyle = '#9d7ce0'; g.fillRect(x + 5, 132, 2, 8); }
  }
}

// ── 땅·판자·가시·물 ──
export function drawTiles(g: CanvasRenderingContext2D, w: World, t: number): void {
  const L = LOOK[w.stage.theme], gr = w.grid;
  const cx = Math.floor(w.cam.x), cy = Math.floor(w.cam.y);
  const x0 = Math.floor(cx / TILE) - 1, x1 = x0 + Math.ceil(VW / TILE) + 2;
  const y0 = Math.max(0, Math.floor(cy / TILE) - 1), y1 = Math.min(gr.h - 1, y0 + Math.ceil(VH / TILE) + 2);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const c = gr.at(x, y), sx = x * TILE - cx, sy = y * TILE - cy;
    if (c === '#') {
      g.fillStyle = L.body; g.fillRect(sx, sy, 16, 16);
      g.fillStyle = L.dot; const h = hash(x * 7 + y * 131);
      g.fillRect(sx + (h % 11) + 2, sy + ((h >> 4) % 9) + 4, 2, 2); g.fillRect(sx + ((h >> 8) % 10) + 3, sy + ((h >> 12) % 6) + 9, 1, 1);
      const openT = gr.at(x, y - 1) !== '#', openL = gr.at(x - 1, y) !== '#', openR = gr.at(x + 1, y) !== '#', openB = gr.at(x, y + 1) !== '#' && y + 1 < gr.h;
      if (openT) {
        g.fillStyle = L.top; g.fillRect(sx, sy, 16, 5);
        g.fillStyle = L.edge; g.fillRect(sx, sy + 5, 16, 1);
        if (w.stage.theme === 'farm' || w.stage.theme === 'field' || w.stage.theme === 'forest') { g.fillStyle = L.top; g.fillRect(sx + (h % 12), sy + 5, 3, 2); g.fillRect(sx + ((h >> 3) % 12), sy + 5, 2, 3); }
        g.fillStyle = OUT; g.fillRect(sx, sy, 16, 1);
      }
      g.fillStyle = OUT;
      if (openL) g.fillRect(sx, sy, 1, 16);
      if (openR) g.fillRect(sx + 15, sy, 1, 16);
      if (openB) g.fillRect(sx, sy + 15, 16, 1);
    } else if (c === '=') {
      if (w.stage.theme === 'river') { g.fillStyle = OUT; g.beginPath(); g.ellipse(sx + 8, sy + 3, 9, 3.5, 0, 0, 7); g.fill(); g.fillStyle = '#5fb85a'; g.beginPath(); g.ellipse(sx + 8, sy + 3, 8, 2.6, 0, 0, 7); g.fill(); g.fillStyle = '#ffa3b5'; g.fillRect(sx + 9, sy + 1, 2, 2); }
      else { g.fillStyle = OUT; g.fillRect(sx, sy, 16, 6); g.fillStyle = L.plank; g.fillRect(sx, sy + 1, 16, 4); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(sx, sy + 4, 16, 1); g.fillStyle = OUT; g.fillRect(sx + 7, sy + 1, 1, 4); }
    } else if (c === '^') {
      g.fillStyle = OUT;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(sx + k * 4 - 1, sy + 16); g.lineTo(sx + k * 4 + 2, sy + 6 + (k % 2) * 2); g.lineTo(sx + k * 4 + 5, sy + 16); g.fill(); }
      g.fillStyle = L.thorn;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(sx + k * 4, sy + 16); g.lineTo(sx + k * 4 + 2, sy + 8 + (k % 2) * 2); g.lineTo(sx + k * 4 + 4, sy + 16); g.fill(); }
    } else if (c === '~') {
      const top = gr.at(x, y - 1) !== '~';
      g.fillStyle = w.stage.theme === 'cave' ? '#2e4f8a' : '#5ab0e8'; g.fillRect(sx, sy + (top ? 4 : 0), 16, top ? 12 : 16);
      if (top) { g.fillStyle = '#bfe6ff'; for (let k = 0; k < 16; k += 4) g.fillRect(sx + k, sy + 3 + Math.round(Math.sin(t * 3 + (x * 16 + k) * 0.3)), 3, 2); }
    }
  }
}

// ── 장식·물건·발판·적·보스·콩이 ──
export function drawThings(g: CanvasRenderingContext2D, w: World, pup: PupSprites, t: number): void {
  const cx = Math.floor(w.cam.x), cy = Math.floor(w.cam.y);
  const vis = (x: number, pad = 32) => x > cx - pad && x < cx + VW + pad;
  const theme = w.stage.theme;
  for (const d of w.decor) {
    if (!vis(d.x)) continue;
    const list = d.kind === 'T' ? TREES[theme] : DECOR[theme];
    kenney(g, list[d.seed % list.length], d.x - cx, d.y - cy, 1, d.seed % 2 === 0);
  }
  // 쉼터 (물그릇)
  for (const c of w.checks) {
    if (!vis(c.x)) continue;
    const s = frames('bowl')[c.on ? 1 : 0];
    g.drawImage(s.r, c.x - cx, c.y + 7 - cy);
    if (c.on) { g.fillStyle = '#ffe36b'; g.fillRect(c.x - cx + 2, c.y - cy - 6, 1, 13); g.fillStyle = '#ff8fb0'; g.fillRect(c.x - cx + 3, c.y - cy - 6, 6, 4); }
  }
  // 스프링
  for (const s of w.springs) {
    if (!vis(s.x)) continue;
    const sq = Math.round(s.squash * 3);
    if (theme === 'farm' || theme === 'field') kenney(g, theme === 'farm' ? K.hay : K.hay2, s.x - cx, s.y - 8 - cy + sq);
    else {
      const col = theme === 'town' || theme === 'city' ? ['#e5484d', '#ffffff'] : ['#e5484d', '#fff4de'];
      g.fillStyle = OUT; g.fillRect(s.x - cx, s.y - cy + sq - 1, 16, 8 - sq);
      for (let k = 0; k < 4; k++) { g.fillStyle = col[k % 2]; g.fillRect(s.x - cx + 1 + k * 3.5, s.y - cy + sq, 4, 6 - sq); }
      g.fillStyle = OUT; g.fillRect(s.x - cx + 3, s.y - cy + 7, 2, 1 + sq); g.fillRect(s.x - cx + 11, s.y - cy + 7, 2, 1 + sq);
    }
  }
  // 움직이는 발판
  for (const p of w.plats) {
    if (p.gone > 0 || !vis(p.x)) continue;
    const x = Math.round(p.x - cx), y = Math.round(p.y - cy) + (p.kind === '_' && p.fall > 0 && p.fall < 0.6 ? Math.round(Math.sin(t * 60)) : 0);
    g.fillStyle = OUT; g.fillRect(x, y, p.w, 7);
    if (theme === 'river' && p.kind === '-') { g.fillStyle = '#b86542'; g.fillRect(x + 1, y + 1, p.w - 2, 5); g.fillStyle = '#eaa56c'; g.fillRect(x + 1, y + 1, 3, 5); g.fillRect(x + p.w - 4, y + 1, 3, 5); }
    else { g.fillStyle = p.kind === '_' ? '#c0cbdc' : LOOK[theme].plank; g.fillRect(x + 1, y + 1, p.w - 2, 4); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x + 1, y + 4, p.w - 2, 1); }
  }
  // 물건
  for (const it of w.items) {
    if (it.got || !vis(it.x)) continue;
    const bob = Math.round(Math.sin(t * 3 + it.t) * 1.5);
    const name = it.kind === 'bone' ? 'bone' : it.kind === 'heart' ? 'heart' : it.kind === 'firefly' ? 'firefly' : 'memory';
    const s = frames(name)[Math.floor(t * 3 + it.t) % 2];
    if (it.kind === 'firefly') { g.fillStyle = 'rgba(255,246,168,0.25)'; g.beginPath(); g.arc(it.x - cx, it.y - cy + bob, 8, 0, 7); g.fill(); }
    g.drawImage(s.r, Math.round(it.x - s.w / 2 - cx), Math.round(it.y - s.h / 2 - cy + bob));
  }
  // 떨어뜨리는 적이 매달린 곳 (나뭇가지·바위·처마)
  for (const e of w.enemies) {
    if (e.kind !== 'd' || !vis(e.ax)) continue;
    const x = Math.round(e.ax + 8 - cx), y = Math.round(e.ay - cy);
    const [main, top] = theme === 'cave' ? ['#52607c', '#8b9bb4'] : theme === 'snow' ? ['#8b9bb4', '#ffffff'] : theme === 'town' || theme === 'city' ? ['#c34b35', '#e5484d'] : ['#8a4a2e', theme === 'forest' || theme === 'river' ? '#4e974c' : '#b86542'];
    g.fillStyle = OUT; g.fillRect(x - 13, y - 1, 26, 6);
    g.fillStyle = main; g.fillRect(x - 12, y, 24, 4);
    g.fillStyle = top; g.fillRect(x - 12, y, 24, 2);
    if (theme === 'forest' || theme === 'river' || theme === 'farm' || theme === 'field') { g.fillStyle = OUT; g.fillRect(x - 5, y - 6, 3, 6); g.fillStyle = '#4e974c'; g.fillRect(x - 4, y - 5, 1, 5); }
    if (theme === 'town' || theme === 'city') { g.fillStyle = '#ffffff'; for (let k = -10; k < 12; k += 6) g.fillRect(x + k, y, 3, 2); }
  }
  // 적
  for (const e of w.enemies) {
    if (e.dead || (e.kind === 'r' && e.state === 'spawner') || !vis(e.b.x)) continue;
    const fr = frames(e.look);
    const curled = e.kind === 's' && e.stun > 0;
    const s = curled ? fr[2] : fr[e.stun > 0 ? 0 : Math.floor(t * 6 + e.phase) % 2];
    const x = Math.round(e.b.x + e.b.w / 2 - s.w / 2 - cx), y = Math.round(e.b.y + e.b.h - s.h - cy);
    g.drawImage(e.dir > 0 ? s.l : s.r, x, y);
    if (e.stun > 0) stars(g, e.b.x + e.b.w / 2 - cx, e.b.y - 4 - cy, t);
  }
  // 날아오는 것
  for (const q of w.proj) {
    const x = q.x - cx, y = q.y - cy;
    if (q.warn > 0) { g.fillStyle = 'rgba(63,38,49,0.35)'; g.beginPath(); g.ellipse(q.x + q.w / 2 - cx, (w.grid.h - 3) * TILE - cy, 7, 2, 0, 0, 7); g.fill(); continue; }
    if (q.kind.startsWith('roll:')) { const s = frames(q.kind.slice(5))[Math.floor(t * 8) % 2]; g.drawImage(s.r, Math.round(x + q.w / 2 - s.w / 2), Math.round(y + q.h - s.h)); continue; }
    if (q.kind === 'wave') { g.fillStyle = OUT; g.fillRect(x, y, q.w, q.h); g.fillStyle = '#fdbe53'; g.fillRect(x + 1, y + 1 + Math.round(Math.sin(t * 30)), q.w - 2, q.h - 2); continue; }
    if (q.kind === 'bubble') { g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.arc(x + 5, y + 5, 5, 0, 7); g.stroke(); g.fillStyle = 'rgba(190,230,255,0.6)'; g.fill(); continue; }
    if (q.kind === 'feather') { g.fillStyle = OUT; g.fillRect(x + 2, y, 3, 8); g.fillStyle = '#46425e'; g.fillRect(x + 3, y + 1, 2, 6); continue; }
    const map: Record<string, string> = { icicle: 'icicle', pinecone: 'pinecone', can: 'can', egg: 'pinecone' };
    const s = frames(map[q.kind] ?? 'rock')[0]; g.drawImage(s.r, Math.round(x + q.w / 2 - s.w / 2), Math.round(y + q.h - s.h));
  }
  // 보스
  const bo = w.boss;
  if (bo && (bo.dead < 2.5)) {
    const s = bossSprite(bo.kind, Math.floor(bo.frame * (bo.state === 'charge' || bo.state === 'prowl' ? 10 : 4)) % 2, bo.mode);
    const x = Math.round(bo.b.x + bo.b.w / 2 - s.w / 2 - cx) + (bo.mode === 'wind' ? Math.round(Math.sin(t * 50)) : 0), y = Math.round(bo.b.y + bo.b.h - s.h - cy);
    if (!(bo.flash > 0 && Math.floor(t * 30) % 2)) g.drawImage(bo.dir > 0 ? s.r : s.l, x, y);
    if (bo.mode === 'stun' && bo.hp > 0) stars(g, bo.b.x + bo.b.w / 2 - cx, bo.b.y - 6 - cy, t);
  }
  // 콩이
  const p = w.p;
  const blink = p.inv > 0 && p.state !== 'dead' && Math.floor(t * 16) % 2 === 0;
  if (!blink) {
    let pose: PupPose = 'idle';
    if (p.state === 'dead' || (p.state === 'hurt' && p.inv > 0.9)) pose = 'hurt';
    else if (p.state === 'win') pose = Math.floor(t * 4) % 2 ? 'wag' : 'sit';
    else if (p.barkT > 0) pose = 'bark';
    else if (!p.b.onGround) pose = p.b.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(p.b.vx) > 14) pose = (['run0', 'run1', 'run2', 'run3'] as const)[Math.floor(p.anim / 7) % 4];
    else pose = t % 3.2 < 0.12 ? 'blink' : Math.floor(t * 2) % 6 === 0 ? 'wag' : 'idle';
    const s = pup[pose];
    const x = Math.round(p.b.x + p.b.w / 2 - s.w / 2 + (p.dir > 0 ? 2 : -2) - cx), y = Math.round(p.b.y + p.b.h - s.h + 1 - cy);
    g.drawImage(p.dir > 0 ? s.r : s.l, x, y);
  }
  // 효과
  for (const f of w.fx) {
    const a = Math.max(0, f.life / f.max);
    const x = f.x - cx, y = f.y - cy;
    if (f.kind === 'text') { g.globalAlpha = a; txt(g, f.text ?? '', x, y, '#ffffff', 'center', 12); g.globalAlpha = 1; }
    else if (f.kind === 'star') { g.globalAlpha = a; g.drawImage(frames('star')[0].r, Math.round(x - 3), Math.round(y - 3)); g.globalAlpha = 1; }
    else { g.fillStyle = f.color ?? (f.kind === 'poof' ? '#ffffff' : '#fff4de'); g.globalAlpha = a; g.fillRect(Math.round(x), Math.round(y), f.kind === 'spark' ? 2 : 3, f.kind === 'spark' ? 2 : 3); g.globalAlpha = 1; }
  }
}

function stars(g: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const s = frames('star')[0];
  for (let k = 0; k < 3; k++) { const a = t * 5 + (k * Math.PI * 2) / 3; g.drawImage(s.r, Math.round(x + Math.cos(a) * 8 - 3), Math.round(y + Math.sin(a) * 2 - 3)); }
}

// ── 날씨·어둠 ──
let darkCv: HTMLCanvasElement | null = null;
export function drawWeather(g: CanvasRenderingContext2D, w: World, t: number): void {
  const st = w.stage;
  if (st.rain) {
    g.strokeStyle = 'rgba(190,210,255,0.55)'; g.lineWidth = 1; g.beginPath();
    for (let i = 0; i < 70; i++) { const x = (hash(i * 13) % (VW + 40)) - 20 + ((t * 60) % 20), y = ((hash(i * 7) % VH) + t * 340) % (VH + 20) - 10; g.moveTo(x, y); g.lineTo(x - 3, y + 9); }
    g.stroke();
    if (Math.sin(t * 0.7) > 0.995) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 0, VW, VH); }
  }
  if (st.snow) {
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 60; i++) { const x = ((hash(i * 17) % VW) + Math.sin(t + i) * 10 + t * (st.wind ?? 0) * 0.8) % VW; const y = ((hash(i * 5) % VH) + t * (20 + (i % 5) * 6)) % VH; g.fillRect((x + VW) % VW, y, i % 3 ? 1 : 2, i % 3 ? 1 : 2); }
  }
  if (st.dark) {
    if (!darkCv) { darkCv = document.createElement('canvas'); darkCv.width = VW; darkCv.height = VH; }
    const d = darkCv.getContext('2d')!;
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, VW, VH); d.fillStyle = 'rgba(6,3,14,0.86)'; d.fillRect(0, 0, VW, VH);
    d.globalCompositeOperation = 'destination-out';
    const hole = (x: number, y: number, r: number) => { const gr = d.createRadialGradient(x, y, r * 0.35, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = gr; d.beginPath(); d.arc(x, y, r, 0, 7); d.fill(); };
    const pb = w.p.b;
    hole(pb.x + pb.w / 2 - w.cam.x, pb.y + pb.h / 2 - w.cam.y, w.light + Math.sin(t * 4) * 2);
    if (w.locked) hole(VW / 2, VH / 2, 150);  // 보스 방은 반쯤 밝게
    for (const it of w.items) if (it.kind === 'firefly' && !it.got) hole(it.x - w.cam.x, it.y - w.cam.y, 22);
    for (const c of w.checks) if (c.on) hole(c.x + 8 - w.cam.x, c.y + 8 - w.cam.y, 30);
    if (w.boss && w.locked) hole(w.boss.b.x + w.boss.b.w / 2 - w.cam.x, w.boss.b.y + w.boss.b.h / 2 - w.cam.y, 26);
    g.drawImage(darkCv, 0, 0);
  }
}

// ── 글자 (갈무리, 테두리) ──
export function txt(g: CanvasRenderingContext2D, s: string, x: number, y: number, col = '#ffffff', align: CanvasTextAlign = 'left', size = 12, border = true): void {
  g.font = `${size}px Galmuri`; g.textAlign = align; g.textBaseline = 'middle';
  if (border) { g.fillStyle = OUT; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.fillText(s, Math.round(x) + dx, Math.round(y) + dy); }
  g.fillStyle = col; g.fillText(s, Math.round(x), Math.round(y));
}

// ── 화면 위 정보 ──
export function drawHud(g: CanvasRenderingContext2D, w: World, t: number, memIcon: boolean): void {
  const heart = frames('heart')[0];
  for (let i = 0; i < w.p.maxHp; i++) { g.globalAlpha = i < w.p.hp ? 1 : 0.25; g.drawImage(heart.r, 6 + i * 14, 5); }
  g.globalAlpha = 1;
  g.drawImage(frames('bone')[0].r, 6, 20); txt(g, `${w.bones}`, 21, 24, '#fff4de');
  const m = frames('memory')[0]; g.globalAlpha = w.memory ? 1 : 0.3; g.drawImage(m.r, VW - 20, 5); g.globalAlpha = 1;
  void memIcon;
  if (w.time < 3) { const a = Math.min(1, (3 - w.time) * 1.5); g.globalAlpha = a; txt(g, `${w.stage.id}. ${w.stage.name}`, VW / 2, 34, '#ffe36b', 'center', 16); g.globalAlpha = 1; }
  if (w.boss && w.locked && w.boss.hp > 0) {
    txt(g, w.stage.bossName, VW / 2, 8, '#ffffff', 'center', 12);
    const bw = 100, x = VW / 2 - bw / 2;
    g.fillStyle = OUT; g.fillRect(x - 1, 15, bw + 2, 7);
    g.fillStyle = '#52607c'; g.fillRect(x, 16, bw, 5);
    g.fillStyle = '#e5484d'; g.fillRect(x, 16, (bw * w.boss.hp) / w.boss.max, 5);
    for (let k = 1; k < w.boss.max; k++) { g.fillStyle = OUT; g.fillRect(x + (bw * k) / w.boss.max, 16, 1, 5); }
  }
  if (w.toastT > 0) { g.globalAlpha = Math.min(1, w.toastT * 2); g.fillStyle = 'rgba(63,38,49,0.75)'; g.fillRect(20, VH - 30, VW - 40, 18); txt(g, w.toast, VW / 2, VH - 21, '#ffffff', 'center', 12); g.globalAlpha = 1; }
  void t;
}
