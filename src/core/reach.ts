// 맵 검사: 시작점에서 걸어가고 점프해서 어디까지 갈 수 있는지 (칸 단위 근사).
// 실제 물리보다 조금 보수적으로 잡는다 → 테스트를 통과한 맵은 사람이 깰 수 있다.
import type { Grid } from './map.ts';

export const REACH = { rise: 2, across: 4, springRise: 7, springAcross: 5, platformRange: 3 };

function key(x: number, y: number): number { return y * 10000 + x; }

/** 서 있을 수 있는 칸인지: 비어 있고(막힘·가시·물 아님), 발밑이 땅·판자·발판 */
export function standable(g: Grid, x: number, y: number): boolean {
  const c = g.at(x, y);
  if (c === '#' || c === '^' || c === '~' || y >= g.h) return false;
  if (x < 0 || x >= g.w) return false;
  const below = g.at(x, y + 1);
  return below === '#' || below === '=' || below === '-' || below === '|' || below === '_';
}

/** 움직이는 발판이 지나가는 자리도 발판으로 본다 */
function platformCells(g: Grid): Set<number> {
  const s = new Set<number>();
  for (const [x, y] of g.find('-')) for (let k = -REACH.platformRange; k <= REACH.platformRange; k++) s.add(key(x + k, y - 1));
  for (const [x, y] of g.find('|')) for (let k = 0; k <= REACH.platformRange; k++) s.add(key(x, y - 1 - k));
  return s;
}

/** 시작점에서 갈 수 있는 서는 칸들 */
export function reachable(g: Grid, sx: number, sy: number): Set<number> {
  const plat = platformCells(g);
  const canStand = (x: number, y: number) => x >= 0 && x < g.w && y >= 0 && y < g.h && g.at(x, y) !== '#' && g.at(x, y) !== '^' && g.at(x, y) !== '~' && (standable(g, x, y) || plat.has(key(x, y)));
  const clear = (x: number, y: number) => g.at(x, y) !== '#';
  const seen = new Set<number>();
  const q: Array<[number, number]> = [];
  // 시작점이 공중이면 아래로 떨어진 곳에서
  let y0 = sy;
  while (y0 < g.h && !canStand(sx, y0)) y0++;
  if (y0 >= g.h) return seen;
  const push = (x: number, y: number) => { const k = key(x, y); if (!seen.has(k)) { seen.add(k); q.push([x, y]); } };
  push(sx, y0);
  while (q.length) {
    const [x, y] = q.shift()!;
    const spring = g.at(x, y) === 'S';
    const rise = spring ? REACH.springRise : REACH.rise;
    const across = spring ? REACH.springAcross : REACH.across;
    // 걷기·떨어지기
    for (const d of [-1, 1]) {
      const nx = x + d;
      if (!clear(nx, y) || g.at(nx, y) === '^' || g.at(nx, y) === '~') continue;
      if (canStand(nx, y)) { push(nx, y); continue; }
      let fy = y + 1;
      while (fy < g.h && clear(nx, fy) && !canStand(nx, fy) && g.at(nx, fy) !== '~' && g.at(nx, fy) !== '^') fy++;
      if (fy < g.h && canStand(nx, fy)) push(nx, fy);
    }
    // 점프: 머리 위가 비어 있는 만큼만 오른다
    let head = 0;
    while (head < rise && clear(x, y - head - 1)) head++;
    for (let ty = y - head; ty <= Math.min(g.h - 1, y + 10); ty++) {
      const down = Math.max(0, ty - y);
      const reach = across + Math.floor(down / 2);
      for (let tx = x - reach; tx <= x + reach; tx++) {
        if (tx === x && ty === y) continue;
        if (!canStand(tx, ty)) continue;
        // 오르는 경우 도착 칸 위도 비어 있어야
        if (ty < y && !clear(tx, ty - 1)) continue;
        push(tx, ty);
      }
    }
  }
  return seen;
}

/** (x,y) 물건을 점프로 집을 수 있는지: 근처 서는 칸에서 위로 3칸 이내 */
export function grabbable(seen: Set<number>, x: number, y: number): boolean {
  for (let sy = y; sy <= y + 3; sy++) for (let sx = x - 2; sx <= x + 2; sx++) if (seen.has(key(sx, sy))) return true;
  return false;
}
export const cellKey = key;
