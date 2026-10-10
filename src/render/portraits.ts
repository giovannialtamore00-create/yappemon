// Small pictures of the creatures for the team screen: each model is drawn once on an offscreen canvas and cached.

import * as THREE from 'three';
import type { SpeciesId } from '../sim/types';
import { buildCreature } from './creatures';

const SIZE = 192;
const cache = new Map<SpeciesId, string>();
let renderer: THREE.WebGLRenderer | null = null;

export function portrait(sp: SpeciesId): string {
  const hit = cache.get(sp);
  if (hit !== undefined) return hit;
  let url = '';
  try {
    renderer ??= new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(SIZE, SIZE, false);
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6a7088, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(3, 5, 4);
    scene.add(sun);
    const m = buildCreature(sp);
    m.root.rotation.y = 0.55;
    m.animate(1, 0, 0);
    scene.add(m.root);
    m.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m.root);
    const size = box.getSize(new THREE.Vector3());
    const mid = box.getCenter(new THREE.Vector3());
    const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    const dist = (Math.max(size.x, size.y, size.z) * 0.5) / Math.tan(THREE.MathUtils.degToRad(14));
    cam.position.set(mid.x, mid.y + size.y * 0.1, mid.z + dist);
    cam.lookAt(mid);
    renderer.render(scene, cam);
    url = renderer.domElement.toDataURL('image/png');
    for (const mat of m.materials) mat.dispose();
  } catch {
    url = '';
  }
  cache.set(sp, url);
  return url;
}
