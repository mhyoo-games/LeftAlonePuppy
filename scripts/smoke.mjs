// 켜지는지 확인: 제목 → 이야기 → 지도 → 1스테이지 → 오른쪽으로 달리기 → 클리어 → 지도
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = await import(process.env.PLAYWRIGHT_PATH || 'playwright'); }
const { chromium } = pw;
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
const fail = async (m) => { console.error(m); console.error(errs.join('\n')); await b.close(); process.exit(1); };
await p.goto('http://localhost:8765/index.html?dev=1');
await p.waitForTimeout(800);
const scr = () => p.evaluate(() => window.__lap.screen);
if (await scr() !== 'title') await fail('제목 화면이 안 나옴');
await p.keyboard.press('KeyZ'); await p.waitForTimeout(400);
if (await scr() !== 'story') await fail('이야기가 안 나옴');
for (let i = 0; i < 6; i++) { await p.keyboard.press('KeyZ'); await p.waitForTimeout(400); }
if (await scr() !== 'map') await fail('지도가 안 나옴');
await p.keyboard.press('KeyZ'); await p.waitForTimeout(500);
if (await scr() !== 'play') await fail('스테이지가 안 열림');
const x0 = await p.evaluate(() => window.__lap.world.p.b.x);
await p.keyboard.down('ArrowRight'); await p.waitForTimeout(1200); await p.keyboard.up('ArrowRight');
const x1 = await p.evaluate(() => window.__lap.world.p.b.x);
if (!(x1 > x0 + 40)) await fail(`콩이가 안 움직임 (${x0} → ${x1})`);
await p.evaluate(() => { const w = window.__lap.world; w.boss.hp = 0; w.done = 3; });
await p.waitForTimeout(400);
if (await scr() !== 'clear') await fail('클리어 화면이 안 나옴');
await p.waitForTimeout(700); await p.keyboard.press('KeyZ'); await p.waitForTimeout(400);
if (await scr() !== 'map') await fail('지도로 안 돌아감');
const save = await p.evaluate(() => window.__lap.save.cleared);
if (save !== 1) await fail('저장이 안 됨');
await b.close();
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log('켜짐 확인: 제목 → 이야기 → 지도 → 스테이지 → 클리어 → 저장');
