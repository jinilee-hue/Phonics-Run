"""Voice clips for Phonics Run -> assets/voice/*.mp3 + js/voice.js (an ES module: export const VOICE)
- WORDS and the LETTER SOUND /m/: the lesson pack's own audio (Phonics/공통자료/FP.K.U1L1-lesson-pack via
  phonics-kit/tools/lessonpack.py; a word outside the manifest is looked up in the pack's words/<w>.mp3|.wav;
  mirror/mitt/mushroom/match are WAV takes there with broken RIFF sizes, ffmpeg decodes them fine). A word with no pack
  audio at all falls back to the tutor voice (tts_voice.tutor, read back like the lines).
- TUTOR LINES (EN + KO): phonics-api TTS in the one tutor voice of the phonics games (phonics-kit tts_voice.tutor: Ava
  Multilingual shaped to the old 'aiden'), every take read back with whisper and retaken until heard right
  (phonics-kit tutor_takes.best). Needs ~/.config/phonics-api/key and the video-vision venv.
Every clip is trimmed and levelled; {key: [file, start s, gain, dur s]} is applied at playback.
uv run --with numpy python tools/build_voice.py
"""
import json, pathlib, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
import numpy as np
sys.path.insert(0, str(pathlib.Path.home() / 'Documents/Jini/2026/Phonics/phonics-kit/tools'))
import lessonpack  # noqa: E402
import papi  # noqa: E402
import tts_voice  # noqa: E402
import tutor_takes  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'voice'
TB = 'FP.K.U1L1'
SR = 24000
FR = int(SR * .01)
LEAD, TAIL = .10, .25
WORDS = ('moon map milk mop man meat mat mitt mouse mug mail monkey mushroom mirror match mice mouth mask '
         'egg lid ten heart fox gift kite gate doll').split()

# lines said the way you talk to a child (user 2026-11-24: "가이드 음성이 어색하대" → 문장·말투): no "잘했어" after a miss,
# no stiff requests ("마이크를 허용해 줘" → "네 목소리를 들을 수 있게 마이크를 켜 줘")
LINES = {
    'hello': "Hi, I'm Tata! Let's run together!",
    'howto': 'Collect the pictures that start with this sound!',
    'howto2': 'Jump over the other pictures!',
    'demo1': 'Use this to run!',
    'demo2': 'Tap here to jump!',
    'tryit': "Now it's your turn!",
    'good1': 'Great!',
    'good2': "That's it!",
    'good3': 'Nice!',
    'oops': "Oops! That's a different sound!",
    'fall': "Whoa! Let's try again!",
    'allgot': 'You got them all! Run to the gate!',
    'locked': 'Collect all the pictures first!',
    'gate': 'Say each word to open the gate!',
    'sayit': 'Your turn! Say it!',
    'again': 'One more time!',
    'great1': 'Great job!',
    'great2': 'Wonderful!',
    'great3': 'Perfect!',
    'goodtry': "That's okay! Let's try the next one!",
    'jump': 'Too tricky? Tap the jump button!',
    'open': "The gate is open! Let's go!",
    'clear': 'Hooray! Level clear!',
    'allclear': 'Amazing! You ran through every world!',
    'over': "Oh no! Let's try again!",
    'micask': 'Turn on the microphone so I can hear you!',
    'pressstart': 'Tap start to play!',
    'shop': "Let's dress up Tata!",
    'buy': 'Wow, it looks great!',
    'nocoin': "Let's collect more coins!",
}
LINES_KO = {
    'hello': '안녕, 난 타타야! 우리 같이 달려 보자!',
    'howto': '이 소리로 시작하는 그림을 모아 보자!',
    'howto2': '다른 그림은 폴짝 뛰어넘어!',
    'demo1': '이걸로 달릴 수 있어!',
    'demo2': '여기를 누르면 폴짝 뛰어!',
    'tryit': '이번엔 직접 해 봐!',          # '네 차례' is heard as '내 차례' (네/내 sound alike)
    'good1': '좋아!',
    'good2': '바로 그거야!',
    'good3': '멋져!',
    'oops': '앗, 그건 다른 소리야!',
    'fall': '어이쿠! 다시 해 보자!',
    'allgot': '다 모았다! 문으로 달려가자!',
    'locked': '아직 못 찾은 그림이 있어! 먼저 다 모아 오자!',
    'gate': '단어를 하나씩 말하면 문이 열려!',
    'sayit': '이제 네가 말해 봐!',
    'again': '한 번 더 말해 볼까?',
    'great1': '잘했어!',
    'great2': '정말 멋져!',
    'great3': '완벽해!',
    'goodtry': '괜찮아! 다음 단어 해 보자!',
    'jump': '어려우면 점프 버튼을 눌러서 넘어가도 돼!',
    'open': '문이 열렸어! 들어가자!',
    'clear': '야호! 통과했어!',
    'allclear': '우와! 모든 세상을 다 달렸어!',
    'over': '괜찮아! 다시 해 보자!',
    'micask': '네 목소리를 들을 수 있게 마이크를 켜 줘!',
    'pressstart': '시작 버튼을 눌러 봐!',
    'shop': '타타를 예쁘게 꾸며 보자!',
    'buy': '우와, 정말 잘 어울린다!',
    'nocoin': '코인을 조금 더 모아 오자!',
}
assert set(LINES) == set(LINES_KO), set(LINES) ^ set(LINES_KO)

# the server is a CPU box (1-3 s a call, 2 at a time, 503 after a 30 s queue): wait it out instead of failing the build.
# tts_voice.raw looks papi.tts up at call time, so this wrapper is what every take goes through.
_tts = papi.tts


def _patient_tts(text, voice=None, base=None):
    for attempt in range(12):
        try:
            return _tts(text, voice, base)
        except Exception as e:
            msg = str(e)
            if any(f'tts {c}' in msg for c in ('400', '401', '403', '404', '422')) or attempt == 11:
                raise
            time.sleep(min(5 + 5 * attempt, 30))


papi.tts = _patient_tts


def decode(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def speech(x, floor_db):
    n = len(x) // FR
    rms = np.sqrt((x[:n * FR].reshape(n, FR) ** 2).mean(1) + 1e-12)
    return rms, np.nonzero(rms > rms.max() * 10 ** (floor_db / 20))[0]


def trim(raw, dst, target_db=-18, floor_db=-40):
    _, act = speech(decode(raw), floor_db)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-t', f'{(act[-1] + 1) * FR / SR + TAIL:.3f}',
                    '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '64k', '-map_metadata', '-1', str(dst)], check=True)
    y = decode(dst)
    rms, act = speech(y, floor_db)
    voiced = rms[act[0]:act[-1] + 1]
    loud = np.sqrt((voiced[voiced > voiced.max() * .1] ** 2).mean())
    g = min(10 ** (target_db / 20) / loud, 10 ** (-1 / 20) / np.abs(y).max())
    start = max(0., act[0] * FR / SR - LEAD)
    return [round(start, 3), round(float(g), 3), round(len(y) / SR - start, 3)]


def pack_audio(pk, w):
    """the pack's recording of a word: the manifest entry, else the pack folder's words/<w>.mp3|.wav, else None"""
    e = pk['words'].get(w)
    if e and e['audio']:
        return e['audio']
    for ext in ('mp3', 'wav'):
        f = pathlib.Path(pk['dir']) / 'words' / f'{w}.{ext}'
        if f.exists():
            return str(f)
    return None


OUT.mkdir(parents=True, exist_ok=True)
for f in OUT.glob('*.mp3'):
    f.unlink()
pk = lessonpack.load(lessonpack.pack_dir(TB))
clips, no_pack = {}, []
for w in WORDS:
    src = pack_audio(pk, w)
    if not src:
        no_pack.append(w)
        continue
    sec = len(decode(src)) / SR
    if not .5 < sec < 3:
        print(f'  ! {w}: pack audio is {sec:.2f} s — check {src}')
    dst = OUT / f'w_{w}.mp3'
    clips[f'w:{w}'] = [dst.name, *trim(src, dst)]
    print(f'  word {w:9} {pathlib.Path(src).name:13} {sec:.2f} s -> {clips[f"w:{w}"][3]:.2f} s')
snd = pk['sound']
dst = OUT / f"s_{snd['text']}.mp3"
clips['s:' + snd['text']] = [dst.name, *trim(snd['audio'], dst)]
if no_pack:
    print('no pack audio (tutor voice instead):', no_pack)

jobs = ([(f'w:{w}', w, 'en') for w in no_pack] + [(f't:{k}', t, 'en') for k, t in LINES.items()]
        + [(f'k:{k}', t, 'ko') for k, t in LINES_KO.items()])
with ThreadPoolExecutor(2) as ex:            # the first takes, 2 at a time (the server's own limit); best() reads the cache
    list(ex.map(lambda j: tts_voice.tutor(tutor_takes.variants(*j)[0], j[2]), jobs))
got, never = tutor_takes.best(jobs)
if never:
    print('never heard right (kept take 1 — check by ear):', never)
for w in no_pack:
    dst = OUT / f'w_{w}.mp3'
    clips[f'w:{w}'] = [dst.name, *trim(got[f'w:{w}'], dst)]
for pre, table in (('t', LINES), ('k', LINES_KO)):
    for k in table:
        dst = OUT / f'{pre}_{k}.mp3'
        clips[f'{pre}:{k}'] = [dst.name, *trim(got[f'{pre}:{k}'], dst, target_db=-17, floor_db=-50)]

jd = lambda x: json.dumps(x, ensure_ascii=False)
table = lambda d: ',\n'.join(f'    {jd(k)}: {jd(v)}' for k, v in d.items())
(ROOT / 'js/voice.js').write_text(
    '/* generated by tools/build_voice.py — do not edit */\n'
    '// clips: key -> [file in assets/voice/, start s, gain, dur s]; w:<word> pack word, s:m letter sound,\n'
    '// t:<key> / k:<key> tutor line EN / KO (text in lines / lines_ko)\n'
    'export const VOICE = {\n'
    f'  voice: {jd(tts_voice.TUTOR_VOICE)},\n  engine: "phonics-api",\n'
    f'  clips: {{\n{table(clips)}\n  }},\n  lines: {{\n{table(LINES)}\n  }},\n  lines_ko: {{\n{table(LINES_KO)}\n  }},\n}};\n',
    encoding='utf-8')
print(len(clips), 'clips', sum((OUT / v[0]).stat().st_size for v in clips.values()) // 1024, 'KB')
