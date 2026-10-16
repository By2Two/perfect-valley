import * as THREE from 'three';
import { SHEET } from '../../catalog.js';
import { obelisk, spiral } from '../textures.js';

const THEMES = {
  'earth-obelisk': { theme: 'earth', hoop: 0xe0a43a, jewel: 0x9b4fc4 },
  'water-obelisk': { theme: 'water', hoop: 0x9a9da2, jewel: 0x56a3e2 },
  'desert-obelisk': { theme: 'desert', hoop: 0xe0a43a, jewel: 0xe8833a },
  'island-obelisk': { theme: 'island', hoop: 0xe0a43a, jewel: 0x4fa33a },
};
const GLOWS = 4;
const HEIGHT = 4.2;
const BASE = 0.35;

export function buildObelisks(u) {
  const { builder, clickable, group, setGhost } = u;
  const portalMaterial = new THREE.MeshBasicMaterial({ map: spiral() });
  const geoPortal = new THREE.CircleGeometry(0.58, 16);
  const topY = BASE + HEIGHT;

  const list = SHEET.obelisks.map((o, i) => {
    const { theme, hoop, jewel } = THEMES[o.id] ?? THEMES['earth-obelisk'];
    const k = builder();
    const mPillar = new THREE.MeshLambertMaterial({ map: obelisk(theme) });
    k.piece(new THREE.CylinderGeometry(0.85, 0.92, BASE, 16), 0x8a8d92, { position: [0, BASE / 2, 0], outline: true });
    k.piece(new THREE.CylinderGeometry(0.62, 0.66, HEIGHT, 16), mPillar, { position: [0, BASE + HEIGHT / 2, 0], uv: false, outline: true });
    k.piece(new THREE.CylinderGeometry(0.76, 0.68, 0.34, 16), hoop, { position: [0, topY + 0.17, 0], outline: true });
    k.piece(new THREE.CylinderGeometry(0.78, 0.78, 0.06, 16), new THREE.Color(hoop).offsetHSL(0, 0, 0.12).getHex(), {
      position: [0, topY + 0.34, 0],
    });
    for (let j = 0; j < 4; j++) {
      const a = (j * Math.PI) / 2 + Math.PI / 4;
      k.box([0.14, 0.14, 0.14], jewel, { position: [Math.sin(a) * 0.72, topY + 0.1, Math.cos(a) * 0.72] });
    }
    const g = group(-1.5 + i * 2.6, -10.5);
    k.mount(g);
    const portal = new THREE.Mesh(geoPortal, portalMaterial);
    portal.rotation.x = -Math.PI / 2;
    portal.position.y = topY + 0.38;
    g.add(portal);
    clickable(g, 'obelisks');
    return { g, portal, built: false };
  });

  const glows = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.09, 0.09, 0.09),
    new THREE.MeshBasicMaterial({ color: 0xe8a0f0 }),
    list.length * GLOWS,
  );
  glows.frustumCulled = false;
  u.scene.add(glows);
  const m4 = new THREE.Matrix4();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < list.length * GLOWS; i++) {
    glows.setMatrixAt(i, zero);
  }

  function setBuilt(state) {
    SHEET.obelisks.forEach((o, i) => {
      list[i].built = Boolean(state[o.id]);
      setGhost(list[i].g, !list[i].built);
    });
  }

  function animate(t) {
    portalMaterial.color.setScalar(0.82 + Math.sin(t * 2.2) * 0.18);
    list.forEach((o, i) => {
      o.portal.rotation.z = t * (0.6 + i * 0.07);
      for (let j = 0; j < GLOWS; j++) {
        const f = (t * 0.45 + j / GLOWS + i * 0.13) % 1;
        const a = j * 1.7 + t * 0.8 + i;
        if (o.built) {
          m4.makeScale(1 - f, 1 - f, 1 - f).setPosition(
            o.g.position.x + Math.cos(a) * 0.4,
            topY + 0.45 + f * 1.3,
            o.g.position.z + Math.sin(a) * 0.4,
          );
        } else {
          m4.copy(zero);
        }
        glows.setMatrixAt(i * GLOWS + j, m4);
      }
    });
    glows.instanceMatrix.needsUpdate = true;
  }

  return { setBuilt, animate };
}
