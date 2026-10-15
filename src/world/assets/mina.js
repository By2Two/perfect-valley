import * as THREE from 'three';
import { rocha, tabuasDeck } from '../texturas.js';

const MINERIOS = [0xd9822b, 0xd8dde3, 0xf2c230, 0x9b4fc4];
const FERRO = 0x4a4e55;
const MADEIRA = 0x7a4a26;

/**
 * Rocha facetada: poliedro com os vértices deslocados de forma determinística
 * (o deslocamento depende só da posição, então os vértices repetidos continuam colados).
 */
export function geoRocha(raio, semente = 0, { detalhe = 0, achatar = 0.85, tipo = 'ico' } = {}) {
  const geo = tipo === 'ico' ? new THREE.IcosahedronGeometry(raio, detalhe) : new THREE.DodecahedronGeometry(raio, detalhe);
  const p = geo.attributes.position;
  // Posição arredondada: cópias do mesmo vértice precisam receber o mesmo deslocamento
  const q = (v) => Math.round(v * 1000) / 1000;
  const ruido = (x, y, z) => {
    const s = Math.sin(q(x) * 12.9898 + q(y) * 78.233 + q(z) * 37.719 + semente * 3.17) * 43758.5453;
    return s - Math.floor(s);
  };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 0.78 + ruido(x, y, z) * 0.38;
    p.setXYZ(i, x * k, y * k * achatar, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Mina: morro de pedra irregular com entrada de vigas, lanterna, trilho e carrinho */
export function construirMina(u) {
  const { construtor, matTex, clicavel, grupo } = u;
  const mRocha = matTex(rocha({ base: 0xc8c8c8 }));
  const mMadeira = matTex(tabuasDeck({ base: 0x9a6a3a }));
  const lanternaMat = new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0x6a4010 });
  const k = construtor();
  const kNeve = construtor();

  // ---------- Morro de rochas ----------
  // [x, y, z, raio, tom, tipo]
  const rochas = [
    [0, 1.2, -0.7, 1.9, 0x9a9da2], [-1.5, 0.95, -0.3, 1.45, 0x8a8d92], [1.55, 0.85, -0.35, 1.35, 0xa4a7ab],
    [0.6, 2.3, -1.1, 1.25, 0x8f9297], [-0.9, 2.15, -1.3, 1.1, 0x74777c], [0.1, 3.1, -1.0, 0.8, 0xa9acb0],
    [1.95, 0.5, 0.75, 0.85, 0x7c7f84], [-1.95, 0.45, 0.8, 0.8, 0x9a9da2], [-1.15, 0.6, 1.2, 0.55, 0x686b70],
    [1.2, 0.55, 1.25, 0.55, 0x8a8d92], [2.5, 0.3, 1.6, 0.42, 0x9a9da2], [-2.4, 0.25, 1.7, 0.36, 0x74777c],
    [2.3, 1.6, -1.2, 0.9, 0x686b70], [-2.3, 1.4, -1.0, 0.85, 0x9a9da2],
  ];
  rochas.forEach(([x, y, z, r, cor], i) => {
    k.peca(geoRocha(r, i, { tipo: i % 3 ? 'ico' : 'dodeca' }), mRocha,
      { cor, rot: new THREE.Euler(0, i * 1.3, 0), pos: [x, y, z], contorno: r > 0.7 });
  });
  // Neve no topo das rochas mais altas
  [[0.1, 3.55, -1.0, 0.62], [0.6, 3.15, -1.1, 0.75], [-0.9, 2.95, -1.3, 0.65], [0, 2.75, -0.2, 0.9]].forEach(([x, y, z, r], i) => {
    kNeve.peca(geoRocha(r, 40 + i, { achatar: 0.3 }), 0xf6fafc, { pos: [x, y, z] });
  });

  // Minérios incrustados (cobre, ferro, ouro, ametista)
  const dir = new THREE.Vector3();
  let n = 0;
  rochas.forEach(([x, y, z, r], i) => {
    if (r < 0.8) return;
    for (let j = 0; j < 2; j++) {
      const a = 0.2 + ((i * 7 + j * 3) % 10) / 10 * 1.3;
      const b = 0.15 + ((i * 3 + j * 5) % 7) / 7 * 0.8;
      dir.set(Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b)).normalize();
      if (Math.abs(x + dir.x * r) < 0.9 && z + dir.z * r > 0.6 && y + dir.y * r < 2) continue; // longe da entrada
      const s = 0.13 + (n % 3) * 0.04;
      k.cx(s, s, s, MINERIOS[n++ % MINERIOS.length], x + dir.x * r * 0.82, y + dir.y * r * 0.82 * 0.85 - s / 2, z + dir.z * r * 0.82);
    }
  });

  // ---------- Entrada com vigas ----------
  k.cx(1.3, 1.65, 1.3, 0x14100c, 0, 0, 1.0);
  k.cx(0.24, 1.8, 0.3, mMadeira, -0.72, 0, 1.6, { contorno: true });
  k.cx(0.24, 1.8, 0.3, mMadeira, 0.72, 0, 1.6, { contorno: true });
  k.cx(2.0, 0.28, 0.36, mMadeira, 0, 1.78, 1.6, { contorno: true });
  k.cx(0.14, 0.14, 0.4, MADEIRA, -0.55, 1.6, 1.62);
  k.cx(0.14, 0.14, 0.4, MADEIRA, 0.55, 1.6, 1.62);
  // Placa
  k.cx(0.8, 0.3, 0.06, 0xc68b4e, 0, 2.08, 1.72);
  k.cx(0.5, 0.06, 0.07, 0x5b3a1e, 0, 2.2, 1.73);

  // Lanterna num poste ao lado da entrada
  k.cx(0.12, 1.7, 0.12, MADEIRA, 1.15, 0, 2.0);
  k.cx(0.45, 0.08, 0.08, MADEIRA, 1.0, 1.62, 2.0);
  k.cx(0.03, 0.15, 0.03, FERRO, 0.85, 1.47, 2.0);
  k.cx(0.22, 0.28, 0.22, lanternaMat, 0.85, 1.2, 2.0);
  k.cx(0.28, 0.06, 0.28, FERRO, 0.85, 1.47, 2.0);
  k.cx(0.28, 0.05, 0.28, FERRO, 0.85, 1.15, 2.0);

  // ---------- Trilho e carrinho ----------
  for (let z = 1.1; z <= 3.6; z += 0.42) k.cx(0.95, 0.06, 0.16, MADEIRA, 0, 0, z);
  [-0.3, 0.3].forEach((x) => k.cx(0.06, 0.06, 2.6, FERRO, x, 0.06, 2.35));
  const cz = 2.9;
  k.cx(0.85, 0.42, 0.62, 0x6e6a64, 0, 0.2, cz, { contorno: true });
  k.cx(0.89, 0.08, 0.66, FERRO, 0, 0.56, cz);
  k.cx(0.89, 0.08, 0.66, FERRO, 0, 0.3, cz);
  [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]].forEach(([x, dz]) => k.peca(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8), 0x2e2f33,
    { rot: new THREE.Euler(0, 0, Math.PI / 2), pos: [x * 1.2, 0.18, cz + dz] }));
  [[-0.18, -0.1, 0], [0.12, 0.08, 2], [0.0, -0.05, 1], [-0.05, 0.14, 0], [0.2, -0.12, 3]].forEach(([x, dz, m], i) => {
    k.peca(geoRocha(0.16, 90 + i), i % 2 ? 0x8a8d92 : MINERIOS[m], { pos: [x, 0.66, cz + dz] });
  });

  // ---------- Pedras soltas ----------
  [[2.9, 0.3, 0.12], [-2.9, 0.6, 0.18], [1.9, 2.2, 0.2], [-1.6, 2.4, 0.15], [-0.9, 3.4, 0.22], [3.1, -0.8, 0.25], [-3.0, -0.4, 0.2]]
    .forEach(([x, z, r], i) => k.peca(geoRocha(r, 60 + i), mRocha, { cor: i % 2 ? 0x8a8d92 : 0xa4a7ab, pos: [x, r * 0.5, z] }));
  [[1.6, 2.6, 2], [-1.4, 2.0, 0]].forEach(([x, z, m]) => k.cx(0.12, 0.12, 0.12, MINERIOS[m], x, 0, z));

  const mina = grupo(10.8, -11.2);
  k.montar(mina);
  const neve = [...kNeve.montar(mina, { sombra: false }).values()];
  clicavel(mina, 'monsters');

  function definirEstacao(estacao) {
    neve.forEach((m) => { m.visible = estacao === 'winter'; });
  }
  function definirLuz(noite) {
    lanternaMat.emissive.setHex(noite ? 0xffc870 : 0x6a4010);
  }

  return { grupo: mina, definirEstacao, definirLuz };
}
