import * as THREE from 'three';
import { SHEET } from '../../data.js';
import { obelisco, espiral } from '../texturas.js';

// Cada obelisco leva para um destino; o de água tem aro de pedra, os outros de ouro
const TEMAS = {
  'earth-obelisk': { tema: 'terra', aro: 0xe0a43a, joia: 0x9b4fc4 },
  'water-obelisk': { tema: 'agua', aro: 0x9a9da2, joia: 0x56a3e2 },
  'desert-obelisk': { tema: 'deserto', aro: 0xe0a43a, joia: 0xe8833a },
  'island-obelisk': { tema: 'ilha', aro: 0xe0a43a, joia: 0x4fa33a },
};
const BRILHOS = 4;
const ALTURA = 4.2;
const BASE = 0.35;

/** Obeliscos: pilares pintados com paisagens e um portal em espiral no topo */
export function construirObeliscos(u) {
  const { construtor, clicavel, grupo, definirFantasma } = u;
  const portalMat = new THREE.MeshBasicMaterial({ map: espiral() });
  const geoPortal = new THREE.CircleGeometry(0.58, 16);
  const topo = BASE + ALTURA;

  const lista = SHEET.obeliscos.map((o, i) => {
    const { tema, aro, joia } = TEMAS[o.id] ?? TEMAS['earth-obelisk'];
    const k = construtor();
    const mPilar = new THREE.MeshLambertMaterial({ map: obelisco(tema) });
    k.peca(new THREE.CylinderGeometry(0.85, 0.92, BASE, 16), 0x8a8d92, { pos: [0, BASE / 2, 0], contorno: true });
    k.peca(new THREE.CylinderGeometry(0.62, 0.66, ALTURA, 16), mPilar, { pos: [0, BASE + ALTURA / 2, 0], uv: false, contorno: true });
    // Aro do topo, com borda clara e quatro joias
    k.peca(new THREE.CylinderGeometry(0.76, 0.68, 0.34, 16), aro, { pos: [0, topo + 0.17, 0], contorno: true });
    k.peca(new THREE.CylinderGeometry(0.78, 0.78, 0.06, 16), new THREE.Color(aro).offsetHSL(0, 0, 0.12).getHex(), { pos: [0, topo + 0.34, 0] });
    for (let j = 0; j < 4; j++) {
      const a = (j * Math.PI) / 2 + Math.PI / 4;
      k.cx(0.14, 0.14, 0.14, joia, Math.sin(a) * 0.72, topo + 0.1, Math.cos(a) * 0.72);
    }
    const g = grupo(-1.5 + i * 2.6, -10.5);
    k.montar(g);
    const portal = new THREE.Mesh(geoPortal, portalMat);
    portal.rotation.x = -Math.PI / 2;
    portal.position.y = topo + 0.38;
    g.add(portal);
    clicavel(g, 'obelisks');
    return { g, portal, construido: false };
  });

  // Faíscas roxas subindo dos portais construídos
  const brilhos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.09, 0.09),
    new THREE.MeshBasicMaterial({ color: 0xe8a0f0 }), lista.length * BRILHOS);
  brilhos.frustumCulled = false;
  u.cena.add(brilhos);
  const m4 = new THREE.Matrix4();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < lista.length * BRILHOS; i++) brilhos.setMatrixAt(i, zero);

  function definirConstruidos(estado) {
    SHEET.obeliscos.forEach((o, i) => {
      lista[i].construido = Boolean(estado[o.id]);
      definirFantasma(lista[i].g, !lista[i].construido);
    });
  }

  function animar(t) {
    portalMat.color.setScalar(0.82 + Math.sin(t * 2.2) * 0.18);
    lista.forEach((o, i) => {
      o.portal.rotation.z = t * (0.6 + i * 0.07);
      for (let j = 0; j < BRILHOS; j++) {
        const f = (t * 0.45 + j / BRILHOS + i * 0.13) % 1;
        const a = j * 1.7 + t * 0.8 + i;
        if (o.construido) {
          m4.makeScale(1 - f, 1 - f, 1 - f).setPosition(o.g.position.x + Math.cos(a) * 0.4, topo + 0.45 + f * 1.3, o.g.position.z + Math.sin(a) * 0.4);
        } else m4.copy(zero);
        brilhos.setMatrixAt(i * BRILHOS + j, m4);
      }
    });
    brilhos.instanceMatrix.needsUpdate = true;
  }

  return { definirConstruidos, animar };
}
