import * as THREE from 'three';
import { grama, calcada, agua, rocha, tabuasVerticais, tabuasDeck, telhas, tijolos } from '../texturas.js';
import { cerca } from './celeiro.js';
import { geoRocha } from './mina.js';

export const TAM = 30;
const METADE = TAM / 2;
// Lago oval: `largura` no eixo esquerda-direita da tela, `r` no eixo frente-fundo
export const LAGO = { x: 3.0, z: 6.8, r: 3.2, largura: 4.6 };
const R2 = Math.SQRT1_2;
/** Distância ao centro do lago na escala de `r` (vale r exatamente na margem) */
function distLago(x, z) {
  const dx = x - LAGO.x;
  const dz = z - LAGO.z;
  const u = (dx - dz) * R2;
  const v = (dx + dz) * R2;
  return Math.hypot((u / LAGO.largura) * LAGO.r, v);
}
/** Ponto na margem do lago (k = 1) ou dentro/fora dela, pelo ângulo na tela */
function naMargem(ang, k = 1) {
  const u = Math.cos(ang) * LAGO.largura * k;
  const v = Math.sin(ang) * LAGO.r * k;
  return [LAGO.x + (u + v) * R2, LAGO.z + (v - u) * R2];
}
// Áreas ocupadas por construções (x0, z0, x1, z1): nada de decoração solta aqui
const OCUPADOS = [
  [-9.2, -9.2, -2, -2], [-2.2, -3.9, -0.4, -2.5], [-0.4, -9.2, 6.4, 0.6], [-13.8, -0.6, -7.6, 9.4], [7.2, -15, 15, -7],
  [-3, -11.6, 8, -9.4], [-13.1, -5.1, -11.1, -3.1], [-6.4, -2.6, -4.6, 14], [-13.4, -11, -10.2, -8], [-2.4, -7, -0.2, -5.5],
  [-11.6, 10.2, -9.4, 12.4], [-5, -2, 0.2, -1], [6, -2.4, 7.4, -0.4],
];
// Pinheiros ficam verdes o ano todo
const PINHO = { spring: 0x2f7a44, summer: 0x2a6e3c, fall: 0x2f6b3a, winter: 0x2a5e38 };
const SOMBRA = 0xb4b4b4;
const MEIO = 0xd8d8d8;
const LUZ = 0xffffff;
const COR_CAMINHO = { spring: 0xc4b8a4, summer: 0xc4b8a4, fall: 0xbfae94, winter: 0xe2ddd6 };

/** Malha de quadrados no chão (um por tile), com UV no mundo e cor por vértice repintável */
function malhaTiles(lista, material, y = 0) {
  const n = lista.length;
  const pos = new Float32Array(n * 18);
  const nor = new Float32Array(n * 18);
  const uv = new Float32Array(n * 12);
  const cor = new Float32Array(n * 18);
  lista.forEach((t, i) => {
    const w = (t.w ?? 1) / 2;
    const d = (t.d ?? 1) / 2;
    const yy = t.y ?? y;
    const cantos = [[t.x - w, t.z + d], [t.x + w, t.z + d], [t.x + w, t.z - d], [t.x - w, t.z + d], [t.x + w, t.z - d], [t.x - w, t.z - d]];
    cantos.forEach(([x, z], j) => {
      pos.set([x, yy, z], i * 18 + j * 3);
      nor.set([0, 1, 0], i * 18 + j * 3);
      uv.set([x, -z], i * 12 + j * 2);
    });
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(cor, 3));
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  const c = new THREE.Color();
  function pintar(fn) {
    lista.forEach((t, i) => {
      fn(t, c);
      for (let j = 0; j < 6; j++) cor.set([c.r, c.g, c.b], i * 18 + j * 3);
    });
    geo.attributes.color.needsUpdate = true;
  }
  return { mesh, pintar };
}

/** Terreno, lago, bordas da ilha, caminho, cercas, árvores, arbustos, decoração, postes, palmeira e moinho */
export function construirCenario(u, { campo }) {
  const { cena, construtor, matTex, clicavel, grupo, aleatorio, lanternaMat } = u;
  const livre = (x, z, folga = 1) => distLago(x, z) > LAGO.r + folga &&
    !OCUPADOS.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1) && Math.abs(x) < METADE - 0.8 && Math.abs(z) < METADE - 0.8;

  // ---------- Caminho de pedras (portão até a casa, com ramal para a lavoura) ----------
  const ehCaminho = (x, z) => (x === -5.5 && z > -2.4 && z < METADE) || (z === -1.5 && x > -5.5 && x < campo.x0);
  // Pedras extras nas bordas, para o caminho não ficar reto demais
  const pedrasBorda = [];
  for (let z = -1.25; z < METADE - 0.5; z += 0.5) {
    [-6.25, -4.75].forEach((x) => { if (aleatorio() < 0.3) pedrasBorda.push({ x, z, w: 0.5, d: 0.5, y: 0.004 }); });
  }
  for (let x = -4.25; x < campo.x0 - 0.5; x += 0.5) {
    [-2.25, -0.75].forEach((z) => { if (aleatorio() < 0.3) pedrasBorda.push({ x, z, w: 0.5, d: 0.5, y: 0.004 }); });
  }

  // ---------- Tiles ----------
  const tilesGrama = [];
  const tilesAreia = [];
  const tilesCaminho = [];
  const tilesAgua = [];
  for (let gx = 0; gx < TAM; gx++) {
    for (let gz = 0; gz < TAM; gz++) {
      const x = gx - METADE + 0.5;
      const z = gz - METADE + 0.5;
      const d = distLago(x, z);
      const t = { x, z, v: (gx * 7 + gz * 13 + ((gx * gz) % 5)) % 4 };
      if (d < LAGO.r) tilesAgua.push(t);
      else if (ehCaminho(x, z)) tilesCaminho.push(t);
      else if (d < LAGO.r + 0.9) tilesAreia.push(t);
      else tilesGrama.push(t);
    }
  }
  const terreno = new THREE.Group();
  cena.add(terreno);
  const gramaMat = new THREE.MeshLambertMaterial({ map: grama({ base: 0xeeeeee }), vertexColors: true });
  const chao = malhaTiles(tilesGrama, gramaMat);
  const areia = malhaTiles(tilesAreia, gramaMat);
  const caminho = malhaTiles([...tilesCaminho, ...pedrasBorda], new THREE.MeshLambertMaterial({ map: calcada({ pedra: 0xeeeeee }), vertexColors: true }));
  terreno.add(chao.mesh, areia.mesh, caminho.mesh);

  // ---------- Bordas da ilha flutuante: beirada de grama, terra, pedra e blocos afunilando ----------
  const kb = construtor();
  const mTerra = matTex(rocha({ base: 0x8a5a2b }));
  const mPedra = matTex(rocha({ base: 0x857868 }));
  const labioMat = new THREE.MeshLambertMaterial({ map: grama({ base: 0xeeeeee }), color: 0x6daa2c });
  kb.cx(TAM, 0.3, TAM, mTerra, 0, -2.6, 0, { contorno: true });
  kb.cx(TAM, 2.3, TAM, mTerra, 0, -2.6, 0, { contorno: true });
  kb.cx(TAM - 1.2, 1.6, TAM - 1.2, mPedra, 0, -4.2, 0, { contorno: true });
  kb.cx(TAM - 3.6, 1.4, TAM - 3.6, mPedra, 0, -5.6, 0, { cor: 0xd8d8d8, contorno: true });
  kb.cx(TAM - 7.5, 1.3, TAM - 7.5, mPedra, 0, -6.9, 0, { cor: 0xc0c0c0, contorno: true });
  kb.cx(8, 1.4, 8, mPedra, 0.5, -8.3, -0.5, { cor: 0xb0b0b0, contorno: true });
  // Blocos salientes e pedras nas laterais visíveis (+x e +z)
  for (let i = 0; i < 18; i++) {
    const s = -METADE + 1 + aleatorio() * (TAM - 2);
    const lado = i % 2;
    const y = -0.9 - aleatorio() * 3.2;
    const w = 0.8 + aleatorio() * 1.6;
    const h = 0.5 + aleatorio() * 0.9;
    const pedra = y < -2.6;
    const [x, z] = lado ? [METADE + 0.12, s] : [s, METADE + 0.12];
    kb.cx(lado ? 0.4 : w, h, lado ? w : 0.4, pedra ? mPedra : mTerra, x, y, z, { cor: pedra ? 0xd0d0d0 : 0xc8c8c8 });
  }
  // Raízes penduradas logo abaixo da grama
  const raizes = construtor();
  for (let i = 0; i < 26; i++) {
    const s = -METADE + 0.5 + aleatorio() * (TAM - 1);
    const lado = i % 2;
    const h = 0.4 + aleatorio() * 0.9;
    const [x, z] = lado ? [METADE + 0.04, s] : [s, METADE + 0.04];
    raizes.cx(0.08, h, 0.08, i % 3 ? 0x6e4222 : 0x4f9a3a, x, -0.3 - h, z);
  }
  kb.montar(terreno, { sombra: false });
  raizes.montar(terreno, { sombra: false });
  const labio = new THREE.Mesh(new THREE.BoxGeometry(TAM + 0.02, 0.3, TAM + 0.02).translate(0, -0.21, 0), labioMat);
  terreno.add(labio);

  // ---------- Lago com píer, taboas e pedras na margem ----------
  const aguaTex = agua({ base: 0xe8f4ff });
  const aguaMat = new THREE.MeshLambertMaterial({ map: aguaTex, vertexColors: true, color: 0x3f8fd6 });
  const aguaM = malhaTiles(tilesAgua, aguaMat, -0.04);
  aguaM.pintar((t, c) => c.setHex(0xffffff));
  const kl = construtor();
  const kVitoria = construtor();
  [0.8, 2.0, 3.4, 4.6, 5.7].map((a, i) => naMargem(a, i % 2 ? 0.45 : 0.62)).forEach(([x, z], i) => {
    kVitoria.peca(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 8), 0x4f9a3a, { pos: [x, 0.0, z] });
    if (i % 2 === 0) kVitoria.cx(0.14, 0.1, 0.14, 0xf08ab8, x + 0.1, 0.02, z - 0.05);
  });
  // Píer de madeira entrando no lago pela margem da frente
  const mDeck = matTex(tabuasDeck({ base: 0xb87a42 }));
  // Píer saindo da margem da frente (+z)
  let frente = 0;
  while (distLago(LAGO.x, LAGO.z + frente) < LAGO.r) frente += 0.05;
  const px = LAGO.x + 0.2;
  const pz = LAGO.z + frente - 0.7;
  kl.cx(1.1, 0.1, 2.8, mDeck, px, 0.08, pz, { contorno: true });
  [[-0.5, -1.2], [0.5, -1.2], [-0.5, -0.1], [0.5, -0.1]].forEach(([x, z]) => kl.cx(0.14, 0.4, 0.14, 0x6e4222, px + x, -0.2, pz + z));
  kl.cx(0.18, 0.5, 0.18, 0x6e4222, px - 0.5, 0, pz - 1.35);
  // Taboas e pedras na beira
  [2.3, 2.9, 4.1, 5.5, 0.4].map((a) => naMargem(a, 0.97)).forEach(([x, z], i) => {
    for (let j = 0; j < 3; j++) {
      const h = 0.6 + ((i + j) % 3) * 0.15;
      kl.cx(0.05, h, 0.05, 0x4f9a3a, x + j * 0.12, 0, z + (j % 2) * 0.1);
      kl.cx(0.09, 0.2, 0.09, 0x7a4a26, x + j * 0.12, h - 0.1, z + (j % 2) * 0.1);
    }
  });
  const mRocha = matTex(rocha({ base: 0xc8c8c8 }));
  [[0.3, 0.3], [1.9, 0.35], [3.6, 0.25], [5.0, 0.28], [3.0, 0.22]].map(([a, r]) => [...naMargem(a, 1.18), r]).forEach(([x, z, r], i) => {
    kl.peca(geoRocha(r, 200 + i), mRocha, { cor: 0xa4a7ab, pos: [x, r * 0.4, z] });
  });
  const lagoG = grupo(0, 0, aguaM.mesh);
  kl.montar(lagoG);
  const vitorias = [...kVitoria.montar(lagoG, { sombra: false }).values()];
  const peixe = new THREE.Group();
  const kp = construtor();
  kp.cx(0.45, 0.22, 0.18, 0xe8833a, 0, -0.11, 0);
  kp.cx(0.14, 0.2, 0.06, 0xd8603a, -0.28, -0.1, 0);
  kp.cx(0.06, 0.06, 0.2, 0x1a1410, 0.14, 0, 0);
  kp.montar(peixe, { sombra: false });
  peixe.visible = false;
  lagoG.add(peixe);
  clicavel(lagoG, 'fishing');

  // ---------- Cercas no estilo de Stardew, com portão no caminho ----------
  const kc = construtor();
  const B = METADE - 0.4;
  // Cerca dando a volta completa na fazenda, com portão na frente
  cerca(kc, [-B, B], [-6.3, B]);
  cerca(kc, [-4.7, B], [B, B]);
  cerca(kc, [B, B], [B, -B]);
  cerca(kc, [B, -B], [-B, -B]);
  cerca(kc, [-B, -B], [-B, B]);
  // Postes do portão, mais altos e com lanterninha
  [-6.3, -4.7].forEach((x) => {
    kc.cx(0.3, 1.25, 0.3, 0x6e4222, x, 0, B, { contorno: true });
    kc.cx(0.38, 0.1, 0.38, 0x8a5a2b, x, 1.25, B);
  });
  kc.cx(1.9, 0.14, 0.14, 0x8a5a2b, -5.5, 1.1, B);
  // Placa da fazenda sobre o portão
  kc.cx(1.2, 0.36, 0.08, 0xc68b4e, -5.5, 1.3, B, { contorno: true });
  kc.cx(0.8, 0.06, 0.09, 0x5b3a1e, -5.5, 1.48, B);
  kc.cx(0.6, 0.06, 0.09, 0x5b3a1e, -5.5, 1.38, B);

  // ---------- Árvores: carvalhos em camadas e pinheiros ----------
  const folhaMat = new THREE.MeshLambertMaterial({ map: grama({ base: 0xf4f4f4 }), vertexColors: true, color: 0x6ec24a });
  const pinhoMat = new THREE.MeshLambertMaterial({ map: grama({ base: 0xf4f4f4 }), vertexColors: true, color: PINHO.spring });
  const mCasca = matTex(tabuasVerticais({ base: 0x7a4a26, larg: 2 }));
  const kTronco = construtor();
  const arvores = [];
  function carvalho(x, z, s) {
    kTronco.cx(0.5 * s, 1.3 * s, 0.5 * s, mCasca, x, 0, z, { contorno: true });
    kTronco.cx(0.8 * s, 0.18 * s, 0.24 * s, mCasca, x, 0, z, { cor: 0xc0c0c0 });
    kTronco.cx(0.24 * s, 0.18 * s, 0.8 * s, mCasca, x, 0, z, { cor: 0xc0c0c0 });
    const k = construtor();
    const kFlor = construtor();
    const kNeve = construtor();
    const c = (w, h, d, cor, cx, cy, cz, contorno = true) => k.cx(w * s, h * s, d * s, folhaMat, cx * s, cy * s, cz * s, { cor, contorno });
    c(2.0, 0.6, 2.0, SOMBRA, 0, 0, 0);
    c(2.4, 0.9, 1.8, MEIO, 0, 0.45, 0);
    c(1.8, 0.9, 2.4, MEIO, 0, 0.45, 0);
    c(1.7, 0.6, 1.7, LUZ, 0, 1.3, 0);
    c(0.9, 0.35, 0.9, LUZ, 0, 1.85, 0, false);
    c(0.7, 0.6, 0.7, MEIO, 1.15, 0.3, 0.55, false);
    c(0.6, 0.5, 0.6, SOMBRA, -0.95, 0.2, 0.9, false);
    c(0.6, 0.5, 0.6, MEIO, 0.5, 0.9, -1.15, false);
    [[0.9, 0.95, 0.92], [-0.6, 0.7, 0.95], [1.22, 0.55, -0.4], [-0.3, 1.55, 0.86], [0.2, 0.6, 1.24], [-1.22, 1.0, 0.1]].forEach(([fx, fy, fz], i) => {
      kFlor.cx(0.2 * s, 0.2 * s, 0.2 * s, i % 3 ? 0xf7b6d2 : 0xfff4e0, fx * s, fy * s, fz * s);
    });
    kNeve.cx(1.8 * s, 0.18 * s, 1.8 * s, 0xf6fafc, 0, 1.9 * s, 0);
    kNeve.cx(1.0 * s, 0.16 * s, 1.0 * s, 0xf6fafc, 0, 2.2 * s, 0);
    kNeve.cx(2.0 * s, 0.14 * s, 1.0 * s, 0xf6fafc, 0, 1.35 * s, 0.75 * s);
    return { k, kFlor, kNeve, alt: 1.15 * s };
  }
  function pinheiro(x, z, s) {
    kTronco.cx(0.36 * s, 0.7 * s, 0.36 * s, mCasca, x, 0, z, { contorno: true });
    const k = construtor();
    const kNeve = construtor();
    [[2.1, 0], [1.7, 0.6], [1.3, 1.2], [0.85, 1.75], [0.42, 2.2]].forEach(([w, y], i) => {
      const cor = [SOMBRA, MEIO, MEIO, LUZ, LUZ][i];
      k.peca(new THREE.BoxGeometry(w * s, 0.62 * s, w * s), pinhoMat, { cor, rot: new THREE.Euler(0, i % 2 ? Math.PI / 4 : 0, 0), pos: [0, (y + 0.31) * s, 0], contorno: true });
      kNeve.peca(new THREE.BoxGeometry(w * 0.82 * s, 0.1 * s, w * 0.82 * s), 0xf6fafc, { rot: new THREE.Euler(0, i % 2 ? Math.PI / 4 : 0, 0), pos: [0, (y + 0.64) * s, 0] });
    });
    return { k, kFlor: null, kNeve, alt: 0.6 * s };
  }
  [
    [-12.6, -12.5, 1.0, 'p'], [-8.4, -12.4, 1.0, 'c'], [-4.8, -12.8, 1.0, 'p'], [3.6, -12.8, 0.8, 'c'], [-8.2, 12.4, 1.0, 'c'],
    [12.6, -4.2, 1.05, 'c'], [12.6, 12.6, 0.8, 'p'], [-3.4, 12.6, 0.85, 'p'], [-2.8, 10.8, 0.85, 'c'], [12.4, 1.2, 1.05, 'c'],
    [9.8, 3.6, 0.85, 'p'], [10.0, 9.0, 1.0, 'c'], [-12.6, 11.8, 0.85, 'p'],
  ].forEach(([x, z, s, tipo]) => {
    const a = (tipo === 'p' ? pinheiro : carvalho)(x, z, s);
    const g = grupo(x, z);
    const copa = new THREE.Group();
    copa.position.y = a.alt;
    g.add(copa);
    a.k.montar(copa);
    const flores = a.kFlor ? [...a.kFlor.montar(copa, { sombra: false }).values()] : [];
    const neve = [...a.kNeve.montar(copa, { sombra: false }).values()];
    arvores.push({ copa, flores, neve, fase: aleatorio() * 6 });
  });

  // ---------- Arbustos, tocos, barris, caixotes, pedras e galhos ----------
  const kd = construtor();
  const kFrutinhas = construtor();
  [[-9.6, -3.3], [-3.2, 6.6], [-6.8, 10.6], [8.0, -3.4], [11.6, 6.4], [0.4, 12.6], [-3.4, -8.6], [6.8, -12.6], [12.4, 9.6], [7.9, 12.6]]
    .forEach(([x, z], i) => {
      kd.cx(0.95, 0.5, 0.8, folhaMat, x, 0, z, { cor: SOMBRA, contorno: true });
      kd.cx(0.7, 0.35, 0.95, folhaMat, x, 0.1, z, { cor: MEIO, contorno: true });
      kd.cx(0.55, 0.25, 0.55, folhaMat, x, 0.45, z, { cor: LUZ });
      [[0.3, 0.42, 0.3], [-0.25, 0.3, 0.38], [0.1, 0.62, -0.2]].forEach(([dx, dy, dz]) => {
        kFrutinhas.cx(0.1, 0.1, 0.1, i % 2 ? 0xd8343b : 0x5b6fd6, x + dx, dy, z + dz);
      });
    });
  // Tocos cortados
  [[-12.8, -7.0], [8.0, 10.8], [-1.6, 4.0], [-7.6, -10.6]].forEach(([x, z]) => {
    kd.peca(new THREE.CylinderGeometry(0.32, 0.38, 0.4, 8), mCasca, { pos: [x, 0.2, z], uv: true, contorno: true });
    kd.peca(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 8), 0xd8a870, { pos: [x, 0.41, z] });
    kd.peca(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 8), 0xb88a50, { pos: [x, 0.415, z] });
  });
  // Barris e caixotes perto da casa e do celeiro
  const mCaixote = matTex(tabuasDeck({ base: 0xc68b4e }));
  const barril = (x, z) => {
    kd.peca(new THREE.CylinderGeometry(0.32, 0.32, 0.75, 10), mCaixote, { cor: 0xd8b090, pos: [x, 0.375, z], contorno: true });
    [0.15, 0.6].forEach((y) => kd.peca(new THREE.CylinderGeometry(0.335, 0.335, 0.07, 10), 0x4a4e55, { pos: [x, y, z] }));
    kd.peca(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 10), 0x8a5a2b, { pos: [x, 0.76, z] });
  };
  const caixote = (x, y, z, s = 0.6) => {
    kd.cx(s, s, s, mCaixote, x, y, z, { contorno: true });
    kd.cx(s + 0.02, 0.06, 0.06, 0x7a4a26, x, y + s / 2 - 0.03, z + s / 2 - 0.02);
    kd.cx(0.06, s + 0.02, 0.06, 0x7a4a26, x, y, z + s / 2 - 0.02);
  };
  barril(-9.1, -2.9);
  barril(-9.7, -2.4);
  caixote(-8.9, 0, -1.9);
  caixote(-8.9, 0.6, -1.9, 0.45);
  barril(-8.5, 2.4);
  caixote(-8.5, 0, 3.4);
  caixote(-8.5, 0.6, 3.4, 0.45);
  // Pedras e galhos espalhados pela grama
  const kPedras = construtor();
  for (let i = 0, n = 0; i < 300 && n < 22; i++) {
    const x = (aleatorio() - 0.5) * (TAM - 2);
    const z = (aleatorio() - 0.5) * (TAM - 2);
    if (!livre(x, z, 1.2)) continue;
    n++;
    if (n % 3 === 0) {
      kPedras.peca(new THREE.BoxGeometry(0.6, 0.06, 0.07), 0x7a4a26, { rot: new THREE.Euler(0, aleatorio() * 3, 0), pos: [x, 0.03, z] });
      kPedras.peca(new THREE.BoxGeometry(0.22, 0.05, 0.06), 0x7a4a26, { rot: new THREE.Euler(0, aleatorio() * 3, 0), pos: [x + 0.15, 0.03, z + 0.08] });
    } else {
      const r = 0.12 + aleatorio() * 0.18;
      kPedras.peca(geoRocha(r, 300 + i), mRocha, { cor: n % 2 ? 0xa4a7ab : 0x8a8d92, pos: [x, r * 0.3, z] });
    }
  }
  const decoracao = grupo(0, 0);
  kd.montar(decoracao);
  kc.montar(decoracao);
  kTronco.montar(decoracao);
  kPedras.montar(decoracao);
  const frutinhas = [...kFrutinhas.montar(decoracao, { sombra: false }).values()];

  // ---------- Postes de luz com lanterna ----------
  const kl2 = construtor();
  const luzesPoste = [[-4.4, 1.6], [-4.4, 9.4]].map(([x, z]) => {
    kl2.cx(0.3, 0.2, 0.3, 0x3b3f45, x, 0, z);
    kl2.cx(0.12, 2.1, 0.12, 0x3b3f45, x, 0.2, z, { contorno: true });
    kl2.cx(0.5, 0.08, 0.08, 0x3b3f45, x - 0.2, 2.2, z);
    kl2.cx(0.34, 0.42, 0.34, lanternaMat, x - 0.38, 1.72, z);
    kl2.cx(0.42, 0.08, 0.42, 0x3b3f45, x - 0.38, 2.14, z);
    kl2.cx(0.4, 0.06, 0.4, 0x3b3f45, x - 0.38, 1.68, z);
    kl2.cx(0.12, 0.08, 0.12, 0xf2c230, x - 0.38, 2.22, z);
    const luz = new THREE.PointLight(0xffc870, 0, 9, 1.6);
    luz.position.set(x - 0.38, 2.0, z);
    cena.add(luz);
    return luz;
  });
  kl2.montar(decoracao);

  // ---------- Palmeira com noz dourada (nozes) ----------
  const kPalma = construtor();
  const kFolhaPalma = construtor();
  for (let i = 0; i < 6; i++) {
    const off = Math.sin(i * 0.5) * 0.25;
    kPalma.cx(0.42 - i * 0.02, 0.62, 0.42 - i * 0.02, i % 2 ? 0x9a6a3a : 0x8a5a2b, off, i * 0.62, 0, { contorno: true });
    kPalma.cx(0.46 - i * 0.02, 0.08, 0.46 - i * 0.02, 0x6e4222, off, i * 0.62 + 0.54, 0);
  }
  const topoPalma = [Math.sin(5 * 0.5) * 0.25, 3.75];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const rot = new THREE.Euler(0, -a, 0);
    const g1 = new THREE.BoxGeometry(1.0, 0.08, 0.36).translate(0.5, 0, 0).rotateZ(0.25);
    const g2 = new THREE.BoxGeometry(0.8, 0.07, 0.3).translate(0.4, 0, 0).rotateZ(-0.6).translate(0.95, 0.24, 0);
    [g1, g2].forEach((g, j) => kFolhaPalma.peca(g, j ? 0x4fa33a : 0x3f8f2f, { rot, pos: [topoPalma[0], topoPalma[1], 0] }));
  }
  [[0.18, 0.1], [-0.12, 0.16], [0.04, -0.18]].forEach(([dx, dz]) => kPalma.cx(0.2, 0.2, 0.2, 0x6e4222, topoPalma[0] + dx, topoPalma[1] - 0.25, dz));
  const nozMat = new THREE.MeshLambertMaterial({ color: 0xf2c230, emissive: 0x6a4a00 });
  const noz = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.46, 0.4), nozMat);
  noz.position.set(0.7, 0.25, 0.7);
  noz.castShadow = true;
  noz.userData.semFantasma = true;
  const palmeira = grupo(-10.5, 11.3, noz);
  kPalma.montar(palmeira);
  kFolhaPalma.montar(palmeira);
  clicavel(palmeira, 'walnuts');

  // ---------- Moinho ----------
  const km = construtor();
  const mTorre = matTex(tabuasVerticais({ base: 0xe8c98d }));
  km.cx(2.5, 0.5, 2.5, matTex(tijolos({ base: 0x9a958c })), 0, 0, 0, { contorno: true });
  km.cx(2.1, 3.2, 2.1, mTorre, 0, 0.5, 0, { contorno: true });
  km.cx(2.3, 0.2, 2.3, 0x8a5a2b, 0, 3.7, 0);
  km.peca(new THREE.ConeGeometry(1.9, 1.7, 4), matTex(telhas({ base: 0x8a5a2b })), { rot: new THREE.Euler(0, Math.PI / 4, 0), pos: [0, 4.75, 0], contorno: true });
  km.cx(0.7, 1.15, 0.08, 0x5b3a1e, 0.3, 0.5, 1.06);
  km.cx(0.08, 0.08, 0.1, 0xf2c230, 0.5, 1.05, 1.1);
  km.cx(0.55, 0.55, 0.08, u.janelaMat, -0.4, 2.3, 1.06);
  km.cx(0.7, 0.08, 0.12, 0x5b3a1e, -0.4, 2.2, 1.08);
  km.cx(0.08, 0.55, 0.06, 0x5b3a1e, -0.4, 2.3, 1.1);
  km.cx(0.35, 0.35, 0.3, 0x5b3a1e, 0, 4.0, 1.2);
  // À esquerda da casa e mais para o fundo, para não ficar escondido atrás do telhado
  const moinho = grupo(-11.8, -9.6);
  km.montar(moinho);
  const pas = new THREE.Group();
  pas.position.set(0, 4.17, 1.42);
  const kPas = construtor();
  for (let i = 0; i < 4; i++) {
    const rot = new THREE.Euler(0, 0, (i * Math.PI) / 2);
    kPas.peca(new THREE.BoxGeometry(0.12, 2.5, 0.08).translate(0, 1.25, 0), 0x6e4222, { rot });
    kPas.peca(new THREE.BoxGeometry(0.55, 1.9, 0.04).translate(0.33, 1.4, 0.02), 0xf3ddb0, { rot });
    [0.7, 1.3, 1.9].forEach((y) => kPas.peca(new THREE.BoxGeometry(0.62, 0.05, 0.06).translate(0.33, y, 0.05), 0x8a5a2b, { rot }));
  }
  kPas.cx(0.3, 0.3, 0.2, 0x5b3a1e, 0, -0.15, 0.05);
  kPas.montar(pas);
  moinho.add(pas);

  // ---------- Flores e tufos ----------
  const m4 = new THREE.Matrix4();
  const cor = new THREE.Color();
  const pontosFlor = [];
  for (let i = 0; i < 700 && pontosFlor.length < 120; i++) {
    const x = (aleatorio() - 0.5) * (TAM - 2);
    const z = (aleatorio() - 0.5) * (TAM - 2);
    if (livre(x, z)) pontosFlor.push([x, z]);
  }
  const kFlor = construtor();
  kFlor.cx(0.05, 0.2, 0.05, 0xffffff, 0, 0, 0);
  kFlor.cx(0.22, 0.08, 0.08, 0xffffff, 0, 0.2, 0);
  kFlor.cx(0.08, 0.08, 0.22, 0xffffff, 0, 0.2, 0);
  const flores = new THREE.InstancedMesh(kFlor.juntar(), new THREE.MeshLambertMaterial({ vertexColors: true }), pontosFlor.length);
  pontosFlor.forEach(([x, z], i) => flores.setMatrixAt(i, m4.makeRotationY(i).setPosition(x, 0, z)));
  cena.add(flores);
  const N_TUFOS = 190;
  const kTufo = construtor();
  kTufo.cx(0.06, 0.3, 0.06, 0xffffff, 0, 0, 0);
  kTufo.peca(new THREE.BoxGeometry(0.05, 0.24, 0.05), 0xffffff, { rot: new THREE.Euler(0, 0, 0.4), pos: [0.06, 0.1, 0.02] });
  kTufo.peca(new THREE.BoxGeometry(0.05, 0.22, 0.05), 0xffffff, { rot: new THREE.Euler(0.4, 0, -0.3), pos: [-0.05, 0.1, -0.04] });
  const tufos = new THREE.InstancedMesh(kTufo.juntar(), new THREE.MeshLambertMaterial({ vertexColors: true }), N_TUFOS);
  for (let i = 0, n = 0; n < N_TUFOS && i < 800; i++) {
    const x = (aleatorio() - 0.5) * (TAM - 1);
    const z = (aleatorio() - 0.5) * (TAM - 1);
    if (!livre(x, z, 0.4)) continue;
    tufos.setMatrixAt(n++, m4.makeRotationY(i).setPosition(x, 0, z));
  }
  cena.add(tufos);

  // ---------- Estação, luz e animação ----------
  let estacao = 'spring';
  function definirEstacao(e, p) {
    estacao = e;
    chao.pintar((t, c) => c.setHex(p.grama[t.v]));
    areia.pintar((t, c) => c.setHex(p.areia).offsetHSL(0, 0, t.v % 2 ? -0.03 : 0));
    caminho.pintar((t, c) => c.setHex(COR_CAMINHO[e]).offsetHSL(0, 0, ((t.v ?? 1) - 1.5) * 0.03));
    labioMat.color.setHex(p.grama[3]).offsetHSL(0, 0, -0.05);
    folhaMat.color.setHex(p.folhas[0]);
    pinhoMat.color.setHex(PINHO[e]);
    arvores.forEach((a) => {
      a.flores.forEach((f) => { f.visible = p.flor; });
      a.neve.forEach((n) => { n.visible = e === 'winter'; });
    });
    frutinhas.forEach((f) => { f.visible = e === 'summer' || e === 'fall'; });
    flores.visible = p.flores.length > 0;
    pontosFlor.forEach((_, i) => flores.setColorAt(i, cor.setHex(p.flores[i % Math.max(1, p.flores.length)] ?? 0xffffff)));
    if (flores.instanceColor) flores.instanceColor.needsUpdate = true;
    for (let i = 0; i < N_TUFOS; i++) tufos.setColorAt(i, cor.setHex(p.grama[3]).offsetHSL(0, 0, -0.1 + (i % 3) * 0.04));
    if (tufos.instanceColor) tufos.instanceColor.needsUpdate = true;
    tufos.visible = e !== 'winter';
    vitorias.forEach((v) => { v.visible = e !== 'winter'; });
    aguaMat.color.setHex(p.agua[0]);
    if (e === 'winter') peixe.visible = false;
  }
  function definirLuz(noite) {
    luzesPoste.forEach((l) => { l.intensity = noite ? 18 : 0; });
  }

  let saltoPeixe = 3;
  function animar(t, dt) {
    arvores.forEach((a) => {
      a.copa.rotation.z = Math.sin(t * 0.9 + a.fase) * 0.025;
      a.copa.rotation.x = Math.cos(t * 0.7 + a.fase) * 0.02;
    });
    pas.rotation.z -= dt * 0.8;
    noz.position.y = 0.25 + Math.abs(Math.sin(t * 1.5)) * 0.08;
    if (estacao !== 'winter') {
      aguaTex.offset.set(Math.sin(t * 0.3) * 0.06, t * 0.02);
      vitorias.forEach((v, i) => { v.position.y = Math.sin(t * 1.4 + i) * 0.015; });
      // Peixe pulando
      saltoPeixe -= dt;
      if (saltoPeixe <= 0) {
        const fase = -saltoPeixe / 0.8;
        peixe.visible = true;
        peixe.position.set(LAGO.x - 1 + fase * 2, 0.1 + Math.sin(fase * Math.PI) * 1.4, LAGO.z - 0.6);
        peixe.rotation.z = (0.5 - fase) * 2;
        if (fase >= 1) {
          peixe.visible = false;
          saltoPeixe = 4 + aleatorio() * 5;
        }
      }
    }
  }

  return { definirEstacao, definirLuz, animar };
}
