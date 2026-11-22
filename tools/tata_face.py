"""Face close-ups of Tata (dev/tata.html) at several yaws next to the sheet's close-up face.
uv run --with playwright --with pillow python tools/tata_face.py [--name N]"""
import argparse, asyncio, base64, io, os
from PIL import Image, ImageDraw
ap = argparse.ArgumentParser(); ap.add_argument('--name', default='face'); ap.add_argument('--out', default=os.path.expanduser('~/.cache/agent-scratch/prun'))
args = ap.parse_args()
SHEET = os.path.expanduser('~/Documents/Jini/2026/Phonics/공통이미지자료/01_Phonics_Friends Guide_v1/01_Classmate_Friends/Tata_Views.png')
async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 420, 'height': 700}, device_scale_factor=1)
        await pg.goto('http://127.0.0.1:5185/dev/tata.html'); await pg.wait_for_function('window.TV')
        await pg.evaluate('window.TV.view(1.3, 1.25)')
        shots = []
        for yaw in [0, 25, 50, 75]:
            u = await pg.evaluate('(y) => window.TV.shot(y)', yaw)
            shots.append(Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGB'))
        await b.close()
    sh = Image.open(SHEET).convert('RGB').crop((960, 60, 1672, 941))
    sh = sh.resize((int(sh.width * 700 / sh.height), 700))
    out = Image.new('RGB', (sh.width + 420 * 4, 700), 'white'); out.paste(sh, (0, 0))
    for i, im in enumerate(shots): out.paste(im, (sh.width + i * 420, 0))
    out.save(os.path.join(args.out, args.name + '.png')); print('saved')
asyncio.run(main())
