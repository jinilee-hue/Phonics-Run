"""Original background music for Phonics Run — a BLUEGRASS HOEDOWN (2026-11-23).

Rule (user, 2026-11-22): "게임마다 게임에 맞게 음악이 좀 달라야해. 그리고 기본적으로 전체 음악은 신나야해." — every game's
loop must differ by ear (a shared key, progression or backing pattern counts as the same) and all of them are upbeat.
Taken: Magic Block (off-beat ukulele + oom-pah bass, C 128), Phonics Match (bubble pop, E♭ 128), Eye-Catch (quiz-show
swing, B♭ 144), Toy-Catch (8-bit arcade, E 150), Croco (jungle groove D 126 / chase A minor 150), Phonics Puzzle (disco
funk A 120), Ring Ding Dong (song loop ~127), Phonics Island (gentle). None of them is country, none is in G, none is at 160.

Fit: Tata runs and jumps across floating sky islands to a candy-striped fair gate, so a galloping hoedown — the
"running" music of cartoons and country fairs. G major (the banjo's home key: open-G tuning with the high G drone),
160 BPM, 16 bars = 24.0 s. A string "fiddle" carries a fiddle-tune line in 8ths (a second fiddle adds harmony a third or
so under it in the B half), a 5-string banjo picks 16th-note rolls — forward rolls T-I-M T-I-M T-M (3+3+2 accents) in
the A half, forward-reverse rolls in the B half — with the 5th-string drone on top, an upright bass plays root–fifth on
beats 1 and 3 with walk-ups into every chord change, a mandolin chops the chord on 2 and 4, and the drums play a
TRAIN BEAT (brushed snare 16ths, a "chug" on every "and", accents on 2 and 4, kick on 1 and 3) — no hi-hats, claps,
glock or off-beat plucks, so nothing of the old shared template. A snare build + bass walk-down + fiddle run up
(C–C♯–D) carry bar 16 back into bar 1.
Chords (two bars each): A = I–I–II7–II7 | V–V–I–I, B = vi–vi–II7–II7 | IV–IV–V–V7
(G G A7 A7 D D G G | Em Em A7 A7 C C D D7). No I–vi–IV–V or I–V–vi–IV (or their rotations); the II7 (A7) is the
bluegrass "push", and in the B half it swerves to IV instead of resolving — the lift.
Instruments, mixer and mastering: phonics-kit tools/bgm_engine.py (only the score lives here). Loudness -15.0 LUFS like
the other games' loops (-14.8 … -15.6). → assets/audio/bgm.mp3 only (the game fetches the mp3; no base64 js).

Run (from Phonics-Run): /Users/jini/.local/bin/uv run --with numpy --with scipy --with pyloudnorm python tools/make_bgm.py
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path.home() / 'Documents/Jini/2026/Phonics/phonics-kit/tools'))
import bgm_engine as E  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
mx = E.Mix(bpm=160, bars=16, seed_n=160)
CHORDS = ['G', 'G', 'A7', 'A7', 'D', 'D', 'G', 'G',
          'Em', 'Em', 'A7', 'A7', 'C', 'C', 'D', 'D7']
TONES = {'G': ['G', 'B', 'D'], 'A7': ['A', 'C#', 'E', 'G'], 'D': ['D', 'F#', 'A'], 'D7': ['D', 'F#', 'A', 'C'],
         'Em': ['E', 'G', 'B'], 'C': ['C', 'E', 'G']}
BANJO = {                               # [5th-string drone, 4th, 3rd, 2nd, 1st]
    'G': ['G4', 'D3', 'G3', 'B3', 'D4'], 'A7': ['G4', 'E3', 'A3', 'C#4', 'E4'], 'D': ['A4', 'D3', 'F#3', 'A3', 'D4'],
    'D7': ['A4', 'D3', 'F#3', 'C4', 'D4'], 'Em': ['G4', 'E3', 'G3', 'B3', 'E4'], 'C': ['G4', 'E3', 'G3', 'C4', 'E4']}
FWD = [2, 3, 4, 0, 3, 4, 0, 4, 1, 3, 4, 0, 3, 4, 0, 4]       # forward roll (thumb on the 3rd, then the 4th string)
FWD_REV = [2, 3, 4, 0, 4, 3, 2, 4, 1, 3, 4, 0, 4, 3, 1, 4]   # forward-reverse roll (B half)
ACCENT = {0, 3, 6, 8, 11, 14}           # 3+3+2 | 3+3+2
MEL = [                                 # fiddle tune: A part bars 1–8, B part (higher) bars 9–16
    [('D6', 0, .5), ('D6', .5, .5), ('B5', 1, .5), ('G5', 1.5, .5), ('A5', 2, .5), ('B5', 2.5, .5), ('D6', 3, 1)],
    [('E6', 0, .5), ('D6', .5, .5), ('B5', 1, .5), ('G5', 1.5, .5), ('E5', 2, .5), ('G5', 2.5, .5), ('A5', 3, .5), ('C#6', 3.5, .5)],
    [('E6', 0, .5), ('E6', .5, .5), ('C#6', 1, .5), ('A5', 1.5, .5), ('B5', 2, .5), ('C#6', 2.5, .5), ('E6', 3, 1)],
    [('G6', 0, .5), ('E6', .5, .5), ('C#6', 1, .5), ('A5', 1.5, .5), ('G5', 2, .5), ('A5', 2.5, .5), ('C#6', 3, .5), ('E6', 3.5, .5)],
    [('F#6', 0, 1), ('E6', 1, .5), ('D6', 1.5, .5), ('A5', 2, .5), ('F#5', 2.5, .5), ('A5', 3, .5), ('D6', 3.5, .5)],
    [('E6', 0, .5), ('F#6', .5, .5), ('E6', 1, .5), ('D6', 1.5, .5), ('C6', 2, .5), ('A5', 2.5, .5), ('F#5', 3, .5), ('A5', 3.5, .5)],
    [('B5', 0, .5), ('D6', .5, .5), ('G6', 1, 1), ('F#6', 2, .5), ('E6', 2.5, .5), ('D6', 3, .5), ('B5', 3.5, .5)],
    [('A5', 0, .5), ('G5', .5, .5), ('E5', 1, .5), ('F#5', 1.5, .5), ('G5', 2, 1), ('B5', 3, .5), ('D6', 3.5, .5)],
    [('E6', 0, .75), ('E6', .75, .25), ('G6', 1, .5), ('E6', 1.5, .5), ('B5', 2, .5), ('E6', 2.5, .5), ('G6', 3, .5), ('F#6', 3.5, .5)],
    [('E6', 0, .5), ('D6', .5, .5), ('B5', 1, .5), ('G5', 1.5, .5), ('A5', 2, .5), ('B5', 2.5, .5), ('C#6', 3, .5), ('E6', 3.5, .5)],
    [('A6', 0, 1), ('G6', 1, .5), ('E6', 1.5, .5), ('C#6', 2, .5), ('E6', 2.5, .5), ('A6', 3, .5), ('G6', 3.5, .5)],
    [('E6', 0, .5), ('C#6', .5, .5), ('A5', 1, .5), ('B5', 1.5, .5), ('C#6', 2, .5), ('E6', 2.5, .5), ('A6', 3, .5), ('G6', 3.5, 1.5)],
    [('E6', 1, .5), ('C6', 1.5, .5), ('G5', 2, .5), ('C6', 2.5, .5), ('E6', 3, .5), ('G6', 3.5, .5)],
    [('A6', 0, .5), ('G6', .5, .5), ('E6', 1, .5), ('C6', 1.5, .5), ('D6', 2, .5), ('C6', 2.5, .5), ('A5', 3, .5), ('C6', 3.5, .5)],
    [('D6', 0, .5), ('F#6', .5, .5), ('A6', 1, 1), ('F#6', 2, .5), ('E6', 2.5, .5), ('D6', 3, .5), ('E6', 3.5, .5)],
    [('F#6', 0, .5), ('D6', .5, .5), ('C6', 1, .5), ('A5', 1.5, .5), ('F#5', 2, .5), ('A5', 2.5, .5), ('C6', 3, .5), ('C#6', 3.5, .5)],
]
BASS = [                                # root–fifth on 1 and 3, walk-ups into each change, a walk-down into bar 1
    [('G2', 0, 2), ('D2', 2, 2)], [('G2', 0, 2), ('E2', 2, 1), ('G#2', 3, 1)],
    [('A2', 0, 2), ('E2', 2, 2)], [('A2', 0, 2), ('G2', 2, 1), ('E2', 3, 1)],
    [('D2', 0, 2), ('A2', 2, 2)], [('D2', 0, 2), ('E2', 2, 1), ('F#2', 3, 1)],
    [('G2', 0, 2), ('D2', 2, 2)], [('G2', 0, 2), ('D2', 2, 1), ('D#2', 3, 1)],
    [('E2', 0, 2), ('B1', 2, 2)], [('E2', 0, 2), ('F#2', 2, 1), ('G#2', 3, 1)],
    [('A2', 0, 2), ('E2', 2, 2)], [('A2', 0, 2), ('B2', 2, 2)],
    [('C3', 0, 2), ('G2', 2, 2)], [('C3', 0, 2), ('G2', 2, 1), ('A2', 3, 1)],
    [('D3', 0, 2), ('A2', 2, 2)], [('D3', 0, 1), ('C3', 1, 1), ('B2', 2, 1), ('A2', 3, 1)],
]
assert len(MEL) == len(CHORDS) == len(BASS) == mx.bars


def under(note, tones):
    """second fiddle: the nearest chord tone a minor 3rd to a major 6th below (never a tritone)"""
    m = E.midi(note)
    pcs = {E.NOTE[t] for t in tones}
    return max(p for p in range(m - 9, m - 2) if p % 12 in pcs and m - p != 6)


def chop_voicing(tones):
    """mandolin chop: the triad packed between G4 and F#5"""
    return sorted(E.hz(n + ('4' if E.midi(n + '4') >= E.midi('G4') else '5')) for n in tones[:3])


for bar in range(mx.bars):
    B = bar >= 8
    ch = CHORDS[bar]
    tones = TONES[ch]
    for note, b, ln in MEL[bar]:                                       # fiddle (+ harmony fiddle in the B half)
        d = ln * mx.beat * .92
        mx.add(E.strings(E.hz(note), d, attack=.012), mx.at(bar, b), pan=-.12, gain=.2, send=.22)
        if B:
            mx.add(E.strings(E.hz(under(note, tones)), d, attack=.012), mx.at(bar, b), pan=.28, gain=.11, send=.25)
    voicing, roll = BANJO[ch], (FWD_REV if B else FWD)                 # banjo rolls in 16ths
    for k in range(16):
        mx.add(E.scratch([E.hz(voicing[roll[k]])], .2, muted=False), mx.at(bar, k / 4), pan=.35,
               gain=.125 if k in ACCENT else .08, send=.1)
    for note, b, ln in BASS[bar]:                                      # upright bass
        mx.add(E.upright(E.hz(note), ln * mx.beat * .9), mx.at(bar, b), gain=.23)
    chop = chop_voicing(tones)                                         # mandolin chop on 2 and 4
    for b in (1, 3):
        mx.add(E.scratch(chop, .07, muted=True), mx.at(bar, b), pan=-.35, gain=.2, send=.08)
    for b in (0, 2):                                                   # train beat: kick 1 & 3, brushed snare 16ths
        mx.add(E.kick(.8), mx.at(bar, b), gain=.34)
    for k in range(16):
        if bar == 15 and k >= 8:
            mx.add(E.snare(), mx.at(bar, k / 4), pan=-.05, gain=.06 + .02 * (k - 8))   # build back into bar 1
            continue
        g = .15 if k in (4, 12) else (.06 if k % 4 == 2 else .028)
        mx.add(E.snare(), mx.at(bar, k / 4), pan=-.05, gain=g)
    if bar in (0, 8):
        mx.add(E.crash(), mx.at(bar, 0), pan=.2, gain=.05, send=.1)

st = mx.render(lufs=-15.0, room=.18, wet=.4)
E.write(st, mx, ROOT / 'assets' / 'audio' / 'bgm.mp3')
