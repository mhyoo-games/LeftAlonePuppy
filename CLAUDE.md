# 이 저장소에서 작업할 때 지킬 것

유민혁(minhyuk94)의 개인 프로젝트 "홀로 남은 강아지 (Left Alone Puppy)". 사용자는 한국어로 대화합니다. 게임 글자도 한국어.

## 무엇인가

농장에 홀로 남은 아기 강아지 콩이가 주인 하나를 찾아 떠나는 웹 횡스크롤 모험 (8 스테이지, 스테이지마다 기믹과 보스, 사이에 지도).
GitHub Pages(`https://mhyoo-games.github.io/LeftAlonePuppy/`, 조직 mhyoo-games, 저장소 이름대로 대문자)에 올린다.

## 지킬 것

- 옛 국산 강아지 횡스크롤 게임에서 영감을 받았지만 **새로 만든 이야기·캐릭터**다. 다른 게임의 이름·캐릭터·그림·음악·맵을 쓰지 않고, 다른 회사·게임 이름을 README·화면·이력서에 넣지 않는다.
- 그림: Kenney Tiny Farm(CC0, `public/assets/kenney/LICENSE.txt`, 묶음 그림 `tinyfarm.png` 16px 12×11칸) + 코드로 그린 도트(`src/gfx/`: 콩이 `puppy.ts`, 적·보스 `critters.ts`, 하나·트럭 `people.ts`). 테두리 색은 Kenney와 같은 `#3f2631`. 글꼴: 갈무리(OFL).
- 소리: `src/audio/sound.ts`에서 Web Audio로 합성. 곡은 새로 쓴 것만, 음원 파일을 넣지 않는다.
- 규칙(맵 조립·물리·도달 검사·저장)은 `src/core/`, 스테이지 진행(적·보스·발판)은 `src/game/world.ts` — 둘 다 화면과 분리한 순수 TS (import에 `.ts` → `node --test`로 바로 테스트). 화면은 `src/gfx/`·`src/ui/`, 흐름은 `src/main.ts`.
- 맵은 `src/core/levels.ts`의 조각(`CHUNKS`)을 이어 붙여 만든다. 조각·스테이지를 바꾸면 `tests/core.test.ts`가 통과해야 한다 (시작→보스 방·쉼터·추억에 닿을 수 있는지, 뼈다귀 대부분을 먹을 수 있는지 BFS로 검사).
- 보스를 바꾸면 `scripts/bossbot.ts`(간단한 봇)가 8 보스를 모두 이기는지 본다 (테스트에도 들어 있음). 아이도 할 수 있게 너무 어렵지 않게.
- 저장은 localStorage `lap_save` 하나 (`src/core/save.ts`의 `parseSave`가 망가진 값도 받아 준다).
- 휴대폰: 터치 버튼(`index.html`의 `#pad`), 세로면 화면 위·버튼 아래, 안전 영역을 피한다.
- CI(`ci.yml`): 테스트 → 타입 검사 → 빌드 → headless Chrome으로 켜지는지(`scripts/smoke.mjs`) → Pages 배포.
- 예전 주소(`minhyuk94.github.io/…`)에서 옮겨 올 때 저장을 받아 넣는 `carry.js`(예전 주소의 안내 페이지가 `#carry=`로 보냄)를 `<head>` 맨 앞에서 읽는다. 지우지 않는다.
- 큰 기능이 바뀌면 이력서 저장소(minhyuk94.github.io)의 `games` 카드도 ko/ja/en으로 맞춘다. 소스 코드·저장소 링크는 이력서에 넣지 않는다.

## 이 작업 환경에서 돌려 보기

- npm 설치가 막혀 있을 수 있다. `ln -s /opt/npm-tools/node_modules node_modules` 후 `node scripts/build.mjs`, 타입 검사는 `/opt/npm-tools/node_modules/.bin/tsc --noEmit -p .`
- 화면 확인: `dist`를 로컬 http 서버로 열고 Playwright(`/opt/npm-tools`) + `/usr/bin/google-chrome`. 주소에 `?dev=1`이면 `window.__lap`으로 조작할 수 있다 (`play(i)`, `map(i)`, `story(n)`, `ending(n)`, `setSave()`, `world`).
- 켜짐 확인: `CHROME=/usr/bin/google-chrome PLAYWRIGHT_PATH=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/smoke.mjs`
