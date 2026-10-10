// Batch A creatures: Gravelo (Rock/Earth), Pipwing (Flying), Wispurr (Psychic). Every model faces +z.

import * as THREE from 'three';
import { eyes, kit, type CreatureModel, type Mat } from './creature-kit';

type Kit = ReturnType<typeof kit>;
const cone = (r: number, h: number, seg = 5) => new THREE.ConeGeometry(r, h, seg);

// ---------------------------------------------------------------- Gravelo: rock armadillo → boulder lizard → mountain tortoise

// Stage 1 Gravelo: a round pebble-plated armadillo. Stage 2 Boulderax: a long lizard with boulders on its back, a
// horn ridge and a rock-club tail. Stage 3 Tectonyx: a walking mountain, a huge shell crowned with glowing crystal spires.
export function gravelo(stage: number): CreatureModel {
  const materials: Mat[] = [];
  const k = kit(materials);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const rock = k.mat(['#9a9082', '#756c61', '#4f4a46'][stage - 1]!, { roughness: 0.95, flatShading: true });
  const dirt = k.mat(['#b08658', '#8d6742', '#6a4a30'][stage - 1]!, { roughness: 1, flatShading: true });
  const skin = k.mat(stage === 3 ? '#3e352d' : '#6b5d4e', { roughness: 0.85, flatShading: true });
  const glowC = stage === 3 ? '#6fffd8' : '#ffc857';
  const crystal = k.mat(glowC, { emissive: glowC, emissiveIntensity: 1.2, flatShading: true, transparent: true, opacity: 0.92 });
  const legLen = [0.26, 0.38, 0.45][stage - 1]!;
  const legs: THREE.Object3D[] = [];
  const head = new THREE.Group();
  body.add(head);

  if (stage === 1) {
    k.mesh(new THREE.SphereGeometry(0.46, 16, 12), dirt, body, [0, 0, -0.05], [1, 0.82, 1.2]);
    // Armour bands over the back.
    for (const z of [0.3, 0.02, -0.26, -0.5]) k.mesh(new THREE.TorusGeometry(0.43 - Math.abs(z) * 0.18, 0.06, 6, 16, Math.PI), rock, body, [0, -0.02, z], [1, 0.85, 1], [0, 0, 0]);
    for (let i = 0; i < 9; i++) k.mesh(new THREE.IcosahedronGeometry(0.06 + (i % 3) * 0.015, 0), i % 2 ? rock : dirt, body, [Math.sin(i * 2.1) * 0.3, 0.3 + (i % 2) * 0.04, 0.25 - i * 0.1]);
    head.position.set(0, 0.04, 0.55);
    k.mesh(new THREE.SphereGeometry(0.2, 14, 10), skin, head, [0, 0, 0], [1, 0.9, 1.05]);
    k.mesh(cone(0.1, 0.24, 6), skin, head, [0, -0.04, 0.24], undefined, [Math.PI / 2, 0, 0]);
    k.mesh(new THREE.SphereGeometry(0.025, 6, 6), crystal, head, [0, 0.0, 0.37]);
    for (const s of [-1, 1]) k.mesh(new THREE.SphereGeometry(0.06, 8, 6), rock, head, [s * 0.17, 0.14, -0.04]);
    eyes(k, head, 0.1, 0.07, 0.13, 0.045);
    k.mesh(new THREE.IcosahedronGeometry(0.1, 0), rock, body, [0, -0.02, -0.68]);
  } else if (stage === 2) {
    k.mesh(new THREE.SphereGeometry(0.46, 16, 12), skin, body, [0, 0, -0.1], [0.82, 0.68, 1.75]);
    for (let i = 0; i < 6; i++) k.mesh(new THREE.IcosahedronGeometry(0.2 - i * 0.012, 0), i % 2 ? dirt : rock, body, [(i % 2 ? 0.05 : -0.05), 0.33 - i * 0.02, 0.5 - i * 0.28], [1, 0.9, 1]);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.mesh(new THREE.IcosahedronGeometry(0.1, 0), rock, body, [s * 0.34, 0.12, 0.3 - i * 0.4]);
    head.position.set(0, 0.08, 0.95);
    k.mesh(new THREE.SphereGeometry(0.2, 14, 10), skin, head, [0, 0, 0], [0.9, 0.8, 1.45]);
    k.mesh(new THREE.BoxGeometry(0.2, 0.08, 0.3), rock, head, [0, 0.13, 0.05], undefined, [0.15, 0, 0]);
    k.mesh(cone(0.05, 0.22, 5), crystal, head, [0, 0.2, 0.16], undefined, [0.5, 0, 0]);
    eyes(k, head, 0.11, 0.07, 0.15, 0.04, '#331a00');
    // Tail ending in a rock club.
    for (let i = 0; i < 4; i++) k.mesh(new THREE.SphereGeometry(0.2 - i * 0.035, 10, 8), skin, body, [0, -0.04 - i * 0.02, -0.95 - i * 0.22], [1, 0.9, 1]);
    k.mesh(new THREE.IcosahedronGeometry(0.2, 0), rock, body, [0, -0.1, -1.9]);
  } else {
    // Mountain shell with a ring of boulders and crystal spires.
    k.mesh(new THREE.SphereGeometry(0.5, 14, 10), dirt, body, [0, -0.05, 0], [1.35, 0.55, 1.55]);
    k.mesh(new THREE.IcosahedronGeometry(0.8, 1), rock, body, [0, 0.28, -0.1], [1.05, 0.85, 1.2]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.mesh(new THREE.IcosahedronGeometry(0.2, 0), i % 2 ? dirt : rock, body, [Math.sin(a) * 0.92, 0.0, -0.1 + Math.cos(a) * 1.08]);
    }
    const spires = [[0, 1.0, -0.1, 0.34, 0.9], [0.3, 0.85, 0.2, 0.2, 0.55], [-0.3, 0.88, 0.1, 0.22, 0.6], [0.28, 0.82, -0.4, 0.2, 0.5], [-0.25, 0.84, -0.4, 0.18, 0.52], [0, 0.72, 0.45, 0.16, 0.4]];
    for (const [x, y, z, r, h] of spires as number[][]) k.mesh(cone(r!, h!, 5), crystal, body, [x!, y!, z!], undefined, [0, x! * 3, x! * 0.6]);
    head.position.set(0, 0.0, 1.35);
    k.mesh(new THREE.CylinderGeometry(0.17, 0.26, 0.5, 8), skin, body, [0, -0.02, 1.08], undefined, [Math.PI / 2 - 0.3, 0, 0]);
    k.mesh(new THREE.SphereGeometry(0.25, 14, 10), skin, head, [0, 0.0, 0], [0.95, 0.85, 1.25]);
    k.mesh(new THREE.BoxGeometry(0.34, 0.1, 0.34), rock, head, [0, 0.18, 0.0]);
    for (const s of [-1, 1]) k.mesh(cone(0.06, 0.3, 5), crystal, head, [s * 0.14, 0.26, -0.05], undefined, [-0.4, 0, -s * 0.5]);
    eyes(k, head, 0.13, 0.06, 0.2, 0.045, '#000', '#6fffd8');
    k.mesh(new THREE.IcosahedronGeometry(0.22, 0), rock, body, [0, -0.1, -1.5]);
  }
  // Legs: stubby, thicker as it grows.
  const lz = [0.3, 0.45, 0.8][stage - 1]!;
  const lx = [0.26, 0.28, 0.72][stage - 1]!;
  const top = [0.22, 0.22, 0.3][stage - 1]!;
  const lr = [0.08, 0.1, 0.18][stage - 1]!;
  for (const [x, z] of [[lx, lz], [-lx, lz], [lx, -lz], [-lx, -lz]] as const) {
    const leg = new THREE.Group();
    leg.position.set(x, -top, z);
    body.add(leg);
    k.mesh(new THREE.CylinderGeometry(lr, lr * 1.2, legLen, 7), skin, leg, [0, -legLen / 2, 0]);
    k.mesh(new THREE.CylinderGeometry(lr * 1.3, lr * 1.5, 0.07, 7), rock, leg, [0, -legLen + 0.03, 0.02]);
    if (stage >= 2) for (const c of [-1, 0, 1]) k.mesh(cone(0.03, 0.12, 4), crystal, leg, [c * lr * 0.8, -legLen + 0.04, lr * 1.5], undefined, [Math.PI / 2, 0, 0]);
    legs.push(leg);
  }
  const mouthZ = [0.95, 1.3, 1.75][stage - 1]!;
  return {
    species: (['gravelo', 'boulderax', 'tectonyx'] as const)[stage - 1]!, root, body, height: [1.0, 1.35, 2.1][stage - 1]!, baseY: top + legLen, mouth: new THREE.Vector3(0, 0.1, mouthZ), materials,
    size: [1, 1.1, 1.2][stage - 1]!, legs, head, wings: [],
    animate(time, _dt, energy, run = 0) {
      head.rotation.x = Math.sin(time * 0.7) * 0.05 + energy * 0.3;
      head.rotation.y = Math.sin(time * 0.45) * 0.1;
      legs.forEach((l, i) => { l.rotation.x = run > 0 ? Math.sin(time * 14 + (i % 2) * Math.PI + (i < 2 ? 0 : 1.2)) * 0.6 * run : Math.sin(time * 1.5 + i) * 0.02; });
      crystal.emissiveIntensity = 1.0 + energy * 2.2 + Math.sin(time * 2) * 0.2;
    },
  };
}

// ---------------------------------------------------------------- Pipwing: chick → hawk → storm eagle

/** A wing of overlapping feathers fanning backward from the shoulder along +x (the pivot flaps it). */
function featherWing(k: Kit, mat: Mat, tip: Mat, n: number, len: number, w: number, spread: number): THREE.Group {
  const g = new THREE.Group();
  k.mesh(new THREE.BoxGeometry(len * 0.92, 0.03, w * 1.1), mat, g, [len * 0.46, 0.012, 0]);
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    const th = t * spread;
    const L = len * (1 - t * 0.35);
    k.mesh(new THREE.BoxGeometry(L, 0.012, w), i > n - 3 ? tip : mat, g, [Math.cos(th) * L * 0.5, 0, -Math.sin(th) * L * 0.5 - w * 0.3 * i * 0.3], undefined, [0, th, 0]);
  }
  return g;
}

// Stage 1 Pipwing: a round yellow chick with stubby wings. Stage 2 Galehawk: a sleek hawk with a hooked beak,
// swept wings and a tail fan. Stage 3 Zephyrion: a long storm eagle with two pairs of wings, a feather crest,
// ribbon tail streamers and wind rings.
export function pipwing(stage: number): CreatureModel {
  const materials: Mat[] = [];
  const k = kit(materials);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const main = k.mat(['#ffd84a', '#7b5a3c', '#e9f4ff'][stage - 1]!, { roughness: 0.9, flatShading: stage > 1 });
  const alt = k.mat(['#fff2a8', '#f1e6d2', '#3fb6d6'][stage - 1]!, { roughness: 0.9, flatShading: stage > 1 });
  const dark = k.mat(['#e89a2c', '#3a2c20', '#1f6f9c'][stage - 1]!, { roughness: 0.8, flatShading: stage > 1 });
  const beakM = k.mat(stage === 3 ? '#ffd84a' : '#f0922a', { roughness: 0.5 });
  const glow = k.mat('#bfefff', { emissive: '#7fe0ff', emissiveIntensity: 1.6, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  const head = new THREE.Group();
  body.add(head);
  const rings: THREE.Mesh[] = [];

  if (stage === 1) {
    k.mesh(new THREE.SphereGeometry(0.34, 16, 12), main, body, [0, 0, -0.02], [1, 0.95, 1.05]);
    k.mesh(new THREE.SphereGeometry(0.26, 12, 10), alt, body, [0, -0.08, 0.1], [1, 0.9, 0.9]);
    head.position.set(0, 0.28, 0.2);
    k.mesh(new THREE.SphereGeometry(0.22, 14, 10), main, head);
    k.mesh(cone(0.06, 0.14, 5), beakM, head, [0, -0.03, 0.22], undefined, [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 3; i++) k.mesh(cone(0.025, 0.12, 4), main, head, [(i - 1) * 0.05, 0.22, -0.02], undefined, [-0.2, 0, (i - 1) * -0.4]);
    eyes(k, head, 0.1, 0.05, 0.15, 0.05, '#2a1a00');
    for (let i = 0; i < 3; i++) k.mesh(cone(0.04, 0.18, 4), dark, body, [(i - 1) * 0.07, 0.0, -0.38], undefined, [-Math.PI / 2 - 0.3, 0, (i - 1) * 0.3]);
  } else if (stage === 2) {
    k.mesh(new THREE.SphereGeometry(0.3, 14, 10), main, body, [0, 0, -0.1], [0.78, 0.75, 1.75]);
    k.mesh(new THREE.SphereGeometry(0.24, 12, 10), alt, body, [0, -0.1, 0.12], [0.8, 0.8, 1.1]);
    head.position.set(0, 0.12, 0.5);
    k.mesh(new THREE.SphereGeometry(0.17, 14, 10), main, head, [0, 0, 0], [0.9, 0.95, 1.1]);
    k.mesh(new THREE.BoxGeometry(0.3, 0.04, 0.16), dark, head, [0, 0.1, 0.1], undefined, [0.25, 0, 0]);
    k.mesh(cone(0.07, 0.2, 5), beakM, head, [0, -0.04, 0.22], [0.8, 1, 1], [Math.PI / 2 + 0.25, 0, 0]);
    eyes(k, head, 0.09, 0.04, 0.12, 0.04, '#000', '#ffe04a');
    for (let i = 0; i < 5; i++) k.mesh(new THREE.BoxGeometry(0.07, 0.012, 0.5 - Math.abs(i - 2) * 0.05), i % 2 ? alt : dark, body, [(i - 2) * 0.08, 0, -0.78], undefined, [0, (i - 2) * 0.22, 0]);
    for (const s of [-1, 1]) for (const c of [-1, 0, 1]) k.mesh(cone(0.015, 0.1, 4), dark, body, [s * 0.1 + c * 0.015, -0.34, 0.1 + c * 0.04], undefined, [Math.PI, 0, 0]);
    for (const s of [-1, 1]) k.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 5), beakM, body, [s * 0.1, -0.26, 0.1]);
  } else {
    k.mesh(new THREE.SphereGeometry(0.3, 14, 10), main, body, [0, 0, -0.2], [0.72, 0.7, 2.1]);
    k.mesh(new THREE.SphereGeometry(0.22, 12, 10), alt, body, [0, -0.05, 0.2], [0.7, 0.7, 1.4]);
    head.position.set(0, 0.14, 0.72);
    k.mesh(new THREE.SphereGeometry(0.17, 14, 10), main, head, [0, 0, 0], [0.85, 0.9, 1.2]);
    k.mesh(cone(0.07, 0.26, 5), beakM, head, [0, -0.04, 0.26], [0.7, 1, 1], [Math.PI / 2 + 0.2, 0, 0]);
    eyes(k, head, 0.09, 0.05, 0.13, 0.04, '#000', '#7fe8ff');
    for (let i = 0; i < 5; i++) k.mesh(cone(0.03, 0.28 - Math.abs(i - 2) * 0.05, 4), alt, head, [(i - 2) * 0.06, 0.2, -0.1], undefined, [-0.7, 0, (i - 2) * -0.25]);
    // Ribbon tail streamers.
    for (const s of [-1, 0, 1]) k.mesh(new THREE.BoxGeometry(0.05, 0.012, 1.5), s ? dark : alt, body, [s * 0.1, 0, -1.2], undefined, [0, s * 0.12, 0]);
    k.mesh(new THREE.BoxGeometry(0.2, 0.012, 0.5), dark, body, [0, 0, -0.9]);
    for (let i = 0; i < 2; i++) {
      const r = k.mesh(new THREE.TorusGeometry(0.55 + i * 0.25, 0.02, 6, 28), glow, body, [0, 0, -0.1 - i * 0.5]);
      rings.push(r);
    }
  }
  // Wings on pivots.
  const pivots: THREE.Group[] = [];
  const sets = stage === 1 ? [{ n: 3, len: 0.34, w: 0.2, z: 0.05, sp: 0.5, sc: 1 }]
    : stage === 2 ? [{ n: 6, len: 0.85, w: 0.17, z: 0.1, sp: 0.9, sc: 1 }]
      : [{ n: 8, len: 1.2, w: 0.18, z: 0.25, sp: 0.8, sc: 1 }, { n: 6, len: 0.85, w: 0.16, z: -0.35, sp: 0.8, sc: 0.8 }];
  for (const s of [-1, 1]) for (const [idx, st] of sets.entries()) {
    const pv = new THREE.Group();
    pv.position.set(s * 0.18, 0.1, st.z);
    body.add(pv);
    const holder = featherWing(k, main, stage === 3 ? alt : dark, st.n, st.len, st.w, st.sp);
    holder.scale.set(s * st.sc, 1, st.sc);
    pv.add(holder);
    pv.userData.s = s;
    pv.userData.phase = idx * 0.6;
    pivots.push(pv);
  }
  const size = [1, 1.1, 1.2][stage - 1]!;
  return {
    species: (['pipwing', 'galehawk', 'zephyrion'] as const)[stage - 1]!, root, body, height: [1.2, 1.6, 2.0][stage - 1]!, baseY: [0.5, 0.95, 1.1][stage - 1]!,
    mouth: new THREE.Vector3(0, head.position.y, head.position.z + 0.3), materials, size, legs: [], head, wings: pivots,
    animate(time, _dt, energy, run = 0) {
      const speed = (stage === 1 ? 16 : 9) + energy * 12 + run * 14;
      for (const pv of pivots) pv.rotation.z = (pv.userData.s as number) * (0.25 + Math.sin(time * speed + (pv.userData.phase as number)) * (stage === 1 ? 0.8 : 0.55));
      head.rotation.x = Math.sin(time * 1.1) * 0.05 + energy * 0.2;
      rings.forEach((r, i) => { r.rotation.z = time * (1.2 + i * 0.6); r.scale.setScalar(1 + Math.sin(time * 2 + i) * 0.05); });
      glow.emissiveIntensity = 1.4 + energy * 2;
    },
  };
}

// ---------------------------------------------------------------- Wispurr: gem kitten → floating cat mage → star lynx

/** A tail made of a chain of spheres that sways. */
function tail(k: Kit, parent: THREE.Object3D, mat: Mat, tipMat: Mat, n: number, r0: number, step: number): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  for (let i = 0; i < n; i++) out.push(k.mesh(new THREE.SphereGeometry(r0 * (1 - i * 0.09), 8, 6), i === n - 1 ? tipMat : mat, parent, [0, 0, -i * step]));
  return out;
}

// Stage 1 Wispurr: a small lavender kitten with a pink gem on its brow. Stage 2 Mystiline: a taller indigo cat on
// long legs with two tails, a ruff and three floating orbs. Stage 3 Astralynx: a floating star lynx with tufted ears,
// leaf-shaped ear fans, ribbon tails and two spinning halo rings.
export function wispurr(stage: number): CreatureModel {
  const materials: Mat[] = [];
  const k = kit(materials);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const fur = k.mat(['#b9a3e8', '#5f4cc0', '#4a52c4'][stage - 1]!, { roughness: 0.9, flatShading: stage === 3 });
  const light = k.mat(['#f6eefc', '#cdb8ff', '#b6c2ff'][stage - 1]!, { roughness: 0.9 });
  const glowC = ['#ff7ac8', '#ff5ab0', '#8ffcff'][stage - 1]!;
  const gem = k.mat(glowC, { emissive: glowC, emissiveIntensity: 1.8, flatShading: true });
  const inner = k.mat('#ffc4e6', { emissive: '#ff7ac8', emissiveIntensity: 0.5 });
  const head = new THREE.Group();
  body.add(head);
  const legs: THREE.Object3D[] = [];
  const tails: THREE.Mesh[][] = [];
  const orbs: THREE.Mesh[] = [];
  const rings: THREE.Mesh[] = [];
  const legLen = [0.28, 0.52, 0][stage - 1]!;

  k.mesh(new THREE.SphereGeometry(0.4, 16, 12), fur, body, [0, 0, -0.05], [[0.8, 0.75, 1.1], [0.7, 0.85, 1.25], [0.72, 0.8, 1.6]][stage - 1] as [number, number, number]);
  k.mesh(new THREE.SphereGeometry(0.3, 12, 10), light, body, [0, -0.08, 0.15], [0.7, 0.7, 0.9]);
  head.position.set(0, [0.22, 0.38, 0.35][stage - 1]!, [0.45, 0.55, 0.85][stage - 1]!);
  k.mesh(new THREE.SphereGeometry(0.24, 16, 12), fur, head, [0, 0, 0], [1.05, 0.95, 1]);
  k.mesh(new THREE.SphereGeometry(0.1, 10, 8), light, head, [0, -0.08, 0.17], [1.1, 0.8, 0.9]);
  k.mesh(new THREE.SphereGeometry(0.025, 6, 6), inner, head, [0, -0.04, 0.26]);
  eyes(k, head, 0.11, 0.04, 0.17, 0.055, stage === 3 ? '#000' : '#331a55', stage === 3 ? '#8ffcff' : undefined);
  const gemSize = [0.06, 0.08, 0.1][stage - 1]!;
  k.mesh(new THREE.OctahedronGeometry(gemSize, 0), gem, head, [0, 0.16, 0.18], [1, 1.4, 0.8]);
  for (const s of [-1, 1]) {
    const ear = stage === 3 ? 0.34 : stage === 2 ? 0.26 : 0.2;
    k.mesh(cone(0.09, ear, 4), fur, head, [s * 0.15, 0.2, -0.02], undefined, [0, 0, -s * 0.35]);
    k.mesh(cone(0.05, ear * 0.7, 4), inner, head, [s * 0.15, 0.19, 0.01], undefined, [0, 0, -s * 0.35]);
    for (const w of [-1, 1]) k.mesh(new THREE.BoxGeometry(0.2, 0.004, 0.012), light, head, [s * 0.2, -0.05 + w * 0.025, 0.2], undefined, [0, 0, s * (0.2 + w * 0.15)]);
    if (stage === 3) {
      // Tuft on the ear tip and a leaf-shaped fan sweeping out sideways.
      k.mesh(cone(0.03, 0.2, 4), light, head, [s * 0.22, 0.43, -0.02], undefined, [0, 0, -s * 0.3]);
      const fan = k.mesh(new THREE.SphereGeometry(0.2, 10, 8), gem, head, [s * 0.4, 0.05, -0.08], [1.5, 0.05, 0.7], [0, 0, s * 0.3]);
      fan.material = k.mat('#8ffcff', { emissive: '#4fe0ff', emissiveIntensity: 0.9, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    }
  }
  if (stage === 1) {
    for (const [x, z] of [[0.17, 0.28], [-0.17, 0.28], [0.17, -0.32], [-0.17, -0.32]] as const) {
      const leg = new THREE.Group();
      leg.position.set(x, -0.2, z);
      body.add(leg);
      k.mesh(new THREE.CylinderGeometry(0.06, 0.055, legLen, 7), fur, leg, [0, -legLen / 2, 0]);
      k.mesh(new THREE.SphereGeometry(0.075, 8, 6), light, leg, [0, -legLen, 0.02], [1, 0.7, 1.2]);
      legs.push(leg);
    }
    const g = new THREE.Group();
    g.position.set(0, 0.08, -0.5);
    g.rotation.x = -0.9;
    body.add(g);
    tails.push(tail(k, g, fur, gem, 7, 0.07, 0.1));
  } else if (stage === 2) {
    for (const [x, z] of [[0.18, 0.35], [-0.18, 0.35], [0.18, -0.4], [-0.18, -0.4]] as const) {
      const leg = new THREE.Group();
      leg.position.set(x, -0.28, z);
      body.add(leg);
      k.mesh(new THREE.CylinderGeometry(0.06, 0.05, legLen, 7), fur, leg, [0, -legLen / 2, 0]);
      k.mesh(new THREE.SphereGeometry(0.075, 8, 6), light, leg, [0, -legLen, 0.02], [1, 0.7, 1.2]);
      legs.push(leg);
    }
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(s * 0.06, 0.1, -0.6);
      g.rotation.set(-0.5, s * 0.5, 0);
      body.add(g);
      tails.push(tail(k, g, fur, gem, 8, 0.075, 0.12));
    }
    for (let i = 0; i < 5; i++) k.mesh(cone(0.06, 0.2, 4), light, body, [(i - 2) * 0.09, 0.0, 0.62], undefined, [Math.PI + 0.3, 0, (i - 2) * 0.25]);
    const orbM = k.mat('#ffd6f2', { emissive: '#ff7ac8', emissiveIntensity: 2.2 });
    for (let i = 0; i < 3; i++) orbs.push(k.mesh(new THREE.SphereGeometry(0.07, 10, 8), orbM, body, [0, 0, 0]));
  } else {
    // Tucked paws under a floating body, ribbon tails, mane of light spikes, two halo rings.
    for (const s of [-1, 1]) for (const z of [0.4, -0.3]) k.mesh(new THREE.SphereGeometry(0.09, 8, 6), light, body, [s * 0.2, -0.35, z], [1, 0.7, 1.3]);
    for (const [i, s] of [-1, 0, 1].entries()) {
      const g = new THREE.Group();
      g.position.set(s * 0.1, 0.05, -0.8);
      g.rotation.set(-0.3 - i * 0.05, s * 0.4, 0);
      body.add(g);
      tails.push(tail(k, g, fur, gem, 9, 0.07, 0.14));
    }
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i / 8) * Math.PI;
      k.mesh(cone(0.05, 0.28, 4), light, body, [Math.cos(a) * 0.3, 0.25 + Math.sin(a) * 0.2, 0.55], undefined, [0.5, 0, -Math.cos(a) * 0.8]);
    }
    const starM = k.mat('#ffffff', { emissive: '#bfeaff', emissiveIntensity: 2 });
    for (let i = 0; i < 10; i++) k.mesh(new THREE.SphereGeometry(0.025, 5, 4), starM, body, [Math.sin(i * 2.4) * 0.28, 0.12 + Math.cos(i * 1.7) * 0.18, 0.7 - i * 0.16]);
    const haloM = k.mat('#8ffcff', { emissive: '#4fe0ff', emissiveIntensity: 1.6, transparent: true, opacity: 0.7 });
    for (let i = 0; i < 2; i++) rings.push(k.mesh(new THREE.TorusGeometry(0.85 - i * 0.2, 0.025, 6, 40), haloM, body, [0, 0.25, -0.5 - i * 0.12]));
    const orbM = k.mat('#ffffff', { emissive: '#8ffcff', emissiveIntensity: 2.4 });
    for (let i = 0; i < 3; i++) orbs.push(k.mesh(new THREE.SphereGeometry(0.06, 8, 6), orbM, body, [0, 0, 0]));
  }
  const legTop = [0.2, 0.28, 0][stage - 1]!;
  return {
    species: (['wispurr', 'mystiline', 'astralynx'] as const)[stage - 1]!, root, body, height: [1.0, 1.5, 1.9][stage - 1]!, baseY: stage === 3 ? 1.0 : legTop + legLen,
    mouth: new THREE.Vector3(0, head.position.y, head.position.z + 0.3), materials, size: [1, 1.1, 1.2][stage - 1]!, legs, head, wings: [],
    animate(time, _dt, energy, run = 0) {
      head.rotation.x = Math.sin(time * 0.9) * 0.05 + energy * 0.25;
      head.rotation.z = Math.sin(time * 0.6) * 0.06;
      legs.forEach((l, i) => { l.rotation.x = run > 0 ? Math.sin(time * 16 + (i % 2) * Math.PI + (i < 2 ? 0 : 1)) * 0.65 * run : Math.sin(time * 2 + i) * 0.02; });
      tails.forEach((t, ti) => t.forEach((m, i) => { m.position.x = Math.sin(time * 2.2 + i * 0.55 + ti) * 0.05 * i; m.position.y = Math.cos(time * 1.7 + i * 0.5 + ti) * 0.03 * i; }));
      orbs.forEach((o, i) => {
        const a = time * (1.4 + energy * 3) + (i * Math.PI * 2) / 3;
        o.position.set(Math.cos(a) * 0.65, 0.5 + Math.sin(a * 2) * 0.12, Math.sin(a) * 0.65);
      });
      rings.forEach((r, i) => { r.rotation.z = time * (0.8 + i * 0.5) * (i ? -1 : 1); });
      gem.emissiveIntensity = 1.5 + energy * 2.5 + Math.sin(time * 3) * 0.2;
    },
  };
}
