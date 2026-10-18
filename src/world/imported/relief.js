import * as THREE from 'three';
import { grass, rock } from '../textures.js';
import { TILE } from './space.js';

const SEASONS = ['spring', 'summer', 'fall', 'winter'];
const SHAPES = {
  b: { footprint: TILE, base: 0, height: 0.9 },
  p: { footprint: TILE * 0.4, base: 0, height: 0.72 },
  c: { footprint: TILE * 1.02, base: 0.85, height: 1.35 },
};
const BRIGHTNESS_SPREAD = 0.14;

const noise = (x, y) => ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000) / 1000;

export function buildRelief(u, space) {
  const root = new THREE.Group();
  const groups = Object.fromEntries(Object.keys(SHAPES).map((kind) => [kind, space.map.blocks.filter((block) => block.kind === kind)]));
  const materials = {
    b: new THREE.MeshLambertMaterial({ map: rock({ base: 0xe0e0e0 }) }),
    p: new THREE.MeshLambertMaterial({ map: rock({ base: 0xe0e0e0 }) }),
    c: new THREE.MeshLambertMaterial({ map: grass({ base: 0xf4f4f4 }) }),
  };
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const matrix = new THREE.Matrix4();
  const meshes = Object.entries(groups).map(([kind, blocks]) => {
    const mesh = new THREE.InstancedMesh(geometry, materials[kind], Math.max(1, blocks.length));
    mesh.count = blocks.length;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const { footprint, base, height } = SHAPES[kind];
    blocks.forEach((block, index) => {
      const [x, z] = space.center(block.x, block.y);
      const tall = kind === 'c' ? height * (0.8 + noise(block.x, block.y) * 0.4) : height;
      matrix.compose(new THREE.Vector3(x, base + tall / 2, z), new THREE.Quaternion(), new THREE.Vector3(footprint, tall, footprint));
      mesh.setMatrixAt(index, matrix);
    });
    root.add(mesh);
    return { mesh, blocks };
  });

  const color = new THREE.Color();
  function setSeason(season) {
    const column = Math.max(0, SEASONS.indexOf(season));
    meshes.forEach(({ mesh, blocks }) => {
      blocks.forEach((block, index) => {
        const brightness = 1 - BRIGHTNESS_SPREAD / 2 + noise(block.y, block.x) * BRIGHTNESS_SPREAD;
        mesh.setColorAt(index, color.setHex(block.colors[column]).multiplyScalar(brightness));
      });
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    });
  }
  return { root, setSeason };
}
