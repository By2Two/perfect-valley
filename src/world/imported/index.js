import * as THREE from 'three';
import { createWorldKit } from '../util.js';
import { buildAnimals } from './animals.js';
import { buildBuildings } from './buildings.js';
import { resolveMap } from './maps.js';
import { buildObjects } from './objects.js';
import { buildPlants } from './plants.js';
import { buildRelief } from './relief.js';
import { buildTerrain } from './terrain.js';
import { createSpace } from './space.js';

export function buildImportedFarm(scene, layout, mapData) {
  const root = new THREE.Group();
  scene.add(root);
  const u = createWorldKit(root);
  const map = resolveMap(mapData, layout.map);
  const space = createSpace({ width: Math.max(layout.width, map.width), height: Math.max(layout.height, map.height) }, map);

  const terrain = buildTerrain(u, layout, space);
  const relief = buildRelief(u, space);
  const plants = buildPlants(u, layout, space);
  const objects = buildObjects(u, layout, space);
  const buildings = buildBuildings(u, layout, space);
  const animals = buildAnimals(u, layout, space);
  root.add(terrain.root, relief.root, plants.root, objects.root, buildings.root, animals.root);

  let season = 'spring';
  let night = false;
  const refreshAnimals = () => {
    animals.root.visible = !night && season !== 'winter';
  };

  const [sizeX, sizeZ] = space.size;
  return {
    root,
    clickables: u.clickables,
    radius: Math.hypot(sizeX, sizeZ) / 2,
    chimney: buildings.chimney,
    setSeason(nextSeason, palette) {
      season = nextSeason;
      terrain.setSeason(season, palette);
      relief.setSeason(season);
      plants.setSeason(season, palette);
      buildings.setSeason(season);
      refreshAnimals();
    },
    setNight(isNight) {
      night = isNight;
      u.setWindowLights(night);
      refreshAnimals();
    },
    animate(t, dt) {
      terrain.animate(t);
      buildings.animate(t, dt);
      animals.animate(t, dt);
    },
  };
}
