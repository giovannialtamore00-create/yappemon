// Maps SimState + SimEvents to the 3D scene: creature placement, procedural animation, VFX.

import * as THREE from 'three';
import { DASH_S, MOVES, SPECIES, secToTicks } from '../sim/data';
import type { MoveId, PlayerIdx, SimEvent, SimState, SpeciesId } from '../sim/types';
import { ELEMENT_COLOR } from '../i18n';
import { buildCreature, type CreatureModel } from './creatures';
import { TRAINER_Z, creatureZ, makeOrb, worldX, type SceneCtx } from './scene';
import { Vfx, type FxKind } from './vfx';
import { alertPose, dodgePose, movePose, type Pose } from './motion';

const ELEMENT_FX: Record<string, FxKind> = {
  fire: 'fire', water: 'water', grass: 'grass', electric: 'electric', normal: 'normal',
  rock: 'rock', ground: 'dust', flying: 'wind', psychic: 'psychic', ghost: 'shadow', dark: 'shadow', dragon: 'dragon', poison: 'poison', steel: 'metal', ice: 'ice',
};
const CHARGE_FX: Record<string, FxKind> = {
  fire: 'ember', water: 'splash', grass: 'leaf', electric: 'static', normal: 'dust',
  rock: 'dust', ground: 'dust', flying: 'wind', psychic: 'psychic', ghost: 'shadow', dark: 'shadow', dragon: 'dragon', poison: 'poison', steel: 'metal', ice: 'ice',
};

interface Side {
  models: CreatureModel[];
  shown: number;
  /** Smoothed arena position of the active creature (world metres). */
  dispX: number;
  dispZ: number;
  /** Visual-only sidestep after an accuracy miss: time since it started (s) and side (±1). */
  sidestepT: number;
  sidestepDir: number;
  flash: number;
  recoil: number;
  faintT: number;
  /** <0: hidden until the orb lands; 0..1: growing in; >=1: normal. */
  appear: number;
  shrink: number;
  shield: THREE.Mesh;
  mirror: THREE.Mesh;
  /** Ground rings: armed dodge window, alert stance. */
  dodgeRing: THREE.Mesh;
  alertRing: THREE.Mesh;
}

/** Melee lunges stop this short of the opponent's centre. */
const MELEE_STANDOFF_M = 1.3;
const SIDESTEP_S = 0.4;

function groundRing(inner: number, outer: number, segments: number, color: string): THREE.Mesh {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, segments),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  return ring;
}

/** One creature transforming during the between-rounds evolution sequence. */
interface EvoActor { from: CreatureModel; to: CreatureModel; pos: THREE.Vector3; facing: number }

export interface FloatText { text: string; pos: THREE.Vector3; color: string; big?: boolean }

export class BattleView {
  readonly vfx: Vfx;
  private sides: Side[] = [];
  private time = 0;
  private group = new THREE.Group();
  onFloat: (f: FloatText) => void = () => {};
  /** Called at the flash of the evolution sequence (for sound). */
  onEvolveBurst: () => void = () => {};
  private evo: { t: number; actors: EvoActor[]; burst: boolean } | null = null;

  constructor(private ctx: SceneCtx, teams: [SpeciesId[], SpeciesId[]], readonly me: PlayerIdx) {
    this.vfx = new Vfx(ctx.scene);
    ctx.scene.add(this.group);
    for (const p of [0, 1] as const) {
      const models = teams[p].map((sp) => {
        const m = buildCreature(sp);
        m.root.visible = false;
        this.group.add(m.root);
        return m;
      });
      const shield = new THREE.Mesh(
        new THREE.SphereGeometry(1, 24, 16),
        new THREE.MeshBasicMaterial({ color: '#ff8a2a', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      shield.visible = false;
      this.group.add(shield);
      const mirror = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, 1),
        new THREE.MeshBasicMaterial({ color: '#7fe8ff', transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, wireframe: true }),
      );
      mirror.visible = false;
      this.group.add(mirror);
      const dodgeRing = groundRing(0.85, 1.0, 40, '#7fe8ff');
      const alertRing = groundRing(1.05, 1.22, 6, '#ffc24a');
      this.group.add(dodgeRing, alertRing);
      this.sides.push({
        models, shown: -1, dispX: 0, dispZ: creatureZ(p), sidestepT: SIDESTEP_S, sidestepDir: 1,
        flash: 0, recoil: 0, faintT: -1, appear: -1, shrink: -1, shield, mirror, dodgeRing, alertRing,
      });
    }
    ctx.setPov(me);
  }

  dispose() {
    this.ctx.setFocus(null);
    this.vfx.clear();
    this.ctx.scene.remove(this.group);
    this.ctx.scene.remove(this.vfx.particles.points);
  }

  // ------------------------------------------------------------ helpers

  private model(p: PlayerIdx): CreatureModel | undefined {
    const s = this.sides[p]!;
    return s.shown >= 0 ? s.models[s.shown] : undefined;
  }

  /** Ground point under a creature (smoothed position plus any miss sidestep). */
  private groundPos(p: PlayerIdx): THREE.Vector3 {
    const side = this.sides[p]!;
    const pos = new THREE.Vector3(side.dispX, 0, side.dispZ);
    if (side.sidestepT < SIDESTEP_S) {
      const k = side.sidestepT / SIDESTEP_S;
      const f = this.forwardDir(p);
      pos.add(new THREE.Vector3(f.z, 0, -f.x).multiplyScalar(Math.sin(k * Math.PI) * 0.6 * side.sidestepDir));
    }
    return pos;
  }

  /** Center of a creature in world space. */
  creaturePos(p: PlayerIdx, s?: SimState, height = 0.5): THREE.Vector3 {
    const m = this.model(p) ?? this.sides[p]!.models[s?.trainers[p].active ?? 0];
    const h = m ? (m.baseY + (m.height - m.baseY) * height * 0.6) * m.size : 0.6;
    return this.groundPos(p).setY(h);
  }

  headPos(p: PlayerIdx): THREE.Vector3 {
    const m = this.model(p) ?? this.sides[p]!.models[0]!;
    return this.groundPos(p).setY(m.height * m.size + 0.25);
  }

  /** Mouth of `p`'s creature; `at` = arena position to use instead of the current one (strike launch spot). */
  private mouthPos(p: PlayerIdx, at?: { x: number; z: number }): THREE.Vector3 {
    const m = this.model(p) ?? this.sides[p]!.models[0]!;
    const base = at ? new THREE.Vector3(at.x, 0, at.z) : this.groundPos(p);
    return base.addScaledVector(this.forwardDir(p, base), m.mouth.z * m.size).setY((m.baseY + m.mouth.y) * m.size);
  }

  /** Unit vector (on the ground) from `p`'s creature (or `from`) toward the opponent. */
  private forwardDir(p: PlayerIdx, from?: THREE.Vector3): THREE.Vector3 {
    const me = this.sides[p]!;
    const o = this.sides[p === 0 ? 1 : 0]!;
    const d = new THREE.Vector3(o.dispX - (from?.x ?? me.dispX), 0, o.dispZ - (from?.z ?? me.dispZ));
    return d.lengthSq() > 1e-6 ? d.normalize() : new THREE.Vector3(0, 0, p === 0 ? -1 : 1);
  }

  /** World-space vector of `d` metres toward the opponent. */
  private forward(p: PlayerIdx, d: number): THREE.Vector3 {
    return this.forwardDir(p).multiplyScalar(d);
  }

  private distance(): number {
    const [a, b] = this.sides as [Side, Side];
    return Math.hypot(a.dispX - b.dispX, a.dispZ - b.dispZ);
  }

  private trainerOrbPos(p: PlayerIdx): THREE.Vector3 {
    const z = p === 0 ? TRAINER_Z : -TRAINER_Z;
    return new THREE.Vector3(p === 0 ? 0.35 : -0.35, 1.25, z - Math.sign(z) * 0.3);
  }

  // ------------------------------------------------------------ events

  handle(events: SimEvent[], s: SimState) {
    for (const e of events) {
      switch (e.t) {
        case 'sendout': {
          const side = this.sides[e.p]!;
          if (side.shown >= 0) side.models[side.shown]!.root.visible = false;
          side.shown = e.slot;
          side.appear = -1;
          side.faintT = -1;
          side.shrink = -1;
          side.dispX = 0;
          side.dispZ = creatureZ(e.p);
          side.sidestepT = SIDESTEP_S;
          const to = new THREE.Vector3(0, 0.3, creatureZ(e.p));
          this.vfx.orbThrow(this.trainerOrbPos(e.p), to, 0.55, () => makeOrb(0.16), () => { side.appear = 0; });
          break;
        }
        case 'recall': {
          const side = this.sides[e.p]!;
          side.shrink = 0;
          this.vfx.emit('orb', this.creaturePos(e.p, s), 30, 0.3);
          break;
        }
        case 'faint': {
          const side = this.sides[e.p]!;
          side.faintT = 0;
          this.vfx.emit('smoke', this.creaturePos(e.p, s, 0.2), 25, 0.4);
          break;
        }
        case 'action_start': {
          if (e.action.kind === 'move') {
            const m = MOVES[e.action.move];
            if (m.delivery === 'ground' && m.heavy) {
              const o = (e.p === 0 ? 1 : 0) as PlayerIdx;
              const pos = this.creaturePos(o, s).setY(0);
              this.vfx.telegraph(pos, ELEMENT_COLOR[m.element], m.windup * 1.1);
            }
          }
          if (e.action.kind === 'recall') {
            this.vfx.recallBeam(this.trainerOrbPos(e.p), this.creaturePos(e.p, s), 1.5);
          }
          break;
        }
        case 'launch': {
          const m = MOVES[e.move];
          const o = (e.p === 0 ? 1 : 0) as PlayerIdx;
          const from = this.mouthPos(e.p);
          const to = this.creaturePos(o, s);
          if (e.move === 'water_jet') {
            this.vfx.beam(from, to, '#3aa4ff', 0.45, 0.16, '#e6f6ff');
            this.vfx.emit('splash', from, 12, 0.1, to.clone().sub(from).normalize());
          } else if (e.move === 'static_field') {
            for (let i = 0; i < 3; i++) this.vfx.lightning(from, to, 0.4, i % 2 ? '#c89bff' : '#fff27a', 0.7);
          } else if (e.move === 'heat_shell') {
            this.vfx.emit('fire', this.creaturePos(e.p, s), 40, 0.4, undefined, 1.2);
            this.vfx.ring(this.creaturePos(e.p, s), '#ff8a2a', 0.5, 1.6, false);
          } else if (e.move === 'healing_rain') {
            const top = this.headPos(e.p).add(new THREE.Vector3(0, 0.5, 0));
            this.vfx.emit('heal', top, 40, 0.6);
          } else if (e.move === 'ancient_bloom') {
            const c = this.creaturePos(e.p, s);
            this.vfx.emit('leaf', c, 40, 0.8, new THREE.Vector3(0, 1.5, 0));
            this.vfx.emit('heal', this.headPos(e.p), 50, 0.8);
            this.vfx.ring(c.clone().setY(0.05), '#9cff6b', 0.8, 2.5);
          } else if (e.move === 'tide_mirror') {
            const c = this.creaturePos(e.p, s);
            this.vfx.ring(c, '#7fe8ff', 0.5, 1.8, false);
            this.vfx.emit('splash', c, 30, 0.5);
          } else if (e.move === 'sky_judgement') {
            const top = to.clone().setY(14);
            for (let i = 0; i < 3; i++) this.vfx.lightning(top, to, 0.5, i ? '#7ae8ff' : '#ffffff', 1.2);
            this.vfx.beam(top, to.clone().setY(0), '#bfefff', 0.5, 0.5, '#ffffff');
          } else if (m.delivery === 'projectile' || m.delivery === 'wave') {
            this.vfx.emit(CHARGE_FX[m.element] ?? 'normal', from, 12, 0.1);
          }
          break;
        }
        case 'hit': {
          const m = MOVES[e.move];
          const side = this.sides[e.target]!;
          const pos = this.creaturePos(e.target, s);
          if (e.damage > 0) {
            side.flash = 1;
            side.recoil = Math.min(1.5, 0.4 + e.damage / 25);
            this.vfx.emit('spark', pos, 18 + e.damage, 0.2);
            this.vfx.emit(ELEMENT_FX[m.element] ?? 'normal', pos, 20 + e.damage * (e.eff === 'super' ? 2 : 1), 0.3);
            this.onFloat({ text: String(e.damage), pos: this.headPos(e.target), color: e.eff === 'super' ? '#ffdd55' : e.eff === 'weak' ? '#b8c4d6' : '#ffffff', big: e.damage >= 25 });
            if (m.heavy || e.damage >= 25) this.ctx.shake.amount = Math.min(1, this.ctx.shake.amount + (e.target === this.me ? 0.9 : 0.5));
          }
          this.impactFx(e.move, pos);
          break;
        }
        case 'dodged':
          // The dodger dashes away (sim); the attack lands where it stood.
          this.impactFx(e.move, this.creaturePos(e.target, s), true);
          this.onFloat({ text: e.target === this.me ? 'Dodged!' : 'Miss!', pos: this.headPos(e.target), color: '#9fe8ff' });
          break;
        case 'miss': {
          // Accuracy miss: a small visual sidestep, the attack lands beside the target.
          const side = this.sides[e.target]!;
          side.sidestepT = 0;
          side.sidestepDir = Math.random() < 0.5 ? -1 : 1;
          const f = this.forwardDir(e.target);
          const beside = this.creaturePos(e.target, s).add(new THREE.Vector3(f.z, 0, -f.x).multiplyScalar(-0.9 * side.sidestepDir));
          this.impactFx(e.move, beside, true);
          this.onFloat({ text: 'Miss!', pos: this.headPos(e.target), color: '#c9d6e6' });
          break;
        }
        case 'dodge':
          this.vfx.emit('dust', this.creaturePos(e.p, s).setY(0.15), 18, 0.35);
          break;
        case 'dodge_ready':
          if (e.on) this.vfx.ring(this.creaturePos(e.p, s).setY(0.05), '#7fe8ff', 0.35, 1.4);
          break;
        case 'alert':
          if (e.on) this.vfx.ring(this.creaturePos(e.p, s).setY(0.05), '#ffc24a', 0.35, 1.6);
          break;
        case 'status':
          if (e.status === 'root' && e.on) this.vfx.rootVines(this.creaturePos(e.p, s), 2.0);
          if (e.status === 'static' && e.on) this.vfx.emit('static', this.creaturePos(e.p, s), 30, 0.4);
          break;
        case 'fail':
          this.vfx.emit('smoke', this.headPos(e.p), 8, 0.2);
          break;
        case 'reflect': {
          const from = this.creaturePos(e.p, s);
          const to = this.creaturePos(e.target, s);
          this.vfx.beam(from, to, '#7fe8ff', 0.35, 0.12, '#ffffff');
          this.vfx.ring(from, '#7fe8ff', 0.4, 2, false);
          const side = this.sides[e.target]!;
          side.flash = 1;
          side.recoil = 1;
          this.onFloat({ text: e.p === this.me ? 'Reflected!' : 'Bounced back!', pos: this.headPos(e.p), color: '#9fe8ff' });
          this.onFloat({ text: String(e.damage), pos: this.headPos(e.target), color: '#ffffff', big: e.damage >= 25 });
          break;
        }
        case 'round_end':
          if (e.next) this.startEvolution(s);
          break;
        default:
          break;
      }
    }
  }

  private impactFx(move: MoveId, pos: THREE.Vector3, miss = false) {
    switch (move) {
      case 'magma_burst': this.vfx.eruption(pos.clone().setY(0)); break;
      case 'tidal_crash': this.vfx.emit('splash', pos, miss ? 40 : 80, 0.6, new THREE.Vector3(0, 1.5, 0), 1.3); break;
      case 'thorn_quake': for (let i = 0; i < 5; i++) this.vfx.spike(pos.clone().setY(0).add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2)), 1.3); break;
      case 'thunder_lance': this.vfx.lightning(pos.clone().setY(6), pos, 0.25, '#ffffff', 0.6); this.vfx.ring(pos, '#fff27a', 0.4, 2, false); break;
      case 'cinder_spit': this.vfx.emit('fire', pos, 25, 0.2); break;
      case 'spark_dart': this.vfx.emit('electric', pos, 25, 0.2); break;
      case 'vine_snare': this.vfx.emit('leaf', pos, 12, 0.3); break;
      case 'molten_leap': this.vfx.eruption(pos.clone().setY(0)); break;
      case 'bramble_stampede':
        this.vfx.emit('leaf', pos, 30, 0.4);
        for (let i = 0; i < 3; i++) this.vfx.spike(pos.clone().setY(0).add(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5)), 0.8);
        break;
      case 'chain_storm':
        this.vfx.emit('electric', pos, 20, 0.2);
        this.vfx.lightning(pos.clone().add(new THREE.Vector3(0, 1.5, 0)), pos, 0.15, '#7ae8ff', 0.4);
        break;
      case 'volcanic_ruin':
        for (let i = 0; i < 3; i++) this.vfx.eruption(pos.clone().setY(0).add(new THREE.Vector3((i - 1) * 1.1, 0, (Math.random() - 0.5) * 0.8)));
        this.vfx.ring(pos.clone().setY(0.05), '#ff3a00', 0.9, 4);
        break;
      case 'maelstrom':
        this.vfx.emit('splash', pos, 70, 0.6, new THREE.Vector3(0, 1.2, 0), 1.2);
        this.vfx.ring(pos.clone().setY(0.1), '#3aa4ff', 0.8, 2.5);
        break;
      case 'sky_judgement':
        this.vfx.ring(pos, '#ffffff', 0.5, 3, false);
        this.vfx.emit('electric', pos, 60, 0.6, undefined, 1.4);
        break;
      default: if (!miss) this.vfx.ring(pos, '#ffffff', 0.25, 1.2, false);
    }
  }

  // ------------------------------------------------------------ per frame

  update(dt: number, prev: SimState, curr: SimState, alpha: number) {
    this.time += dt;
    if (this.evo) this.updateEvolution(dt);
    if (!this.evo || this.evo.t < EVO_START) for (const p of [0, 1] as const) this.updateSide(p, dt, prev, curr, alpha);
    // Dynamic camera: keep both creatures framed (home spots during the evolution sequence).
    const mine = this.sides[this.me]!;
    const foe = this.sides[this.me === 0 ? 1 : 0]!;
    if (this.evo && this.evo.t >= EVO_START) this.ctx.setFocus({ x: 0, z: creatureZ(this.me) }, { x: 0, z: creatureZ(this.me === 0 ? 1 : 0) });
    else this.ctx.setFocus({ x: mine.dispX, z: mine.dispZ }, { x: foe.dispX, z: foe.dispZ });
    // Strikes in flight.
    for (const k of curr.strikes) {
      const m = MOVES[k.move];
      if (m.delivery === 'beam' || m.delivery === 'ground' && !m.speed) continue;
      const prog = Math.min(1, Math.max(0, 1 - (k.left - alpha) / k.total));
      const from = this.mouthPos(k.owner, { x: k.fromX, z: k.fromZ });
      // Fly at the target's current spot (it keeps moving); fall back to the launch spot if it left.
      const still = curr.trainers[k.target].active === k.targetSlot && this.sides[k.target]!.shown === k.targetSlot;
      const to = still ? this.creaturePos(k.target, curr).setY(0.7) : new THREE.Vector3(k.toX, 0.7, k.toZ);
      this.vfx.projectile(k.id, k.move, from, to, prog, dt);
    }
    this.vfx.update(dt);
  }

  /** Between rounds: every creature of both trainers appears and evolves into its next stage. */
  private startEvolution(s: SimState) {
    const actors: EvoActor[] = [];
    for (const p of [0, 1] as const) {
      const team = s.trainers[p].team;
      team.forEach((c, i) => {
        const next = SPECIES[c.species].next;
        if (!next) return;
        const from = buildCreature(c.species);
        const to = buildCreature(next);
        const x = (i - (team.length - 1) / 2) * 2.4;
        const pos = new THREE.Vector3(worldX(p, x), 0, creatureZ(p));
        for (const m of [from, to]) {
          m.root.visible = false;
          m.root.position.copy(pos);
          this.group.add(m.root);
        }
        actors.push({ from, to, pos, facing: p === 0 ? Math.PI : 0 });
      });
    }
    this.evo = { t: 0, actors, burst: false };
  }

  private updateEvolution(dt: number) {
    const evo = this.evo!;
    evo.t += dt;
    const t = evo.t;
    if (t < EVO_START) return;
    // Hide the battle models once the sequence starts.
    for (const side of this.sides) {
      for (const m of side.models) m.root.visible = false;
      side.shield.visible = side.mirror.visible = side.dodgeRing.visible = side.alertRing.visible = false;
    }
    const k = t - EVO_START;
    for (const a of evo.actors) {
      const before = t < EVO_BURST;
      // Flicker between the two forms faster and faster just before the burst.
      const flick = t > EVO_BURST - 1.1 && before ? Math.sin(Math.pow(t - (EVO_BURST - 1.1), 2) * 40) > 0 : false;
      const showTo = !before || flick;
      a.from.root.visible = !showTo;
      a.to.root.visible = showTo;
      const m = showTo ? a.to : a.from;
      const appear = Math.min(1, k / 0.35);
      const spinSpeed = before ? 1 + Math.min(1, k / 2.5) * 10 : Math.max(0, 10 - (t - EVO_BURST) * 12);
      m.root.rotation.y = a.facing + (before ? k * spinSpeed * 0.6 : (t - EVO_BURST) * spinSpeed * 0.3);
      const rise = before ? Math.min(0.5, k * 0.2) : Math.max(0, 0.5 - (t - EVO_BURST) * 1.2);
      m.root.position.set(a.pos.x, rise, a.pos.z);
      const pop = !before ? 1 + Math.max(0, 0.35 - (t - EVO_BURST)) : 1;
      m.root.scale.setScalar(m.size * (before ? easeOutBack(appear) : pop));
      m.body.position.y = m.baseY + Math.sin(this.time * 3) * 0.03;
      m.animate(this.time, dt, before ? Math.min(1, k / 2) : 0.3, 0);
      glow(m, before ? Math.min(1, k / 2.2) : Math.max(0, 1 - (t - EVO_BURST) * 1.2));
      if (before && Math.random() < 0.5) {
        const ang = this.time * 6 + Math.random();
        this.vfx.emit('orb', a.pos.clone().add(new THREE.Vector3(Math.cos(ang) * 0.9, 0.3 + Math.random() * 1.2, Math.sin(ang) * 0.9)), 1, 0.05);
      }
      if (k < 0.1 && Math.random() < 0.5) this.vfx.emit('orb', a.pos.clone().setY(0.4), 6, 0.2);
    }
    if (!evo.burst && t >= EVO_BURST) {
      evo.burst = true;
      for (const a of evo.actors) {
        this.vfx.ring(a.pos.clone().setY(0.05), '#ffffff', 0.8, 3.5);
        this.vfx.ring(a.pos.clone().setY(1), '#33e0ff', 0.6, 2.5, false);
        this.vfx.emit('orb', a.pos.clone().setY(0.8), 60, 0.4);
        this.vfx.emit('spark', a.pos.clone().setY(0.8), 40, 0.3);
      }
      this.ctx.shake.amount = Math.max(this.ctx.shake.amount, 0.5);
      this.onEvolveBurst();
    }
  }

  private updateSide(p: PlayerIdx, dt: number, prev: SimState, curr: SimState, alpha: number) {
    const side = this.sides[p]!;
    const t = curr.trainers[p];
    const tp = prev.trainers[p];
    if (side.shown < 0 && (t.field === 'active' || t.field === 'sending')) side.shown = t.active;
    const m = this.model(p);
    if (!m) return;
    const c = t.team[side.shown]!;

    // Smooth arena position (interpolated between sim ticks; faster while dashing).
    const sameCreature = tp.active === t.active;
    const targetX = sameCreature ? tp.x + (t.x - tp.x) * alpha : t.x;
    const targetZ = sameCreature ? tp.z + (t.z - tp.z) * alpha : t.z;
    const follow = Math.min(1, dt * (t.dashTicks > 0 ? 22 : 12));
    side.dispX += (targetX - side.dispX) * follow;
    side.dispZ += (targetZ - side.dispZ) * follow;
    if (side.sidestepT < SIDESTEP_S) side.sidestepT += dt;

    // Visibility: appear after the orb lands, shrink on recall, fade after faint.
    let scale = 1;
    let opacity = 1;
    if (side.appear < 0) scale = 0;
    else if (side.appear < 1) { side.appear = Math.min(1, side.appear + dt * 3); scale = easeOutBack(side.appear); }
    if (side.shrink >= 0) { side.shrink += dt * 4; scale = Math.max(0, 1 - side.shrink); }
    if (side.faintT >= 0) { side.faintT += dt; opacity = Math.max(0, 1 - Math.max(0, side.faintT - 0.8) / 0.8); }
    m.root.visible = scale > 0.01 && opacity > 0.01;
    if (!m.root.visible) { side.shield.visible = side.mirror.visible = side.dodgeRing.visible = side.alertRing.visible = false; return; }

    // Face the opponent (models face +z).
    const ground = this.groundPos(p);
    const f = this.forwardDir(p);
    m.root.position.copy(ground);
    m.root.rotation.set(0, Math.atan2(f.x, f.z), 0);
    m.root.scale.setScalar(scale * m.size);

    // Base idle: bob + breathing.
    const speedK = SPECIES[m.species].speed === 'fast' ? 1.6 : SPECIES[m.species].speed === 'slow' ? 0.8 : 1.1;
    let bodyY = m.baseY + Math.sin(this.time * 2.2 * speedK + p) * 0.04;
    let pose: Pose | null = null;
    const breathe = 1 + Math.sin(this.time * 2.6 + p) * 0.025;

    // Action animation: each move has its own body motion (see motion.ts).
    const run = t.action;
    if (t.dashTicks > 0 && side.faintT < 0) {
      // Dodge dash: quick lateral hop with a roll (the sim moves x).
      const k = Math.min(1, Math.max(0, 1 - (t.dashTicks - alpha) / secToTicks(DASH_S)));
      pose = dodgePose(k, -t.dashDir * (p === 0 ? 1 : -1));
    } else if (run && side.faintT < 0) {
      const k = Math.min(1, Math.max(0, 1 - (run.left - alpha) / Math.max(1, run.total)));
      const a = run.action;
      if (a.kind === 'move') {
        const mv = MOVES[a.move];
        pose = movePose(a.move, run.phase, k, this.time, this.distance() - MELEE_STANDOFF_M);
        if (run.phase === 'windup' && Math.random() < 0.3 + k) this.vfx.emit(CHARGE_FX[mv.element] ?? 'dust', this.creaturePos(p, curr), mv.heavy ? 2 : 1, 0.5);
        if (a.move === 'bramble_stampede' && pose.run > 0.5 && Math.random() < 0.5) this.vfx.emit('leaf', this.creaturePos(p, curr, 0.2), 1, 0.3);
        if (a.move === 'molten_leap' && pose.up > 0.3) this.vfx.emit('ember', this.creaturePos(p, curr, 0.3).add(this.forward(p, pose.fwd)).setY(pose.up + 0.4), 1, 0.2);
      } else if (a.kind === 'alert') {
        pose = alertPose(this.time + p);
      } else if (a.kind === 'recall' && run.phase === 'windup') {
        side.flash = Math.max(side.flash, 0.4 * k);
        if (k > 0.75) m.root.scale.setScalar(scale * m.size * (1 - (k - 0.75) * 3.6));
        pose = { fwd: 0, up: 0, lean: 0, roll: 0, spin: 0, squash: 1, run: 0, energy: k };
      }
    }
    const P: Pose = pose ?? { fwd: 0, up: 0, lean: 0, roll: 0, spin: 0, squash: 1, run: 0, energy: 0 };
    // Pose distances are world metres; the body lives in the (stage-scaled) root's space.
    let bodyZ = P.fwd / m.size;
    bodyY += P.up / m.size;
    let lean = P.lean;
    let roll = P.roll;
    if (P.jitter) { bodyZ += (Math.random() - 0.5) * P.jitter; bodyY += (Math.random() - 0.5) * P.jitter; }
    if (P.dust) this.vfx.emit('dust', this.creaturePos(p, curr, 0).add(this.forward(p, P.fwd)).setY(0.12), 2, 0.3);
    const sq = P.squash * (1 / breathe);
    m.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));

    // Hit recoil.
    if (side.recoil > 0) {
      side.recoil = Math.max(0, side.recoil - dt * 4);
      bodyZ -= side.recoil * 0.35;
      lean -= side.recoil * 0.2;
    }

    // Faint: tip over and sink.
    if (side.faintT >= 0) {
      const f = Math.min(1, side.faintT / 0.7);
      roll = easeOut(f) * 1.4;
      bodyY = m.baseY * (1 - f) + 0.15 * f;
    }

    m.body.position.set(0, bodyY, bodyZ);
    m.body.rotation.set(lean, P.spin, roll);
    m.animate(this.time, dt, P.energy, P.run);

    // Status visuals.
    const shieldOn = c.shieldTicks > 0 && side.faintT < 0;
    side.shield.visible = shieldOn;
    if (shieldOn) {
      side.shield.position.copy(this.creaturePos(p, curr, 0.6));
      side.shield.scale.setScalar(Math.max(0.8, m.height * m.size * 0.6) * (1 + Math.sin(this.time * 6) * 0.04));
      if (Math.random() < 0.3) this.vfx.emit('ember', side.shield.position, 1, 0.6);
    }
    const mirrorOn = c.mirrorTicks > 0 && side.faintT < 0;
    side.mirror.visible = mirrorOn;
    if (mirrorOn) {
      side.mirror.position.copy(this.creaturePos(p, curr, 0.6));
      side.mirror.scale.setScalar(Math.max(0.9, m.height * m.size * 0.6));
      side.mirror.rotation.y += dt * 2;
    }
    // Armed dodge window: pulsing cyan ring (blinks in its last half second). Alert: amber hexagon.
    const ringR = Math.max(0.75, m.size * 0.9);
    const dodgeOn = t.dodgeReady > 0 && side.faintT < 0;
    side.dodgeRing.visible = dodgeOn && (t.dodgeReady > 15 || Math.sin(this.time * 40) > 0);
    if (dodgeOn) {
      side.dodgeRing.position.set(ground.x, 0.04, ground.z);
      side.dodgeRing.scale.setScalar(ringR * (1 + Math.sin(this.time * 9) * 0.06));
      (side.dodgeRing.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(this.time * 9) * 0.2;
    }
    const alertOn = t.alertTicks > 0 && side.faintT < 0;
    side.alertRing.visible = alertOn;
    if (alertOn) {
      side.alertRing.position.set(ground.x, 0.03, ground.z);
      side.alertRing.scale.setScalar(ringR);
      side.alertRing.rotation.z += dt * 1.5;
      if (Math.random() < 0.15) this.vfx.emit('spark', this.creaturePos(p, curr, 0.1), 1, 0.2);
    }
    if (c.healTicks > 0 && Math.random() < 0.6) this.vfx.emit('heal', this.headPos(p).add(new THREE.Vector3(0, 0.2, 0)), 2, 0.6);
    if (c.staticTicks > 0 && Math.random() < 0.25) this.vfx.emit('static', this.creaturePos(p, curr), 2, 0.4);
    if (c.rootTicks > 0 && Math.random() < 0.1) this.vfx.emit('leaf', this.creaturePos(p, curr, 0.1), 1, 0.4);

    // Hit flash / fade.
    side.flash = Math.max(0, side.flash - dt * 5);
    const flashing = side.flash > 0.01;
    for (const mat of m.materials) {
      const base = mat.userData.baseEmissive as THREE.Color;
      const bi = mat.userData.baseEmissiveIntensity as number;
      if (flashing) {
        mat.emissive.copy(base).lerp(WHITE, side.flash);
        mat.emissiveIntensity = Math.max(bi, side.flash * 1.5);
        mat.userData.flashed = true;
      } else if (mat.userData.flashed) {
        mat.userData.flashed = false;
        mat.emissive.copy(base);
        mat.emissiveIntensity = bi;
      }
      if (opacity < 1) {
        mat.transparent = true;
        mat.opacity = (mat.userData.baseOpacity as number) * opacity;
      }
    }
  }
}

const WHITE = new THREE.Color(1, 1, 1);
/** Evolution sequence timeline (s after the round ends; the break lasts INTERMISSION_S). */
const EVO_START = 1.8;
const EVO_BURST = 4.9;

function glow(m: CreatureModel, amount: number) {
  for (const mat of m.materials) {
    const base = mat.userData.baseEmissive as THREE.Color;
    mat.emissive.copy(base).lerp(WHITE, Math.min(1, amount));
    mat.emissiveIntensity = Math.max(mat.userData.baseEmissiveIntensity as number, amount * 2.2);
  }
}
const easeOut = (x: number) => 1 - (1 - x) * (1 - x);
function easeOutBack(x: number) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
