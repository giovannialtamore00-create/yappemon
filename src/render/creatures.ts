// Procedural creatures built from Three.js primitives. Every model faces +z.

import * as THREE from 'three';
import type { SpeciesId } from '../sim/types';
import { gravelo, pipwing, wispurr } from './creatures-a';
import { dusklet, gloopit, scalet } from './creatures-b';
import { cogling, flurrbit } from './creatures-c';
import { eyes, kit, type CreatureModel, type Mat } from './creature-kit';

export type { CreatureModel };

// ---------------------------------------------------------------- Cindrix: magma beetle

// Stage 1 Cindrix: round domed beetle. Stage 2 Pyroxen: long armored rhino beetle with a great horn and
// spiked plates. Stage 3 Calderox: a hulking walking volcano with a lava crater, lava flows and huge pincers.
function cindrix(stage: number): CreatureModel {
  const materials: Mat[] = [];
  const k = kit(materials);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const rock = k.mat(stage === 3 ? '#1d1514' : '#2e2623', { roughness: 0.85, flatShading: true });
  const shellM = k.mat(['#3a2c27', '#4a1f16', '#2a1210'][stage - 1]!, { roughness: 0.6, flatShading: true });
  const lava = k.mat(stage === 3 ? '#ffe08a' : '#ffb347', { emissive: stage === 1 ? '#ff5a12' : '#ff3a00', emissiveIntensity: 2.2, roughness: 0.4 });
  const legM = k.mat('#1f1917', { roughness: 0.8 });
  const len = [1, 1.3, 1.15][stage - 1]!; // body length factor

  // Belly + glowing core peeking from below the shell.
  k.mesh(new THREE.SphereGeometry(0.42, 18, 12), rock, body, [0, 0, -0.05], [1 + (stage - 1) * 0.12, 0.55, 1.2 * len]);
  k.mesh(new THREE.SphereGeometry(0.36, 16, 10), lava, body, [0, -0.06, -0.05], [1, 0.4, 1.12 * len]);
  let crater: THREE.Mesh | null = null;
  if (stage < 3) {
    // Shell halves (elytra) with a glowing seam: a dome at stage 1, long and low at stage 2.
    const sc: [number, number, number] = stage === 1 ? [0.98, 0.78, 1.28] : [0.92, 0.6, 1.62];
    for (const s of [-1, 1]) {
      const half = k.mesh(new THREE.SphereGeometry(0.46, 14, 10, 0, Math.PI), shellM, body, [s * 0.03, 0.06, -0.08], sc, [0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]);
      half.rotation.z = s * 0.06;
    }
    // Glowing seam following the curve of the shell.
    k.mesh(new THREE.TorusGeometry(0.465, 0.022, 5, 24, Math.PI), lava, body, [0, 0.06, -0.08], [sc[2], sc[1], 1], [0, Math.PI / 2, 0]);
    const cracks: [number, number, number, number, number][] = [
      [0.18, 0.33, 0.1, 0.5, 0.25], [-0.2, 0.32, -0.15, -0.6, 0.3], [0.24, 0.24, -0.35, 0.9, 0.22], [-0.22, 0.27, 0.22, -1.0, 0.2],
      [0.3, 0.12, 0.05, 1.3, 0.18], [-0.31, 0.1, -0.2, -1.2, 0.2],
    ];
    if (stage === 1) for (const [x, y, z, ry, l] of cracks) k.mesh(new THREE.BoxGeometry(0.035, 0.03, l), lava, body, [x, y, z], undefined, [0.3, ry, 0]);
    if (stage === 2) {
      // Pyroxen: overlapping armor bands, a ridge of spikes and spiked flanks.
      for (let i = 0; i < 4; i++) {
        const z = 0.42 - i * 0.3;
        k.mesh(new THREE.TorusGeometry(0.4, 0.035, 5, 16, Math.PI), shellM, body, [0, 0.06, z], [1.06, 0.68, 1], [0, 0, 0]);
        k.mesh(new THREE.TorusGeometry(0.4, 0.012, 4, 16, Math.PI), lava, body, [0, 0.07, z - 0.04], [1.04, 0.68, 1]);
      }
      for (let i = 0; i < 6; i++) {
        const z = 0.45 - i * 0.2;
        k.mesh(new THREE.ConeGeometry(0.055, 0.2 + (i % 2) * 0.07, 6), rock, body, [0, 0.36, z], undefined, [-0.35, 0, 0]);
      }
      for (const sd of [-1, 1]) for (const z of [0.2, -0.2, -0.55]) k.mesh(new THREE.ConeGeometry(0.045, 0.22, 6), rock, body, [sd * 0.4, 0.12, z], undefined, [0, 0, -sd * 1.2]);
    }
  } else {
    // Calderox: its back is a volcano — a rocky cone with a glowing crater and lava running down.
    k.mesh(new THREE.CylinderGeometry(0.24, 0.62, 0.62, 11, 1), rock, body, [0, 0.36, -0.08]);
    k.mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.07, 11), shellM, body, [0, 0.68, -0.08]);
    crater = k.mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.06, 11), lava, body, [0, 0.7, -0.08]);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const flow = new THREE.Group();
      flow.position.set(Math.sin(a) * 0.44, 0.38, -0.08 + Math.cos(a) * 0.44);
      flow.rotation.y = a;
      body.add(flow);
      k.mesh(new THREE.BoxGeometry(0.06, 0.03, 0.5 - (i % 2) * 0.14), lava, flow, [0, 0, 0], undefined, [1.02, 0, 0]);
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      k.mesh(new THREE.IcosahedronGeometry(0.1 + (i % 3) * 0.03, 0), shellM, body, [Math.sin(a) * 0.55, 0.08, -0.08 + Math.cos(a) * 0.55]);
    }
  }
  // Head.
  const head = new THREE.Group();
  head.position.set(0, -0.02 + (stage === 3 ? 0.05 : 0), 0.5 * len + (stage === 3 ? 0.12 : 0));
  body.add(head);
  const hs = [1, 1.15, 1.2][stage - 1]!;
  k.mesh(new THREE.SphereGeometry(0.22 * hs, 16, 12), rock, head, [0, 0, 0], [1.1, stage === 2 ? 0.7 : 0.85, 1]);
  eyes(k, head, 0.11 * hs, 0.06 * hs, 0.15 * hs, 0.05, '#111', '#ffd34a');
  if (stage === 1) {
    for (const s of [-1, 1]) k.mesh(new THREE.ConeGeometry(0.045, 0.22, 6), k.mat('#6b1d10', { roughness: 0.5 }), head, [s * 0.1, -0.06, 0.22], undefined, [Math.PI / 2, 0, s * 0.5]);
    k.mesh(new THREE.ConeGeometry(0.07, 0.3, 7), rock, head, [0, 0.2, 0.06], undefined, [0.5, 0, 0]);
    k.mesh(new THREE.SphereGeometry(0.04, 8, 6), lava, head, [0, 0.33, 0.13]);
  } else if (stage === 2) {
    // A great curved rhino horn with a glowing tip, and a smaller one behind it.
    const horn = new THREE.Group();
    horn.position.set(0, 0.08, 0.12);
    head.add(horn);
    k.mesh(new THREE.ConeGeometry(0.09, 0.42, 7), rock, horn, [0, 0.12, 0.12], undefined, [0.85, 0, 0]);
    k.mesh(new THREE.ConeGeometry(0.05, 0.22, 7), rock, horn, [0, 0.32, 0.27], undefined, [0.25, 0, 0]);
    k.mesh(new THREE.SphereGeometry(0.035, 8, 6), lava, horn, [0, 0.43, 0.3]);
    k.mesh(new THREE.ConeGeometry(0.06, 0.22, 6), rock, head, [0, 0.22, -0.1], undefined, [0.3, 0, 0]);
    for (const s of [-1, 1]) k.mesh(new THREE.ConeGeometry(0.04, 0.18, 6), k.mat('#6b1d10', { roughness: 0.5 }), head, [s * 0.13, -0.08, 0.24], undefined, [Math.PI / 2, 0, s * 0.6]);
  } else {
    // Huge plated pincers and a magma-lit maw.
    for (const s of [-1, 1]) {
      const p = new THREE.Group();
      p.position.set(s * 0.2, -0.05, 0.2);
      p.rotation.y = -s * 0.35;
      head.add(p);
      k.mesh(new THREE.BoxGeometry(0.1, 0.09, 0.32), shellM, p, [0, 0, 0.12]);
      k.mesh(new THREE.ConeGeometry(0.06, 0.26, 6), shellM, p, [-s * 0.05, 0, 0.38], undefined, [Math.PI / 2, 0, s * 0.9]);
      k.mesh(new THREE.ConeGeometry(0.03, 0.08, 4), rock, p, [-s * 0.06, 0.06, 0.15], undefined, [0, 0, 0]);
    }
    k.mesh(new THREE.BoxGeometry(0.2, 0.04, 0.05), lava, head, [0, -0.1, 0.27]);
    for (const s of [-1, 1]) k.mesh(new THREE.ConeGeometry(0.06, 0.2, 6), rock, head, [s * 0.18, 0.22, -0.02], undefined, [0, 0, -s * 0.6]);
  }
  // Six legs: short at stage 1, long and spiked at stage 2, thick pillars at stage 3.
  const legs: THREE.Group[] = [];
  const legT = [1, 1.1, 1.9][stage - 1]!;
  const legL = [1, 1.25, 1.1][stage - 1]!;
  for (const s of [-1, 1]) for (const z of [0.25, -0.05, -0.35]) {
    const leg = new THREE.Group();
    leg.position.set(s * (0.32 + (stage - 1) * 0.06), -0.08, z * len);
    body.add(leg);
    k.mesh(new THREE.CylinderGeometry(0.035 * legT, 0.03 * legT, 0.3 * legL, 6), legM, leg, [s * 0.12, 0.02, 0], undefined, [0, 0, s * 1.2]);
    k.mesh(new THREE.CylinderGeometry(0.03 * legT, 0.02 * legT, 0.32 * legL, 6), legM, leg, [s * 0.26 * legL, -0.15 * legL, 0], undefined, [0, 0, s * 0.25]);
    if (stage === 2) k.mesh(new THREE.ConeGeometry(0.02, 0.09, 4), rock, leg, [s * 0.22, 0.08, 0], undefined, [0, 0, -s * 0.9]);
    legs.push(leg);
  }
  const size = [1, 1.1, 1.15][stage - 1]!;
  return {
    species: (['cindrix', 'pyroxen', 'calderox'] as const)[stage - 1]!, root, body, height: [0.95, 1.0, 1.25][stage - 1]!, baseY: 0.34, mouth: new THREE.Vector3(0, 0, 0.75 * len + (stage === 3 ? 0.15 : 0)), materials,
    size, legs, head, wings: [],
    animate(time, _dt, energy, run = 0) {
      lava.emissiveIntensity = 1.8 + Math.sin(time * 3) * 0.4 + energy * 3;
      if (crater) crater.scale.set(1, 1 + Math.sin(time * 4) * 0.4 + energy * 2, 1);
      legs.forEach((l, i) => { l.rotation.x = Math.sin(time * (4 + run * 22) + i * 1.7) * (0.08 + run * 0.5); });
      head.rotation.y = Math.sin(time * 0.9) * 0.12;
    },
  };
}

// ---------------------------------------------------------------- Brinkle: pufferfish in a bubble

// Stage 1 Brinkle: spiky pufferfish riding a water bubble. Stage 2 Tsunafin: a streamlined shark-finned fish
// surfing a ring of water. Stage 3 Abyssmaw: a dark deep-sea angler with a huge toothed jaw, glowing spots and
// a lure, wrapped in a swirling vortex.
function brinkle(stage: number): CreatureModel {
  const materials: Mat[] = [];
  const k = kit(materials);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const fishG = new THREE.Group();
  body.add(fishG);
  const skin = k.mat(['#3d9be9', '#1f7fa8', '#14284f'][stage - 1]!, { roughness: 0.45 });
  const belly = k.mat(['#d6f1ff', '#e6f6ff', '#2d4f7a'][stage - 1]!, { roughness: 0.5 });
  const spikeM = k.mat('#eef8ff', { roughness: 0.4 });
  const finM = k.mat(['#7fd0ff', '#5fe0ff', '#2a5fa8'][stage - 1]!, { roughness: 0.3, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const waterM = k.mat('#3a8fd8', { transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false });

  const spikes: THREE.Mesh[] = [];
  const spin: THREE.Object3D[] = [];
  let bubble: THREE.Mesh | null = null;
  let finL: THREE.Mesh, finR: THREE.Mesh, tail: THREE.Mesh;
  let lure: THREE.Mesh | null = null;
  if (stage === 1) {
    k.mesh(new THREE.SphereGeometry(0.4, 24, 18), skin, fishG);
    k.mesh(new THREE.SphereGeometry(0.33, 20, 14), belly, fishG, [0, -0.12, 0.08], [1, 0.75, 1]);
    // Spikes on a Fibonacci sphere (skip the face area).
    const n = 34;
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const a = i * 2.39996;
      const dir = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      if (dir.z > 0.55 && Math.abs(dir.y) < 0.6) continue;
      const sp = k.mesh(new THREE.ConeGeometry(0.035, 0.14, 5), spikeM, fishG, [dir.x * 0.4, dir.y * 0.4, dir.z * 0.4]);
      sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      spikes.push(sp);
    }
    eyes(k, fishG, 0.17, 0.1, 0.3, 0.1);
    k.mesh(new THREE.TorusGeometry(0.045, 0.02, 8, 16), k.mat('#ff7aa8'), fishG, [0, -0.07, 0.4]);
    finL = k.mesh(new THREE.ConeGeometry(0.12, 0.25, 3), finM, fishG, [-0.42, -0.02, 0.02], [1, 1, 0.25], [0, 0, Math.PI / 2]);
    finR = k.mesh(new THREE.ConeGeometry(0.12, 0.25, 3), finM, fishG, [0.42, -0.02, 0.02], [1, 1, 0.25], [0, 0, -Math.PI / 2]);
    tail = k.mesh(new THREE.ConeGeometry(0.18, 0.3, 4), finM, fishG, [0, 0.02, -0.5], [1, 1, 0.25], [-Math.PI / 2, 0, 0]);
    k.mesh(new THREE.ConeGeometry(0.1, 0.22, 3), finM, fishG, [0, 0.42, -0.05], [0.3, 1, 1]);
    // The water bubble it rides in.
    const bubbleM = k.mat('#cfeeff', { transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.1, depthWrite: false, emissive: '#2a6fa8', emissiveIntensity: 0.15 });
    bubble = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 24), bubbleM);
    bubble.renderOrder = 2;
    body.add(bubble);
    const water = new THREE.Mesh(new THREE.SphereGeometry(0.69, 28, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), waterM);
    water.renderOrder = 1;
    body.add(water);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.012, 6, 48), k.mat('#ffffff', { emissive: '#bfe8ff', emissiveIntensity: 0.5, transparent: true, opacity: 0.5 }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.25;
    body.add(rim);
    spin.push(rim);
  } else if (stage === 2) {
    // Tsunafin: long streamlined body with a tall shark fin, dark back stripes and a big forked tail.
    k.mesh(new THREE.SphereGeometry(0.4, 24, 18), skin, fishG, [0, 0, 0], [0.72, 0.78, 1.45]);
    k.mesh(new THREE.SphereGeometry(0.34, 20, 14), belly, fishG, [0, -0.1, 0.05], [0.66, 0.6, 1.3]);
    const stripeM = k.mat('#0f4f6f', { roughness: 0.5 });
    for (let i = 0; i < 4; i++) k.mesh(new THREE.TorusGeometry(0.28 - Math.abs(i - 1.5) * 0.03, 0.025, 5, 14, Math.PI * 0.9), stripeM, fishG, [0, 0.03, 0.25 - i * 0.18], [1, 1.05, 1], [0, 0, Math.PI * 0.05]);
    k.mesh(new THREE.ConeGeometry(0.2, 0.55, 3), finM, fishG, [0, 0.48, -0.05], [0.22, 1, 1.3], [-0.35, 0, 0]);
    eyes(k, fishG, 0.15, 0.08, 0.44, 0.075);
    k.mesh(new THREE.BoxGeometry(0.16, 0.02, 0.04), k.mat('#0b2b3d'), fishG, [0, -0.08, 0.56]);
    finL = k.mesh(new THREE.ConeGeometry(0.16, 0.42, 3), finM, fishG, [-0.36, -0.12, 0.1], [1, 1, 0.22], [0.3, 0, Math.PI / 2 + 0.4]);
    finR = k.mesh(new THREE.ConeGeometry(0.16, 0.42, 3), finM, fishG, [0.36, -0.12, 0.1], [1, 1, 0.22], [0.3, 0, -Math.PI / 2 - 0.4]);
    tail = new THREE.Mesh();
    const tailG = new THREE.Group();
    tailG.position.set(0, 0.02, -0.6);
    fishG.add(tailG);
    for (const sd of [-1, 1]) k.mesh(new THREE.ConeGeometry(0.15, 0.48, 3), finM, tailG, [0, sd * 0.16, -0.12], [0.22, 1, 1], [-Math.PI / 2 + sd * 0.7, 0, 0]);
    tail = tailG.children[0] as THREE.Mesh;
    // Surfing a spinning ring of water, droplets orbiting.
    const ring = k.mesh(new THREE.TorusGeometry(0.6, 0.09, 10, 40), waterM, body, [0, -0.45, 0], undefined, [Math.PI / 2, 0, 0]);
    ring.renderOrder = 1;
    const crest = new THREE.Group();
    body.add(crest);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.mesh(new THREE.SphereGeometry(0.05, 8, 6), k.mat('#bfe8ff', { transparent: true, opacity: 0.7, emissive: '#3aa4ff', emissiveIntensity: 0.4 }), crest, [Math.sin(a) * 0.6, -0.33 + (i % 2) * 0.06, Math.cos(a) * 0.6]);
    }
    spin.push(crest);
  } else {
    // Abyssmaw: a huge dark head that is mostly jaw, rows of teeth, glowing spots and a lure.
    k.mesh(new THREE.SphereGeometry(0.46, 24, 18), skin, fishG, [0, 0.04, -0.05], [1, 0.9, 1.05]);
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.12, 0.08);
    jaw.rotation.x = 0.25;
    fishG.add(jaw);
    k.mesh(new THREE.SphereGeometry(0.44, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), belly, jaw, [0, 0.02, 0.02], [1.05, 0.7, 1.15]);
    k.mesh(new THREE.CircleGeometry(0.4, 20), k.mat('#3a0814', { side: THREE.DoubleSide }), jaw, [0, 0.03, 0.06], [1, 1.1, 1], [-Math.PI / 2, 0, 0]);
    const tooth = k.mat('#f4f1e6', { roughness: 0.3 });
    for (let i = 0; i < 11; i++) {
      const a = -1.2 + i * 0.24;
      k.mesh(new THREE.ConeGeometry(0.032, 0.14, 4), tooth, jaw, [Math.sin(a) * 0.4, 0.08, 0.06 + Math.cos(a) * 0.4], undefined, [0, 0, 0]);
      k.mesh(new THREE.ConeGeometry(0.028, 0.12, 4), tooth, fishG, [Math.sin(a) * 0.4, -0.06, 0.02 + Math.cos(a) * 0.42], undefined, [Math.PI, 0, 0]);
    }
    eyes(k, fishG, 0.2, 0.22, 0.32, 0.055, '#000', '#9ffff0');
    const glowM = k.mat('#c8fff4', { emissive: '#3affd2', emissiveIntensity: 2.5 });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      k.mesh(new THREE.SphereGeometry(0.025, 6, 5), glowM, fishG, [Math.sin(a) * 0.46, 0.05 + Math.cos(a * 2) * 0.08, -0.05 + Math.cos(a) * 0.46]);
    }
    const stalk = new THREE.Group();
    stalk.position.set(0, 0.45, 0.05);
    fishG.add(stalk);
    k.mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 5), skin, stalk, [0, 0.15, 0.12], undefined, [0.75, 0, 0]);
    lure = k.mesh(new THREE.SphereGeometry(0.075, 12, 10), glowM, stalk, [0, 0.27, 0.32]);
    finL = k.mesh(new THREE.ConeGeometry(0.14, 0.3, 3), finM, fishG, [-0.48, -0.05, -0.05], [1, 1, 0.25], [0, 0, Math.PI / 2]);
    finR = k.mesh(new THREE.ConeGeometry(0.14, 0.3, 3), finM, fishG, [0.48, -0.05, -0.05], [1, 1, 0.25], [0, 0, -Math.PI / 2]);
    tail = k.mesh(new THREE.ConeGeometry(0.22, 0.4, 4), finM, fishG, [0, 0.02, -0.62], [1, 1, 0.25], [-Math.PI / 2, 0, 0]);
    // A dark whirlpool of three tilted rings instead of a bubble.
    const vortexM = k.mat('#1b4f9a', { transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false, emissive: '#0a2a6a', emissiveIntensity: 0.5 });
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      g.rotation.set(Math.PI / 2 + (i - 1) * 0.35, 0, i * 0.8);
      body.add(g);
      const r = k.mesh(new THREE.TorusGeometry(0.72 - i * 0.06, 0.03, 6, 40, Math.PI * 1.5), vortexM, g, [0, 0, -0.1 + i * 0.12]);
      r.renderOrder = 1;
      spin.push(g);
    }
  }
  const size = [1, 1.1, 1.15][stage - 1]!;
  return {
    species: (['brinkle', 'tsunafin', 'abyssmaw'] as const)[stage - 1]!, root, body, height: [1.85, 1.6, 1.7][stage - 1]!, baseY: 0.95, mouth: new THREE.Vector3(0, -0.07, [0.75, 0.62, 0.6][stage - 1]!), materials,
    size, legs: [], head: fishG, wings: [finL, finR],
    animate(time, _dt, energy) {
      fishG.rotation.y = Math.sin(time * 0.7) * 0.25;
      fishG.rotation.z = Math.sin(time * 1.1) * 0.08;
      fishG.position.y = Math.sin(time * 1.9) * 0.04;
      finL.rotation.y = Math.sin(time * 8) * 0.5;
      finR.rotation.y = -Math.sin(time * 8) * 0.5;
      tail.rotation.y = Math.sin(time * 5) * 0.35;
      const puff = 1 + energy * (stage === 1 ? 0.25 : 0.1) + Math.sin(time * 2.2) * 0.03;
      fishG.scale.setScalar(puff);
      for (const s of spikes) s.scale.setScalar(1 + energy * 0.8);
      bubble?.scale.set(1 + Math.sin(time * 2.4) * 0.02, 1 - Math.sin(time * 2.4) * 0.02, 1 + Math.sin(time * 2.4) * 0.02);
      spin.forEach((o, i) => { o.rotation.z = time * (0.5 + i * 0.4 + energy * 3) * (i % 2 ? -1 : 1); });
      if (lure) lure.scale.setScalar(1 + Math.sin(time * 4) * 0.2 + energy);
    },
  };
}

// ---------------------------------------------------------------- Vinram: mossy ram

// Stage 1 Vinram: woolly ram with curled vine horns. Stage 2 Thornhorn: a lean, long-legged goat with thorny
// horns thrust forward, a bramble mane and thorns down its back. Stage 3 Elderoot: a bark-bodied tree ram on
// root legs, with branching antlers, a leafy canopy, a moss beard and drifting glow-motes.
function vinram(stage: number): CreatureModel {
  const materials: Mat[] = [];
  const k = kit(materials);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const wool = k.mat(['#d9cfb4', '#9c8c66', '#5a3d24'][stage - 1]!, { roughness: 0.95, flatShading: true });
  const moss = k.mat('#4f8f3a', { roughness: 1, flatShading: true });
  const moss2 = k.mat('#6db04a', { roughness: 1, flatShading: true });
  const skin = k.mat(stage === 3 ? '#4a3420' : '#5b4636', { roughness: 0.8, flatShading: stage === 3 });
  const hoof = k.mat('#2a211b');
  const horn = k.mat('#cdb68c', { roughness: 0.5 });
  const vine = k.mat('#3f8f2e', { roughness: 0.7 });
  const leaf = k.mat('#7fd05a', { roughness: 0.6, side: THREE.DoubleSide });
  const thorn = k.mat('#3b5f22', { roughness: 0.6, flatShading: true });
  const legLen = [0.42, 0.56, 0.5][stage - 1]!;
  const motes: THREE.Mesh[] = [];

  if (stage === 1) {
    k.mesh(new THREE.SphereGeometry(0.5, 16, 12), wool, body, [0, 0, -0.05], [0.95, 0.78, 1.25]);
    const lumps: [number, number, number, number][] = [[0.25, 0.25, 0.25, 0.22], [-0.25, 0.25, 0.2, 0.22], [0, 0.33, -0.15, 0.25], [0.28, 0.15, -0.4, 0.2], [-0.28, 0.15, -0.38, 0.2], [0, 0.2, -0.55, 0.2]];
    for (const [x, y, z, r] of lumps) k.mesh(new THREE.IcosahedronGeometry(r, 1), wool, body, [x, y, z]);
    const mossBits: [number, number, number, number][] = [[0.08, 0.42, 0.05, 0.17], [-0.15, 0.4, -0.2, 0.15], [0.18, 0.36, -0.35, 0.13], [-0.05, 0.43, -0.45, 0.12], [0.2, 0.38, 0.2, 0.1], [-0.22, 0.36, 0.15, 0.11]];
    mossBits.forEach(([x, y, z, r], i) => k.mesh(new THREE.IcosahedronGeometry(r, 0), i % 2 ? moss : moss2, body, [x, y, z]));
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9;
      k.mesh(new THREE.ConeGeometry(0.05, 0.12, 3), leaf, body, [Math.sin(a) * 0.2, 0.52 + (i % 2) * 0.03, -0.2 + Math.cos(a) * 0.25], [1, 1, 0.3], [0.3, a, 0.4]);
    }
  } else if (stage === 2) {
    // Lean body, a bramble mane over the shoulders and a row of thorns along the spine.
    k.mesh(new THREE.SphereGeometry(0.5, 16, 12), wool, body, [0, 0, -0.08], [0.78, 0.68, 1.3]);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      k.mesh(new THREE.IcosahedronGeometry(0.13, 0), i % 2 ? moss : thorn, body, [Math.sin(a) * 0.3, 0.2 + Math.cos(a) * 0.12, 0.38]);
    }
    for (let i = 0; i < 7; i++) k.mesh(new THREE.ConeGeometry(0.045, 0.2 + (i % 2) * 0.06, 4), thorn, body, [0, 0.34 - i * 0.012, 0.25 - i * 0.14], undefined, [-0.5, 0, 0]);
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) k.mesh(new THREE.ConeGeometry(0.03, 0.12, 4), thorn, body, [sd * 0.34, 0.08, -0.1 - i * 0.2], undefined, [0, 0, -sd * 1.3]);
    const petal = k.mat('#ff8fc8', { emissive: '#ff4fa0', emissiveIntensity: 0.3 });
    for (let i = 0; i < 4; i++) k.mesh(new THREE.SphereGeometry(0.045, 6, 5), petal, body, [Math.sin(i * 1.6) * 0.28, 0.3, 0.38 + Math.cos(i * 1.6) * 0.06]);
  } else {
    // A trunk-like body of bark with moss on top and a leafy canopy growing from its back.
    k.mesh(new THREE.CylinderGeometry(0.42, 0.48, 1.15, 14, 2), wool, body, [0, 0, -0.08], [1, 0.75, 1], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 5; i++) k.mesh(new THREE.BoxGeometry(0.04, 0.5, 0.05), skin, body, [Math.sin(i * 1.3) * 0.4, 0.05, -0.5 + i * 0.25], undefined, [0.2, 0, i * 0.7]);
    for (let i = 0; i < 5; i++) k.mesh(new THREE.IcosahedronGeometry(0.16, 0), i % 2 ? moss : moss2, body, [Math.sin(i * 1.7) * 0.18, 0.33, -0.45 + i * 0.2]);
    const canopy = new THREE.Group();
    canopy.position.set(0, 0.45, -0.3);
    body.add(canopy);
    k.mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.4, 6), skin, canopy, [0, 0.15, 0]);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      k.mesh(new THREE.IcosahedronGeometry(0.22, 0), i % 2 ? moss : moss2, canopy, [Math.sin(a) * 0.25, 0.45 + (i % 3) * 0.06, Math.cos(a) * 0.25]);
    }
    k.mesh(new THREE.IcosahedronGeometry(0.26, 0), moss2, canopy, [0, 0.62, 0]);
    const glow = k.mat('#e8ffb0', { emissive: '#c8ff5a', emissiveIntensity: 2 });
    for (let i = 0; i < 5; i++) motes.push(k.mesh(new THREE.SphereGeometry(0.03, 6, 5), glow, body, [0, 0, 0]));
  }
  // Legs: stage 3 legs are thick roots that splay into toes.
  const legs: THREE.Object3D[] = [];
  for (const [x, z] of [[0.24, 0.32], [-0.24, 0.32], [0.24, -0.38], [-0.24, -0.38]] as const) {
    const leg = new THREE.Group();
    leg.position.set(x * (stage === 3 ? 1.25 : 1), -0.25, z);
    body.add(leg);
    if (stage < 3) {
      k.mesh(new THREE.CylinderGeometry(stage === 2 ? 0.06 : 0.08, stage === 2 ? 0.05 : 0.07, legLen, 8), skin, leg, [0, -legLen / 2 + 0.06, 0]);
      k.mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.08, 8), hoof, leg, [0, -legLen + 0.04, 0]);
    } else {
      k.mesh(new THREE.CylinderGeometry(0.1, 0.15, legLen, 7), skin, leg, [0, -legLen / 2 + 0.05, 0]);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        k.mesh(new THREE.ConeGeometry(0.045, 0.24, 5), skin, leg, [Math.sin(a) * 0.15, -legLen + 0.06, Math.cos(a) * 0.15], undefined, [Math.cos(a) * 1.2, 0, -Math.sin(a) * 1.2]);
      }
    }
    legs.push(leg);
  }
  // Head.
  const head = new THREE.Group();
  head.position.set(0, 0.22 + (stage === 2 ? 0.12 : 0), 0.62 + (stage === 3 ? 0.05 : 0));
  body.add(head);
  k.mesh(new THREE.SphereGeometry(0.2, 16, 12), skin, head, [0, 0, 0], stage === 2 ? [0.8, 0.9, 1.35] : [0.95, 0.95, 1.15]);
  k.mesh(new THREE.SphereGeometry(0.13, 12, 10), skin, head, [0, -0.08, stage === 2 ? 0.2 : 0.16], [1, 0.8, 1]);
  if (stage === 1) k.mesh(new THREE.IcosahedronGeometry(0.13, 1), wool, head, [0, 0.16, -0.02]);
  eyes(k, head, 0.12, 0.05, 0.13, 0.045, stage === 3 ? '#1a3a08' : '#3a2208');
  for (const s of [-1, 1]) {
    k.mesh(new THREE.SphereGeometry(0.02, 6, 6), hoof, head, [s * 0.05, -0.1, stage === 2 ? 0.34 : 0.3]);
    k.mesh(new THREE.ConeGeometry(0.05, 0.14, 6), skin, head, [s * 0.2, 0.02, -0.05], [1, 1, 0.5], [0, 0, s * 1.4]);
    if (stage === 1) {
      // Curled horn wrapped in vines.
      const hg = new THREE.Group();
      hg.position.set(s * 0.16, 0.1, -0.02);
      hg.rotation.set(0, s * 0.35, 0);
      head.add(hg);
      const h = k.mesh(new THREE.TorusGeometry(0.15, 0.055, 10, 24, Math.PI * 1.55), horn, hg, [s * 0.05, 0, 0], undefined, [0, Math.PI / 2, s > 0 ? -0.6 : Math.PI + 0.6]);
      h.scale.x = s;
      const v = k.mesh(new THREE.TorusGeometry(0.155, 0.018, 6, 24, Math.PI * 1.4), vine, hg, [s * 0.05, 0, 0.012], undefined, [0, Math.PI / 2, s > 0 ? -0.5 : Math.PI + 0.5]);
      v.scale.x = s;
      k.mesh(new THREE.ConeGeometry(0.035, 0.09, 3), leaf, hg, [s * 0.06, 0.16, -0.05], [1, 1, 0.3], [0.5, 0, s * 0.6]);
    } else if (stage === 2) {
      // Long thorny horns sweeping up and forward, ready to charge.
      const hg = new THREE.Group();
      hg.position.set(s * 0.12, 0.12, 0.02);
      hg.rotation.set(-0.5, s * 0.25, -s * 0.25);
      head.add(hg);
      k.mesh(new THREE.ConeGeometry(0.06, 0.6, 7), horn, hg, [0, 0.28, 0]);
      for (let i = 0; i < 4; i++) k.mesh(new THREE.ConeGeometry(0.02, 0.09, 4), thorn, hg, [s * 0.04, 0.1 + i * 0.12, 0], undefined, [0, 0, -s * 1.1]);
      k.mesh(new THREE.TorusGeometry(0.05, 0.012, 5, 10), vine, hg, [0, 0.12, 0], undefined, [Math.PI / 2, 0, 0]);
    } else {
      // Branching antlers of bark, tipped with moss.
      const br = new THREE.Group();
      br.position.set(s * 0.1, 0.15, -0.05);
      br.rotation.z = -s * 0.35;
      head.add(br);
      k.mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.6, 6), wool, br, [0, 0.3, 0]);
      k.mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.32, 5), wool, br, [s * 0.11, 0.45, 0], undefined, [0, 0, -s * 0.75]);
      k.mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.22, 5), wool, br, [-s * 0.07, 0.5, 0.03], undefined, [0.2, 0, s * 0.6]);
      k.mesh(new THREE.IcosahedronGeometry(0.1, 0), moss2, br, [0, 0.62, 0]);
      k.mesh(new THREE.IcosahedronGeometry(0.07, 0), moss, br, [s * 0.2, 0.58, 0]);
    }
  }
  if (stage === 3) {
    // Moss beard.
    for (let i = 0; i < 4; i++) k.mesh(new THREE.ConeGeometry(0.06, 0.22, 5), moss, head, [(i - 1.5) * 0.06, -0.2, 0.12], undefined, [Math.PI, 0, 0]);
  }
  k.mesh(new THREE.IcosahedronGeometry(0.09, 0), stage === 3 ? moss : wool, body, [0, 0.12, -0.72]);
  const size = [1, 1.1, 1.15][stage - 1]!;
  return {
    species: (['vinram', 'thornhorn', 'elderoot'] as const)[stage - 1]!, root, body, height: [1.35, 1.6, 1.95][stage - 1]!, baseY: 0.25 + legLen - 0.05, mouth: new THREE.Vector3(0, 0.15 + (stage === 2 ? 0.12 : 0), 0.9), materials,
    size, legs, head, wings: [],
    animate(time, _dt, energy, run = 0) {
      head.rotation.x = Math.sin(time * 0.8) * 0.06 + energy * 0.35;
      head.rotation.y = Math.sin(time * 0.5) * 0.1;
      // Gallop: front and back pairs swing in opposition.
      legs.forEach((l, i) => { l.rotation.x = run > 0 ? Math.sin(time * 18 + (i < 2 ? 0 : Math.PI) + (i % 2) * 0.5) * 0.7 * run : Math.sin(time * 2 + i) * 0.03; });
      motes.forEach((m, i) => {
        const a = time * 0.6 + i * 1.26;
        m.position.set(Math.sin(a) * 0.55, 0.9 + Math.sin(time * 1.3 + i) * 0.2, -0.3 + Math.cos(a) * 0.55);
      });
    },
  };
}

// ---------------------------------------------------------------- Joltmoth: electric moth

/** Wing outline in XY. style 1: rounded, 2: long swept with a pointed tip, 3: jagged storm wing. */
function wingShape(w: number, h: number, back: boolean, style = 1): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  if (style === 3) {
    const pts: [number, number][] = back
      ? [[w * 0.5, -h * 0.05], [w * 0.95, -h * 0.35], [w * 0.7, -h * 0.45], [w * 0.85, -h * 0.75], [w * 0.5, -h * 0.65], [w * 0.4, -h], [w * 0.15, -h * 0.5]]
      : [[w * 0.2, h * 0.6], [w * 0.45, h * 0.75], [w * 0.5, h * 1.05], [w * 0.75, h * 0.8], [w * 1.1, h * 0.95], [w * 0.95, h * 0.55], [w * 1.15, h * 0.3], [w * 0.6, h * 0.05]];
    for (const [x, y] of pts) s.lineTo(x, y);
    s.lineTo(0, 0);
  } else if (style === 2) {
    if (!back) {
      s.bezierCurveTo(w * 0.35, h * 0.7, w * 0.9, h * 0.85, w * 1.25, h * 1.0);
      s.bezierCurveTo(w * 0.95, h * 0.45, w * 0.6, h * 0.05, 0, 0);
    } else {
      s.bezierCurveTo(w * 0.5, -h * 0.05, w * 0.9, -h * 0.3, w * 1.05, -h * 0.9);
      s.bezierCurveTo(w * 0.55, -h * 0.75, w * 0.2, -h * 0.4, 0, 0);
    }
  } else if (!back) {
    s.bezierCurveTo(w * 0.3, h * 0.9, w * 0.9, h * 1.0, w, h * 0.55);
    s.bezierCurveTo(w * 1.05, h * 0.2, w * 0.6, -h * 0.15, 0, 0);
  } else {
    s.bezierCurveTo(w * 0.4, -h * 0.1, w * 0.95, -h * 0.4, w * 0.75, -h * 0.85);
    s.bezierCurveTo(w * 0.5, -h * 1.0, w * 0.15, -h * 0.5, 0, 0);
  }
  return s;
}

/** A thin rim around a wing outline (the wing shape cut out of a slightly larger copy). */
function wingRim(shape: THREE.Shape): THREE.Shape {
  const pts = shape.getPoints(24);
  const c = pts.reduce((a, p) => a.add(p), new THREE.Vector2()).divideScalar(pts.length);
  const rim = new THREE.Shape(pts.map((p) => p.clone().sub(c).multiplyScalar(1.07).add(c)));
  rim.holes.push(new THREE.Path([...pts]));
  return rim;
}

// Stage 1 Joltmoth: fluffy round moth. Stage 2 Stormoth: sleek, long-bodied moth with swept pointed wings,
// zigzag lightning antennae and a forked bolt tail. Stage 3 Tempestra: six jagged storm wings, a spiked crown,
// a storm-cloud halo and sparks orbiting it.
function joltmoth(stage: number): CreatureModel {
  const materials: Mat[] = [];
  const k = kit(materials);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const fur = k.mat(['#3a3352', '#2a2448', '#1c1a33'][stage - 1]!, { roughness: 0.9 });
  const fluff = k.mat('#f4f1e6', { roughness: 1, flatShading: true });
  const stripe = k.mat('#ffd83a', { emissive: '#ffb800', emissiveIntensity: 0.6, roughness: 0.5 });
  const wingM = k.mat(['#ffe66b', '#b9a6ff', '#7fe8ff'][stage - 1]!, { emissive: ['#ffd21a', '#7a5cff', '#1ad2ff'][stage - 1]!, emissiveIntensity: 1.1, transparent: true, opacity: 0.88, side: THREE.DoubleSide, roughness: 0.4 });
  const wingEdge = k.mat(stage === 1 ? '#7a5cff' : '#ffe14a', { emissive: stage === 1 ? '#7a5cff' : '#ffd21a', emissiveIntensity: 1.2, side: THREE.DoubleSide });
  const spotM = k.mat('#2b2340', { emissive: '#39e6ff', emissiveIntensity: 0.9, side: THREE.DoubleSide });

  // Thorax, fluffy collar (stage 1–2), abdomen with stripes (longer and thinner as it evolves).
  k.mesh(new THREE.SphereGeometry(0.2, 16, 12), fur, body, [0, 0, 0], [stage === 1 ? 1 : 0.85, 1, stage === 1 ? 1.1 : 1.3]);
  if (stage < 3) k.mesh(new THREE.IcosahedronGeometry(0.19, 1), fluff, body, [0, 0.03, 0.12], stage === 1 ? [1.1, 0.9, 0.6] : [0.8, 0.7, 0.45]);
  const abdomen = new THREE.Group();
  abdomen.position.set(0, -0.05, -0.2);
  body.add(abdomen);
  const segs = [5, 7, 6][stage - 1]!;
  const segR = [0.17, 0.13, 0.15][stage - 1]!;
  for (let i = 0; i < segs; i++) {
    const r = segR - i * (segR * 0.7) / segs;
    k.mesh(new THREE.SphereGeometry(r, 14, 10), i % 2 ? stripe : fur, abdomen, [0, -i * 0.02, -i * (stage === 2 ? 0.1 : 0.11)], [1, 0.95, 0.8]);
  }
  // Head with glowing compound eyes and antennae (feathery → zigzag bolts → crown).
  const head = new THREE.Group();
  head.position.set(0, 0.05, 0.27 + (stage === 2 ? 0.05 : 0));
  body.add(head);
  k.mesh(new THREE.SphereGeometry(0.13, 14, 10), fur, head);
  eyes(k, head, 0.08, 0.03, 0.07, 0.065, '#000', stage === 3 ? '#ffffff' : '#39e6ff');
  const antennae: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(s * 0.05, 0.1, 0.05);
    a.rotation.set(-0.5, 0, s * -0.4);
    head.add(a);
    if (stage === 1) {
      k.mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), fur, a, [0, 0.15, 0]);
      for (let j = 0; j < 5; j++) k.mesh(new THREE.BoxGeometry(0.1 - j * 0.012, 0.012, 0.01), stripe, a, [0, 0.1 + j * 0.045, 0]);
    } else {
      // Zigzag lightning bolt.
      for (let j = 0; j < 4; j++) k.mesh(new THREE.BoxGeometry(0.022, 0.13, 0.022), stripe, a, [(j % 2 ? 1 : -1) * 0.025, 0.06 + j * 0.1, 0], undefined, [0, 0, (j % 2 ? -1 : 1) * 0.5]);
    }
    antennae.push(a);
  }
  // Wings on pivots: 4 rounded (stage 1), 4 swept (stage 2), 6 jagged (stage 3).
  const pivots: THREE.Group[] = [];
  const wingScale = [1, 1.2, 1.3][stage - 1]!;
  const sets: { back: boolean; z: number; w: number; h: number; scale: number }[] = [
    { back: false, z: 0.04, w: 0.75, h: 0.62, scale: 1 },
    { back: true, z: -0.08, w: 0.55, h: 0.5, scale: 1 },
  ];
  if (stage === 3) sets.push({ back: true, z: -0.2, w: 0.45, h: 0.42, scale: 0.85 });
  for (const s of [-1, 1]) for (const set of sets) {
    const pv = new THREE.Group();
    pv.scale.setScalar(wingScale * set.scale);
    pv.position.set(s * 0.12, 0.08, set.z);
    body.add(pv);
    const shape = wingShape(set.w, set.h, set.back, stage);
    const wing = new THREE.Mesh(new THREE.ShapeGeometry(shape, 16), wingM);
    wing.castShadow = true;
    const edge = new THREE.Mesh(new THREE.ShapeGeometry(wingRim(shape), 16), wingEdge);
    const spot = new THREE.Mesh(new THREE.CircleGeometry(set.back ? 0.08 : 0.1, stage === 3 ? 5 : 16), spotM);
    spot.position.set(set.w * 0.55, set.back ? -set.h * 0.45 : set.h * 0.5, 0.004);
    const holder = new THREE.Group();
    holder.add(edge, wing, spot);
    // Shape lies in XY; lay it flat (XZ) pointing outward on side s, front edge toward +z.
    holder.rotation.x = -Math.PI / 2;
    if (s < 0) holder.scale.x = -1;
    pv.add(holder);
    pv.userData.s = s;
    pv.userData.phase = set.back ? (set.z < -0.1 ? 1 : 0.5) : 0;
    pivots.push(pv);
  }
  // Tiny legs.
  for (const s of [-1, 1]) for (const z of [0.05, -0.05]) k.mesh(new THREE.CylinderGeometry(0.01, 0.008, 0.18, 4), fur, body, [s * 0.1, -0.18, z], undefined, [0, 0, s * 0.4]);
  const orbs: THREE.Mesh[] = [];
  if (stage >= 2) {
    // Forked lightning tail.
    for (const sd of [-1, 1]) {
      const bolt = k.mesh(new THREE.ConeGeometry(0.03, 0.5, 4), stripe, abdomen, [sd * 0.06, -0.08, -segs * 0.1 - 0.1], undefined, [-Math.PI / 2 - 0.2, 0, sd * 0.3]);
      bolt.scale.z = 0.4;
    }
  }
  if (stage === 3) {
    // Spiked crown, a storm-cloud halo and sparks orbiting the body.
    for (let i = 0; i < 6; i++) k.mesh(new THREE.ConeGeometry(0.025, 0.2, 4), stripe, head, [Math.sin(i * 1.05) * 0.1, 0.14, Math.cos(i * 1.05) * 0.1 - 0.02], undefined, [0, 0, Math.sin(i * 1.05) * -0.4]);
    const cloudM = k.mat('#8a90a3', { roughness: 1, flatShading: true, emissive: '#3a4dff', emissiveIntensity: 0.15 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.mesh(new THREE.IcosahedronGeometry(0.07 + (i % 3) * 0.02, 1), cloudM, body, [Math.sin(a) * 0.3, 0.5 + (i % 2) * 0.04, Math.cos(a) * 0.3]);
    }
    const orbM = k.mat('#ffffff', { emissive: '#7ae8ff', emissiveIntensity: 2.5 });
    for (let i = 0; i < 3; i++) orbs.push(k.mesh(new THREE.SphereGeometry(0.045, 8, 6), orbM, body, [0, 0, 0]));
  }
  const size = [1, 1.1, 1.15][stage - 1]!;
  return {
    species: (['joltmoth', 'stormoth', 'tempestra'] as const)[stage - 1]!, root, body, height: 1.7, baseY: 1.05, mouth: new THREE.Vector3(0, 0.05, 0.45), materials,
    size, legs: [], head, wings: pivots,
    animate(time, _dt, energy, run = 0) {
      const speed = 11 + energy * 14 + run * 16;
      for (const pv of pivots) {
        const s = pv.userData.s as number;
        pv.rotation.z = s * (0.35 + Math.sin(time * speed + (pv.userData.phase as number)) * 0.6);
      }
      wingM.emissiveIntensity = 1.0 + energy * 2 + (Math.random() < 0.04 ? 1.5 : 0);
      antennae.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * (-0.4 + Math.sin(time * 3 + i) * 0.08); });
      abdomen.rotation.x = Math.sin(time * 2) * 0.08;
      orbs.forEach((o, i) => {
        const a = time * (2.2 + energy * 4) + (i * Math.PI * 2) / 3;
        o.position.set(Math.cos(a) * 0.5, 0.1 + Math.sin(a * 2) * 0.15, Math.sin(a) * 0.5);
      });
    },
  };
}

const BUILDERS: Record<SpeciesId, () => CreatureModel> = {
  cindrix: () => cindrix(1), pyroxen: () => cindrix(2), calderox: () => cindrix(3),
  brinkle: () => brinkle(1), tsunafin: () => brinkle(2), abyssmaw: () => brinkle(3),
  vinram: () => vinram(1), thornhorn: () => vinram(2), elderoot: () => vinram(3),
  joltmoth: () => joltmoth(1), stormoth: () => joltmoth(2), tempestra: () => joltmoth(3),
  gravelo: () => gravelo(1), boulderax: () => gravelo(2), tectonyx: () => gravelo(3),
  pipwing: () => pipwing(1), galehawk: () => pipwing(2), zephyrion: () => pipwing(3),
  dusklet: () => dusklet(1), gloamwraith: () => dusklet(2), nightpall: () => dusklet(3),
  scalet: () => scalet(1), drakonet: () => scalet(2), wyverno: () => scalet(3),
  gloopit: () => gloopit(1), toxifrog: () => gloopit(2), plaguelord: () => gloopit(3),
  cogling: () => cogling(1), gearhound: () => cogling(2), mechadon: () => cogling(3),
  flurrbit: () => flurrbit(1), hailstag: () => flurrbit(2), glaciarch: () => flurrbit(3),
  wispurr: () => wispurr(1), mystiline: () => wispurr(2), astralynx: () => wispurr(3),
};

export function buildCreature(species: SpeciesId): CreatureModel {
  const m = BUILDERS[species]();
  m.body.position.y = m.baseY;
  for (const mat of m.materials) {
    mat.userData.baseEmissive = mat.emissive.clone();
    mat.userData.baseEmissiveIntensity = mat.emissiveIntensity;
    mat.userData.baseOpacity = mat.opacity;
    mat.userData.baseTransparent = mat.transparent;
  }
  return m;
}
