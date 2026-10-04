// Procedural creatures built from Three.js primitives. Every model faces +z.

import * as THREE from 'three';
import type { SpeciesId } from '../sim/types';

export interface CreatureModel {
  species: SpeciesId;
  /** Positioned/rotated by the view. */
  root: THREE.Group;
  /** Animated (bob, lean, squash) by the view. */
  body: THREE.Group;
  /** Approx. top of the creature, for HUD anchors. */
  height: number;
  /** Rest height of `body` above ground. */
  baseY: number;
  /** Where projectiles leave from, in body space. */
  mouth: THREE.Vector3;
  materials: THREE.MeshStandardMaterial[];
  /** Species-specific idle detail; `energy` 0..1 rises during windups. */
  animate(time: number, dt: number, energy: number): void;
}

type Mat = THREE.MeshStandardMaterial;

function kit(materials: Mat[]) {
  const mat = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}): Mat => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });
    materials.push(m);
    return m;
  };
  const mesh = (geo: THREE.BufferGeometry, m: Mat, parent: THREE.Object3D, pos?: [number, number, number], scale?: [number, number, number], rot?: [number, number, number]) => {
    const o = new THREE.Mesh(geo, m);
    if (pos) o.position.set(...pos);
    if (scale) o.scale.set(...scale);
    if (rot) o.rotation.set(...rot);
    o.castShadow = true;
    parent.add(o);
    return o;
  };
  return { mat, mesh };
}

function eyes(k: ReturnType<typeof kit>, parent: THREE.Object3D, x: number, y: number, z: number, r: number, iris = '#111', glow?: string) {
  const white = k.mat(glow ? glow : '#ffffff', glow ? { emissive: glow, emissiveIntensity: 1.6 } : { roughness: 0.2 });
  const pupil = k.mat(iris, { roughness: 0.1 });
  const shine = k.mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 });
  for (const s of [-1, 1]) {
    k.mesh(new THREE.SphereGeometry(r, 16, 12), white, parent, [s * x, y, z]);
    if (!glow) {
      k.mesh(new THREE.SphereGeometry(r * 0.55, 12, 10), pupil, parent, [s * x * 1.02, y, z + r * 0.62]);
      k.mesh(new THREE.SphereGeometry(r * 0.18, 8, 6), shine, parent, [s * x * 1.02 + r * 0.2, y + r * 0.25, z + r * 0.9]);
    }
  }
}

// ---------------------------------------------------------------- Cindrix: magma beetle

function cindrix(): CreatureModel {
  const materials: Mat[] = [];
  const k = kit(materials);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const rock = k.mat('#2e2623', { roughness: 0.85, flatShading: true });
  const shellM = k.mat('#3a2c27', { roughness: 0.6, flatShading: true });
  const lava = k.mat('#ffb347', { emissive: '#ff5a12', emissiveIntensity: 2.2, roughness: 0.4 });
  const legM = k.mat('#1f1917', { roughness: 0.8 });

  // Belly + glowing core peeking from below the shell.
  k.mesh(new THREE.SphereGeometry(0.42, 18, 12), rock, body, [0, 0, -0.05], [1, 0.55, 1.2]);
  k.mesh(new THREE.SphereGeometry(0.36, 16, 10), lava, body, [0, -0.06, -0.05], [1, 0.4, 1.12]);
  // Shell halves (elytra) with a glowing seam.
  for (const s of [-1, 1]) {
    const half = k.mesh(new THREE.SphereGeometry(0.46, 14, 10, 0, Math.PI), shellM, body, [s * 0.03, 0.06, -0.08], [0.98, 0.78, 1.28], [0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]);
    half.rotation.z = s * 0.06;
  }
  k.mesh(new THREE.BoxGeometry(0.05, 0.05, 1.05), lava, body, [0, 0.42, -0.08]);
  // Cracks on the shell.
  const cracks: [number, number, number, number, number][] = [
    [0.18, 0.33, 0.1, 0.5, 0.25], [-0.2, 0.32, -0.15, -0.6, 0.3], [0.24, 0.24, -0.35, 0.9, 0.22], [-0.22, 0.27, 0.22, -1.0, 0.2],
    [0.3, 0.12, 0.05, 1.3, 0.18], [-0.31, 0.1, -0.2, -1.2, 0.2],
  ];
  for (const [x, y, z, ry, len] of cracks) k.mesh(new THREE.BoxGeometry(0.035, 0.03, len), lava, body, [x, y, z], undefined, [0.3, ry, 0]);
  // Head, mandibles, horn.
  const head = new THREE.Group();
  head.position.set(0, -0.02, 0.5);
  body.add(head);
  k.mesh(new THREE.SphereGeometry(0.22, 16, 12), rock, head, [0, 0, 0], [1.1, 0.85, 1]);
  eyes(k, head, 0.11, 0.06, 0.15, 0.05, '#111', '#ffd34a');
  for (const s of [-1, 1]) k.mesh(new THREE.ConeGeometry(0.045, 0.22, 6), k.mat('#6b1d10', { roughness: 0.5 }), head, [s * 0.1, -0.06, 0.22], undefined, [Math.PI / 2, 0, s * 0.5]);
  k.mesh(new THREE.ConeGeometry(0.07, 0.3, 7), rock, head, [0, 0.2, 0.06], undefined, [0.5, 0, 0]);
  k.mesh(new THREE.SphereGeometry(0.04, 8, 6), lava, head, [0, 0.33, 0.13]);
  // Six legs.
  const legs: THREE.Group[] = [];
  for (const s of [-1, 1]) for (const z of [0.25, -0.05, -0.35]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.32, -0.08, z);
    body.add(leg);
    k.mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.3, 6), legM, leg, [s * 0.12, 0.02, 0], undefined, [0, 0, s * 1.2]);
    k.mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.32, 6), legM, leg, [s * 0.26, -0.15, 0], undefined, [0, 0, s * 0.25]);
    legs.push(leg);
  }
  return {
    species: 'cindrix', root, body, height: 0.95, baseY: 0.34, mouth: new THREE.Vector3(0, 0, 0.75), materials,
    animate(time, _dt, energy) {
      lava.emissiveIntensity = 1.8 + Math.sin(time * 3) * 0.4 + energy * 3;
      legs.forEach((l, i) => { l.rotation.x = Math.sin(time * 4 + i * 1.7) * 0.08; });
      head.rotation.y = Math.sin(time * 0.9) * 0.12;
    },
  };
}

// ---------------------------------------------------------------- Brinkle: pufferfish in a bubble

function brinkle(): CreatureModel {
  const materials: Mat[] = [];
  const k = kit(materials);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const fishG = new THREE.Group();
  body.add(fishG);
  const skin = k.mat('#3d9be9', { roughness: 0.45 });
  const belly = k.mat('#d6f1ff', { roughness: 0.5 });
  const spikeM = k.mat('#eef8ff', { roughness: 0.4 });
  const finM = k.mat('#7fd0ff', { roughness: 0.3, transparent: true, opacity: 0.9, side: THREE.DoubleSide });

  k.mesh(new THREE.SphereGeometry(0.4, 24, 18), skin, fishG);
  k.mesh(new THREE.SphereGeometry(0.33, 20, 14), belly, fishG, [0, -0.12, 0.08], [1, 0.75, 1]);
  // Spikes on a Fibonacci sphere (skip the face area).
  const spikes: THREE.Mesh[] = [];
  const n = 34;
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.39996;
    const dir = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    if (dir.z > 0.55 && Math.abs(dir.y) < 0.6) continue;
    const sp = k.mesh(new THREE.ConeGeometry(0.035, 0.14, 5), spikeM, fishG, [dir.x * 0.4, dir.y * 0.4, dir.z * 0.4]);
    sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    sp.userData.dir = dir;
    spikes.push(sp);
  }
  eyes(k, fishG, 0.17, 0.1, 0.3, 0.1);
  k.mesh(new THREE.TorusGeometry(0.045, 0.02, 8, 16), k.mat('#ff7aa8'), fishG, [0, -0.07, 0.4]);
  // Fins and tail.
  const finL = k.mesh(new THREE.ConeGeometry(0.12, 0.25, 3), finM, fishG, [-0.42, -0.02, 0.02], [1, 1, 0.25], [0, 0, Math.PI / 2]);
  const finR = k.mesh(new THREE.ConeGeometry(0.12, 0.25, 3), finM, fishG, [0.42, -0.02, 0.02], [1, 1, 0.25], [0, 0, -Math.PI / 2]);
  const tail = k.mesh(new THREE.ConeGeometry(0.18, 0.3, 4), finM, fishG, [0, 0.02, -0.5], [1, 1, 0.25], [-Math.PI / 2, 0, 0]);
  k.mesh(new THREE.ConeGeometry(0.1, 0.22, 3), finM, fishG, [0, 0.42, -0.05], [0.3, 1, 1]);
  // The water bubble it rides in.
  const bubbleM = k.mat('#cfeeff', { transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.1, depthWrite: false, emissive: '#2a6fa8', emissiveIntensity: 0.15 });
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 24), bubbleM);
  bubble.renderOrder = 2;
  body.add(bubble);
  const waterM = k.mat('#3a8fd8', { transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false });
  const water = new THREE.Mesh(new THREE.SphereGeometry(0.69, 28, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), waterM);
  water.renderOrder = 1;
  body.add(water);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.012, 6, 48), k.mat('#ffffff', { emissive: '#bfe8ff', emissiveIntensity: 0.5, transparent: true, opacity: 0.5 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.25;
  body.add(rim);
  return {
    species: 'brinkle', root, body, height: 1.85, baseY: 0.95, mouth: new THREE.Vector3(0, -0.07, 0.75), materials,
    animate(time, _dt, energy) {
      fishG.rotation.y = Math.sin(time * 0.7) * 0.25;
      fishG.rotation.z = Math.sin(time * 1.1) * 0.08;
      fishG.position.y = Math.sin(time * 1.9) * 0.04;
      finL.rotation.y = Math.sin(time * 8) * 0.5;
      finR.rotation.y = -Math.sin(time * 8) * 0.5;
      tail.rotation.y = Math.sin(time * 5) * 0.35;
      const puff = 1 + energy * 0.25 + Math.sin(time * 2.2) * 0.03;
      fishG.scale.setScalar(puff);
      for (const s of spikes) s.scale.setScalar(1 + energy * 0.8);
      bubble.scale.set(1 + Math.sin(time * 2.4) * 0.02, 1 - Math.sin(time * 2.4) * 0.02, 1 + Math.sin(time * 2.4) * 0.02);
      rim.rotation.z = time * 0.5;
    },
  };
}

// ---------------------------------------------------------------- Vinram: mossy ram

function vinram(): CreatureModel {
  const materials: Mat[] = [];
  const k = kit(materials);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const wool = k.mat('#d9cfb4', { roughness: 0.95, flatShading: true });
  const moss = k.mat('#4f8f3a', { roughness: 1, flatShading: true });
  const moss2 = k.mat('#6db04a', { roughness: 1, flatShading: true });
  const skin = k.mat('#5b4636', { roughness: 0.8 });
  const hoof = k.mat('#2a211b');
  const horn = k.mat('#cdb68c', { roughness: 0.5 });
  const vine = k.mat('#3f8f2e', { roughness: 0.7 });
  const leaf = k.mat('#7fd05a', { roughness: 0.6, side: THREE.DoubleSide });

  // Torso of woolly lumps.
  k.mesh(new THREE.SphereGeometry(0.5, 16, 12), wool, body, [0, 0, -0.05], [0.95, 0.78, 1.25]);
  const lumps: [number, number, number, number][] = [[0.25, 0.25, 0.25, 0.22], [-0.25, 0.25, 0.2, 0.22], [0, 0.33, -0.15, 0.25], [0.28, 0.15, -0.4, 0.2], [-0.28, 0.15, -0.38, 0.2], [0, 0.2, -0.55, 0.2]];
  for (const [x, y, z, r] of lumps) k.mesh(new THREE.IcosahedronGeometry(r, 1), wool, body, [x, y, z]);
  // Moss patches on the back.
  const mossBits: [number, number, number, number][] = [[0.08, 0.42, 0.05, 0.17], [-0.15, 0.4, -0.2, 0.15], [0.18, 0.36, -0.35, 0.13], [-0.05, 0.43, -0.45, 0.12], [0.2, 0.38, 0.2, 0.1], [-0.22, 0.36, 0.15, 0.11]];
  mossBits.forEach(([x, y, z, r], i) => k.mesh(new THREE.IcosahedronGeometry(r, 0), i % 2 ? moss : moss2, body, [x, y, z]));
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9;
    k.mesh(new THREE.ConeGeometry(0.05, 0.12, 3), leaf, body, [Math.sin(a) * 0.2, 0.52 + (i % 2) * 0.03, -0.2 + Math.cos(a) * 0.25], [1, 1, 0.3], [0.3, a, 0.4]);
  }
  // Legs.
  const legs: THREE.Object3D[] = [];
  for (const [x, z] of [[0.24, 0.32], [-0.24, 0.32], [0.24, -0.38], [-0.24, -0.38]] as const) {
    const leg = new THREE.Group();
    leg.position.set(x, -0.25, z);
    body.add(leg);
    k.mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.42, 8), skin, leg, [0, -0.15, 0]);
    k.mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.08, 8), hoof, leg, [0, -0.38, 0]);
    legs.push(leg);
  }
  // Head.
  const head = new THREE.Group();
  head.position.set(0, 0.22, 0.62);
  body.add(head);
  k.mesh(new THREE.SphereGeometry(0.2, 16, 12), skin, head, [0, 0, 0], [0.95, 0.95, 1.15]);
  k.mesh(new THREE.SphereGeometry(0.13, 12, 10), skin, head, [0, -0.08, 0.16], [1, 0.8, 1]);
  k.mesh(new THREE.IcosahedronGeometry(0.13, 1), wool, head, [0, 0.16, -0.02]);
  eyes(k, head, 0.12, 0.05, 0.13, 0.045, '#3a2208');
  for (const s of [-1, 1]) {
    k.mesh(new THREE.SphereGeometry(0.02, 6, 6), hoof, head, [s * 0.05, -0.1, 0.3]);
    k.mesh(new THREE.ConeGeometry(0.05, 0.14, 6), skin, head, [s * 0.2, 0.02, -0.05], [1, 1, 0.5], [0, 0, s * 1.4]);
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
  }
  k.mesh(new THREE.IcosahedronGeometry(0.09, 0), wool, body, [0, 0.12, -0.72]);
  return {
    species: 'vinram', root, body, height: 1.35, baseY: 0.62, mouth: new THREE.Vector3(0, 0.15, 0.9), materials,
    animate(time, _dt, energy) {
      head.rotation.x = Math.sin(time * 0.8) * 0.06 + energy * 0.35;
      head.rotation.y = Math.sin(time * 0.5) * 0.1;
      legs.forEach((l, i) => { l.rotation.x = Math.sin(time * 2 + i) * 0.03; });
    },
  };
}

// ---------------------------------------------------------------- Joltmoth: electric moth

function wingShape(w: number, h: number, back: boolean): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  if (!back) {
    s.bezierCurveTo(w * 0.3, h * 0.9, w * 0.9, h * 1.0, w, h * 0.55);
    s.bezierCurveTo(w * 1.05, h * 0.2, w * 0.6, -h * 0.15, 0, 0);
  } else {
    s.bezierCurveTo(w * 0.4, -h * 0.1, w * 0.95, -h * 0.4, w * 0.75, -h * 0.85);
    s.bezierCurveTo(w * 0.5, -h * 1.0, w * 0.15, -h * 0.5, 0, 0);
  }
  return s;
}

function joltmoth(): CreatureModel {
  const materials: Mat[] = [];
  const k = kit(materials);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const fur = k.mat('#3a3352', { roughness: 0.9 });
  const fluff = k.mat('#f4f1e6', { roughness: 1, flatShading: true });
  const stripe = k.mat('#ffd83a', { emissive: '#ffb800', emissiveIntensity: 0.6, roughness: 0.5 });
  const wingM = k.mat('#ffe66b', { emissive: '#ffd21a', emissiveIntensity: 1.1, transparent: true, opacity: 0.88, side: THREE.DoubleSide, roughness: 0.4 });
  const wingEdge = k.mat('#7a5cff', { emissive: '#7a5cff', emissiveIntensity: 1.2, side: THREE.DoubleSide });
  const spotM = k.mat('#2b2340', { emissive: '#39e6ff', emissiveIntensity: 0.9, side: THREE.DoubleSide });

  // Thorax, fluffy collar, abdomen with stripes.
  k.mesh(new THREE.SphereGeometry(0.2, 16, 12), fur, body, [0, 0, 0], [1, 1, 1.1]);
  k.mesh(new THREE.IcosahedronGeometry(0.19, 1), fluff, body, [0, 0.03, 0.12], [1.1, 0.9, 0.6]);
  const abdomen = new THREE.Group();
  abdomen.position.set(0, -0.05, -0.2);
  body.add(abdomen);
  for (let i = 0; i < 5; i++) {
    const r = 0.17 - i * 0.025;
    k.mesh(new THREE.SphereGeometry(r, 14, 10), i % 2 ? stripe : fur, abdomen, [0, -i * 0.02, -i * 0.11], [1, 0.95, 0.8]);
  }
  // Head with glowing compound eyes and feathery antennae.
  const head = new THREE.Group();
  head.position.set(0, 0.05, 0.27);
  body.add(head);
  k.mesh(new THREE.SphereGeometry(0.13, 14, 10), fur, head);
  eyes(k, head, 0.08, 0.03, 0.07, 0.065, '#000', '#39e6ff');
  const antennae: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(s * 0.05, 0.1, 0.05);
    a.rotation.set(-0.5, 0, s * -0.4);
    head.add(a);
    k.mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), fur, a, [0, 0.15, 0]);
    for (let j = 0; j < 5; j++) k.mesh(new THREE.BoxGeometry(0.1 - j * 0.012, 0.012, 0.01), stripe, a, [0, 0.1 + j * 0.045, 0]);
    antennae.push(a);
  }
  // Four wings on pivots.
  const pivots: THREE.Group[] = [];
  for (const s of [-1, 1]) for (const back of [false, true]) {
    const pv = new THREE.Group();
    pv.position.set(s * 0.12, 0.08, back ? -0.08 : 0.04);
    body.add(pv);
    const w = back ? 0.55 : 0.75;
    const h = back ? 0.5 : 0.62;
    const shape = wingShape(w, h, back);
    const g = new THREE.ShapeGeometry(shape, 16);
    const wing = new THREE.Mesh(g, wingM);
    wing.castShadow = true;
    const edge = new THREE.Mesh(new THREE.ShapeGeometry(shape, 16), wingEdge);
    edge.scale.setScalar(1.06);
    edge.position.z = -0.005;
    const spot = new THREE.Mesh(new THREE.CircleGeometry(back ? 0.08 : 0.1, 16), spotM);
    spot.position.set(w * 0.55, back ? -h * 0.45 : h * 0.5, 0.004);
    const holder = new THREE.Group();
    holder.add(edge, wing, spot);
    // Shape lies in XY; lay it flat (XZ) pointing outward on side s, front edge toward +z.
    holder.rotation.x = -Math.PI / 2;
    if (s < 0) holder.scale.x = -1;
    pv.add(holder);
    pv.userData.s = s;
    pv.userData.back = back;
    pivots.push(pv);
  }
  // Tiny legs.
  for (const s of [-1, 1]) for (const z of [0.05, -0.05]) k.mesh(new THREE.CylinderGeometry(0.01, 0.008, 0.18, 4), fur, body, [s * 0.1, -0.18, z], undefined, [0, 0, s * 0.4]);
  return {
    species: 'joltmoth', root, body, height: 1.7, baseY: 1.05, mouth: new THREE.Vector3(0, 0.05, 0.45), materials,
    animate(time, _dt, energy) {
      const speed = 11 + energy * 14;
      for (const pv of pivots) {
        const s = pv.userData.s as number;
        const phase = pv.userData.back ? 0.5 : 0;
        pv.rotation.z = s * (0.35 + Math.sin(time * speed + phase) * 0.6);
      }
      wingM.emissiveIntensity = 1.0 + energy * 2 + (Math.random() < 0.04 ? 1.5 : 0);
      antennae.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * (-0.4 + Math.sin(time * 3 + i) * 0.08); });
      abdomen.rotation.x = Math.sin(time * 2) * 0.08;
    },
  };
}

const BUILDERS: Record<SpeciesId, () => CreatureModel> = { cindrix, brinkle, vinram, joltmoth };

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
