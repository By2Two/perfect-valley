import * as THREE from 'three';
import { earth } from '../textures.js';

const SPRINKLERS = [
  [1, 1],
  [4, 1],
  [1, 4],
  [4, 4],
  [1, 7],
  [4, 7],
];
const NEIGHBORS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];
const DROPS_PER_TILE = 4;
const SPLASHES_PER_TILE = 4;
const FLIGHT = 0.6;
const WET_COLOR = new THREE.Color(0x3e2412);
export const LEAVES = [0x3f8f2f, 0x5fae3a, 0x8ad35c];

export function bushPlant(k) {
  k.box([0.08, 0.35, 0.08], LEAVES[0], { position: [0, 0, 0] });
  [
    [0.12, 0.34, 0.5, 0, LEAVES[0]],
    [0.3, 0.28, 0.75, Math.PI / 4, LEAVES[1]],
  ].forEach(([y, length, tilt, spin, color]) => {
    for (let i = 0; i < 4; i++) {
      const g = new THREE.BoxGeometry(length, 0.06, 0.18).translate(length / 2, 0, 0);
      g.rotateZ(tilt)
        .rotateY(spin + (i * Math.PI) / 2)
        .translate(0, y, 0);
      k.piece(g, color);
    }
  });
  k.box([0.2, 0.16, 0.2], LEAVES[2], { position: [0, 0.46, 0] });
}
export function bushFruits(k) {
  [
    [0.18, 0.32, 0.1],
    [-0.15, 0.4, -0.12],
    [0.03, 0.58, 0.15],
  ].forEach(([x, y, z]) => k.box([0.14, 0.14, 0.14], 0xffffff, { position: [x, y, z] }));
}
export function stemPlant(k) {
  k.box([0.07, 0.85, 0.07], LEAVES[0], { position: [0, 0, 0] });
  [0.18, 0.42, 0.66].forEach((y, i) => {
    [0, Math.PI].forEach((side) => {
      const g = new THREE.BoxGeometry(0.3, 0.05, 0.12).translate(0.15, 0, 0);
      g.rotateZ(0.6)
        .rotateY(side + (i % 2 ? Math.PI / 2 : 0))
        .translate(0, y, 0);
      k.piece(g, LEAVES[i === 2 ? 2 : 1]);
    });
  });
  k.box([0.16, 0.14, 0.16], LEAVES[2], { position: [0, 0.82, 0] });
}
export function stemFruits(k) {
  k.box([0.13, 0.17, 0.13], 0xffffff, { position: [0.12, 0.38, 0.06] });
  k.box([0.13, 0.17, 0.13], 0xffffff, { position: [-0.1, 0.62, -0.08] });
  k.box([0.16, 0.12, 0.16], 0xffffff, { position: [0, 0.95, 0] });
}

export function buildFarmland(u, field) {
  const { builder, materialByColor, group, clickable, random } = u;
  const farmland = group(0, 0);
  const isSprinkler = (ix, iz) => SPRINKLERS.some(([a, b]) => a === ix && b === iz);

  const tiles = [];
  for (let x = field.x0 + 0.5, ix = 0; x < field.x1; x++, ix++) {
    for (let z = field.z0 + 0.5, iz = 0; z < field.z1; z++, iz++) {
      tiles.push({ x, z, ix, iz, wet: 0, dry: new THREE.Color() });
    }
  }
  const indexTile = (ix, iz) => tiles.findIndex((t) => t.ix === ix && t.iz === iz);
  const soil = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.05, 1),
    new THREE.MeshLambertMaterial({ map: earth({ base: 0xe6e6e6 }) }),
    tiles.length,
  );
  const m4 = new THREE.Matrix4();
  tiles.forEach((t, i) => {
    soil.setMatrixAt(i, m4.makeTranslation(t.x, 0, t.z));
    soil.setColorAt(i, t.dry);
  });
  soil.receiveShadow = true;
  farmland.add(soil);

  const kinds = [
    [bushPlant, bushFruits],
    [stemPlant, stemFruits],
  ].map(([leaves, fruits]) => {
    const kf = builder();
    leaves(kf);
    const kr = builder();
    fruits(kr);
    return { geoLeaves: kf.join(), geoFruits: kr.join(), list: [] };
  });
  const plants = [];
  tiles.forEach((t) => {
    if (isSprinkler(t.ix, t.iz)) {
      return;
    }
    const kind = kinds[t.iz % 2];
    const p = {
      x: t.x,
      z: t.z,
      kind,
      i: kind.list.length,
      colorIdx: t.iz % 4,
      spin: random() * Math.PI * 2,
      variation: 0.8 + (Math.abs(Math.floor(t.x * 31 + t.z * 17)) % 10) / 25,
      phase: random() * 6,
    };
    kind.list.push(p);
    plants.push(p);
  });
  kinds.forEach((tp) => {
    tp.leaves = new THREE.InstancedMesh(tp.geoLeaves, materialByColor, tp.list.length);
    tp.fruits = new THREE.InstancedMesh(tp.geoFruits, materialByColor, tp.list.length);
    tp.leaves.castShadow = true;
    tp.leaves.receiveShadow = true;
    farmland.add(tp.leaves, tp.fruits);
  });

  const k = builder();
  const sprinklerPosition = SPRINKLERS.map(([ix, iz]) => [field.x0 + 0.5 + ix, field.z0 + 0.5 + iz]);
  const heads = sprinklerPosition.map(([x, z]) => {
    k.box([0.3, 0.06, 0.3], 0x5e636a, { position: [x, 0.02, z] });
    k.piece(new THREE.CylinderGeometry(0.06, 0.07, 0.42, 6), 0xa8b0b8, { position: [x, 0.29, z] });
    k.piece(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 6), 0xd9822b, { position: [x, 0.2, z] });
    const kc = builder();
    kc.box([0.56, 0.07, 0.08], 0xc0c6cc, { position: [0, 0, 0] });
    kc.box([0.08, 0.07, 0.56], 0xc0c6cc, { position: [0, 0, 0] });
    [
      [0.28, 0],
      [-0.28, 0],
      [0, 0.28],
      [0, -0.28],
    ].forEach(([dx, dz]) => kc.box([0.1, 0.1, 0.1], 0x8a9096, { position: [dx, -0.01, dz] }));
    kc.box([0.14, 0.1, 0.14], 0x56a3e2, { position: [0, 0.04, 0] });
    const sprinklerHead = new THREE.Group();
    sprinklerHead.position.set(x, 0.5, z);
    kc.mount(sprinklerHead);
    farmland.add(sprinklerHead);
    return sprinklerHead;
  });
  const [ex, ez] = [field.x1 + 0.6, field.z1 - 1.6];
  k.box([0.16, 2, 0.16], 0x8a5a2b, { position: [ex, 0, ez] });
  k.box([1.5, 0.12, 0.12], 0x8a5a2b, { position: [ex, 1.4, ez] });
  k.box([0.8, 0.8, 0.45], 0x6daa2c, { position: [ex, 0.95, ez], outline: true });
  k.box([0.82, 0.12, 0.47], 0x8a5a2b, { position: [ex, 1.0, ez] });
  [-0.82, 0.82].forEach((d) => k.box([0.16, 0.22, 0.16], 0xe8c060, { position: [ex + d, 1.35, ez] }));
  k.box([0.55, 0.5, 0.5], 0xe8c98d, { position: [ex, 1.75, ez], outline: true });
  [-0.12, 0.12].forEach((d) => k.box([0.07, 0.07, 0.04], 0x3b2410, { position: [ex + d, 2.0, ez + 0.25] }));
  k.box([0.22, 0.04, 0.04], 0x3b2410, { position: [ex, 1.88, ez + 0.25] });
  k.box([0.95, 0.07, 0.95], 0xe0b050, { position: [ex, 2.22, ez], outline: true });
  k.box([0.5, 0.28, 0.5], 0xe0b050, { position: [ex, 2.28, ez] });
  k.box([0.52, 0.07, 0.52], 0xd8343b, { position: [ex, 2.3, ez] });
  k.mount(farmland);
  clickable(farmland, 'level');

  const waterMaterial = new THREE.MeshLambertMaterial({ color: 0xbfe9ff, emissive: 0x2a6a9a });
  const dropCount = SPRINKLERS.length * NEIGHBORS.length * DROPS_PER_TILE;
  const splashCount = SPRINKLERS.length * NEIGHBORS.length * SPLASHES_PER_TILE;
  const drops = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), waterMaterial, dropCount);
  const splashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), waterMaterial, splashCount);
  drops.frustumCulled = false;
  splashes.frustumCulled = false;
  farmland.add(drops, splashes);
  const sprinkler = SPRINKLERS.map(([ix, iz], i) => ({
    x: sprinklerPosition[i][0],
    z: sprinklerPosition[i][1],
    phase: -1,
    next: [2, 4.6, 6.8, 3.4, 8.2, 5.6][i] ?? 2 + i * 2,
    targets: NEIGHBORS.map(([dx, dz]) => ({ dx, dz, tile: indexTile(ix + dx, iz + dz) })),
  }));
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  function hideWater() {
    for (let i = 0; i < dropCount; i++) {
      drops.setMatrixAt(i, zero);
    }
    for (let i = 0; i < splashCount; i++) {
      splashes.setMatrixAt(i, zero);
    }
    drops.instanceMatrix.needsUpdate = true;
    splashes.instanceMatrix.needsUpdate = true;
  }
  hideWater();

  let season = 'spring';
  let growth = 0.25;
  let growthTarget = 0.25;
  let dirtySoil = true;
  let isWaterVisible = false;
  const tmp = new THREE.Color();
  const fruitColor = new THREE.Color();
  const soilMix = new THREE.Color();
  const soilPalettes = { warm: null, winter: null };
  let winterAmount = 0;
  let plantsDirty = true;

  function paintDry() {
    tiles.forEach((t) => {
      const index = (t.ix + t.iz) % 2;
      t.dry.setHex(soilPalettes.warm[index]).lerp(soilMix.setHex(soilPalettes.winter[index]), winterAmount);
    });
    dirtySoil = true;
  }

  function setSeason(e, p) {
    season = e;
    soilPalettes[e === 'winter' ? 'winter' : 'warm'] = p.soil;
    soilPalettes.warm ??= p.soil;
    soilPalettes.winter ??= p.soil;
    if (e === 'winter') {
      tiles.forEach((t) => {
        t.wet = 0;
      });
    }
    paintDry();
    kinds.forEach((tp) => {
      tp.list.forEach((pl) => tp.fruits.setColorAt(pl.i, fruitColor.setHex(p.plants[pl.colorIdx] ?? 0xffffff)));
      if (tp.fruits.instanceColor) {
        tp.fruits.instanceColor.needsUpdate = true;
      }
    });
    hideWater();
  }
  const setGrowth = (target) => {
    growthTarget = target;
  };
  function setWinterAmount(amount) {
    if (Math.abs(amount - winterAmount) < 1e-3 || !soilPalettes.warm) {
      return;
    }
    winterAmount = amount;
    plantsDirty = true;
    paintDry();
  }

  const position = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scaleVector = new THREE.Vector3();
  const euler = new THREE.Euler();
  function refreshPlants(t, move) {
    const s = growth;
    const withFruits = s > 0.55 && winterAmount < 0.5;
    const alive = Math.max(0.001, 1 - winterAmount);
    plants.forEach((p) => {
      position.set(p.x, 0.02, p.z);
      quat.setFromEuler(euler.set(0, p.spin, move ? Math.sin(t * 1.5 + p.phase) * 0.05 : 0));
      scaleVector.set((0.55 + 0.45 * s) * alive, s * p.variation * alive, (0.55 + 0.45 * s) * alive);
      m4.compose(position, quat, scaleVector);
      p.kind.leaves.setMatrixAt(p.i, m4);
      p.kind.fruits.setMatrixAt(p.i, withFruits ? m4 : zero);
    });
    kinds.forEach((tp) => {
      tp.leaves.instanceMatrix.needsUpdate = true;
      tp.fruits.instanceMatrix.needsUpdate = true;
    });
  }

  function animate(t, dt, move) {
    const before = growth;
    growth += (growthTarget - growth) * Math.min(1, dt * 3);
    if (move || plantsDirty || Math.abs(before - growth) > 1e-4 || t < 0.5) {
      plantsDirty = false;
      refreshPlants(t, move);
    }

    const spray = move && season !== 'winter';
    if (spray) {
      let dropIndex = 0;
      let splashIndex = 0;
      sprinkler.forEach((ir, n) => {
        ir.next -= dt;
        if (ir.phase < 0 && ir.next <= 0) {
          ir.phase = 0;
          ir.next = 8 + random() * 4;
        }
        if (ir.phase >= 0) {
          ir.phase += dt;
        }
        heads[n].rotation.y += ir.phase >= 0 ? dt * 9 : 0;
        ir.targets.forEach((a, j) => {
          const distance = Math.hypot(a.dx, a.dz);
          for (let g = 0; g < DROPS_PER_TILE; g++) {
            const f = (ir.phase - g * 0.12 - (j % 2) * 0.05) / FLIGHT;
            if (ir.phase >= 0 && f >= 0 && f <= 1) {
              m4.makeTranslation(ir.x + a.dx * f, 0.55 + Math.sin(f * Math.PI) * 0.45 * distance - f * 0.5, ir.z + a.dz * f);
              if (f > 0.9 && a.tile >= 0) {
                tiles[a.tile].wet = 1;
              }
            } else {
              m4.copy(zero);
            }
            drops.setMatrixAt(dropIndex++, m4);
          }
          const r = (ir.phase - FLIGHT - 0.29) / 0.35;
          for (let s = 0; s < SPLASHES_PER_TILE; s++) {
            if (ir.phase >= 0 && r >= 0 && r <= 1) {
              const angle = (s / SPLASHES_PER_TILE) * Math.PI * 2 + j;
              m4.makeTranslation(
                ir.x + a.dx + Math.cos(angle) * 0.25 * r,
                0.05 + Math.sin(r * Math.PI) * 0.2,
                ir.z + a.dz + Math.sin(angle) * 0.25 * r,
              );
            } else {
              m4.copy(zero);
            }
            splashes.setMatrixAt(splashIndex++, m4);
          }
        });
        if (ir.phase > FLIGHT + 0.8) {
          ir.phase = -1;
        }
      });
      drops.instanceMatrix.needsUpdate = true;
      splashes.instanceMatrix.needsUpdate = true;
      isWaterVisible = true;
    } else if (isWaterVisible) {
      hideWater();
      sprinkler.forEach((ir) => {
        ir.phase = -1;
      });
      isWaterVisible = false;
    }

    let changed = dirtySoil;
    if (move) {
      tiles.forEach((tl) => {
        if (tl.wet > 0) {
          tl.wet = Math.max(0, tl.wet - dt / 22);
          changed = true;
        }
      });
    }
    if (changed) {
      tiles.forEach((tl, i) => soil.setColorAt(i, tmp.copy(tl.dry).lerp(WET_COLOR, Math.min(1, tl.wet * 1.4) * 0.8)));
      soil.instanceColor.needsUpdate = true;
      dirtySoil = false;
    }
  }

  return { group: farmland, setSeason, setGrowth, setWinterAmount, animate };
}
