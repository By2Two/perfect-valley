import * as THREE from 'three';
import { grass, pavement, water, rock, verticalPlanks, deckPlanks, shingles, bricks } from '../textures.js';
import { fence } from './barn.js';
import { geoRock } from './mine.js';

export const SIZE = 32;
const HALF_SIZE = SIZE / 2;
const FENCE_EDGE = HALF_SIZE - 0.4;
const TUFT_COUNT = 190;
export const LAKE = { x: 3.0, z: 6.8, r: 3.2, width: 4.6 };
const SQRT_HALF = Math.SQRT1_2;
function lakeDistance(x, z) {
  const dx = x - LAKE.x;
  const dz = z - LAKE.z;
  const u = (dx - dz) * SQRT_HALF;
  const v = (dx + dz) * SQRT_HALF;
  return Math.hypot((u / LAKE.width) * LAKE.r, v);
}
function onShore(angle, k = 1) {
  const u = Math.cos(angle) * LAKE.width * k;
  const v = Math.sin(angle) * LAKE.r * k;
  return [LAKE.x + (u + v) * SQRT_HALF, LAKE.z + (v - u) * SQRT_HALF];
}
const OCCUPIED = [
  [-9.2, -9.2, -2, -2],
  [-2.2, -3.9, -0.4, -2.5],
  [-0.4, -9.2, 6.4, 0.6],
  [-14.8, -0.6, -7.6, 9.4],
  [7.2, -15, 15, -7],
  [-3, -11.6, 8, -9.4],
  [-13.1, -5.1, -11.1, -3.1],
  [-6.4, -2.6, -4.6, 14],
  [-13.4, -11, -10.2, -8],
  [-2.4, -7, -0.2, -5.5],
  [12.6, 5.4, 14.6, 7.4],
  [-5, -2, 0.2, -1],
  [6, -2.4, 7.4, -0.4],
];
const PINE_COLORS = { spring: 0x3e8c4a, summer: 0x2f7a3e, fall: 0x92902c, winter: 0x7fb4cc };
const SEASON_FADE_SECONDS = 2.6;
const ease = (k) => k * k * (3 - 2 * k);
const SEASON_REPAINT_SECONDS = 0.07;
const BUSH_COLORS = { spring: 0x5fae3e, summer: 0x3f8f2f, fall: 0xb5812c, winter: 0x8fcada };
const LEAF_SHADOW = 0xb4b4b4;
const LEAF_MIDDLE = 0xd8d8d8;
const LEAF_LIGHT = 0xffffff;
const PATH_COLORS = { spring: 0xc4b8a4, summer: 0xc4b8a4, fall: 0xc2a684, winter: 0xe2ddd6 };

function tileMesh(list, material, y = 0) {
  const n = list.length;
  const position = new Float32Array(n * 18);
  const nor = new Float32Array(n * 18);
  const uv = new Float32Array(n * 12);
  const color = new Float32Array(n * 18);
  list.forEach((t, i) => {
    const w = (t.w ?? 1) / 2;
    const d = (t.d ?? 1) / 2;
    const yy = t.y ?? y;
    const corners = [
      [t.x - w, t.z + d],
      [t.x + w, t.z + d],
      [t.x + w, t.z - d],
      [t.x - w, t.z + d],
      [t.x + w, t.z - d],
      [t.x - w, t.z - d],
    ];
    corners.forEach(([x, z], j) => {
      position.set([x, yy, z], i * 18 + j * 3);
      nor.set([0, 1, 0], i * 18 + j * 3);
      uv.set([x, -z], i * 12 + j * 2);
    });
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(color, 3));
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  const c = new THREE.Color();
  function paint(fn) {
    list.forEach((t, i) => {
      fn(t, c);
      for (let j = 0; j < 6; j++) {
        color.set([c.r, c.g, c.b], i * 18 + j * 3);
      }
    });
    geo.attributes.color.needsUpdate = true;
  }
  return { mesh, paint };
}

export function buildScenery(u, { field }) {
  const { scene, builder, materialTexture, clickable, group, random, lanternMaterial, snowMaterial } = u;
  const free = (x, z, slack = 1) =>
    lakeDistance(x, z) > LAKE.r + slack &&
    !OCCUPIED.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1) &&
    Math.abs(x) < HALF_SIZE - 0.8 &&
    Math.abs(z) < HALF_SIZE - 0.8;

  const isPath = (x, z) => (x === -5.5 && z > -2.4 && z < HALF_SIZE) || (z === -1.5 && x > -5.5 && x < field.x0);
  const borderStones = [];
  for (let z = -1.25; z < HALF_SIZE - 0.5; z += 0.5) {
    [-6.25, -4.75].forEach((x) => {
      if (random() < 0.3) {
        borderStones.push({ x, z, w: 0.5, d: 0.5, y: 0.004 });
      }
    });
  }
  for (let x = -4.25; x < field.x0 - 0.5; x += 0.5) {
    [-2.25, -0.75].forEach((z) => {
      if (random() < 0.3) {
        borderStones.push({ x, z, w: 0.5, d: 0.5, y: 0.004 });
      }
    });
  }

  const tilesGrass = [];
  const tilesSand = [];
  const tilesPath = [];
  const tilesWater = [];
  for (let gx = 0; gx < SIZE; gx++) {
    for (let gz = 0; gz < SIZE; gz++) {
      const x = gx - HALF_SIZE + 0.5;
      const z = gz - HALF_SIZE + 0.5;
      const d = lakeDistance(x, z);
      const t = { x, z, v: (gx * 7 + gz * 13 + ((gx * gz) % 5)) % 4 };
      if (d < LAKE.r) {
        tilesWater.push(t);
      } else if (isPath(x, z)) {
        tilesPath.push(t);
      } else if (d < LAKE.r + 0.9) {
        tilesSand.push(t);
      } else {
        tilesGrass.push(t);
      }
    }
  }
  const terrain = new THREE.Group();
  scene.add(terrain);
  const grassMaterial = new THREE.MeshLambertMaterial({ map: grass({ base: 0xeeeeee }), vertexColors: true });
  const ground = tileMesh(tilesGrass, grassMaterial);
  const sand = tileMesh(tilesSand, grassMaterial);
  const path = tileMesh([...tilesPath, ...borderStones], new THREE.MeshLambertMaterial({ map: pavement({ stone: 0xeeeeee }), vertexColors: true }));
  terrain.add(ground.mesh, sand.mesh, path.mesh);

  const kb = builder();
  const mEarth = materialTexture(rock({ base: 0x8a5a2b }));
  const mStone = materialTexture(rock({ base: 0x857868 }));
  const lipMaterial = new THREE.MeshLambertMaterial({ map: grass({ base: 0xeeeeee }), color: 0x6daa2c });
  kb.box([SIZE, 0.3, SIZE], mEarth, { position: [0, -2.6, 0], outline: true });
  kb.box([SIZE, 2.3, SIZE], mEarth, { position: [0, -2.6, 0], outline: true });
  kb.box([SIZE - 1.2, 1.6, SIZE - 1.2], mStone, { position: [0, -4.2, 0], outline: true });
  kb.box([SIZE - 3.6, 1.4, SIZE - 3.6], mStone, { position: [0, -5.6, 0], color: 0xd8d8d8, outline: true });
  kb.box([SIZE - 7.5, 1.3, SIZE - 7.5], mStone, { position: [0, -6.9, 0], color: 0xc0c0c0, outline: true });
  kb.box([8, 1.4, 8], mStone, { position: [0.5, -8.3, -0.5], color: 0xb0b0b0, outline: true });
  for (let i = 0; i < 18; i++) {
    const s = -HALF_SIZE + 1 + random() * (SIZE - 2);
    const side = i % 2;
    const y = -0.9 - random() * 3.2;
    const w = 0.8 + random() * 1.6;
    const h = 0.5 + random() * 0.9;
    const stone = y < -2.6;
    const [x, z] = side ? [HALF_SIZE + 0.12, s] : [s, HALF_SIZE + 0.12];
    kb.box([side ? 0.4 : w, h, side ? w : 0.4], stone ? mStone : mEarth, { position: [x, y, z], color: stone ? 0xd0d0d0 : 0xc8c8c8 });
  }
  const roots = builder();
  for (let i = 0; i < 26; i++) {
    const s = -HALF_SIZE + 0.5 + random() * (SIZE - 1);
    const side = i % 2;
    const h = 0.4 + random() * 0.9;
    const [x, z] = side ? [HALF_SIZE + 0.04, s] : [s, HALF_SIZE + 0.04];
    roots.box([0.08, h, 0.08], i % 3 ? 0x6e4222 : 0x4f9a3a, { position: [x, -0.3 - h, z] });
  }
  kb.mount(terrain, { shadow: false });
  roots.mount(terrain, { shadow: false });
  const lip = new THREE.Mesh(new THREE.BoxGeometry(SIZE + 0.02, 0.3, SIZE + 0.02).translate(0, -0.21, 0), lipMaterial);
  terrain.add(lip);

  const waterTexture = water({ base: 0xe8f4ff });
  const waterMaterial = new THREE.MeshLambertMaterial({ map: waterTexture, vertexColors: true, color: 0x3f8fd6 });
  const waterTileMesh = tileMesh(tilesWater, waterMaterial, -0.04);
  waterTileMesh.paint((t, c) => c.setHex(0xffffff));
  const kl = builder();
  const kLilyPad = builder();
  [0.8, 2.0, 3.4, 4.6, 5.7]
    .map((a, i) => onShore(a, i % 2 ? 0.45 : 0.62))
    .forEach(([x, z], i) => {
      kLilyPad.piece(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 8), 0x4f9a3a, { position: [x, 0.0, z] });
      if (i % 2 === 0) {
        kLilyPad.box([0.14, 0.1, 0.14], 0xf08ab8, { position: [x + 0.1, 0.02, z - 0.05] });
      }
    });
  const mDeck = materialTexture(deckPlanks({ base: 0xb87a42 }));
  let front = 0;
  while (lakeDistance(LAKE.x, LAKE.z + front) < LAKE.r) {
    front += 0.05;
  }
  const px = LAKE.x + 0.2;
  const pz = LAKE.z + front - 0.7;
  kl.box([1.1, 0.1, 2.8], mDeck, { position: [px, 0.08, pz], outline: true });
  [
    [-0.5, -1.2],
    [0.5, -1.2],
    [-0.5, -0.1],
    [0.5, -0.1],
  ].forEach(([x, z]) => kl.box([0.14, 0.4, 0.14], 0x6e4222, { position: [px + x, -0.2, pz + z] }));
  kl.box([0.18, 0.5, 0.18], 0x6e4222, { position: [px - 0.5, 0, pz - 1.35] });
  [2.3, 2.9, 4.1, 5.5, 0.4]
    .map((a) => onShore(a, 0.97))
    .forEach(([x, z], i) => {
      for (let j = 0; j < 3; j++) {
        const h = 0.6 + ((i + j) % 3) * 0.15;
        kl.box([0.05, h, 0.05], 0x4f9a3a, { position: [x + j * 0.12, 0, z + (j % 2) * 0.1] });
        kl.box([0.09, 0.2, 0.09], 0x7a4a26, { position: [x + j * 0.12, h - 0.1, z + (j % 2) * 0.1] });
      }
    });
  const mRock = materialTexture(rock({ base: 0xc8c8c8 }));
  [
    [0.3, 0.3],
    [1.9, 0.35],
    [3.6, 0.25],
    [5.0, 0.28],
    [3.0, 0.22],
  ]
    .map(([a, r]) => [...onShore(a, 1.18), r])
    .forEach(([x, z, r], i) => {
      kl.piece(geoRock(r, 200 + i), mRock, { color: 0xa4a7ab, position: [x, r * 0.4, z] });
    });
  const lakeG = group(0, 0, waterTileMesh.mesh);
  kl.mount(lakeG);
  const lilyPads = [...kLilyPad.mount(lakeG, { shadow: false }).values()];
  const fish = new THREE.Group();
  const kp = builder();
  kp.box([0.45, 0.22, 0.18], 0xe8833a, { position: [0, -0.11, 0] });
  kp.box([0.14, 0.2, 0.06], 0xd8603a, { position: [-0.28, -0.1, 0] });
  kp.box([0.06, 0.06, 0.2], 0x1a1410, { position: [0.14, 0, 0] });
  kp.mount(fish, { shadow: false });
  fish.visible = false;
  lakeG.add(fish);
  clickable(lakeG, 'fishing');

  const kc = builder();
  fence(kc, [
    [-FENCE_EDGE, FENCE_EDGE],
    [-6.3, FENCE_EDGE],
  ]);
  fence(kc, [
    [-4.7, FENCE_EDGE],
    [FENCE_EDGE, FENCE_EDGE],
  ]);
  fence(kc, [
    [FENCE_EDGE, FENCE_EDGE],
    [FENCE_EDGE, -FENCE_EDGE],
  ]);
  fence(kc, [
    [FENCE_EDGE, -FENCE_EDGE],
    [-FENCE_EDGE, -FENCE_EDGE],
  ]);
  fence(kc, [
    [-FENCE_EDGE, -FENCE_EDGE],
    [-FENCE_EDGE, FENCE_EDGE],
  ]);
  [-6.3, -4.7].forEach((x) => {
    kc.box([0.3, 1.25, 0.3], 0x6e4222, { position: [x, 0, FENCE_EDGE], outline: true });
    kc.box([0.38, 0.1, 0.38], 0x8a5a2b, { position: [x, 1.25, FENCE_EDGE] });
  });
  kc.box([1.9, 0.14, 0.14], 0x8a5a2b, { position: [-5.5, 1.1, FENCE_EDGE] });
  kc.box([1.2, 0.36, 0.08], 0xc68b4e, { position: [-5.5, 1.3, FENCE_EDGE], outline: true });
  kc.box([0.8, 0.06, 0.09], 0x5b3a1e, { position: [-5.5, 1.48, FENCE_EDGE] });
  kc.box([0.6, 0.06, 0.09], 0x5b3a1e, { position: [-5.5, 1.38, FENCE_EDGE] });

  const leafMaterial = new THREE.MeshLambertMaterial({ map: grass({ base: 0xf4f4f4 }), vertexColors: true, color: 0x6ec24a });
  const bushMaterial = new THREE.MeshLambertMaterial({ map: grass({ base: 0xf4f4f4 }), vertexColors: true, color: BUSH_COLORS.spring });
  const pineMaterial = new THREE.MeshLambertMaterial({ map: grass({ base: 0xf4f4f4 }), vertexColors: true, color: PINE_COLORS.spring });
  const mBark = materialTexture(verticalPlanks({ base: 0x7a4a26, width: 2 }));
  const kTrunk = builder();
  const trees = [];
  function oak(x, z, s) {
    kTrunk.box([0.5 * s, 1.3 * s, 0.5 * s], mBark, { position: [x, 0, z], outline: true });
    kTrunk.box([0.8 * s, 0.18 * s, 0.24 * s], mBark, { position: [x, 0, z], color: 0xc0c0c0 });
    kTrunk.box([0.24 * s, 0.18 * s, 0.8 * s], mBark, { position: [x, 0, z], color: 0xc0c0c0 });
    const k = builder();
    const kFlower = builder();
    const kSnow = builder();
    const leafBlock = ([w, h, d], color, { position: [x, y, z], outline = true }) =>
      k.box([w * s, h * s, d * s], leafMaterial, { position: [x * s, y * s, z * s], color, outline });
    leafBlock([2.0, 0.6, 2.0], LEAF_SHADOW, { position: [0, 0, 0] });
    leafBlock([2.4, 0.9, 1.8], LEAF_MIDDLE, { position: [0, 0.45, 0] });
    leafBlock([1.8, 0.9, 2.4], LEAF_MIDDLE, { position: [0, 0.45, 0] });
    leafBlock([1.7, 0.6, 1.7], LEAF_LIGHT, { position: [0, 1.3, 0] });
    leafBlock([0.9, 0.35, 0.9], LEAF_LIGHT, { position: [0, 1.85, 0], outline: false });
    leafBlock([0.7, 0.6, 0.7], LEAF_MIDDLE, { position: [1.15, 0.3, 0.55], outline: false });
    leafBlock([0.6, 0.5, 0.6], LEAF_SHADOW, { position: [-0.95, 0.2, 0.9], outline: false });
    leafBlock([0.6, 0.5, 0.6], LEAF_MIDDLE, { position: [0.5, 0.9, -1.15], outline: false });
    [
      [0.9, 0.95, 0.92],
      [-0.6, 0.7, 0.95],
      [1.22, 0.55, -0.4],
      [-0.3, 1.55, 0.86],
      [0.2, 0.6, 1.24],
      [-1.22, 1.0, 0.1],
    ].forEach(([fx, fy, fz], i) => {
      kFlower.box([0.2 * s, 0.2 * s, 0.2 * s], i % 3 ? 0xf7b6d2 : 0xfff4e0, { position: [fx * s, fy * s, fz * s] });
    });
    kSnow.box([1.8 * s, 0.18 * s, 1.8 * s], snowMaterial, { color: 0xf6fafc, position: [0, 1.9 * s, 0] });
    kSnow.box([1.0 * s, 0.16 * s, 1.0 * s], snowMaterial, { color: 0xf6fafc, position: [0, 2.2 * s, 0] });
    kSnow.box([2.0 * s, 0.14 * s, 1.0 * s], snowMaterial, { color: 0xf6fafc, position: [0, 1.35 * s, 0.75 * s] });
    const kBare = builder();
    const thin = 0.13 * s;
    kBare.box([0.22 * s, 2.3 * s, 0.22 * s], mBark, { position: [0, -0.4 * s, 0], outline: true });
    const arm = ([dx, dz], y, length) => {
      const reach = (0.11 + length / 2) * s;
      const tip = (0.11 + length - 0.07) * s;
      const size = dx !== 0 ? [length * s, thin, thin] : [thin, thin, length * s];
      kBare.box(size, mBark, { position: [dx * reach, y * s, dz * reach], outline: true });
      kBare.box([thin, 0.7 * s, thin], mBark, { position: [dx * tip, y * s, dz * tip], outline: true });
    };
    [
      [[1, 0], 0.3, 0.95],
      [[0, -1], 0.55, 0.85],
      [[-1, 0], 0.8, 0.9],
      [[0, 1], 1.05, 0.8],
      [[1, 0], 1.3, 0.6],
      [[-1, 0], 1.5, 0.5],
    ].forEach(([direction, y, length]) => arm(direction, y, length));
    kBare.box([thin, 0.5 * s, thin], mBark, { position: [0, 1.9 * s, 0], outline: true });
    return { k, kFlower, kSnow, kBare, kCone: null, alt: 1.15 * s, kind: 'oak' };
  }
  function pine(x, z, s) {
    kTrunk.box([0.36 * s, 0.7 * s, 0.36 * s], mBark, { position: [x, 0, z], outline: true });
    const k = builder();
    const kSnow = builder();
    const kCone = builder();
    [
      [2.1, 0],
      [1.7, 0.6],
      [1.3, 1.2],
      [0.85, 1.75],
      [0.42, 2.2],
    ].forEach(([w, y], i) => {
      const color = [LEAF_SHADOW, LEAF_MIDDLE, LEAF_MIDDLE, LEAF_LIGHT, LEAF_LIGHT][i];
      k.piece(new THREE.BoxGeometry(w * s, 0.62 * s, w * s), pineMaterial, {
        color,
        rot: new THREE.Euler(0, i % 2 ? Math.PI / 4 : 0, 0),
        position: [0, (y + 0.31) * s, 0],
        outline: true,
      });
      kSnow.piece(new THREE.BoxGeometry(w * 0.82 * s, 0.1 * s, w * 0.82 * s), snowMaterial, {
        color: 0xf6fafc,
        rot: new THREE.Euler(0, i % 2 ? Math.PI / 4 : 0, 0),
        position: [0, (y + 0.64) * s, 0],
      });
      if (i < 4) {
        [0.6, -0.5].forEach((side, j) => {
          kCone.box([0.14 * s, 0.14 * s, 0.14 * s], 0xc0442e, {
            position: [w * 0.34 * side * s, (y + 0.42) * s, w * 0.3 * (j ? side : -side) * s],
          });
        });
      }
    });
    return { k, kFlower: null, kSnow, kBare: null, kCone, alt: 0.6 * s, kind: 'pine' };
  }
  [
    [-12.6, -12.5, 1.0, 'p'],
    [-8.4, -12.4, 1.0, 'c'],
    [-4.8, -12.8, 1.0, 'p'],
    [3.6, -12.8, 0.8, 'c'],
    [-8.2, 12.4, 1.0, 'c'],
    [12.6, -4.2, 1.05, 'c'],
    [12.6, 12.6, 0.8, 'p'],
    [-3.4, 12.6, 0.85, 'p'],
    [-2.8, 10.8, 0.85, 'c'],
    [12.4, 1.2, 1.05, 'c'],
    [9.8, 3.6, 0.85, 'p'],
    [10.0, 9.0, 1.0, 'c'],
    [-12.6, 11.8, 0.85, 'p'],
  ].forEach(([x, z, s, kind]) => {
    const a = (kind === 'p' ? pine : oak)(x, z, s);
    const g = group(x, z);
    const canopy = new THREE.Group();
    canopy.position.y = a.alt;
    g.add(canopy);
    const groupedSoOutlineHidesToo = (kBuilder, options) => {
      const holder = new THREE.Group();
      canopy.add(holder);
      kBuilder?.mount(holder, options);
      return holder;
    };
    const leaves = groupedSoOutlineHidesToo(a.k);
    const flowers = a.kFlower ? [...a.kFlower.mount(canopy, { shadow: false }).values()] : [];
    const snow = [...a.kSnow.mount(canopy, { shadow: false }).values()];
    snow.forEach((n) => {
      n.visible = a.kind === 'pine';
    });
    const bare = groupedSoOutlineHidesToo(a.kBare);
    const cones = groupedSoOutlineHidesToo(a.kCone, { shadow: false });
    trees.push({ canopy, leaves, flowers, snow, bare, cones, kind: a.kind, phase: random() * 6 });
  });

  const kd = builder();
  const kBerries = builder();
  [
    [-9.6, -3.3],
    [-3.2, 6.6],
    [-6.8, 10.6],
    [8.0, -3.4],
    [11.6, 6.4],
    [0.4, 12.6],
    [-3.4, -8.6],
    [6.8, -12.6],
    [12.4, 9.6],
    [7.9, 12.6],
  ].forEach(([x, z], i) => {
    kd.box([0.95, 0.5, 0.8], bushMaterial, { position: [x, 0, z], color: LEAF_SHADOW, outline: true });
    kd.box([0.7, 0.35, 0.95], bushMaterial, { position: [x, 0.1, z], color: LEAF_MIDDLE, outline: true });
    kd.box([0.55, 0.25, 0.55], bushMaterial, { position: [x, 0.45, z], color: LEAF_LIGHT });
    [
      [0.3, 0.42, 0.3],
      [-0.25, 0.3, 0.38],
      [0.1, 0.62, -0.2],
    ].forEach(([dx, dy, dz]) => {
      kBerries.box([0.1, 0.1, 0.1], i % 2 ? 0xd8343b : 0xf07a9a, { position: [x + dx, dy, z + dz] });
    });
  });
  [
    [-12.8, -7.0],
    [8.0, 10.8],
    [-1.6, 4.0],
    [-7.6, -10.6],
  ].forEach(([x, z]) => {
    kd.piece(new THREE.CylinderGeometry(0.32, 0.38, 0.4, 8), mBark, { position: [x, 0.2, z], uv: true, outline: true });
    kd.piece(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 8), 0xd8a870, { position: [x, 0.41, z] });
    kd.piece(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 8), 0xb88a50, { position: [x, 0.415, z] });
  });
  const mCrate = materialTexture(deckPlanks({ base: 0xc68b4e }));
  const barrel = (x, z) => {
    kd.piece(new THREE.CylinderGeometry(0.32, 0.32, 0.75, 10), mCrate, { color: 0xd8b090, position: [x, 0.375, z], outline: true });
    [0.15, 0.6].forEach((y) => kd.piece(new THREE.CylinderGeometry(0.335, 0.335, 0.07, 10), 0x4a4e55, { position: [x, y, z] }));
    kd.piece(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 10), 0x8a5a2b, { position: [x, 0.76, z] });
  };
  const crate = ([x, y, z], s = 0.6) => {
    kd.box([s, s, s], mCrate, { position: [x, y, z], outline: true });
    kd.box([s + 0.02, 0.06, 0.06], 0x7a4a26, { position: [x, y + s / 2 - 0.03, z + s / 2 - 0.02] });
    kd.box([0.06, s + 0.02, 0.06], 0x7a4a26, { position: [x, y, z + s / 2 - 0.02] });
  };
  barrel(-9.1, -2.9);
  barrel(-9.7, -2.4);
  crate([-8.9, 0, -1.9]);
  crate([-8.9, 0.6, -1.9], 0.45);
  barrel(-8.5, 2.4);
  crate([-8.5, 0, 3.4]);
  crate([-8.5, 0.6, 3.4], 0.45);
  const kStones = builder();
  for (let i = 0, n = 0; i < 300 && n < 22; i++) {
    const x = (random() - 0.5) * (SIZE - 2);
    const z = (random() - 0.5) * (SIZE - 2);
    if (!free(x, z, 1.2)) {
      continue;
    }
    n++;
    if (n % 3 === 0) {
      kStones.piece(new THREE.BoxGeometry(0.6, 0.06, 0.07), 0x7a4a26, { rot: new THREE.Euler(0, random() * 3, 0), position: [x, 0.03, z] });
      kStones.piece(new THREE.BoxGeometry(0.22, 0.05, 0.06), 0x7a4a26, {
        rot: new THREE.Euler(0, random() * 3, 0),
        position: [x + 0.15, 0.03, z + 0.08],
      });
    } else {
      const r = 0.12 + random() * 0.18;
      kStones.piece(geoRock(r, 300 + i), mRock, { color: n % 2 ? 0xa4a7ab : 0x8a8d92, position: [x, r * 0.3, z] });
    }
  }
  const decoration = group(0, 0);
  kd.mount(decoration);
  kc.mount(decoration);
  kTrunk.mount(decoration);
  kStones.mount(decoration);
  const berries = [...kBerries.mount(decoration, { shadow: false }).values()];

  const kl2 = builder();
  const postLights = [
    [-4.4, 1.6],
    [-4.4, 9.4],
  ].map(([x, z]) => {
    kl2.box([0.3, 0.2, 0.3], 0x3b3f45, { position: [x, 0, z] });
    kl2.box([0.12, 2.1, 0.12], 0x3b3f45, { position: [x, 0.2, z], outline: true });
    kl2.box([0.5, 0.08, 0.08], 0x3b3f45, { position: [x - 0.2, 2.2, z] });
    kl2.box([0.34, 0.42, 0.34], lanternMaterial, { position: [x - 0.38, 1.72, z] });
    kl2.box([0.42, 0.08, 0.42], 0x3b3f45, { position: [x - 0.38, 2.14, z] });
    kl2.box([0.4, 0.06, 0.4], 0x3b3f45, { position: [x - 0.38, 1.68, z] });
    kl2.box([0.12, 0.08, 0.12], 0xf2c230, { position: [x - 0.38, 2.22, z] });
    const light = new THREE.PointLight(0xffc870, 0, 9, 1.6);
    light.position.set(x - 0.38, 2.0, z);
    scene.add(light);
    return light;
  });
  kl2.mount(decoration);

  const kPalm = builder();
  const kLeafPalm = builder();
  for (let i = 0; i < 6; i++) {
    const off = Math.sin(i * 0.5) * 0.25;
    kPalm.box([0.42 - i * 0.02, 0.62, 0.42 - i * 0.02], i % 2 ? 0x9a6a3a : 0x8a5a2b, { position: [off, i * 0.62, 0], outline: true });
    kPalm.box([0.46 - i * 0.02, 0.08, 0.46 - i * 0.02], 0x6e4222, { position: [off, i * 0.62 + 0.54, 0] });
  }
  const topPalm = [Math.sin(5 * 0.5) * 0.25, 3.75];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const rot = new THREE.Euler(0, -a, 0);
    const g1 = new THREE.BoxGeometry(1.0, 0.08, 0.36).translate(0.5, 0, 0).rotateZ(0.25);
    const g2 = new THREE.BoxGeometry(0.8, 0.07, 0.3).translate(0.4, 0, 0).rotateZ(-0.6).translate(0.95, 0.24, 0);
    [g1, g2].forEach((g, j) => kLeafPalm.piece(g, j ? 0x4fa33a : 0x3f8f2f, { rot, position: [topPalm[0], topPalm[1], 0] }));
  }
  [
    [0.18, 0.1],
    [-0.12, 0.16],
    [0.04, -0.18],
  ].forEach(([dx, dz]) => kPalm.box([0.2, 0.2, 0.2], 0x6e4222, { position: [topPalm[0] + dx, topPalm[1] - 0.25, dz] }));
  const walnutMaterial = new THREE.MeshLambertMaterial({ color: 0xf2c230, emissive: 0x6a4a00 });
  const walnut = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.46, 0.4), walnutMaterial);
  walnut.position.set(0.7, 0.25, 0.7);
  walnut.castShadow = true;
  walnut.userData.withoutGhost = true;
  const palmTree = group(13.6, 6.4, walnut);
  kPalm.mount(palmTree);
  kLeafPalm.mount(palmTree);
  clickable(palmTree, 'walnuts');

  const km = builder();
  const mTower = materialTexture(verticalPlanks({ base: 0xe8c98d }));
  km.box([2.5, 0.5, 2.5], materialTexture(bricks({ base: 0x9a958c })), { position: [0, 0, 0], outline: true });
  km.box([2.1, 3.2, 2.1], mTower, { position: [0, 0.5, 0], outline: true });
  km.box([2.3, 0.2, 2.3], 0x8a5a2b, { position: [0, 3.7, 0] });
  km.piece(new THREE.ConeGeometry(1.9, 1.7, 4), materialTexture(shingles({ base: 0x8a5a2b })), {
    rot: new THREE.Euler(0, Math.PI / 4, 0),
    position: [0, 4.75, 0],
    outline: true,
  });
  km.box([0.7, 1.15, 0.08], 0x5b3a1e, { position: [0.3, 0.5, 1.06] });
  km.box([0.08, 0.08, 0.1], 0xf2c230, { position: [0.5, 1.05, 1.1] });
  km.box([0.55, 0.55, 0.08], u.windowMaterial, { position: [-0.4, 2.3, 1.06] });
  km.box([0.7, 0.08, 0.12], 0x5b3a1e, { position: [-0.4, 2.2, 1.08] });
  km.box([0.08, 0.55, 0.06], 0x5b3a1e, { position: [-0.4, 2.3, 1.1] });
  km.box([0.35, 0.35, 0.3], 0x5b3a1e, { position: [0, 4.0, 1.2] });
  const mill = group(-11.8, -9.6);
  km.mount(mill);
  const blades = new THREE.Group();
  blades.position.set(0, 4.17, 1.42);
  const kBlades = builder();
  for (let i = 0; i < 4; i++) {
    const rot = new THREE.Euler(0, 0, (i * Math.PI) / 2);
    kBlades.piece(new THREE.BoxGeometry(0.12, 2.5, 0.08).translate(0, 1.25, 0), 0x6e4222, { rot });
    kBlades.piece(new THREE.BoxGeometry(0.55, 1.9, 0.04).translate(0.33, 1.4, 0.02), 0xf3ddb0, { rot });
    [0.7, 1.3, 1.9].forEach((y) => kBlades.piece(new THREE.BoxGeometry(0.62, 0.05, 0.06).translate(0.33, y, 0.05), 0x8a5a2b, { rot }));
  }
  kBlades.box([0.3, 0.3, 0.2], 0x5b3a1e, { position: [0, -0.15, 0.05] });
  kBlades.mount(blades);
  mill.add(blades);

  const m4 = new THREE.Matrix4();
  const color = new THREE.Color();
  const flowerPoints = [];
  for (let i = 0; i < 700 && flowerPoints.length < 120; i++) {
    const x = (random() - 0.5) * (SIZE - 2);
    const z = (random() - 0.5) * (SIZE - 2);
    if (free(x, z)) {
      flowerPoints.push([x, z]);
    }
  }
  const kFlower = builder();
  kFlower.box([0.05, 0.2, 0.05], 0xffffff, { position: [0, 0, 0] });
  kFlower.box([0.22, 0.08, 0.08], 0xffffff, { position: [0, 0.2, 0] });
  kFlower.box([0.08, 0.08, 0.22], 0xffffff, { position: [0, 0.2, 0] });
  const flowers = new THREE.InstancedMesh(kFlower.join(), new THREE.MeshLambertMaterial({ vertexColors: true }), flowerPoints.length);
  flowerPoints.forEach(([x, z], i) => flowers.setMatrixAt(i, m4.makeRotationY(i).setPosition(x, 0, z)));
  scene.add(flowers);
  const kTuft = builder();
  kTuft.box([0.06, 0.3, 0.06], 0xffffff, { position: [0, 0, 0] });
  kTuft.piece(new THREE.BoxGeometry(0.05, 0.24, 0.05), 0xffffff, { rot: new THREE.Euler(0, 0, 0.4), position: [0.06, 0.1, 0.02] });
  kTuft.piece(new THREE.BoxGeometry(0.05, 0.22, 0.05), 0xffffff, { rot: new THREE.Euler(0.4, 0, -0.3), position: [-0.05, 0.1, -0.04] });
  const tufts = new THREE.InstancedMesh(kTuft.join(), new THREE.MeshLambertMaterial({ vertexColors: true }), TUFT_COUNT);
  const tuftPoints = [];
  for (let i = 0; tuftPoints.length < TUFT_COUNT && i < 800; i++) {
    const x = (random() - 0.5) * (SIZE - 1);
    const z = (random() - 0.5) * (SIZE - 1);
    if (!free(x, z, 0.4)) {
      continue;
    }
    tufts.setMatrixAt(tuftPoints.length, m4.makeRotationY(i).setPosition(x, 0, z));
    tuftPoints.push([x, z, i]);
  }
  scene.add(tufts);

  let season = 'spring';
  let fromSeason = 'spring';
  let palette = null;
  let fromPalette = null;
  let blend = 1;
  const mix = new THREE.Color();
  const scratch = new THREE.Vector3();
  const blendHex = ([a, b], k, out) => out.setHex(a).lerp(mix.setHex(b), k);
  function seasonAmount(name, k) {
    if (season === name) {
      return k;
    }
    return fromSeason === name ? 1 - k : 0;
  }
  function flagAmount(k, before, after) {
    if (k < 0.5) {
      return before ? 1 - k * 2 : 0;
    }
    return after ? k * 2 - 1 : 0;
  }

  function growInstances(mesh, points, amount) {
    mesh.visible = amount > 0.02;
    if (!mesh.visible) {
      return;
    }
    points.forEach(([x, z, spin], i) => {
      m4.makeRotationY(spin ?? i)
        .scale(scratch.set(1, amount, 1))
        .setPosition(x, 0, z);
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  function paintSeason(k) {
    const from = fromPalette;
    const to = palette;
    ground.paint((t, c) => blendHex([from.grass[t.v], to.grass[t.v]], k, c));
    sand.paint((t, c) => blendHex([from.sand, to.sand], k, c).offsetHSL(0, 0, t.v % 2 ? -0.03 : 0));
    path.paint((t, c) => blendHex([PATH_COLORS[fromSeason], PATH_COLORS[season]], k, c).offsetHSL(0, 0, ((t.v ?? 1) - 1.5) * 0.03));
    blendHex([from.grass[3], to.grass[3]], k, lipMaterial.color).offsetHSL(0, 0, -0.05);
    blendHex([from.leaves[0], to.leaves[0]], k, leafMaterial.color);
    blendHex([PINE_COLORS[fromSeason], PINE_COLORS[season]], k, pineMaterial.color);
    blendHex([BUSH_COLORS[fromSeason], BUSH_COLORS[season]], k, bushMaterial.color);
    blendHex([from.water[0], to.water[0]], k, waterMaterial.color);

    const winter = seasonAmount('winter', k);
    const autumn = seasonAmount('fall', k);
    const bloom = flagAmount(k, fromPalette.flower, palette.flower);
    const past = k < 0.5;
    trees.forEach((a) => {
      const bareness = a.kind === 'oak' ? winter : 0;
      a.leaves.visible = bareness < 0.98;
      a.leaves.scale.setScalar(Math.max(0.02, 1 - bareness));
      a.bare.visible = bareness > 0.02;
      a.bare.scale.setScalar(Math.max(0.02, bareness));
      a.cones.visible = autumn > 0.02;
      a.cones.scale.setScalar(Math.max(0.02, autumn));
      a.flowers.forEach((f) => {
        f.visible = bloom > 0.02;
        f.scale.setScalar(Math.max(0.02, bloom));
      });
    });
    berries.forEach((f) => {
      f.visible = (past ? fromSeason : season) === 'summer';
    });

    const flowerPalette = (palette.flowers.length ? palette : fromPalette).flowers;
    flowerPoints.forEach((_, i) => flowers.setColorAt(i, color.setHex(flowerPalette[i % Math.max(1, flowerPalette.length)] ?? 0xffffff)));
    if (flowers.instanceColor) {
      flowers.instanceColor.needsUpdate = true;
    }
    const flowerHeight = flagAmount(k, fromPalette.flowers.length > 0, palette.flowers.length > 0);
    growInstances(flowers, flowerPoints, flowerHeight);

    for (let i = 0; i < TUFT_COUNT; i++) {
      tufts.setColorAt(i, blendHex([from.grass[3], to.grass[3]], k, color).offsetHSL(0, 0, -0.1 + (i % 3) * 0.04));
    }
    if (tufts.instanceColor) {
      tufts.instanceColor.needsUpdate = true;
    }
    growInstances(tufts, tuftPoints, 1 - winter);
    lilyPads.forEach((v) => {
      v.visible = winter < 0.5;
    });
    if (winter > 0.5) {
      fish.visible = false;
    }
  }

  function setSeason(e, p) {
    if (!palette) {
      season = e;
      fromSeason = e;
      palette = p;
      fromPalette = p;
      blend = 1;
      paintSeason(1);
      return;
    }
    if (e === season) {
      return;
    }
    fromSeason = season;
    fromPalette = palette;
    season = e;
    palette = p;
    blend = 0;
    paintSeason(0);
  }

  let sinceRepaint = 0;
  function advanceSeason(dt) {
    if (blend >= 1) {
      return;
    }
    blend = Math.min(1, blend + dt / SEASON_FADE_SECONDS);
    sinceRepaint += dt;
    if (blend >= 1 || sinceRepaint >= SEASON_REPAINT_SECONDS) {
      sinceRepaint = 0;
      paintSeason(blend < 1 ? ease(blend) : 1);
    }
  }

  const seasonProgress = () => ({ season, fromSeason, blend: ease(blend) });
  function setLight(night) {
    postLights.forEach((l) => {
      l.intensity = night ? 18 : 0;
    });
  }

  let fishJump = 3;
  function animate(t, dt) {
    advanceSeason(dt);
    trees.forEach((a) => {
      a.canopy.rotation.z = Math.sin(t * 0.9 + a.phase) * 0.025;
      a.canopy.rotation.x = Math.cos(t * 0.7 + a.phase) * 0.02;
    });
    blades.rotation.z -= dt * 0.8;
    walnut.position.y = 0.25 + Math.abs(Math.sin(t * 1.5)) * 0.08;
    if (season !== 'winter') {
      waterTexture.offset.set(Math.sin(t * 0.3) * 0.06, t * 0.02);
      lilyPads.forEach((v, i) => {
        v.position.y = Math.sin(t * 1.4 + i) * 0.015;
      });
      fishJump -= dt;
      if (fishJump <= 0) {
        const phase = -fishJump / 0.8;
        fish.visible = true;
        fish.position.set(LAKE.x - 1 + phase * 2, 0.1 + Math.sin(phase * Math.PI) * 1.4, LAKE.z - 0.6);
        fish.rotation.z = (0.5 - phase) * 2;
        if (phase >= 1) {
          fish.visible = false;
          fishJump = 4 + random() * 5;
        }
      }
    }
  }

  return { setSeason, setLight, animate, seasonProgress, advanceSeason, settleSeason: () => advanceSeason(SEASON_FADE_SECONDS) };
}
