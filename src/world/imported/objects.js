import * as THREE from 'three';
import { isFenceName } from '../../farmSave.js';
import { geoRock } from '../assets/mine.js';
import { TILE } from './space.js';

const FENCE_COLORS = { 'Wood Fence': 0xb8884a, 'Stone Fence': 0x9a958c, 'Iron Fence': 0x4a4e55, 'Hardwood Fence': 0x6e4222, Gate: 0xc68b4e };
const FENCE_HEIGHT = 0.62;
const SPRINKLER_COLORS = { Sprinkler: 0xc0c8d0, 'Quality Sprinkler': 0xf2c230, 'Iridium Sprinkler': 0xb07ae0 };
const LAMP_COLORS = { 'Wood Lamp-post': 0x8a5a2b, 'Iron Lamp-post': 0x3b3f45 };
const RARECROW_COLORS = [0xe8a0a0, 0xa0c0e8, 0xa0e8b0, 0xe8d060, 0xc09ae0, 0xe8b070];
const MACHINE_COLORS = {
  'Mayonnaise Machine': 0xe8c98d,
  'Cheese Press': 0xd8b060,
  Furnace: 0x6a6d72,
  'Auto-Grabber': 0x4a8a8a,
  'Worm Bin': 0x7a5a3a,
  Crystalarium: 0x9b4fc4,
  Loom: 0xc8a070,
  'Oil Maker': 0x8a8a5a,
  Recycler: 0x6a8a6a,
  'Seed Maker': 0x8a6a4a,
};
const IGNORED = new Set(['Tapper', 'Heavy Tapper', 'Crab Pot', 'Artifact Spot', 'Seed Spot', 'Truffle', 'Egg', 'Wool', 'Hay']);
const FLOWER_FALLBACK = [0xf08ab8, 0xfff4e0, 0xf2c230];
const CLUMP_SHAPES = { 600: 'stump', 602: 'log', 622: 'meteor' };

const hash = (text) => [...text].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7);

function shape(u, draw) {
  const k = u.builder();
  draw(k);
  return k.join();
}

function stamp(geometry, material, entries) {
  if (!entries.length) {
    return null;
  }
  const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  const quaternion = new THREE.Quaternion();
  entries.forEach((entry, index) => {
    quaternion.setFromEuler(new THREE.Euler(0, entry.turn ?? 0, 0));
    const s = entry.scale ?? 1;
    mesh.setMatrixAt(index, matrix.compose(new THREE.Vector3(entry.x, entry.lift ?? 0, entry.z), quaternion, new THREE.Vector3(s, s, s)));
    mesh.setColorAt(index, color.setHex(entry.color ?? 0xffffff));
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildFences(u, objects, space) {
  const fences = new Map(objects.filter((o) => isFenceName(o.name)).map((o) => [`${o.x},${o.y}`, o]));
  const posts = [];
  const rails = [];
  fences.forEach((fence) => {
    const [x, z] = space.center(fence.x, fence.y);
    const color = FENCE_COLORS[fence.name] ?? FENCE_COLORS['Wood Fence'];
    posts.push({ x, z, color });
    if (fences.has(`${fence.x + 1},${fence.y}`)) {
      rails.push({ x: x + TILE / 2, z, color, turn: 0 });
    }
    if (fences.has(`${fence.x},${fence.y + 1}`)) {
      rails.push({ x, z: z + TILE / 2, color, turn: Math.PI / 2 });
    }
  });
  const post = shape(u, (k) => {
    k.piece(new THREE.CylinderGeometry(0.09, 0.1, FENCE_HEIGHT, 6), 0xffffff, { position: [0, FENCE_HEIGHT / 2, 0] });
    k.piece(new THREE.SphereGeometry(0.09, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), 0xffffff, { position: [0, FENCE_HEIGHT, 0] });
  });
  const rail = shape(u, (k) => {
    [0.22, 0.46].forEach((y) => k.box([TILE, 0.09, 0.06], 0xffffff, { position: [0, y - 0.045, 0] }));
  });
  return [stamp(post, u.materialByColor, posts), stamp(rail, u.materialByColor, rails)];
}

function sprinklerShape(u) {
  return shape(u, (k) => {
    k.box([0.24, 0.05, 0.24], 0x5e636a, { position: [0, 0, 0] });
    k.piece(new THREE.CylinderGeometry(0.05, 0.06, 0.34, 6), 0xffffff, { position: [0, 0.22, 0] });
    k.piece(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 6), 0xd9822b, { position: [0, 0.16, 0] });
    k.box([0.4, 0.05, 0.06], 0xffffff, { position: [0, 0.4, 0] });
    k.box([0.06, 0.05, 0.4], 0xffffff, { position: [0, 0.4, 0] });
  });
}

function scarecrowShape(u) {
  return shape(u, (k) => {
    k.box([0.1, 1.4, 0.1], 0x8a5a2b, { position: [0, 0, 0] });
    k.box([1.1, 0.09, 0.09], 0x8a5a2b, { position: [0, 0.95, 0] });
    k.box([0.52, 0.56, 0.3], 0xffffff, { position: [0, 0.62, 0] });
    k.box([0.4, 0.4, 0.38], 0xe8c98d, { position: [0, 1.2, 0] });
    [-0.09, 0.09].forEach((d) => k.box([0.06, 0.06, 0.03], 0x3b2410, { position: [d, 1.4, 0.2] }));
    k.box([0.7, 0.06, 0.7], 0xffffff, { position: [0, 1.58, 0] });
    k.box([0.4, 0.26, 0.4], 0xffffff, { position: [0, 1.62, 0] });
  });
}

function chestShape(u) {
  return shape(u, (k) => {
    k.box([0.5, 0.32, 0.34], 0xa8652e, { position: [0, 0, 0] });
    k.box([0.52, 0.1, 0.36], 0x8a5a2b, { position: [0, 0.3, 0] });
    k.box([0.08, 0.1, 0.04], 0xf2c230, { position: [0, 0.22, 0.18] });
  });
}

function barrelShape(u) {
  return shape(u, (k) => {
    k.piece(new THREE.CylinderGeometry(0.24, 0.24, 0.5, 8), 0xffffff, { position: [0, 0.25, 0] });
    [0.12, 0.38].forEach((y) => k.piece(new THREE.CylinderGeometry(0.255, 0.255, 0.05, 8), 0x4a4e55, { position: [0, y, 0] }));
  });
}

function machineShape(u) {
  return shape(u, (k) => {
    k.box([0.5, 0.5, 0.42], 0xffffff, { position: [0, 0, 0] });
    k.box([0.54, 0.08, 0.46], 0x5e636a, { position: [0, 0.5, 0] });
    k.box([0.14, 0.14, 0.04], 0xf2c230, { position: [0, 0.26, 0.22] });
  });
}

function beeHouseShape(u) {
  return shape(u, (k) => {
    k.box([0.4, 0.5, 0.4], 0xe0b050, { position: [0, 0, 0] });
    k.box([0.5, 0.1, 0.5], 0xb07a2a, { position: [0, 0.5, 0] });
    k.box([0.3, 0.08, 0.3], 0x8a5a2b, { position: [0, 0.6, 0] });
    k.box([0.1, 0.1, 0.04], 0x3b2410, { position: [0, 0.22, 0.21] });
  });
}

function tubShape(u) {
  return shape(u, (k) => {
    k.piece(new THREE.CylinderGeometry(0.3, 0.22, 0.34, 8), 0x9a6a3a, { position: [0, 0.17, 0] });
    k.box([0.4, 0.08, 0.4], 0x4f9a3a, { position: [0, 0.34, 0] });
  });
}

function bloomShape(u) {
  return shape(u, (k) => {
    [
      [0.12, 0.45, 0.05],
      [-0.1, 0.5, -0.08],
      [0.02, 0.56, 0.12],
    ].forEach(([x, y, z]) => k.box([0.14, 0.14, 0.14], 0xffffff, { position: [x, y, z] }));
  });
}

function rodShape(u) {
  return shape(u, (k) => {
    k.box([0.2, 0.12, 0.2], 0x5e636a, { position: [0, 0, 0] });
    k.box([0.05, 1.0, 0.05], 0xc0c4c8, { position: [0, 0.12, 0] });
    k.box([0.12, 0.12, 0.12], 0xf2c230, { position: [0, 1.1, 0] });
  });
}

function statueShape(u) {
  return shape(u, (k) => {
    k.box([0.5, 0.2, 0.5], 0x8a8d92, { position: [0, 0, 0] });
    k.box([0.3, 0.7, 0.3], 0xffffff, { position: [0, 0.2, 0] });
    k.box([0.36, 0.1, 0.36], 0xf2c230, { position: [0, 0.9, 0] });
  });
}

function solarShape(u) {
  return shape(u, (k) => {
    k.box([0.06, 0.4, 0.06], 0x5e636a, { position: [0, 0, 0] });
    k.piece(new THREE.BoxGeometry(0.6, 0.05, 0.5), 0x2a4a8a, { rot: new THREE.Euler(-0.5, 0, 0), position: [0, 0.5, 0] });
  });
}

function logShape(u) {
  return shape(u, (k) => {
    k.piece(new THREE.CylinderGeometry(0.17, 0.17, 0.7, 8), 0x7a4a26, { rot: new THREE.Euler(0, 0, Math.PI / 2), position: [0, 0.18, 0] });
    [-0.2, 0.05, 0.25].forEach((x) => k.box([0.1, 0.1, 0.1], 0xe8c98d, { position: [x, 0.32, 0.05] }));
  });
}

function baleShape(u) {
  return shape(u, (k) => {
    k.box([0.55, 0.4, 0.4], 0xe8c060, { position: [0, 0, 0] });
    [-0.14, 0.14].forEach((d) => k.box([0.04, 0.42, 0.42], 0xb08a3a, { position: [d, 0, 0] }));
  });
}

function flameShape(u) {
  return shape(u, (k) => {
    k.box([0.4, 0.14, 0.4], 0x6a6d72, { position: [0, 0, 0] });
    k.box([0.2, 0.3, 0.2], 0xe8833a, { position: [0, 0.14, 0] });
  });
}

function weedShape(u) {
  return shape(u, (k) => {
    k.box([0.05, 0.34, 0.05], 0x4f9a3a, { position: [0, 0, 0] });
    k.piece(new THREE.BoxGeometry(0.05, 0.28, 0.05), 0x6aaa3a, { rot: new THREE.Euler(0, 0, 0.5), position: [0.08, 0.1, 0.03] });
    k.piece(new THREE.BoxGeometry(0.05, 0.26, 0.05), 0x5a9a30, { rot: new THREE.Euler(0.5, 0, -0.4), position: [-0.07, 0.1, -0.05] });
    k.piece(new THREE.BoxGeometry(0.05, 0.22, 0.05), 0x7ab84a, { rot: new THREE.Euler(-0.5, 0, 0.3), position: [0.02, 0.09, 0.08] });
  });
}

function twigShape(u) {
  return shape(u, (k) => {
    k.piece(new THREE.BoxGeometry(0.5, 0.06, 0.07), 0x7a4a26, { rot: new THREE.Euler(0, 0.6, 0), position: [0, 0.04, 0] });
    k.piece(new THREE.BoxGeometry(0.28, 0.05, 0.06), 0x6e4222, { rot: new THREE.Euler(0, -0.4, 0), position: [0.12, 0.07, 0.1] });
  });
}

function clumpShape(u, kind) {
  return shape(u, (k) => {
    if (kind === 'stump') {
      k.piece(new THREE.CylinderGeometry(0.5, 0.58, 0.7, 10), 0x7a4a26, { position: [0, 0.35, 0] });
      k.piece(new THREE.CylinderGeometry(0.46, 0.46, 0.03, 10), 0xd8a870, { position: [0, 0.71, 0] });
      k.piece(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 10), 0xb88a50, { position: [0, 0.72, 0] });
    } else if (kind === 'log') {
      k.piece(new THREE.CylinderGeometry(0.34, 0.34, 1.2, 10), 0x7a4a26, { rot: new THREE.Euler(0, 0, Math.PI / 2), position: [0, 0.34, 0] });
      k.piece(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 10), 0xd8a870, { rot: new THREE.Euler(0, 0, Math.PI / 2), position: [0.61, 0.34, 0] });
    } else {
      const color = kind === 'meteor' ? 0x4a4e6a : 0x8a8d92;
      k.piece(geoRock(0.62, 3), color, { position: [0, 0.3, 0] });
      k.piece(geoRock(0.42, 8), color + 0x101010, { position: [0.4, 0.2, 0.3] });
    }
  });
}

function placeEntries(list, space, build) {
  return list.map((entry) => {
    const [x, z] = space.center(entry.x, entry.y);
    return { x, z, ...build(entry) };
  });
}

function classify(object) {
  const { name, big } = object;
  if (IGNORED.has(name) || isFenceName(name)) {
    return null;
  }
  if (name in SPRINKLER_COLORS) {
    return 'sprinkler';
  }
  if (name in LAMP_COLORS) {
    return 'lamp';
  }
  if (/arecrow/.test(name)) {
    return 'scarecrow';
  }
  if (!big) {
    return { Weeds: 'weed', Stone: 'stone', Twig: 'twig', Torch: 'flame' }[name] ?? null;
  }
  const rules = [
    [/Chest/, 'chest'],
    [/^(Keg|Cask)$/, 'barrel'],
    [/Bee House/, 'bee'],
    [/Tub o/, 'tub'],
    [/Lightning Rod/, 'rod'],
    [/Statue|Trophy|Owl|Junimo/, 'statue'],
    [/Solar Panel/, 'solar'],
    [/Mushroom Log/, 'log'],
    [/Hay Bale/, 'bale'],
    [/Brazier|Campfire|Heater/, 'flame'],
  ];
  return rules.find(([pattern]) => pattern.test(name))?.[1] ?? 'machine';
}

export function buildObjects(u, layout, space) {
  const root = new THREE.Group();
  const { materialByColor, lanternMaterial } = u;
  const groups = {};
  layout.objects.forEach((object) => {
    const kind = classify(object);
    if (kind) {
      (groups[kind] ??= []).push(object);
    }
  });
  const add = (mesh) => {
    if (mesh) {
      root.add(mesh);
    }
    return mesh;
  };
  buildFences(u, layout.objects, space).forEach(add);

  const sized = (kind, geometry, build) => add(stamp(geometry, materialByColor, placeEntries(groups[kind] ?? [], space, build)));
  sized('sprinkler', sprinklerShape(u), (o) => ({ color: SPRINKLER_COLORS[o.name], scale: 0.9 }));
  sized('scarecrow', scarecrowShape(u), (o) => ({
    color: o.name.includes('Scarecrow') ? 0xe8c98d : RARECROW_COLORS[hash(o.name) % RARECROW_COLORS.length],
    scale: 0.75,
  }));
  sized('chest', chestShape(u), (o) => ({ color: o.name === 'Stone Chest' ? 0xb0b0b0 : 0xffffff, turn: 0 }));
  sized('barrel', barrelShape(u), (o) => ({ color: o.name === 'Cask' ? 0x6e4222 : 0x9a6a3a }));
  sized('machine', machineShape(u), (o) => ({ color: MACHINE_COLORS[o.name] ?? 0x9a7a52 }));
  sized('bee', beeHouseShape(u), () => ({}));
  sized('tub', tubShape(u), () => ({}));
  sized('rod', rodShape(u), () => ({}));
  sized('statue', statueShape(u), (o) => ({ color: o.name.includes('Statue') ? 0xc8c8d0 : 0xa8a8b0 }));
  sized('solar', solarShape(u), () => ({}));
  sized('log', logShape(u), () => ({}));
  sized('bale', baleShape(u), () => ({}));
  add(
    stamp(
      flameShape(u),
      lanternMaterial,
      placeEntries(groups.flame ?? [], space, () => ({})),
    ),
  );
  sized('weed', weedShape(u), (o) => ({ turn: o.x + o.y, scale: 1.1 }));
  sized('twig', twigShape(u), (o) => ({ turn: o.x * 3 + o.y }));

  const lampPoles = placeEntries(groups.lamp ?? [], space, (o) => ({ color: LAMP_COLORS[o.name] }));
  const poleGeometry = shape(u, (k) => {
    k.box([0.24, 0.14, 0.24], 0xffffff, { position: [0, 0, 0] });
    k.box([0.1, 1.6, 0.1], 0xffffff, { position: [0, 0.14, 0] });
    k.box([0.42, 0.07, 0.07], 0xffffff, { position: [-0.14, 1.66, 0] });
  });
  add(stamp(poleGeometry, materialByColor, lampPoles));
  const lanternGeometry = new THREE.BoxGeometry(0.26, 0.32, 0.26).translate(-0.3, 1.45, 0);
  add(
    stamp(
      lanternGeometry,
      lanternMaterial,
      lampPoles.map((pole) => ({ ...pole, color: 0xffffff })),
    ),
  );

  const stones = placeEntries(groups.stone ?? [], space, (o) => ({
    color: (o.x + o.y) % 2 ? 0xa4a7ab : 0x8a8d92,
    turn: o.x,
    scale: 0.9 + ((o.x + o.y) % 4) / 8,
  }));
  const stoneGeometry = shape(u, (k) => k.piece(geoRock(0.2, 11), 0xffffff, { position: [0, 0.06, 0] }));
  add(stamp(stoneGeometry, materialByColor, stones));

  const blooms = placeEntries(groups.tub ?? [], space, (o) => ({ color: FLOWER_FALLBACK[(o.x + o.y) % FLOWER_FALLBACK.length] }));
  add(
    stamp(
      bloomShape(u),
      materialByColor,
      blooms.map((bloom) => ({ ...bloom, lift: 0.34 })),
    ),
  );

  ['stump', 'log', 'meteor', 'rock'].forEach((kind) => {
    const clumps = layout.clumps.filter((clump) => (CLUMP_SHAPES[clump.kind] ?? 'rock') === kind);
    const entries = clumps.map((clump) => {
      const [x, z] = space.center(clump.x + (clump.w - 1) / 2, clump.y + (clump.h - 1) / 2);
      return { x, z };
    });
    add(stamp(clumpShape(u, kind), materialByColor, entries));
  });
  return { root };
}
