import * as THREE from 'three';
import { bricks, deckPlanks, obelisk, shingles, slats, spiral, verticalPlanks, water } from '../textures.js';
import { buildHouse } from '../assets/house.js';
import { TILE } from './space.js';

const SNOW = 0xf6fafc;
const DARK = 0x3b2410;
const WHITE = 0xf3ddb0;
const STONE = 0x9a958c;
const GABLE = (depth, rise) => [
  [-depth / 2, 0],
  [0, rise],
  [depth / 2, 0],
];
const GAMBREL = (depth, rise) => [
  [-depth / 2, 0],
  [-depth * 0.35, rise * 0.62],
  [0, rise],
  [depth * 0.35, rise * 0.62],
  [depth / 2, 0],
];

const COOPS = {
  Coop: { wallH: 1.1, rise: 0.9, wall: 0xa8763f, roof: 0x8a4a22, trim: 0x5b3a1e, door: 0x4f8a3a },
  'Big Coop': { wallH: 1.3, rise: 1.0, wall: 0x8a6a3a, roof: 0xd95c2c, trim: 0x5b3a1e, door: 0x4f8a3a, chimney: true },
  'Deluxe Coop': { wallH: 1.45, rise: 1.2, wall: 0x874b39, roof: 0xdb431f, trim: WHITE, door: 0x4f8a3a, chimney: true, vane: true },
};
const BARNS = {
  Barn: { wallH: 1.7, rise: 1.5, roof: 0x6a462c, wall: 0xa8321f },
  'Big Barn': { wallH: 1.9, rise: 1.7, roof: 0x4a3628, wall: 0xa8321f, loft: true },
  'Deluxe Barn': { wallH: 2.1, rise: 1.9, roof: 0x4a3628, wall: 0x972604, loft: true, vane: true },
};
const SHEDS = {
  Shed: { wallH: 1.0, rise: 0.9, wall: 0x8a5a2b, roof: 0x7a090c, door: 0x7a090c },
  'Big Shed': { wallH: 1.25, rise: 1.1, wall: 0xa84824, roof: 0xa72613, door: 0x78261a, chimney: true },
};
const CABINS = {
  'Log Cabin': { wall: 0xa86a2a, roof: 0x8a2a22, trim: 0x5b3a1e },
  'Stone Cabin': { wall: 0x7a6a5a, roof: 0x354671, trim: 0x4a3a2a, base: 0x6a5a4a },
  'Plank Cabin': { wall: 0xcc882e, roof: 0x23794d, trim: 0x6e3a1e },
  'Rustic Cabin': { wall: 0xb87d2c, roof: 0x7d2c1f, trim: 0x4b2a19 },
  'Neighbor Cabin': { wall: 0xf1be94, roof: 0xdd6f40, trim: 0x93422b },
  'Beach Cabin': { wall: 0x8a5a2b, roof: 0x6a4a1a, trim: 0x4a3207 },
  'Trailer Cabin': { wall: 0xdddddd, roof: 0xfdfdfd, trim: 0x898989 },
};
const OBELISKS = {
  'Earth Obelisk': { theme: 'earth', hoop: 0xe0a43a, jewel: 0x9b4fc4 },
  'Water Obelisk': { theme: 'water', hoop: 0x9a9da2, jewel: 0x56a3e2 },
  'Desert Obelisk': { theme: 'desert', hoop: 0xe0a43a, jewel: 0xe8833a },
  'Island Obelisk': { theme: 'island', hoop: 0xe0a43a, jewel: 0x4fa33a },
};
const CATEGORY = {
  Farmhouse: 'friends',
  'Shipping Bin': 'shipping',
  Barn: 'cooking',
  'Big Barn': 'cooking',
  'Deluxe Barn': 'cooking',
  Shed: 'crafting',
  'Big Shed': 'crafting',
  'Slime Hutch': 'monsters',
  'Fish Pond': 'fishing',
  Greenhouse: 'level',
  'Gold Clock': 'clock',
  'Earth Obelisk': 'obelisks',
  'Water Obelisk': 'obelisks',
  'Desert Obelisk': 'obelisks',
  'Island Obelisk': 'obelisks',
};
const MATURE_HOUSE_LEVEL = 2;

function textures(u) {
  const { materialTexture } = u;
  return {
    planks: (base) => materialTexture(verticalPlanks({ base })),
    deck: (base) => materialTexture(deckPlanks({ base })),
    shingles: (base) => materialTexture(shingles({ base })),
    bricks: (base) => materialTexture(bricks({ base })),
    slats: (base) => materialTexture(slats({ base })),
  };
}

function facade(k, depth) {
  return ([w, h, d], material, { along, y, offset, ...options }) =>
    k.box([w, h, d], material, { position: [along, y, depth / 2 + offset], ...options });
}

function addRoof(k, spec) {
  const { length, y0, profile, wallMaterial, roofMaterial, ridge, trim } = spec;
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  k.piece(new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false }), wallMaterial, {
    rot: new THREE.Euler(0, Math.PI / 2, 0),
    position: [-length / 2, y0, 0],
    outline: true,
  });
  const snow = [];
  const half = Math.floor(profile.length / 2);
  const roofLength = length + 0.4;
  [1, -1].forEach((side) => {
    const points = profile.slice(0, half + 1).map(([z, y]) => [-side * z, y0 + y]);
    points.slice(0, -1).forEach((from, index) => {
      const to = points[index + 1];
      const isEave = index === 0;
      k.slab([from, to], roofMaterial, { thickness: 0.15, length: roofLength, extension: isEave ? [0.28, 0.1] : [0.04, 0.06], outline: true });
      snow.push([from, to, isEave]);
      if (trim !== undefined) {
        [-1, 1].forEach((end) => {
          k.slab([from, to], trim, {
            thickness: 0.19,
            length: 0.1,
            center: end * (roofLength / 2 + 0.05),
            extension: isEave ? [0.28, 0.1] : [0.04, 0.06],
          });
        });
      }
    });
  });
  const top = y0 + profile[half][1];
  k.box([roofLength + 0.2, 0.14, 0.3], ridge, { position: [0, top + 0.02, 0], outline: true });
  return { snow, top, perSide: half };
}

function addSnowRoof(kSnow, roofInfo, length) {
  roofInfo.snow.forEach(([from, to, isEave]) => {
    if (!isEave || roofInfo.perSide === 1) {
      kSnow.slab([from, to], SNOW, { thickness: 0.12, length: length + 0.44, extension: [0.08, 0.06], over: 0.15 });
    }
  });
  kSnow.box([length + 0.5, 0.1, 0.38], SNOW, { position: [0, roofInfo.top + 0.14, 0] });
}

function addWindow(k, { w, h, along, y, frame, depth, shutters, glass }) {
  const front = facade(k, depth);
  const e = 0.08;
  front([w + 2 * e, e, 0.1], frame, { along, y: y - e, offset: 0.05 });
  front([w + 2 * e, e, 0.1], frame, { along, y: y + h, offset: 0.05 });
  [-1, 1].forEach((side) => front([e, h, 0.1], frame, { along: along + side * (w / 2 + e / 2), y, offset: 0.05 }));
  front([w, h, 0.06], glass, { along, y, offset: 0.03 });
  front([0.05, h, 0.08], frame, { along, y, offset: 0.04 });
  front([w + 0.3, 0.06, 0.18], frame, { along, y: y - e - 0.06, offset: 0.09 });
  if (shutters) {
    [-1, 1].forEach((side) => front([0.2, h + 0.08, 0.05], shutters, { along: along + side * (w / 2 + e + 0.12), y: y - 0.04, offset: 0.03 }));
  }
}

function addDoor(k, { w, h, along, color, frame, depth, y = 0.3 }) {
  const front = facade(k, depth);
  front([w + 0.2, 0.09, 0.1], frame, { along, y: y + h, offset: 0.05 });
  [-1, 1].forEach((side) => front([0.09, h, 0.1], frame, { along: along + side * (w / 2 + 0.045), y, offset: 0.05 }));
  front([w, h, 0.07], color, { along, y, offset: 0.035 });
  front([0.07, 0.07, 0.12], 0xf2c230, { along: along + w / 2 - 0.12, y: y + h / 2, offset: 0.07 });
}

function addBarnDoors(k, { along, w, h, color, depth, y = 0.3 }) {
  const front = facade(k, depth);
  front([w, h, 0.04], DARK, { along, y, offset: 0.02 });
  [-1, 1].forEach((side) => {
    const x = along + side * (w / 4);
    const leaf = w / 2 - 0.04;
    front([leaf, h - 0.04, 0.08], color, { along: x, y: y + 0.02, offset: 0.04 });
    front([leaf, 0.08, 0.12], WHITE, { along: x, y: y + 0.02, offset: 0.06 });
    front([leaf, 0.08, 0.12], WHITE, { along: x, y: y + h - 0.1, offset: 0.06 });
    [-1, 1].forEach((brace) => {
      k.piece(new THREE.BoxGeometry(Math.hypot(leaf, h - 0.2), 0.07, 0.08), WHITE, {
        rot: new THREE.Euler(0, 0, brace * Math.atan2(h - 0.2, leaf)),
        position: [x, y + h / 2, depth / 2 + 0.08],
      });
    });
  });
  front([w + 0.2, 0.1, 0.14], WHITE, { along, y: y + h, offset: 0.07 });
}

function addChimney(k, { x, z, top, mat }) {
  k.box([0.5, 1.1, 0.5], mat, { position: [x, top - 0.55, z], outline: true });
  k.box([0.62, 0.1, 0.62], 0x5e636a, { position: [x, top + 0.55, z], outline: true });
}

function addVane(k, { x, y }) {
  k.box([0.05, 0.5, 0.05], 0x3b3f45, { position: [x, y, 0] });
  k.box([0.5, 0.04, 0.04], 0x3b3f45, { position: [x, y + 0.3, 0] });
  k.box([0.06, 0.2, 0.2], 0xf2c230, { position: [x, y + 0.36, 0.1] });
}

function cabinBody(u, name, building) {
  const t = textures(u);
  const style = CABINS[name] ?? CABINS['Log Cabin'];
  const stage = Math.max(1, building.stage || 1);
  const w = building.w * TILE * (0.9 + stage * 0.05);
  const depth = (building.h + 1) * TILE;
  const wallH = 1.5 + stage * 0.1;
  const k = u.builder();
  const kSnow = u.builder();
  const wall = t.planks(style.wall);
  k.box([w + 0.2, 0.3, depth + 0.2], t.bricks(style.base ?? STONE), { position: [0, 0, 0], outline: true });
  k.box([w, wallH, depth], wall, { position: [0, 0.3, 0], outline: true });
  const roofInfo = addRoof(k, {
    length: w,
    depth,
    y0: 0.3 + wallH,
    profile: GABLE(depth, 1.1 + stage * 0.12),
    wallMaterial: wall,
    roofMaterial: t.shingles(style.roof),
    ridge: style.trim,
  });
  addSnowRoof(kSnow, roofInfo, w);
  addDoor(k, { w: 0.6, h: 1.2, along: -w * 0.15, color: style.trim, frame: DARK, depth });
  addWindow(k, { w: 0.5, h: 0.5, along: w * 0.22, y: 0.75, frame: DARK, depth, shutters: t.slats(style.trim), glass: u.windowMaterial });
  addChimney(k, { x: w * 0.32, z: -depth * 0.2, top: roofInfo.top, mat: t.bricks(0x8f8778) });
  return { k, kSnow, depth };
}

function coopBody(u, name, building) {
  const t = textures(u);
  const style = COOPS[name] ?? COOPS.Coop;
  const w = building.w * TILE;
  const depth = (building.h + 1) * TILE;
  const k = u.builder();
  const kSnow = u.builder();
  const wall = t.planks(style.wall);
  k.box([w + 0.16, 0.25, depth + 0.16], t.bricks(STONE), { position: [0, 0, 0], outline: true });
  k.box([w, style.wallH, depth], wall, { position: [0, 0.25, 0], outline: true });
  const roofInfo = addRoof(k, {
    length: w,
    depth,
    y0: 0.25 + style.wallH,
    profile: GABLE(depth, style.rise),
    wallMaterial: wall,
    roofMaterial: t.shingles(style.roof),
    ridge: style.trim,
  });
  addSnowRoof(kSnow, roofInfo, w);
  addDoor(k, { w: 0.5, h: 0.95, along: -w * 0.18, color: style.door, frame: style.trim, depth, y: 0.25 });
  addWindow(k, { w: 0.45, h: 0.4, along: w * 0.12, y: 0.6, frame: style.trim, depth, shutters: null, glass: u.windowMaterial });
  k.box([0.5, 0.3, 0.06], DARK, { position: [w * 0.3, 0.25 + style.wallH - 0.4, depth / 2 + 0.03] });
  if (style.chimney) {
    addChimney(k, { x: w * 0.32, z: -depth * 0.2, top: roofInfo.top - 0.1, mat: t.bricks(0x8f8778) });
  }
  if (style.vane) {
    addVane(k, { x: -w * 0.3, y: roofInfo.top + 0.1 });
  }
  k.box([0.9, 0.12, 0.3], t.deck(0xb08060), { position: [w * 0.28, 0, depth / 2 + 0.2] });
  return { k, kSnow, depth };
}

function barnBody(u, name, building) {
  const t = textures(u);
  const style = BARNS[name] ?? BARNS.Barn;
  const w = building.w * TILE;
  const depth = (building.h + 1) * TILE;
  const k = u.builder();
  const kSnow = u.builder();
  const wall = t.planks(style.wall);
  k.box([w + 0.2, 0.3, depth + 0.2], t.bricks(STONE), { position: [0, 0, 0], outline: true });
  k.box([w, style.wallH, depth], wall, { position: [0, 0.3, 0], outline: true });
  k.box([w + 0.1, 0.12, depth + 0.1], WHITE, { position: [0, 0.3 + style.wallH - 0.12, 0] });
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => k.box([0.16, style.wallH, 0.16], WHITE, { position: [(sx * w) / 2, 0.3, (sz * depth) / 2] })));
  const roofInfo = addRoof(k, {
    length: w,
    depth,
    y0: 0.3 + style.wallH,
    profile: GAMBREL(depth, style.rise),
    wallMaterial: wall,
    roofMaterial: t.shingles(style.roof),
    ridge: 0x5b3a1e,
    trim: WHITE,
  });
  addSnowRoof(kSnow, roofInfo, w);
  addBarnDoors(k, { along: 0, w: 1.5, h: style.wallH - 0.15, color: 0xc0392f, depth });
  const loftY = 0.3 + style.wallH + 0.25;
  addBarnDoors(k, { along: 0, w: 0.7, h: 0.6, color: 0xc0392f, depth: depth - 0.1, y: loftY });
  [-1, 1].forEach((side) =>
    addWindow(k, { w: 0.4, h: 0.4, along: side * w * 0.33, y: 0.9, frame: WHITE, depth, shutters: null, glass: u.windowMaterial }),
  );
  if (style.vane) {
    addVane(k, { x: -w * 0.25, y: roofInfo.top + 0.1 });
  }
  return { k, kSnow, depth };
}

function shedBody(u, name, building) {
  const t = textures(u);
  const style = SHEDS[name] ?? SHEDS.Shed;
  const w = building.w * TILE;
  const depth = (building.h + 1) * TILE;
  const k = u.builder();
  const kSnow = u.builder();
  const wall = t.planks(style.wall);
  k.box([w + 0.16, 0.22, depth + 0.16], t.bricks(STONE), { position: [0, 0, 0], outline: true });
  k.box([w, style.wallH, depth], wall, { position: [0, 0.22, 0], outline: true });
  const roofInfo = addRoof(k, {
    length: w,
    depth,
    y0: 0.22 + style.wallH,
    profile: GABLE(depth, style.rise),
    wallMaterial: wall,
    roofMaterial: t.shingles(style.roof),
    ridge: DARK,
  });
  addSnowRoof(kSnow, roofInfo, w);
  addDoor(k, { w: 0.8, h: 0.9, along: 0, color: style.door, frame: DARK, depth, y: 0.22 });
  if (style.chimney) {
    addChimney(k, { x: w * 0.3, z: -depth * 0.2, top: roofInfo.top - 0.1, mat: t.bricks(0x8f8778) });
  }
  return { k, kSnow, depth };
}

function stableBody(u, building) {
  const t = textures(u);
  const w = building.w * TILE;
  const depth = (building.h + 1) * TILE;
  const k = u.builder();
  const kSnow = u.builder();
  const wall = t.planks(0x773416);
  k.box([w + 0.12, 0.2, depth + 0.12], t.deck(0xa75817), { position: [0, 0, 0], outline: true });
  k.box([w, 1.4, 0.12], wall, { position: [0, 0.2, -depth / 2 + 0.06], outline: true });
  [-1, 1].forEach((side) => k.box([0.12, 1.4, depth], wall, { position: [side * (w / 2 - 0.06), 0.2, 0], outline: true }));
  const roofInfo = addRoof(k, {
    length: w,
    depth,
    y0: 1.6,
    profile: GABLE(depth, 0.7),
    wallMaterial: wall,
    roofMaterial: t.shingles(0xb53a18),
    ridge: 0x7a1a0e,
  });
  addSnowRoof(kSnow, roofInfo, w);
  [-1, 1].forEach((side) => k.box([0.14, 1.4, 0.14], 0x692814, { position: [side * (w / 2 - 0.1), 0.2, depth / 2 - 0.1] }));
  k.box([w * 0.7, 0.12, 0.08], 0x692814, { position: [0, 1.1, depth / 2 - 0.1] });
  k.box([0.5, 0.35, 0.4], 0xe8c060, { position: [-w * 0.28, 0.2, -depth * 0.25] });
  return { k, kSnow, depth };
}

function farmhouseCottage(u, level) {
  const t = textures(u);
  const w = level === 0 ? 4.4 : 5.2;
  const depth = 3.2;
  const k = u.builder();
  const kSnow = u.builder();
  const wall = t.planks(0xffc176);
  k.box([w + 0.3, 0.4, depth + 0.3], t.bricks(STONE), { position: [0, 0, 0], outline: true });
  k.box([w, 1.8, depth], wall, { position: [0, 0.4, 0], outline: true });
  const roofInfo = addRoof(k, {
    length: w,
    depth,
    y0: 2.2,
    profile: [
      [-depth / 2, 0],
      [-depth * 0.3, 0.75],
      [0, 1.5],
      [depth * 0.3, 0.75],
      [depth / 2, 0],
    ],
    wallMaterial: wall,
    roofMaterial: t.shingles(0xb73c19),
    ridge: 0x8e2a22,
  });
  addSnowRoof(kSnow, roofInfo, w);
  addDoor(k, { w: 0.85, h: 1.55, along: w * 0.12, color: 0xb01c2a, frame: 0x6e3a1e, depth, y: 0.4 });
  addWindow(k, { w: 0.8, h: 0.7, along: -w * 0.22, y: 1.0, frame: 0x6e3a1e, depth, shutters: t.slats(0xb73c19), glass: u.windowMaterial });
  if (level > 0) {
    addWindow(k, { w: 0.7, h: 0.6, along: w * 0.38, y: 1.05, frame: 0x6e3a1e, depth, shutters: t.slats(0xb73c19), glass: u.windowMaterial });
  }
  const chimney = new THREE.Vector3(w * 0.3, roofInfo.top + 0.5, -depth * 0.2);
  addChimney(k, { x: chimney.x, z: chimney.z, top: roofInfo.top, mat: t.bricks(0x8f8778) });
  [0, 1, 2].forEach((row) =>
    [0, 1, 2, 3].forEach((col) =>
      k.box([0.18, 0.18, 0.5], 0x8a5a2b, { position: [-w / 2 - 0.2 - (row % 2) * 0.05, 0.4 + row * 0.2, -0.7 + col * 0.45] }),
    ),
  );
  k.box([1.1, 0.14, 0.7], t.deck(0xc87a3a), { position: [w * 0.12, 0, depth / 2 + 0.3] });
  return { k, kSnow, depth, chimney };
}

function pondBody(u, building) {
  const size = building.w * TILE;
  const k = u.builder();
  const mRim = u.materialTexture(bricks({ base: 0x8b7974 }));
  const rim = 0.45;
  [-1, 1].forEach((side) => {
    k.box([size, 0.3, rim], mRim, { position: [0, 0, side * (size / 2 - rim / 2)], outline: true });
    k.box([rim, 0.3, size - 2 * rim], mRim, { position: [side * (size / 2 - rim / 2), 0, 0], outline: true });
  });
  const texture = water({ base: 0xe8f4ff });
  const surface = new THREE.Mesh(
    new THREE.BoxGeometry(size - 2 * rim + 0.04, 0.06, size - 2 * rim + 0.04).translate(0, 0.14, 0),
    new THREE.MeshLambertMaterial({ map: texture, color: 0x3f8fd6 }),
  );
  surface.receiveShadow = true;
  return { k, kSnow: u.builder(), surface, texture };
}

function slimeBody(u, building) {
  const t = textures(u);
  const w = building.w * TILE;
  const depth = (building.h + 1) * TILE;
  const k = u.builder();
  const stone = t.bricks(0x4b346c);
  k.box([w, 2.0, depth], stone, { position: [0, 0, 0], outline: true });
  k.box([w + 0.2, 0.2, depth + 0.2], stone, { position: [0, 2.0, 0], color: 0x6a5a8c, outline: true });
  for (let i = 0; i < 7; i++) {
    k.box([0.3, 0.3, 0.3], stone, { position: [-w / 2 + 0.2 + i * ((w - 0.4) / 6), 2.2, depth / 2 - 0.1], color: 0x6a5a8c });
  }
  k.box([0.9, 1.3, 0.1], 0x1a0d2a, { position: [0, 0, depth / 2 + 0.02] });
  [-1, 1].forEach((side) => k.box([0.4, 0.6, 0.12], 0x4fd05a, { position: [side * w * 0.3, 0.5, depth / 2 + 0.06] }));
  [-1, 1].forEach((side) => k.box([0.4, 0.5, 0.06], u.windowMaterial, { position: [side * w * 0.18, 1.2, depth / 2 + 0.03] }));
  return { k, kSnow: u.builder(), depth };
}

function junimoBody(u) {
  const k = u.builder();
  k.piece(new THREE.CylinderGeometry(0.85, 0.95, 0.9, 10), 0xc8a870, { position: [0, 0.45, 0], outline: true });
  k.piece(new THREE.ConeGeometry(1.15, 1.1, 10), 0x4f9a3a, { position: [0, 1.45, 0], outline: true });
  k.box([0.4, 0.6, 0.1], 0x5b3a1e, { position: [0, 0, 0.9] });
  return { k, kSnow: u.builder(), depth: 1.9 };
}

function silo(u) {
  const t = textures(u);
  const k = u.builder();
  k.piece(new THREE.CylinderGeometry(0.85, 0.9, 3.4, 12), t.bricks(0x862903), { position: [0, 1.7, 0], outline: true });
  k.piece(new THREE.SphereGeometry(0.88, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0xb71d01, { position: [0, 3.4, 0], outline: true });
  k.box([0.35, 0.5, 0.06], 0x1a0d0a, { position: [0, 0, 0.88] });
  return { k, kSnow: u.builder(), depth: 1.8 };
}

function millBody(u) {
  const t = textures(u);
  const k = u.builder();
  k.box([1.6, 0.4, 1.6], t.bricks(STONE), { position: [0, 0, 0], outline: true });
  k.box([1.3, 2.6, 1.3], t.planks(0x9c5522), { position: [0, 0.4, 0], outline: true });
  k.piece(new THREE.ConeGeometry(1.25, 1.2, 4), t.shingles(0x894617), {
    rot: new THREE.Euler(0, Math.PI / 4, 0),
    position: [0, 3.6, 0],
    outline: true,
  });
  k.box([0.5, 0.9, 0.06], DARK, { position: [0, 0.4, 0.66] });
  k.box([0.4, 0.4, 0.06], u.windowMaterial, { position: [0.2, 1.9, 0.66] });
  const blades = u.builder();
  for (let i = 0; i < 4; i++) {
    const rot = new THREE.Euler(0, 0, (i * Math.PI) / 2);
    blades.piece(new THREE.BoxGeometry(0.1, 1.9, 0.07).translate(0, 0.95, 0), 0x6e4222, { rot });
    blades.piece(new THREE.BoxGeometry(0.45, 1.4, 0.04).translate(0.28, 1.05, 0.02), WHITE, { rot });
  }
  blades.box([0.24, 0.24, 0.18], DARK, { position: [0, -0.12, 0] });
  return { k, kSnow: u.builder(), depth: 1.3, blades, bladePosition: [0, 2.6, 0.75] };
}

function wellBody(u) {
  const t = textures(u);
  const k = u.builder();
  k.piece(new THREE.CylinderGeometry(0.75, 0.8, 0.7, 12), t.bricks(0x6a5a58), { position: [0, 0.35, 0], outline: true });
  k.piece(new THREE.CylinderGeometry(0.55, 0.55, 0.02, 12), 0x2d74a6, { position: [0, 0.68, 0] });
  [-1, 1].forEach((side) => k.box([0.1, 1.2, 0.1], 0x5b3a1e, { position: [side * 0.62, 0.7, 0] }));
  const kSnow = u.builder();
  const roofInfo = addRoof(k, {
    length: 1.7,
    depth: 1.5,
    y0: 1.9,
    profile: GABLE(1.5, 0.5),
    wallMaterial: t.shingles(0x7b3a22),
    roofMaterial: t.shingles(0x7b3a22),
    ridge: 0x5b3a1e,
  });
  addSnowRoof(kSnow, roofInfo, 1.7);
  return { k, kSnow, depth: 1.5 };
}

function greenhouseBody(u, building) {
  const w = building.w * TILE;
  const depth = (building.h + 1) * TILE;
  const k = u.builder();
  const kSnow = u.builder();
  const t = textures(u);
  const frame = 0xf0ead8;
  const glass = new THREE.MeshLambertMaterial({ color: 0xbfe4f2, transparent: true, opacity: 0.8 });
  k.box([w + 0.2, 0.4, depth + 0.2], t.bricks(0x8a8a8a), { position: [0, 0, 0], outline: true });
  k.box([w, 1.7, depth], glass, { position: [0, 0.4, 0] });
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => k.box([0.12, 1.7, 0.12], frame, { position: [(sx * w) / 2, 0.4, (sz * depth) / 2] })));
  const shape = new THREE.Shape(GABLE(depth, 1.1).map(([z, y]) => new THREE.Vector2(z, y)));
  k.piece(new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false }), glass, {
    rot: new THREE.Euler(0, Math.PI / 2, 0),
    position: [-w / 2, 2.1, 0],
  });
  k.box([w + 0.1, 0.1, 0.1], frame, { position: [0, 3.15, 0] });
  k.box([0.9, 1.4, 0.08], 0x6a7a8a, { position: [0, 0.4, depth / 2 + 0.03] });
  for (let i = 0; i < 4; i++) {
    k.box([w * 0.8, 0.5, 0.3], 0x4f9a3a, { position: [0, 0.4, -depth * 0.3 + i * 0.25] });
  }
  return { k, kSnow, depth };
}

function obeliskBody(u, name) {
  const style = OBELISKS[name];
  const k = u.builder();
  k.piece(new THREE.CylinderGeometry(0.85, 0.92, 0.35, 16), 0x8a8d92, { position: [0, 0.175, 0], outline: true });
  k.piece(new THREE.CylinderGeometry(0.62, 0.66, 4.2, 16), new THREE.MeshLambertMaterial({ map: obelisk(style.theme) }), {
    position: [0, 2.45, 0],
    uv: false,
    outline: true,
  });
  k.piece(new THREE.CylinderGeometry(0.76, 0.68, 0.34, 16), style.hoop, { position: [0, 4.72, 0], outline: true });
  for (let j = 0; j < 4; j++) {
    const a = (j * Math.PI) / 2 + Math.PI / 4;
    k.box([0.14, 0.14, 0.14], style.jewel, { position: [Math.sin(a) * 0.72, 4.65, Math.cos(a) * 0.72] });
  }
  return { k, kSnow: u.builder(), depth: 1.8, portalHeight: 4.95 };
}

function clockBody(u) {
  const gold = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x3a2600 });
  const k = u.builder();
  k.box([1.9, 0.22, 1.7], gold, { position: [0, 0, 0], color: 0xc8901a, outline: true });
  k.box([1.4, 1.3, 1.1], gold, { position: [0, 0.22, 0], color: 0xf2c230, outline: true });
  k.box([1.42, 1.3, 1.0], gold, { position: [0, 1.5, 0], color: 0xf2c230, outline: true });
  k.piece(new THREE.CircleGeometry(0.5, 20), new THREE.MeshLambertMaterial({ color: 0xf6f0d8 }), { position: [0, 2.15, 0.51], uv: false });
  k.box([0.04, 0.34, 0.03], DARK, { position: [0, 2.15, 0.53] });
  k.box([0.26, 0.04, 0.03], DARK, { position: [0, 2.15, 0.53] });
  k.box([1.2, 0.26, 0.86], gold, { position: [0, 2.8, 0], color: 0xc8901a, outline: true });
  return { k, kSnow: u.builder(), depth: 1.7 };
}

function shippingBin(u) {
  const t = textures(u);
  const k = u.builder();
  k.box([1.3, 0.62, 0.85], t.deck(0xb98a60), { position: [0, 0, 0], outline: true });
  k.piece(new THREE.BoxGeometry(1.42, 0.12, 0.95), t.deck(0xc87a3a), {
    rot: new THREE.Euler(-0.22, 0, 0),
    position: [0, 0.78, -0.08],
    outline: true,
  });
  k.box([0.3, 0.1, 0.06], 0xf2c230, { position: [0, 0.42, 0.44] });
  return { k, kSnow: u.builder(), depth: 0.85 };
}

function petBowl(u) {
  const k = u.builder();
  k.piece(new THREE.CylinderGeometry(0.3, 0.22, 0.2, 8), 0xc16b1b, { position: [0, 0.1, 0], outline: true });
  k.piece(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 8), 0x56a3e2, { position: [0, 0.19, 0] });
  return { k, kSnow: u.builder(), depth: 0.6 };
}

function fallbackBody(u, building) {
  const t = textures(u);
  const w = building.w * TILE;
  const depth = building.h * TILE;
  const k = u.builder();
  const kSnow = u.builder();
  const wall = t.planks(0xa8a090);
  k.box([w, 1.4, depth], wall, { position: [0, 0, 0], outline: true });
  const roofInfo = addRoof(k, {
    length: w,
    depth,
    y0: 1.4,
    profile: GABLE(depth, 0.8),
    wallMaterial: wall,
    roofMaterial: t.shingles(0x7a6a5a),
    ridge: DARK,
  });
  addSnowRoof(kSnow, roofInfo, w);
  return { k, kSnow, depth };
}

function bodyFor(u, building) {
  const { type } = building;
  if (type in COOPS) {
    return coopBody(u, type, building);
  }
  if (type in BARNS) {
    return barnBody(u, type, building);
  }
  if (type in SHEDS) {
    return shedBody(u, type, building);
  }
  if (type in CABINS) {
    return cabinBody(u, type, building);
  }
  if (type in OBELISKS) {
    return obeliskBody(u, type);
  }
  const simple = {
    Farmhouse: () => farmhouseCottage(u, building.level),
    Stable: () => stableBody(u, building),
    'Fish Pond': () => pondBody(u, building),
    'Slime Hutch': () => slimeBody(u, building),
    'Junimo Hut': () => junimoBody(u),
    Silo: () => silo(u),
    Mill: () => millBody(u),
    Well: () => wellBody(u),
    Greenhouse: () => greenhouseBody(u, building),
    'Gold Clock': () => clockBody(u),
    'Shipping Bin': () => shippingBin(u),
    'Pet Bowl': () => petBowl(u),
  };
  return (simple[type] ?? (() => fallbackBody(u, building)))();
}

const RADIAL = new Set(['Silo', 'Well', 'Junimo Hut', 'Pet Bowl', 'Shipping Bin', 'Gold Clock', 'Fish Pond']);

function centerOf(building, space) {
  const radial = RADIAL.has(building.type) || building.type in OBELISKS;
  const tileY = radial ? building.y + building.h / 2 : building.y + (building.h - 1) / 2;
  return [space.x(building.x + building.w / 2), space.z(tileY)];
}

export function buildBuildings(u, layout, space) {
  const root = new THREE.Group();
  const snow = [];
  const seasonal = [];
  const animated = [];
  const chimneys = [];
  const pondTextures = [];
  const portals = [];
  const portalMaterial = new THREE.MeshBasicMaterial({ map: spiral() });
  const claimed = new Set();

  function claim(group, type) {
    const category = CATEGORY[type];
    if (category && (category === 'obelisks' || !claimed.has(category))) {
      claimed.add(category);
      group.userData.cat = category;
      u.clickables.push(group);
    }
  }

  layout.buildings
    .filter((building) => building.building)
    .forEach((building) => {
      const [x, z] = centerOf(building, space);
      if (building.type === 'Farmhouse' && layout.houseLevel >= MATURE_HOUSE_LEVEL) {
        const house = buildHouse(u, { position: [x, z], yard: false });
        chimneys.push(() => house.chimney);
        seasonal.push(house.setSeason);
        return;
      }
      const body = bodyFor(u, { ...building, level: layout.houseLevel });
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      root.add(group);
      body.k.mount(group);
      snow.push(...body.kSnow.mount(group, { shadow: false }).values());
      if (body.surface) {
        group.add(body.surface);
        pondTextures.push(body.texture);
      }
      if (body.blades) {
        const spin = new THREE.Group();
        spin.position.set(...body.bladePosition);
        body.blades.mount(spin);
        group.add(spin);
        animated.push((t, dt) => {
          spin.rotation.z -= dt * 0.8;
        });
      }
      if (body.portalHeight) {
        const portal = new THREE.Mesh(new THREE.CircleGeometry(0.58, 16), portalMaterial);
        portal.rotation.x = -Math.PI / 2;
        portal.position.y = body.portalHeight;
        group.add(portal);
        portals.push(portal);
      }
      if (body.chimney) {
        chimneys.push(() => body.chimney.clone().add(group.position));
      }
      claim(group, building.type);
    });

  return {
    root,
    chimney: chimneys[0] ?? null,
    setSeason(season) {
      snow.forEach((mesh) => {
        mesh.visible = season === 'winter';
      });
      seasonal.forEach((apply) => apply(season));
    },
    animate(t, dt) {
      pondTextures.forEach((texture) => texture.offset.set(Math.sin(t * 0.3) * 0.06, t * 0.02));
      portalMaterial.color.setScalar(0.82 + Math.sin(t * 2.2) * 0.18);
      portals.forEach((portal, index) => {
        portal.rotation.z = t * (0.6 + index * 0.07);
      });
      animated.forEach((step) => step(t, dt));
    },
  };
}
