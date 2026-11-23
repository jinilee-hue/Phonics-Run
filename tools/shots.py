"""Headless screenshots of Phonics Run driven through window.PR (?capture=1: no rAF, the script steps time).

uv run --with playwright python tools/shots.py [--url http://127.0.0.1:5185/] [--size 1280x800] [--out ~/.cache/agent-scratch/prun]
Each scene: a list of actions — ('step', seconds) · ('press', key, down) · ('start', levelIndex) · ('tp', x, y) · ('shot', name).
"""
import argparse, asyncio, json, os, sys

ap = argparse.ArgumentParser()
ap.add_argument('--url', default='http://127.0.0.1:5185/')
ap.add_argument('--size', default='1280x800')
ap.add_argument('--out', default=os.path.expanduser('~/.cache/agent-scratch/prun'))
ap.add_argument('--scene', default='basic')
ap.add_argument('--query', default='')
args = ap.parse_args()
W, H = (int(v) for v in args.size.split('x'))

SCENES = {
    'basic': [
        ('step', 0.6), ('shot', 'title'),
        ('start', 0), ('step', 0.5), ('shot', 'start'),
        ('press', 'right', True), ('step', 1.1), ('shot', 'run'),
        ('press', 'jump', True), ('step', 0.22), ('shot', 'jump_up'), ('press', 'jump', False), ('step', 0.35), ('shot', 'jump_down'),
        ('step', 1.2), ('shot', 'run2'),
    ],
    'flow': [
        ('start', 0), ('step', 0.3),
        ('tp', 18, 0.1), ('step', 0.5), ('tp', 34.5, 3.1), ('step', 0.5), ('tp', 57, 1.3), ('step', 0.5),
        ('tp', 74, 3.9), ('step', 0.5), ('tp', 87.5, 1.3), ('press', 'right', True), ('step', 0.3), ('press', 'right', False), ('step', 0.6), ('shot', 'allwords'),
        ('tp', 103, 2.3), ('press', 'right', True), ('step', 0.6), ('press', 'right', False), ('step', 0.9), ('shot', 'enter'), ('step', 1.4), ('shot', 'clear'),
    ],
    'hurt': [
        ('start', 0), ('tp', 47, 1.3), ('step', 0.4), ('press', 'right', True), ('step', 0.55), ('shot', 'trap'), ('press', 'right', False), ('step', 1.0),
        ('tp', 26, 3), ('step', 0.7), ('shot', 'falling'), ('step', 1.2), ('shot', 'respawn'),
    ],
    'locked': [('start', 0), ('tp', 104, 2.3), ('press', 'right', True), ('step', 0.5), ('press', 'right', False), ('step', 0.6), ('shot', 'locked')],
    # real time (voice lines decide the pace): ('rt', seconds)
    'demo': [('rt', 0.5), ('shot', 'd_title'), ('start', 0), ('rt', 9), ('shot', 'd_hand_run'), ('rt', 3), ('shot', 'd_running'), ('rt', 4), ('shot', 'd_hand_jump'),
             ('rt', 3), ('shot', 'd_jumped'), ('rt', 6), ('shot', 'd_after')],
    'say': [('start', 0), ('rt', 0.5),
            ('tp', 18, 0.1), ('step', 0.5), ('tp', 34.5, 3.1), ('step', 0.5), ('tp', 57, 1.3), ('step', 0.5), ('tp', 74, 3.9), ('step', 0.5),
            ('tp', 87.5, 1.3), ('press', 'right', True), ('step', 0.3), ('press', 'right', False), ('step', 0.6),
            ('tp', 103, 2.3), ('press', 'right', True), ('step', 0.6), ('press', 'right', False), ('rt', 6), ('shot', 's_turn1'), ('rt', 8), ('shot', 's_turn2'),
            ('rt', 30), ('shot', 's_end'), ('rt', 4), ('shot', 's_clear')],
    'themes': [('unlock', 0), ('start', 0), ('tp', 14, 0.2), ('step', 0.6), ('shot', 'th1'),
               ('start', 1), ('tp', 33, 0.2), ('step', 0.6), ('shot', 'th2a'), ('tp', 36, 0.2), ('press', 'right', True), ('step', 0.75), ('shot', 'th2b'), ('step', 0.5), ('press', 'right', False), ('step', 0.4), ('shot', 'th2c'),
               ('start', 2), ('tp', 12, 0.2), ('step', 0.6), ('shot', 'th3a'), ('tp', 77, 4.0), ('step', 0.4), ('shot', 'th3b'), ('step', 1.2), ('shot', 'th3c'),
               ('toTitle', 0), ('step', 0.5), ('shot', 'th3title')],
    'over': [('start', 0), ('tp', 50, 1.3), ('step', 0.3), ('press', 'right', True), ('step', 0.5), ('press', 'right', False), ('step', 0.6),
             ('tp', 26, 3), ('step', 2.2), ('tp', 26, 3), ('step', 2.2), ('rt', 1.5), ('shot', 'over')],
    'enter': [('start', 0), ('rt', 0.6),
              ('tp', 18, 0.1), ('step', 0.5), ('tp', 34.5, 3.1), ('step', 0.5), ('tp', 57, 1.3), ('step', 0.5), ('tp', 74, 3.9), ('step', 0.5),
              ('tp', 87.5, 1.3), ('press', 'right', True), ('step', 0.3), ('press', 'right', False), ('step', 0.6),
              ('tp', 104.5, 2.3), ('press', 'right', True), ('step', 0.4), ('press', 'right', False), ('rt', 0.4), ('shot', 'e0'),
              ('rt', 0.9), ('shot', 'e1'), ('rt', 0.35), ('shot', 'e2'), ('rt', 0.3), ('shot', 'e3'), ('rt', 0.3), ('shot', 'e4'), ('rt', 0.3), ('shot', 'e5'), ('rt', 0.4), ('shot', 'e6')],
    'candy': [('unlock', 0), ('start', 1), ('tp', 12, 0.2), ('step', 0.6), ('shot', 'c1'), ('tp', 30, 0.2), ('step', 0.6), ('shot', 'c2'),
              ('tp', 50, 5.2), ('step', 0.6), ('shot', 'c3'), ('tp', 112, 1.8), ('step', 0.6), ('shot', 'c4')],
    'shop': [('rt', 0.5), ('give', 50), ('shopopen', 0), ('rt', 1.2), ('shot', 'shop1'), ('buy', 'crown'), ('buy', 'shades'), ('buy', 'goldshoes'), ('rt', 1.5), ('shot', 'shop2')],
}

async def main():
    from playwright.async_api import async_playwright
    os.makedirs(args.out, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True, args=[
            '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
        page = await browser.new_page(viewport={'width': W, 'height': H}, device_scale_factor=float(os.environ.get('DPR', '1')))
        errs = []
        page.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
        sep = '&' if '?' in args.url else '?'
        await page.goto(args.url + sep + 'capture=1' + ('&' + args.query if args.query else ''))
        await page.wait_for_function('window.PR && window.PR.ready', timeout=30000)
        await page.evaluate('window.PR.ready')
        await page.wait_for_timeout(600)
        for act in SCENES[args.scene]:
            k = act[0]
            if k == 'step':
                await page.evaluate('(s) => { const n = Math.round(s * 60); for (let i = 0; i < n; i++) window.PR.step(1/60); }', act[1])
            elif k == 'press':
                await page.evaluate('([k, d]) => window.PR.press(k, d)', [act[1], act[2]])
            elif k == 'start':
                await page.evaluate('(i) => window.PR.start(i)', act[1])
            elif k == 'rt':
                await page.evaluate('(s) => new Promise(res => { let n = 0; const iv = setInterval(() => { window.PR.step(1/30); if (++n >= s * 30) { clearInterval(iv); res(); } }, 33); })', act[1])
            elif k == 'give':
                await page.evaluate('(n) => window.PR.give(n)', act[1])
            elif k == 'shopopen':
                await page.evaluate('window.PR.shop()')
            elif k == 'buy':
                await page.evaluate('(id) => window.PR.buy(id)', act[1])
            elif k == 'unlock':
                await page.evaluate('window.PR.unlockAll()')
            elif k == 'toTitle':
                await page.evaluate('window.PR.toTitle()')
            elif k == 'tp':
                await page.evaluate('([x, y]) => window.PR.teleport(x, y)', [act[1], act[2]])
            elif k == 'shot':
                await page.wait_for_timeout(250)
                await page.screenshot(path=os.path.join(args.out, f'{act[1]}.png'))
                st = await page.evaluate('window.PR.state')
                print(act[1], json.dumps({k: (round(v, 2) if isinstance(v, float) else v) for k, v in st.items()}))
        print('\n'.join(errs) or 'no console errors')
        await browser.close()

asyncio.run(main())
