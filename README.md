# Phonics Run (파닉스 런)

Word Mashup 3D 월드(B안 시안)의 환경 — 하늘·구름바다·떠 있는 잔디섬·셰브론 발판·나무·울타리·열기구·네온 스테이지·
줄무늬 게이트 — 을 옆으로 달리는 코스로 깐 슈퍼마리오식 파닉스 게임. FPR K U1L1(Mm) 레슨팩 단어.
캐릭터는 Phonics Land 대표 캐릭터 **Tata**(Classmate Friends)를 캐릭터 시트 치수대로 코드 3D 모델링(`js/tata.js`).

- 배포: https://jinilee-hue.github.io/Phonics-Run/
- 로컬: `python3 -m http.server 5185 --bind 127.0.0.1` → http://127.0.0.1:5185/ (ES 모듈이라 file:// 로는 안 열린다)
- 주소 옵션: `?level=2`(1~5) · `?play` 바로 시작 · `?d=60` 코스 60 지점에서 · `?nohint` 시범·손 안내 끔 · `?fake=ok,wrong,silence` 말하기 판정 대신 ·
  `?debug` 판정 로그 · `?capture=1` 테스트(rAF 없음, `window.PR.step`)
- 캐릭터 확인: `dev/tata.html?yaw=0&outfit=shades,cape,crown,goldshoes` · 3D 아이콘 확인: `dev/icons.html`

## 흐름
1. 타이틀: Tata가 손을 흔든다. 레벨 줄(1·2·3, 별 — 고르지 않음), START. 왼쪽 위 phonics-api 키·SHOP·지갑, 오른쪽 위 언어 토글(튜터 음성만, 처음 한국어)·소리.
2. START: 처음 한 번 마이크 권한 → (방문 첫 판) Tata 시범: 인사 → "/m/ /m/ 이 소리로 시작하는 그림을 모아 봐" → 장갑 손이 → 버튼(달려서 moon) → 점프 버튼(틈 건너기) →
   "다른 그림은 뛰어넘어" → "이제 네가 해 봐" → 코스 새로 시작. 시범은 보상·감점 없음, SKIP.
3. 달리기: m 그림은 먹고(단어 음성), 다른 그림(egg·lid·ten·heart·fox·gift·kite·gate·doll)은 뛰어넘는다. 다가가면 단어를 읽어 준다.
   함정 그림 = 하트 −1·코인 −2, 낙하 = 하트 −1(마지막 안전한 곳에서). 하트 3개. 8초 동안 손을 놓으면 손 안내 반복.
4. m 그림을 다 모으면 게이트가 깨어난다. 게이트에서 모은 단어를 하나씩 말한다: "/m/ /m/ 단어" → 아이가 말함 → 맞으면 코인 +3.
   JUMP = 그 단어 건너뜀(코인 없음), 두 번 틀리면 넘어감, 첫 침묵에 JUMP 안내. 판정할 수 없으면(마이크 없음 등) 말하기 없이 열림.
5. 게이트로 들어가면 결과(별 = 3 − 잃은 하트, 최소 1 · 모은 그림 · 코인). 코인은 지갑으로 → SHOP: 선글라스 15·망토 30·왕관 45·황금 신발 60.
6. 월드 5개(사용자 2026-11-23 참고 이미지·인트로 영상), 시점은 **Tata 뒤에서 따라가기**(코스가 화면 안쪽으로). 조작 = 왼쪽 아래 스틱(또는 방향키·WASD) + 점프 버튼(Space·Z).
   START는 아직 못 깬 첫 월드부터(레벨 고르기 없음, 첫 화면에 레벨 표시 없음).
   - 1 **숲**(영상): 무지개, 둥근 나무, 빨강·보라 버섯, 초록·파랑 파이프, 폭포, 체크무늬 출발·결승선 · m 4 · 함정 1
   - 2 **캔디**: 웨하스 길과 사탕지팡이 난간, 초콜릿 강·언덕, 케이크, 컵케이크, 생강과자 집, 막대사탕 · **젤리 북**으로 높은 단 · m 3 · 함정 2
   - 3 **눈**: 얼음 절벽과 (무지개) 고드름, 눈 덮인 소나무, 통나무집(굴뚝 연기), 눈사람, 얼음 다리, 내리는 눈 · 앞뒤로 움직이는 발판 · m 4 · 함정 2
   - 4 **사막 오아시스**: 모래 언덕, 피라미드, 선인장, 야자수, 돌 아치, 텐트, 오아시스 연못 · **나는 양탄자** · m 4 · 함정 2
   - 5 **우주**: 행성(고리), 은하, 소행성 발판, 별빛 길, 수정, 빛나는 버섯 · 낮은 중력(점프가 길다), UFO 발판 · m 3 · 함정 2

## 파일
| 파일 | 역할 |
|---|---|
| `js/game.js` | 흐름·물리(코요테 타임·점프 버퍼)·카메라·시범·게이트 말하기·상점 |
| `js/env.js` | 렌더러·하늘·조명·테마(`THEMES`, `applyTheme`)·공통 빌더(섬·나무·게이트·스테이지) |
| `js/worlds.js` | 5월드 지형(길·난간·고드름)·소품·배경(산·피라미드·행성·은하)·발판·리프트·바운서·눈 내림 |
| `js/outfits.js` | 꾸미기 아이템 14개(모델 + 가격·부위) — Tata 착용과 상점 그림에 함께 씀 |
| `js/level.js` | 코스 데이터, 발음 기대값 `PHON` |
| `js/items.js` · `js/tata.js` | 카드·코인 · Tata 모델/동작/꾸미기(눈은 매직블럭 여우 눈 스타일) |
| `js/icons3d.js` | 화면 아이콘을 3D로 렌더(하트·코인·별·장갑 손·자물쇠·상점 아이템·깨진 하트) → PNG |
| `js/audio.js` · `js/voice.js` | 음성·효과음·배경음악 · 클립 표(생성물) |
| `js/phonics-api.js` · `js/mic.js` · `js/stt.js` · `js/stt-worker.js` · `stt/` | 발음 판정(phonics-kit / Phonics Puzzle 사본) |
| `js/phonics-progress.js` | 공통 진도(phonics-kit 사본), id `phonics-run` |
| `assets/words` · `assets/voice` · `assets/audio/bgm.mp3` | 레슨팩 그림 · 음성 · 배경음악 |

## 생성 스크립트
- 음성: `uv run --with numpy python tools/build_voice.py` (레슨팩 단어·/m/ + 튜터 대사 EN/KO, phonics-api TTS, 키는 `~/.config/phonics-api/key`)
- 배경음악: `uv run --with numpy --with scipy --with pyloudnorm python tools/make_bgm.py` (블루그래스 호다운 G 160BPM 24초)
- QA: `uv run --with playwright python tools/shots.py --scene basic|flow|hurt|locked|demo|say|shop [--query nohint&fake=ok,wrong]`,
  캐릭터 비교 `tools/tata_cmp.py` · `tools/tata_face.py` · `tools/tata_hands.py`

## 저장
`phonics-run.save`(레벨별 별·지갑·산 것·입은 것) · `phonics-run.lang` · `phonics-run.muted` · `phonics.progress` · `phonics_api_key`

## 알려진 것
- 한국어 대사 k:oops · k:tryit · k:allclear 는 받아쓰기 확인을 통과 못 해 첫 녹음 — 귀로 확인 필요.
- 손으로 해 본 난이도 검증은 아직(점프 거리·함정 간격).
