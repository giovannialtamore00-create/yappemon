// Batch C creatures: Cogling (Steel), Flurrbit (Ice). Every model faces +z.

import * as THREE from 'three';
import { eyes, kit, type CreatureModel, type Mat } from './creature-kit';

const cone = (r: number, h: number, seg = 5) => new THREE.ConeGeometry(r, h, seg);
const sph = (r: number, w = 12, h = 9) => new THREE.SphereGeometry(r, w, h);
const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
const cyl = (rt: number, rb: number, h: number, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg);

// ---------------------------------------------------------------- Cogling: clockwork critter → gear hound → siege walker

// Stage 1 Cogling: a round steel ball-bot with one big lens eye, a cog on its back and four stubby legs. Stage 2 Gearhound:
// an angular robot dog with plated flanks, antenna ears and spinning shoulder cogs. Stage 3 Mechadon: a huge walking
// fortress with armour plates, a back cannon, smoke stacks and a glowing furnace core.
export function cogling(stage: number): CreatureModel {
  const materials: Mat[] = [];
  const k = kit(materials);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const steel = k.mat(['#aeb8c4', '#8a97a8', '#5f6b7a'][stage - 1]!, { roughness: 0.45, metalness: 0.2, flatShading: stage > 1 });
  const plate = k.mat(['#d36a2a', '#c4562a', '#9a3a22'][stage - 1]!, { roughness: 0.55, metalness: 0.15, flatShading: true });
  const dark = k.mat('#20252d', { roughness: 0.6, metalness: 0.15 });
  const glowC = ['#6ee0ff', '#ffd23a', '#ff6a1a'][stage - 1]!;
  const glow = k.mat(glowC, { emissive: glowC, emissiveIntensity: 1.8 });
  const head = new THREE.Group();
  body.add(head);
  const legs: THREE.Object3D[] = [];
  const cogs: THREE.Object3D[] = [];
  const bs = [1, 1.15, 1.6][stage - 1]!;

  const cog = (r: number, parent: THREE.Object3D, pos: [number, number, number], rot: [number, number, number], m: Mat) => {
    const g = new THREE.Group();
    g.position.set(...pos);
    g.rotation.set(...rot);
    parent.add(g);
    const spin = new THREE.Group();
    g.add(spin);
    k.mesh(cyl(r, r, r * 0.35, 12), m, spin, undefined, undefined, [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.mesh(box(r * 0.4, r * 0.4, r * 0.35), m, spin, [Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05, 0], undefined, [0, 0, a]);
    }
    k.mesh(cyl(r * 0.3, r * 0.3, r * 0.45, 8), dark, spin, undefined, undefined, [Math.PI / 2, 0, 0]);
    cogs.push(spin);
  };

  if (stage === 1) {
    k.mesh(sph(0.4, 16, 12), steel, body, [0, 0, 0], [1, 0.9, 1.05]);
    k.mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 18), plate, body, [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    head.position.set(0, 0.1, 0.34);
    k.mesh(sph(0.26, 14, 10), steel, head, [0, 0, 0.03], [1.1, 0.9, 1]);
    k.mesh(sph(0.13, 12, 10), glow, head, [0, 0.0, 0.2]);
    k.mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 14), dark, head, [0, 0.0, 0.2]);
    k.mesh(cyl(0.012, 0.012, 0.22, 5), dark, head, [0.12, 0.28, 0]);
    k.mesh(sph(0.04, 8, 6), glow, head, [0.12, 0.4, 0]);
    cog(0.2, body, [0, 0.38, -0.2], [0.5, 0, 0], plate);
    for (const [x, z] of [[-0.24, 0.22], [0.24, 0.22], [-0.24, -0.2], [0.24, -0.2]] as const) {
      const leg = new THREE.Group();
      leg.position.set(x, -0.25, z);
      body.add(leg);
      k.mesh(cyl(0.06, 0.05, 0.22, 6), dark, leg, [0, -0.1, 0]);
      k.mesh(box(0.14, 0.05, 0.2), steel, leg, [0, -0.22, 0.03]);
      legs.push(leg);
    }
  } else if (stage === 2) {
    k.mesh(box(0.62, 0.5, 1.15), steel, body, [0, 0, -0.05]);
    k.mesh(box(0.66, 0.2, 0.9), plate, body, [0, 0.3, -0.1]);
    for (const s of [-1, 1]) k.mesh(box(0.05, 0.36, 0.8), plate, body, [s * 0.34, 0, -0.05]);
    k.mesh(cyl(0.14, 0.14, 0.4, 8), dark, body, [0, 0.12, -0.62], undefined, [Math.PI / 2, 0, 0]);
    k.mesh(sph(0.1, 10, 8), glow, body, [0, 0.12, -0.84]);
    head.position.set(0, 0.28, 0.62);
    k.mesh(box(0.42, 0.34, 0.46), steel, head, [0, 0, 0.1]);
    k.mesh(box(0.26, 0.18, 0.3), plate, head, [0, -0.08, 0.44]);
    for (const s of [-1, 1]) {
      k.mesh(box(0.1, 0.05, 0.05), glow, head, [s * 0.12, 0.07, 0.34]);
      k.mesh(cyl(0.012, 0.012, 0.42, 5), dark, head, [s * 0.18, 0.36, 0.0], undefined, [0, 0, -s * 0.25]);
      k.mesh(sph(0.04, 8, 6), glow, head, [s * 0.27, 0.56, 0.0]);
      k.mesh(cone(0.04, 0.12, 4), steel, head, [s * 0.1, -0.2, 0.5], undefined, [Math.PI, 0, 0]);
    }
    for (const s of [-1, 1]) cog(0.22, body, [s * 0.42, 0.18, 0.2], [0, Math.PI / 2, 0], plate);
    for (const [x, z] of [[-0.3, 0.42], [0.3, 0.42], [-0.3, -0.5], [0.3, -0.5]] as const) {
      const leg = new THREE.Group();
      leg.position.set(x, -0.2, z);
      body.add(leg);
      k.mesh(box(0.14, 0.4, 0.16), steel, leg, [0, -0.2, 0]);
      k.mesh(box(0.18, 0.08, 0.28), dark, leg, [0, -0.42, 0.05]);
      legs.push(leg);
    }
  } else {
    k.mesh(box(1.0, 0.7, 1.7), steel, body, [0, 0, -0.05]);
    k.mesh(box(1.08, 0.2, 1.4), plate, body, [0, 0.45, -0.1]);
    for (const s of [-1, 1]) {
      k.mesh(box(0.1, 0.6, 1.3), plate, body, [s * 0.55, 0, -0.05]);
      const stack = k.mesh(cyl(0.1, 0.13, 0.55, 8), dark, body, [s * 0.32, 0.8, -0.55]);
      stack.castShadow = true;
      k.mesh(sph(0.08, 8, 6), glow, body, [s * 0.32, 1.1, -0.55]);
    }
    k.mesh(cyl(0.2, 0.26, 0.5, 10), dark, body, [0, 0.82, 0.1], undefined, [Math.PI / 2 - 0.35, 0, 0]);
    k.mesh(cyl(0.12, 0.12, 0.5, 10), steel, body, [0, 1.0, 0.45], undefined, [Math.PI / 2 - 0.35, 0, 0]);
    k.mesh(sph(0.2, 12, 10), glow, body, [0, 0.1, 0.85], [1, 1.1, 0.5]);
    head.position.set(0, 0.35, 1.0);
    k.mesh(box(0.62, 0.5, 0.6), steel, head, [0, 0, 0.1]);
    k.mesh(box(0.7, 0.14, 0.64), plate, head, [0, 0.3, 0.08]);
    for (const s of [-1, 1]) {
      k.mesh(box(0.18, 0.08, 0.06), glow, head, [s * 0.17, 0.1, 0.42]);
      k.mesh(cone(0.07, 0.3, 4), plate, head, [s * 0.3, 0.46, 0.0], undefined, [0, 0, -s * 0.3]);
      k.mesh(box(0.08, 0.18, 0.08), steel, head, [s * 0.18, -0.3, 0.38]);
    }
    for (const s of [-1, 1]) cog(0.34, body, [s * 0.62, 0.2, 0.3], [0, Math.PI / 2, 0], plate);
    for (const [x, z] of [[-0.46, 0.6], [0.46, 0.6], [-0.46, -0.7], [0.46, -0.7]] as const) {
      const leg = new THREE.Group();
      leg.position.set(x, -0.3, z);
      body.add(leg);
      k.mesh(box(0.3, 0.6, 0.3), steel, leg, [0, -0.3, 0]);
      k.mesh(box(0.38, 0.12, 0.5), dark, leg, [0, -0.62, 0.08]);
      legs.push(leg);
    }
  }
  const legL = [0.3, 0.55, 0.95][stage - 1]!;
  return {
    species: (['cogling', 'gearhound', 'mechadon'] as const)[stage - 1]!, root, body, height: [0.9, 1.2, 2.2][stage - 1]!, baseY: legL,
    mouth: new THREE.Vector3(0, head.position.y, head.position.z + 0.45 * bs), materials, size: [1, 1.05, 1.15][stage - 1]!, legs, head, wings: [],
    animate(time, _dt, energy, run = 0) {
      const breathe = 1 + Math.sin(time * 1.6) * 0.015;
      body.scale.set(1, breathe, 1);
      head.rotation.x = Math.sin(time * 0.9) * 0.05 + energy * 0.25;
      legs.forEach((l, i) => { l.rotation.x = run > 0 ? Math.sin(time * 12 + (i % 2) * 1.6) * 0.6 * run : Math.sin(time * 1.5 + i) * 0.015; });
      cogs.forEach((c, i) => { c.rotation.z = time * (0.6 + energy * 4 + run * 3) * (i % 2 ? -1 : 1); });
      glow.emissiveIntensity = 1.5 + Math.sin(time * 3) * 0.2 + energy * 2;
    },
  };
}

// ---------------------------------------------------------------- Flurrbit: snow bunny → ice stag → glacier mammoth

// Stage 1 Flurrbit: a fluffy white snow bunny with long blue-tipped ears, a cold-blue scarf and a snowflake charm. Stage 2
// Hailstag: a slender pale-blue stag with crystal antlers and a frosty mane. Stage 3 Glaciarch: a towering glacier beast
// with a shaggy icy coat, two curved tusks, a spine of ice crystals and drifting snowflakes.
export function flurrbit(stage: number): CreatureModel {
  const materials: Mat[] = [];
  const k = kit(materials);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const fur = k.mat(['#f4f9ff', '#cfe6f5', '#a9cbe0'][stage - 1]!, { roughness: stage === 1 ? 0.95 : 0.7, flatShading: stage > 1 });
  const under = k.mat(['#dbeaf7', '#f2fbff', '#e6f6ff'][stage - 1]!, { roughness: 0.9, flatShading: stage > 1 });
  const ice = k.mat(['#7fd0ff', '#6fd8ff', '#8fe6ff'][stage - 1]!, { roughness: 0.1, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.85, emissive: '#2a9ee0', emissiveIntensity: 0.45 });
  const dark = k.mat('#27506e', { roughness: 0.8 });
  const head = new THREE.Group();
  body.add(head);
  const legs: THREE.Object3D[] = [];
  const flakes: THREE.Mesh[] = [];
  const ears: THREE.Object3D[] = [];
  const bs = [1, 1.2, 1.7][stage - 1]!;

  if (stage === 1) {
    k.mesh(sph(0.4, 16, 12), fur, body, [0, 0, 0], [1, 0.95, 1.1]);
    k.mesh(sph(0.28, 12, 10), under, body, [0, -0.08, 0.16], [1, 0.85, 0.9]);
    k.mesh(sph(0.14, 10, 8), fur, body, [0, 0.0, -0.46]);
    head.position.set(0, 0.28, 0.3);
    k.mesh(sph(0.27, 14, 12), fur, head, [0, 0, 0.04]);
    eyes(k, head, 0.1, 0.04, 0.22, 0.055);
    k.mesh(sph(0.04, 8, 6), dark, head, [0, -0.04, 0.3]);
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.1, 0.22, -0.02);
      ear.rotation.z = -s * 0.2;
      head.add(ear);
      k.mesh(sph(0.07, 8, 6), fur, ear, [0, 0.22, 0], [0.8, 3.4, 0.5]);
      k.mesh(sph(0.05, 8, 6), ice, ear, [0, 0.43, 0], [0.8, 1.6, 0.5]);
      ears.push(ear);
    }
    k.mesh(new THREE.TorusGeometry(0.26, 0.06, 8, 16), ice, body, [0, 0.32, 0.3], undefined, [Math.PI / 2 - 0.3, 0, 0]);
    for (const [x, z, r] of [[-0.2, 0.28, 0.1], [0.2, 0.28, 0.1], [-0.22, -0.2, 0.12], [0.22, -0.2, 0.12]] as const) {
      const leg = new THREE.Group();
      leg.position.set(x, -0.28, z);
      body.add(leg);
      k.mesh(sph(r, 8, 6), fur, leg, [0, -0.04, 0.02], [1, 1.2, 1.3]);
      legs.push(leg);
    }
  } else if (stage === 2) {
    k.mesh(sph(0.42, 14, 10), fur, body, [0, 0, -0.1], [0.85, 0.85, 1.7]);
    k.mesh(sph(0.3, 12, 10), under, body, [0, -0.1, 0.2], [0.8, 0.8, 1.2]);
    k.mesh(sph(0.3, 10, 8), under, body, [0, 0.1, 0.62], [0.7, 1.0, 0.8]);
    k.mesh(cone(0.1, 0.28, 5), fur, body, [0, 0.12, -0.78], undefined, [-1.9, 0, 0]);
    head.position.set(0, 0.62, 0.8);
    k.mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.4, 7), fur, body, [0, 0.4, 0.66], undefined, [0.4, 0, 0]);
    k.mesh(sph(0.2, 12, 10), fur, head, [0, 0, 0.04], [0.9, 0.95, 1.2]);
    k.mesh(sph(0.1, 10, 8), under, head, [0, -0.06, 0.26], [1, 0.8, 1]);
    k.mesh(sph(0.04, 8, 6), dark, head, [0, -0.04, 0.35]);
    eyes(k, head, 0.1, 0.06, 0.16, 0.045);
    for (const s of [-1, 1]) {
      const ear = k.mesh(cone(0.06, 0.24, 4), fur, head, [s * 0.2, 0.12, -0.05], undefined, [0, 0, -s * 1.1]);
      ears.push(ear);
      const horn = new THREE.Group();
      horn.position.set(s * 0.1, 0.18, -0.05);
      head.add(horn);
      k.mesh(cone(0.04, 0.5, 4), ice, horn, [s * 0.08, 0.22, -0.06], undefined, [-0.3, 0, -s * 0.35]);
      for (let i = 0; i < 3; i++) k.mesh(cone(0.025, 0.2 + i * 0.03, 4), ice, horn, [s * (0.18 + i * 0.07), 0.3 + i * 0.1, -0.1 - i * 0.04], undefined, [-0.2, 0, -s * (0.9 - i * 0.15)]);
    }
    for (let i = 0; i < 5; i++) k.mesh(cone(0.06, 0.2, 4), ice, body, [0, 0.38 - i * 0.02, 0.45 - i * 0.28], undefined, [0.2, 0, 0]);
    for (const [x, z] of [[-0.2, 0.55], [0.2, 0.55], [-0.2, -0.65], [0.2, -0.65]] as const) {
      const leg = new THREE.Group();
      leg.position.set(x, -0.25, z);
      body.add(leg);
      k.mesh(cyl(0.07, 0.04, 0.6, 6), fur, leg, [0, -0.3, 0]);
      k.mesh(cone(0.06, 0.1, 5), dark, leg, [0, -0.62, 0.02], undefined, [Math.PI, 0, 0]);
      legs.push(leg);
    }
  } else {
    k.mesh(sph(0.62, 16, 12), fur, body, [0, 0, -0.1], [1.0, 0.9, 1.5]);
    k.mesh(sph(0.5, 12, 10), under, body, [0, -0.2, 0.2], [1, 0.7, 1.1]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.mesh(cone(0.14, 0.4, 4), fur, body, [Math.sin(a) * 0.55, -0.45, Math.cos(a) * 0.8 - 0.1], [1, 1, 0.5], [Math.PI, a, 0]);
    }
    for (let i = 0; i < 5; i++) k.mesh(cone(0.13 - i * 0.012, 0.6 - i * 0.05, 5), ice, body, [(i % 2 ? 0.15 : -0.15), 0.62 - Math.abs(i - 2) * 0.05, 0.5 - i * 0.28], undefined, [0.15, 0, (i % 2 ? -0.3 : 0.3)]);
    head.position.set(0, 0.2, 0.95);
    k.mesh(sph(0.4, 14, 12), fur, head, [0, 0, 0.1], [1, 0.95, 1.05]);
    k.mesh(cyl(0.12, 0.18, 0.7, 8), fur, head, [0, -0.15, 0.5], undefined, [Math.PI / 2 - 0.5, 0, 0]);
    k.mesh(sph(0.1, 8, 6), under, head, [0, -0.45, 0.78]);
    eyes(k, head, 0.2, 0.1, 0.38, 0.06, '#0a3a5a', '#aaf0ff');
    for (const s of [-1, 1]) {
      k.mesh(sph(0.2, 10, 8), fur, head, [s * 0.4, 0.0, 0.0], [0.35, 1.0, 0.9]);
      const tusk = new THREE.Group();
      tusk.position.set(s * 0.2, -0.2, 0.55);
      head.add(tusk);
      for (let i = 0; i < 4; i++) k.mesh(cone(0.075 - i * 0.012, 0.34, 5), ice, tusk, [s * (i * 0.08), -0.1 + i * 0.07 + (i > 1 ? 0.04 : 0), 0.14 * i], undefined, [0.6 - i * 0.35, 0, s * 0.35]);
      ears.push(k.mesh(cone(0.1, 0.35, 4), ice, head, [s * 0.28, 0.4, -0.05], undefined, [0, 0, -s * 0.5]));
    }
    for (const [x, z] of [[-0.42, 0.72], [0.42, 0.72], [-0.42, -0.8], [0.42, -0.8]] as const) {
      const leg = new THREE.Group();
      leg.position.set(x, -0.35, z);
      body.add(leg);
      k.mesh(cyl(0.2, 0.17, 0.75, 8), fur, leg, [0, -0.38, 0]);
      k.mesh(cyl(0.2, 0.22, 0.12, 8), under, leg, [0, -0.78, 0.02]);
      legs.push(leg);
    }
    for (let i = 0; i < 7; i++) flakes.push(k.mesh(cone(0.07, 0.16, 4), ice, root, [0, 0, 0]));
  }
  const legL = [0.25, 0.65, 0.95][stage - 1]!;
  return {
    species: (['flurrbit', 'hailstag', 'glaciarch'] as const)[stage - 1]!, root, body, height: [0.9, 1.5, 2.3][stage - 1]!, baseY: legL,
    mouth: new THREE.Vector3(0, head.position.y, head.position.z + 0.4 * bs), materials, size: [1, 1.05, 1.15][stage - 1]!, legs, head, wings: [],
    animate(time, _dt, energy, run = 0) {
      const breathe = 1 + Math.sin(time * 1.6) * 0.025;
      body.scale.set(1, breathe, 1);
      head.rotation.x = Math.sin(time * 0.9) * 0.05 + energy * 0.25;
      legs.forEach((l, i) => { l.rotation.x = run > 0 ? Math.sin(time * 12 + (i % 2) * 1.6) * 0.7 * run : Math.sin(time * 1.5 + i) * 0.02; });
      ears.forEach((e, i) => { e.rotation.x = Math.sin(time * 2.2 + i) * 0.08 + energy * 0.2; });
      flakes.forEach((f, i) => {
        const a = time * 0.6 + i * 0.9;
        f.position.set(Math.cos(a) * 1.3, 1.0 + Math.sin(time * 1.1 + i * 1.7) * 0.5, Math.sin(a) * 1.3);
        f.rotation.set(time + i, time * 1.3, 0);
      });
      ice.emissiveIntensity = 0.4 + energy * 1.2;
    },
  };
}
