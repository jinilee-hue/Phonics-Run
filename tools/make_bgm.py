"""Original background music for Phonics Run — two loops, one tune, alternating by map (2026-11-24).

History (user 2026-11-24): the 160 BPM bluegrass hoedown was "너무 정신 없는데" (every slot full of banjo/snare 16ths), the
116 BPM whistle/flute walk that replaced it "불안정한데..떨림이 많고" and then "너무 느긋해". Two faster candidates came next and
the user took both: "a,b 둘다 좋은데 맵별로 다르게 넣어줘" → js/audio.js TRACKS, game.js trackOf(level):
  rock  — pop-rock, G major 140 BPM, 16 bars = 27.4 s: a steady synth-brass lead, syncopated piano chords (1, and-of-2, 3…),
          a driving 8th-note bass, rock beat (kick 1·3·and-of-3, snare+clap 2·4, 8th hats, open hat on the last 8th),
          a snare run into bars 1 and 9, the glock doubling the tune in the B half.          → Forest, Snow, Space
  dance — dance-pop, A♭ major 132 BPM, 16 bars = 29.1 s: piano + glock lead, 3-3-2 brass stabs, octave-bounce 8th bass,
          four-on-the-floor kick, claps 2·4, open hats on the off-beats, a clap run into bars 1 and 9.  → Candy, Desert
Steady on purpose: no vibrato, no detuned (beating) voices, no swing — that is what read as "떨림".
Rule (user, 2026-11-22): every game's loop must differ by ear and all of them are upbeat. Taken: Magic Block (off-beat
ukulele + oom-pah bass, C 128), Phonics Match (bubble pop, E♭ 128), Eye-Catch (quiz-show swing, B♭ 144), Toy-Catch (8-bit
arcade, E 150), Croco (jungle groove D 126 / chase A minor 150), Phonics Puzzle (disco funk A 120), Ring Ding Dong (song
loop ~127). Chords: A = G C Am D | G C D G, B = Em C G D | Em C Am D7 (not I–V–vi–IV, I–vi–IV–V or the IV–V–iii–vi template).
Instruments, mixer and mastering: phonics-kit tools/bgm_engine.py. Loudness -15.0 LUFS like the other loops.
→ assets/audio/bgm-rock.mp3, bgm-dance.mp3 (js/audio.js TRACKS loop 16 bars at each BPM — keep them in step).

Run (from Phonics-Run): /Users/jini/.local/bin/uv run --with numpy --with scipy --with pyloudnorm python tools/make_bgm.py [rock|dance]
"""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path.home() / 'Documents/Jini/2026/Phonics/phonics-kit/tools'))
import bgm_engine as E
np = E.np
ROOT = pathlib.Path(__file__).resolve().parent.parent
CHORDS = ['G', 'C', 'Am', 'D', 'G', 'C', 'D', 'G',
          'Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'D7']
TONES = {'G': ['G', 'B', 'D'], 'C': ['C', 'E', 'G'], 'Am': ['A', 'C', 'E'], 'D': ['D', 'F#', 'A'], 'Em': ['E', 'G', 'B'],
         'D7': ['D', 'F#', 'A', 'C']}
ROOTS = {'G': 'G1', 'C': 'C2', 'Am': 'A1', 'D': 'D2', 'Em': 'E2', 'D7': 'D2'}
MEL = [
    [('D5', 0, .5), ('D5', .5, .5), ('B4', 1, .5), ('D5', 1.5, .5), ('G5', 2, 1), ('F#5', 3, .5), ('E5', 3.5, .5)],
    [('E5', 0, .5), ('E5', .5, .5), ('C5', 1, .5), ('E5', 1.5, .5), ('G5', 2, 1.5), ('E5', 3.5, .5)],
    [('C5', 0, .5), ('E5', .5, .5), ('A5', 1, 1), ('G5', 2, .5), ('E5', 2.5, .5), ('C5', 3, 1)],
    [('D5', 0, .5), ('F#5', .5, .5), ('A5', 1, .5), ('F#5', 1.5, .5), ('D5', 2, 1), ('A4', 3.5, .5)],
    [('D5', 0, .5), ('D5', .5, .5), ('B4', 1, .5), ('D5', 1.5, .5), ('G5', 2, 1), ('A5', 3, .5), ('B5', 3.5, .5)],
    [('G5', 0, .5), ('E5', .5, .5), ('C5', 1, .5), ('E5', 1.5, .5), ('G5', 2, .5), ('A5', 2.5, .5), ('G5', 3, 1)],
    [('F#5', 0, .5), ('A5', .5, .5), ('F#5', 1, .5), ('D5', 1.5, .5), ('E5', 2, .5), ('F#5', 2.5, .5), ('A5', 3, 1)],
    [('G5', 0, 1.5), ('D5', 1.5, .5), ('G5', 2, 1)],
    [('B4', 0, .5), ('E5', .5, .5), ('G5', 1, .5), ('B5', 1.5, 1), ('A5', 2.5, .5), ('G5', 3, 1)],
    [('E5', 0, .5), ('G5', .5, .5), ('A5', 1, 1), ('G5', 2, .5), ('E5', 2.5, 1.5)],
    [('D5', 0, .5), ('G5', .5, .5), ('B5', 1, .5), ('A5', 1.5, .5), ('G5', 2, .5), ('D5', 2.5, .5), ('B4', 3, 1)],
    [('A4', 0, .5), ('D5', .5, .5), ('F#5', 1, 1), ('E5', 2, .5), ('D5', 2.5, .5), ('F#5', 3, .5), ('A5', 3.5, .5)],
    [('B5', 0, 1), ('G5', 1, .5), ('E5', 1.5, .5), ('G5', 2, .5), ('B5', 2.5, .5), ('A5', 3, 1)],
    [('G5', 0, .5), ('E5', .5, .5), ('C5', 1, .5), ('E5', 1.5, .5), ('G5', 2, 1), ('A5', 3, 1)],
    [('A5', 0, .5), ('G5', .5, .5), ('E5', 1, .5), ('C5', 1.5, .5), ('E5', 2, .5), ('A5', 2.5, .5), ('G5', 3, 1)],
    [('F#5', 0, .5), ('E5', .5, .5), ('D5', 1, .5), ('C5', 1.5, .5), ('A4', 2, .5), ('D5', 2.5, .5)],
]


def blead(f, dur):
    """steady bright synth-brass lead: one saw (no detune, no vibrato, no scoop) whose top opens on the attack"""
    t = E.tt(dur + .1)
    ph = 2 * np.pi * f * t
    s = np.zeros_like(t)
    for k in range(1, max(3, min(12, int(8000 / f))) + 1):
        s += ((-1) ** (k + 1) / k) * np.sin(k * ph) * (.35 + .65 * np.exp(-t * (2 + 1.2 * k))) * np.minimum(1, t / (.004 + .002 * k))
    return s * np.minimum(1, t / .006) * E.release(t, dur, .04)


def voicing(tones, lo='G3'):
    out = []
    for n in tones[:4]:
        m = E.midi(n + '3')
        while m < E.midi(lo):
            m += 12
        out.append(m)
    return sorted(out)


def render(V):
    if V == 'rock':
        tr, bpm = 0, 140
    else:
        tr, bpm = 1, 132
    mx = E.Mix(bpm=bpm, bars=16, seed_n=bpm)
    for bar in range(16):
        B = bar >= 8
        ch, nxt = CHORDS[bar], CHORDS[(bar + 1) % 16]
        r = E.midi(ROOTS[ch]) + 12 + tr; nr = E.midi(ROOTS[nxt]) + 12 + tr
        fill = bar in (7, 15)
        for note, b, ln in MEL[bar]:
            f = E.hz(note, tr)
            if V == 'rock':
                mx.add(blead(f, mx.dur(b, ln) * .9), mx.at(bar, b), pan=-.05, gain=.15, send=.18)
                if B:
                    mx.add(E.glock(E.hz(note, tr + 12), .3), mx.at(bar, b), pan=.3, gain=.04, send=.3)
            else:
                mx.add(E.piano(f, mx.dur(b, ln) * .95), mx.at(bar, b), pan=-.05, gain=.2, send=.2)
                mx.add(E.glock(E.hz(note, tr + 12), .3), mx.at(bar, b), pan=.25, gain=.05, send=.3)
        if V == 'rock':
            for b, ln in ((0, .9), (1.5, .45), (2.5, .9)):                       # syncopated piano chords
                for m in voicing(TONES[ch]):
                    mx.add(E.piano(E.hz(m + tr), mx.dur(b, ln)), mx.at(bar, b), pan=.22, gain=.06, send=.15)
            pat = [r, r, r + 12, r, r, r + 12, r, nr - 1 if nr > r else nr + 2 if nr < r else r + 7]  # driving 8th bass
            for k, m in enumerate(pat):
                mx.add(E.bass(E.hz(m), mx.dur(k / 2, .5) * .8, body=.5), mx.at(bar, k / 2), gain=.22)
            for b in (0, 2, 2.5):
                mx.add(E.kick(), mx.at(bar, b), gain=.32)
            for b in ((1, 3) if not fill else (1,)):
                mx.add(E.snare(), mx.at(bar, b), pan=.05, gain=.13, send=.15)
                mx.add(E.clap(), mx.at(bar, b), pan=-.05, gain=.04, send=.15)
            if fill:
                for i, b in enumerate((3, 3.25, 3.5, 3.75)):
                    mx.add(E.snare(), mx.at(bar, b), pan=.05, gain=.08 + .025 * i, send=.15)
            for k in range(8):
                if k == 7:
                    mx.add(E.hat(True), mx.at(bar, 3.5), pan=.3, gain=.035)
                else:
                    mx.add(E.hat(), mx.at(bar, k / 2), pan=.3, gain=.045 if k % 2 == 0 else .03)
        else:
            for b, ln in ((0, .45), (1.5, .45), (3, .45)):                       # 3-3-2 brass stabs
                for m in voicing(TONES[ch], 'A3'):
                    mx.add(blead(E.hz(m + tr), mx.dur(b, ln)), mx.at(bar, b), pan=.2, gain=.035, send=.2)
            for k in range(8):                                                   # octave-bounce 8th bass
                m = r if k % 2 == 0 else r + 12
                mx.add(E.bass(E.hz(m), mx.dur(k / 2, .5) * .75, body=.45), mx.at(bar, k / 2), gain=.2)
            for b in range(4):
                mx.add(E.kick(), mx.at(bar, b), gain=.32)
            for b in (1, 3):
                mx.add(E.clap(), mx.at(bar, b), pan=.05, gain=.09, send=.15)
            if fill:
                for i, b in enumerate((3.25, 3.5, 3.75)):
                    mx.add(E.clap(), mx.at(bar, b), pan=-.05, gain=.05 + .015 * i, send=.15)
            for k in range(4):
                mx.add(E.hat(True), mx.at(bar, k + .5), pan=.3, gain=.03)
                mx.add(E.shaker(), mx.at(bar, k + .25), pan=-.35, gain=.012)
                mx.add(E.shaker(), mx.at(bar, k + .75), pan=-.35, gain=.012)
        if bar in (0, 8):
            mx.add(E.crash(), mx.at(bar, 0), pan=.2, gain=.045, send=.1)

    st = mx.render(lufs=-15.0, room=.2, wet=.4)
    E.write(st, mx, ROOT / 'assets' / 'audio' / f'bgm-{V}.mp3')


for V in sys.argv[1:] or ['rock', 'dance']:
    render(V)
