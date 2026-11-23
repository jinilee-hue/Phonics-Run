"""Plays every world headless with a simple autopilot (steer to m cards, around traps, wait for lifts, jump gaps) and
reports how far it got, hearts, words and how it ended. uv run --with playwright python tools/autoplay.py [level ...]"""
import asyncio, sys
AUTO = r"""
(() => {
  const PR = window.PR, P = PR.P, L = PR.lv;
  const A = window.__ap ||= { hold: 0 };
  if (A.hold > 0) { A.hold--; if (A.hold === 0) PR.press('jump', false); }
  const cur = P.ground;
  const nexts = L.plats.filter(p => p !== cur && p.zMax < P.z - 0.2 && !p.bounce).sort((a, b) => b.zMax - a.zMax);
  const nx = nexts[0];
  let tx = 0;
  const card = L.items.filter(i => i.kind === 'card' && i.state === 'idle' && i.z < P.z + 0.3 && i.z > P.z - 8).sort((a, b) => b.z - a.z)[0];
  if (card) tx = card.m ? card.x : (card.x <= 0 ? 1.4 : -1.4);
  if (nx && !nx.solid && nx.zMax > P.z - 6) tx = (nx.x0 + nx.x1) / 2;
  if (cur && cur.lift) tx = (cur.x0 + cur.x1) / 2;
  let mz = -1;
  if (P.grounded && cur && nx) {
    const toEdge = P.z - cur.zMin, gap = nx.zMax < cur.zMin - 0.05 || nx.top > cur.top + 0.15;
    if (gap && toEdge < 1.3) {
      const ready = !nx.lift || (nx.zMax > cur.zMin - 4.3 && Math.abs(P.x - (nx.x0 + nx.x1) / 2) < (nx.x1 - nx.x0) / 2 - 0.3);
      const onLift = cur.lift && cur.lift.axis === "z" && !(nx.zMax > cur.zMin - 3.2);
      if (onLift) mz = 0; else if (ready && A.hold === 0) { PR.press('jump', true); A.hold = 10; }
      else if (!ready && !onLift) mz = 0;
    }
  }
  const dx = Math.max(-1, Math.min(1, (tx - P.x) * 1.2));
  PR.move(dx * 0.8, mz);
})()
"""
async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for lv in ([int(a) - 1 for a in sys.argv[1:]] or range(5)):
            pg = await b.new_page(viewport={'width': 640, 'height': 400})
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e) + ' | ' + (e.stack or '')[:500]))
            await pg.goto('http://127.0.0.1:5185/?capture=1&nohint&fake=ok,ok,ok,ok,ok,ok,ok'); await pg.wait_for_function('window.PR && window.PR.ready', timeout=60000); await pg.evaluate('window.PR.ready')
            await pg.evaluate('window.PR.unlockAll()'); await pg.evaluate(f'window.PR.start({lv})'); await pg.wait_for_timeout(300)
            last, still, note, maxd = 0, 0, '', 0
            for i in range(2400):
                ph = await pg.evaluate(f'(() => {{ if (window.PR.G.phase === "play") {AUTO}; window.PR.step(1/30); return [window.PR.state.screen, window.PR.G.phase, -window.PR.P.z, window.PR.G.hearts]; }})()')
                maxd = max(maxd, ph[2])
                if ph[0] != 'play': note = ph[0]; break
                if ph[1] in ('say', 'enter'):
                    await pg.evaluate('() => new Promise(r => { let n = 0; const iv = setInterval(() => { window.PR.step(1/30); if (window.PR.state.screen !== "play" || ++n > 900) { clearInterval(iv); r(); } }, 20); })')
                    note = 'gate→' + (await pg.evaluate('window.PR.state.screen')); break
                if i % 30 == 0:
                    still = still + 1 if abs(ph[2] - last) < 0.3 and ph[1] == 'play' else 0; last = ph[2]
                    if still >= 6: note = f'STUCK at d {ph[2]:.1f}'; break
                if errs: note = 'ERROR'; break
            s = await pg.evaluate('window.PR.state')
            print('level', lv + 1, '| far', round(maxd, 1), '| hearts', s['hearts'], '| got', s['got'], '/', s['words'], '|', note)
            if errs: print('  ', errs[:2])
            await pg.close()
        await b.close()
asyncio.run(main())
