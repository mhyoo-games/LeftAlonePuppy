// 이야기 장면용: 하나(콩이의 주인), 이삿짐 트럭 — 코드로 그린 도트
import { Pix, sprite, OUT, type Sprite } from './pix.ts';

const SKIN = '#ffd9b8', SKIN2 = '#f5b994', HAIR = '#5a3a2e', HAIR2 = '#3f2631', DRESS = '#ffcf4a', DRESS2 = '#f0a830';
const W = '#ffffff', EYE = '#2b1b22', CHEEK = '#ffa3b5', SHOE = '#e5484d';

export type HanaPose = 'stand' | 'wave' | 'arms' | 'cry';

function hana(pose: HanaPose, f: number): Pix {
  const p = new Pix(24, 38);
  // 다리·신발
  p.rect(9, 29, 2, 6, SKIN).rect(13, 29, 2, 6, SKIN);
  p.rect(8, 34, 4, 2, SHOE).rect(13, 34, 4, 2, SHOE);
  // 원피스
  p.poly([[8, 16], [16, 16], [19, 30], [5, 30]], DRESS);
  p.line(6, 29, 18, 29, DRESS2); p.rect(11, 18, 2, 2, W);
  // 팔
  if (pose === 'wave') { p.rect(4, 17, 3, 7, SKIN); p.line(17, 17, 21, 10 + f, SKIN).line(18, 17, 22, 10 + f, SKIN); p.oval(21.5, 9 + f, 1.6, 1.6, SKIN); }
  else if (pose === 'arms') { p.line(7, 18, 2, 20 + f, SKIN).line(7, 19, 2, 21 + f, SKIN); p.line(16, 18, 21, 20 + f, SKIN).line(16, 19, 21, 21 + f, SKIN); }
  else { p.rect(5, 17, 3, 8, SKIN); p.rect(16, 17, 3, 8, SKIN); }
  // 머리
  p.oval(12, 9, 7.5, 7.5, HAIR);
  p.oval(3.5, 11, 2.5, 3.5, HAIR).oval(20.5, 11, 2.5, 3.5, HAIR);   // 양갈래
  p.rect(2, 8, 3, 2, SHOE).rect(19, 8, 3, 2, SHOE);                     // 머리끈
  p.oval(12, 10.5, 6, 5.5, SKIN);
  p.rect(6, 4, 12, 3, HAIR); p.set(8, 7, HAIR).set(14, 7, HAIR);        // 앞머리
  // 얼굴
  if (pose === 'cry') { p.line(8, 10, 10, 10, EYE).line(14, 10, 16, 10, EYE); p.set(9, 12, '#8fd3ff').set(15, 12, '#8fd3ff').set(9, 13, '#8fd3ff'); }
  else { p.rect(8, 9, 2, 3, EYE).set(8, 9, W); p.rect(14, 9, 2, 3, EYE).set(14, 9, W); }
  p.rect(6, 12, 2, 1, CHEEK).rect(16, 12, 2, 1, CHEEK);
  p.line(11, 14, 13, 14, '#c34b35');
  p.set(6, 16, SKIN2);
  return p.outline(OUT);
}

function truck(f: number): Pix {
  const p = new Pix(64, 34);
  p.rect(1, 4, 42, 22, '#f4f4f2'); p.rect(1, 4, 42, 3, '#c0cbdc');       // 짐칸
  p.rect(3, 9, 38, 1, '#c0cbdc').rect(3, 15, 38, 1, '#c0cbdc');
  p.poly([[44, 10], [56, 10], [62, 18], [62, 27], [44, 27]], '#3e9bd8'); // 앞
  p.poly([[47, 12], [55, 12], [59, 18], [47, 18]], '#cfe9ff');
  p.rect(1, 25, 61, 3, '#52607c');
  for (const x of [12, 50]) { p.oval(x, 28, 5, 5, '#2d3346'); p.oval(x, 28, 2, 2, '#c0cbdc'); p.set(x + (f ? 1 : -1), 28, '#2d3346'); }
  p.rect(60, 20, 2, 2, '#fdbe53');
  return p.outline(OUT);
}

const cache = new Map<string, Sprite>();
function get(key: string, make: () => Pix): Sprite { let s = cache.get(key); if (!s) { s = sprite(make()); cache.set(key, s); } return s; }
export const hanaSprite = (pose: HanaPose, f = 0): Sprite => get(`h${pose}${f}`, () => hana(pose, f));
export const truckSprite = (f = 0): Sprite => get(`t${f}`, () => truck(f));
