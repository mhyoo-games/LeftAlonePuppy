// 콩이: 크림색 아기 강아지. 큰 머리·반짝이는 까만 눈·늘어진 갈색 귀·빨간 목걸이와 금빛 방울.
// 부위마다 따로 테두리를 둘러 겹쳐 찍는다 → 머리·귀·다리가 또렷하게 보인다.
import { Pix, sprite, type Sprite } from './pix.ts';

const FUR = '#fff4de', SHADE = '#f0d0a2', EAR = '#d4894f', EARD = '#a65f38', EYE = '#2b1b22', WHITE = '#ffffff';
const NOSE = '#3f2631', PINK = '#ffa3b5', COLLAR = '#e5484d', BELL = '#fdbe53', TONGUE = '#ff6f8a';
const W = 28, H = 22;

export type PupPose = 'idle' | 'blink' | 'wag' | 'run0' | 'run1' | 'run2' | 'run3' | 'jump' | 'fall' | 'bark' | 'hurt' | 'sleep' | 'sit';

const layer = () => new Pix(W, H);

function leg(x: number, y: number, inner: boolean): Pix {
  const p = layer();
  p.rect(x, y, 3, 3, inner ? SHADE : FUR);
  p.rect(x, y + 3, 3, 1, inner ? SHADE : FUR).set(x + 3, y + 3, inner ? SHADE : FUR); // 동그란 발
  return p.outline();
}

function tail(up: number, dy: number): Pix {
  const p = layer();
  // 위로 동그랗게 말린 꼬리
  p.oval(5.2 + up * 0.5, 10 + dy, 1.7, 2.2, FUR);
  p.oval(5.6 + up, 7.4 + dy, 1.6, 1.5, FUR);
  p.set(7 + up, 7 + dy, FUR);
  return p.outline();
}

function body(dy: number): Pix {
  const p = layer();
  p.oval(11.5, 14 + dy, 6.6, 3.9, FUR);
  p.ovalOn(11.5, 16.2 + dy, 5.6, 1.5, SHADE);
  return p.outline();
}

interface Face { dy?: number; ear?: number; eye?: 'open' | 'blink' | 'x' | 'happy'; mouth?: boolean }
function head(o: Face): Pix {
  const dy = o.dy ?? 0;
  const p = layer();
  p.oval(18.2, 8 + dy, 6.1, 5.6, FUR);            // 큰 동그란 머리
  p.oval(22.8, 10.2 + dy, 2.3, 1.8, FUR);         // 짧은 주둥이
  p.ovalOn(22.9, 10.5 + dy, 2, 1.4, WHITE);
  p.ovalOn(18.2, 12.6 + dy, 5, 1.2, SHADE);
  p.outline();
  // 정수리 갈색 무늬
  p.set(18, 3 + dy, EAR).set(19, 3 + dy, EAR).set(18, 4 + dy, EAR);
  // 코·입
  p.rect(24, 9 + dy, 2, 1, NOSE).set(24, 8 + dy, NOSE);
  if (o.mouth) p.rect(22, 11 + dy, 3, 1, NOSE).rect(22, 12 + dy, 2, 1, TONGUE);
  else p.set(23, 11 + dy, NOSE).set(22, 11.4 + dy, NOSE);
  // 눈
  const ex = 19, ey = 6 + dy;
  if (o.eye === 'blink') p.rect(ex, ey + 2, 2, 1, EYE);
  else if (o.eye === 'happy') p.set(ex - 1, ey + 2, EYE).set(ex, ey + 1, EYE).set(ex + 1, ey + 1, EYE).set(ex + 2, ey + 2, EYE);
  else if (o.eye === 'x') p.set(ex, ey, EYE).set(ex + 2, ey, EYE).set(ex + 1, ey + 1, EYE).set(ex, ey + 2, EYE).set(ex + 2, ey + 2, EYE);
  else p.rect(ex, ey, 2, 3, EYE).set(ex, ey, WHITE);
  // 볼
  p.set(18, 10 + dy, PINK).set(19, 10 + dy, PINK);
  return p;
}

function ear(dy: number, lift: number): Pix {
  const p = layer();
  p.oval(14.6, 7.6 + dy + lift, 2.2, 3.6 - Math.max(0, -lift) * 0.4, EAR);
  p.ovalOn(14.9, 8.4 + dy + lift, 1.1, 2.4, EARD);
  return p.outline();
}

function puppy(o: { dy?: number; tail?: number; back?: [number, number][]; front?: [number, number][]; face?: Face; earLift?: number }): Pix {
  const dy = o.dy ?? 0;
  const p = layer();
  const back = o.back ?? [[0, 0], [0, 0]], front = o.front ?? [[0, 0], [0, 0]];
  p.stamp(tail(o.tail ?? 0, dy));
  p.stamp(leg(6 + back[0][0], 15 + back[0][1], true));
  p.stamp(leg(13 + front[0][0], 15 + front[0][1], true));
  p.stamp(body(dy));
  p.stamp(leg(8 + back[1][0], 15 + back[1][1], false));
  p.stamp(leg(15 + front[1][0], 15 + front[1][1], false));
  const hd = dy + (o.face?.dy ?? 0);
  p.stamp(head({ ...o.face, dy: hd }));
  // 턱 아래 빨간 목걸이와 금빛 방울
  p.rect(14, 13 + hd, 5, 1, COLLAR).rect(15, 14 + hd, 3, 1, COLLAR);
  p.set(17, 15 + hd, BELL).set(18, 15 + hd, BELL).set(17, 16 + hd, BELL).set(18, 16 + hd, '#e38628');
  p.stamp(ear(hd, o.earLift ?? 0));
  return p;
}

export function drawPuppy(pose: PupPose): Pix {
  switch (pose) {
    case 'idle': return puppy({ tail: -0.5 });
    case 'blink': return puppy({ tail: -0.5, face: { eye: 'blink' } });
    case 'wag': return puppy({ tail: 1 });
    case 'run0': case 'run1': case 'run2': case 'run3': {
      const k = Number(pose[3]);
      const bob = k % 2 ? -1 : 0;
      const b: [number, number][][] = [[[-1, -1], [1, 0]], [[0, -1], [0, -1]], [[1, 0], [-1, -1]], [[0, -1], [0, -1]]];
      const f: [number, number][][] = [[[1, 0], [-1, -1]], [[0, -1], [0, -1]], [[-1, -1], [1, 0]], [[0, -1], [0, -1]]];
      return puppy({ dy: bob, tail: k < 2 ? 1 : -1, back: b[k], front: f[k], earLift: k % 2 ? 1 : -1 });
    }
    case 'jump': return puppy({ dy: -1, tail: 1, back: [[-2, -1], [-1, -1]], front: [[2, -2], [2, -2]], face: { eye: 'happy' }, earLift: -2 });
    case 'fall': return puppy({ dy: -1, tail: -1, back: [[-1, 0], [0, 0]], front: [[1, 0], [1, 0]], earLift: -3 });
    case 'bark': return puppy({ tail: 1, back: [[-1, 0], [-1, 0]], front: [[1, 0], [1, 0]], face: { dy: -1, eye: 'happy', mouth: true }, earLift: -1 });
    case 'hurt': return puppy({ dy: 1, tail: -1, face: { eye: 'x' }, earLift: 1 });
    case 'sit': {
      const p = layer();
      p.stamp(tail(1, 2));
      const bd = layer(); bd.oval(11, 15, 5, 4.6, FUR); bd.ovalOn(11.5, 17.6, 4, 1.4, SHADE); bd.outline(); p.stamp(bd);
      p.stamp(leg(14, 15, true)); p.stamp(leg(16, 15, false));
      p.stamp(head({ dy: -1 })); p.rect(14, 12, 5, 1, COLLAR).rect(15, 13, 3, 1, COLLAR); p.set(17, 14, BELL).set(18, 14, BELL); p.stamp(ear(-1, 0));
      return p;
    }
    case 'sleep': {
      const p = layer();
      const bd = layer(); bd.oval(12, 16.5, 8.5, 3.8, FUR); bd.ovalOn(12, 18.6, 7.5, 1.3, SHADE); bd.oval(4.5, 15.5, 2.3, 2, FUR); bd.outline(); p.stamp(bd);
      const hd = layer(); hd.oval(18.5, 15, 4.8, 4, FUR); hd.oval(22.4, 16.3, 2.3, 1.6, FUR); hd.ovalOn(22.4, 16.6, 2, 1.2, WHITE); hd.outline(); p.stamp(hd);
      p.rect(24, 15, 1, 1, NOSE).rect(18, 15, 2, 1, EYE).set(19, 17, PINK);
      const e = layer(); e.oval(15.2, 14.6, 1.9, 2.8, EAR); e.ovalOn(15.4, 15.2, 0.9, 1.8, EARD); e.outline(); p.stamp(e);
      return p;
    }
  }
}

export type PupSprites = Record<PupPose, Sprite>;
export function puppySprites(): PupSprites {
  const poses: PupPose[] = ['idle', 'blink', 'wag', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'bark', 'hurt', 'sleep', 'sit'];
  return Object.fromEntries(poses.map((k) => [k, sprite(drawPuppy(k))])) as PupSprites;
}
