import * as THREE from 'three';
import { dial } from '../textures.js';

const GOLD = 0xf2c230;
const DARK_GOLD = 0xc8901a;
const LIGHT_GOLD = 0xffe07a;
const GEM = 0x9b4fc4;
const LIGHT_GEM = 0xc06ad8;
const SPARK_COUNT = 3;
const SPARK_POSITIONS = [
  [0.62, 4.0, 0.55],
  [-0.6, 2.2, 0.45],
  [0.4, 5.1, 0.2],
  [-0.5, 3.3, 0.55],
  [0.55, 1.1, 0.45],
  [0, 5.5, 0],
];

export function buildClock(u) {
  const { builder, clickable, group, setGhost, random } = u;
  const goldMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x3a2600 });
  const k = builder();
  const goldBox = (size, color, options) => k.box(size, goldMaterial, { color, ...options });
  const gem = ([x, y, z], s = 0.14) => {
    k.box([s, s, 0.08], GEM, { position: [x, y, z] });
    k.box([s / 2, s / 2, 0.09], LIGHT_GEM, { position: [x - s / 5, y + s / 2, z] });
  };

  goldBox([1.9, 0.22, 1.7], DARK_GOLD, { position: [0, 0, 0], outline: true });
  goldBox([1.62, 0.22, 1.42], GOLD, { position: [0, 0.22, 0], outline: true });
  goldBox([1.34, 0.5, 1.14], DARK_GOLD, { position: [0, 0.44, 0], outline: true });
  goldBox([1.4, 0.08, 1.2], LIGHT_GOLD, { position: [0, 0.94, 0] });
  gem([-0.35, 0.62, 0.58]);
  gem([0.35, 0.62, 0.58]);
  goldBox([0.3, 0.12, 0.06], LIGHT_GOLD, { position: [0, 0.66, 0.58] });

  goldBox([1.0, 1.9, 0.8], GOLD, { position: [0, 1.02, 0], outline: true });
  [-1, 1].forEach((s) => goldBox([0.14, 1.9, 0.86], DARK_GOLD, { position: [s * 0.5, 1.02, 0] }));
  goldBox([0.64, 1.1, 0.06], DARK_GOLD, { position: [0, 1.4, 0.41] });
  k.box([0.5, 0.96, 0.06], 0x4a2a10, { position: [0, 1.47, 0.42] });
  goldBox([0.74, 0.12, 0.1], LIGHT_GOLD, { position: [0, 2.52, 0.42] });
  gem([0, 1.2, 0.47], 0.16);

  goldBox([1.42, 1.38, 1.0], GOLD, { position: [0, 2.92, 0], outline: true });
  goldBox([1.5, 0.12, 1.08], DARK_GOLD, { position: [0, 2.92, 0] });
  goldBox([1.5, 0.12, 1.08], DARK_GOLD, { position: [0, 4.18, 0] });
  k.piece(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 20), goldMaterial, {
    color: LIGHT_GOLD,
    rot: new THREE.Euler(Math.PI / 2, 0, 0),
    position: [0, 3.61, 0.51],
  });
  k.piece(new THREE.CircleGeometry(0.5, 20), new THREE.MeshLambertMaterial({ map: dial() }), { position: [0, 3.61, 0.56], uv: false });
  [
    [-0.58, 3.06],
    [0.58, 3.06],
    [-0.58, 4.14],
    [0.58, 4.14],
  ].forEach(([x, y]) => gem([x, y, 0.53], 0.13));

  goldBox([1.2, 0.26, 0.86], DARK_GOLD, { position: [0, 4.3, 0], outline: true });
  const dome = new THREE.ConeGeometry(0.82, 0.7, 4);
  k.piece(dome, goldMaterial, { color: GOLD, rot: new THREE.Euler(0, Math.PI / 4, 0), position: [0, 4.91, 0], outline: true });
  k.piece(new THREE.SphereGeometry(0.14, 8, 6), goldMaterial, { color: LIGHT_GOLD, position: [0, 5.32, 0] });
  k.box([0.16, 0.16, 0.16], GEM, { position: [0, 5.42, 0] });
  [
    [-0.55, -0.38],
    [0.55, -0.38],
    [-0.55, 0.38],
    [0.55, 0.38],
  ].forEach(([x, z]) => goldBox([0.14, 0.2, 0.14], LIGHT_GOLD, { position: [x, 4.56, z] }));

  const clock = group(-11.7, -4.5);
  clock.rotation.y = Math.PI / 4;
  clock.scale.setScalar(0.8);
  k.mount(clock);

  const handMaterial = new THREE.MeshLambertMaterial({ color: 0x3b2410 });
  const hand = (length, width) => {
    const g = new THREE.Group();
    g.position.set(0, 3.61, 0.58);
    const m = new THREE.Mesh(new THREE.BoxGeometry(width, length, 0.03).translate(0, length / 2 - 0.05, 0), handMaterial);
    g.add(m);
    clock.add(g);
    return g;
  };
  const hours = hand(0.3, 0.07);
  const minutes = hand(0.42, 0.05);
  const center = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), handMaterial);
  center.position.set(0, 3.61, 0.6);
  clock.add(center);

  const pendulum = new THREE.Group();
  pendulum.position.set(0, 2.38, 0.45);
  const kp = builder();
  kp.box([0.04, 0.6, 0.03], DARK_GOLD, { position: [0, -0.62, 0] });
  kp.piece(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 12), goldMaterial, {
    color: LIGHT_GOLD,
    rot: new THREE.Euler(Math.PI / 2, 0, 0),
    position: [0, -0.7, 0.01],
  });
  kp.mount(pendulum, { shadow: false });
  clock.add(pendulum);
  clickable(clock, 'clock');

  const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  const sparks = Array.from({ length: SPARK_COUNT }, () => {
    const g = new THREE.Group();
    g.add(
      new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.06), sparkMaterial),
      new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.06), sparkMaterial),
    );
    g.children.forEach((m) => {
      m.userData.withoutGhost = true;
    });
    g.visible = false;
    clock.add(g);
    return { g, t: -1, wait: 1 + random() * 4 };
  });

  let built = false;
  function setBuilt(yes) {
    built = yes;
    setGhost(clock, !yes);
    if (!yes) {
      sparks.forEach((f) => {
        f.g.visible = false;
      });
    }
  }
  function setHour(h) {
    hours.rotation.z = -((h % 12) / 12) * Math.PI * 2;
    minutes.rotation.z = -(h % 1) * Math.PI * 2;
  }
  function animate(t, dt) {
    pendulum.rotation.z = Math.sin(t * 2.4) * 0.3;
    sparks.forEach((f) => {
      if (!built) {
        return;
      }
      if (f.t < 0) {
        f.wait -= dt;
        if (f.wait <= 0) {
          f.t = 0;
          f.g.position.set(...SPARK_POSITIONS[Math.floor(random() * SPARK_POSITIONS.length)]);
          f.g.visible = true;
        }
        return;
      }
      f.t += dt / 0.6;
      const s = Math.sin(Math.min(1, f.t) * Math.PI);
      f.g.scale.setScalar(Math.max(0.01, s));
      f.g.rotation.z = f.t * 1.5;
      if (f.t >= 1) {
        f.t = -1;
        f.wait = 2 + random() * 4;
        f.g.visible = false;
      }
    });
  }

  return { group: clock, setBuilt, setHour, animate };
}
