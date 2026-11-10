// 점프·달리기 물리와 칸 충돌 (순수 계산)
import { TILE, type Grid } from './map.ts';

export const PHYS = {
  gravity: 980,       // px/s²
  maxFall: 380,
  run: 112,           // 최고 달리기 속도
  accel: 900,         // 땅에서 가속
  airAccel: 620,
  friction: 1100,     // 손 뗐을 때 멈추는 힘
  iceFriction: 140,   // 얼음
  iceAccel: 260,
  jump: 318,          // 점프 처음 속도 → 약 3칸
  jumpCut: 0.42,      // 일찍 떼면 이만큼만 (짧은 점프)
  spring: 500,        // 스프링 → 약 8칸
  coyote: 0.09,       // 발판을 막 벗어나도 점프 되는 시간
  buffer: 0.12,       // 땅에 닿기 직전 누른 점프 기억
};

export interface Body { x: number; y: number; w: number; h: number; vx: number; vy: number; onGround: boolean }

/** 몸이 겹치는 칸 범위 */
function span(a: number, len: number): [number, number] {
  return [Math.floor(a / TILE), Math.floor((a + len - 0.001) / TILE)];
}

/** 한 프레임 이동 + 칸 충돌. 결과: 벽에 부딪혔는지(좌우), 천장에 머리 박았는지 */
export function moveBody(b: Body, dt: number, g: Grid, opt: { dropThrough?: boolean } = {}): { wall: boolean; ceil: boolean; landed: boolean } {
  let wall = false, ceil = false, landed = false;
  // 가로
  let nx = b.x + b.vx * dt;
  const [y0, y1] = span(b.y, b.h);
  if (b.vx > 0) {
    const tx = Math.floor((nx + b.w - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) if (g.solid(tx, ty)) { nx = tx * TILE - b.w; b.vx = 0; wall = true; break; }
  } else if (b.vx < 0) {
    const tx = Math.floor(nx / TILE);
    for (let ty = y0; ty <= y1; ty++) if (g.solid(tx, ty)) { nx = (tx + 1) * TILE; b.vx = 0; wall = true; break; }
  }
  b.x = nx;
  // 세로
  const wasBottom = b.y + b.h;
  let ny = b.y + b.vy * dt;
  const [x0, x1] = span(b.x, b.w);
  b.onGround = false;
  if (b.vy >= 0) {
    const ty = Math.floor((ny + b.h - 0.001) / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      const top = ty * TILE;
      const hit = g.solid(tx, ty) || (!opt.dropThrough && g.oneway(tx, ty) && wasBottom <= top + 0.5);
      if (hit) { ny = top - b.h; landed = b.vy > 0; b.vy = 0; b.onGround = true; break; }
    }
  } else {
    const ty = Math.floor(ny / TILE);
    for (let tx = x0; tx <= x1; tx++) if (g.solid(tx, ty)) { ny = (ty + 1) * TILE; b.vy = 0; ceil = true; break; }
  }
  b.y = ny;
  return { wall, ceil, landed };
}

/** 발 바로 아래가 서 있을 수 있는 곳인지 (가장자리 확인용) */
export function groundAhead(b: Body, dir: number, g: Grid): boolean {
  const fx = dir > 0 ? b.x + b.w + 1 : b.x - 1;
  const tx = Math.floor(fx / TILE), ty = Math.floor((b.y + b.h + 1) / TILE);
  return g.solid(tx, ty) || g.oneway(tx, ty);
}

/** 두 상자가 겹치는지 */
export function overlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** 점프로 오를 수 있는 최대 높이(px)와 같은 높이로 건너는 최대 거리(px) — 맵 검사용 */
export function jumpReach(): { up: number; across: number } {
  const t = PHYS.jump / PHYS.gravity;
  return { up: (PHYS.jump * PHYS.jump) / (2 * PHYS.gravity), across: 2 * t * PHYS.run };
}
