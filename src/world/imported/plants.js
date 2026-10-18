import * as THREE from 'three';
import { grass, verticalPlanks } from '../textures.js';
import { bushFruits, bushPlant, stemFruits, stemPlant, LEAVES } from '../assets/sprinklers.js';
import { TILE } from './space.js';

const LEAF_SHADOW = 0xb4b4b4;
const LEAF_MIDDLE = 0xd8d8d8;
const LEAF_LIGHT = 0xffffff;
const PINE_COLORS = { spring: 0x2f7a44, summer: 0x2a6e3c, fall: 0x2f6b3a, winter: 0x2a5e38 };
const SNOW = 0xf6fafc;
const DEAD_COLOR = 0x8a7050;
const MATURE_TREE_STAGE = 5;
const MATURE_FRUIT_STAGE = 4;
const TREE_SCALE = 0.62;
const FRUIT_COLORS = { 628: 0xd8343b, 629: 0xe8833a, 630: 0xf2a030, 631: 0xf2a07a, 632: 0xb02a4a, 633: 0xd8343b, 69: 0xf2d24a, 835: 0xf2a030 };
const FALLBACK_FRUIT = 0xd8343b;

const CROPS = {
  24: ['bush', 0xf3f0dc],
  188: ['trellis', 0x5fae3a],
  190: ['bush', 0xf3f0dc],
  192: ['bush', 0xc8a060],
  248: ['bush', 0xf3f0dc],
  250: ['bush', 0x3f8f2f],
  252: ['stem', 0xd8343b],
  254: ['bush', 0x56a84a],
  256: ['stem', 0xd8343b],
  258: ['bush', 0x5b6fd6],
  260: ['bush', 0xd8343b],
  262: ['stem', 0xe8d06a],
  264: ['bush', 0xd8343b],
  266: ['bush', 0x9b4fc4],
  268: ['stem', 0xe0a43a],
  270: ['stem', 0xe8d06a],
  272: ['bush', 0x7a3a9a],
  274: ['bush', 0x8aa860],
  276: ['bush', 0xe8833a],
  278: ['bush', 0x6dbb4a],
  280: ['bush', 0xc8702a],
  282: ['bush', 0xc0442e],
  284: ['bush', 0xb02a5a],
  300: ['stem', 0xb0306a],
  304: ['trellis', 0x8ad35c],
  376: ['flower', 0xe8833a],
  398: ['trellis', 0x7a3a9a],
  400: ['bush', 0xd8343b],
  417: ['bush', 0xe05ab0],
  421: ['stem', 0xf2c230],
  433: ['bush', 0x5a3a2a],
  454: ['trellis', 0x4fd0a8],
  591: ['flower', 0xf08ab8],
  593: ['flower', 0x7fb6f0],
  595: ['flower', 0xf08ab8],
  597: ['flower', 0x7fb6f0],
};
const DEFAULT_CROP = ['bush', 0xe8d06a];

function trellisPlant(k) {
  k.box([0.06, 1.1, 0.06], 0x7a4a26, { position: [0, 0, 0] });
  [0.25, 0.55, 0.85].forEach((y, i) => {
    [-1, 1].forEach((side) => k.box([0.3, 0.12, 0.2], LEAVES[i % 2 ? 2 : 1], { position: [side * 0.14, y, 0] }));
  });
}
function trellisFruits(k) {
  [
    [0.2, 0.4],
    [-0.2, 0.7],
    [0.18, 0.95],
  ].forEach(([x, y]) => k.box([0.12, 0.14, 0.12], 0xffffff, { position: [x, y, 0.08] }));
}
function flowerPlant(k) {
  k.box([0.05, 0.4, 0.05], LEAVES[0], { position: [0, 0, 0] });
  [0, Math.PI / 2].forEach((spin) =>
    k.piece(new THREE.BoxGeometry(0.5, 0.05, 0.16).translate(0, 0.12, 0), LEAVES[1], { rot: new THREE.Euler(0, spin, 0) }),
  );
}
function flowerFruits(k) {
  k.box([0.26, 0.1, 0.26], 0xffffff, { position: [0, 0.4, 0] });
  k.box([0.1, 0.1, 0.1], 0xffffff, { position: [0, 0.5, 0] });
}

const CROP_SHAPES = {
  bush: [bushPlant, bushFruits],
  stem: [stemPlant, stemFruits],
  trellis: [trellisPlant, trellisFruits],
  flower: [flowerPlant, flowerFruits],
};

function buildCrops(u, layout, space) {
  const { builder, materialByColor } = u;
  const root = new THREE.Group();
  const kinds = Object.fromEntries(
    Object.entries(CROP_SHAPES).map(([name, [leaves, fruits]]) => {
      const kLeaves = builder();
      leaves(kLeaves);
      const kFruits = builder();
      fruits(kFruits);
      return [name, { geoLeaves: kLeaves.join(), geoFruits: kFruits.join(), list: [] }];
    }),
  );
  layout.crops.forEach(({ x, y, crop }) => {
    if (crop) {
      const [kind, fruit] = CROPS[crop.id] ?? DEFAULT_CROP;
      kinds[kind].list.push({ x, y, crop, fruit });
    }
  });
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const color = new THREE.Color();
  Object.values(kinds).forEach((kind) => {
    const leaves = new THREE.InstancedMesh(kind.geoLeaves, materialByColor, Math.max(1, kind.list.length));
    const fruits = new THREE.InstancedMesh(kind.geoFruits, materialByColor, Math.max(1, kind.list.length));
    [leaves, fruits].forEach((mesh) => {
      mesh.count = kind.list.length;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    });
    kind.list.forEach((plant, index) => {
      const [x, z] = space.center(plant.x, plant.y);
      const { phase, phases, dead } = plant.crop;
      const grown = phase >= phases && !dead;
      const growth = dead ? 0.5 : 0.4 + 0.6 * Math.min(1, phase / phases);
      const variation = 0.85 + ((plant.x * 31 + plant.y * 17) % 10) / 30;
      position.set(x, 0.02, z);
      quaternion.setFromEuler(euler.set(0, plant.x + plant.y, 0));
      scale.set((0.55 + 0.45 * growth) * TILE * 1.15, growth * variation * TILE * 1.15, (0.55 + 0.45 * growth) * TILE * 1.15);
      matrix.compose(position, quaternion, scale);
      leaves.setMatrixAt(index, matrix);
      fruits.setMatrixAt(index, grown ? matrix : zero);
      leaves.setColorAt(index, color.setHex(dead ? DEAD_COLOR : 0xffffff));
      fruits.setColorAt(index, color.setHex(plant.fruit));
    });
  });
  return {
    root,
    setSeason(season) {
      root.visible = season !== 'winter';
    },
  };
}

function buildCanopies(u) {
  const { builder, materialTexture } = u;
  const leafMaterial = new THREE.MeshLambertMaterial({ map: grass({ base: 0xf4f4f4 }), vertexColors: true, color: 0x6ec24a });
  const pineMaterial = new THREE.MeshLambertMaterial({ map: grass({ base: 0xf4f4f4 }), vertexColors: true, color: PINE_COLORS.spring });
  const mBark = materialTexture(verticalPlanks({ base: 0x7a4a26, width: 2 }));

  function trunk(k, [w, h]) {
    k.box([w, h, w], mBark, { position: [0, 0, 0], outline: true });
    k.box([w * 1.6, 0.18, w * 0.5], mBark, { position: [0, 0, 0], color: 0xc0c0c0 });
    k.box([w * 0.5, 0.18, w * 1.6], mBark, { position: [0, 0, 0], color: 0xc0c0c0 });
  }
  function oak(wide) {
    const k = builder();
    const snow = builder();
    trunk(k, [0.5, 1.3]);
    const w = wide;
    const block = ([bw, bh, bd], c, [x, y, z]) =>
      k.box([bw * w, bh, bd * w], leafMaterial, { position: [x * w, 1.15 + y, z * w], color: c, outline: true });
    block([2.0, 0.6, 2.0], LEAF_SHADOW, [0, 0, 0]);
    block([2.4, 0.9, 1.8], LEAF_MIDDLE, [0, 0.45, 0]);
    block([1.8, 0.9, 2.4], LEAF_MIDDLE, [0, 0.45, 0]);
    block([1.7, 0.6, 1.7], LEAF_LIGHT, [0, 1.3, 0]);
    block([0.9, 0.35, 0.9], LEAF_LIGHT, [0, 1.85, 0]);
    snow.box([1.8 * w, 0.18, 1.8 * w], SNOW, { position: [0, 3.05, 0] });
    snow.box([1.0 * w, 0.16, 1.0 * w], SNOW, { position: [0, 3.35, 0] });
    return { k, snow };
  }
  function pine() {
    const k = builder();
    const snow = builder();
    k.box([0.36, 0.7, 0.36], mBark, { position: [0, 0, 0], outline: true });
    [
      [2.1, 0],
      [1.7, 0.6],
      [1.3, 1.2],
      [0.85, 1.75],
      [0.42, 2.2],
    ].forEach(([w, y], i) => {
      const rot = new THREE.Euler(0, i % 2 ? Math.PI / 4 : 0, 0);
      k.piece(new THREE.BoxGeometry(w, 0.62, w), pineMaterial, {
        color: [LEAF_SHADOW, LEAF_MIDDLE, LEAF_MIDDLE, LEAF_LIGHT, LEAF_LIGHT][i],
        rot,
        position: [0, y + 0.31 + 0.6, 0],
        outline: true,
      });
      snow.piece(new THREE.BoxGeometry(w * 0.82, 0.1, w * 0.82), SNOW, { rot, position: [0, y + 0.64 + 0.6, 0] });
    });
    return { k, snow };
  }
  function palm() {
    const k = builder();
    for (let i = 0; i < 6; i++) {
      k.box([0.42 - i * 0.02, 0.62, 0.42 - i * 0.02], i % 2 ? 0x9a6a3a : 0x8a5a2b, {
        position: [Math.sin(i * 0.5) * 0.25, i * 0.62, 0],
        outline: true,
      });
    }
    for (let i = 0; i < 7; i++) {
      const rot = new THREE.Euler(0, -(i / 7) * Math.PI * 2, 0);
      k.piece(new THREE.BoxGeometry(1.0, 0.08, 0.36).translate(0.5, 0, 0).rotateZ(0.25), 0x3f8f2f, { rot, position: [0.6, 3.75, 0] });
      k.piece(new THREE.BoxGeometry(0.8, 0.07, 0.3).translate(0.4, 0, 0).rotateZ(-0.6).translate(0.95, 0.24, 0), 0x4fa33a, {
        rot,
        position: [0.6, 3.75, 0],
      });
    }
    return { k, snow: builder() };
  }
  function sprout() {
    const k = builder();
    k.box([0.06, 0.3, 0.06], LEAVES[0], { position: [0, 0, 0] });
    [-1, 1].forEach((side) => k.box([0.2, 0.06, 0.1], LEAVES[2], { position: [side * 0.1, 0.28, 0] }));
    return { k, snow: builder() };
  }
  function sapling() {
    const k = builder();
    k.box([0.1, 0.55, 0.1], 0x7a4a26, { position: [0, 0, 0] });
    k.box([0.5, 0.3, 0.5], leafMaterial, { position: [0, 0.4, 0], color: LEAF_MIDDLE });
    k.box([0.3, 0.25, 0.3], leafMaterial, { position: [0, 0.65, 0], color: LEAF_LIGHT });
    return { k, snow: builder() };
  }
  function stump() {
    const k = builder();
    k.piece(new THREE.CylinderGeometry(0.3, 0.36, 0.4, 8), mBark, { position: [0, 0.2, 0], outline: true });
    k.piece(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 8), 0xd8a870, { position: [0, 0.41, 0] });
    return { k, snow: builder() };
  }

  const shapes = {
    oak: oak(1),
    maple: oak(0.8),
    pine: pine(),
    palm: palm(),
    sprout: sprout(),
    sapling: sapling(),
    stump: stump(),
  };
  return { shapes, leafMaterial, pineMaterial };
}

const treeShape = (tree) => {
  if (tree.stump) {
    return ['stump', 1];
  }
  if (tree.stage < 1) {
    return ['sprout', 0.5];
  }
  if (tree.stage === 1) {
    return ['sprout', 1];
  }
  if (tree.stage === 2) {
    return ['sapling', 1];
  }
  const scale = tree.stage >= MATURE_TREE_STAGE ? 1 : 0.45;
  const variation = 0.9 + ((tree.x * 13 + tree.y * 7) % 8) / 30;
  const kind = { 1: 'oak', 2: 'maple', 3: 'pine', 6: 'palm', 7: 'palm', 8: 'oak' }[tree.kind] ?? 'oak';
  return [kind, scale * variation];
};

function buildTrees(u, layout, space) {
  const root = new THREE.Group();
  const { shapes, leafMaterial, pineMaterial } = buildCanopies(u);
  const trees = [
    ...layout.trees.map((tree) => ({ ...tree, shape: treeShape(tree) })),
    ...layout.fruitTrees.map((tree) => ({
      ...tree,
      shape: tree.stump ? ['stump', 1] : [tree.stage >= MATURE_FRUIT_STAGE ? 'oak' : 'sapling', tree.stage >= MATURE_FRUIT_STAGE ? 0.8 : 1],
    })),
  ];
  const groups = new Map();
  trees.forEach((tree) => {
    const name = tree.shape[0];
    if (!groups.has(name)) {
      groups.set(name, []);
    }
    groups.get(name).push(tree);
  });

  const matrix = new THREE.Matrix4();
  const scaleVector = new THREE.Vector3();
  const snowMeshes = [];
  groups.forEach((list, name) => {
    const shape = shapes[name];
    const bodies = shape.k.instanced(list.length);
    const snow = shape.snow.instanced(list.length);
    [bodies, snow].forEach((instanced) => {
      instanced.setCount(list.length);
      instanced.mount(root);
    });
    snowMeshes.push(snow);
    list.forEach((tree, index) => {
      const [x, z] = space.center(tree.x, tree.y);
      const s = tree.shape[1] * TREE_SCALE * (name === 'palm' ? 0.8 : 1);
      matrix.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), scaleVector.set(s, s, s));
      bodies.setMatrixAt(index, matrix);
      snow.setMatrixAt(index, matrix);
    });
  });

  const fruitTrees = layout.fruitTrees.filter((tree) => tree.stage >= MATURE_FRUIT_STAGE && !tree.stump && tree.fruits > 0);
  const kFruit = u.builder();
  [
    [0.9, 2.1, 0.92],
    [-0.6, 1.85, 0.95],
    [1.22, 1.7, -0.4],
    [-0.3, 2.7, 0.86],
    [0.2, 1.75, 1.24],
    [-1.22, 2.15, 0.1],
  ].forEach(([x, y, z]) => kFruit.box([0.26, 0.26, 0.26], 0xffffff, { position: [x, y, z] }));
  const fruits = new THREE.InstancedMesh(kFruit.join(), u.materialByColor, Math.max(1, fruitTrees.length));
  fruits.count = fruitTrees.length;
  const color = new THREE.Color();
  fruitTrees.forEach((tree, index) => {
    const [x, z] = space.center(tree.x, tree.y);
    const s = 0.8 * TREE_SCALE;
    fruits.setMatrixAt(index, matrix.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), scaleVector.set(s, s, s)));
    fruits.setColorAt(index, color.setHex(FRUIT_COLORS[tree.kind] ?? FALLBACK_FRUIT));
  });
  root.add(fruits);

  function setSeason(season, palette) {
    leafMaterial.color.setHex(palette.leaves[0]);
    pineMaterial.color.setHex(PINE_COLORS[season]);
    snowMeshes.forEach((snow) => snow.setVisible(season === 'winter'));
    fruits.visible = season === 'summer' || season === 'fall';
  }
  return { root, setSeason };
}

function buildBushes(u, layout, space) {
  const { builder } = u;
  const leafMaterial = new THREE.MeshLambertMaterial({ map: grass({ base: 0xf4f4f4 }), vertexColors: true, color: 0x6ec24a });
  const k = builder();
  k.box([0.95, 0.5, 0.8], leafMaterial, { position: [0, 0, 0], color: LEAF_SHADOW, outline: true });
  k.box([0.7, 0.35, 0.95], leafMaterial, { position: [0, 0.1, 0], color: LEAF_MIDDLE, outline: true });
  k.box([0.55, 0.25, 0.55], leafMaterial, { position: [0, 0.45, 0], color: LEAF_LIGHT });
  const instanced = k.instanced(Math.max(1, layout.bushes.length));
  instanced.setCount(layout.bushes.length);
  const matrix = new THREE.Matrix4();
  const scale = new THREE.Vector3();
  layout.bushes.forEach((bush, index) => {
    const width = [1, 1.6, 2.4][bush.size] ?? 1;
    const [x, z] = space.center(bush.x, bush.y);
    const s = width * TILE * 1.1;
    instanced.setMatrixAt(index, matrix.compose(new THREE.Vector3(x + ((width - 1) * TILE) / 2, 0, z), new THREE.Quaternion(), scale.set(s, s, s)));
  });
  return {
    instanced,
    setSeason: (season, palette) => leafMaterial.color.setHex(palette.leaves[0]).offsetHSL(0, 0, season === 'winter' ? 0.1 : 0),
  };
}

export function buildPlants(u, layout, space) {
  const crops = buildCrops(u, layout, space);
  const trees = buildTrees(u, layout, space);
  const bushes = buildBushes(u, layout, space);
  const root = new THREE.Group();
  root.add(crops.root, trees.root);
  bushes.instanced.mount(root);
  return {
    root,
    setSeason(season, palette) {
      crops.setSeason(season);
      trees.setSeason(season, palette);
      bushes.setSeason(season, palette);
    },
  };
}
