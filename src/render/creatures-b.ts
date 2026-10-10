// Batch B creatures: Dusklet (Ghost/Dark), Scalet (Dragon), Gloopit (Poison). Every model faces +z.

import * as THREE from 'three';
import { eyes, kit, type CreatureModel, type Mat } from './creature-kit';

const cone = (r: number, h: number, seg = 5) => new THREE.ConeGeometry(r, h, seg);
const sph = (r: number, w = 12, h = 9) => new THREE.SphereGeometry(r, w, h);

// ---------------------------------------------------------------- Dusklet: lantern ghost → hooded wraith → reaper

// Stage 1 Dusklet: a pale round ghost with a wispy tail and a little lantern flame on a hook. Stage 2 Gloamwraith:
// a dark hooded wraith with a faceless hood, glowing eyes, skeletal claws and a tattered hem. Stage 3 Nightpall: a huge
// tattered reaper cloak with a horned crown, six red eyes, floating spectral hands and orbiting shadow wisps.
export function dusklet(stage: number): CreatureModel {
  const materials: Mat[] = [];
  const k = kit(materials);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const ghostly = stage === 1;
  const cloak = k.mat(['#ddd5f7', '#2e2744', '#17122b'][stage - 1]!, { roughness: 0.9, flatShading: stage > 1, transparent: ghostly, opacity: ghostly ? 0.88 : 1, emissive: ghostly ? '#8f7fe0' : '#1a0f33', emissiveIntensity: ghostly ? 0.35 : 0.25 });
  const trim = k.mat(['#a08ff0', '#7a4fd0', '#a02060'][stage - 1]!, { roughness: 0.7, flatShading: true, emissive: ['#6a55d0', '#4a2a90', '#701040'][stage - 1]!, emissiveIntensity: 0.5 });
  const void_ = k.mat('#05030c', { roughness: 1 });
  const glowC = ['#ffe28a', '#ff4fd8', '#ff2a3a'][stage - 1]!;
  const glow = k.mat(glowC, { emissive: glowC, emissiveIntensity: 2.2 });
  const bone = k.mat('#e8e0d0', { roughness: 0.7, flatShading: true });
  const head = new THREE.Group();
  body.add(head);
  const hem: THREE.Object3D[] = [];
  const orbs: THREE.Mesh[] = [];
  let flame: THREE.Mesh | null = null;

  if (stage === 1) {
    k.mesh(sph(0.38, 16, 12), cloak, body, [0, 0, 0], [1, 1.15, 1]);
    for (let i = 0; i < 5; i++) hem.push(k.mesh(sph(0.2 - i * 0.03, 10, 8), cloak, body, [0, -0.38 - i * 0.1, -0.12 - i * 0.1], [1, 0.9, 1]));
    for (const s of [-1, 1]) k.mesh(sph(0.09, 8, 6), cloak, body, [s * 0.4, -0.05, 0.08], [1, 1.3, 1]);
    head.position.set(0, 0.12, 0.3);
    k.mesh(sph(0.22, 12, 10), void_, head, [0, 0, 0.02], [1.1, 0.9, 0.5]);
    eyes(k, head, 0.1, 0.03, 0.06, 0.07, '#000', glowC);
    const stalk = k.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 5), bone, body, [0, 0.58, 0.1], undefined, [0.35, 0, 0]);
    stalk.castShadow = false;
    flame = k.mesh(cone(0.07, 0.17, 6), glow, body, [0, 0.8, 0.2]);
  } else if (stage === 2) {
    k.mesh(cone(0.55, 1.4, 10), cloak, body, [0, -0.1, -0.05]);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      hem.push(k.mesh(cone(0.11, 0.38, 3), cloak, body, [Math.sin(a) * 0.5, -0.78 - (i % 2) * 0.07, Math.cos(a) * 0.5 - 0.05], [1, 1, 0.4], [Math.PI, a, 0]));
    }
    k.mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 14), trim, body, [0, 0.45, 0.02], undefined, [Math.PI / 2, 0, 0]);
    head.position.set(0, 0.68, 0.05);
    k.mesh(sph(0.28, 14, 10), cloak, head, [0, 0, -0.03], [1, 1.1, 1]);
    k.mesh(cone(0.18, 0.4, 6), cloak, head, [0, 0.3, -0.16], undefined, [-0.6, 0, 0]);
    k.mesh(sph(0.2, 12, 10), void_, head, [0, -0.02, 0.1], [1, 1.1, 0.7]);
    for (const s of [-1, 1]) k.mesh(sph(0.045, 8, 6), glow, head, [s * 0.09, 0.02, 0.24], [1.3, 0.8, 0.8]);
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.38, 0.28, 0.15);
      arm.rotation.set(-0.9, 0, -s * 0.35);
      body.add(arm);
      k.mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.5, 5), bone, arm, [0, -0.25, 0]);
      for (let c = -1; c <= 1; c++) k.mesh(cone(0.018, 0.18, 4), bone, arm, [c * 0.04, -0.55, 0], undefined, [c * 0.3, 0, -c * 0.3]);
    }
    const orbM = k.mat('#ffb3f0', { emissive: '#ff4fd8', emissiveIntensity: 2 });
    for (let i = 0; i < 3; i++) orbs.push(k.mesh(sph(0.07, 8, 6), orbM, body, [0, 0, 0]));
  } else {
    k.mesh(cone(0.85, 2.0, 12), cloak, body, [0, -0.05, -0.1]);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      hem.push(k.mesh(cone(0.13, 0.7 + (i % 3) * 0.15, 3), cloak, body, [Math.sin(a) * 0.82, -1.0, Math.cos(a) * 0.82 - 0.1], [1, 1, 0.35], [Math.PI, a, 0]));
    }
    for (const s of [-1, 1]) k.mesh(sph(0.3, 10, 8), trim, body, [s * 0.5, 0.62, 0.0], [1.2, 0.7, 1]);
    head.position.set(0, 0.95, 0.12);
    k.mesh(sph(0.36, 14, 10), cloak, head, [0, 0, -0.05], [1, 1.1, 1]);
    k.mesh(cone(0.24, 0.55, 6), cloak, head, [0, 0.38, -0.22], undefined, [-0.6, 0, 0]);
    k.mesh(sph(0.28, 12, 10), void_, head, [0, -0.02, 0.14], [1, 1.1, 0.7]);
    for (const [x, y] of [[-0.12, 0.08], [0.12, 0.08], [-0.2, -0.04], [0.2, -0.04], [-0.07, -0.12], [0.07, -0.12]] as const) k.mesh(sph(0.04, 8, 6), glow, head, [x, y, 0.32], [1.3, 0.8, 0.8]);
    for (const s of [-1, 1]) {
      k.mesh(new THREE.TorusGeometry(0.3, 0.04, 6, 12, Math.PI * 1.1), trim, head, [s * 0.3, 0.28, 0], undefined, [0, 0, s > 0 ? 0.3 : Math.PI - 0.3]);
      k.mesh(cone(0.05, 0.4, 5), bone, head, [s * 0.32, 0.5, -0.05], undefined, [0, 0, -s * 0.5]);
      const hand = new THREE.Group();
      hand.position.set(s * 0.95, 0.2, 0.55);
      body.add(hand);
      k.mesh(sph(0.1, 8, 6), bone, hand, [0, 0, 0], [1, 0.8, 1.2]);
      for (let c = 0; c < 4; c++) k.mesh(cone(0.02, 0.2, 4), bone, hand, [(c - 1.5) * 0.045, 0, 0.17], undefined, [Math.PI / 2, 0, 0]);
      hem.push(hand);
    }
    const wispM = k.mat('#3a2060', { emissive: '#7a2aa0', emissiveIntensity: 0.8, transparent: true, opacity: 0.6 });
    for (let i = 0; i < 4; i++) orbs.push(k.mesh(sph(0.14, 8, 6), wispM, body, [0, 0, 0]));
    k.mesh(new THREE.TorusGeometry(0.95, 0.025, 6, 40), glow, body, [0, -0.7, -0.1], undefined, [Math.PI / 2, 0, 0]);
  }
  const hy = head.position.y;
  return {
    species: (['dusklet', 'gloamwraith', 'nightpall'] as const)[stage - 1]!, root, body, height: [1.3, 1.9, 2.5][stage - 1]!, baseY: [0.85, 1.2, 1.55][stage - 1]!,
    mouth: new THREE.Vector3(0, hy, head.position.z + 0.35), materials, size: [1, 1.1, 1.2][stage - 1]!, legs: [], head, wings: [],
    animate(time, _dt, energy, run = 0) {
      head.rotation.x = Math.sin(time * 0.9) * 0.06 + energy * 0.25;
      head.rotation.y = Math.sin(time * 0.6) * 0.1;
      hem.forEach((h, i) => { h.rotation.x = (stage === 1 ? 0 : 0.05) + Math.sin(time * 2.4 + i * 0.7) * (0.12 + run * 0.1); });
      if (stage === 1) hem.forEach((h, i) => { h.position.x = Math.sin(time * 2 + i * 0.8) * 0.06 * i; });
      orbs.forEach((o, i) => {
        const a = time * (1.1 + energy * 3) + (i * Math.PI * 2) / orbs.length;
        const r = stage === 3 ? 1.1 : 0.7;
        o.position.set(Math.cos(a) * r, stage === 3 ? 0.3 + Math.sin(a * 2) * 0.2 : 0.4 + Math.sin(a * 2) * 0.1, Math.sin(a) * r);
      });
      if (flame) { flame.scale.y = 1 + Math.sin(time * 9) * 0.2; flame.position.x = Math.sin(time * 6) * 0.02; }
      glow.emissiveIntensity = 2 + energy * 2 + Math.sin(time * 3) * 0.2;
    },
  };
}

// ---------------------------------------------------------------- Scalet: hatchling → wyvern → great dragon

/** Bat wing outline in XY: leading edge along +x, scalloped membrane toward +y (maps to backward once laid flat). */
function batWing(len: number, h: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(len, 0);
  for (const [x, y] of [[len * 0.9, h * 0.5], [len * 0.7, h * 0.32], [len * 0.55, h * 0.85], [len * 0.35, h * 0.5], [len * 0.18, h * 0.75], [0, h * 0.3]] as const) s.lineTo(x, y);
  s.lineTo(0, 0);
  return s;
}

// Stage 1 Scalet: a teal, wingless hatchling with horn nubs and back spikes. Stage 2 Drakonet: a longer blue wyvern with
// bat wings, swept horns and a spiked tail. Stage 3 Wyverno: a huge purple-and-gold dragon with great wings, a horned
// crest, a glowing chest and a blade-tipped tail.
export function scalet(stage: number): CreatureModel {
  const materials: Mat[] = [];
  const k = kit(materials);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const scale = k.mat(['#4fc9a4', '#3a7fd0', '#5a2fa8'][stage - 1]!, { roughness: 0.6, flatShading: stage > 1 });
  const belly = k.mat(['#fff1c9', '#bfe0ff', '#f0d27a'][stage - 1]!, { roughness: 0.8 });
  const horn = k.mat(stage === 3 ? '#f0d27a' : '#efe6cf', { roughness: 0.5, flatShading: true });
  const membrane = k.mat(['#7fe6c4', '#7ab0ff', '#8a4fd8'][stage - 1]!, { roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
  const nostril = k.mat('#111111');
  const fireM = k.mat('#ffb347', { emissive: '#ff6a1a', emissiveIntensity: 1.8 });
  const head = new THREE.Group();
  body.add(head);
  const legs: THREE.Object3D[] = [];
  const tailParts: THREE.Mesh[] = [];
  const pivots: THREE.Group[] = [];
  const legLen = [0.24, 0.36, 0.5][stage - 1]!;
  const bz = [1.3, 1.7, 2.0][stage - 1]!;

  k.mesh(sph(0.42, 16, 12), scale, body, [0, 0, -0.1], [[0.72, 0.66, 1.3], [0.7, 0.66, 1.7], [0.95, 0.85, 1.85]][stage - 1] as [number, number, number]);
  k.mesh(sph(0.32, 12, 10), belly, body, [0, -0.12, 0.05], [0.7, 0.55, bz * 0.75]);
  head.position.set(0, [0.2, 0.3, 0.4][stage - 1]!, bz * 0.42);
  const hs = [1, 1.15, 1.45][stage - 1]!;
  k.mesh(sph(0.22 * hs, 14, 10), scale, head, [0, 0, 0], [0.95, 0.85, 1.2]);
  k.mesh(new THREE.BoxGeometry(0.2 * hs, 0.12 * hs, 0.3 * hs), scale, head, [0, -0.04 * hs, 0.22 * hs]);
  if (stage === 3) k.mesh(new THREE.BoxGeometry(0.18 * hs, 0.06 * hs, 0.28 * hs), belly, head, [0, -0.13 * hs, 0.2 * hs]);
  for (const s of [-1, 1]) k.mesh(sph(0.018 * hs, 6, 5), nostril, head, [s * 0.05 * hs, 0.0, 0.38 * hs]);
  eyes(k, head, 0.11 * hs, 0.08 * hs, 0.13 * hs, 0.045 * hs, '#111', stage === 3 ? '#ffd23a' : undefined);
  for (const s of [-1, 1]) {
    if (stage === 1) k.mesh(cone(0.04, 0.1, 4), horn, head, [s * 0.1, 0.2, -0.04], undefined, [-0.3, 0, -s * 0.25]);
    else k.mesh(cone(0.05 * hs, 0.4 * hs, 5), horn, head, [s * 0.12 * hs, 0.2 * hs, -0.1 * hs], undefined, [-0.9, 0, -s * 0.25]);
  }
  if (stage === 3) {
    k.mesh(cone(0.06, 0.34, 4), horn, head, [0, 0.3, -0.05], undefined, [-0.4, 0, 0]);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.mesh(cone(0.035, 0.12, 4), horn, head, [s * 0.18, -0.12 - i * 0.02, 0.08 + i * 0.1], undefined, [Math.PI, 0, 0]);
    k.mesh(sph(0.12, 8, 6), fireM, head, [0, -0.1, 0.45]);
    k.mesh(sph(0.2, 10, 8), fireM, body, [0, 0.02, 0.62], [1, 0.8, 0.6]);
  }
  // Back spikes and tail.
  const spikes = [5, 7, 9][stage - 1]!;
  for (let i = 0; i < spikes; i++) k.mesh(cone(0.035 + stage * 0.012, 0.1 + stage * 0.06, 4), horn, body, [0, 0.3 + stage * 0.07 - i * 0.004, bz * 0.3 - i * (bz * 0.55 / spikes)], undefined, [-0.4, 0, 0]);
  const tailN = [5, 7, 8][stage - 1]!;
  for (let i = 0; i < tailN; i++) tailParts.push(k.mesh(sph((0.19 + stage * 0.03) * (1 - i * 0.1), 10, 8), scale, body, [0, -0.02 - i * 0.01, -bz * 0.5 - i * 0.2 * (stage === 1 ? 0.8 : 1)], [1, 0.9, 1]));
  const last = tailParts[tailN - 1]!;
  if (stage === 2) k.mesh(new THREE.OctahedronGeometry(0.17, 0), horn, body, [0, 0, last.position.z - 0.18], [0.5, 0.3, 1.3]);
  if (stage === 3) k.mesh(new THREE.OctahedronGeometry(0.28, 0), horn, body, [0, 0, last.position.z - 0.3], [0.2, 0.6, 1.6]);
  // Legs.
  for (const [x, z] of [[0.28, bz * 0.3], [-0.28, bz * 0.3], [0.28, -bz * 0.25], [-0.28, -bz * 0.25]] as const) {
    const leg = new THREE.Group();
    leg.position.set(x * (stage === 3 ? 1.3 : 1), -0.22 - stage * 0.03, z);
    body.add(leg);
    const r = [0.07, 0.08, 0.13][stage - 1]!;
    k.mesh(new THREE.CylinderGeometry(r, r * 1.15, legLen, 7), scale, leg, [0, -legLen / 2, 0]);
    for (const c of [-1, 0, 1]) k.mesh(cone(0.025 + stage * 0.008, 0.1 + stage * 0.04, 4), horn, leg, [c * r * 0.7, -legLen + 0.02, r * 1.2], undefined, [Math.PI / 2 + 0.3, 0, 0]);
    legs.push(leg);
  }
  // Wings: tiny buds on the hatchling, bat wings later.
  if (stage === 1) {
    for (const s of [-1, 1]) k.mesh(cone(0.06, 0.2, 4), membrane, body, [s * 0.2, 0.3, 0.0], undefined, [0, 0, -s * 0.9]);
  } else {
    const len = stage === 2 ? 0.9 : 1.5;
    const h = stage === 2 ? 0.7 : 1.1;
    for (const s of [-1, 1]) {
      const pv = new THREE.Group();
      pv.position.set(s * 0.24, 0.28, 0.2);
      body.add(pv);
      const shape = batWing(len, h);
      const holder = new THREE.Group();
      const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), membrane);
      m.castShadow = true;
      holder.add(m);
      for (const [x, y] of [[len, 0], [len * 0.55, h * 0.85], [len * 0.18, h * 0.75]] as const) {
        const L = Math.hypot(x, y);
        const bone = new THREE.Mesh(new THREE.BoxGeometry(L, 0.03, 0.02), horn);
        bone.position.set(x / 2, y / 2, 0.01);
        bone.rotation.z = Math.atan2(y, x);
        holder.add(bone);
      }
      holder.rotation.x = -Math.PI / 2;
      if (s < 0) holder.scale.x = -1;
      pv.add(holder);
      pv.userData.s = s;
      pivots.push(pv);
    }
  }
  const baseY = 0.25 + legLen + stage * 0.03;
  return {
    species: (['scalet', 'drakonet', 'wyverno'] as const)[stage - 1]!, root, body, height: [1.0, 1.5, 2.3][stage - 1]!, baseY,
    mouth: new THREE.Vector3(0, head.position.y, head.position.z + 0.45 * hs), materials, size: [1, 1.1, 1.2][stage - 1]!, legs, head, wings: pivots,
    animate(time, _dt, energy, run = 0) {
      head.rotation.x = Math.sin(time * 0.8) * 0.05 + energy * 0.3;
      head.rotation.y = Math.sin(time * 0.5) * 0.1;
      legs.forEach((l, i) => { l.rotation.x = run > 0 ? Math.sin(time * 14 + (i % 2) * Math.PI + (i < 2 ? 0 : 1.1)) * 0.6 * run : Math.sin(time * 1.6 + i) * 0.02; });
      tailParts.forEach((t, i) => { t.position.x = Math.sin(time * 2 + i * 0.6) * 0.04 * i; });
      for (const pv of pivots) pv.rotation.z = (pv.userData.s as number) * (0.55 + Math.sin(time * (3 + energy * 6 + run * 6)) * 0.35);
      fireM.emissiveIntensity = 1.5 + energy * 2.5 + Math.sin(time * 4) * 0.2;
    },
  };
}

// ---------------------------------------------------------------- Gloopit: slime frog → warty frog → toad king

// Stage 1 Gloopit: a glossy green slime frog with bulging eyes. Stage 2 Toxifrog: a warty purple-green frog with spore sacs
// and a throat sac. Stage 3 Plaguelord: a huge bloated toad king with a crown of spotted mushrooms, tusks, glowing
// pustules and a cloud of spores.
export function gloopit(stage: number): CreatureModel {
  const materials: Mat[] = [];
  const k = kit(materials);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const slime = stage === 1;
  const skin = k.mat(['#7ddc5a', '#5a8a3a', '#4a5a2a'][stage - 1]!, { roughness: slime ? 0.25 : 0.8, flatShading: stage > 1, transparent: slime, opacity: slime ? 0.9 : 1, emissive: slime ? '#2a8a1a' : '#000000', emissiveIntensity: slime ? 0.25 : 0 });
  const top = k.mat(['#4fb83a', '#8a4fb8', '#7a3a98'][stage - 1]!, { roughness: 0.7, flatShading: stage > 1 });
  const belly = k.mat(['#d8f5a8', '#e8e2a0', '#cfc88a'][stage - 1]!, { roughness: 0.8 });
  const pus = k.mat('#c8ff4a', { emissive: '#8aff1a', emissiveIntensity: 1.5, flatShading: true });
  const spore = k.mat('#ff8ad8', { emissive: '#ff3aa8', emissiveIntensity: 1.4 });
  const dark = k.mat('#1a2410', { roughness: 0.9 });
  const tusk = k.mat('#efe6cf', { roughness: 0.5, flatShading: true });
  const head = new THREE.Group();
  body.add(head);
  const legs: THREE.Object3D[] = [];
  const motes: THREE.Mesh[] = [];
  const sacs: THREE.Mesh[] = [];
  const bs = [1, 1.1, 1.45][stage - 1]!;

  k.mesh(sph(0.42 * bs, 18, 14), skin, body, [0, 0, -0.05], [1.1, 0.8, 1.05]);
  k.mesh(sph(0.34 * bs, 12, 10), belly, body, [0, -0.1 * bs, 0.12 * bs], [1, 0.7, 0.9]);
  k.mesh(sph(0.4 * bs, 14, 10), top, body, [0, 0.08 * bs, -0.1], [1.0, 0.55, 1.0]);
  head.position.set(0, 0.2 * bs, 0.35 * bs);
  k.mesh(sph(0.27 * bs, 14, 10), skin, head, [0, 0, 0.05], [1.15, 0.7, 1]);
  // Wide mouth line and throat sac.
  k.mesh(new THREE.BoxGeometry(0.46 * bs, 0.02, 0.02), dark, head, [0, -0.07 * bs, 0.27 * bs]);
  if (stage >= 2) sacs.push(k.mesh(sph(0.13 * bs, 10, 8), belly, head, [0, -0.17 * bs, 0.12 * bs], [1, 0.8, 1]));
  // Bulging eyes on top of the head.
  for (const s of [-1, 1]) {
    k.mesh(sph(0.12 * bs, 12, 10), skin, head, [s * 0.17 * bs, 0.13 * bs, 0.05]);
    k.mesh(sph(0.085 * bs, 12, 10), k.mat(stage === 3 ? '#ffd23a' : '#ffffff', { roughness: 0.2 }), head, [s * 0.17 * bs, 0.15 * bs, 0.1 * bs]);
    k.mesh(sph(0.045 * bs, 8, 6), k.mat('#111111'), head, [s * 0.17 * bs, 0.15 * bs, 0.17 * bs], [stage > 1 ? 0.6 : 1, 1, 1]);
  }
  if (stage === 1) {
    for (let i = 0; i < 3; i++) k.mesh(cone(0.04, 0.12, 5), skin, body, [(i - 1) * 0.2, -0.38 - i * 0.01, 0.2 - i * 0.2], undefined, [Math.PI, 0, 0]);
    for (let i = 0; i < 4; i++) k.mesh(sph(0.06, 6, 5), top, body, [Math.sin(i * 2.3) * 0.28, 0.22, 0.15 - i * 0.15]);
  } else if (stage === 2) {
    for (let i = 0; i < 9; i++) k.mesh(sph(0.055 + (i % 3) * 0.012, 6, 5), i % 3 ? top : pus, body, [Math.sin(i * 2.1) * 0.32, 0.2 + (i % 2) * 0.05, 0.3 - i * 0.12]);
    for (let i = 0; i < 3; i++) sacs.push(k.mesh(sph(0.1, 10, 8), spore, body, [(i - 1) * 0.22, 0.3, -0.25 - (i % 2) * 0.12]));
  } else {
    for (let i = 0; i < 12; i++) k.mesh(sph(0.07 + (i % 3) * 0.015, 6, 5), i % 3 === 0 ? pus : top, body, [Math.sin(i * 2.1) * 0.5, 0.22 + (i % 2) * 0.06, 0.4 - i * 0.12]);
    // Mushroom crown on the back of the head.
    const capM = k.mat('#c0392b', { roughness: 0.7, flatShading: true });
    const stemM = k.mat('#efe6cf', { roughness: 0.8 });
    const dotM = k.mat('#ffffff');
    for (const [x, z, sz] of [[0, -0.12, 1], [0.22, -0.08, 0.7], [-0.22, -0.08, 0.7]] as const) {
      k.mesh(new THREE.CylinderGeometry(0.05 * sz, 0.07 * sz, 0.4 * sz, 6), stemM, head, [x, 0.3 + 0.1 * sz, z]);
      const cap = k.mesh(new THREE.SphereGeometry(0.2 * sz, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), capM, head, [x, 0.48 + 0.12 * sz, z], [1, 0.8, 1]);
      for (let d = 0; d < 4; d++) k.mesh(sph(0.03 * sz, 5, 4), dotM, cap, [Math.sin(d * 1.6) * 0.12 * sz, 0.12 * sz, Math.cos(d * 1.6) * 0.12 * sz]);
    }
    for (const s of [-1, 1]) k.mesh(cone(0.045, 0.22, 5), tusk, head, [s * 0.2, -0.05, 0.28], undefined, [Math.PI * 0.85, 0, s * 0.2]);
    k.mesh(new THREE.BoxGeometry(0.56, 0.07, 0.2), top, head, [0, 0.2, 0.18], undefined, [0.2, 0, 0]);
    for (let i = 0; i < 6; i++) motes.push(k.mesh(sph(0.045, 6, 5), spore, body, [0, 0, 0]));
    for (let i = 0; i < 3; i++) sacs.push(k.mesh(sph(0.11, 10, 8), pus, body, [(i - 1) * 0.3, 0.1, -0.55]));
  }
  // Legs: folded hind legs, small front legs.
  const legL = [0.18, 0.24, 0.34][stage - 1]!;
  for (const [x, z, big] of [[0.4, 0.28, 0], [-0.4, 0.28, 0], [0.45, -0.28, 1], [-0.45, -0.28, 1]] as const) {
    const leg = new THREE.Group();
    leg.position.set(x * bs, -0.22 * bs, z * bs);
    body.add(leg);
    const r = (big ? 0.12 : 0.08) * bs;
    k.mesh(sph(r * 1.3, 8, 6), skin, leg, [0, 0, 0], big ? [1, 1.1, 1.4] : undefined);
    k.mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.6, legL, 6), skin, leg, [0, -legL / 2, big ? 0.05 : 0]);
    k.mesh(sph(r * 1.1, 8, 6), belly, leg, [0, -legL, 0.07 * bs], [1.3, 0.5, 1.5]);
    legs.push(leg);
  }
  return {
    species: (['gloopit', 'toxifrog', 'plaguelord'] as const)[stage - 1]!, root, body, height: [0.95, 1.3, 2.2][stage - 1]!, baseY: 0.22 * bs + legL,
    mouth: new THREE.Vector3(0, head.position.y, head.position.z + 0.35 * bs), materials, size: [1, 1.05, 1.15][stage - 1]!, legs, head, wings: [],
    animate(time, _dt, energy, run = 0) {
      const breathe = 1 + Math.sin(time * 1.6) * 0.03;
      body.scale.set(1, breathe, 1);
      head.rotation.x = Math.sin(time * 0.9) * 0.05 + energy * 0.3;
      legs.forEach((l, i) => { l.rotation.x = run > 0 ? Math.sin(time * 12 + (i < 2 ? 0 : 1.5)) * 0.7 * run : Math.sin(time * 1.5 + i) * 0.02; });
      sacs.forEach((s, i) => { const k2 = 1 + Math.sin(time * 2.2 + i) * 0.12 + energy * 0.2; s.scale.setScalar(k2); });
      motes.forEach((m, i) => {
        const a = time * 0.7 + i * 1.05;
        m.position.set(Math.cos(a) * 0.9, 0.7 + Math.sin(time * 1.3 + i) * 0.25, Math.sin(a) * 0.9);
      });
      pus.emissiveIntensity = 1.3 + energy * 2;
    },
  };
}
