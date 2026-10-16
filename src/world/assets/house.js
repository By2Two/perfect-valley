import * as THREE from 'three';
import { verticalPlanks, deckPlanks, shingles, bricks, slats } from '../textures.js';

const COLOR = {
  wall: 0xe9a548,
  shingle: 0xc8432f,
  ridge: 0x8e2a22,
  stone: 0x9a958c,
  chimney: 0x8f8778,
  deck: 0xc87a3a,
  frame: 0x6e3a1e,
  band: 0x7a4426,
  shutter: 0x9a3a28,
  door: 0x9a5530,
  darkDoor: 0x7a4024,
  handrail: 0xa0582a,
  snow: 0xf6fafc,
  leaf: 0x4f9a3a,
  lightLeaf: 0x6ec24a,
};
const FLOWER_COLORS = [0xf08ab8, 0xfff4e0, 0xf2c230, 0x9b4fc4];

const L = 6;
const P = 4.2;
const Y0 = 2.72;
const PROFILE = [
  [-2.1, 0],
  [-1.55, 1.25],
  [0, 1.95],
  [1.55, 1.25],
  [2.1, 0],
];

export function buildHouse(u) {
  const { builder, materialTexture, clickable, group, windowMaterial, lanternMaterial } = u;
  const mWall = materialTexture(verticalPlanks({ base: COLOR.wall }));
  const mShingle = materialTexture(shingles({ base: COLOR.shingle }));
  const mStone = materialTexture(bricks({ base: COLOR.stone }));
  const mChimney = materialTexture(bricks({ base: COLOR.chimney }));
  const mDeck = materialTexture(deckPlanks({ base: COLOR.deck }));
  const mShutter = materialTexture(slats({ base: COLOR.shutter }));

  const k = builder();
  const kSnow = builder();
  const kFlowers = builder();

  const onWall =
    (wallBuilder, face, plane) =>
    ([w, h, d], material, { along, y, offset, ...options }) =>
      face === 'z'
        ? wallBuilder.box([w, h, d], material, { position: [along, y, plane + offset], ...options })
        : wallBuilder.box([d, h, w], material, { position: [plane + offset, y, -along], ...options });

  function addWindow({ face, plane, along, y }, [w, h], { shutters = true, planter = false } = {}) {
    const pz = onWall(k, face, plane);
    const e = 0.09;
    pz([w + 2 * e, e, 0.1], COLOR.frame, { along, y: y - e, offset: 0.05 });
    pz([w + 2 * e, e, 0.1], COLOR.frame, { along, y: y + h, offset: 0.05 });
    pz([e, h, 0.1], COLOR.frame, { along: along - w / 2 - e / 2, y, offset: 0.05 });
    pz([e, h, 0.1], COLOR.frame, { along: along + w / 2 + e / 2, y, offset: 0.05 });
    pz([w, h, 0.06], windowMaterial, { along, y, offset: 0.03 });
    pz([0.06, h, 0.08], COLOR.frame, { along, y, offset: 0.04 });
    pz([w, 0.06, 0.08], COLOR.frame, { along, y: y + h / 2 - 0.03, offset: 0.04 });
    pz([w + 0.34, 0.07, 0.2], COLOR.frame, { along, y: y - e - 0.07, offset: 0.1 });
    if (shutters) {
      [-1, 1].forEach((s) => pz([0.24, h + 0.1, 0.05], mShutter, { along: along + s * (w / 2 + e + 0.14), y: y - 0.05, offset: 0.03 }));
    }
    if (planter) {
      const baseY = y - e - 0.36;
      pz([w + 0.1, 0.22, 0.26], mDeck, { along, y: baseY, offset: 0.13, color: 0xb08060 });
      const pf = onWall(kFlowers, face, plane);
      pf([w, 0.1, 0.2], COLOR.leaf, { along, y: baseY + 0.22, offset: 0.13 });
      const n = Math.round(w / 0.18);
      for (let i = 0; i < n; i++) {
        const fu = along - w / 2 + 0.09 + (i * (w - 0.18)) / (n - 1);
        pf([0.13, 0.13, 0.13], i % 2 ? COLOR.lightLeaf : FLOWER_COLORS[i % FLOWER_COLORS.length], {
          along: fu,
          y: baseY + 0.3,
          offset: 0.13 + ((i % 3) - 1) * 0.04,
        });
      }
    }
  }

  k.box([L + 0.3, 0.5, P + 0.3], mStone, { position: [0, 0, 0], outline: true });
  k.box([L, 2.1, P], mWall, { position: [0, 0.5, 0], outline: true });
  k.box([L + 0.14, 0.22, P + 0.14], COLOR.band, { position: [0, 2.5, 0] });
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([sx, sz]) => k.box([0.16, 2.0, 0.16], COLOR.band, { position: [(sx * L) / 2, 0.5, (sz * P) / 2] }));
  const shape = new THREE.Shape(PROFILE.map(([z, y]) => new THREE.Vector2(z, y)));
  k.piece(new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false }), mWall, {
    rot: new THREE.Euler(0, Math.PI / 2, 0),
    position: [-L / 2, Y0, 0],
    outline: true,
  });

  const thickness = 0.16;
  const Lt = L + 0.5;
  [1, -1].forEach((s) => {
    const eaves = [s * 2.1, Y0];
    const knee = [s * 1.55, Y0 + 1.25];
    const ridge = [0, Y0 + 1.95];
    k.slab([eaves, knee], mShingle, { thickness, length: Lt, extension: [0.32, 0.1], outline: true });
    k.slab([knee, ridge], mShingle, { thickness, length: Lt, extension: [0.04, 0.06], outline: true });
    kSnow.slab([knee, ridge], COLOR.snow, { thickness: 0.12, length: Lt + 0.04, extension: [0.08, 0.06], over: thickness });
  });
  k.box([Lt + 0.04, 0.16, 0.34], COLOR.ridge, { position: [0, Y0 + 2.0, 0], outline: true });
  kSnow.box([Lt + 0.08, 0.12, 0.42], COLOR.snow, { position: [0, Y0 + 2.14, 0] });

  [-1.5, 1.5].forEach((dx) => {
    k.box([1.1, 0.95, 1.05], mWall, { position: [dx, Y0 + 0.4, 1.45], outline: true });
    addWindow({ face: 'z', plane: 1.975, along: dx, y: Y0 + 0.76 }, [0.6, 0.44], { shutters: false });
    const a = [2.12, Y0 + 1.3];
    const b = [0.9, Y0 + 1.55];
    k.slab([a, b], mShingle, { thickness: 0.12, length: 1.35, center: dx, extension: [0.1, 0], outline: true });
    kSnow.slab([a, b], COLOR.snow, { thickness: 0.1, length: 1.4, center: dx, extension: [0.1, 0], over: 0.12 });
  });

  const CH = [2.2, -0.75];
  k.box([0.8, 3.25, 0.8], mChimney, { position: [CH[0], 2.6, CH[1]], outline: true });
  k.box([0.98, 0.16, 0.98], 0x5e5a55, { position: [CH[0], 5.85, CH[1]], outline: true });
  kSnow.box([0.98, 0.08, 0.98], COLOR.snow, { position: [CH[0], 6.01, CH[1]] });

  const front = onWall(k, 'z', P / 2);
  front([0.1, 1.85, 0.1], COLOR.frame, { along: -0.5, y: 0.52, offset: 0.05 });
  front([0.1, 1.85, 0.1], COLOR.frame, { along: 0.5, y: 0.52, offset: 0.05 });
  front([1.1, 0.1, 0.1], COLOR.frame, { along: 0, y: 2.27, offset: 0.05 });
  front([0.9, 1.75, 0.07], COLOR.door, { along: 0, y: 0.52, offset: 0.035 });
  [-0.2, 0.2].forEach((along) => front([0.3, 0.55, 0.09], COLOR.darkDoor, { along, y: 0.68, offset: 0.045 }));
  front([0.5, 0.45, 0.09], windowMaterial, { along: 0, y: 1.62, offset: 0.045 });
  front([0.05, 0.45, 0.1], COLOR.door, { along: 0, y: 1.62, offset: 0.05 });
  front([0.5, 0.05, 0.1], COLOR.door, { along: 0, y: 1.82, offset: 0.05 });
  front([0.08, 0.08, 0.14], 0xf2c230, { along: 0.3, y: 1.25, offset: 0.07 });
  k.slab(
    [
      [2.95, 2.3],
      [2.12, 2.52],
    ],
    mShingle,
    { thickness: 0.1, length: 1.5, outline: true },
  );
  kSnow.slab(
    [
      [2.95, 2.3],
      [2.12, 2.52],
    ],
    COLOR.snow,
    { thickness: 0.08, length: 1.5, over: 0.1 },
  );
  [-0.65, 0.65].forEach((along) => front([0.07, 0.07, 0.8], COLOR.frame, { along, y: 2.24, offset: 0.4 }));
  front([0.2, 0.28, 0.2], lanternMaterial, { along: 0.8, y: 1.85, offset: 0.18 });
  front([0.26, 0.06, 0.26], COLOR.frame, { along: 0.8, y: 2.13, offset: 0.18 });
  front([0.05, 0.05, 0.12], COLOR.frame, { along: 0.8, y: 2.0, offset: 0.06 });
  [-2.0, 2.0].forEach((along) => addWindow({ face: 'z', plane: P / 2, along, y: 1.15 }, [0.8, 0.8], { planter: true }));
  addWindow({ face: 'x', plane: L / 2, along: 0, y: 1.15 }, [0.9, 0.8], { planter: true });
  addWindow({ face: 'x', plane: L / 2, along: 0, y: Y0 + 0.45 }, [0.7, 0.6], { shutters: false });

  k.box([L + 0.3, 0.38, 1.2], mStone, { position: [0, 0, 2.85], outline: true });
  k.box([L + 0.42, 0.14, 1.45], mDeck, { position: [0, 0.38, 2.82], outline: true });
  k.box([1.6, 0.34, 0.4], mDeck, { position: [0, 0, 3.75], outline: true });
  k.box([1.6, 0.17, 0.4], mDeck, { position: [0, 0, 4.15], outline: true });
  [
    [-3.15, 3.45],
    [-0.88, 3.45],
    [0.88, 3.45],
    [3.15, 3.45],
    [-3.15, 2.25],
    [3.15, 2.25],
  ].forEach(([x, z]) => k.box([0.14, 0.62, 0.14], COLOR.frame, { position: [x, 0.52, z] }));
  [-1, 1].forEach((s) => {
    [1.05, 0.8].forEach((y, i) => {
      k.box([2.41, i ? 0.06 : 0.09, 0.12], COLOR.handrail, { position: [s * 2.015, y, 3.45] });
      k.box([0.12, i ? 0.06 : 0.09, 1.2], COLOR.handrail, { position: [s * 3.15, y, 2.85] });
    });
  });
  k.box([0.9, 0.025, 0.5], 0x8e2a22, { position: [0, 0.52, 2.45] });
  k.box([0.74, 0.03, 0.36], 0xd8603a, { position: [0, 0.52, 2.45] });
  k.box([0.42, 0.07, 0.95], 0xb06a34, { position: [-2.75, 0.85, 2.85] });
  [
    [-0.15, -0.4],
    [0.15, -0.4],
    [-0.15, 0.4],
    [0.15, 0.4],
  ].forEach(([dx, dz]) => k.box([0.07, 0.33, 0.07], COLOR.frame, { position: [-2.75 + dx, 0.52, 2.85 + dz] }));
  k.piece(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 8), 0xb5603a, { position: [-0.8, 0.68, 2.42] });
  k.box([0.44, 0.06, 0.44], 0xa04f30, { position: [-0.8, 0.82, 2.42] });
  k.box([0.36, 0.18, 0.36], COLOR.leaf, { position: [-0.8, 0.86, 2.42] });
  k.box([0.2, 0.16, 0.2], COLOR.lightLeaf, { position: [-0.8, 1.02, 2.42] });
  [
    [-0.12, 0.1],
    [0.12, -0.08],
    [0.06, 0.14],
  ].forEach(([dx, dz], i) => kFlowers.box([0.14, 0.14, 0.14], [0x9b4fc4, 0xc06ad8, 0x9b4fc4][i], { position: [-0.8 + dx, 1.08, 2.42 + dz] }));
  k.box([0.55, 0.25, 0.4], mDeck, { position: [0.95, 0.52, 2.45], color: 0x9a7050 });
  [
    [-0.14, 0],
    [0.1, 0.05],
    [0.02, -0.08],
  ].forEach(([dx, dz], i) => {
    k.box([0.07, 0.12 + i * 0.03, 0.07], 0xfff4e0, { position: [0.95 + dx, 0.77, 2.45 + dz] });
    k.box([0.18, 0.08, 0.18], 0xd8343b, { position: [0.95 + dx, 0.88 + i * 0.03, 2.45 + dz] });
    k.box([0.05, 0.02, 0.05], 0xffffff, { position: [0.95 + dx + 0.04, 0.96 + i * 0.03, 2.45 + dz + 0.04] });
  });

  k.box([0.12, 0.85, 0.12], COLOR.frame, { position: [-1.35, 0, 4.0] });
  k.box([0.34, 0.3, 0.52], 0x5f7fb0, { position: [-1.35, 0.85, 4.0], outline: true });
  k.box([0.3, 0.06, 0.5], 0x7f9fd0, { position: [-1.35, 1.15, 4.0] });
  k.box([0.04, 0.22, 0.1], 0xd8343b, { position: [-1.17, 0.95, 3.9] });

  const house = group(-5.5, -6.5);
  k.mount(house);
  const snow = [...kSnow.mount(house, { shadow: false }).values()];
  const flowers = [...kFlowers.mount(house).values()];
  clickable(house, 'friends');
  const chimney = new THREE.Vector3(-5.5 + CH[0], 6.05, -6.5 + CH[1]);

  const kc = builder();
  kc.box([1.3, 0.62, 0.85], mDeck, { position: [0, 0, 0], color: 0xb98a60, outline: true });
  [
    [-0.62, -0.4],
    [0.62, -0.4],
    [-0.62, 0.4],
    [0.62, 0.4],
  ].forEach(([x, z]) => kc.box([0.1, 0.64, 0.1], COLOR.frame, { position: [x, 0, z] }));
  kc.box([0.25, 0.18, 0.25], 0xe8833a, { position: [-0.3, 0.6, 0.1] });
  kc.box([0.22, 0.2, 0.22], 0x9b4fc4, { position: [0.1, 0.6, -0.05] });
  kc.box([0.2, 0.16, 0.2], 0xd8343b, { position: [0.35, 0.6, 0.12] });
  kc.piece(new THREE.BoxGeometry(1.42, 0.12, 0.95), mDeck, { rot: new THREE.Euler(-0.22, 0, 0), position: [0, 0.78, -0.08], outline: true });
  kc.box([0.3, 0.1, 0.06], 0xf2c230, { position: [0, 0.42, 0.44] });
  const shippingBox = group(-1.3, -3.2);
  kc.mount(shippingBox);
  clickable(shippingBox, 'shipping');

  const kb = builder();
  kb.box([1.7, 0.14, 0.85], mDeck, { position: [0, 0.7, 0], outline: true });
  [
    [-0.75, -0.35],
    [0.75, -0.35],
    [-0.75, 0.35],
    [0.75, 0.35],
  ].forEach(([x, z]) => kb.box([0.12, 0.7, 0.12], COLOR.frame, { position: [x, 0, z] }));
  kb.box([1.5, 0.08, 0.7], mDeck, { position: [0, 0.2, 0], color: 0xb08060 });
  kb.box([1.1, 0.12, 0.3], mDeck, { position: [0, 0.28, 0.05], color: 0xd8a070 });
  kb.box([0.35, 0.22, 0.3], 0x8a8f94, { position: [-0.5, 0.84, 0.1] });
  kb.box([0.1, 0.1, 0.4], 0x5e636a, { position: [-0.5, 0.92, 0.1] });
  kb.box([0.06, 0.06, 0.45], 0x8a5a2b, { position: [0.35, 0.84, 0.12] });
  kb.box([0.22, 0.1, 0.1], 0x5e636a, { position: [0.35, 0.86, -0.12] });
  kb.box([0.5, 0.02, 0.18], 0xc0c4c8, { position: [0.05, 0.84, -0.22] });
  const bench = group(-1.3, -6.2);
  kb.mount(bench);
  clickable(bench, 'crafting');

  function setSeason(season) {
    snow.forEach((m) => {
      m.visible = season === 'winter';
    });
    flowers.forEach((m) => {
      m.visible = season !== 'winter';
    });
  }
  return { group: house, chimney, setSeason };
}
