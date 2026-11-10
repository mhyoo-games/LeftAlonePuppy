// 작은 도트 그림판: 픽셀 단위로 도형을 칠하고, 마지막에 Kenney처럼 진한 테두리를 두른다.
export const OUT = '#3f2631'; // Kenney Tiny Farm 테두리 색

export class Pix {
  readonly w: number; readonly h: number;
  private d: (string | null)[];
  constructor(w: number, h: number) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
  get(x: number, y: number): string | null { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.d[y * this.w + x]; }
  set(x: number, y: number, c: string | null): this {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
    return this;
  }
  rect(x: number, y: number, w: number, h: number, c: string): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }
  /** 타원 채우기 (가운데 cx,cy, 반지름 rx,ry) */
  oval(cx: number, cy: number, rx: number, ry: number, c: string): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.set(x, y, c);
    }
    return this;
  }
  /** 이미 칠한 곳 안에서만 칠하기 (그림자·무늬) */
  ovalOn(cx: number, cy: number, rx: number, ry: number, c: string): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 && this.get(x, y)) this.set(x, y, c);
    }
    return this;
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string): this {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
    return this;
  }
  poly(pts: Array<[number, number]>, c: string): this {
    const ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        const yy = y + 0.5;
        if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) * (bx - ax)) / (by - ay));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c);
    }
    return this;
  }
  /** 바깥 테두리: 비어 있고 칠한 칸과 닿은 곳을 진하게 */
  outline(c = OUT, diag = false): this {
    const add: Array<[number, number]> = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].concat(diag ? [[1, 1], [-1, 1], [1, -1], [-1, -1]] : []);
      if (n.some(([dx, dy]) => { const v = this.get(x + dx, y + dy); return v && v !== c; })) add.push([x, y]);
    }
    for (const [x, y] of add) this.set(x, y, c);
    return this;
  }
  /** 다른 그림을 덮어 찍기 (빈칸은 그대로) */
  stamp(o: Pix, ox = 0, oy = 0): this {
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const c = o.get(x, y); if (c) this.set(x + ox, y + oy, c); }
    return this;
  }
  canvas(flip = false): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const g = cv.getContext('2d')!;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.d[y * this.w + x];
      if (c) { g.fillStyle = c; g.fillRect(flip ? this.w - 1 - x : x, y, 1, 1); }
    }
    return cv;
  }
}

/** 같은 그림을 오른쪽·왼쪽 보기로 */
export interface Sprite { r: HTMLCanvasElement; l: HTMLCanvasElement; w: number; h: number }
export function sprite(p: Pix): Sprite { return { r: p.canvas(false), l: p.canvas(true), w: p.w, h: p.h }; }
