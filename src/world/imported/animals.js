import * as THREE from 'three';
import { isFenceName } from '../../farmSave.js';
import { TILE } from './space.js';

const MAX_PER_BUILDING = 12;
const SCALE = 0.72;
const WANDER_DEPTH = 5;
const WANDER_MARGIN = 1;
const TARGET_ATTEMPTS = 12;
const BLOCKING_GROUND = new Set(['w', 'x']);
const EYE = 0x1a1410;
const ORANGE = 0xf2a030;
const HOME_BUILDINGS = { Coop: /Coop/, Barn: /Barn/ };

const hen = (body, wing) => ({
  speed: 0.6,
  hen: true,
  neck: [0, 0.42, 0.16],
  build(kBody, kHead) {
    [-0.1, 0.1].forEach((x) => kBody.box([0.06, 0.16, 0.06], ORANGE, { position: [x, 0, 0] }));
    kBody.box([0.42, 0.34, 0.5], body, { position: [0, 0.16, -0.02] });
    kBody.box([0.44, 0.16, 0.28], wing, { position: [0, 0.24, -0.04] });
    kBody.box([0.28, 0.22, 0.12], body, { position: [0, 0.4, -0.26] });
    kHead.box([0.28, 0.28, 0.26], body, { position: [0, -0.04, 0.06] });
    kHead.box([0.08, 0.1, 0.16], 0xd8343b, { position: [0, 0.24, 0.06] });
    kHead.box([0.1, 0.07, 0.1], ORANGE, { position: [0, 0.06, 0.23] });
    kHead.box([0.3, 0.05, 0.05], EYE, { position: [0, 0.12, 0.13] });
  },
});

const duck = {
  speed: 0.5,
  hen: true,
  neck: [0, 0.34, 0.14],
  build(kBody, kHead) {
    [-0.08, 0.08].forEach((x) => kBody.box([0.06, 0.12, 0.06], ORANGE, { position: [x, 0, 0] }));
    kBody.box([0.36, 0.26, 0.46], 0xd8cbb0, { position: [0, 0.12, 0] });
    kBody.box([0.38, 0.12, 0.26], 0x8a6a4a, { position: [0, 0.2, -0.04] });
    kBody.box([0.14, 0.12, 0.12], 0xd8cbb0, { position: [0, 0.3, -0.26] });
    kHead.box([0.24, 0.24, 0.24], 0x3f7a4a, { position: [0, -0.04, 0.04] });
    kHead.box([0.16, 0.06, 0.16], ORANGE, { position: [0, 0.02, 0.2] });
    kHead.box([0.26, 0.05, 0.05], EYE, { position: [0, 0.1, 0.1] });
  },
};

const dinosaur = {
  speed: 0.55,
  neck: [0, 0.78, 0.4],
  build(kBody, kHead) {
    [-0.17, 0.17].forEach((x) => [-0.25, 0.25].forEach((z) => kBody.box([0.14, 0.3, 0.14], 0x4f9a45, { position: [x, 0, z] })));
    kBody.box([0.52, 0.5, 0.9], 0x6dbb5a, { position: [0, 0.3, 0] });
    kBody.box([0.24, 0.3, 0.55], 0x6dbb5a, { position: [0, 0.4, -0.65] });
    kBody.box([0.12, 0.14, 0.4], 0x4f9a45, { position: [0, 0.65, -0.95] });
    [-0.3, 0, 0.3].forEach((z) => kBody.box([0.08, 0.16, 0.14], 0xe8833a, { position: [0, 0.8, z] }));
    kHead.box([0.36, 0.34, 0.42], 0x6dbb5a, { position: [0, -0.1, 0.12] });
    kHead.box([0.3, 0.1, 0.1], EYE, { position: [0, 0.1, 0.2] });
    kHead.box([0.2, 0.08, 0.1], 0xffffff, { position: [0, -0.2, 0.33] });
  },
};

const rabbit = {
  speed: 0.7,
  hen: true,
  neck: [0, 0.24, 0.16],
  build(kBody, kHead) {
    kBody.box([0.3, 0.26, 0.4], 0xe8dccb, { position: [0, 0.06, 0] });
    kBody.box([0.12, 0.12, 0.12], 0xffffff, { position: [0, 0.14, -0.24] });
    kHead.box([0.22, 0.2, 0.22], 0xe8dccb, { position: [0, -0.06, 0.06] });
    [-0.06, 0.06].forEach((x) => kHead.box([0.06, 0.24, 0.06], 0xe8dccb, { position: [x, 0.1, 0.02] }));
    kHead.box([0.24, 0.04, 0.04], EYE, { position: [0, 0.02, 0.14] });
  },
};

function quadruped({ body, patch, snout, hip = 0.42 }) {
  return (kBody, kHead) => {
    [-0.27, 0.27].forEach((x) => [-0.4, 0.4].forEach((z) => kBody.box([0.17, hip, 0.17], body, { position: [x, 0, z] })));
    kBody.box([0.78, 0.62, 1.2], body, { position: [0, hip, 0] });
    kBody.box([0.8, 0.32, 0.38], patch, { position: [0, hip + 0.14, 0.2] });
    kBody.box([0.1, 0.4, 0.06], body, { position: [0, hip + 0.18, -0.62] });
    kHead.box([0.5, 0.46, 0.42], body, { position: [0, -0.14, 0.16] });
    kHead.box([0.44, 0.22, 0.12], snout, { position: [0, -0.14, 0.42] });
    kHead.box([0.54, 0.07, 0.07], EYE, { position: [0, 0.12, 0.24] });
  };
}

const cow = (body, patch) => ({
  speed: 0.3,
  neck: [0, 1.1, 0.6],
  build(kBody, kHead) {
    quadruped({ body, patch, snout: 0xf0b0a0 })(kBody, kHead);
    kHead.box([0.08, 0.12, 0.08], 0xf3ddb0, { position: [-0.17, 0.32, 0.12] });
    kHead.box([0.08, 0.12, 0.08], 0xf3ddb0, { position: [0.17, 0.32, 0.12] });
  },
});

const pig = {
  speed: 0.4,
  neck: [0, 0.72, 0.45],
  build(kBody, kHead) {
    [-0.2, 0.2].forEach((x) => [-0.3, 0.3].forEach((z) => kBody.box([0.14, 0.25, 0.14], 0xf2a7b0, { position: [x, 0, z] })));
    kBody.box([0.62, 0.5, 0.9], 0xf2a7b0, { position: [0, 0.25, 0] });
    kBody.box([0.64, 0.12, 0.7], 0xf6bcc3, { position: [0, 0.25, 0] });
    kBody.box([0.06, 0.12, 0.06], 0xe8858f, { position: [0, 0.62, -0.47] });
    kHead.box([0.5, 0.44, 0.36], 0xf2a7b0, { position: [0, -0.2, 0.12] });
    kHead.box([0.26, 0.18, 0.1], 0xe8858f, { position: [0, -0.12, 0.33] });
    kHead.box([0.52, 0.06, 0.06], EYE, { position: [0, 0.06, 0.22] });
    [-0.17, 0.17].forEach((x) => kHead.box([0.14, 0.14, 0.08], 0xe8858f, { position: [x, 0.22, 0.08] }));
  },
};

const sheep = {
  speed: 0.35,
  neck: [0, 0.75, 0.48],
  build(kBody, kHead) {
    [-0.22, 0.22].forEach((x) => [-0.32, 0.32].forEach((z) => kBody.box([0.12, 0.3, 0.12], 0x4a3a30, { position: [x, 0, z] })));
    kBody.box([0.74, 0.6, 0.92], 0xf6efe0, { position: [0, 0.3, 0] });
    kBody.box([0.6, 0.4, 0.96], 0xfffaf0, { position: [0, 0.42, 0] });
    kBody.box([0.5, 0.12, 0.6], 0xfffaf0, { position: [0, 0.9, 0] });
    kHead.box([0.32, 0.36, 0.32], 0x5a4638, { position: [0, -0.22, 0.12] });
    kHead.box([0.38, 0.14, 0.32], 0xfffaf0, { position: [0, 0.1, 0.08] });
    kHead.box([0.34, 0.05, 0.05], 0xf3ddb0, { position: [0, 0, 0.2] });
  },
};

const goat = {
  speed: 0.5,
  neck: [0, 0.8, 0.45],
  build(kBody, kHead) {
    [-0.18, 0.18].forEach((x) => [-0.3, 0.3].forEach((z) => kBody.box([0.1, 0.36, 0.1], 0xc8beae, { position: [x, 0, z] })));
    kBody.box([0.54, 0.46, 0.85], 0xe0d6c4, { position: [0, 0.36, 0] });
    kBody.box([0.2, 0.04, 0.85], 0xa89a84, { position: [0, 0.82, 0] });
    kHead.box([0.3, 0.32, 0.36], 0xe0d6c4, { position: [0, -0.1, 0.14] });
    kHead.box([0.24, 0.18, 0.12], 0xc8beae, { position: [0, -0.14, 0.36] });
    [-0.08, 0.08].forEach((x) => kHead.box([0.07, 0.24, 0.07], 0x6e5a48, { position: [x, 0.18, 0.02] }));
  },
};

const ostrich = {
  speed: 0.6,
  neck: [0, 1.3, 0.2],
  build(kBody, kHead) {
    [-0.12, 0.12].forEach((x) => kBody.box([0.08, 0.6, 0.08], 0xd8b890, { position: [x, 0, 0] }));
    kBody.box([0.5, 0.5, 0.7], 0x4a3a30, { position: [0, 0.6, 0] });
    kBody.box([0.3, 0.3, 0.3], 0xf6efe0, { position: [0, 0.75, -0.4] });
    kBody.box([0.08, 0.5, 0.08], 0xd8b890, { position: [0, 1.0, 0.2] });
    kHead.box([0.2, 0.2, 0.28], 0xd8b890, { position: [0, 0, 0.12] });
    kHead.box([0.22, 0.05, 0.05], EYE, { position: [0, 0.06, 0.2] });
  },
};

const SPECIES = {
  'White Chicken': hen(0xfff8ec, 0xeadfcf),
  'Brown Chicken': hen(0xb5713a, 0x8e5428),
  'Blue Chicken': hen(0x8aa8c8, 0x6e8cae),
  'Void Chicken': hen(0x2a2a33, 0x1a1a22),
  'Golden Chicken': hen(0xf2c230, 0xd8a420),
  Duck: duck,
  Dinosaur: dinosaur,
  Rabbit: rabbit,
  'White Cow': cow(0xfff8ec, 0x5b3a1e),
  'Brown Cow': cow(0x8a5a3a, 0xfff8ec),
  Pig: pig,
  Sheep: sheep,
  Goat: goat,
  Ostrich: ostrich,
};

function blockedTiles(layout, space) {
  const blocked = new Set();
  const add = (x, y) => blocked.add(`${x},${y}`);
  space.map.blocks.forEach((block) => add(block.x, block.y));
  layout.buildings.forEach((building) => {
    for (let y = building.y - 1; y < building.y + building.h; y++) {
      for (let x = building.x; x < building.x + building.w; x++) {
        add(x, y);
      }
    }
  });
  layout.objects.filter((object) => isFenceName(object.name)).forEach((fence) => add(fence.x, fence.y));
  return (x, y) => BLOCKING_GROUND.has(space.map.at(x, y)) || blocked.has(`${x},${y}`);
}

function assignHomes(layout) {
  const homes = layout.buildings
    .filter((building) => building.building)
    .map((building) => ({ building, animals: building.animals.slice(0, MAX_PER_BUILDING) }));
  layout.wanderers.forEach((animal) => {
    const pattern = HOME_BUILDINGS[animal.home];
    const candidates = homes.filter((home) => pattern?.test(home.building.type) && home.animals.length < MAX_PER_BUILDING);
    candidates[0]?.animals.push(animal.type);
  });
  return homes.filter((home) => home.animals.length);
}

export function buildAnimals(u, layout, space) {
  const { builder, random } = u;
  const root = new THREE.Group();
  const isBlocked = blockedTiles(layout, space);
  const geometry = new Map();
  const walkers = [];

  function prototype(type) {
    const species = SPECIES[type] ?? SPECIES['White Cow'];
    if (!geometry.has(type)) {
      const kBody = builder();
      const kHead = builder();
      species.build(kBody, kHead);
      geometry.set(type, { bodyGeometry: kBody.join(), headGeometry: kHead.join() });
    }
    return { species, ...geometry.get(type) };
  }

  function pickTile(area) {
    for (let attempt = 0; attempt < TARGET_ATTEMPTS; attempt++) {
      const x = Math.floor(area.x0 + random() * (area.x1 - area.x0 + 1));
      const y = Math.floor(area.y0 + random() * (area.y1 - area.y0 + 1));
      if (!isBlocked(x, y)) {
        return space.center(x, y);
      }
    }
    return null;
  }

  assignHomes(layout).forEach(({ building, animals }) => {
    const area = {
      x0: Math.max(0, building.x - WANDER_MARGIN),
      x1: Math.min(space.width - 1, building.x + building.w + WANDER_MARGIN - 1),
      y0: Math.min(space.height - 1, building.y + building.h),
      y1: Math.min(space.height - 1, building.y + building.h + WANDER_DEPTH),
    };
    animals.forEach((type) => {
      const start = pickTile(area);
      if (!start) {
        return;
      }
      const { species, bodyGeometry, headGeometry } = prototype(type);
      const group = new THREE.Group();
      const body = new THREE.Group();
      const head = new THREE.Group();
      head.position.set(...species.neck);
      [
        [body, bodyGeometry],
        [head, headGeometry],
      ].forEach(([parent, shared]) => {
        const mesh = new THREE.Mesh(shared, u.materialByColor);
        mesh.castShadow = true;
        parent.add(mesh);
      });
      body.add(head);
      group.add(body);
      group.scale.setScalar(SCALE);
      group.position.set(start[0], 0, start[1]);
      group.rotation.y = random() * Math.PI * 2;
      root.add(group);
      walkers.push({
        group,
        body,
        head,
        species,
        area,
        target: new THREE.Vector2(start[0], start[1]),
        wait: random() * 3,
        graze: 0,
        step: random() * 6,
      });
    });
  });

  const direction = new THREE.Vector2();
  function animate(t, dt) {
    walkers.forEach((walker) => {
      const { group, body, head, species } = walker;
      if (walker.wait > 0) {
        walker.wait -= dt;
        walker.graze -= dt;
        const nod = walker.graze > 0 ? 0.6 + Math.sin(t * (species.hen ? 18 : 5)) * (species.hen ? 0.4 : 0.1) : 0;
        head.rotation.x += (nod - head.rotation.x) * Math.min(1, dt * 8);
        body.position.y *= 0.8;
        body.rotation.z *= 0.8;
        if (walker.wait <= 0) {
          const next = pickTile(walker.area);
          if (next) {
            walker.target.set(next[0], next[1]);
          }
        }
        return;
      }
      direction.set(walker.target.x - group.position.x, walker.target.y - group.position.z);
      const distance = direction.length();
      if (distance < 0.1 * TILE) {
        walker.wait = 1.5 + random() * (species.hen ? 3 : 6);
        walker.graze = random() < 0.7 ? walker.wait * 0.8 : 0;
        return;
      }
      let turn = Math.atan2(direction.x, direction.y) - group.rotation.y;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      group.rotation.y += turn * Math.min(1, dt * 5);
      const step = Math.min(distance, species.speed * TILE * dt * (Math.abs(turn) > 1 ? 0.3 : 1));
      group.position.x += Math.sin(group.rotation.y) * step;
      group.position.z += Math.cos(group.rotation.y) * step;
      head.rotation.x *= 0.85;
      walker.step += dt * (species.hen ? 16 : 9);
      body.position.y = Math.abs(Math.sin(walker.step)) * (species.hen ? 0.06 : 0.04);
      body.rotation.z = Math.sin(walker.step) * 0.05;
    });
  }

  return { root, animate };
}
