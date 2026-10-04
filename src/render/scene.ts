import * as THREE from 'three';

export const CREATURE_Z = 3;
export const TRAINER_Z = 7.6;
export const EYE_HEIGHT = 1.6;

/** World position helpers. Player 0 stands at +z, player 1 at -z. */
export const creatureZ = (p: 0 | 1) => (p === 0 ? CREATURE_Z : -CREATURE_Z);
export const worldX = (p: 0 | 1, x: number) => (p === 0 ? x : -x);

export interface SceneCtx {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Shake amount, decays each frame. */
  shake: { amount: number };
  /** battle: first-person at the trainer; orbit: menu showcase camera. */
  cameraMode: 'battle' | 'orbit' | 'spectate';
  /** Whose eyes the battle camera uses; null = spectator (both trainers visible). */
  setPov(p: 0 | 1 | null): void;
  update(dt: number, time: number): void;
  render(): void;
}

function stoneTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#8d8676';
  g.fillRect(0, 0, 512, 512);
  // Concentric flagstone rings, drawn in polar space around the center.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const cx = 256;
  const rings = [0, 50, 105, 160, 215, 256];
  for (let r = 0; r < rings.length - 1; r++) {
    const r0 = rings[r]!, r1 = rings[r + 1]!;
    const n = Math.max(1, Math.round((r1 * Math.PI * 2) / 70));
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const shade = 118 + rnd() * 40;
      g.fillStyle = `rgb(${shade + 8},${shade},${shade - 14})`;
      g.beginPath();
      g.arc(cx, cx, r1 - 2, a0 + 0.01, a1 - 0.01);
      g.arc(cx, cx, Math.max(0, r0 + 2), a1 - 0.01, a0 + 0.01, true);
      g.closePath();
      g.fill();
    }
  }
  // Speckle / grime.
  for (let i = 0; i < 6000; i++) {
    const v = rnd() * 60;
    g.fillStyle = `rgba(${40 + v},${38 + v},${34 + v},${rnd() * 0.25})`;
    g.fillRect(rnd() * 512, rnd() * 512, 2, 2);
  }
  // Center emblem: a ring and a dividing line.
  g.strokeStyle = 'rgba(240,230,200,0.55)';
  g.lineWidth = 6;
  g.beginPath(); g.arc(cx, cx, 44, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(cx - 250, cx); g.lineTo(cx - 44, cx); g.moveTo(cx + 44, cx); g.lineTo(cx + 250, cx); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function skyDome(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(200, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color('#3f7fd6') },
      mid: { value: new THREE.Color('#a9d4f5') },
      bottom: { value: new THREE.Color('#f6e2c0') },
    },
    vertexShader: `varying vec3 vPos; void main(){ vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vPos;
      void main(){ float h = vPos.y; vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.7, h)) : mix(bottom, mid, smoothstep(-0.1, 0.08, h));
      gl_FragColor = vec4(c, 1.0); }`,
  });
  return new THREE.Mesh(geo, mat);
}

/** A generic capture orb: navy shell, gold base, glowing cyan band. */
export function makeOrb(radius = 0.18): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#1c2a4a', metalness: 0.6, roughness: 0.3 }),
  );
  const bottom = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#f2c14e', metalness: 0.7, roughness: 0.35 }),
  );
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.005, radius * 0.09, 8, 32),
    new THREE.MeshStandardMaterial({ color: '#33e0ff', emissive: '#33e0ff', emissiveIntensity: 1.6 }),
  );
  band.rotation.x = Math.PI / 2;
  const gem = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.28, 12, 8),
    new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#33e0ff', emissiveIntensity: 1.2 }),
  );
  gem.position.z = radius * 0.95;
  g.add(top, bottom, band, gem);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

function buildArena(scene: THREE.Scene) {
  const stone = new THREE.MeshStandardMaterial({ color: '#9a9284', roughness: 0.95, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: '#6f685c', roughness: 1, flatShading: true });

  // Ground outside the arena.
  const grass = new THREE.Mesh(
    new THREE.CircleGeometry(120, 48),
    new THREE.MeshStandardMaterial({ color: '#6fa35a', roughness: 1 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.31;
  grass.receiveShadow = true;
  scene.add(grass);

  // Arena floor.
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(10, 10.3, 0.6, 64),
    [new THREE.MeshStandardMaterial({ color: '#7c7568', roughness: 1 }), new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 0.9 }), dark],
  );
  floor.position.y = -0.3;
  floor.receiveShadow = true;
  scene.add(floor);

  // Outer ring of low wall blocks with gaps behind the trainers.
  const blockGeo = new THREE.BoxGeometry(1.6, 0.9, 0.9);
  const n = 34;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < 0.06) continue; // openings on the ±x axis
    const b = new THREE.Mesh(blockGeo, i % 3 === 0 ? dark : stone);
    const r = 11.2;
    b.position.set(Math.sin(a) * r, 0.15 + (i % 2) * 0.06, Math.cos(a) * r);
    b.rotation.y = a;
    b.scale.y = 0.8 + ((i * 37) % 7) / 20;
    b.castShadow = b.receiveShadow = true;
    scene.add(b);
  }
  // Pillars with braziers.
  const pillarGeo = new THREE.CylinderGeometry(0.35, 0.45, 3.2, 8);
  const fireMat = new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff7a1a', emissiveIntensity: 2.2 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const p = new THREE.Mesh(pillarGeo, stone);
    p.position.set(Math.sin(a) * 12.6, 1.3, Math.cos(a) * 12.6);
    p.castShadow = true;
    scene.add(p);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.35, 10), dark);
    bowl.position.set(p.position.x, 3.05, p.position.z);
    scene.add(bowl);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 8), fireMat);
    flame.position.set(p.position.x, 3.5, p.position.z);
    flame.userData.flame = i;
    scene.add(flame);
  }
  // Pedestals with orbs at both trainer spots.
  for (const z of [TRAINER_Z, -TRAINER_Z]) {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 1.0, 12), stone);
    // Beside the trainer, out of their own field of view.
    ped.position.set(1.8 * Math.sign(z), 0.2, z - 0.15 * Math.sign(z));
    ped.castShadow = ped.receiveShadow = true;
    scene.add(ped);
    const orb = makeOrb(0.2);
    orb.position.set(ped.position.x, 0.92, ped.position.z);
    orb.userData.spin = true;
    scene.add(orb);
    // Trainer standing platform.
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.18, 24), dark);
    plat.position.set(0, 0.09, z);
    plat.receiveShadow = true;
    scene.add(plat);
  }
  // Distant hills and a few trees for depth.
  const hillMat = new THREE.MeshStandardMaterial({ color: '#5d8f50', roughness: 1, flatShading: true });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const h = new THREE.Mesh(new THREE.ConeGeometry(10 + (i % 4) * 4, 8 + (i % 5) * 3, 7), hillMat);
    h.position.set(Math.sin(a) * 70, 0, Math.cos(a) * 70);
    scene.add(h);
  }
  const trunk = new THREE.MeshStandardMaterial({ color: '#6b4a2f' });
  const leaves = new THREE.MeshStandardMaterial({ color: '#3f7f3a', flatShading: true });
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + 0.13;
    const r = 18 + (i % 5) * 3;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.6, 6), trunk);
    tr.position.set(Math.sin(a) * r, 0.5, Math.cos(a) * r);
    const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 + (i % 3) * 0.3, 0), leaves);
    lf.position.set(tr.position.x, 2.0, tr.position.z);
    tr.castShadow = lf.castShadow = true;
    scene.add(tr, lf);
  }
}

/** A simple opponent trainer figure standing at the far end. */
function buildTrainer(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.75, 4, 12), new THREE.MeshStandardMaterial({ color }));
  body.position.y = 0.95;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ color: '#e9c7a5' }));
  head.position.y = 1.62;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#222' }));
  cap.position.y = 1.66;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.22), new THREE.MeshStandardMaterial({ color: '#2b2f3a' }));
  legs.position.y = 0.3;
  g.add(body, head, cap, legs);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

export function createScene(canvas: HTMLCanvasElement): SceneCtx {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#cfe3f2', 40, 140);
  scene.add(skyDome());

  scene.add(new THREE.HemisphereLight('#dfefff', '#6a5a40', 1.1));
  const sun = new THREE.DirectionalLight('#fff3dc', 2.4);
  sun.position.set(8, 16, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -13; sc.right = 13; sc.top = 13; sc.bottom = -13; sc.near = 1; sc.far = 45;
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 4;
  scene.add(sun);

  buildArena(scene);
  const trainers = [buildTrainer('#d1493b'), buildTrainer('#3b6fd1')];
  trainers[0]!.position.set(0, 0.18, TRAINER_Z);
  trainers[0]!.rotation.y = Math.PI;
  trainers[1]!.position.set(0, 0.18, -TRAINER_Z);
  scene.add(...trainers);

  const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 400);
  let pov: 0 | 1 = 0;
  const shake = { amount: 0 };
  const flames: THREE.Object3D[] = [];
  const orbs: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (o.userData.flame !== undefined) flames.push(o);
    if (o.userData.spin) orbs.push(o);
  });

  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  const ctx: SceneCtx = {
    renderer, scene, camera, shake, cameraMode: 'orbit',
    setPov(p) {
      pov = p ?? 0;
      trainers[0]!.visible = p !== 0;
      trainers[1]!.visible = p !== 1;
    },
    update(dt, time) {
      for (const f of flames) {
        const i = f.userData.flame as number;
        f.scale.set(1 + Math.sin(time * 9 + i) * 0.12, 1 + Math.sin(time * 13 + i * 2) * 0.2, 1);
      }
      for (const o of orbs) o.rotation.y += dt * 0.8;
      if (ctx.cameraMode === 'orbit') {
        const a = time * 0.12;
        camera.position.set(Math.sin(a) * 9.5, 3.4, Math.cos(a) * 9.5);
        camera.lookAt(0, 0.9, 0);
        return;
      }
      if (ctx.cameraMode === 'spectate') {
        // Side view of the whole arena, gently drifting.
        const a = Math.sin(time * 0.15) * 0.18;
        shake.amount = Math.max(0, shake.amount - dt * 2.5);
        const k = shake.amount * shake.amount * 0.4;
        camera.position.set(Math.cos(a) * 8.8 + (Math.random() - 0.5) * k, 3.6 + (Math.random() - 0.5) * k, Math.sin(a) * 8.8);
        camera.lookAt(0, 0.8, 0);
        return;
      }
      const s = pov === 0 ? 1 : -1;
      const sway = Math.sin(time * 0.6) * 0.04;
      const bob = Math.sin(time * 1.3) * 0.015;
      shake.amount = Math.max(0, shake.amount - dt * 2.5);
      const k = shake.amount * shake.amount;
      camera.position.set(sway + (Math.random() - 0.5) * k * 0.5, EYE_HEIGHT + bob + (Math.random() - 0.5) * k * 0.4, s * TRAINER_Z);
      camera.lookAt(sway * 0.5, 0.45, -s * 2.5);
    },
    render() {
      renderer.render(scene, camera);
    },
  };
  return ctx;
}
