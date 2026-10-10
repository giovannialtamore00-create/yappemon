// Pooled VFX: one additive particle system + a small set of reusable mesh effects
// (beams, lightning arcs, rings, eruptions, ground spikes, waves, leaves).

import * as THREE from 'three';
import { ELEMENT_COLOR } from '../i18n';
import { MOVES } from '../sim/data';
import type { MoveId } from '../sim/types';

export type FxKind = 'fire' | 'ember' | 'water' | 'splash' | 'grass' | 'leaf' | 'electric' | 'spark' | 'heal' | 'dust' | 'orb' | 'normal' | 'smoke' | 'static'
  | 'rock' | 'wind' | 'psychic' | 'shadow' | 'dragon' | 'poison' | 'metal' | 'ice';

export const ELEMENT_FX: Record<string, FxKind> = {
  fire: 'fire', water: 'water', grass: 'grass', electric: 'electric', normal: 'normal',
  rock: 'rock', ground: 'dust', flying: 'wind', psychic: 'psychic', ghost: 'shadow', dark: 'shadow', dragon: 'dragon', poison: 'poison', steel: 'metal', ice: 'ice',
};
export const CHARGE_FX: Record<string, FxKind> = {
  fire: 'ember', water: 'splash', grass: 'leaf', electric: 'static', normal: 'dust',
  rock: 'dust', ground: 'dust', flying: 'wind', psychic: 'psychic', ghost: 'shadow', dark: 'shadow', dragon: 'dragon', poison: 'poison', steel: 'metal', ice: 'ice',
};

interface FxStyle { colors: string[]; size: [number, number]; life: [number, number]; speed: [number, number]; gravity: number; drag: number; up: number }

const STYLES: Record<FxKind, FxStyle> = {
  fire: { colors: ['#ffdf6b', '#ff8a2a', '#ff4d12'], size: [0.18, 0.4], life: [0.35, 0.7], speed: [1, 3.5], gravity: -2.5, drag: 2.5, up: 1 },
  ember: { colors: ['#ffb347', '#ff6a1a'], size: [0.05, 0.1], life: [0.6, 1.4], speed: [0.3, 1.2], gravity: -1.2, drag: 1, up: 0.6 },
  water: { colors: ['#bfe8ff', '#5ab6ff', '#2a7fe0'], size: [0.12, 0.26], life: [0.3, 0.6], speed: [1.5, 4], gravity: 7, drag: 1.5, up: 0.8 },
  splash: { colors: ['#e6f6ff', '#7cc6ff'], size: [0.08, 0.18], life: [0.4, 0.8], speed: [2, 5], gravity: 9, drag: 0.8, up: 1.4 },
  grass: { colors: ['#9cff6b', '#4fcf3a', '#c8ff9a'], size: [0.1, 0.2], life: [0.4, 0.8], speed: [1, 3], gravity: 2, drag: 2, up: 0.5 },
  leaf: { colors: ['#7fd05a', '#3f9f2e'], size: [0.12, 0.2], life: [0.8, 1.4], speed: [1, 2.5], gravity: 1.2, drag: 2.5, up: 0.6 },
  electric: { colors: ['#ffffff', '#fff27a', '#7ae8ff'], size: [0.08, 0.2], life: [0.15, 0.35], speed: [2, 6], gravity: 0, drag: 4, up: 0 },
  spark: { colors: ['#ffffff', '#ffe9a8'], size: [0.06, 0.14], life: [0.15, 0.35], speed: [3, 7], gravity: 6, drag: 2, up: 0.5 },
  heal: { colors: ['#b9ffcf', '#7affb0', '#ffffff'], size: [0.08, 0.18], life: [0.8, 1.4], speed: [0.2, 0.6], gravity: -1.2, drag: 1, up: 1 },
  dust: { colors: ['#b8a888', '#8f8068'], size: [0.25, 0.5], life: [0.5, 1], speed: [0.5, 2], gravity: -0.3, drag: 3, up: 0.3 },
  orb: { colors: ['#ffffff', '#33e0ff', '#f2c14e'], size: [0.1, 0.25], life: [0.3, 0.7], speed: [2, 5], gravity: 0, drag: 3, up: 0 },
  normal: { colors: ['#ffffff', '#ffeecc'], size: [0.1, 0.22], life: [0.2, 0.4], speed: [2, 5], gravity: 2, drag: 3, up: 0.3 },
  smoke: { colors: ['#7a6f66', '#5a514c'], size: [0.35, 0.7], life: [0.8, 1.5], speed: [0.2, 0.8], gravity: -0.8, drag: 1.5, up: 1 },
  static: { colors: ['#c89bff', '#fff27a'], size: [0.05, 0.12], life: [0.1, 0.25], speed: [0.5, 2], gravity: 0, drag: 2, up: 0 },
  rock: { colors: ['#b8a06a', '#8a7650', '#d9c79a'], size: [0.1, 0.24], life: [0.4, 0.8], speed: [1.5, 4], gravity: 8, drag: 1, up: 1 },
  wind: { colors: ['#ffffff', '#dbe8ff', '#b4ccff'], size: [0.08, 0.2], life: [0.3, 0.6], speed: [2, 5], gravity: 0, drag: 2.5, up: 0.2 },
  psychic: { colors: ['#ff9fd2', '#c78bff', '#ffffff'], size: [0.08, 0.2], life: [0.4, 0.9], speed: [0.5, 2.5], gravity: -0.6, drag: 2, up: 0.5 },
  shadow: { colors: ['#2a1f3d', '#6b4fa8', '#9b7fe0'], size: [0.15, 0.35], life: [0.5, 1.1], speed: [0.4, 1.8], gravity: -0.5, drag: 1.8, up: 0.6 },
  dragon: { colors: ['#7a8bff', '#c9a8ff', '#ffffff'], size: [0.12, 0.28], life: [0.3, 0.7], speed: [1.5, 4], gravity: -1, drag: 2, up: 0.7 },
  poison: { colors: ['#d98cff', '#9b3fd0', '#5fe05f'], size: [0.1, 0.24], life: [0.5, 1], speed: [0.6, 2.2], gravity: 0.8, drag: 1.8, up: 0.5 },
  metal: { colors: ['#ffffff', '#c3d1dc', '#8da0b0'], size: [0.06, 0.14], life: [0.2, 0.45], speed: [2, 6], gravity: 7, drag: 1.5, up: 0.6 },
  ice: { colors: ['#ffffff', '#bff4ff', '#7fd8f0'], size: [0.08, 0.2], life: [0.4, 0.9], speed: [1, 3.5], gravity: 3, drag: 1.5, up: 0.6 },
};

const MAX = 5000;

class Particles {
  readonly points: THREE.Points;
  private pos = new Float32Array(MAX * 3);
  private col = new Float32Array(MAX * 3);
  private size = new Float32Array(MAX);
  private alpha = new Float32Array(MAX);
  private vel = new Float32Array(MAX * 3);
  private life = new Float32Array(MAX);
  private maxLife = new Float32Array(MAX);
  private baseSize = new Float32Array(MAX);
  private grav = new Float32Array(MAX);
  private drag = new Float32Array(MAX);
  private next = 0;
  private geo: THREE.BufferGeometry;

  constructor() {
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { scale: { value: 600 } },
      vertexShader: `attribute float size; attribute float alpha; varying vec3 vCol; varying float vA; uniform float scale;
        void main(){ vCol = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vCol; varying float vA;
        void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; float f = smoothstep(0.5, 0.0, r);
        gl_FragColor = vec4(vCol * (0.6 + f), vA * f); }`,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }

  setScale(h: number) {
    (this.points.material as THREE.ShaderMaterial).uniforms.scale!.value = h * 0.55;
  }

  emit(kind: FxKind, at: THREE.Vector3, count: number, spread = 0.15, dir?: THREE.Vector3, sizeMul = 1) {
    const st = STYLES[kind];
    const c = new THREE.Color();
    for (let n = 0; n < count; n++) {
      const i = this.next;
      this.next = (this.next + 1) % MAX;
      const i3 = i * 3;
      this.pos[i3] = at.x + (Math.random() - 0.5) * spread * 2;
      this.pos[i3 + 1] = at.y + (Math.random() - 0.5) * spread * 2;
      this.pos[i3 + 2] = at.z + (Math.random() - 0.5) * spread * 2;
      const sp = st.speed[0] + Math.random() * (st.speed[1] - st.speed[0]);
      let vx = Math.random() - 0.5, vy = Math.random() - 0.5 + st.up * 0.5, vz = Math.random() - 0.5;
      if (dir) { vx = vx * 0.5 + dir.x; vy = vy * 0.5 + dir.y; vz = vz * 0.5 + dir.z; }
      const l = Math.hypot(vx, vy, vz) || 1;
      this.vel[i3] = (vx / l) * sp;
      this.vel[i3 + 1] = (vy / l) * sp;
      this.vel[i3 + 2] = (vz / l) * sp;
      c.set(st.colors[Math.floor(Math.random() * st.colors.length)]!);
      this.col[i3] = c.r; this.col[i3 + 1] = c.g; this.col[i3 + 2] = c.b;
      this.maxLife[i] = this.life[i] = st.life[0] + Math.random() * (st.life[1] - st.life[0]);
      this.baseSize[i] = (st.size[0] + Math.random() * (st.size[1] - st.size[0])) * sizeMul;
      this.grav[i] = st.gravity;
      this.drag[i] = st.drag;
    }
  }

  update(dt: number) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i]! <= 0) { this.alpha[i] = 0; this.size[i] = 0; continue; }
      this.life[i]! -= dt;
      const i3 = i * 3;
      const d = Math.max(0, 1 - this.drag[i]! * dt);
      this.vel[i3]! *= d; this.vel[i3 + 1] = this.vel[i3 + 1]! * d - this.grav[i]! * dt; this.vel[i3 + 2]! *= d;
      this.pos[i3]! += this.vel[i3]! * dt; this.pos[i3 + 1]! += this.vel[i3 + 1]! * dt; this.pos[i3 + 2]! += this.vel[i3 + 2]! * dt;
      const t = Math.max(0, this.life[i]! / this.maxLife[i]!);
      this.alpha[i] = Math.min(1, t * 2);
      this.size[i] = this.baseSize[i]! * (0.4 + 0.6 * t);
    }
    for (const k of ['position', 'color', 'size', 'alpha']) (this.geo.getAttribute(k) as THREE.BufferAttribute).needsUpdate = true;
  }
}

/** A short-lived mesh effect. Return false from update to remove. */
interface Effect { obj: THREE.Object3D; t: number; dur: number; update(e: Effect, dt: number): void; dispose?(): void }

const additive = (color: string, opacity = 1) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

function jagged(from: THREE.Vector3, to: THREE.Vector3, segments: number, amp: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const dir = to.clone().sub(from);
  const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = from.clone().lerp(to, t);
    if (i > 0 && i < segments) {
      p.addScaledVector(side, (Math.random() - 0.5) * amp);
      p.y += (Math.random() - 0.5) * amp;
    }
    pts.push(p);
  }
  return pts;
}

export class Vfx {
  readonly particles = new Particles();
  private effects: Effect[] = [];
  private projectiles = new Map<number, { obj: THREE.Object3D; seen: boolean; kind: string; extra?: unknown }>();
  private spikeGeo = new THREE.ConeGeometry(0.16, 0.8, 5);
  private spikeMat = new THREE.MeshStandardMaterial({ color: '#5b8f2e', roughness: 0.6, flatShading: true });
  private leafGeo = new THREE.ConeGeometry(0.08, 0.22, 3);
  private leafMat = new THREE.MeshStandardMaterial({ color: '#6fd04a', emissive: '#2f7f1a', emissiveIntensity: 0.6, side: THREE.DoubleSide });

  constructor(private scene: THREE.Scene) {
    scene.add(this.particles.points);
  }

  setViewportHeight(h: number) {
    this.particles.setScale(h);
  }

  emit(kind: FxKind, at: THREE.Vector3, count: number, spread?: number, dir?: THREE.Vector3, sizeMul?: number) {
    this.particles.emit(kind, at, count, spread, dir, sizeMul);
  }

  private add(obj: THREE.Object3D, dur: number, update: (e: Effect, dt: number) => void, dispose?: () => void) {
    this.scene.add(obj);
    this.effects.push({ obj, t: 0, dur, update, dispose });
  }

  /** Expanding flat ring on the ground or a vertical shock ring. */
  ring(at: THREE.Vector3, color: string, dur = 0.5, maxR = 1.6, flat = true) {
    const mat = additive(color, 0.9);
    const m = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 40), mat);
    m.position.copy(at);
    if (flat) m.rotation.x = -Math.PI / 2;
    this.add(m, dur, (e) => {
      const k = e.t / e.dur;
      m.scale.setScalar(0.2 + k * maxR);
      mat.opacity = 0.9 * (1 - k);
    }, () => { m.geometry.dispose(); mat.dispose(); });
  }

  /** Straight glowing beam (water jet, static field). */
  beam(from: THREE.Vector3, to: THREE.Vector3, color: string, dur: number, width = 0.12, core = '#ffffff') {
    const len = from.distanceTo(to);
    const g = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(width, width * 0.7, len, 12, 1, true), additive(color, 0.7));
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.4, width * 0.3, len, 8, 1, true), additive(core, 0.9));
    g.add(outer, inner);
    g.position.copy(from).lerp(to, 0.5);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    this.add(g, dur, (e) => {
      const k = e.t / e.dur;
      const w = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.7) / 0.3);
      g.scale.set(w * (1 + Math.sin(e.t * 60) * 0.12), 1, w * (1 + Math.cos(e.t * 50) * 0.12));
    }, () => { outer.geometry.dispose(); inner.geometry.dispose(); });
  }

  /** Flickering lightning arc. */
  lightning(from: THREE.Vector3, to: THREE.Vector3, dur: number, color = '#fff6a0', amp = 0.5) {
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const mat2 = new THREE.LineBasicMaterial({ color: '#7ae8ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const geo = new THREE.BufferGeometry().setFromPoints(jagged(from, to, 10, amp));
    const geo2 = new THREE.BufferGeometry().setFromPoints(jagged(from, to, 10, amp));
    const g = new THREE.Group();
    g.add(new THREE.Line(geo, mat), new THREE.Line(geo2, mat2));
    let acc = 0;
    this.add(g, dur, (e, dt) => {
      acc += dt;
      if (acc > 0.04) {
        acc = 0;
        geo.setFromPoints(jagged(from, to, 10, amp));
        geo2.setFromPoints(jagged(from, to, 10, amp));
      }
      mat.opacity = mat2.opacity = 1 - e.t / e.dur;
    }, () => { geo.dispose(); geo2.dispose(); mat.dispose(); mat2.dispose(); });
  }

  /** Magma eruption: glowing pillar + fire fountain. */
  eruption(at: THREE.Vector3) {
    const mat = additive('#ff7a1a', 0.9);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 3, 16, 1, true), mat);
    pillar.position.copy(at).setY(1.5);
    this.ring(at.clone().setY(0.05), '#ff6a12', 0.6, 2.5);
    this.emit('fire', at.clone().setY(0.3), 90, 0.5, new THREE.Vector3(0, 2, 0), 1.4);
    this.emit('ember', at.clone().setY(0.5), 60, 0.6, new THREE.Vector3(0, 2, 0));
    this.emit('smoke', at.clone().setY(0.6), 20, 0.5);
    this.add(pillar, 0.7, (e) => {
      const k = e.t / e.dur;
      pillar.scale.set(1 - k * 0.6, Math.min(1, k * 5), 1 - k * 0.6);
      mat.opacity = 0.9 * (1 - k);
    }, () => { pillar.geometry.dispose(); mat.dispose(); });
  }

  /** Glowing warning circle under the target (heavy ground move windup). */
  telegraph(at: THREE.Vector3, color: string, dur: number) {
    const mat = additive(color, 0.0);
    const m = new THREE.Mesh(new THREE.RingGeometry(0.2, 1.1, 36), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.copy(at).setY(0.03);
    this.add(m, dur, (e) => {
      const k = e.t / e.dur;
      m.scale.setScalar(0.4 + k * 0.8);
      mat.opacity = 0.25 + 0.45 * Math.abs(Math.sin(e.t * (6 + k * 18)));
    }, () => { m.geometry.dispose(); mat.dispose(); });
  }

  /** Thorn spike popping out of the ground. */
  spike(at: THREE.Vector3, scale = 1) {
    const m = new THREE.Mesh(this.spikeGeo, this.spikeMat);
    m.position.copy(at).setY(-0.4 * scale);
    m.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 6, (Math.random() - 0.5) * 0.5);
    m.scale.setScalar(scale);
    m.castShadow = true;
    this.emit('dust', at.clone().setY(0.1), 3, 0.2);
    this.add(m, 0.9, (e) => {
      const k = e.t / e.dur;
      const up = k < 0.15 ? k / 0.15 : k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      m.position.y = -0.4 * scale + up * 0.75 * scale;
    });
  }

  /** Damage-free flourish: leaves spiralling around a point (vine root). */
  rootVines(at: THREE.Vector3, dur: number) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: '#3f8f2e', roughness: 0.6 });
    for (let i = 0; i < 3; i++) {
      const tor = new THREE.Mesh(new THREE.TorusGeometry(0.55 - i * 0.08, 0.04, 6, 24, Math.PI * 1.7), mat);
      tor.rotation.x = Math.PI / 2;
      tor.position.y = 0.1 + i * 0.18;
      tor.rotation.z = i * 2;
      g.add(tor);
    }
    g.position.copy(at).setY(0);
    this.add(g, dur, (e) => {
      const k = e.t / e.dur;
      const s = k < 0.1 ? k / 0.1 : k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
      g.scale.set(s, s, s);
      g.rotation.y = e.t * 0.6;
    }, () => g.children.forEach((c) => (c as THREE.Mesh).geometry.dispose()));
  }

  /** Orb thrown along an arc; bursts at the end and calls `onLand`. */
  orbThrow(from: THREE.Vector3, to: THREE.Vector3, dur: number, makeOrb: () => THREE.Object3D, onLand?: () => void) {
    const orb = makeOrb();
    orb.position.copy(from);
    let landed = false;
    this.add(orb, dur, (e) => {
      const k = Math.min(1, e.t / e.dur);
      orb.position.lerpVectors(from, to, k);
      orb.position.y += Math.sin(k * Math.PI) * 1.6;
      orb.rotation.x += 0.4;
      if (k >= 1 && !landed) {
        landed = true;
        this.emit('orb', to, 50, 0.2);
        this.ring(to.clone().setY(0.05), '#33e0ff', 0.5, 2);
        onLand?.();
      }
    });
  }

  /** Recall beam from the trainer's orb to the creature. */
  recallBeam(from: THREE.Vector3, to: THREE.Vector3, dur: number) {
    this.beam(from, to, '#ff4d6d', dur, 0.06, '#ffd0da');
  }

  // ------------------------------------------------------------ state-driven projectiles

  /** Draw (or move) the visual for an in-flight strike. Call each frame; unseen ones are removed. */
  projectile(id: number, move: string, from: THREE.Vector3, to: THREE.Vector3, k: number, dt: number) {
    let p = this.projectiles.get(id);
    const pos = from.clone().lerp(to, k);
    const dir = to.clone().sub(from).normalize();
    if (!p) {
      p = { obj: this.makeProjectile(move), seen: true, kind: move, extra: { spikes: 0 } };
      this.scene.add(p.obj);
      this.projectiles.set(id, p);
    }
    p.seen = true;
    const o = p.obj;
    switch (move) {
      case 'cinder_spit':
        pos.y += Math.sin(k * Math.PI) * 0.6;
        o.position.copy(pos);
        o.scale.setScalar(1 + Math.sin(performance.now() * 0.03) * 0.15);
        this.emit('fire', pos, 3, 0.08, dir.clone().multiplyScalar(-0.5), 0.8);
        this.emit('ember', pos, 1, 0.1);
        break;
      case 'leaf_volley': {
        o.position.copy(pos);
        o.lookAt(to);
        o.children.forEach((c, i) => { c.rotation.z += dt * (8 + i); });
        if (Math.random() < 0.5) this.emit('leaf', pos, 1, 0.3);
        break;
      }
      case 'vine_snare': {
        const line = o as THREE.Mesh;
        const len = Math.max(0.01, from.distanceTo(pos));
        line.scale.set(1, len, 1);
        line.position.copy(from).lerp(pos, 0.5);
        line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        if (Math.random() < 0.4) this.emit('leaf', pos, 1, 0.1);
        break;
      }
      case 'spark_dart':
      case 'chain_storm':
        o.position.copy(pos);
        o.lookAt(to);
        this.emit('electric', pos, 3, 0.06);
        if (move === 'chain_storm' && Math.random() < 0.3) this.lightning(from, pos, 0.06, '#7ae8ff', 0.3);
        break;
      case 'maelstrom': {
        const ground = pos.clone().setY(0.15);
        o.position.copy(ground);
        o.rotation.y += dt * 9;
        o.scale.setScalar(0.8 + k * 0.6);
        this.emit('splash', ground.clone().setY(0.4), 4, 0.7);
        break;
      }
      case 'thunder_lance': {
        o.position.copy(pos);
        o.lookAt(to);
        this.emit('electric', pos, 6, 0.15);
        if (Math.random() < 0.6) this.lightning(from, pos, 0.08, '#ffffff', 0.35);
        break;
      }
      case 'tidal_crash': {
        const ground = pos.clone().setY(0);
        o.position.copy(ground);
        o.lookAt(to.clone().setY(0));
        const s = 0.6 + k * 0.6;
        o.scale.set(s, s, s);
        this.emit('splash', ground.clone().setY(1.1 * s), 5, 0.8);
        break;
      }
      case 'thorn_quake': {
        const ex = p.extra as { spikes: number };
        const want = Math.floor(k * 7);
        while (ex.spikes < want) {
          ex.spikes++;
          const sp = from.clone().lerp(to, ex.spikes / 7).setY(0);
          sp.x += (Math.random() - 0.5) * 0.6;
          this.spike(sp, 0.8 + ex.spikes * 0.06);
        }
        o.position.copy(pos.setY(0.05));
        break;
      }
      default:
        o.position.copy(pos);
        this.emit(ELEMENT_FX[MOVES[move as MoveId]?.element ?? 'normal'] ?? 'normal', pos, 2, 0.06);
    }
  }

  private makeProjectile(move: string): THREE.Object3D {
    switch (move) {
      case 'cinder_spit': {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffe08a' })));
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), additive('#ff6a1a', 0.6)));
        return g;
      }
      case 'leaf_volley': {
        const g = new THREE.Group();
        for (let i = 0; i < 6; i++) {
          const holder = new THREE.Group();
          const leaf = new THREE.Mesh(this.leafGeo, this.leafMat);
          leaf.position.set(0.35, 0, 0);
          leaf.scale.set(1.4, 1.4, 0.3);
          leaf.rotation.x = Math.PI / 2;
          holder.add(leaf);
          holder.rotation.z = (i / 6) * Math.PI * 2;
          holder.position.z = (i % 2) * 0.25;
          g.add(holder);
        }
        return g;
      }
      case 'vine_snare':
        return new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), new THREE.MeshStandardMaterial({ color: '#3f8f2e', emissive: '#1a4f10', emissiveIntensity: 0.5 }));
      case 'maelstrom': {
        const g = new THREE.Group();
        const water = new THREE.MeshStandardMaterial({ color: '#2a7fe0', transparent: true, opacity: 0.7, emissive: '#1a4fa8', emissiveIntensity: 0.5, side: THREE.DoubleSide });
        for (let i = 0; i < 3; i++) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4 + i * 0.3, 0.07, 6, 24, Math.PI * 1.6), water);
          ring.rotation.x = -Math.PI / 2;
          ring.rotation.z = i * 2;
          ring.position.y = 0.1 + i * 0.2;
          g.add(ring);
        }
        g.add(new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 16, 1, true), additive('#7fd0ff', 0.5)));
        return g;
      }
      case 'chain_storm':
      case 'spark_dart': {
        const m = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 6), new THREE.MeshBasicMaterial({ color: '#fffbd0' }));
        m.rotation.x = Math.PI / 2;
        const g = new THREE.Group();
        g.add(m, new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), additive('#ffe14a', 0.5)));
        return g;
      }
      case 'thunder_lance': {
        const g = new THREE.Group();
        const m = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.1, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
        m.rotation.x = Math.PI / 2;
        g.add(m, new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), additive('#7ae8ff', 0.5)));
        return g;
      }
      case 'tidal_crash': {
        // A curling wave lip: a plane bent into a quarter-pipe that leans toward the target (+z).
        const g = new THREE.Group();
        const geo = new THREE.PlaneGeometry(2.8, 1, 24, 12);
        const pos = geo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const v = pos.getY(i) + 0.5; // 0 (base) .. 1 (lip)
          const a = v * Math.PI * 0.85;
          const r = 0.9 * (1 - v * 0.25);
          const edge = 1 - Math.pow(Math.abs(pos.getX(i)) / 1.4, 3);
          pos.setY(i, Math.sin(a) * r * 1.3 * (0.4 + 0.6 * edge));
          pos.setZ(i, (1 - Math.cos(a)) * r * 0.8 - 0.4);
        }
        geo.computeVertexNormals();
        const water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#2f8fe0', transparent: true, opacity: 0.8, side: THREE.DoubleSide, emissive: '#1a5fa8', emissiveIntensity: 0.5, roughness: 0.15 }));
        const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 8), additive('#e6f6ff', 0.85));
        foam.rotation.z = Math.PI / 2;
        foam.position.set(0, 1.0, 0.75);
        g.add(water, foam);
        return g;
      }
      default:
        return new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshBasicMaterial({ color: ELEMENT_COLOR[MOVES[move as MoveId]?.element ?? 'normal'] }));
    }
  }

  update(dt: number) {
    this.particles.update(dt);
    // Effects may spawn new effects while updating, so swap the list first.
    const list = this.effects;
    this.effects = [];
    for (const e of list) {
      e.t += dt;
      e.update(e, dt);
      if (e.t >= e.dur) {
        this.scene.remove(e.obj);
        e.dispose?.();
      } else this.effects.push(e);
    }
    for (const [id, p] of this.projectiles) {
      if (!p.seen) {
        this.scene.remove(p.obj);
        this.projectiles.delete(id);
      } else p.seen = false;
    }
  }

  clear() {
    for (const e of this.effects) { this.scene.remove(e.obj); e.dispose?.(); }
    this.effects = [];
    for (const p of this.projectiles.values()) this.scene.remove(p.obj);
    this.projectiles.clear();
  }
}
