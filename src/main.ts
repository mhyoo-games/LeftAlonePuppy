// 홀로 남은 강아지 — 화면 흐름: 제목 → 이야기 → 지도 ⇄ 스테이지 → 클리어 → … → 엔딩
import { STAGES, STORY } from './core/levels.ts';
import { parseSave, newSave, clearStage, unlocked, type Save } from './core/save.ts';
import { World } from './game/world.ts';
import { VW, VH, loadSheet, drawBackground, drawTiles, drawThings, drawWeather, drawHud } from './gfx/render.ts';
import { puppySprites } from './gfx/puppy.ts';
import { Controls } from './ui/input.ts';
import { ui, drawTitle, drawStory, drawMap, drawClear, drawPause, drawEnding, nodePos, type MapView } from './ui/screens.ts';
import { Sound } from './audio/sound.ts';

type Screen = 'load' | 'title' | 'story' | 'map' | 'play' | 'pause' | 'clear' | 'ending';
const SAVE_KEY = 'lap_save', MUTE_KEY = 'lap_mute';

const cv = document.getElementById('game') as HTMLCanvasElement;
cv.width = VW; cv.height = VH;
const g = cv.getContext('2d')!;
g.imageSmoothingEnabled = false;

const ctl = new Controls();
const snd = new Sound();
const pup = puppySprites();

function loadSave(): Save { try { return parseSave(localStorage.getItem(SAVE_KEY)); } catch { return newSave(); } }
function storeSave(): void { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* 저장 못 해도 계속 */ } }
let save = loadSave();
try { snd.setMuted(localStorage.getItem(MUTE_KEY) === '1'); } catch { /* */ }

let screen: Screen = 'load';
let t = 0, st = 0;              // 전체 시간, 이 화면에 들어온 뒤 시간
let sel = 0;                    // 메뉴 고른 줄
let line = 0, lt = 0;           // 이야기 줄, 그 줄에 머문 시간
let world: World | null = null;
let stageI = 0;
const mapView: MapView = { sel: 0, from: 0, walk: 1 };
let clearInfo = { bones: 0, total: 0, memory: false };

function go(s: Screen): void {
  screen = s; st = 0; sel = 0;
  document.body.dataset.screen = s;
  if (s === 'title' || s === 'story') snd.music('title');
  else if (s === 'map') snd.music('map');
  else if (s === 'ending') snd.music('ending');
}

let sure = false;   // 새로 시작 한 번 더 확인
function titleMenu(): string[] {
  const m = save.cleared > 0 ? ['이어하기', sure ? '정말 새로? 한 번 더!' : '새로 시작'] : ['시작하기'];
  m.push(snd.muted ? '소리: 끔' : '소리: 켬');
  return m;
}
const pauseMenu = () => ['계속하기', '처음부터 다시', '지도로 돌아가기', snd.muted ? '소리: 끔' : '소리: 켬'];

function toggleMute(): void { snd.setMuted(!snd.muted); try { localStorage.setItem(MUTE_KEY, snd.muted ? '1' : '0'); } catch { /* */ } }

function startStage(i: number): void {
  stageI = i;
  world = new World(i, VW, VH);
  snd.music(STAGES[i].theme);
  go('play');
  snd.music(STAGES[i].theme);
}
function openMap(from: number, to: number): void {
  mapView.from = from; mapView.sel = to; mapView.walk = from === to ? 1 : 0;
  go('map');
}

// ── 화면마다 한 프레임 ──
function menuNav(n: number): void {
  if (ctl.hit('up')) { sel = (sel + n - 1) % n; snd.sfx('select'); }
  if (ctl.hit('down')) { sel = (sel + 1) % n; snd.sfx('select'); }
}

function frame(dt: number): void {
  t += dt; st += dt;
  switch (screen) {
    case 'load': break;
    case 'title': {
      const m = titleMenu();
      menuNav(m.length);
      drawTitle(g, pup, t, m, sel);
      if (ctl.hit('ok') && st > 0.2) {
        const pick = m[sel];
        snd.sfx('ok');
        if (pick === '이어하기') openMap(Math.min(save.cleared, 7), Math.min(save.cleared, 7));
        else if (pick === '새로 시작') { sure = true; }
        else if (pick === '시작하기' || (sure && sel === 1)) { sure = false; save = newSave(); storeSave(); line = 0; lt = 0; go('story'); }
        else toggleMute();
      }
      if (sure && (ctl.hit('up') || ctl.hit('down') || ctl.hit('back'))) sure = false;
      break;
    }
    case 'story': {
      lt += dt;
      drawStory(g, pup, line, t, lt);
      if ((ctl.hit('ok') || ctl.hit('bark')) && lt > 0.3) {
        snd.sfx('select');
        line++; lt = 0;
        if (line >= STORY.intro.length) openMap(0, 0);
      }
      if (ctl.hit('back') && st > 0.5) openMap(0, 0);
      break;
    }
    case 'map': {
      if (mapView.walk < 1) {
        mapView.walk = Math.min(1, mapView.walk + dt * 1.6);
        if (Math.floor(mapView.walk * 8) !== Math.floor((mapView.walk - dt * 1.6) * 8)) snd.sfx('step');
      } else {
        const cur = mapView.sel;
        const goTo = (n: number) => { if (n >= 0 && n < STAGES.length && unlocked(save, n + 1)) { mapView.from = cur; mapView.sel = n; mapView.walk = 0; } else snd.sfx('bonk'); };
        if (ctl.hit('right') || ctl.hit('up')) goTo(cur + 1);
        else if (ctl.hit('left') || ctl.hit('down')) goTo(cur - 1);
        else if (ctl.hit('ok') && st > 0.25) { snd.sfx('ok'); startStage(cur); break; }
        else if (ctl.hit('back') && st > 0.25) go('title');
      }
      drawMap(g, pup, save, mapView, t);
      break;
    }
    case 'play': {
      const w = world!;
      if (ctl.hit('back')) { go('pause'); drawPlay(w); drawPause(g, pauseMenu(), sel); break; }
      const inp = ctl.game();
      // 고정 간격으로 나눠 계산 (빠른 기기·느린 기기 같게)
      const steps = Math.min(8, Math.max(1, Math.round(dt * 120)));
      for (let k = 0; k < steps; k++) {
        w.update(dt / steps, k === 0 ? inp : { ...inp, jumpPressed: false, barkPressed: false });
      }
      for (const e of w.events) {
        snd.sfx(e);
        if (e === 'hurt' || e === 'dead') try { navigator.vibrate?.(40); } catch { /* */ }
      }
      w.events.length = 0;
      snd.music(w.boss && w.locked && w.boss.hp > 0 ? 'boss' : STAGES[stageI].theme);
      drawPlay(w);
      if (w.done > 2.6) {
        clearInfo = { bones: w.bones, total: w.totalBones, memory: w.memory };
        save = clearStage(save, stageI + 1, w.bones, w.memory); storeSave();
        go('clear');
        snd.music('');
      }
      break;
    }
    case 'pause': {
      const m = pauseMenu();
      menuNav(m.length);
      drawPlay(world!); drawPause(g, m, sel);
      if (ctl.hit('back') && st > 0.15) { screen = 'play'; document.body.dataset.screen = 'play'; break; }
      if (ctl.hit('ok') && st > 0.15) {
        snd.sfx('ok');
        if (sel === 0) { screen = 'play'; document.body.dataset.screen = 'play'; }
        else if (sel === 1) startStage(stageI);
        else if (sel === 2) openMap(stageI, stageI);
        else toggleMute();
      }
      break;
    }
    case 'clear': {
      drawPlay(world!);
      drawClear(g, pup, stageI, clearInfo.bones, clearInfo.total, clearInfo.memory, t);
      if (ctl.hit('ok') && st > 0.6) {
        snd.sfx('ok');
        if (stageI === STAGES.length - 1) { line = 0; lt = 0; go('ending'); }
        else openMap(stageI, stageI + 1);
      }
      break;
    }
    case 'ending': {
      lt += dt;
      drawEnding(g, pup, save, line, t, lt);
      if (ctl.hit('ok') && lt > 0.4) {
        if (line < STORY.ending.length) { line++; lt = 0; snd.sfx('select'); }
        else if (lt > 1.5) go('title');
      }
      break;
    }
  }
  ctl.endFrame();
}

function drawPlay(w: World): void {
  drawBackground(g, w.stage.theme, w.cam.x, w.time);
  const sx = w.cam.shake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
  g.save(); g.translate(sx, 0);
  drawTiles(g, w, w.time);
  drawThings(g, w, pup, w.time);
  g.restore();
  drawWeather(g, w, w.time);
  drawHud(g, w, w.time, true);
}

// ── 화면 터치: 메뉴에서는 누르면 '확인', 지도는 자리를 누르면 그곳으로 ──
cv.addEventListener('pointerdown', (e) => {
  snd.unlock();
  const r = cv.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * VW, y = ((e.clientY - r.top) / r.height) * VH;
  if (screen === 'map' && mapView.walk >= 1) {
    for (let i = 0; i < STAGES.length; i++) {
      const [nx, ny] = nodePos(i);
      if (Math.hypot(nx - x, ny - y) < 14) {
        if (i === mapView.sel) ctl.press('ok');
        else if (unlocked(save, i + 1)) { mapView.from = mapView.sel; mapView.sel = i; mapView.walk = 0; }
        else snd.sfx('bonk');
        return;
      }
    }
    if (y > VH - 46) ctl.press('ok');
    return;
  }
  if (screen === 'title') {
    const m = titleMenu();
    for (let i = 0; i < m.length; i++) if (Math.abs(y - (84 + i * 16)) < 8) { sel = i; ctl.press('ok'); return; }
    return;
  }
  if (screen === 'pause') {
    const m = pauseMenu();
    for (let i = 0; i < m.length; i++) if (Math.abs(y - (74 + i * 16)) < 8) { sel = i; ctl.press('ok'); return; }
    return;
  }
  if (screen !== 'play') ctl.press('ok');
});
ctl.onAny = () => snd.unlock();
ctl.bindButtons(document.body);

// 전체 화면 (되는 브라우저만)
const fsBtn = document.getElementById('fs');
if (fsBtn) {
  if (!document.documentElement.requestFullscreen) fsBtn.style.display = 'none';
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => {
      try { (window.screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape')?.catch(() => {}); } catch { /* */ }
    }).catch(() => {});
  });
}

// ── 화면 크기 맞추기 (16:9, 휴대폰 세로면 위에 붙이고 아래는 버튼) ──
function fit(): void {
  const portrait = innerHeight > innerWidth;
  document.body.classList.toggle('portrait', portrait);
  const maxH = portrait ? innerHeight * 0.55 : innerHeight;
  const s = Math.min(innerWidth / VW, maxH / VH);
  cv.style.width = `${Math.floor(VW * s)}px`; cv.style.height = `${Math.floor(VH * s)}px`;
}
addEventListener('resize', fit); fit();
const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('touch', touch);
ui.touch = touch;

// ── 반복 ──
let last = performance.now();
function loop(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  frame(dt);
  requestAnimationFrame(loop);
}

// 개발용 조작 (?dev=1)
if (new URLSearchParams(location.search).has('dev')) {
  (window as unknown as Record<string, unknown>).__lap = {
    get screen() { return screen; }, get world() { return world; }, get save() { return save; },
    setSave(s: Partial<Save>) { save = { ...newSave(), ...s }; storeSave(); },
    play(i: number) { startStage(i); }, map(i: number) { openMap(i, i); }, go, press: (b: Parameters<Controls['press']>[0]) => ctl.press(b),
    story(n: number) { line = n; lt = 2; go('story'); }, ending(n: number) { line = n; lt = 2; go('ending'); },
    frame,
  };
}

Promise.all([loadSheet('assets/kenney/tinyfarm.png'), document.fonts?.load('12px Galmuri').catch(() => {}), document.fonts?.load('bold 12px Galmuri').catch(() => {})]).then(() => {
  go('title');
  requestAnimationFrame(loop);
});
