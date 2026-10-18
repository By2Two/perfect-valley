import * as THREE from 'three';
import { farmerLevel } from '../progress.js';
import { createWorldKit } from './util.js';
import { buildScenery } from './assets/scenery.js';
import { buildHouse } from './assets/house.js';
import { buildBarn } from './assets/barn.js';
import { buildMine } from './assets/mine.js';
import { buildFarmland } from './assets/sprinklers.js';
import { buildObelisks } from './assets/obelisks.js';
import { buildClock } from './assets/clock.js';
import { buildImportedFarm } from './imported/index.js';
import { loadFarmMaps } from './imported/maps.js';

const DEFAULT_SPREAD = 1;
const SHADOW_MAP_SIZE = 2048;
const DEFAULT_SHADOW_MAP_SIZE = 1024;
const SHADOW_COVERAGE = 0.8;
const DEFAULT_SHADOW_SIZE = 24;
const DEFAULT_WORLD_RADIUS = 21;

const PALETTES = {
  spring: {
    grass: [0x7cc444, 0x72bb3c, 0x86cc4e, 0x6daa2c],
    path: 0xc9a26b,
    soil: [0x7a4a26, 0x6e4222],
    sand: 0xd9c48a,
    leaves: [0x6ec24a, 0x8ad35c],
    flowers: [0xf08ab8, 0xfff4e0, 0xf2c230, 0x7fb6f0],
    plants: [0xf3f0dc, 0xe8d06a, 0x9ad04f, 0xf08ab8],
    water: [0x3f8fd6, 0x56a3e2],
    particle: { color: 0xffb7d5, count: 70, speed: 0.9 },
    flower: true,
    fireflies: true,
    butterflies: true,
  },
  summer: {
    grass: [0x5fa832, 0x56a02c, 0x68b038, 0x4f9628],
    path: 0xc9a26b,
    soil: [0x7a4a26, 0x6e4222],
    sand: 0xe0cb8e,
    leaves: [0x3f8f2f, 0x4fa33a],
    flowers: [0xd8343b, 0xf2c230, 0xfff4e0, 0xe8833a],
    plants: [0xd8343b, 0xf2c230, 0xe8833a, 0x5b6fd6],
    water: [0x3a8bd4, 0x4fa0e0],
    particle: null,
    flower: false,
    fireflies: true,
    butterflies: true,
  },
  fall: {
    grass: [0x9a8232, 0x8a7329, 0xa8913e, 0x7c661f],
    path: 0xc29a62,
    soil: [0x7a4a26, 0x6e4222],
    sand: 0xd2bb82,
    leaves: [0xd9752a, 0xe8953c, 0xc14a24],
    flowers: [0xe8833a, 0xc4512a, 0xf2c230],
    plants: [0xe8833a, 0x9b4fc4, 0xf2c230, 0xc0442e],
    water: [0x3c7fbf, 0x4b8fcc],
    particle: { color: 0xe8833a, count: 60, speed: 1.1 },
    flower: false,
    fireflies: true,
    butterflies: false,
  },
  winter: {
    grass: [0xeef4f8, 0xe4edf3, 0xf6fafc, 0xdde8ef],
    path: 0xd6cfc4,
    soil: [0xd2c8bd, 0xc9beb2],
    sand: 0xe2e8ec,
    leaves: [0x9fd8e8, 0xb8e4f0],
    flowers: [],
    plants: [],
    water: [0xbfe3f2, 0xd3edf7],
    particle: { color: 0xffffff, count: 160, speed: 1.6 },
    flower: false,
    fireflies: false,
    butterflies: false,
  },
};

export function buildFarm(scene) {
  const defaultRoot = new THREE.Group();
  scene.add(defaultRoot);
  const u = createWorldKit(defaultRoot);
  const { box, group, random } = u;
  let imported = null;
  let spread = DEFAULT_SPREAD;
  let worldRadius = DEFAULT_WORLD_RADIUS;

  const hemi = new THREE.HemisphereLight(0xe8f6ff, 0x6a7a3a, 1.2);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(DEFAULT_SHADOW_MAP_SIZE, DEFAULT_SHADOW_MAP_SIZE);
  Object.assign(sun.shadow.camera, {
    left: -DEFAULT_SHADOW_SIZE,
    right: DEFAULT_SHADOW_SIZE,
    top: DEFAULT_SHADOW_SIZE,
    bottom: -DEFAULT_SHADOW_SIZE,
    near: 1,
    far: 100,
  });
  sun.shadow.bias = -0.002;
  sun.shadow.normalBias = 0.05;
  scene.add(hemi, sun, sun.target);

  const field = { x0: 0, x1: 6, z0: -8.8, z1: 0.2 };
  const scenery = buildScenery(u, { field });
  const house = buildHouse(u);
  const { chimney } = house;
  const barn = buildBarn(u);
  const farmland = buildFarmland(u, field);
  const mine = buildMine(u);
  const obelisks = buildObelisks(u);
  const clock = buildClock(u);

  function pointCloud(count, color, { size = 2, transparent = true } = {}) {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const material = new THREE.PointsMaterial({ color, size, sizeAttenuation: false, transparent });
    const pts = new THREE.Points(geo, material);
    pts.frustumCulled = false;
    scene.add(pts);
    return { pts, arr, geo, material, base: Array.from({ length: count }, () => [random(), random(), random(), random() * 6]) };
  }
  const fallingParticles = pointCloud(160, 0xffffff);
  const tempColor = new THREE.Color();
  const fireflies = pointCloud(40, 0xfff27a);
  const smoke = Array.from({ length: 8 }, (_, i) => {
    const m = box([0.4, 0.4, 0.4], new THREE.MeshLambertMaterial({ color: 0xd8d8d8, transparent: true, opacity: 0.7 }));
    m.castShadow = false;
    m.userData.t = i / 8;
    scene.add(m);
    return m;
  });
  const butterflies = Array.from({ length: 6 }, (_, i) => {
    const wingColor = [0xf2c230, 0xffffff, 0xf08ab8][i % 3];
    const wingE = box([0.22, 0.03, 0.18], wingColor, [-0.11, 0, 0]);
    const wingD = box([0.22, 0.03, 0.18], wingColor, [0.11, 0, 0]);
    const g = group(0, 0, wingE, wingD);
    g.userData = { wingE, wingD, phase: random() * 10, centerX: (random() - 0.5) * 18, cz: (random() - 0.5) * 18 };
    return g;
  });
  const birds = group(
    0,
    0,
    ...[
      [0, 0],
      [-0.8, -0.6],
      [-0.8, 0.6],
    ].map(([dx, dz]) => box([0.4, 0.08, 0.15], 0x3b2410, [dx, 0, dz])),
  );
  birds.visible = false;
  let nextFlock = 6;

  let palette = PALETTES.spring;
  let currentSeason = 'spring';

  function setSeason(e) {
    const season = PALETTES[e] ? e : 'spring';
    currentSeason = season;
    palette = PALETTES[season];
    imported?.setSeason(season, palette);
    scenery.setSeason(season, palette);
    house.setSeason(season);
    barn.setSeason(season);
    farmland.setSeason(season, palette);
  }

  const particleTint = new THREE.Color();
  let activeParticle = null;
  function fadeParticles() {
    const { season: to, fromSeason: from, blend } = scenery.seasonProgress();
    const winterBefore = from === 'winter' ? 1 - blend : 0;
    const winter = to === 'winter' ? blend : winterBefore;
    u.setSnowAmount(winter);
    farmland.setWinterAmount(winter);
    imported?.setWinterAmount(winter);
    const next = PALETTES[to].particle;
    const previous = PALETTES[from].particle;
    const opacity = (previous ? 1 - blend : 0) + (next ? blend : 0);
    fallingParticles.pts.visible = opacity > 0.02;
    fallingParticles.material.opacity = opacity;
    const source = next ?? previous;
    activeParticle = opacity > 0.02 ? source : null;
    if (source) {
      particleTint.setHex((previous ?? next).color).lerp(tempColor.setHex((next ?? previous).color), blend);
      fallingParticles.material.color.copy(particleTint);
    }
  }

  function updateProgress(s) {
    obelisks.setBuilt(s.obelisks);
    clock.setBuilt(s.clock);
    farmland.setGrowth(0.25 + 0.75 * (farmerLevel(s) / 25));
  }

  function setLight(light, sunAngle) {
    const scale = worldRadius / DEFAULT_WORLD_RADIUS;
    sun.position.set(Math.cos(sunAngle) * -30 * scale, Math.sin(sunAngle) * 30 * scale + 8, 18 * scale);
    sun.intensity = 0.45 + 2.1 * light;
    sun.color.setHex(light > 0.3 ? 0xfff1d6 : 0xa9b8ff);
    hemi.intensity = 0.5 + 0.8 * light;
    const night = light < 0.35;
    u.setWindowLights(night);
    imported?.setNight(night);
    mine.setLight(night);
    scenery.setLight(night);
    fireflies.pts.visible = night && palette.fireflies;
    return night;
  }

  function animate(t, dt, { move, night }) {
    if (imported) {
      if (move) {
        imported.animate(t, dt);
        scenery.advanceSeason(dt);
      } else {
        imported.settle();
        scenery.settleSeason();
      }
      fadeParticles();
      if (!move) {
        return;
      }
    } else {
      farmland.animate(t, dt, move);
      barn.animate(t, dt, move);
      if (!move) {
        scenery.settleSeason();
        fadeParticles();
        return;
      }
      scenery.animate(t, dt);
      fadeParticles();
      obelisks.animate(t);
      clock.animate(t, dt);
    }

    const chimneyPosition = imported ? imported.chimney?.() : chimney;
    smoke.forEach((f) => {
      f.visible = Boolean(chimneyPosition);
      if (!chimneyPosition) {
        return;
      }
      f.userData.t = (f.userData.t + dt * 0.18) % 1;
      const k = f.userData.t;
      f.position.set(chimneyPosition.x + Math.sin(k * 6 + t) * 0.3 * k, chimneyPosition.y + k * 4, chimneyPosition.z - k * 1.2);
      f.scale.setScalar(0.3 + k * 0.7);
      f.material.opacity = 0.65 * (1 - k);
    });

    if (fallingParticles.pts.visible && activeParticle) {
      const { speed, count } = activeParticle;
      fallingParticles.base.forEach((b, i) => {
        if (i >= count) {
          fallingParticles.arr[i * 3 + 1] = -50;
          return;
        }
        const y = 14 - ((t * speed * 0.6 + b[1] * 14) % 14);
        fallingParticles.arr[i * 3] = (b[0] - 0.5) * 30 * spread + Math.sin(t * 0.8 + b[3]) * 1.2;
        fallingParticles.arr[i * 3 + 1] = y;
        fallingParticles.arr[i * 3 + 2] = (b[2] - 0.5) * 30 * spread + Math.cos(t * 0.6 + b[3]) * 1.2;
      });
      fallingParticles.geo.attributes.position.needsUpdate = true;
    }
    if (fireflies.pts.visible) {
      fireflies.base.forEach((b, i) => {
        fireflies.arr[i * 3] = (b[0] - 0.5) * 22 * spread + Math.sin(t * 0.6 + b[3]) * 0.8;
        fireflies.arr[i * 3 + 1] = 0.5 + b[1] * 2.5 + Math.sin(t * 1.3 + b[3] * 2) * 0.4;
        fireflies.arr[i * 3 + 2] = (b[2] - 0.5) * 22 * spread + Math.cos(t * 0.5 + b[3]) * 0.8;
      });
      fireflies.geo.attributes.position.needsUpdate = true;
      fireflies.material.opacity = 0.6 + Math.sin(t * 4) * 0.4;
    }

    const withButterflies = palette.butterflies && !night;
    butterflies.forEach((b) => {
      b.visible = withButterflies;
      if (!withButterflies) {
        return;
      }
      const d = b.userData;
      const k = t * 0.35 + d.phase;
      b.position.set(d.centerX * spread + Math.sin(k) * 2.5, 1 + Math.sin(k * 2.3) * 0.4, d.cz * spread + Math.sin(k * 1.7) * 2);
      b.rotation.y = Math.atan2(Math.cos(k) * 2.5, Math.cos(k * 1.7) * 3.4);
      const wing = Math.sin(t * 22 + d.phase) * 0.9;
      d.wingE.rotation.z = wing;
      d.wingD.rotation.z = -wing;
    });

    nextFlock -= dt;
    if (!night && nextFlock <= 0) {
      const k = -nextFlock / 9;
      birds.visible = true;
      birds.position.set(-26 + k * 52, 11 + Math.sin(k * 8) * 0.4, 6 - k * 14);
      birds.rotation.y = Math.atan2(52, -14);
      birds.children.forEach((p, i) => {
        p.rotation.z = Math.sin(t * 10 + i) * 0.5;
      });
      if (k >= 1) {
        birds.visible = false;
        nextFlock = 14 + random() * 16;
      }
    }
  }

  function setShadowRadius(radius) {
    const { camera } = sun.shadow;
    Object.assign(camera, { left: -radius, right: radius, top: radius, bottom: -radius, far: radius * 5 });
    camera.updateProjectionMatrix();
    const mapSize = radius > DEFAULT_SHADOW_SIZE ? SHADOW_MAP_SIZE : DEFAULT_SHADOW_MAP_SIZE;
    sun.shadow.mapSize.set(mapSize, mapSize);
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
  }

  function disposeImported() {
    imported?.root.removeFromParent();
    imported?.root.traverse((object) => object.geometry?.dispose());
    imported = null;
  }

  let layoutRequest = 0;
  async function setLayout(layout) {
    layoutRequest += 1;
    const request = layoutRequest;
    const mapData = layout ? await loadFarmMaps() : null;
    if (request !== layoutRequest) {
      return undefined;
    }
    disposeImported();
    defaultRoot.visible = !layout;
    if (layout) {
      imported = buildImportedFarm(scene, layout, mapData);
    }
    worldRadius = imported ? imported.radius : DEFAULT_WORLD_RADIUS;
    spread = worldRadius / DEFAULT_WORLD_RADIUS;
    setShadowRadius(imported ? worldRadius * SHADOW_COVERAGE : DEFAULT_SHADOW_SIZE);
    setSeason(currentSeason);
    return imported ? worldRadius : null;
  }

  setSeason('spring');
  return {
    get clickables() {
      return imported ? imported.clickables : u.clickables;
    },
    setSeason,
    setLayout,
    updateProgress,
    setLight,
    setHour: clock.setHour,
    animate,
  };
}
