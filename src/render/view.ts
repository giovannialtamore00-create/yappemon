// Maps SimState + SimEvents to the 3D scene: creature placement, procedural animation, VFX.

import * as THREE from 'three';
import { MOVES, SPECIES } from '../sim/data';
import type { MoveId, PlayerIdx, SimEvent, SimState, SpeciesId } from '../sim/types';
import { buildCreature, type CreatureModel } from './creatures';
import { TRAINER_Z, creatureZ, makeOrb, worldX, type SceneCtx } from './scene';
import { Vfx, type FxKind } from './vfx';

const DASH: Partial<Record<MoveId, number>> = { shell_ram: 4.6, horn_charge: 4.6, bubble_bump: 4.2, wing_flick: 4.3 };
const ELEMENT_FX: Record<string, FxKind> = { fire: 'fire', water: 'water', grass: 'grass', electric: 'electric', normal: 'normal' };
const CHARGE_FX: Record<string, FxKind> = { fire: 'ember', water: 'splash', grass: 'leaf', electric: 'static', normal: 'dust' };

interface Side {
  models: CreatureModel[];
  shown: number;
  dispX: number;
  flash: number;
  recoil: number;
  faintT: number;
  /** <0: hidden until the orb lands; 0..1: growing in; >=1: normal. */
  appear: number;
  shrink: number;
  shield: THREE.Mesh;
}

export interface FloatText { text: string; pos: THREE.Vector3; color: string; big?: boolean }

export class BattleView {
  readonly vfx: Vfx;
  private sides: Side[] = [];
  private time = 0;
  private group = new THREE.Group();
  onFloat: (f: FloatText) => void = () => {};

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
      this.sides.push({ models, shown: -1, dispX: 0, flash: 0, recoil: 0, faintT: -1, appear: -1, shrink: -1, shield });
    }
    ctx.setPov(me);
  }

  dispose() {
    this.vfx.clear();
    this.ctx.scene.remove(this.group);
    this.ctx.scene.remove(this.vfx.particles.points);
  }

  // ------------------------------------------------------------ helpers

  private model(p: PlayerIdx): CreatureModel | undefined {
    const s = this.sides[p]!;
    return s.shown >= 0 ? s.models[s.shown] : undefined;
  }

  /** Center of a creature in world space. */
  creaturePos(p: PlayerIdx, s?: SimState, height = 0.5): THREE.Vector3 {
    const side = this.sides[p]!;
    const m = this.model(p) ?? this.sides[p]!.models[s?.trainers[p].active ?? 0];
    const h = m ? m.baseY + (m.height - m.baseY) * height * 0.6 : 0.6;
    return new THREE.Vector3(worldX(p, side.dispX), h, creatureZ(p));
  }

  headPos(p: PlayerIdx): THREE.Vector3 {
    const m = this.model(p) ?? this.sides[p]!.models[0]!;
    return new THREE.Vector3(worldX(p, this.sides[p]!.dispX), m.height + 0.25, creatureZ(p));
  }

  private mouthPos(p: PlayerIdx, x: number): THREE.Vector3 {
    const m = this.model(p) ?? this.sides[p]!.models[0]!;
    const dir = p === 0 ? -1 : 1;
    return new THREE.Vector3(worldX(p, x), m.baseY + m.mouth.y, creatureZ(p) + dir * m.mouth.z);
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
              this.vfx.telegraph(pos, m.element === 'fire' ? '#ff5a12' : '#6fd04a', m.windup * 1.1);
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
          const from = this.mouthPos(e.p, this.sides[e.p]!.dispX);
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
        case 'dodged': {
          const pos = this.creaturePos(e.target, s);
          this.impactFx(e.move, this.creaturePos(e.target, s).setX(worldX(e.target, s.trainers[e.target].x - 1.2 * Math.sign(s.trainers[e.target].x || 1))), true);
          this.onFloat({ text: e.target === this.me ? 'Dodged!' : 'Miss!', pos: this.headPos(e.target), color: '#9fe8ff' });
          void pos;
          break;
        }
        case 'dodge':
          this.vfx.emit('dust', this.creaturePos(e.p, s).setY(0.15), 14, 0.3);
          break;
        case 'status':
          if (e.status === 'root' && e.on) this.vfx.rootVines(this.creaturePos(e.p, s), 2.0);
          if (e.status === 'static' && e.on) this.vfx.emit('static', this.creaturePos(e.p, s), 30, 0.4);
          break;
        case 'fail':
          this.vfx.emit('smoke', this.headPos(e.p), 8, 0.2);
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
      default: if (!miss) this.vfx.ring(pos, '#ffffff', 0.25, 1.2, false);
    }
  }

  // ------------------------------------------------------------ per frame

  update(dt: number, prev: SimState, curr: SimState, alpha: number) {
    this.time += dt;
    for (const p of [0, 1] as const) this.updateSide(p, dt, prev, curr, alpha);
    // Strikes in flight.
    for (const k of curr.strikes) {
      const m = MOVES[k.move];
      if (m.delivery === 'beam' || m.delivery === 'ground' && !m.speed) continue;
      const prog = Math.min(1, Math.max(0, 1 - (k.left - alpha) / k.total));
      const from = this.mouthPos(k.owner, k.fromX);
      const to = new THREE.Vector3(worldX(k.target, k.toX), 0.7, creatureZ(k.target));
      this.vfx.projectile(k.id, k.move, from, to, prog, dt);
    }
    this.vfx.update(dt);
  }

  private updateSide(p: PlayerIdx, dt: number, prev: SimState, curr: SimState, alpha: number) {
    const side = this.sides[p]!;
    const t = curr.trainers[p];
    const tp = prev.trainers[p];
    if (side.shown < 0 && (t.field === 'active' || t.field === 'sending')) side.shown = t.active;
    const m = this.model(p);
    if (!m) return;
    const c = t.team[side.shown]!;

    // Smooth lateral position (dodge sidestep is instantaneous in the sim).
    const targetX = tp.x + (t.x - tp.x) * alpha;
    side.dispX += (targetX - side.dispX) * Math.min(1, dt * (t.invulnTicks > 0 ? 16 : 8));

    // Visibility: appear after the orb lands, shrink on recall, fade after faint.
    let scale = 1;
    let opacity = 1;
    if (side.appear < 0) scale = 0;
    else if (side.appear < 1) { side.appear = Math.min(1, side.appear + dt * 3); scale = easeOutBack(side.appear); }
    if (side.shrink >= 0) { side.shrink += dt * 4; scale = Math.max(0, 1 - side.shrink); }
    if (side.faintT >= 0) { side.faintT += dt; opacity = Math.max(0, 1 - Math.max(0, side.faintT - 0.8) / 0.8); }
    m.root.visible = scale > 0.01 && opacity > 0.01;
    if (!m.root.visible) { side.shield.visible = false; return; }

    const facing = p === 0 ? Math.PI : 0;
    const fwd = p === 0 ? -1 : 1; // world z direction toward the opponent
    m.root.position.set(worldX(p, side.dispX), 0, creatureZ(p));
    const o = curr.trainers[p === 0 ? 1 : 0];
    const yaw = Math.atan2(worldX(p === 0 ? 1 : 0, o.x) - worldX(p, side.dispX), 6) * fwd;
    m.root.rotation.set(0, facing + yaw, 0);
    m.root.scale.setScalar(scale);

    // Base idle: bob + breathing.
    const speedK = SPECIES[m.species].speed === 'fast' ? 1.6 : SPECIES[m.species].speed === 'slow' ? 0.8 : 1.1;
    let bodyY = m.baseY + Math.sin(this.time * 2.2 * speedK + p) * 0.04;
    let bodyZ = 0;
    let lean = 0;
    let roll = 0;
    let energy = 0;
    const breathe = 1 + Math.sin(this.time * 2.6 + p) * 0.025;
    m.body.scale.set(breathe, 1 / breathe, breathe);

    // Action animation.
    const run = t.action;
    if (run && side.faintT < 0) {
      const k = Math.min(1, Math.max(0, 1 - (run.left - alpha) / Math.max(1, run.total)));
      const a = run.action;
      if (a.kind === 'move') {
        const mv = MOVES[a.move];
        const dash = DASH[a.move] ?? 0;
        if (run.phase === 'windup') {
          energy = k;
          lean = -0.25 * k;
          bodyY -= 0.06 * k;
          if (dash && k > 0.6) bodyZ = dash * easeIn((k - 0.6) / 0.4);
          if (Math.random() < 0.3 + k) this.vfx.emit(CHARGE_FX[mv.element] ?? 'dust', this.creaturePos(p, curr), mv.heavy ? 2 : 1, 0.5);
        } else if (run.phase === 'active') {
          energy = 1;
          if (dash) bodyZ = dash;
          else if (mv.delivery === 'self') bodyY += Math.sin(k * Math.PI) * 0.25;
          else { lean = 0.15; bodyZ = -0.15 * (1 - k); }
        } else {
          energy = 1 - k;
          if (dash) bodyZ = dash * (1 - easeOut(k));
          lean = 0.1 * (1 - k);
        }
      } else if (a.kind === 'dodge') {
        roll = (t.x > tp.x ? -1 : 1) * Math.sin(k * Math.PI) * 0.5;
        bodyY += Math.sin(k * Math.PI) * 0.25;
      } else if (a.kind === 'recall' && run.phase === 'windup') {
        energy = k;
        side.flash = Math.max(side.flash, 0.4 * k);
        if (k > 0.75) m.root.scale.setScalar(scale * (1 - (k - 0.75) * 3.6));
      }
    }

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
    m.body.rotation.set(lean, 0, roll);
    m.animate(this.time, dt, energy);

    // Status visuals.
    const shieldOn = c.shieldTicks > 0 && side.faintT < 0;
    side.shield.visible = shieldOn;
    if (shieldOn) {
      side.shield.position.copy(this.creaturePos(p, curr, 0.6));
      side.shield.scale.setScalar(Math.max(0.8, m.height * 0.6) * (1 + Math.sin(this.time * 6) * 0.04));
      if (Math.random() < 0.3) this.vfx.emit('ember', side.shield.position, 1, 0.6);
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
const easeIn = (x: number) => x * x;
const easeOut = (x: number) => 1 - (1 - x) * (1 - x);
function easeOutBack(x: number) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
