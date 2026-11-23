// Things to pick up: picture cards (lesson pack words — the /m/ ones to collect, the others to jump over) and "m" coins.
// A card shows only the picture, like a picture card (phonics standard: the lesson-pack picture inside the card).
import * as THREE from 'three';
import { canvasTex, roundRect, shapeUV, std, rr, damp, burst, puff, sparkTex, TH } from './env.js';

const CW = 1.6, CR = 0.26;
const bodyGeo = (() => {
  const g = new THREE.ExtrudeGeometry(roundRect(CW, CW, CR), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -0.05);
  return g;
})();
const faceGeo = shapeUV(new THREE.ShapeGeometry(roundRect(CW - 0.02, CW - 0.02, CR - 0.01), 10), -(CW - 0.02) / 2, -(CW - 0.02) / 2, CW - 0.02, CW - 0.02);
const RIMS = [0xff7ab8, 0x4fb3ff, 0xffc93a, 0x5fd6a8, 0xa57bff];
const rimMats = RIMS.map(c => std(c, 0.5));
const haloMat = new THREE.SpriteMaterial({ map: sparkTex, color: 0xfff6c0, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });

const faceCache = {};
function faceTex(word) {
  if (faceCache[word]) return faceCache[word];
  const S = 512;
  const t = canvasTex(S, S, g => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S); });
  const img = new Image();
  img.onload = () => {
    const g = t.image.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);
    // the picture, inset, with rounded corners (moon keeps its square night sky, just rounded)
    const m = 30, r = 44;
    g.save(); g.beginPath(); g.roundRect(m, m, S - 2 * m, S - 2 * m, r); g.clip();
    g.drawImage(img, m, m, S - 2 * m, S - 2 * m);
    g.restore();
    t.needsUpdate = true;
  };
  img.src = `assets/words/${word}.png`;
  faceCache[word] = t;
  return t;
}

let rimNext = 0;
export function makeCard(parent, word, isM, x, y) {
  const root = new THREE.Group(); root.position.set(x, y, 0);
  const body = new THREE.Mesh(bodyGeo, rimMats[rimNext++ % rimMats.length]);
  body.castShadow = true;
  // the picture shows its own colours in every theme (unlit, not tone-mapped): a lit face took the pink sunset / night
  // light and the bloom and looked washed out (user: "카드가 뿌옇게 보이는 맵들도 있어")
  const faceM = new THREE.MeshBasicMaterial({ map: faceTex(word), toneMapped: false });
  const face = new THREE.Mesh(faceGeo, faceM); face.position.z = 0.096;
  const halo = new THREE.Sprite(haloMat.clone()); halo.scale.setScalar(2.9); halo.position.z = -0.15;
  root.add(halo, body, face);
  parent.add(root);
  return { kind: 'card', word, m: isM, x, y, root, faceM, halo, state: 'idle', t: 0, spoken: -99, phase: rr(0, 6.28) };
}

const coinGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.085, 36).rotateX(Math.PI / 2);
const coinFace = canvasTex(128, 128, g => {
  const gr = g.createRadialGradient(54, 48, 6, 64, 64, 64);
  gr.addColorStop(0, '#fff3a8'); gr.addColorStop(0.55, '#ffd23f'); gr.addColorStop(1, '#f2a516');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#e48f0c'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke();
  g.font = '800 84px "Baloo 2", "Arial Rounded MT Bold", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#e48f0c'; g.fillText('m', 64, 56);
  g.fillStyle = '#fff7c8'; g.fillText('m', 62, 53);
});
coinFace.center.set(0.5, 0.5); coinFace.rotation = Math.PI / 2;   // the cap UV of a cylinder turned to face +z lies on its side
const coinMats = [
  std(0xf5b41e, 0.32, { metalness: 0.25, emissive: 0x6a3a00, emissiveIntensity: 0.35 }),
  new THREE.MeshStandardMaterial({ map: coinFace, roughness: 0.32, metalness: 0.2, emissive: 0xffc23a, emissiveIntensity: 0.25 }),
  new THREE.MeshStandardMaterial({ map: coinFace, roughness: 0.32, metalness: 0.2, emissive: 0xffc23a, emissiveIntensity: 0.25 }),
];
export function makeCoin(parent, x, y) {
  const mesh = new THREE.Mesh(coinGeo, coinMats); mesh.position.set(x, y, 0); mesh.castShadow = true;
  parent.add(mesh);
  return { kind: 'coin', x, y, mesh, state: 'idle', t: 0 };
}

/** visual update of every item (bob, spin, pick-up animations) */
export function updateItems(items, dt, T) {
  for (const it of items) {
    if (it.state === 'gone') continue;
    if (it.kind === 'coin') {
      const m = it.mesh;
      if (it.state === 'idle') { m.rotation.y = T * 3.2 + it.x * 0.4; m.position.y = it.y + Math.sin(T * 3 + it.x) * 0.06; }
      else {
        it.t += dt;
        m.position.y += dt * 5; m.rotation.y += dt * 22;
        m.scale.setScalar(Math.max(0.001, 1 - it.t / 0.25));
        if (it.t > 0.25) { it.state = 'gone'; m.visible = false; }
      }
      continue;
    }
    const R = it.root;
    if (it.state === 'idle') {
      R.position.y = it.y + Math.sin(T * 2 + it.phase) * 0.1;
      R.rotation.y = Math.sin(T * 1.1 + it.phase) * 0.28;
      R.rotation.z = Math.sin(T * 1.6 + it.phase) * 0.04;
      it.halo.material.opacity = 0.16 + 0.06 * Math.sin(T * 3 + it.phase);
      const pulse = it.pulse > 0 ? (it.pulse -= dt, 1 + 0.12 * Math.sin((1 - it.pulse / 0.5) * Math.PI)) : 1;
      R.scale.setScalar(pulse);
    } else if (it.state === 'got') {
      it.t += dt;
      const u = it.t;
      R.position.y = it.y + u * 3.2;
      R.rotation.y = u * 14;
      R.scale.setScalar(Math.max(0.001, (1 + 0.35 * Math.sin(Math.min(1, u / 0.25) * Math.PI / 2)) * (1 - Math.max(0, (u - 0.35) / 0.3))));
      it.halo.material.opacity = Math.max(0, 0.8 - u);
      if (u > 0.65) { it.state = 'gone'; R.visible = false; }
    } else if (it.state === 'bad') {
      it.t += dt;
      const u = it.t;
      R.position.x = it.x + Math.sin(u * 50) * 0.12 * Math.max(0, 1 - u / 0.45);
      it.faceM.color.setScalar(1 - 0.45 * Math.min(1, u / 0.2));
      if (u > 0.45) {
        const k = Math.max(0.001, 1 - (u - 0.45) / 0.2);
        R.scale.setScalar(k);
        if (!it.poofed) { it.poofed = true; for (let i = 0; i < 5; i++) puff(it.x + rr(-0.6, 0.6), it.y + rr(-0.5, 0.5), 0.2, rr(-1.5, 1.5), rr(0.2, 1), 0.9); }
      }
      if (u > 0.65) { it.state = 'gone'; R.visible = false; }
    }
  }
}
export function takeCard(it) {
  it.state = it.m ? 'got' : 'bad'; it.t = 0;
  if (it.m) burst(new THREE.Vector3(it.x, it.y, 0.3), 0xfff3a0, 1);
}
export function takeCoin(it) { it.state = 'taken'; it.t = 0; }
void damp;
