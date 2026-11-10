// 게임 밖 화면 그리기: 제목, 이야기, 지도, 클리어, 쉬기, 엔딩
import { STAGES, STORY } from '../core/levels.ts';
import type { Save } from '../core/save.ts';
import { VW, VH, txt, kenney, K, drawBackground } from '../gfx/render.ts';
import { OUT } from '../gfx/pix.ts';
import { frames } from '../gfx/critters.ts';
import type { PupSprites } from '../gfx/puppy.ts';
import { hanaSprite, truckSprite } from '../gfx/people.ts';

/** 터치 기기면 안내 글을 '누르기'로 */
export const ui = { touch: false };
const go = (what: string) => (ui.touch ? `눌러서 ${what}` : `Z ${what}`);

/** 한글 줄바꿈: 띄어쓰기 단위로, 너무 긴 낱말은 글자 단위로 */
export function wrap(g: CanvasRenderingContext2D, s: string, maxW: number, size = 12): string[] {
  g.font = `${size}px Galmuri`;
  const out: string[] = [];
  let line = '';
  for (const word of s.split(' ')) {
    const tryLine = line ? line + ' ' + word : word;
    if (g.measureText(tryLine).width <= maxW) { line = tryLine; continue; }
    if (line) out.push(line);
    line = '';
    for (const ch of word) { if (g.measureText(line + ch).width > maxW && line) { out.push(line); line = ''; } line += ch; }
  }
  if (line) out.push(line);
  return out;
}
export function para(g: CanvasRenderingContext2D, s: string, x: number, y: number, maxW: number, col = '#ffffff', align: CanvasTextAlign = 'center', lh = 15): number {
  const lines = wrap(g, s, maxW);
  lines.forEach((l, i) => txt(g, l, x, y + i * lh, col, align));
  return lines.length;
}
function panel(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill = 'rgba(63,38,49,0.82)'): void {
  g.fillStyle = OUT; g.fillRect(x + 1, y, w - 2, h); g.fillRect(x, y + 1, w, h - 2);
  g.fillStyle = fill; g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 2, y + 2, w - 4, 1);
}
function ground(g: CanvasRenderingContext2D, y: number, top = '#84c669', edge = '#4e974c', body = '#eaa56c'): void {
  g.fillStyle = body; g.fillRect(0, y, VW, VH - y);
  g.fillStyle = top; g.fillRect(0, y, VW, 5);
  g.fillStyle = edge; g.fillRect(0, y + 5, VW, 1);
  g.fillStyle = '#cf8254'; for (let x = 6; x < VW; x += 22) g.fillRect(x, y + 12 + (x % 3) * 4, 3, 2);
}
const blinkOn = (t: number) => Math.floor(t * 2.2) % 2 === 0;

// ── 제목 ──
export function drawTitle(g: CanvasRenderingContext2D, pup: PupSprites, t: number, menu: string[], sel: number): void {
  drawBackground(g, 'farm', t * 12, t);
  ground(g, 146);
  for (let i = 0; i < 6; i++) kenney(g, [K.sunflower, K.cabbage, K.carrot][i % 3], 20 + i * 52, 131);
  kenney(g, K.hay, 120, 131); kenney(g, K.hay2, 136, 131);
  const s = pup[t % 3 < 0.15 ? 'blink' : Math.floor(t * 3) % 2 ? 'wag' : 'sit'];
  g.drawImage(s.r, 150, 125);
  // 제목 글자
  const bob = Math.round(Math.sin(t * 2) * 2);
  txt(g, '홀로 남은 강아지', VW / 2, 34 + bob, '#fff4de', 'center', 24);
  txt(g, 'Left Alone Puppy', VW / 2, 56 + bob, '#ffcf4a', 'center', 12);
  menu.forEach((m, i) => {
    const y = 84 + i * 16, on = i === sel;
    if (on) { const b = frames('bone')[0]; g.drawImage(b.r, VW / 2 - 52, y - 4); }
    txt(g, m, VW / 2, y, on ? '#ffe36b' : '#ffffff', 'center');
  });
  txt(g, ui.touch ? '◀▶ 이동  점프  멍!  ▼+점프 내려가기' : '←→ 이동  Z 점프  X 멍!  ↓+Z 내려가기', VW / 2, VH - 8, '#fff4de', 'center', 12);
}

// ── 처음 이야기 ──
export function drawStory(g: CanvasRenderingContext2D, pup: PupSprites, line: number, t: number, lt: number): void {
  const scene = line <= 1 ? 0 : line === 2 ? 1 : line === 3 ? 2 : 3;
  drawBackground(g, 'farm', 40, t);
  ground(g, 140);
  kenney(g, K.hay, 70, 125); kenney(g, K.hay2, 86, 125); kenney(g, K.hay, 78, 113);
  if (scene === 0) {
    g.drawImage(truckSprite(0).r, 200, 108);
    const h = hanaSprite('wave', Math.floor(t * 3) % 2);
    g.drawImage(h.r, 150, 104);
    kenney(g, K.crate, 176, 126); kenney(g, K.sack, 186, 126);
    g.drawImage(pup[Math.floor(t * 4) % 2 ? 'wag' : 'idle'].r, 112, 120);
  } else if (scene === 1) {
    // 트럭이 떠나는 동안 건초 위에서 잠
    const x = 200 + Math.min(1, lt / 2.2) ** 2 * 200;
    g.drawImage(truckSprite(Math.floor(t * 8) % 2).r, x, 108);
    g.drawImage(pup.sleep.r, 70, 101);
    const z = (t * 0.8) % 1; g.globalAlpha = 1 - z; txt(g, 'z', 98 + z * 6, 98 - z * 14, '#ffffff', 'left'); g.globalAlpha = 1;
  } else if (scene === 2) {
    g.drawImage(pup[lt < 1 ? 'sit' : Math.floor(t * 2) % 2 ? 'idle' : 'blink'].r, 112, 120);
    if (lt > 0.6) { txt(g, '?', 128, 108 + Math.round(Math.sin(t * 6)), '#ffffff', 'center', 16); }
  } else {
    const x = 112 + Math.max(0, lt - 0.5) * 50;
    const run = x > 112;
    g.drawImage(pup[run ? (['run0', 'run1', 'run2', 'run3'] as const)[Math.floor(t * 10) % 4] : 'bark'].r, Math.min(x, 340), 120);
    if (!run) txt(g, '킁킁', 140, 108, '#ffffff', 'center');
  }
  panel(g, 12, 6, VW - 24, 44);
  para(g, STORY.intro[line], VW / 2, 20, VW - 50);
  if (blinkOn(t)) txt(g, '▼', VW - 26, 42, '#ffe36b', 'center');
}

// ── 지도 ──
export const MAP = { x0: 18, w: 284, y0: 26, h: 104 };
export const nodePos = (i: number): [number, number] => [MAP.x0 + STAGES[i].map[0] * MAP.w, MAP.y0 + STAGES[i].map[1] * MAP.h];

/** 지도 배경 (한 번 그려 두고 다시 씀) */
let mapCv: HTMLCanvasElement | null = null;
function mapBase(): HTMLCanvasElement {
  if (mapCv) return mapCv;
  const c = document.createElement('canvas'); c.width = VW; c.height = VH;
  const g = c.getContext('2d')!;
  g.fillStyle = '#7fc8ea'; g.fillRect(0, 0, VW, VH);   // 바다
  // 땅 (둥근 섬)
  g.fillStyle = OUT; blob(g, 160, 82, 156, 76, 2);
  g.fillStyle = '#c6e58d'; blob(g, 160, 82, 154, 74, 0);
  // 밀밭 (노랑)
  g.fillStyle = '#f3cf72'; blob(g, 80, 92, 34, 18, 0);
  // 숲
  g.fillStyle = '#84c669'; blob(g, 122, 102, 34, 16, 0);
  // 눈 산
  g.fillStyle = '#e4ecf8'; blob(g, 196, 46, 48, 26, 0);
  // 도시 (회색)
  g.fillStyle = '#a7a9be'; blob(g, 280, 44, 32, 24, 0);
  // 개울
  g.strokeStyle = '#4aa8e0'; g.lineWidth = 3; g.beginPath();
  g.moveTo(170, 4); g.bezierCurveTo(150, 60, 190, 80, 150, 160); g.stroke();
  g.strokeStyle = '#8fd3ff'; g.lineWidth = 1; g.stroke();
  // 장식 (Kenney)
  const deco: Array<[number, number, number]> = [
    [K.hay, 24, 112], [K.sunflower, 52, 120], [K.wheat, 70, 86], [K.wheat2, 88, 92], [K.wheat3, 64, 96],
    [K.pine, 104, 94], [K.pine, 120, 98], [K.pineS, 138, 104], [K.pine, 110, 108],
    [K.rock2, 166, 40], [K.rock, 182, 34], [K.pineS, 206, 30], [K.pineS, 226, 52],
    [K.barrel, 232, 84], [K.crate, 248, 92], [K.cow, 40, 98], [K.sheep, 60, 132],
  ];
  for (const [i, x, y] of deco) kenney(g, i, x - 8, y - 8);
  // 도시 건물
  for (let k = 0; k < 4; k++) { const x = 262 + k * 9, h = 12 + (k % 2) * 8; g.fillStyle = OUT; g.fillRect(x - 1, 40 - h - 1, 9, h + 2); g.fillStyle = '#52607c'; g.fillRect(x, 40 - h, 7, h); g.fillStyle = '#ffe36b'; g.fillRect(x + 2, 40 - h + 3, 2, 2); }
  // 산꼭대기
  for (const [x, y] of [[188, 36], [204, 30]]) { g.fillStyle = OUT; g.beginPath(); g.moveTo(x - 13, y + 13); g.lineTo(x, y - 9); g.lineTo(x + 13, y + 13); g.fill(); g.fillStyle = '#c0cbdc'; g.beginPath(); g.moveTo(x - 11, y + 12); g.lineTo(x, y - 7); g.lineTo(x + 11, y + 12); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x - 4, y - 1); g.lineTo(x, y - 7); g.lineTo(x + 4, y - 1); g.fill(); }
  mapCv = c;
  return c;
}
function blob(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, grow: number): void {
  g.beginPath();
  for (let a = 0; a <= 64; a++) {
    const th = (a / 64) * Math.PI * 2, wob = 1 + 0.06 * Math.sin(th * 5) + 0.04 * Math.sin(th * 3 + 1);
    const x = cx + Math.cos(th) * (rx * wob + grow), y = cy + Math.sin(th) * (ry * wob + grow);
    if (a === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.fill();
}

export interface MapView { sel: number; from: number; walk: number }  // walk: 0→1 이동 중
export function drawMap(g: CanvasRenderingContext2D, pup: PupSprites, save: Save, v: MapView, t: number): void {
  g.drawImage(mapBase(), 0, 0);
  // 길 (점선)
  for (let i = 0; i < STAGES.length - 1; i++) {
    const [ax, ay] = nodePos(i), [bx, by] = nodePos(i + 1);
    const open = i + 1 <= save.cleared;
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 6);
    for (let k = 1; k < n; k++) { const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n; g.fillStyle = OUT; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); g.fillStyle = open ? '#fff4de' : '#b7a59a'; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
  }
  // 자리
  for (let i = 0; i < STAGES.length; i++) {
    const [x, y] = nodePos(i), cleared = i < save.cleared, open = i <= save.cleared;
    g.fillStyle = OUT; g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = cleared ? '#5fb85a' : open ? '#e5484d' : '#8b9bb4'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
    txt(g, String(i + 1), x, y + 1, '#ffffff', 'center', 12, false);
    if (save.memories[i]) { const m = frames('memory')[0]; g.drawImage(m.r, Math.round(x + 4), Math.round(y - 14)); }
  }
  // 하나의 집 (끝)
  const [ex, ey] = nodePos(7);
  if (save.cleared >= 8) { const h = hanaSprite('wave', Math.floor(t * 3) % 2); g.drawImage(h.r, ex - 30, ey - 26); }
  // 콩이
  const [ax, ay] = nodePos(v.from), [bx, by] = nodePos(v.sel);
  const k = v.walk, px = ax + (bx - ax) * k, py = ay + (by - ay) * k;
  const moving = v.walk < 1;
  const s = pup[moving ? (['run0', 'run1', 'run2', 'run3'] as const)[Math.floor(t * 10) % 4] : Math.floor(t * 3) % 2 ? 'wag' : 'idle'];
  const left = moving ? bx < ax : false;
  g.drawImage(left ? s.l : s.r, Math.round(px - 14), Math.round(py - 22 - (moving ? 0 : Math.abs(Math.sin(t * 3)) * 2)));

  // 위: 추억 모음
  panel(g, 4, 3, 112, 18);
  txt(g, '추억', 10, 12, '#ffe36b');
  for (let i = 0; i < 8; i++) { g.globalAlpha = save.memories[i] ? 1 : 0.25; g.drawImage(frames('memory')[0].r, 32 + i * 10, 5); }
  g.globalAlpha = 1;
  const bone = frames('bone')[0]; panel(g, VW - 58, 3, 54, 18); g.drawImage(bone.r, VW - 52, 9); txt(g, String(save.bones), VW - 36, 12, '#fff4de');
  // 아래: 고른 곳
  const st = STAGES[v.sel];
  panel(g, 4, VH - 46, VW - 8, 43);
  txt(g, `${st.id}. ${st.name}`, 12, VH - 37, '#ffe36b');
  txt(g, `보스: ${st.bossName}`, VW - 12, VH - 37, '#ffb3b3', 'right');
  para(g, st.intro, 12, VH - 22, VW - 30, '#ffffff', 'left', 13);
  const mem = save.memories[v.sel] ? `추억: ${st.memory}` : '추억: ???';
  if (!moving && blinkOn(t)) txt(g, go('출발'), VW - 12, VH - 9, '#ffe36b', 'right');
  txt(g, mem + (save.best[v.sel] ? `   뼈다귀 최고 ${save.best[v.sel]}` : ''), 12, VH - 9, '#c6e58d');
}

// ── 스테이지 클리어 ──
export function drawClear(g: CanvasRenderingContext2D, pup: PupSprites, stage: number, bones: number, total: number, memory: boolean, t: number): void {
  const st = STAGES[stage];
  g.fillStyle = 'rgba(30,18,30,0.55)'; g.fillRect(0, 0, VW, VH);
  panel(g, 30, 20, VW - 60, 140);
  txt(g, '스테이지 클리어!', VW / 2, 36, '#ffe36b', 'center', 16);
  g.drawImage(pup[Math.floor(t * 4) % 2 ? 'wag' : 'jump'].r, VW / 2 - 14, 48 - Math.round(Math.abs(Math.sin(t * 4)) * 4));
  g.drawImage(frames('bone')[0].r, 92, 80); txt(g, `뼈다귀 ${bones} / ${total}`, 110, 84, '#fff4de');
  g.drawImage(frames('memory')[0].r, 90, 94); g.globalAlpha = 1;
  txt(g, memory ? `추억: ${st.memory}` : '추억을 놓쳤다…', 110, 101, memory ? '#ffcf4a' : '#b7a59a');
  para(g, st.clear, VW / 2, 120, VW - 84, '#ffffff', 'center', 13);
  if (blinkOn(t)) txt(g, go('계속'), VW / 2, 150, '#ffe36b', 'center');
}

// ── 쉬기 ──
export function drawPause(g: CanvasRenderingContext2D, menu: string[], sel: number): void {
  g.fillStyle = 'rgba(30,18,30,0.6)'; g.fillRect(0, 0, VW, VH);
  panel(g, 90, 40, 140, 26 + menu.length * 16);
  txt(g, '잠깐 쉬는 중', VW / 2, 54, '#ffe36b', 'center');
  menu.forEach((m, i) => txt(g, (i === sel ? '▶ ' : '  ') + m, VW / 2, 74 + i * 16, i === sel ? '#ffe36b' : '#ffffff', 'center'));
}

// ── 엔딩 ──
export function drawEnding(g: CanvasRenderingContext2D, pup: PupSprites, save: Save, line: number, t: number, lt: number): void {
  const last = line >= STORY.ending.length;
  drawBackground(g, last ? 'farm' : 'city', 80, t);
  ground(g, 140, last ? '#84c669' : '#8b9bb4', last ? '#4e974c' : '#52607c', last ? '#eaa56c' : '#3a4258');
  if (!last) {
    // 하나의 집 문
    g.fillStyle = OUT; g.fillRect(186, 76, 68, 66); g.fillStyle = '#f4e3c9'; g.fillRect(188, 78, 64, 62);
    g.fillStyle = '#c34b35'; g.fillRect(182, 70, 76, 8);
    const open = line >= 1;
    g.fillStyle = open ? '#ffe9a8' : '#b86542'; g.fillRect(206, 100, 22, 40);
    g.fillStyle = OUT; g.fillRect(205, 99, 24, 1); g.fillRect(205, 99, 1, 41); g.fillRect(228, 99, 1, 41);
    if (open) {
      const pose = line >= 2 ? 'arms' : 'cry';
      const h = hanaSprite(pose, Math.floor(t * 2) % 2);
      const hx = line >= 2 ? 172 : 204;
      g.drawImage(h.l, hx, 104);
    }
    const px = line >= 2 ? 150 : 120;
    const s = pup[line >= 2 ? (Math.floor(t * 5) % 2 ? 'wag' : 'jump') : line === 0 ? 'sit' : 'bark'];
    g.drawImage(s.r, px, 120);
    if (line >= 2) for (let k = 0; k < 3; k++) { const ph = (t * 0.6 + k / 3) % 1; g.globalAlpha = 1 - ph; g.drawImage(frames('heart')[0].r, 160 + k * 10, 100 - ph * 30); g.globalAlpha = 1; }
    if (line === 0 && Math.floor(t * 2) % 2) txt(g, '똑똑', 216, 92, '#ffffff', 'center');
    // 비
    g.fillStyle = 'rgba(200,220,255,0.5)';
    for (let i = 0; i < 40; i++) { const x = (i * 53 + t * 40) % VW, y = (i * 37 + t * 220) % VH; g.fillRect(x, y, 1, 4); }
    panel(g, 12, 6, VW - 24, 40);
    para(g, STORY.ending[line], VW / 2, 20, VW - 50);
    if (blinkOn(t)) txt(g, '▼', VW - 26, 38, '#ffe36b', 'center');
  } else {
    // 함께 농장으로 소풍: 추억 모음
    const h = hanaSprite('stand', 0); g.drawImage(h.r, 130, 104);
    g.drawImage(pup[Math.floor(t * 3) % 2 ? 'wag' : 'idle'].r, 156, 120);
    panel(g, 14, 6, VW - 28, 92);
    txt(g, '함께 찾은 추억', VW / 2, 18, '#ffe36b', 'center');
    const got = save.memories.filter(Boolean).length;
    STAGES.forEach((s, i) => {
      const x = 24 + (i % 2) * 140, y = 34 + Math.floor(i / 2) * 14;
      g.globalAlpha = save.memories[i] ? 1 : 0.3; g.drawImage(frames('memory')[0].r, x, y - 7); g.globalAlpha = 1;
      txt(g, save.memories[i] ? s.memory : '???', x + 18, y, save.memories[i] ? '#ffffff' : '#b7a59a');
    });
    txt(g, got === 8 ? '추억을 모두 찾았다! 고마워, 콩이!' : `추억 ${got} / 8 — 다시 가서 찾아볼까?`, VW / 2, 88, got === 8 ? '#ffe36b' : '#fff4de', 'center');
    if (lt > 1.5 && blinkOn(t)) txt(g, '— 끝 —', VW / 2, 166, '#ffe36b', 'center');
  }
}
