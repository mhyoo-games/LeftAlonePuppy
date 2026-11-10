// 맵: 16px 칸, 높이 14칸. 스테이지는 짧은 조각(chunk)을 이어 붙여 만든다.
// 화면과 상관없는 순수 계산 (테스트에서 바로 씀).

export const TILE = 16;
export const ROWS = 14;
/** 땅 윗면이 시작되는 줄 (조각의 g는 이 줄부터 아래 끝까지) */
export const GROUND_ROW = 11;

/**
 * 칸 글자
 *  .  빈칸            #  땅(막힘)        =  위로만 통과하는 판자
 *  ^  가시(닿으면 다침)  ~  물(빠지면 다침, 안전한 곳으로)
 *  P  시작   C  쉼터(다시 시작 지점)   X  보스가 나오는 곳(보스 방 시작)
 *  b  뼈다귀   H  하트   M  하나의 물건(숨은 수집품)   F  반딧불(동굴)
 *  S  스프링(건초·차양)   -  좌우로 움직이는 발판   |  위아래로 움직이는 발판   _  밟으면 떨어지는 발판
 *  w  걷는 적   h  뛰는 적   f  나는 적   d  떨어지는 것(솔방울·고드름)   r  굴러오는 것(통·눈덩이)   s  가시 달린 적(짖으면 웅크림)
 *  D  작은 장식   T  나무 장식
 */
export type Cell = string;

export interface Chunk { g: string; r: string[] }

/** 조각들을 이어 14줄 맵으로. g는 땅 줄(11~13줄에 같은 무늬), r은 땅 위 줄들(아래에 맞춤) */
export function assemble(chunks: Chunk[]): string[] {
  const rows: string[] = Array.from({ length: ROWS }, () => '');
  for (const c of chunks) {
    const w = c.g.length;
    const top: string[] = Array.from({ length: GROUND_ROW }, () => '.'.repeat(w));
    const r = c.r.slice(-GROUND_ROW);
    r.forEach((line, i) => {
      const y = GROUND_ROW - r.length + i;
      top[y] = (line + '.'.repeat(w)).slice(0, w);
    });
    for (let y = 0; y < GROUND_ROW; y++) rows[y] += top[y];
    for (let y = GROUND_ROW; y < ROWS; y++) {
      // 물은 윗줄만 물결, 아래는 물 / 구덩이는 끝까지 빔
      rows[y] += c.g;
    }
  }
  return rows;
}

export class Grid {
  readonly w: number;
  readonly h: number;
  private cells: string[];
  constructor(rows: string[]) {
    this.h = rows.length;
    this.w = Math.max(...rows.map((r) => r.length));
    this.cells = rows.map((r) => r.padEnd(this.w, '.'));
  }
  at(x: number, y: number): string {
    if (x < 0 || x >= this.w) return '#';    // 양 끝은 벽
    if (y < 0) return '.';
    if (y >= this.h) return '.';             // 아래는 구멍
    return this.cells[y][x];
  }
  solid(x: number, y: number): boolean { return this.at(x, y) === '#'; }
  oneway(x: number, y: number): boolean { return this.at(x, y) === '='; }
  hazard(x: number, y: number): boolean { const c = this.at(x, y); return c === '^' || c === '~'; }
  /** 글자 위치 모두 */
  find(ch: string): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    this.cells.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === ch) out.push([x, y]); });
    return out;
  }
  /** 물건(적·수집품 등) 글자를 빈칸으로 바꾼 복사본 — 지형만 남긴다 */
  terrainOnly(): Grid {
    return new Grid(this.cells.map((r) => r.replace(/[^#=^~]/g, '.')));
  }
}
