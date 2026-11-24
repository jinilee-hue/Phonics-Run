// Animal friends and little set pieces that live beside the course (user 2026-11-23: "맵에 맞게 동물 친구나 오브젝트들이
// 주변에 자연스럽게 있으면"): forest = bunnies, a frog on a lily pond, birds and butterflies; candy = gummy bears, a gumball
// machine, candy butterflies; snow = penguins, polar bears, an igloo with a sled; desert = camels, meerkats at their burrows;
// space = little aliens on floating rocks, a rocket, flying saucers.
// Every builder returns a group standing at y = 0 and looking down +z; o.userData.cr says how it moves (updateCritters).
import * as THREE from 'three';
import * as E from './env.js';
const { rr, rnd, std, RoundedBoxGeometry } = E;

const cache = {};
const once = (k, f) => (cache[k] ||= f());
const sph = seg => once('sph' + seg, () => new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)));
const ball = (rx, ry, rz, m, x = 0, y = 0, z = 0, seg = 20) => { const o = new THREE.Mesh(sph(seg), m); o.scale.set(rx, ry, rz); o.position.set(x, y, z); return o; };
const clay = (c, r = 0.6) => once('clay' + c + r, () => std(c, r));
const shiny = c => once('shiny' + c, () => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }));
const glow = c => once('glow' + c, () => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, roughness: 0.3 }));
const EYE = () => shiny(0x1b1430), WHITE = () => once('white', () => new THREE.MeshBasicMaterial({ color: 0xffffff }));
const CHEEK = () => once('cheek', () => std(0xff8fb0, 0.7, { transparent: true, opacity: 0.75 }));
/** two glossy eyes with a white glint (and pink cheeks) on a head; z is the head's front surface at that height */
function eyes(h, y, z, sep, r = 0.05, cheeks = true) {
  for (const sx of [-1, 1]) {
    h.add(ball(r, r * 1.2, r * 0.6, EYE(), sx * sep, y, z, 14));
    h.add(ball(r * 0.36, r * 0.36, r * 0.2, WHITE(), sx * sep + r * 0.32, y + r * 0.45, z + r * 0.5, 8));
    if (cheeks) h.add(ball(r * 0.95, r * 0.55, r * 0.3, CHEEK(), sx * (sep + r * 1.3), y - r * 1.7, z - r * 0.5, 10));
  }
}
const cap = (r, len, m, x, y, z, rx = 0, rz = 0) => { const o = new THREE.Mesh(once('cap' + r + len, () => new THREE.CapsuleGeometry(r, len, 4, 10)), m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); return o; };
/** a capsule from p0 to p1 (a limb that can point any way) */
const limb = (p0, p1, r, m) => { const d = p1.clone().sub(p0), o = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, d.length()), 6, 12), m);
  o.position.copy(p0).add(p1).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return o; };
const shadeAll = g => { g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };

// ---------------------------------------------------------------- forest
export function bunny(col = 0xfdf8f2) {
  const g = new THREE.Group(), fur = clay(col, 0.75), pink = clay(0xffb3c8, 0.6), b = new THREE.Group(); g.add(b);
  b.add(ball(0.36, 0.34, 0.34, fur, 0, 0.36, 0));
  for (const sx of [-1, 1]) { b.add(ball(0.13, 0.08, 0.2, fur, sx * 0.17, 0.06, 0.16)); b.add(ball(0.07, 0.09, 0.07, fur, sx * 0.12, 0.42, 0.3)); }
  b.add(ball(0.11, 0.11, 0.11, clay(0xffffff, 0.9), 0, 0.38, -0.34));
  const h = new THREE.Group(); h.position.set(0, 0.84, 0.08); b.add(h);
  h.add(ball(0.3, 0.27, 0.27, fur));
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(sx * 0.11, 0.2, -0.04); ear.rotation.set(-0.15, 0, -sx * 0.2); h.add(ear);
    ear.add(cap(0.075, 0.34, fur, 0, 0.22, 0)); ear.add(ball(0.04, 0.17, 0.02, pink, 0, 0.23, 0.06, 12));
  }
  eyes(h, 0.03, 0.235, 0.12, 0.05);
  h.add(ball(0.04, 0.028, 0.025, pink, 0, -0.05, 0.265, 10));
  g.userData.cr = { k: 'hop', body: b, h: 0.32, w: 3.2 };
  return shadeAll(g);
}
/** a squirrel sitting up with an acorn in its paws and a big bushy tail curling up behind (user 2026-11-24: "다 토끼만 있는데
 *  흰토끼 놔두고 어두운 토끼 다른 동물로") — chestnut fur, cream belly and muzzle, tufted ears; it looks about (the 'look' bob) */
export function squirrel() {
  const g = new THREE.Group(), fur = clay(0xb8662e, 0.75), cream = clay(0xf6dcb8, 0.75), dark = clay(0x6e3414, 0.7), b = new THREE.Group(); g.add(b);
  b.add(ball(0.26, 0.32, 0.24, fur, 0, 0.34, 0));                                   // body, sitting up
  b.add(ball(0.17, 0.23, 0.09, cream, 0, 0.32, 0.17));                              // belly
  for (const sx of [-1, 1]) {
    b.add(ball(0.11, 0.07, 0.19, fur, sx * 0.14, 0.06, 0.13));                       // feet
    b.add(ball(0.06, 0.09, 0.06, fur, sx * 0.08, 0.5, 0.23));                        // paws, holding the acorn
  }
  b.add(ball(0.06, 0.07, 0.06, clay(0xc98a3a, 0.5), 0, 0.46, 0.29, 14));              // the acorn
  b.add(ball(0.066, 0.035, 0.066, clay(0x7a4a22, 0.9), 0, 0.52, 0.29, 12));
  // the tail: a chain of fluffy balls rising behind the back and curling over at the top, lighter at the tip
  const tail = [[0, 0.16, -0.24, 0.13], [0, 0.32, -0.38, 0.17], [0, 0.55, -0.44, 0.2], [0, 0.8, -0.42, 0.2], [0, 1.0, -0.33, 0.18], [0, 1.1, -0.18, 0.15], [0, 1.08, -0.06, 0.11]];
  tail.forEach(([x, y, z, r], i) => b.add(ball(r, r, r * 0.9, i > 4 ? clay(0xd08a4e, 0.8) : fur, x, y, z, 16)));
  const h = new THREE.Group(); h.position.set(0, 0.8, 0.06); b.add(h);
  h.add(ball(0.22, 0.2, 0.2, fur));
  h.add(ball(0.11, 0.085, 0.09, cream, 0, -0.06, 0.15));
  h.add(ball(0.032, 0.026, 0.02, dark, 0, -0.03, 0.235, 10));
  for (const sx of [-1, 1]) {
    h.add(ball(0.055, 0.09, 0.035, fur, sx * 0.12, 0.18, -0.02, 12));
    h.add(ball(0.022, 0.05, 0.022, dark, sx * 0.125, 0.27, -0.03, 8));              // ear tufts
  }
  eyes(h, 0.04, 0.175, 0.095, 0.042);
  g.userData.cr = { k: 'look', body: b, head: h };
  return shadeAll(g);
}
export function frog() {
  const g = new THREE.Group(), green = clay(0x6fcf4c, 0.45), belly = clay(0xd9f5a8, 0.6), b = new THREE.Group(); g.add(b);
  b.add(ball(0.34, 0.24, 0.3, green, 0, 0.22, 0)); b.add(ball(0.24, 0.16, 0.12, belly, 0, 0.18, 0.2));
  for (const sx of [-1, 1]) {
    b.add(ball(0.12, 0.12, 0.12, green, sx * 0.15, 0.42, 0.1));
    b.add(ball(0.07, 0.08, 0.05, EYE(), sx * 0.16, 0.45, 0.2, 12)); b.add(ball(0.025, 0.025, 0.015, WHITE(), sx * 0.16 + 0.025, 0.48, 0.245, 8));
    b.add(ball(0.16, 0.07, 0.2, green, sx * 0.28, 0.07, -0.08)); b.add(ball(0.06, 0.12, 0.06, green, sx * 0.16, 0.1, 0.24));
    b.add(ball(0.05, 0.03, 0.02, CHEEK(), sx * 0.22, 0.27, 0.27, 8));
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 16, Math.PI), clay(0x2a5a20)); smile.rotation.z = Math.PI; smile.position.set(0, 0.28, 0.29); b.add(smile);
  g.userData.cr = { k: 'hop', body: b, h: 0.4, w: 0.7, rest: true };
  return shadeAll(g);
}
export function pond(s = 1) {
  const g = new THREE.Group();
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.7 * s, 40), shiny(0x5cc8f0)); water.rotation.x = -Math.PI / 2; water.position.y = 0.04; water.scale.y = 0.75; g.add(water);
  const stone = clay(0xb9b3a8, 0.85);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.add(ball(rr(0.18, 0.26), rr(0.12, 0.16), rr(0.16, 0.24), stone, Math.cos(a) * 1.75 * s, 0.05, Math.sin(a) * 1.32 * s, 10)); }
  const pad = clay(0x4cae3a, 0.5), padGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20, 1, false, 0.3, Math.PI * 2 - 0.6);
  const pads = [[-0.6, 0.2], [0.5, -0.4], [0.75, 0.45]].map(([x, z]) => { const p = new THREE.Mesh(padGeo, pad); p.position.set(x * s, 0.07, z * s); p.rotation.y = rr(0, 6); g.add(p); return p; });
  const flower = new THREE.Group(); flower.position.set(0.5 * s, 0.1, -0.4 * s); g.add(flower);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, p = ball(0.1, 0.05, 0.05, clay(0xffb3d0, 0.5), Math.cos(a) * 0.09, 0.05, Math.sin(a) * 0.09, 10); p.rotation.y = -a; p.rotation.z = 0.5; flower.add(p); }
  flower.add(ball(0.05, 0.05, 0.05, clay(0xffd23f, 0.5), 0, 0.08, 0, 8));
  const f = frog(); f.position.set(-0.6 * s, 0.09, 0.2 * s); f.scale.setScalar(0.9); g.add(f);
  return shadeAll(g);
}
export function bird(col = 0x5aa8ff) {
  const g = new THREE.Group(), m = clay(col, 0.5), body = new THREE.Group(); g.add(body);
  body.add(ball(0.24, 0.22, 0.28, m)); body.add(ball(0.17, 0.15, 0.12, clay(0xfff6e8, 0.6), 0, -0.04, 0.18));
  const beak = new THREE.Mesh(once('beak', () => new THREE.ConeGeometry(0.05, 0.13, 10)), clay(0xffa53a, 0.4)); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.04, 0.32); body.add(beak);
  eyes(body, 0.08, 0.235, 0.1, 0.035, false);
  const tail = ball(0.08, 0.03, 0.16, m, 0, 0.04, -0.3); tail.rotation.x = -0.4; body.add(tail);
  const wings = [-1, 1].map(sx => { const w = new THREE.Group(); w.position.set(sx * 0.18, 0.06, 0); w.add(ball(0.24, 0.04, 0.14, m, sx * 0.2, 0, -0.02)); body.add(w); return w; });
  g.userData.cr = { k: 'fly', wings, w: rr(0.35, 0.55) };
  return shadeAll(g);
}
export function butterfly(a = 0xff8cc6, b = 0xffd447) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  body.add(cap(0.025, 0.2, clay(0x3a2a40), 0, 0, 0, Math.PI / 2));
  const wa = std(a, 0.5, { side: THREE.DoubleSide }), wb = std(b, 0.5, { side: THREE.DoubleSide });
  const wings = [-1, 1].map(sx => {
    const w = new THREE.Group(); body.add(w);
    w.add(ball(0.2, 0.012, 0.15, wa, sx * 0.19, 0, 0.06, 14)); w.add(ball(0.13, 0.012, 0.1, wb, sx * 0.13, 0, -0.1, 14));
    w.add(ball(0.04, 0.014, 0.04, WHITE(), sx * 0.24, 0.005, 0.08, 8));
    return w;
  });
  for (const sx of [-1, 1]) body.add(cap(0.008, 0.14, clay(0x3a2a40), sx * 0.04, 0.05, 0.16, -0.9, -sx * 0.3));
  g.userData.cr = { k: 'flutter', wings, w: rr(0.4, 0.8) };
  return g;
}

// ---------------------------------------------------------------- candy
export function gummyBear(col) {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  // opaque (user 2026-11-24 "곰돌이들 투명해서 몸과 얼굴이 겹쳐져서 보이는데": see-through, the head, arms and legs showed
  // inside the body); the jelly look comes from the gloss and a soft inner glow of its own colour instead
  const m = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.4, sheenColor: new THREE.Color(0xffffff),
    emissive: col, emissiveIntensity: 0.18 });
  b.add(ball(0.34, 0.4, 0.3, m, 0, 0.5, 0));
  b.add(ball(0.2, 0.24, 0.1, new THREE.MeshPhysicalMaterial({ color: new THREE.Color(col).lerp(new THREE.Color(0xffffff), 0.35), roughness: 0.15, clearcoat: 1 }), 0, 0.46, 0.22));
  for (const sx of [-1, 1]) b.add(ball(0.14, 0.16, 0.15, m, sx * 0.17, 0.14, 0.06));
  const armL = new THREE.Group(); armL.position.set(-0.3, 0.68, 0.02); armL.add(ball(0.1, 0.2, 0.1, m, 0, -0.14, 0)); armL.rotation.z = -0.5; b.add(armL);
  const armR = new THREE.Group(); armR.position.set(0.3, 0.68, 0.02); armR.add(ball(0.1, 0.2, 0.1, m, 0, -0.14, 0)); armR.rotation.z = 0.5; b.add(armR);
  const h = new THREE.Group(); h.position.set(0, 1.08, 0.02); b.add(h);
  h.add(ball(0.3, 0.27, 0.26, m));
  for (const sx of [-1, 1]) h.add(ball(0.1, 0.1, 0.07, m, sx * 0.21, 0.21, -0.02));
  h.add(ball(0.12, 0.09, 0.08, m, 0, -0.07, 0.21));
  h.add(ball(0.035, 0.025, 0.02, EYE(), 0, -0.03, 0.29, 8));
  eyes(h, 0.05, 0.225, 0.1, 0.04);
  g.userData.cr = { k: 'jiggle', body: b, arm: armR };
  return shadeAll(g);
}
export function gumballMachine() {
  const g = new THREE.Group();
  const red = shiny(0xff4f6d);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.9, 28), red); base.position.y = 0.45; g.add(base);
  const plate = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.22, 0.1, 2, 0.04), clay(0xdfe4ee, 0.3)); plate.position.set(0, 0.6, 0.47); g.add(plate);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16), clay(0xffd23f, 0.3)); knob.rotation.x = Math.PI / 2; knob.position.set(0, 0.6, 0.53); g.add(knob);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.12, 28), red); neck.position.y = 0.96; g.add(neck);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.28, depthWrite: false }));
  glass.position.y = 1.58; g.add(glass);
  const cols = E.SPRINKLE.slice(0, 5).concat([0xff8f52]);
  const gm = new THREE.InstancedMesh(sph(12), new THREE.MeshPhysicalMaterial({ roughness: 0.2, clearcoat: 1 }), 46), M = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < 46; i++) {
    let p; do { p = new THREE.Vector3(rr(-0.5, 0.5), rr(-0.5, 0.15), rr(-0.5, 0.5)); } while (p.length() > 0.46);
    M.compose(p.add(new THREE.Vector3(0, 1.58, 0)), new THREE.Quaternion(), new THREE.Vector3(0.11, 0.11, 0.11)); gm.setMatrixAt(i, M); gm.setColorAt(i, c.set(cols[i % cols.length]));
  }
  g.add(gm);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), red); lid.position.y = 2.12; lid.scale.y = 0.6; g.add(lid);
  g.add(ball(0.08, 0.08, 0.08, red, 0, 2.33, 0, 12));
  return shadeAll(g);
}

// ---------------------------------------------------------------- snow
export function penguin(scarf = 0xff4f6d) {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  const navy = clay(0x2b3456, 0.5), white = clay(0xffffff, 0.7), orange = clay(0xffa53a, 0.45);
  b.add(ball(0.36, 0.5, 0.34, navy, 0, 0.5, 0));
  b.add(ball(0.27, 0.38, 0.2, white, 0, 0.44, 0.16));
  b.add(ball(0.23, 0.17, 0.12, white, 0, 0.78, 0.2));
  eyes(b, 0.8, 0.31, 0.09, 0.045);
  const beak = new THREE.Mesh(once('pbeak', () => new THREE.ConeGeometry(0.06, 0.14, 12)), orange); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.71, 0.36); b.add(beak);
  const sc = new THREE.Mesh(once('scarf', () => new THREE.TorusGeometry(0.3, 0.07, 10, 28)), clay(scarf, 0.75)); sc.rotation.x = Math.PI / 2; sc.position.y = 0.6; sc.scale.set(1, 0.95, 1); b.add(sc);
  b.add(cap(0.06, 0.16, clay(scarf, 0.75), 0.2, 0.46, 0.24, 0, 0.25));
  const fl = [-1, 1].map(sx => { const f = new THREE.Group(); f.position.set(sx * 0.33, 0.62, 0); f.add(ball(0.07, 0.24, 0.13, navy, sx * 0.03, -0.18, 0)); f.rotation.z = sx * 0.25; b.add(f); return f; });
  for (const sx of [-1, 1]) g.add(ball(0.1, 0.04, 0.15, orange, sx * 0.13, 0.03, 0.12));
  g.userData.cr = { k: 'waddle', body: b, wings: fl };
  return shadeAll(g);
}
export function polarBear() {
  const g = new THREE.Group(), fur = clay(0xfbf8f1, 0.8), b = new THREE.Group(); g.add(b);
  // sitting like a teddy (user 2026-11-24 "곰돌이도 팔다리가 어색해" — little stubs splayed flat at the bottom): a pear-shaped
  // body, the hind legs reaching forward with dark soles (and toe pads) facing out, the arms hanging down the front of the
  // body from the shoulders with their paws resting on the legs
  b.add(ball(0.52, 0.52, 0.47, fur, 0, 0.52, 0));
  const pad = clay(0x6b5c5c, 0.6);
  for (const sx of [-1, 1]) {
    b.add(ball(0.17, 0.15, 0.27, fur, sx * 0.26, 0.15, 0.24));                                 // hind leg, forward
    b.add(ball(0.1, 0.11, 0.035, pad, sx * 0.26, 0.16, 0.5, 12));                              // sole
    for (const tx of [-0.07, 0, 0.07]) b.add(ball(0.03, 0.03, 0.02, pad, sx * 0.26 + tx, 0.29, 0.47, 8));   // toe pads
    // the arm lies down the front of the round body, from the shoulder to a round paw resting on the tummy just above
    // the leg — both ends sit on the body's surface, so it reads as an arm, not a lump (user 2026-11-24 "곰돌이 팔은 아직 좀 어색")
    b.add(limb(new THREE.Vector3(sx * 0.4, 0.8, 0.17), new THREE.Vector3(sx * 0.25, 0.4, 0.42), 0.125, fur));
    b.add(ball(0.125, 0.115, 0.12, fur, sx * 0.24, 0.37, 0.45));                               // paw
  }
  const h = new THREE.Group(); h.position.set(0, 1.12, 0.12); b.add(h);
  h.add(ball(0.36, 0.32, 0.32, fur));
  for (const sx of [-1, 1]) { h.add(ball(0.1, 0.1, 0.07, fur, sx * 0.24, 0.24, -0.03)); h.add(ball(0.05, 0.05, 0.03, clay(0xffc4d2), sx * 0.24, 0.24, 0.02, 10)); }
  h.add(ball(0.16, 0.12, 0.14, clay(0xfffdf8, 0.7), 0, -0.08, 0.26));
  h.add(ball(0.06, 0.045, 0.04, EYE(), 0, -0.03, 0.4, 10));
  eyes(h, 0.06, 0.28, 0.14, 0.045);
  g.userData.cr = { k: 'look', body: b, head: h };
  return shadeAll(g);
}
export function igloo() {
  const g = new THREE.Group();
  const tex = once('iglooTex', () => { const t = E.canvasTex(256, 128, c => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 256, 128); c.strokeStyle = '#c4def5'; c.lineWidth = 3; for (let r = 0; r < 6; r++) { const y = r * 21.3; c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); for (let k = 0; k < 8; k++) { const x = k * 32 + (r % 2) * 16; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 21.3); c.stroke(); } } }); t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); return t; });
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.5, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), m); g.add(dome);
  const tun = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.1, 24, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide }));
  tun.rotation.x = -Math.PI / 2; tun.position.set(0, 0, 1.45); g.add(tun);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.58, 24, 0, Math.PI), clay(0x3a5a80, 0.9)); hole.position.set(0, 0, 1.99); g.add(hole);
  const sled = new THREE.Group(); sled.position.set(1.7, 0, 1.2); sled.rotation.y = -0.6; g.add(sled);
  const wood = clay(0xd2553f, 0.5);
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.08, 1.2, 2, 0.03), wood); seat.position.y = 0.25; sled.add(seat);
  for (const sx of [-1, 1]) { const run = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 12, Math.PI / 2), clay(0xffd23f, 0.3)); run.rotation.y = Math.PI / 2; run.position.set(sx * 0.3, 0.17, 0.55); sled.add(run); sled.add(cap(0.03, 1.1, clay(0xffd23f, 0.3), sx * 0.3, 0.04, -0.05, Math.PI / 2)); }
  return shadeAll(g);
}

// ---------------------------------------------------------------- desert
export function camel() {
  const g = new THREE.Group(), fur = clay(0xe0b072, 0.8), dark = clay(0xb8844a, 0.8), b = new THREE.Group(); g.add(b);
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { b.add(cap(0.12, 0.6, fur, sx * 0.21, 0.42, sz * 0.36)); b.add(ball(0.14, 0.07, 0.16, dark, sx * 0.21, 0.06, sz * 0.36 + 0.03, 10)); }
  b.add(ball(0.42, 0.38, 0.66, fur, 0, 1.05, 0));
  b.add(ball(0.45, 0.12, 0.52, clay(0x22b8a8, 0.6), 0, 1.3, 0.02));
  b.add(ball(0.42, 0.13, 0.48, clay(0xe8505e, 0.7), 0, 1.33, 0.02));
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) b.add(ball(0.05, 0.07, 0.05, clay(0xffc83a, 0.5), sx * 0.44, 1.14, (i - 1) * 0.3, 8));
  b.add(ball(0.3, 0.32, 0.32, fur, 0, 1.5, -0.02));
  b.add(cap(0.04, 0.3, dark, 0, 0.95, -0.7, -0.4));
  const neck = new THREE.Group(); neck.position.set(0, 1.2, 0.55); b.add(neck);
  neck.add(cap(0.12, 0.55, fur, 0, 0.3, 0.12, 0.45));
  const h = new THREE.Group(); h.position.set(0, 0.72, 0.36); neck.add(h);
  h.add(ball(0.18, 0.17, 0.28, fur)); h.add(ball(0.14, 0.11, 0.12, clay(0xf0caa0, 0.7), 0, -0.05, 0.22));
  for (const sx of [-1, 1]) h.add(ball(0.04, 0.08, 0.03, fur, sx * 0.13, 0.16, -0.1, 10));
  eyes(h, 0.06, 0.12, 0.13, 0.04);
  g.userData.cr = { k: 'chew', head: neck };
  return shadeAll(g);
}
export function meerkats(n = 3) {
  const g = new THREE.Group(), fur = clay(0xd9a868, 0.8), belly = clay(0xf2d6a8, 0.7), dark = clay(0x5a3a22, 0.7);
  const mound = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.22, 10, 28), clay(0xe0b878, 0.9)); mound.rotation.x = Math.PI / 2; mound.scale.z = 0.6; g.add(mound);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), clay(0x4a3020, 0.95)); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.02; g.add(hole);
  const kids = [];
  for (let i = 0; i < n; i++) {
    const k = new THREE.Group(), a = (i - (n - 1) / 2) * 0.5; k.position.set(Math.sin(a) * 0.9, 0, Math.cos(a) * 0.5 + 0.35); k.scale.setScalar(i === 1 ? 1 : 0.85);
    k.add(cap(0.14, 0.45, fur, 0, 0.42, 0)); k.add(ball(0.1, 0.22, 0.08, belly, 0, 0.42, 0.08));
    for (const sx of [-1, 1]) { k.add(cap(0.035, 0.12, fur, sx * 0.09, 0.62, 0.12, 0.9)); k.add(ball(0.07, 0.04, 0.1, fur, sx * 0.08, 0.03, 0.04, 10)); }
    k.add(cap(0.04, 0.4, fur, 0, 0.15, -0.18, 0.9));
    const h = new THREE.Group(); h.position.set(0, 0.86, 0.02); k.add(h);
    h.add(ball(0.14, 0.13, 0.16, fur)); h.add(ball(0.07, 0.06, 0.08, belly, 0, -0.03, 0.14));
    h.add(ball(0.025, 0.02, 0.02, EYE(), 0, -0.01, 0.22, 8));
    for (const sx of [-1, 1]) { h.add(ball(0.05, 0.045, 0.02, dark, sx * 0.065, 0.03, 0.12, 10)); h.add(ball(0.035, 0.03, 0.02, clay(0xc08850), sx * 0.12, 0.06, -0.02, 8)); }
    eyes(h, 0.035, 0.135, 0.065, 0.028, false);
    g.add(k); kids.push({ k, h });
  }
  g.userData.cr = { k: 'peek', kids };
  return shadeAll(g);
}

// ---------------------------------------------------------------- space
export function alien(col = 0x7be86a) {
  const g = new THREE.Group(), m = clay(col, 0.4), b = new THREE.Group(); g.add(b);
  b.add(ball(0.26, 0.3, 0.24, m, 0, 0.36, 0));
  for (const sx of [-1, 1]) b.add(ball(0.09, 0.12, 0.1, m, sx * 0.12, 0.07, 0.04));
  const arm = new THREE.Group(); arm.position.set(0.24, 0.5, 0); arm.add(ball(0.06, 0.17, 0.06, m, 0, 0.12, 0)); arm.rotation.z = -0.4; b.add(arm);
  const armL = ball(0.06, 0.17, 0.06, m, -0.27, 0.36, 0); armL.rotation.z = -0.4; b.add(armL);
  const h = new THREE.Group(); h.position.set(0, 0.86, 0); b.add(h);
  h.add(ball(0.38, 0.32, 0.32, m));
  for (const sx of [-1, 1]) {
    h.add(ball(0.11, 0.13, 0.06, WHITE(), sx * 0.14, 0.04, 0.27, 14)); h.add(ball(0.06, 0.08, 0.04, EYE(), sx * 0.14, 0.03, 0.31, 12)); h.add(ball(0.02, 0.02, 0.01, WHITE(), sx * 0.14 + 0.02, 0.06, 0.345, 6));
    h.add(ball(0.05, 0.03, 0.02, CHEEK(), sx * 0.26, -0.1, 0.22, 8));
    h.add(cap(0.018, 0.25, clay(col, 0.4), sx * 0.13, 0.4, 0, 0, -sx * 0.35)); h.add(ball(0.07, 0.07, 0.07, glow(sx < 0 ? 0xff7fe0 : 0xfff27a), sx * 0.19, 0.55, 0, 12));
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16, Math.PI), clay(0x2a3a20)); smile.rotation.z = Math.PI; smile.position.set(0, -0.1, 0.3); h.add(smile);
  g.userData.cr = { k: 'hover', body: b, arm };
  return shadeAll(g);
}
export function rocket() {
  const g = new THREE.Group(), white = shiny(0xf6f4ff), red = shiny(0xff5a6e);
  const body = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.45, 0.05], [0.55, 0.6], [0.55, 1.6], [0.42, 2.3], [0.18, 2.7], [0, 2.8]].map(([r, y]) => new THREE.Vector2(r, y)), 28), white); body.position.y = 0.35; g.add(body);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.31, 0.6, 24), red); tip.position.y = 3.27; g.add(tip);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 32), red); ring.rotation.x = Math.PI / 2; ring.position.y = 1.0; g.add(ring);
  const win = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 24), new THREE.MeshStandardMaterial({ color: 0x7fd8ff, emissive: 0x3a8fd0, emissiveIntensity: 0.6, roughness: 0.1 }));
  win.rotation.x = Math.PI / 2; win.position.set(0, 1.85, 0.54); g.add(win);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.04, 8, 24), clay(0xb8bcd8, 0.3)); frame.position.set(0, 1.85, 0.57); g.add(frame);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + Math.PI / 6, f = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.8, 0.5, 2, 0.03), red); f.position.set(Math.sin(a) * 0.55, 0.55, Math.cos(a) * 0.55); f.rotation.y = a; g.add(f); }
  return shadeAll(g);
}
export function ufo() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  body.add(ball(0.95, 0.24, 0.95, shiny(0xb8bcd8)));
  body.add(ball(0.6, 0.12, 0.6, shiny(0x8a7cff), 0, -0.14, 0));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xbff4ff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.45, depthWrite: false }));
  dome.position.y = 0.14; body.add(dome);
  const pilot = new THREE.Group(); pilot.position.y = 0.22; body.add(pilot);
  pilot.add(ball(0.2, 0.17, 0.17, clay(0x7be86a, 0.4)));
  for (const sx of [-1, 1]) pilot.add(ball(0.05, 0.06, 0.03, EYE(), sx * 0.07, 0.02, 0.15, 10));
  const lights = [0xfff27a, 0x6ff3ff, 0xff7fe0];
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; body.add(ball(0.06, 0.06, 0.06, glow(lights[i % 3]), Math.cos(a) * 0.94, -0.02, Math.sin(a) * 0.94, 8)); }
  g.userData.cr = { k: 'fly', body, w: rr(0.25, 0.4), tilt: true };
  return g;
}

// ---------------------------------------------------------------- motion (one list per level, collected by worlds.js)
const ease = x => x * x * (3 - 2 * x);
export function updateCritter(o, T) {
  const c = o.userData.cr, t = T * (c.w || 1) + (c.ph ??= rnd() * 10);
  switch (c.k) {
    case 'hop': {                                                    // hop, hop, rest
      const u = (t % 2.2) / 2.2, up = c.rest ? (u < 0.25 ? Math.sin(u / 0.25 * Math.PI) : 0) : Math.abs(Math.sin(t * 1.6));
      c.body.position.y = up * c.h; const sq = c.rest ? 1 : 1 - (1 - up) * 0.08; c.body.scale.set(2 - sq, sq, 2 - sq);
      break;
    }
    case 'fly': {                                                    // circles over the field
      const a = t, r = c.r || 4;
      o.position.set(c.cx + Math.cos(a) * r, c.cy + Math.sin(a * 2) * 0.5, c.cz + Math.sin(a) * r);
      o.rotation.y = -a;
      if (c.wings) c.wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * Math.sin(T * 12 + c.ph) * 0.7; });
      if (c.tilt) c.body.rotation.z = Math.sin(T * 1.3 + c.ph) * 0.15;
      break;
    }
    case 'flutter': {
      o.position.set(c.cx + Math.sin(t * 0.9) * 1.6, c.cy + Math.sin(t * 2.1) * 0.35, c.cz + Math.sin(t * 0.55) * 1.6);
      o.rotation.y = Math.atan2(Math.cos(t * 0.9) * 0.9, Math.cos(t * 0.55) * 0.55);
      c.wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * (0.2 + Math.sin(T * 16 + c.ph) * 0.75); });
      break;
    }
    case 'jiggle': {
      const s = Math.sin(t * 5) * 0.04; c.body.scale.set(1 - s * 0.5, 1 + s, 1 - s * 0.5);
      c.arm.rotation.z = 2.4 + Math.sin(t * 6) * 0.45;
      break;
    }
    case 'waddle': {
      c.body.rotation.z = Math.sin(t * 5) * 0.12; c.body.position.y = Math.abs(Math.sin(t * 5)) * 0.04;
      c.wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * (0.25 + Math.max(0, Math.sin(t * 2.5)) * 0.5); });
      break;
    }
    case 'look': { c.head.rotation.y = Math.sin(t * 0.5) * 0.5; const s = 1 + Math.sin(t * 1.8) * 0.015; c.body.scale.set(s, s, s); break; }
    case 'chew': c.head.rotation.x = Math.sin(t * 0.8) * 0.12 + Math.max(0, Math.sin(t * 0.3)) * 0.25; break;
    case 'peek': c.kids.forEach(({ k, h }, i) => {                  // pop down into the burrow now and then
      const u = ((t + i * 0.7) % 6) / 6, down = u > 0.82 ? Math.sin((u - 0.82) / 0.18 * Math.PI) : 0;
      k.position.y = -0.75 * ease(down); h.rotation.y = Math.sin(t * 0.9 + i) * 0.6;
    }); break;
    case 'hover': { c.body.position.y = Math.sin(t * 1.8) * 0.12; c.arm.rotation.z = -0.6 + Math.sin(t * 7) * 0.4; break; }
    case 'float': o.position.y = c.y0 + Math.sin(t * 0.8) * 0.3; o.rotation.y = c.yaw + Math.sin(t * 0.4) * 0.15; break;
  }
}

/** a little floating rock for space friends to stand on (it bobs) */
export function spaceRock(w = 1.6) {
  const g = new THREE.Group(), rock = new THREE.Mesh(new THREE.CylinderGeometry(w, w * 0.45, 1.3, 9, 2), std(0x5e508a, 0.9, { flatShading: true }));
  rock.position.y = -0.68; g.add(rock);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(w * 1.02, w, 0.14, 9), std(0x9a8ce0, 0.7, { flatShading: true })); top.position.y = -0.07; g.add(top);
  for (let i = 0; i < 3; i++) { const a = rr(0, 6.3), cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), glow(i % 2 ? 0x6ff3ff : 0xff7fe0)); cr.scale.y = 2; cr.position.set(Math.cos(a) * w * 0.75, 0.25, Math.sin(a) * w * 0.75); g.add(cr); }
  return shadeAll(g);
}
