// Shared pieces for the procedural creature builders: the model interface, a material/mesh helper and eyes.

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
  /** Overall scale of this evolution stage (applied to `root` by the view). */
  size: number;
  /** Parts the view animates per move (may be empty). */
  legs: THREE.Object3D[];
  head: THREE.Object3D | null;
  wings: THREE.Object3D[];
  /**
   * Species-specific idle detail. `energy` 0..1 rises during windups; `run` 0..1 makes the legs
   * (or wings) cycle fast, for dashes.
   */
  animate(time: number, dt: number, energy: number, run?: number): void;
}

export type Mat = THREE.MeshStandardMaterial;

export function kit(materials: Mat[]) {
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

export function eyes(k: ReturnType<typeof kit>, parent: THREE.Object3D, x: number, y: number, z: number, r: number, iris = '#111', glow?: string) {
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
