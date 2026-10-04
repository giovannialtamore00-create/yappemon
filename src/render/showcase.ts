// Menu background: a creature slowly turning at the center of the arena.

import * as THREE from 'three';
import type { SpeciesId } from '../sim/types';
import { buildCreature, type CreatureModel } from './creatures';

export class Showcase {
  private model: CreatureModel | null = null;
  private species: SpeciesId | null = null;
  private appear = 0;

  constructor(private scene: THREE.Scene) {}

  show(sp: SpeciesId | null) {
    if (sp === this.species) return;
    this.species = sp;
    if (this.model) this.scene.remove(this.model.root);
    this.model = null;
    if (!sp) return;
    this.model = buildCreature(sp);
    this.model.root.scale.setScalar(1.6);
    this.scene.add(this.model.root);
    this.appear = 0;
  }

  update(dt: number, time: number) {
    const m = this.model;
    if (!m) return;
    this.appear = Math.min(1, this.appear + dt * 3);
    m.root.scale.setScalar(1.6 * (1 - Math.pow(1 - this.appear, 3)));
    m.root.rotation.y = time * 0.5;
    m.body.position.y = m.baseY + Math.sin(time * 2.2) * 0.05;
    m.animate(time, dt, 0);
  }

  hide() {
    this.show(null);
  }
}
