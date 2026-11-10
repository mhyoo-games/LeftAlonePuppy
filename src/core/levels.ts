// 8개 스테이지: 맵 조각 목록·기믹·보스·이야기
import { assemble, type Chunk } from './map.ts';

// ── 맵 조각 (g: 땅 무늬 한 줄 → 11~13줄, r: 땅 위 줄들을 아래에 맞춰) ──
// 점프는 2칸 오르고 4칸 건넌다(구덩이 3칸까지). 스프링은 7칸.
export const CHUNKS: Record<string, Chunk> = {
  start: { g: '################', r: [
    '.......b.b.b....',
    '................',
    '.P..D.......T...'] },
  flat: { g: '##############', r: [
    '...b.b.b......',
    '..............',
    '.......w......'] },
  flat2: { g: '################', r: [
    '..........bbb...',
    '................',
    '.........=====..',
    '..D....h......D.'] },
  steps: { g: '##################', r: [
    '............b.....',
    '..................',
    '...........###....',
    '......b....###....',
    '.....###...###..w.'] },
  gap3: { g: '#####...#####', r: [
    '.....b.b.....',
    '.............',
    '.............'] },
  gapPlanks: { g: '###.......####', r: [
    '....b...b.....',
    '...===.===....',
    '..............'] },
  mover: { g: '###.........###', r: [
    '.....b.b.b.....',
    '...............',
    '.....-.........'] },
  vmover: { g: '##################', r: [
    '..........bbbbb...',
    '..................',
    '..........########',
    '..................',
    '..................',
    '..................',
    '..................',
    '........|.........'] },
  vmoverM: { g: '##################', r: [
    '..........b.M.b...',
    '..................',
    '..........########',
    '..................',
    '..................',
    '..................',
    '..................',
    '........|.........'] },
  springUp: { g: '####################', r: [
    '.........bbbb.......',
    '....................',
    '........######......',
    '....................',
    '....................',
    '....................',
    '....................',
    '.....S..........w...'] },
  springM: { g: '####################', r: [
    '..........M.........',
    '....................',
    '........######......',
    '....................',
    '....................',
    '....................',
    '....................',
    '.....S..........D...'] },
  thorns: { g: '#################', r: [
    '......b.b.b......',
    '.................',
    '.....^^^...^^^...'] },
  fallPlats: { g: '##...........##', r: [
    '...b..b..b..b..',
    '...............',
    '..._.._.._.._..'] },
  water: { g: '###~~~~~~~~~###', r: [
    '....b.....b....',
    '...............',
    '....-.....-....'] },
  pads: { g: '##~~~~~~~~~~##', r: [
    '...b...b..b...',
    '..............',
    '...==...==....'] },
  padsM: { g: '##~~~~~~~~~~##', r: [
    '......M.......',
    '..............',
    '.....==.......',
    '..............',
    '...==...==....'] },
  enemies: { g: '################', r: [
    '..b..b.....b..b.',
    '....f.......f...',
    '................',
    '..w.....h....w..'] },
  drops: { g: '################', r: [
    '...d....d....d..',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..b...b....b....'] },
  roller: { g: '######################', r: [
    '...b..b..b..b..b......',
    '......................',
    '..D..................r'] },
  spiky: { g: '##############', r: [
    '......b.......',
    '..............',
    '.....s......D.'] },
  rest: { g: '############', r: [
    '.......b.b..',
    '............',
    '..D..C....H.'] },
  dense: { g: '##################', r: [
    '..................',
    '..b..b..b..b..b...',
    '.D.D.T.D..D.T.D.D.'] },
  hideM: { g: '####...##...####', r: [
    '................',
    '.......M........',
    '......===.......',
    '................'] },
  // 보스 방: 화면 한 칸(20칸) + 오른쪽 벽. 들어오면 왼쪽도 막힌다
  arena: { g: '#####################', r: [
    '....................#',
    '....................#',
    '....................#',
    '....................#',
    '....................#',
    '....................#',
    '....................#',
    '....................#',
    '....................#',
    '....................#',
    '..............X.....#'] },
  arenaAir: { g: '#####################', r: [
    '....................#',
    '....................#',
    '....................#',
    '....................#',
    '....................#',
    '....................#',
    '.......======.......#',
    '....................#',
    '..====........====..#',
    '....................#',
    '..............X.....#'] },
};

export type BossKind = 'rooster' | 'crow' | 'boar' | 'crayfish' | 'bat' | 'goat' | 'bulldog' | 'cat';
export type Theme = 'farm' | 'field' | 'forest' | 'river' | 'cave' | 'snow' | 'town' | 'city';

export interface Stage {
  id: number; name: string; theme: Theme; boss: BossKind; bossName: string; bossHp: number;
  chunks: string[];
  /** 기믹 */
  ice?: boolean; wind?: number; dark?: boolean; rain?: boolean; snow?: boolean;
  /** 적 글자별 모습 */
  look: { w: string; h: string; f: string; d: string; r: string; s: string };
  memory: string;           // 숨은 하나의 물건
  intro: string;            // 지도에서 고를 때 한 줄
  clear: string;            // 깬 뒤 이야기
  map: [number, number];    // 지도 위치 (0~1)
}

export const STAGES: Stage[] = [
  { id: 1, name: '햇살 농장', theme: 'farm', boss: 'rooster', bossName: '꼬꼬대장', bossHp: 3,
    chunks: ['start', 'flat', 'steps', 'springUp', 'flat2', 'gap3', 'rest', 'enemies', 'springM', 'thorns', 'steps', 'flat', 'arena'],
    look: { w: 'chick', h: 'chick', f: 'crow', d: 'egg', r: 'barrel', s: 'hedgehog' },
    memory: '빨간 리본', intro: '하나네 가족이 떠난 농장. 마당 끝 길로 하나의 냄새가 이어진다.',
    clear: '꼬꼬대장이 길을 비켜 주었다. 바퀴 자국이 밀밭 쪽으로 나 있다.', map: [0.1, 0.78] },
  { id: 2, name: '황금 밀밭', theme: 'field', boss: 'crow', bossName: '까마귀 왕', bossHp: 3,
    chunks: ['start', 'enemies', 'gapPlanks', 'dense', 'flat2', 'rest', 'mover', 'thorns', 'hideM', 'springUp', 'enemies', 'arenaAir'],
    look: { w: 'mouse', h: 'grasshopper', f: 'crow', d: 'egg', r: 'hay', s: 'hedgehog' },
    memory: '밀짚모자', intro: '바람에 출렁이는 밀밭. 까마귀들이 하늘을 지키고 있다.',
    clear: '까마귀 왕이 날아갔다. 저 멀리 숲에서 하나의 웃음소리가 들린 것 같다.', map: [0.24, 0.6] },
  { id: 3, name: '소나무 숲', theme: 'forest', boss: 'boar', bossName: '멧돼지 돌쇠', bossHp: 4,
    chunks: ['start', 'drops', 'mover', 'spiky', 'vmoverM', 'rest', 'gap3', 'enemies', 'fallPlats', 'steps', 'drops', 'arena'],
    look: { w: 'squirrel', h: 'squirrel', f: 'owl', d: 'pinecone', r: 'log', s: 'hedgehog' },
    memory: '꽃무늬 손수건', intro: '빽빽한 소나무 숲. 솔방울이 툭툭 떨어진다.',
    clear: '돌쇠가 숲길을 열어 주었다. 물소리가 가까워진다.', map: [0.38, 0.72] },
  { id: 4, name: '맑은 개울', theme: 'river', boss: 'crayfish', bossName: '집게왕', bossHp: 4,
    chunks: ['start', 'water', 'pads', 'enemies', 'rest', 'water', 'padsM', 'gapPlanks', 'water', 'flat', 'arena'],
    look: { w: 'crab', h: 'frog', f: 'dragonfly', d: 'pinecone', r: 'log', s: 'hedgehog' },
    memory: '노란 고무공', intro: '맑은 개울. 통나무와 연잎을 밟고 건너야 한다.',
    clear: '집게왕이 물속으로 사라졌다. 냄새가 산 아래 동굴로 이어진다.', map: [0.52, 0.52] },
  { id: 5, name: '반딧불 동굴', theme: 'cave', boss: 'bat', bossName: '큰 박쥐', bossHp: 4, dark: true,
    chunks: ['start', 'fallPlats', 'drops', 'enemies', 'rest', 'vmover', 'thorns', 'hideM', 'mover', 'fallPlats', 'arenaAir'],
    look: { w: 'mole', h: 'slime', f: 'bat', d: 'rock', r: 'rock', s: 'hedgehog' },
    memory: '크레파스', intro: '깜깜한 동굴. 반딧불을 모으면 앞이 더 잘 보인다.',
    clear: '동굴 끝에 하얀 빛이 보인다. 밖은 눈이 내리고 있다.', map: [0.6, 0.3] },
  { id: 6, name: '눈꽃 고개', theme: 'snow', boss: 'goat', bossName: '산양 뿔뿔이', bossHp: 5, ice: true, snow: true, wind: -28,
    chunks: ['start', 'roller', 'steps', 'gap3', 'rest', 'drops', 'roller', 'springM', 'flat2', 'gapPlanks', 'arena'],
    look: { w: 'rabbit', h: 'rabbit', f: 'owl', d: 'icicle', r: 'snowball', s: 'hedgehog' },
    memory: '털장갑', intro: '미끄러운 얼음 고개. 바람이 거꾸로 분다.',
    clear: '고개를 넘자 마을 불빛이 보였다. 하나도 이 길을 지나갔을까?', map: [0.72, 0.42] },
  { id: 7, name: '장터 마을', theme: 'town', boss: 'bulldog', bossName: '골목대장 불독', bossHp: 5,
    chunks: ['start', 'springUp', 'enemies', 'roller', 'rest', 'gapPlanks', 'springM', 'steps', 'spiky', 'flat', 'arena'],
    look: { w: 'rat', h: 'rat', f: 'pigeon', d: 'pot', r: 'cart', s: 'hedgehog' },
    memory: '가족사진', intro: '북적이는 장터. 차양을 밟으면 높이 튀어 오른다.',
    clear: '불독이 꼬리를 흔들었다. 버스 정류장에 "도시행" 표지판이 있다.', map: [0.82, 0.62] },
  { id: 8, name: '비 오는 도시', theme: 'city', boss: 'cat', bossName: '검은발 대장', bossHp: 6, rain: true,
    chunks: ['start', 'gapPlanks', 'fallPlats', 'roller', 'rest', 'mover', 'drops', 'thorns', 'hideM', 'enemies', 'arenaAir'],
    look: { w: 'rat', h: 'rat', f: 'pigeon', d: 'pot', r: 'can', s: 'hedgehog' },
    memory: '강아지 그림', intro: '비 내리는 도시. 하나의 냄새가 아주 가깝다!',
    clear: '골목 끝 창문에 불이 켜져 있다. 그리운 목소리가 들린다…', map: [0.92, 0.2] },
];

/** 스테이지 맵 (14줄) */
export function stageRows(s: Stage): string[] {
  return assemble(s.chunks.map((k) => {
    const c = CHUNKS[k];
    if (!c) throw new Error('없는 조각: ' + k);
    return c;
  }));
}

/** 보스 방이 시작하는 칸 (마지막 조각의 시작) */
export function arenaStart(s: Stage): number {
  let x = 0;
  for (const k of s.chunks.slice(0, -1)) x += CHUNKS[k].g.length;
  return x;
}

export const STORY = {
  intro: [
    '바람이 살랑이는 햇살 농장.',
    '오늘은 하나네 가족이 도시로 이사 가는 날.',
    '짐 싣느라 바쁜 사이, 아기 강아지 콩이는 건초 더미에서 깜빡 잠이 들었다.',
    '눈을 떠 보니… 트럭도, 하나도 보이지 않는다.',
    '킁킁. 아직 하나의 냄새가 남아 있다.',
    '콩이는 하나를 찾아 길을 떠나기로 했다!',
  ],
  ending: [
    '똑똑. 문이 열리자 익숙한 냄새가 쏟아졌다.',
    '"콩이야…? 콩이야!"',
    '하나는 젖은 콩이를 꼭 끌어안았다.',
    '먼 길을 혼자 걸어온 작은 발바닥.',
    '이제 다시는 혼자가 아니야.',
  ],
};
