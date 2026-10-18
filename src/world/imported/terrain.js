import * as THREE from 'three';
import { deckPlanks, earth, grass, pavement, rock, water } from '../textures.js';
import { TILE } from './space.js';

const FLOOR_COLORS = [0xb98a54, 0x9a958c, 0x8a6a4a, 0x9ec8e8, 0xe0c060, 0xa09a90, 0xa87a46, 0x8fb8d8, 0x8b8680, 0xb8b0a0, 0xa05a40, 0xa87a46];
const FLOOR_HEIGHT = 0.012;
const SOIL_HEIGHT = 0.02;
const WET_COLOR = new THREE.Color(0x3e2412);
const PATH_COLOR_WINTER = 0xe2ddd6;
const TUFT_LIMIT = 1600;
const GRASS_VARIANTS = 4;
const WATER_HEIGHT = -0.03;
const DIRT_COLORS = { spring: 0xe8a82a, summer: 0xe0a02a, fall: 0xcf8a2e, winter: 0xdcd6cc };
const STONE_COLORS = { spring: 0xc4b8a4, summer: 0xc4b8a4, fall: 0xbfae94, winter: 0xe2ddd6 };
const WOOD_COLOR = 0xb87a42;

function tileLayer(list, material, { space, y }) {
  const geometry = new THREE.PlaneGeometry(TILE, TILE).rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, list.length));
  mesh.count = list.length;
  mesh.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  list.forEach((tile, index) => {
    const [x, z] = space.center(tile.x, tile.y);
    mesh.setMatrixAt(index, matrix.makeTranslation(x, y, z));
    mesh.setColorAt(index, color.setHex(0xffffff));
  });
  function paint(pick) {
    list.forEach((tile, index) => mesh.setColorAt(index, pick(tile, color)));
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }
  return { mesh, paint };
}

function groundTiles({ width, height, at }, kind) {
  const tiles = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (at(x, y) === kind) {
        tiles.push({ x, y, variant: (x * 7 + y * 13 + ((x * y) % 5)) % GRASS_VARIANTS });
      }
    }
  }
  return tiles;
}

function buildBody(u, space, parent) {
  const { builder, materialTexture, random } = u;
  const [sx, sz] = space.size;
  const kb = builder();
  const mEarth = materialTexture(rock({ base: 0x8a5a2b }));
  const mStone = materialTexture(rock({ base: 0x857868 }));
  kb.box([sx, 2.3, sz], mEarth, { position: [0, -2.6, 0], outline: true });
  kb.box([sx - 1.2, 1.6, sz - 1.2], mStone, { position: [0, -4.2, 0], outline: true });
  kb.box([sx - 3.6, 1.4, sz - 3.6], mStone, { position: [0, -5.6, 0], color: 0xd8d8d8, outline: true });
  kb.box([sx * 0.6, 1.3, sz * 0.6], mStone, { position: [0, -6.9, 0], color: 0xc0c0c0, outline: true });
  kb.box([sx * 0.3, 1.4, sz * 0.3], mStone, { position: [0, -8.3, 0], color: 0xb0b0b0, outline: true });
  const roots = builder();
  const rootCount = Math.round((sx + sz) / 2);
  for (let i = 0; i < rootCount; i++) {
    const along = (random() - 0.5) * (i % 2 ? sz : sx);
    const h = 0.4 + random() * 0.9;
    const [x, z] = i % 2 ? [sx / 2 + 0.04, along] : [along, sz / 2 + 0.04];
    roots.box([0.08, h, 0.08], i % 3 ? 0x6e4222 : 0x4f9a3a, { position: [x, -0.3 - h, z] });
  }
  kb.mount(parent, { shadow: false });
  roots.mount(parent, { shadow: false });
  const lipMaterial = new THREE.MeshLambertMaterial({ map: grass({ base: 0xeeeeee }), color: 0x6daa2c });
  const lip = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.02, 0.3, sz + 0.02).translate(0, -0.21, 0), lipMaterial);
  parent.add(lip);
  return lipMaterial;
}

function buildTufts(u, layout, space) {
  const { builder, random } = u;
  const k = builder();
  k.box([0.06, 0.3, 0.06], 0xffffff, { position: [0, 0, 0] });
  k.piece(new THREE.BoxGeometry(0.05, 0.24, 0.05), 0xffffff, { rot: new THREE.Euler(0, 0, 0.4), position: [0.06, 0.1, 0.02] });
  k.piece(new THREE.BoxGeometry(0.05, 0.22, 0.05), 0xffffff, { rot: new THREE.Euler(0.4, 0, -0.3), position: [-0.05, 0.1, -0.04] });
  const spots = layout.grass.slice(0, TUFT_LIMIT);
  const mesh = new THREE.InstancedMesh(k.join(), new THREE.MeshLambertMaterial({ vertexColors: true }), Math.max(1, spots.length));
  mesh.count = spots.length;
  const matrix = new THREE.Matrix4();
  spots.forEach((spot, index) => {
    const [x, z] = space.center(spot.x, spot.y);
    mesh.setMatrixAt(index, matrix.makeRotationY(index).setPosition(x + (random() - 0.5) * 0.3, 0, z + (random() - 0.5) * 0.3));
  });
  return mesh;
}

export function buildTerrain(u, layout, space) {
  const root = new THREE.Group();
  const lipMaterial = buildBody(u, space, root);

  const { map } = space;
  const layer = (kind, material, y) => tileLayer(groundTiles(map, kind), material, { space, y });
  const grassLayer = layer('g', new THREE.MeshLambertMaterial({ map: grass({ base: 0xeeeeee }) }), 0);
  const dirtLayer = layer('d', new THREE.MeshLambertMaterial({ map: earth({ base: 0xf2f2f2 }) }), 0);
  const sandLayer = layer('n', new THREE.MeshLambertMaterial({ map: grass({ base: 0xeeeeee }) }), 0);
  const stoneLayer = layer('s', new THREE.MeshLambertMaterial({ map: pavement({ stone: 0xeeeeee }) }), 0);
  const woodLayer = layer('o', new THREE.MeshLambertMaterial({ map: deckPlanks({ base: 0xeeeeee }) }), 0);
  const waterTexture = water({ base: 0xe8f4ff });
  const waterMaterial = new THREE.MeshLambertMaterial({ map: waterTexture, color: 0x3f8fd6 });
  const waterLayer = layer('w', waterMaterial, WATER_HEIGHT);
  const floorMaterial = new THREE.MeshLambertMaterial({ map: pavement({ stone: 0xeeeeee }) });
  const floors = tileLayer(layout.flooring, floorMaterial, { space, y: FLOOR_HEIGHT });
  const soilMaterial = new THREE.MeshLambertMaterial({ map: earth({ base: 0xe6e6e6 }) });
  const soil = tileLayer(layout.crops, soilMaterial, { space, y: SOIL_HEIGHT });
  const tufts = buildTufts(u, layout, space);
  root.add(grassLayer.mesh, dirtLayer.mesh, sandLayer.mesh, stoneLayer.mesh, woodLayer.mesh, waterLayer.mesh, floors.mesh, soil.mesh, tufts);

  const color = new THREE.Color();
  const soilMix = new THREE.Color();
  const soilPalettes = { warm: null, winter: null };
  let winterAmount = 0;
  function paintSoil() {
    soil.paint((tile, c) => {
      const index = (tile.x + tile.y) % 2;
      c.setHex(soilPalettes.warm[index]).lerp(soilMix.setHex(soilPalettes.winter[index]), winterAmount);
      return tile.watered ? c.lerp(WET_COLOR, 0.6 * (1 - winterAmount)) : c;
    });
  }
  function setWinterAmount(amount) {
    if (Math.abs(amount - winterAmount) < 1e-3 || !soilPalettes.warm) {
      return;
    }
    winterAmount = amount;
    paintSoil();
  }
  const shade = (tile, c, base) => c.setHex(base).offsetHSL(0, 0, (tile.variant - 1.5) * 0.015);
  function setSeason(season, palette) {
    grassLayer.paint((tile, c) => c.setHex(palette.grass[tile.variant]));
    dirtLayer.paint((tile, c) => shade(tile, c, DIRT_COLORS[season]));
    sandLayer.paint((tile, c) => shade(tile, c, palette.sand));
    stoneLayer.paint((tile, c) => shade(tile, c, STONE_COLORS[season]));
    woodLayer.paint((tile, c) => shade(tile, c, WOOD_COLOR));
    waterMaterial.color.setHex(palette.water[0]);
    floors.paint((tile, c) => c.setHex(season === 'winter' ? PATH_COLOR_WINTER : (FLOOR_COLORS[tile.floor] ?? FLOOR_COLORS[1])));
    soilPalettes[season === 'winter' ? 'winter' : 'warm'] = palette.soil;
    soilPalettes.warm ??= palette.soil;
    soilPalettes.winter ??= palette.soil;
    paintSoil();
    lipMaterial.color.setHex(palette.grass[3]).offsetHSL(0, 0, -0.05);
    tufts.visible = season !== 'winter';
    for (let index = 0; index < tufts.count; index++) {
      tufts.setColorAt(index, color.setHex(palette.grass[3]).offsetHSL(0, 0, -0.1 + (index % 3) * 0.04));
    }
    if (tufts.instanceColor) {
      tufts.instanceColor.needsUpdate = true;
    }
  }

  function animate(t) {
    waterTexture.offset.set(Math.sin(t * 0.3) * 0.06, t * 0.02);
  }

  return { root, setSeason, setWinterAmount, animate };
}
