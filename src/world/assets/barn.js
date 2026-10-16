import * as THREE from 'three';
import { verticalPlanks, deckPlanks, shingles, bricks } from '../textures.js';

const COLOR = {
  wall: 0xc0392f,
  door: 0xe3b6ae,
  shingle: 0x8a5a2b,
  ridge: 0x5b3a1e,
  white: 0xf3ddb0,
  stone: 0x9a958c,
  dark: 0x3b2410,
  iron: 0x3b3f45,
  hay: 0xe8c060,
  darkHay: 0xb08a3a,
  post: 0x8a5a2b,
  crossbar: 0xa8763f,
};
const L = 4.6;
const P = 3.6;
const Y0 = 2.6;
const PROFILE = [
  [-1.8, 0],
  [-1.25, 1.0],
  [0, 1.6],
  [1.25, 1.0],
  [1.8, 0],
];

const POSITION = [-11.6, 2.0];
const SPIN = -Math.PI / 2;
export const FENCED_PEN = { x0: -12.8, z0: POSITION[1] + L / 2, x1: -8.2, z1: 9.0 };

export function fence(k, [a, b], { step = 1.3 } = {}) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const n = Math.max(1, Math.round(len / step));
  const geoPost = new THREE.CylinderGeometry(0.11, 0.12, 0.72, 6);
  const geoTop = new THREE.SphereGeometry(0.11, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2);
  for (let i = 0; i <= n; i++) {
    const x = a[0] + (dx * i) / n;
    const z = a[1] + (dz * i) / n;
    k.piece(geoPost, COLOR.post, { position: [x, 0.36, z] });
    k.piece(geoTop, COLOR.post, { position: [x, 0.72, z] });
  }
  const rot = new THREE.Euler(0, -Math.atan2(dz, dx), 0);
  [0.3, 0.58].forEach((y) => k.piece(new THREE.BoxGeometry(len, 0.11, 0.07), COLOR.crossbar, { rot, position: [a[0] + dx / 2, y, a[1] + dz / 2] }));
}

export function buildBarn(u) {
  const { scene, builder, materialTexture, clickable, group, windowMaterial, lanternMaterial, solidMaterial } = u;
  const mWall = materialTexture(verticalPlanks({ base: COLOR.wall }));
  const mShingle = materialTexture(shingles({ base: COLOR.shingle }));
  const mStone = materialTexture(bricks({ base: COLOR.stone }));
  const mDeck = materialTexture(deckPlanks({ base: 0xc87a3a }));
  const k = builder();
  const kSnow = builder();

  const onWall =
    (face, plane) =>
    ([w, h, d], material, { along, y, offset, ...options }) =>
      face === '-z'
        ? k.box([w, h, d], material, { position: [-along, y, plane - offset], ...options })
        : k.box([d, h, w], material, { position: [plane + offset, y, -along], ...options });

  function addDoorLeaf(along, y, [w, h]) {
    const px = onWall('x', L / 2);
    const e = 0.1;
    px([w, h, 0.08], mWall, { along, y, offset: 0.04, color: COLOR.door });
    px([w, e, 0.12], COLOR.white, { along, y, offset: 0.06 });
    px([w, e, 0.12], COLOR.white, { along, y: y + h - e, offset: 0.06 });
    px([e, h, 0.12], COLOR.white, { along: along - w / 2 + e / 2, y, offset: 0.06 });
    px([e, h, 0.12], COLOR.white, { along: along + w / 2 - e / 2, y, offset: 0.06 });
    const wi = w - 2 * e;
    const hi = h - 2 * e;
    const angle = Math.atan2(hi, wi);
    [angle, -angle].forEach((a) =>
      k.piece(new THREE.BoxGeometry(0.1, 0.1, Math.hypot(wi, hi) - 0.04), COLOR.white, {
        rot: new THREE.Euler(a, 0, 0),
        position: [L / 2 + 0.07, y + h / 2, -along],
      }),
    );
  }

  k.box([L + 0.2, 0.3, P + 0.2], mStone, { position: [0, 0, 0], outline: true });
  k.box([L, 2.3, P], mWall, { position: [0, 0.3, 0], outline: true });
  const shape = new THREE.Shape(PROFILE.map(([z, y]) => new THREE.Vector2(z, y)));
  k.piece(new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false }), mWall, {
    rot: new THREE.Euler(0, Math.PI / 2, 0),
    position: [-L / 2, Y0, 0],
    outline: true,
  });
  k.box([L + 0.1, 0.12, P + 0.1], COLOR.white, { position: [0, Y0 - 0.12, 0] });
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([sx, sz]) => k.box([0.16, 2.3, 0.16], COLOR.white, { position: [(sx * L) / 2, 0.3, (sz * P) / 2] }));

  const thickness = 0.15;
  const Lt = L + 0.4;
  [1, -1].forEach((s) => {
    const eaves = [s * 1.8, Y0];
    const knee = [s * 1.25, Y0 + 1.0];
    const ridge = [0, Y0 + 1.6];
    k.slab([eaves, knee], mShingle, { thickness, length: Lt, extension: [0.28, 0.1], outline: true });
    k.slab([knee, ridge], mShingle, { thickness, length: Lt, extension: [0.04, 0.06], outline: true });
    kSnow.slab([knee, ridge], 0xf6fafc, { thickness: 0.12, length: Lt + 0.04, extension: [0.08, 0.06], over: thickness });
    [-1, 1].forEach((sx) => {
      k.slab([eaves, knee], COLOR.white, { thickness: thickness + 0.04, length: 0.1, center: sx * (Lt / 2 + 0.05), extension: [0.28, 0.1] });
      k.slab([knee, ridge], COLOR.white, { thickness: thickness + 0.04, length: 0.1, center: sx * (Lt / 2 + 0.05), extension: [0.04, 0.06] });
    });
  });
  k.box([Lt + 0.2, 0.14, 0.3], COLOR.ridge, { position: [0, Y0 + 1.66, 0], outline: true });
  kSnow.box([Lt + 0.24, 0.1, 0.38], 0xf6fafc, { position: [0, Y0 + 1.8, 0] });

  k.box([0.06, 0.6, 0.06], COLOR.iron, { position: [-1.2, Y0 + 1.78, 0] });
  k.box([0.06, 0.04, 0.6], COLOR.iron, { position: [-1.2, Y0 + 2.2, 0] });
  k.box([0.06, 0.2, 0.26], COLOR.iron, { position: [-1.2, Y0 + 2.38, 0] });
  k.box([0.06, 0.12, 0.1], COLOR.iron, { position: [-1.2, Y0 + 2.5, 0.12] });
  k.box([0.06, 0.18, 0.08], COLOR.iron, { position: [-1.2, Y0 + 2.46, -0.15] });

  const side = onWall('x', L / 2);
  side([2.2, 2.05, 0.04], COLOR.dark, { along: 0, y: 0.3, offset: 0.02 });
  addDoorLeaf(-0.5, 0.32, [1.0, 1.9]);
  addDoorLeaf(0.5, 0.32, [1.0, 1.9]);
  side([2.4, 0.14, 0.14], COLOR.white, { along: 0, y: 2.24, offset: 0.07 });
  side([2.7, 0.08, 0.1], COLOR.dark, { along: 0, y: 2.42, offset: 0.1 });
  side([0.2, 0.26, 0.2], lanternMaterial, { along: 1.35, y: 1.75, offset: 0.16 });
  side([0.26, 0.06, 0.26], COLOR.dark, { along: 1.35, y: 2.01, offset: 0.16 });
  addDoorLeaf(0, Y0 + 0.2, [0.8, 0.75]);
  k.box([0.9, 0.14, 0.14], COLOR.ridge, { position: [L / 2 + 0.35, Y0 + 1.3, 0] });
  k.box([0.03, 0.5, 0.03], 0xd8c08a, { position: [L / 2 + 0.7, Y0 + 0.8, 0] });
  k.box([0.1, 0.08, 0.06], COLOR.iron, { position: [L / 2 + 0.7, Y0 + 0.74, 0] });

  const front = onWall('-z', -P / 2);
  [-1.3, 1.3].forEach((along) => {
    const w = 0.62;
    const y = 1.25;
    front([w + 0.2, 0.1, 0.1], COLOR.white, { along, y: y - 0.1, offset: 0.05 });
    front([w + 0.2, 0.1, 0.1], COLOR.white, { along, y: y + w, offset: 0.05 });
    front([0.1, w, 0.1], COLOR.white, { along: along - w / 2 - 0.05, y, offset: 0.05 });
    front([0.1, w, 0.1], COLOR.white, { along: along + w / 2 + 0.05, y, offset: 0.05 });
    front([w, w, 0.06], windowMaterial, { along, y, offset: 0.03 });
    front([0.06, w, 0.08], COLOR.white, { along, y, offset: 0.04 });
    front([w, 0.06, 0.08], COLOR.white, { along, y: y + w / 2 - 0.03, offset: 0.04 });
  });

  const bale = ([x, y, z], rotY = 0) => {
    k.piece(new THREE.BoxGeometry(0.8, 0.45, 0.5), COLOR.hay, { rot: new THREE.Euler(0, rotY, 0), position: [x, y + 0.225, z] });
    [-0.2, 0.2].forEach((d) =>
      k.piece(new THREE.BoxGeometry(0.05, 0.47, 0.52), COLOR.darkHay, {
        rot: new THREE.Euler(0, rotY, 0),
        position: [x + Math.cos(rotY) * d, y + 0.225, z - Math.sin(rotY) * d],
      }),
    );
  };
  bale([-1.7, 0, -2.25]);
  bale([-0.85, 0, -2.3], 0.15);
  bale([-1.3, 0.45, -2.28], -0.1);

  const barn = group(...POSITION);
  barn.rotation.y = SPIN;
  k.mount(barn);
  const snow = [...kSnow.mount(barn, { shadow: false }).values()];
  clickable(barn, 'cooking');

  const kc = builder();
  const { x0, z0, x1, z1 } = FENCED_PEN;
  fence(kc, [
    [x0, z0],
    [x0, z1],
  ]);
  fence(kc, [
    [x0, z1],
    [x1, z1],
  ]);
  fence(kc, [
    [x1, z1],
    [x1, z0],
  ]);
  fence(
    kc,
    [
      [x0, z0],
      [POSITION[0] - P / 2, z0],
    ],
    { step: 2 },
  );
  fence(
    kc,
    [
      [POSITION[0] + P / 2, z0],
      [x1, z0],
    ],
    { step: 2 },
  );
  kc.box([1.4, 0.3, 0.5], mDeck, { position: [x1 - 1.1, 0, z1 - 0.5], color: 0xa07050 });
  kc.box([1.26, 0.04, 0.36], 0x56a3e2, { position: [x1 - 1.1, 0.27, z1 - 0.5] });
  const pen = group(0, 0);
  kc.mount(pen);
  const kf = builder();
  const fx = x0 + 0.7;
  const fz = z1 - 0.6;
  kf.box([0.8, 0.45, 0.5], COLOR.hay, { position: [fx, 0, fz] });
  [-0.2, 0.2].forEach((d) => kf.box([0.05, 0.47, 0.52], COLOR.darkHay, { position: [fx + d, 0, fz] }));
  kf.mount(pen);

  const area = [x0 + 0.5, z0 + 0.6, x1 - 0.5, z1 - 0.5];
  const animals = [];

  function addAnimal([x, z], { hip, legs, width, legColor, neck, speed, isHen = false }, def) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = u.random() * Math.PI * 2;
    const body = new THREE.Group();
    const head = new THREE.Group();
    head.position.set(...neck);
    const kBody = builder();
    const kHead = builder();
    def(kBody, kHead);
    kBody.mount(body);
    kHead.mount(head);
    body.add(head);
    g.add(body);
    const geoLeg = new THREE.BoxGeometry(width, hip, width).translate(0, -hip / 2, 0);
    const legsList = legs.map(([px, pz]) => {
      const m = new THREE.Mesh(geoLeg, solidMaterial(legColor));
      m.position.set(px, hip, pz);
      m.castShadow = true;
      g.add(m);
      return m;
    });
    scene.add(g);
    const a = { g, body, head, legs: legsList, speed, isHen, target: new THREE.Vector2(x, z), wait: u.random() * 3, graze: 0, step: u.random() * 6 };
    animals.push(a);
    return a;
  }

  function addHen([x, z], color, wing) {
    addAnimal(
      [x, z],
      {
        hip: 0.16,
        legs: [
          [-0.1, 0],
          [0.1, 0],
        ],
        width: 0.06,
        legColor: 0xf2a030,
        neck: [0, 0.42, 0.16],
        speed: 0.9,
        isHen: true,
      },
      (bodyBuilder, headBuilder) => {
        bodyBuilder.box([0.42, 0.34, 0.5], color, { position: [0, 0.16, -0.02] });
        bodyBuilder.box([0.44, 0.16, 0.28], wing, { position: [0, 0.24, -0.04] });
        bodyBuilder.box([0.28, 0.22, 0.12], color, { position: [0, 0.4, -0.26] });
        headBuilder.box([0.28, 0.28, 0.26], color, { position: [0, -0.04, 0.06] });
        headBuilder.box([0.08, 0.1, 0.16], 0xd8343b, { position: [0, 0.24, 0.06] });
        headBuilder.box([0.1, 0.07, 0.1], 0xf2a030, { position: [0, 0.06, 0.23] });
        headBuilder.box([0.06, 0.08, 0.05], 0xd8343b, { position: [0, -0.02, 0.2] });
        headBuilder.box([0.3, 0.05, 0.05], 0x1a1410, { position: [0, 0.12, 0.13] });
      },
    );
  }
  addHen([-11.8, 8.2], 0xfff8ec, 0xeadfcf);
  addHen([-9.2, 8.4], 0xb5713a, 0x8e5428);
  addHen([-10.4, 7.6], 0x8aa8c8, 0x6e8cae);

  addAnimal(
    [-11.6, 5.6],
    {
      hip: 0.42,
      legs: [
        [-0.27, 0.42],
        [0.27, 0.42],
        [-0.27, -0.42],
        [0.27, -0.42],
      ],
      width: 0.18,
      legColor: 0xfff8ec,
      neck: [0, 0.88, 0.6],
      speed: 0.45,
    },
    (bodyBuilder, headBuilder) => {
      bodyBuilder.box([0.78, 0.62, 1.2], 0xfff8ec, { position: [0, 0.42, 0] });
      bodyBuilder.box([0.8, 0.32, 0.38], 0x5b3a1e, { position: [0, 0.56, 0.2] });
      bodyBuilder.box([0.5, 0.64, 0.3], 0x5b3a1e, { position: [-0.15, 0.41, -0.35] });
      bodyBuilder.box([0.25, 0.1, 0.2], 0xf0b0a0, { position: [0, 0.34, -0.25] });
      bodyBuilder.box([0.06, 0.4, 0.06], 0xfff8ec, { position: [0, 0.6, -0.62] });
      bodyBuilder.box([0.1, 0.1, 0.1], 0x5b3a1e, { position: [0, 0.52, -0.62] });
      headBuilder.box([0.5, 0.46, 0.42], 0xfff8ec, { position: [0, -0.14, 0.16] });
      headBuilder.box([0.44, 0.22, 0.12], 0xf0b0a0, { position: [0, -0.14, 0.42] });
      headBuilder.box([0.54, 0.07, 0.07], 0x1a1410, { position: [0, 0.12, 0.24] });
      headBuilder.box([0.08, 0.12, 0.08], 0xf3ddb0, { position: [-0.17, 0.32, 0.12] });
      headBuilder.box([0.08, 0.12, 0.08], 0xf3ddb0, { position: [0.17, 0.32, 0.12] });
      headBuilder.box([0.74, 0.08, 0.12], 0x5b3a1e, { position: [0, 0.2, 0.08] });
    },
  );

  addAnimal(
    [-9.0, 5.8],
    {
      hip: 0.25,
      legs: [
        [-0.2, 0.3],
        [0.2, 0.3],
        [-0.2, -0.3],
        [0.2, -0.3],
      ],
      width: 0.14,
      legColor: 0xf2a7b0,
      neck: [0, 0.55, 0.45],
      speed: 0.6,
    },
    (bodyBuilder, headBuilder) => {
      bodyBuilder.box([0.62, 0.5, 0.9], 0xf2a7b0, { position: [0, 0.25, 0] });
      bodyBuilder.box([0.64, 0.12, 0.7], 0xf6bcc3, { position: [0, 0.25, 0] });
      bodyBuilder.box([0.06, 0.12, 0.06], 0xe8858f, { position: [0, 0.62, -0.47] });
      bodyBuilder.box([0.12, 0.06, 0.06], 0xe8858f, { position: [0.04, 0.72, -0.47] });
      headBuilder.box([0.5, 0.44, 0.36], 0xf2a7b0, { position: [0, -0.2, 0.12] });
      headBuilder.box([0.26, 0.18, 0.1], 0xe8858f, { position: [0, -0.12, 0.33] });
      headBuilder.box([0.04, 0.05, 0.02], 0x8a4a50, { position: [-0.06, -0.06, 0.385] });
      headBuilder.box([0.04, 0.05, 0.02], 0x8a4a50, { position: [0.06, -0.06, 0.385] });
      headBuilder.box([0.52, 0.06, 0.06], 0x1a1410, { position: [0, 0.06, 0.22] });
      headBuilder.box([0.14, 0.14, 0.08], 0xe8858f, { position: [-0.17, 0.22, 0.08] });
      headBuilder.box([0.14, 0.14, 0.08], 0xe8858f, { position: [0.17, 0.22, 0.08] });
    },
  );

  addAnimal(
    [-10.2, 6.4],
    {
      hip: 0.3,
      legs: [
        [-0.22, 0.32],
        [0.22, 0.32],
        [-0.22, -0.32],
        [0.22, -0.32],
      ],
      width: 0.12,
      legColor: 0x4a3a30,
      neck: [0, 0.75, 0.48],
      speed: 0.5,
    },
    (bodyBuilder, headBuilder) => {
      bodyBuilder.box([0.74, 0.6, 0.92], 0xf6efe0, { position: [0, 0.3, 0] });
      bodyBuilder.box([0.5, 0.12, 0.6], 0xfffaf0, { position: [0, 0.9, 0] });
      bodyBuilder.box([0.8, 0.36, 0.5], 0xeee4d0, { position: [0, 0.4, -0.08] });
      bodyBuilder.box([0.6, 0.4, 0.96], 0xfffaf0, { position: [0, 0.42, 0] });
      headBuilder.box([0.32, 0.36, 0.32], 0x5a4638, { position: [0, -0.22, 0.12] });
      headBuilder.box([0.38, 0.14, 0.32], 0xfffaf0, { position: [0, 0.1, 0.08] });
      headBuilder.box([0.6, 0.08, 0.12], 0x5a4638, { position: [0, -0.02, 0.06] });
      headBuilder.box([0.34, 0.05, 0.05], 0xf3ddb0, { position: [0, 0.0, 0.2] });
    },
  );

  addAnimal(
    [-11.8, 7.0],
    {
      hip: 0.36,
      legs: [
        [-0.18, 0.3],
        [0.18, 0.3],
        [-0.18, -0.3],
        [0.18, -0.3],
      ],
      width: 0.1,
      legColor: 0xc8beae,
      neck: [0, 0.8, 0.45],
      speed: 0.65,
    },
    (bodyBuilder, headBuilder) => {
      bodyBuilder.box([0.54, 0.46, 0.85], 0xe0d6c4, { position: [0, 0.36, 0] });
      bodyBuilder.box([0.2, 0.04, 0.85], 0xa89a84, { position: [0, 0.82, 0] });
      bodyBuilder.box([0.08, 0.16, 0.08], 0xa89a84, { position: [0, 0.78, -0.44] });
      headBuilder.box([0.3, 0.32, 0.36], 0xe0d6c4, { position: [0, -0.1, 0.14] });
      headBuilder.box([0.24, 0.18, 0.12], 0xc8beae, { position: [0, -0.14, 0.36] });
      headBuilder.box([0.08, 0.14, 0.06], 0xa89a84, { position: [0, -0.32, 0.36] });
      headBuilder.box([0.07, 0.24, 0.07], 0x6e5a48, { position: [-0.08, 0.18, 0.02] });
      headBuilder.box([0.07, 0.24, 0.07], 0x6e5a48, { position: [0.08, 0.18, 0.02] });
      headBuilder.box([0.55, 0.07, 0.1], 0xe0d6c4, { position: [0, 0.08, 0.08] });
      headBuilder.box([0.32, 0.05, 0.05], 0x1a1410, { position: [0, 0.06, 0.24] });
    },
  );

  function setSeason(season) {
    snow.forEach((m) => {
      m.visible = season === 'winter';
    });
  }

  function grazingHeadAngle(animal, t) {
    if (animal.graze <= 0) {
      return 0;
    }
    return animal.isHen ? 0.6 + Math.sin(t * 18) * 0.4 : 0.7 + Math.sin(t * 5) * 0.08;
  }

  const v = new THREE.Vector2();
  function animate(t, dt) {
    animals.forEach((a) => {
      const { g, body, head, legs } = a;
      if (a.wait > 0) {
        a.wait -= dt;
        a.graze -= dt;
        const headTarget = grazingHeadAngle(a, t);
        head.rotation.x += (headTarget - head.rotation.x) * Math.min(1, dt * 8);
        legs.forEach((p) => {
          p.rotation.x *= 0.8;
        });
        body.position.y *= 0.8;
        body.rotation.z *= 0.8;
        if (a.wait <= 0) {
          const [ax0, az0, ax1, az1] = area;
          a.target.set(ax0 + u.random() * (ax1 - ax0), az0 + u.random() * (az1 - az0));
        }
        return;
      }
      v.set(a.target.x - g.position.x, a.target.y - g.position.z);
      const distance = v.length();
      if (distance < 0.1) {
        a.wait = 1.5 + u.random() * (a.isHen ? 3 : 6);
        a.graze = u.random() < 0.7 ? a.wait * 0.8 : 0;
        return;
      }
      const targetAngle = Math.atan2(v.x, v.y);
      let difference = targetAngle - g.rotation.y;
      difference = Math.atan2(Math.sin(difference), Math.cos(difference));
      g.rotation.y += difference * Math.min(1, dt * 5);
      const step = Math.min(distance, a.speed * dt * (Math.abs(difference) > 1 ? 0.3 : 1));
      g.position.x += Math.sin(g.rotation.y) * step;
      g.position.z += Math.cos(g.rotation.y) * step;
      head.rotation.x *= 0.85;
      a.step += dt * (a.isHen ? 16 : 9);
      legs.forEach((p, i) => {
        p.rotation.x = Math.sin(a.step + (i === 1 || i === 2 ? Math.PI : 0)) * 0.5;
      });
      body.position.y = Math.abs(Math.sin(a.step)) * (a.isHen ? 0.06 : 0.04);
      body.rotation.z = Math.sin(a.step) * 0.05;
    });
  }

  return { group: barn, setSeason, animate };
}
