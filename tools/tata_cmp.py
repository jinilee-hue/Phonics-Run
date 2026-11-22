"""Tata 3D (dev/tata.html) next to the character sheet: front / side / back on one sheet, same scale and ground line,
plus run / jump poses. uv run --with playwright --with pillow python tools/tata_cmp.py [--out DIR]"""
import argparse, asyncio, base64, io, os
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument('--url', default='http://127.0.0.1:5185/dev/tata.html')
ap.add_argument('--out', default=os.path.expanduser('~/.cache/agent-scratch/prun'))
ap.add_argument('--name', default='tata_cmp')
args = ap.parse_args()
SHEET = os.path.expanduser('~/Documents/Jini/2026/Phonics/공통이미지자료/01_Phonics_Friends Guide_v1/01_Classmate_Friends/Tata_Views.png')
PX_PER_U = 700 / 2.25          # render scale
GROUND_R = 350 + 1.04 * PX_PER_U
SHEET_H = 534 / 2.05           # sheet px per unit
GROUND_S = 788

async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 420, 'height': 700})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.goto(args.url)
        await pg.wait_for_function('window.TV', timeout=20000)
        shots = {}
        for name, a in [('front', [0]), ('side', [-90]), ('back', [180]), ('q', [-35]),
                        ('run1', [90, 'play', 7.2, 0.3]), ('run2', [90, 'play', 7.2, 1.9]), ('jump', [90, 'play', 7.2, 0, 8, False]), ('fall', [90, 'play', 7.2, 0, -8, False])]:
            url = await pg.evaluate('(a) => window.TV.shot(...a)', a)
            shots[name] = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB')
        await pg.evaluate('window.TV.view(1.42, 0.95)')
        url = await pg.evaluate('window.TV.shot(0)')
        shots['face'] = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB')
        await pg.evaluate('window.TV.view()')
        print('\n'.join(errs) or 'no errors')
        await b.close()
    sheet = Image.open(SHEET).convert('RGB')
    k = PX_PER_U / SHEET_H
    def crop_sheet(x0, x1):
        c = sheet.crop((x0, 0, x1, sheet.height)).resize((int((x1 - x0) * k), int(sheet.height * k)))
        top = int(GROUND_S * k - GROUND_R)
        return c.crop((0, top, c.width, top + 700))
    tops = [crop_sheet(0, 360), crop_sheet(360, 640), crop_sheet(640, 960)]
    bots = [shots['front'], shots['side'], shots['back']]
    Wd = sum(max(t.width, 420) for t in tops)
    out = Image.new('RGB', (Wd, 1400), 'white')
    x = 0
    for t, r in zip(tops, bots):
        w = max(t.width, 420)
        out.paste(t, (x + (w - t.width) // 2, 0)); out.paste(r, (x + (w - 420) // 2, 700))
        d = ImageDraw.Draw(out); d.line([(x, 0), (x, 1400)], fill=(220, 220, 220)); d.line([(x, GROUND_R), (x + w, GROUND_R)], fill=(255, 160, 160)); d.line([(x, 700 + GROUND_R), (x + w, 700 + GROUND_R)], fill=(255, 160, 160))
        x += w
    out.save(os.path.join(args.out, args.name + '.png'))
    poses = Image.new('RGB', (420 * 5, 700), 'white')
    for i, n in enumerate(['q', 'run1', 'run2', 'jump', 'fall']): poses.paste(shots[n], (i * 420, 0))
    poses.save(os.path.join(args.out, args.name + '_poses.png'))
    shots['face'].save(os.path.join(args.out, args.name + '_face.png'))
    print('saved', args.name)

asyncio.run(main())
