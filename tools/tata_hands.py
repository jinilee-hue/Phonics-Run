"""Sheet hands vs 3D hands, zoomed (front left/right hand, side hand). uv run --with playwright --with pillow python tools/tata_hands.py --name N"""
import argparse, asyncio, base64, io, os
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('--name', default='hands'); args = ap.parse_args()
OUT = os.path.expanduser('~/.cache/agent-scratch/prun')
SHEET = os.path.expanduser('~/Documents/Jini/2026/Phonics/공통이미지자료/01_Phonics_Friends Guide_v1/01_Classmate_Friends/Tata_Views.png')
async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 420, 'height': 700}, device_scale_factor=1)
        await pg.goto('http://127.0.0.1:5185/dev/tata.html?dpr=2'); await pg.wait_for_function('window.TV')
        shots = {}
        for n, yaw in [('front', 0), ('side', -90), ('q', -30)]:
            u = await pg.evaluate('(y) => window.TV.shot(y)', yaw)
            shots[n] = Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGB')
        await b.close()
    sh = Image.open(SHEET).convert('RGB')
    # sheet: front figure x 0..360, ground 788, 260.5 px/u ; render: 840x1400 (dpr2), 622 px/u, ground at 1347
    k = 622 / 260.5
    def sheet_box(x0, y0, x1, y1): return sh.crop((x0, y0, x1, y1)).resize((int((x1 - x0) * k), int((y1 - y0) * k)))
    def render_box(img, sx0, sy0, sx1, sy1, cx_sheet):
        # map sheet coords to render coords (front centre x 191 -> 420)
        rx0 = 420 + (sx0 - cx_sheet) * k; ry0 = 1347 - (788 - sy0) * k
        return img.crop((int(rx0), int(ry0), int(rx0 + (sx1 - sx0) * k), int(ry0 + (sy1 - sy0) * k)))
    boxes = [('front', (20, 560, 120, 710), 191), ('front', (262, 560, 362, 710), 191), ('side', (440, 560, 560, 710), 500)]
    tiles = []
    for view, (x0, y0, x1, y1), cx in boxes:
        tiles.append((sheet_box(x0, y0, x1, y1), render_box(shots[view], x0, y0, x1, y1, cx)))
    W = sum(a.width for a, _ in tiles); H = max(a.height for a, _ in tiles)
    out = Image.new('RGB', (W, H * 2), 'white'); x = 0
    for a, r in tiles: out.paste(a, (x, 0)); out.paste(r, (x, H)); x += a.width
    out.save(os.path.join(OUT, args.name + '.png')); shots['q'].save(os.path.join(OUT, args.name + '_q.png')); print('saved', out.size)
asyncio.run(main())
