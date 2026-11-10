// 적·보스·물건 도트 그림 (코드로 그림, Kenney 테두리 색에 맞춤)
import { Pix, sprite, OUT, type Sprite } from './pix.ts';

const W = '#ffffff', EYE = '#2b1b22';

/** 눈: 흰자+눈동자 또는 작은 점 */
function eye(p: Pix, x: number, y: number, big = false, angry = false): void {
  if (big) { p.rect(x, y, 2, 2, W).set(x + 1, y + 1, EYE).set(x + 1, y, EYE); if (angry) p.set(x - 1, y - 1, OUT).set(x, y - 1, OUT); }
  else p.set(x, y, EYE);
}
/** 어지러움 눈 (빙글) */
function dizzy(p: Pix, x: number, y: number): void { p.set(x, y, EYE).set(x + 1, y, EYE).set(x + 1, y + 1, EYE).set(x, y + 1, W); }

type Draw = (p: Pix, f: number) => void;
function make(w: number, h: number, draw: Draw, frames = 2): Sprite[] {
  return Array.from({ length: frames }, (_, f) => { const p = new Pix(w, h); draw(p, f); return sprite(p.outline()); });
}

// ── 작은 적 ──
export const ENEMY: Record<string, Draw & { w: number; h: number }> = {} as never;
function def(name: string, w: number, h: number, d: Draw): void { (ENEMY as Record<string, unknown>)[name] = Object.assign(d, { w, h }); }

def('crow', 16, 12, (p, f) => {
  p.oval(7, 7, 5, 3.5, '#2d2a3e'); p.oval(11.5, 5, 3, 2.8, '#2d2a3e');
  p.poly([[14, 4], [16, 5.5], [14, 6]], '#fdbe53');
  p.set(12, 4, W);
  if (f === 0) p.poly([[4, 6], [9, 6], [6, 0]], '#46425e'); else p.poly([[4, 7], [9, 7], [6, 11]], '#46425e');
  p.poly([[0, 6], [3, 7], [1, 9]], '#2d2a3e');
});
def('mouse', 14, 9, (p, f) => {
  p.oval(6, 5.5, 5, 3, '#a7a9be'); p.oval(10.5, 4.5, 2.5, 2.2, '#a7a9be'); p.oval(9, 2, 1.5, 1.5, '#f5b0c0');
  p.set(13, 5, '#f28462'); p.set(11, 4, EYE); p.line(0, 4 + f, 2, 6, '#f5b0c0');
  p.set(4, 8, '#8b9bb4').set(8, 8 - f, '#8b9bb4');
});
def('grasshopper', 14, 10, (p, f) => {
  p.oval(6, 6, 5, 2.4, '#7cc057'); p.oval(11, 5, 2.4, 2.2, '#7cc057'); p.set(11, 4, EYE);
  p.line(4, 6, 2 + f, 1, '#4e974c'); p.line(5, 6, 8, 9, '#4e974c'); p.line(10, 3, 13, 0, '#4e974c');
});
def('squirrel', 14, 13, (p, f) => {
  p.oval(3.5, 5 + f * 0.5, 3, 4.5, '#c97a45'); p.ovalOn(3.5, 5 + f * 0.5, 1.6, 3, '#e8a46b');
  p.oval(8, 8, 3.5, 3.2, '#b86542'); p.oval(10.5, 5, 2.6, 2.4, '#b86542'); p.set(10, 2, '#b86542');
  p.set(11, 4, EYE); p.set(13, 5, OUT); p.rect(7, 11, 2, 1, '#b86542');
});
def('owl', 14, 13, (p, f) => {
  p.oval(7, 7, 5.5, 5.5, '#9a6a4a'); p.ovalOn(7, 9, 3.5, 3, '#d9b48a');
  p.oval(5, 5, 1.8, 1.8, W).oval(9, 5, 1.8, 1.8, W).set(5, 5, EYE).set(9, 5, EYE); p.set(7, 7, '#fdbe53');
  p.set(2, 1, '#9a6a4a').set(12, 1, '#9a6a4a');
  if (f) { p.rect(0, 6, 2, 4, '#7a4f35'); p.rect(12, 6, 2, 4, '#7a4f35'); } else { p.rect(0, 4, 2, 4, '#7a4f35'); p.rect(12, 4, 2, 4, '#7a4f35'); }
});
def('crab', 16, 10, (p, f) => {
  p.oval(8, 6, 6, 3.4, '#e5484d'); p.set(6, 3, EYE).set(10, 3, EYE); p.set(6, 2, '#e5484d').set(10, 2, '#e5484d');
  p.oval(1.8, 3 - f, 1.8, 1.6, '#e5484d'); p.oval(14.2, 3 - f, 1.8, 1.6, '#e5484d');
  for (const x of [4, 7, 9, 12]) p.set(x, 9, '#c34b35');
});
def('frog', 14, 10, (p, f) => {
  p.oval(7, 6.5 - f, 6, 3.4, '#5fb85a'); p.oval(4.5, 3 - f, 1.8, 1.8, '#5fb85a'); p.oval(9.5, 3 - f, 1.8, 1.8, '#5fb85a');
  p.set(4, 3 - f, EYE).set(9, 3 - f, EYE); p.ovalOn(7, 8 - f, 4, 1.2, '#c6e58d'); p.line(4, 6 - f, 10, 6 - f, '#3e7d3a');
  if (f) { p.line(1, 8, 0, 9, '#5fb85a'); p.line(13, 8, 13, 9, '#5fb85a'); }
});
def('dragonfly', 16, 9, (p, f) => {
  p.line(1, 5, 11, 5, '#3e9bd8'); p.oval(12.5, 5, 2, 1.8, '#3e9bd8'); p.set(13, 4, EYE);
  const a = f ? 1 : 3; p.oval(6, a, 3, 1.3, '#cfe9ff'); p.oval(9, a, 3, 1.3, '#cfe9ff');
});
def('mole', 14, 10, (p, f) => {
  p.oval(7, 6, 6, 3.6, '#6b4a3a'); p.oval(12, 6, 1.6, 1.4, '#f5a0b8'); p.set(9, 4, EYE);
  p.rect(2 + f, 9, 2, 1, '#f5a0b8').rect(8 - f, 9, 2, 1, '#f5a0b8');
});
def('slime', 14, 10, (p, f) => {
  p.oval(7, 6.5 + f * 0.5, 6 + f * 0.6, 3.5 - f * 0.5, '#9b6bd6'); p.ovalOn(5, 4.5, 2, 1, '#c8a6f0');
  p.set(5, 6, EYE).set(9, 6, EYE);
});
def('bat', 16, 9, (p, f) => {
  p.oval(8, 4.5, 2.5, 2.5, '#5a4380'); p.set(7, 1.5, '#5a4380').set(9, 1.5, '#5a4380'); p.set(7, 4, '#ff5a6e').set(9, 4, '#ff5a6e');
  if (f) { p.poly([[6, 4], [0, 1], [2, 6]], '#5a4380'); p.poly([[10, 4], [16, 1], [14, 6]], '#5a4380'); }
  else { p.poly([[6, 4], [0, 7], [3, 3]], '#5a4380'); p.poly([[10, 4], [16, 7], [13, 3]], '#5a4380'); }
});
def('rabbit', 14, 13, (p, f) => {
  p.oval(6, 9 - f, 4.5, 3.2, '#f4f4f2'); p.oval(10, 7 - f, 2.8, 2.6, '#f4f4f2');
  p.oval(9, 3 - f, 0.9, 2.6, '#f4f4f2'); p.oval(11, 3 - f, 0.9, 2.6, '#f4f4f2'); p.set(9, 3 - f, '#f5b0c0');
  p.set(11, 6 - f, EYE); p.set(12, 8 - f, '#f5a0b8'); p.oval(1.6, 8 - f, 1.2, 1.2, W);
});
def('rat', 16, 9, (p, f) => {
  p.oval(7, 5.5, 5, 3, '#7f7f95'); p.oval(11.6, 4.8, 2.6, 2.2, '#7f7f95'); p.oval(10, 2.2, 1.4, 1.4, '#c49aa8');
  p.set(14, 5, '#f28462'); p.set(12, 4, '#ff5a6e'); p.line(0, 3 + f * 2, 2, 6, '#c49aa8');
  p.set(5, 8, '#52607c').set(9, 8 - f, '#52607c');
});
def('pigeon', 16, 12, (p, f) => {
  p.oval(7, 7, 5, 3.4, '#8b9bb4'); p.oval(11.4, 4.6, 2.6, 2.4, '#8b9bb4'); p.ovalOn(10, 7, 2, 1.4, '#6fb7a8');
  p.set(14, 5, '#f28462'); p.set(12, 4, '#ff5a6e');
  if (f === 0) p.poly([[4, 6], [9, 6], [6, 0]], '#c0cbdc'); else p.poly([[4, 7], [9, 7], [6, 11]], '#c0cbdc');
});
def('hedgehog', 16, 11, (p, f) => {
  if (f === 2) { p.oval(8, 6, 5.5, 5, '#8a5a3c'); for (let a = 0; a < 12; a++) p.set(8 + Math.cos(a / 2) * 6.5, 6 + Math.sin(a / 2) * 5.5, '#5c3a26'); return; }
  p.oval(7, 7, 6, 3.6, '#8a5a3c'); for (let x = 2; x < 12; x += 2) p.poly([[x, 5], [x + 2, 5], [x + 1, 1 + (x % 4 ? 0 : 1)]], '#5c3a26');
  p.oval(12.5, 7.5, 2.2, 2, '#e8c8a0'); p.set(13, 7, EYE).set(15, 8, OUT);
  p.set(5, 10 - f, '#5c3a26').set(9, 10, '#5c3a26');
});

def('chick', 12, 11, (p, f) => {
  p.oval(6, 6.5 - f * 0.5, 5, 4, '#ffe36b'); p.ovalOn(4, 7, 2.2, 1.6, '#f5c842');
  p.set(8, 4, EYE); p.poly([[10, 5], [12, 6], [10, 7]], '#f28462');
  p.set(5, 2 - f, '#ffe36b').set(6, 1 - f, '#ffe36b');
  p.set(4, 10, '#f28462').set(8, 10 - f, '#f28462');
});

// ── 떨어지는 것·굴러오는 것·수집품 ──
def('egg', 10, 12, (p, f) => { p.oval(5, 6.5, 4, 5, '#fff8ec'); p.ovalOn(3.5, 4.5, 1.2, 1.8, W); if (f) p.line(3, 6, 7, 6, '#d9c7a8'); });
def('barrel', 14, 14, (p, f) => { p.oval(7, 7, 6.4, 6.4, '#b86542'); p.oval(7, 7, 3.6, 3.6, '#d9925a'); p.line(1, 7, 13, 7, '#7a4428'); p.line(7, 1, 7, 13, '#7a4428'); if (f) { p.line(3, 3, 11, 11, '#7a4428'); p.line(3, 11, 11, 3, '#7a4428'); } });
def('hay', 16, 14, (p, f) => { p.oval(8, 7, 7.4, 6.6, '#f5c842'); p.ovalOn(8, 7, 4, 3.6, '#e0a830'); p.set(8 + (f ? 2 : -2), 3, '#fff1a0').set(8 + (f ? -2 : 2), 11, '#fff1a0'); });
def('pinecone', 9, 12, (p) => { p.oval(4.5, 7, 3.6, 4.6, '#a0603a'); for (let y = 4; y < 12; y += 2) p.line(2, y, 7, y, '#7a4428'); p.rect(4, 0, 1, 3, '#4e974c'); });
def('icicle', 8, 14, (p) => { p.poly([[0, 0], [8, 0], [4, 14]], '#cfe9ff'); p.line(3, 1, 4, 10, '#ffffff'); });
def('rock', 12, 10, (p) => { p.oval(6, 5.5, 5.4, 4.2, '#8b9bb4'); p.ovalOn(4.5, 4, 2.2, 1.5, '#c0cbdc'); });
def('pot', 12, 12, (p) => { p.poly([[1, 4], [11, 4], [9, 12], [3, 12]], '#c97a45'); p.rect(0, 3, 12, 2, '#b86542'); p.oval(6, 2, 2.5, 2, '#5fb85a'); });
def('log', 16, 14, (p, f) => { p.oval(8, 7, 7, 6.6, '#b86542'); p.oval(8, 7, 4, 3.8, '#eaa56c'); p.line(8 - f * 2, 3, 8 + f * 2, 11, '#cf8254'); });
def('snowball', 16, 16, (p, f) => { p.oval(8, 8, 7.4, 7.4, '#ffffff'); p.ovalOn(10, 10, 4.5, 4.5, '#dde8f6'); p.set(5 + f * 3, 5, '#c0cbdc'); });
def('cart', 18, 14, (p, f) => { p.rect(1, 2, 16, 7, '#c97a45'); p.rect(1, 2, 16, 2, '#e38628'); p.oval(5, 11, 2.6, 2.6, '#52607c'); p.oval(13, 11, 2.6, 2.6, '#52607c'); p.set(5 + f, 10, '#c0cbdc'); });
def('can', 12, 14, (p, f) => { p.oval(6, 7, 5.5, 6.5, '#8b9bb4'); p.ovalOn(6, 7, 3, 6, '#c0cbdc'); p.line(1, 4 + f * 4, 11, 4 + f * 4, '#52607c'); });
def('bone', 12, 7, (p) => { p.rect(3, 2, 6, 3, '#fff4de'); p.oval(2, 2, 1.8, 1.6, '#fff4de'); p.oval(2, 5, 1.8, 1.6, '#fff4de'); p.oval(10, 2, 1.8, 1.6, '#fff4de'); p.oval(10, 5, 1.8, 1.6, '#fff4de'); p.line(3, 4, 9, 4, '#f0d0a2'); });
def('heart', 12, 11, (p) => { p.oval(3.5, 3.5, 3, 3, '#ff5a6e'); p.oval(8.5, 3.5, 3, 3, '#ff5a6e'); p.poly([[0.6, 4.5], [11.4, 4.5], [6, 10.5]], '#ff5a6e'); p.set(3, 2, W).set(2, 3, W); });
def('firefly', 7, 7, (p, f) => { p.oval(3.5, 3.5, 2.5 + f * 0.5, 2.5 + f * 0.5, '#fff6a8'); p.set(3, 3, '#ffffff'); });
def('star', 7, 7, (p) => { p.poly([[3.5, 0], [4.5, 2.5], [7, 3], [5, 4.5], [5.5, 7], [3.5, 5.5], [1.5, 7], [2, 4.5], [0, 3], [2.5, 2.5]], '#fdbe53'); });
def('bowl', 16, 9, (p, f) => { p.poly([[1, 3], [15, 3], [13, 9], [3, 9]], '#e5484d'); p.rect(2, 2, 12, 2, '#3e9bd8'); if (f) p.rect(5, 0, 6, 2, '#fdbe53'); });
def('memory', 14, 14, (p, f) => {
  p.oval(7, 7, 6.5, 6.5, f ? '#fff6a8' : '#ffe36b'); p.ovalOn(7, 7, 4.5, 4.5, '#ff8fb0');
  p.oval(5, 6, 1.8, 1.8, W); p.oval(9, 6, 1.8, 1.8, W); p.poly([[3.5, 7], [10.5, 7], [7, 11]], W);
});

/** 이름 → 프레임들 (처음 쓸 때 만들어 둠) */
const cache = new Map<string, Sprite[]>();
export function frames(name: string): Sprite[] {
  let s = cache.get(name);
  if (!s) {
    const d = ENEMY[name];
    if (!d) throw new Error('그림 없음: ' + name);
    s = make(d.w, d.h, d, name === 'hedgehog' ? 3 : 2);
    cache.set(name, s);
  }
  return s;
}

// ── 보스 (크게) ──
export interface BossArt { w: number; h: number; draw: (p: Pix, f: number, mode: 'move' | 'wind' | 'stun') => void }
export const BOSS: Record<string, BossArt> = {
  rooster: { w: 34, h: 32, draw: (p, f, m) => {
    p.poly([[2, 8], [8, 14], [4, 18], [0, 12]], '#2f6b45'); p.poly([[3, 4], [10, 13], [5, 14]], '#c34b35'); p.poly([[0, 14], [9, 16], [3, 21]], '#46425e');
    p.oval(15, 19, 11, 9, '#fbfbf6'); p.ovalOn(15, 23, 9, 4, '#e6e1d6');
    p.oval(23, 9, 6, 6, '#fbfbf6');
    p.oval(20, 2.5, 2, 2.5, '#e5484d'); p.oval(23.5, 2, 2, 2.6, '#e5484d'); p.oval(27, 3, 2, 2.4, '#e5484d');
    p.poly([[29, 8], [34, 10], [29, 12]], '#fdbe53'); p.oval(28, 14, 1.6, 2.2, '#e5484d');
    if (m === 'stun') dizzy(p, 25, 7); else eye(p, 25, 7, true, m === 'wind');
    p.oval(13, 18, 5.5, 3.6, '#e6e1d6');
    const s = f ? 2 : 0; p.rect(11 + s, 27, 2, 4, '#e38628'); p.rect(18 - s, 27, 2, 4, '#e38628'); p.rect(9 + s, 30, 5, 1, '#e38628'); p.rect(16 - s, 30, 5, 1, '#e38628');
  } },
  crow: { w: 36, h: 26, draw: (p, f, m) => {
    p.oval(15, 15, 11, 7, '#2d2a3e'); p.oval(26, 10, 6, 5.6, '#2d2a3e'); p.poly([[31, 9], [36, 11], [31, 13]], '#fdbe53');
    p.poly([[22, 5], [24, 1], [26, 4], [28, 0], [30, 5]], '#fdbe53'); p.set(26, 3, '#e5484d');
    if (m === 'stun') dizzy(p, 27, 9); else eye(p, 27, 9, true, true);
    if (f === 0 && m !== 'stun') p.poly([[8, 13], [22, 13], [12, 0]], '#46425e'); else p.poly([[8, 15], [22, 15], [12, 26]], '#46425e');
    p.poly([[0, 14], [6, 16], [1, 20]], '#2d2a3e');
  } },
  boar: { w: 40, h: 28, draw: (p, f, m) => {
    p.oval(18, 15, 15, 10, '#7a4f35'); for (let x = 8; x < 28; x += 3) p.line(x, 5, x + 1, 8, '#5c3a26');
    p.oval(33, 15, 6, 6, '#8a5a3c'); p.oval(37, 17, 2.6, 2.4, '#d99a7a'); p.set(37, 17, OUT).set(38, 17, OUT);
    p.poly([[34, 20], [39, 15], [36, 21]], '#fff4de'); p.oval(29, 8, 2, 2.6, '#5c3a26');
    if (m === 'stun') dizzy(p, 33, 12); else eye(p, 33, 12, true, true);
    const s = f ? 2 : 0; p.rect(9 + s, 23, 4, 5, '#5c3a26'); p.rect(25 - s, 23, 4, 5, '#5c3a26');
  } },
  crayfish: { w: 46, h: 28, draw: (p, f, m) => {
    p.oval(20, 18, 13, 7, '#e5484d'); for (let x = 10; x < 30; x += 4) p.line(x, 12, x, 24, '#c34b35');
    p.poly([[4, 16], [9, 12], [9, 24]], '#e5484d');
    const up = m === 'wind' ? -6 : m === 'stun' ? 4 : f * -2;
    p.oval(40, 10 + up, 6, 4, '#e5484d'); p.poly([[40, 8 + up], [46, 4 + up], [44, 10 + up]], '#ff8f6b'); p.line(32, 16, 37, 12 + up, '#c34b35');
    p.oval(33, 12, 2, 2, '#e5484d'); if (m === 'stun') dizzy(p, 33, 9); else eye(p, 32, 9, true, true);
    p.line(35, 10, 44, 2, '#c34b35');
    for (const x of [14, 19, 24, 29]) p.line(x, 24, x - 2 + f * 2, 28, '#c34b35');
  } },
  bat: { w: 44, h: 26, draw: (p, f, m) => {
    p.oval(22, 12, 7, 7, '#5a4380'); p.poly([[17, 6], [19, 0], [21, 6]], '#5a4380'); p.poly([[23, 6], [25, 0], [27, 6]], '#5a4380');
    if (m === 'stun') { dizzy(p, 19, 10); dizzy(p, 24, 10); } else { p.rect(19, 10, 2, 2, '#ff5a6e'); p.rect(24, 10, 2, 2, '#ff5a6e'); }
    p.set(21, 15, W).set(23, 15, W);
    if (f === 0 || m === 'stun') { p.poly([[16, 12], [0, 4], [4, 14], [8, 12], [10, 18]], '#46336a'); p.poly([[28, 12], [44, 4], [40, 14], [36, 12], [34, 18]], '#46336a'); }
    else { p.poly([[16, 12], [0, 22], [5, 16], [9, 20], [12, 14]], '#46336a'); p.poly([[28, 12], [44, 22], [39, 16], [35, 20], [32, 14]], '#46336a'); }
  } },
  goat: { w: 38, h: 32, draw: (p, f, m) => {
    p.oval(16, 19, 12, 8, '#f4f4f2'); p.ovalOn(16, 23, 10, 3, '#dde2ea');
    p.oval(29, 12, 5.5, 6, '#f4f4f2'); p.oval(33, 15, 3, 3, '#f4f4f2');
    p.poly([[25, 7], [22, 0], [30, 3], [29, 8]], '#c0a070'); p.line(24, 2, 28, 5, '#9a7a50');
    p.poly([[32, 17], [34, 22], [31, 21]], '#dde2ea');
    if (m === 'stun') dizzy(p, 30, 10); else eye(p, 30, 10, true, m === 'wind');
    const s = f ? 2 : 0; for (const x of [8 + s, 12, 20, 24 - s]) p.rect(x, 26, 3, 6, '#c0cbdc');
  } },
  bulldog: { w: 44, h: 30, draw: (p, f, m) => {
    p.oval(18, 18, 14, 9, '#d9a066'); p.ovalOn(18, 22, 11, 4, '#f0c890');
    p.oval(33, 13, 9, 8, '#d9a066'); p.oval(36, 17, 6, 4, '#f0c890'); p.rect(38, 13, 3, 2, OUT);
    p.oval(28, 6, 3, 2.4, '#a8703e'); p.oval(39, 6, 3, 2.4, '#a8703e');
    p.rect(26, 20, 14, 3, '#3f2631'); for (let x = 27; x < 40; x += 3) p.set(x, 20, '#c0cbdc');
    if (m === 'stun') dizzy(p, 32, 10); else eye(p, 32, 10, true, true);
    p.set(34, 19, W).set(37, 19, W);
    const s = f ? 2 : 0; p.rect(8 + s, 25, 5, 5, '#d9a066'); p.rect(22 - s, 25, 5, 5, '#d9a066');
  } },
  cat: { w: 40, h: 28, draw: (p, f, m) => {
    p.poly([[2, 14], [0, 4], [4, 8]], '#2d2a3e'); p.line(1, 14, 3, 5, '#2d2a3e');
    p.oval(17, 17, 12, 7, '#2d2a3e');
    p.oval(31, 12, 7, 6.5, '#2d2a3e'); p.poly([[25, 8], [26, 1], [30, 6]], '#2d2a3e'); p.poly([[33, 6], [37, 1], [37, 8]], '#2d2a3e');
    p.set(27, 4, '#ff8fb0').set(36, 4, '#ff8fb0');
    if (m === 'stun') { dizzy(p, 28, 10); dizzy(p, 33, 10); } else { p.rect(28, 10, 2, 2, '#c6e58d'); p.rect(33, 10, 2, 2, '#c6e58d'); p.set(29, 10, OUT).set(34, 10, OUT); }
    p.set(31, 14, '#ff8fb0'); p.line(36, 14, 40, 13, '#c0cbdc'); p.line(36, 15, 40, 16, '#c0cbdc');
    const s = f ? 2 : 0;
    for (const x of [8 + s, 13, 21, 25 - s]) { p.rect(x, 22, 3, 6, '#2d2a3e'); p.rect(x, 26, 3, 2, '#ffffff'); }
  } },
};

const bossCache = new Map<string, Sprite>();
export function bossSprite(kind: string, f: number, mode: 'move' | 'wind' | 'stun'): Sprite {
  const k = `${kind}:${f}:${mode}`;
  let s = bossCache.get(k);
  if (!s) {
    const a = BOSS[kind];
    const p = new Pix(a.w, a.h); a.draw(p, f, mode); s = sprite(p.outline()); bossCache.set(k, s);
  }
  return s;
}
