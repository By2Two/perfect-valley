import * as THREE from 'three';
import { nivelFazendeiro } from '../data.js';
import { criarUtil } from './util.js';
import { construirCenario } from './assets/cenario.js';
import { construirCasa } from './assets/casa.js';
import { construirCeleiro } from './assets/celeiro.js';
import { construirMina } from './assets/mina.js';
import { construirLavoura } from './assets/irrigadores.js';
import { construirObeliscos } from './assets/obeliscos.js';
import { construirRelogio } from './assets/relogio.js';

// Paletas por estação
const PALETAS = {
  spring: {
    grama: [0x7cc444, 0x72bb3c, 0x86cc4e, 0x6daa2c], caminho: 0xc9a26b, solo: [0x7a4a26, 0x6e4222], areia: 0xd9c48a,
    folhas: [0x6ec24a, 0x8ad35c], flores: [0xf08ab8, 0xfff4e0, 0xf2c230, 0x7fb6f0], plantas: [0xf3f0dc, 0xe8d06a, 0x9ad04f, 0xf08ab8],
    agua: [0x3f8fd6, 0x56a3e2], particula: { cor: 0xffb7d5, qtd: 70, vel: 0.9 }, flor: true, vagalumes: true, borboletas: true,
  },
  summer: {
    grama: [0x5fa832, 0x56a02c, 0x68b038, 0x4f9628], caminho: 0xc9a26b, solo: [0x7a4a26, 0x6e4222], areia: 0xe0cb8e,
    folhas: [0x3f8f2f, 0x4fa33a], flores: [0xd8343b, 0xf2c230, 0xfff4e0, 0xe8833a], plantas: [0xd8343b, 0xf2c230, 0xe8833a, 0x5b6fd6],
    agua: [0x3a8bd4, 0x4fa0e0], particula: null, flor: false, vagalumes: true, borboletas: true,
  },
  fall: {
    grama: [0xa59b44, 0x968e3c, 0xb0a54c, 0x8b8436], caminho: 0xc29a62, solo: [0x7a4a26, 0x6e4222], areia: 0xd2bb82,
    folhas: [0xd9822b, 0xe0a43a, 0xc0442e], flores: [0xe8833a, 0x9b4fc4, 0xf2c230], plantas: [0xe8833a, 0x9b4fc4, 0xf2c230, 0xc0442e],
    agua: [0x3c7fbf, 0x4b8fcc], particula: { cor: 0xe8833a, qtd: 60, vel: 1.1 }, flor: false, vagalumes: true, borboletas: false,
  },
  winter: {
    grama: [0xeef4f8, 0xe4edf3, 0xf6fafc, 0xdde8ef], caminho: 0xd6cfc4, solo: [0xd2c8bd, 0xc9beb2], areia: 0xe2e8ec,
    folhas: [0x2f6b3a, 0x3a7a45], flores: [], plantas: [],
    agua: [0xbfe3f2, 0xd3edf7], particula: { cor: 0xffffff, qtd: 160, vel: 1.6 }, flor: false, vagalumes: false, borboletas: false,
  },
};

/**
 * Orquestra a fazenda: cada parte do mundo vive num módulo de `assets/` e expõe
 * funções de estação, luz e animação; aqui ficam as luzes, as partículas e o estado.
 */
export function construirFazenda(cena) {
  const u = criarUtil(cena);
  const { caixa, grupo, clicaveis, aleatorio } = u;

  // ---------- Luzes ----------
  const hemi = new THREE.HemisphereLight(0xe8f6ff, 0x6a7a3a, 1.2);
  const sol = new THREE.DirectionalLight(0xfff1d6, 2.4);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  Object.assign(sol.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 100 });
  sol.shadow.bias = -0.002;
  sol.shadow.normalBias = 0.05;
  cena.add(hemi, sol, sol.target);

  // ---------- Partes do mundo ----------
  // Lavoura 6×9 à direita da casa, em frente aos obeliscos, comprida em direção ao lago
  const campo = { x0: 0, x1: 6, z0: -8.8, z1: 0.2 };
  const cenario = construirCenario(u, { campo });
  const casa = construirCasa(u);
  const { chamine } = casa;
  const celeiro = construirCeleiro(u);
  const lavoura = construirLavoura(u, campo);
  const mina = construirMina(u);
  const obeliscos = construirObeliscos(u);
  const relogio = construirRelogio(u);

  // ---------- Partículas ----------
  function nuvemDePontos(qtd, tamanho, corInicial, transparente = true) {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(qtd * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const material = new THREE.PointsMaterial({ color: corInicial, size: tamanho, sizeAttenuation: false, transparent: transparente });
    const pts = new THREE.Points(geo, material);
    pts.frustumCulled = false;
    cena.add(pts);
    return { pts, arr, geo, material, base: Array.from({ length: qtd }, () => [aleatorio(), aleatorio(), aleatorio(), aleatorio() * 6]) };
  }
  const queda = nuvemDePontos(160, 2, 0xffffff);
  const vagalumes = nuvemDePontos(40, 2, 0xfff27a);
  const fumaca = Array.from({ length: 8 }, (_, i) => {
    const m = caixa(0.4, 0.4, 0.4, new THREE.MeshLambertMaterial({ color: 0xd8d8d8, transparent: true, opacity: 0.7 }));
    m.castShadow = false;
    m.userData.t = i / 8;
    cena.add(m);
    return m;
  });
  const borboletas = Array.from({ length: 6 }, (_, i) => {
    const corAsa = [0xf2c230, 0xffffff, 0xf08ab8][i % 3];
    const asaE = caixa(0.22, 0.03, 0.18, corAsa, -0.11);
    const asaD = caixa(0.22, 0.03, 0.18, corAsa, 0.11);
    const g = grupo(0, 0, asaE, asaD);
    g.userData = { asaE, asaD, fase: aleatorio() * 10, cx: (aleatorio() - 0.5) * 18, cz: (aleatorio() - 0.5) * 18 };
    return g;
  });
  const passaros = grupo(0, 0, ...[[0, 0], [-0.8, -0.6], [-0.8, 0.6]].map(([dx, dz]) => caixa(0.4, 0.08, 0.15, 0x3b2410, dx, 0, dz)));
  passaros.visible = false;
  let proximoBando = 6;

  // ---------- Estado ----------
  let paleta = PALETAS.spring;

  function definirEstacao(e) {
    const estacao = PALETAS[e] ? e : 'spring';
    paleta = PALETAS[estacao];
    cenario.definirEstacao(estacao, paleta);
    casa.definirEstacao(estacao);
    celeiro.definirEstacao(estacao);
    mina.definirEstacao(estacao);
    lavoura.definirEstacao(estacao, paleta);
    queda.pts.visible = Boolean(paleta.particula);
    if (paleta.particula) queda.material.color.setHex(paleta.particula.cor);
  }

  function atualizarProgresso(s) {
    obeliscos.definirConstruidos(s.obeliscos);
    relogio.definirConstruido(s.relogio);
    lavoura.definirCrescimento(0.25 + 0.75 * (nivelFazendeiro(s) / 25));
  }

  /** luz: 0 = noite, 1 = meio-dia */
  function definirLuz(luz, solAng) {
    sol.position.set(Math.cos(solAng) * -30, Math.sin(solAng) * 30 + 8, 18);
    sol.intensity = 0.45 + 2.1 * luz;
    sol.color.setHex(luz > 0.3 ? 0xfff1d6 : 0xa9b8ff);
    hemi.intensity = 0.5 + 0.8 * luz;
    const noite = luz < 0.35;
    u.definirLuzJanelas(noite);
    mina.definirLuz(noite);
    cenario.definirLuz(noite);
    vagalumes.pts.visible = noite && paleta.vagalumes;
    return noite;
  }

  function animar(t, dt, mover, noite) {
    lavoura.animar(t, dt, mover);
    if (!mover) return;

    cenario.animar(t, dt);
    celeiro.animar(t, dt);
    obeliscos.animar(t);
    relogio.animar(t, dt);

    // Fumaça da chaminé
    fumaca.forEach((f) => {
      f.userData.t = (f.userData.t + dt * 0.18) % 1;
      const k = f.userData.t;
      f.position.set(chamine.x + Math.sin(k * 6 + t) * 0.3 * k, chamine.y + k * 4, chamine.z - k * 1.2);
      f.scale.setScalar(0.3 + k * 0.7);
      f.material.opacity = 0.65 * (1 - k);
    });

    // Pétalas, folhas ou neve
    if (queda.pts.visible) {
      const { vel, qtd } = paleta.particula;
      queda.base.forEach((b, i) => {
        if (i >= qtd) { queda.arr[i * 3 + 1] = -50; return; }
        const y = 14 - ((t * vel * 0.6 + b[1] * 14) % 14);
        queda.arr[i * 3] = (b[0] - 0.5) * 30 + Math.sin(t * 0.8 + b[3]) * 1.2;
        queda.arr[i * 3 + 1] = y;
        queda.arr[i * 3 + 2] = (b[2] - 0.5) * 30 + Math.cos(t * 0.6 + b[3]) * 1.2;
      });
      queda.geo.attributes.position.needsUpdate = true;
    }
    if (vagalumes.pts.visible) {
      vagalumes.base.forEach((b, i) => {
        vagalumes.arr[i * 3] = (b[0] - 0.5) * 22 + Math.sin(t * 0.6 + b[3]) * 0.8;
        vagalumes.arr[i * 3 + 1] = 0.5 + b[1] * 2.5 + Math.sin(t * 1.3 + b[3] * 2) * 0.4;
        vagalumes.arr[i * 3 + 2] = (b[2] - 0.5) * 22 + Math.cos(t * 0.5 + b[3]) * 0.8;
      });
      vagalumes.geo.attributes.position.needsUpdate = true;
      vagalumes.material.opacity = 0.6 + Math.sin(t * 4) * 0.4;
    }

    // Borboletas de dia, nas estações quentes
    const comBorboletas = paleta.borboletas && !noite;
    borboletas.forEach((b) => {
      b.visible = comBorboletas;
      if (!comBorboletas) return;
      const d = b.userData;
      const k = t * 0.35 + d.fase;
      b.position.set(d.cx + Math.sin(k) * 2.5, 1 + Math.sin(k * 2.3) * 0.4, d.cz + Math.sin(k * 1.7) * 2);
      b.rotation.y = Math.atan2(Math.cos(k) * 2.5, Math.cos(k * 1.7) * 3.4);
      const asa = Math.sin(t * 22 + d.fase) * 0.9;
      d.asaE.rotation.z = asa;
      d.asaD.rotation.z = -asa;
    });

    // Bando de pássaros cruzando o céu
    proximoBando -= dt;
    if (!noite && proximoBando <= 0) {
      const k = -proximoBando / 9;
      passaros.visible = true;
      passaros.position.set(-26 + k * 52, 11 + Math.sin(k * 8) * 0.4, 6 - k * 14);
      passaros.rotation.y = Math.atan2(52, -14);
      passaros.children.forEach((p, i) => { p.rotation.z = Math.sin(t * 10 + i) * 0.5; });
      if (k >= 1) {
        passaros.visible = false;
        proximoBando = 14 + aleatorio() * 16;
      }
    }
  }

  definirEstacao('spring');
  return { clicaveis, definirEstacao, atualizarProgresso, definirLuz, definirHora: relogio.definirHora, animar };
}
