import * as THREE from 'three';
import { terra } from '../texturas.js';

// Lavoura 6×9: um irrigador no centro de cada quadrante 3×3 (índices de tile), cada um molhando os 8 vizinhos
const IRRIGADORES = [[1, 1], [4, 1], [1, 4], [4, 4], [1, 7], [4, 7]];
const VIZINHOS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const GOTAS_POR_TILE = 4;
const RESPINGOS_POR_TILE = 4;
const VOO = 0.6;
const COR_MOLHADA = new THREE.Color(0x3e2412);
const FOLHAS = [0x3f8f2f, 0x5fae3a, 0x8ad35c];

/** Cultivo em moita: folhas em camadas abertas para fora */
function plantaMoita(k) {
  k.cx(0.08, 0.35, 0.08, FOLHAS[0], 0, 0, 0);
  [[0.12, 0.34, 0.5, 0, FOLHAS[0]], [0.3, 0.28, 0.75, Math.PI / 4, FOLHAS[1]]].forEach(([y, comp, incl, giro, cor]) => {
    for (let i = 0; i < 4; i++) {
      const g = new THREE.BoxGeometry(comp, 0.06, 0.18).translate(comp / 2, 0, 0);
      g.rotateZ(incl).rotateY(giro + (i * Math.PI) / 2).translate(0, y, 0);
      k.peca(g, cor);
    }
  });
  k.cx(0.2, 0.16, 0.2, FOLHAS[2], 0, 0.46, 0);
}
function frutosMoita(k) {
  [[0.18, 0.32, 0.1], [-0.15, 0.4, -0.12], [0.03, 0.58, 0.15]].forEach(([x, y, z]) => k.cx(0.14, 0.14, 0.14, 0xffffff, x, y, z));
}
/** Cultivo alto: haste com pares de folhas alternados */
function plantaHaste(k) {
  k.cx(0.07, 0.85, 0.07, FOLHAS[0], 0, 0, 0);
  [0.18, 0.42, 0.66].forEach((y, i) => {
    [0, Math.PI].forEach((lado) => {
      const g = new THREE.BoxGeometry(0.3, 0.05, 0.12).translate(0.15, 0, 0);
      g.rotateZ(0.6).rotateY(lado + (i % 2 ? Math.PI / 2 : 0)).translate(0, y, 0);
      k.peca(g, FOLHAS[i === 2 ? 2 : 1]);
    });
  });
  k.cx(0.16, 0.14, 0.16, FOLHAS[2], 0, 0.82, 0);
}
function frutosHaste(k) {
  k.cx(0.13, 0.17, 0.13, 0xffffff, 0.12, 0.38, 0.06);
  k.cx(0.13, 0.17, 0.13, 0xffffff, -0.1, 0.62, -0.08);
  k.cx(0.16, 0.12, 0.16, 0xffffff, 0, 0.95, 0);
}

/** Lavoura: solo arado, cultivos instanciados, espantalho e dois irrigadores que esguicham água */
export function construirLavoura(u, campo) {
  const { construtor, matCor, grupo, clicavel, aleatorio } = u;
  const lavoura = grupo(0, 0);
  const ehIrrigador = (ix, iz) => IRRIGADORES.some(([a, b]) => a === ix && b === iz);

  // ---------- Solo arado (um tile instanciado por quadrado, escurece quando molhado) ----------
  const tiles = [];
  for (let x = campo.x0 + 0.5, ix = 0; x < campo.x1; x++, ix++) {
    for (let z = campo.z0 + 0.5, iz = 0; z < campo.z1; z++, iz++) tiles.push({ x, z, ix, iz, molhado: 0, seco: new THREE.Color() });
  }
  const indiceTile = (ix, iz) => tiles.findIndex((t) => t.ix === ix && t.iz === iz);
  const solo = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.05, 1), new THREE.MeshLambertMaterial({ map: terra({ base: 0xe6e6e6 }) }), tiles.length);
  const m4 = new THREE.Matrix4();
  tiles.forEach((t, i) => {
    solo.setMatrixAt(i, m4.makeTranslation(t.x, 0, t.z));
    solo.setColorAt(i, t.seco);
  });
  solo.receiveShadow = true;
  lavoura.add(solo);

  // ---------- Cultivos ----------
  const tipos = [[plantaMoita, frutosMoita], [plantaHaste, frutosHaste]].map(([folhas, frutos]) => {
    const kf = construtor();
    folhas(kf);
    const kr = construtor();
    frutos(kr);
    return { geoFolhas: kf.juntar(), geoFrutos: kr.juntar(), lista: [] };
  });
  const plantas = [];
  tiles.forEach((t) => {
    if (ehIrrigador(t.ix, t.iz)) return;
    const tipo = tipos[t.iz % 2];
    const p = { x: t.x, z: t.z, tipo, i: tipo.lista.length, corIdx: t.iz % 4, giro: aleatorio() * Math.PI * 2,
      variacao: 0.8 + (Math.abs(Math.floor(t.x * 31 + t.z * 17)) % 10) / 25, fase: aleatorio() * 6 };
    tipo.lista.push(p);
    plantas.push(p);
  });
  tipos.forEach((tp) => {
    tp.folhas = new THREE.InstancedMesh(tp.geoFolhas, matCor, tp.lista.length);
    tp.frutos = new THREE.InstancedMesh(tp.geoFrutos, matCor, tp.lista.length);
    tp.folhas.castShadow = true;
    tp.folhas.receiveShadow = true;
    lavoura.add(tp.folhas, tp.frutos);
  });

  // ---------- Irrigadores e espantalho ----------
  const k = construtor();
  const posIrrig = IRRIGADORES.map(([ix, iz]) => [campo.x0 + 0.5 + ix, campo.z0 + 0.5 + iz]);
  const cabecas = posIrrig.map(([x, z]) => {
    k.cx(0.3, 0.06, 0.3, 0x5e636a, x, 0.02, z);
    k.peca(new THREE.CylinderGeometry(0.06, 0.07, 0.42, 6), 0xa8b0b8, { pos: [x, 0.29, z] });
    k.peca(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 6), 0xd9822b, { pos: [x, 0.2, z] });
    const kc = construtor();
    kc.cx(0.56, 0.07, 0.08, 0xc0c6cc, 0, 0, 0);
    kc.cx(0.08, 0.07, 0.56, 0xc0c6cc, 0, 0, 0);
    [[0.28, 0], [-0.28, 0], [0, 0.28], [0, -0.28]].forEach(([dx, dz]) => kc.cx(0.1, 0.1, 0.1, 0x8a9096, dx, -0.01, dz));
    kc.cx(0.14, 0.1, 0.14, 0x56a3e2, 0, 0.04, 0);
    const cab = new THREE.Group();
    cab.position.set(x, 0.5, z);
    kc.montar(cab);
    lavoura.add(cab);
    return cab;
  });
  // Espantalho com chapéu de palha
  const [ex, ez] = [campo.x1 + 0.6, campo.z1 - 1.6];
  k.cx(0.16, 2, 0.16, 0x8a5a2b, ex, 0, ez);
  k.cx(1.5, 0.12, 0.12, 0x8a5a2b, ex, 1.4, ez);
  k.cx(0.8, 0.8, 0.45, 0x6daa2c, ex, 0.95, ez, { contorno: true });
  k.cx(0.82, 0.12, 0.47, 0x8a5a2b, ex, 1.0, ez);
  [-0.82, 0.82].forEach((d) => k.cx(0.16, 0.22, 0.16, 0xe8c060, ex + d, 1.35, ez));
  k.cx(0.55, 0.5, 0.5, 0xe8c98d, ex, 1.75, ez, { contorno: true });
  [-0.12, 0.12].forEach((d) => k.cx(0.07, 0.07, 0.04, 0x3b2410, ex + d, 2.0, ez + 0.25));
  k.cx(0.22, 0.04, 0.04, 0x3b2410, ex, 1.88, ez + 0.25);
  k.cx(0.95, 0.07, 0.95, 0xe0b050, ex, 2.22, ez, { contorno: true });
  k.cx(0.5, 0.28, 0.5, 0xe0b050, ex, 2.28, ez);
  k.cx(0.52, 0.07, 0.52, 0xd8343b, ex, 2.3, ez);
  k.montar(lavoura);
  clicavel(lavoura, 'level');

  // ---------- Água: gotas em arco e respingos ----------
  const aguaMat = new THREE.MeshLambertMaterial({ color: 0xbfe9ff, emissive: 0x2a6a9a });
  const nGotas = IRRIGADORES.length * VIZINHOS.length * GOTAS_POR_TILE;
  const nResp = IRRIGADORES.length * VIZINHOS.length * RESPINGOS_POR_TILE;
  const gotas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), aguaMat, nGotas);
  const respingos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), aguaMat, nResp);
  gotas.frustumCulled = false;
  respingos.frustumCulled = false;
  lavoura.add(gotas, respingos);
  const irrig = IRRIGADORES.map(([ix, iz], i) => ({
    x: posIrrig[i][0], z: posIrrig[i][1],
    fase: -1, prox: [2, 4.6, 6.8, 3.4, 8.2, 5.6][i] ?? 2 + i * 2,
    alvos: VIZINHOS.map(([dx, dz]) => ({ dx, dz, tile: indiceTile(ix + dx, iz + dz) })),
  }));
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  function esconderAgua() {
    for (let i = 0; i < nGotas; i++) gotas.setMatrixAt(i, zero);
    for (let i = 0; i < nResp; i++) respingos.setMatrixAt(i, zero);
    gotas.instanceMatrix.needsUpdate = true;
    respingos.instanceMatrix.needsUpdate = true;
  }
  esconderAgua();

  // ---------- Estado ----------
  let estacao = 'spring';
  let paleta = null;
  let crescimento = 0.25;
  let crescimentoAlvo = 0.25;
  let soloSujo = true;
  let aguaVisivel = false;
  const tmp = new THREE.Color();
  const corFruto = new THREE.Color();

  function definirEstacao(e, p) {
    estacao = e;
    paleta = p;
    tiles.forEach((t) => {
      t.seco.setHex(p.solo[(t.ix + t.iz) % 2]);
      if (e === 'winter') t.molhado = 0;
    });
    soloSujo = true;
    tipos.forEach((tp) => {
      tp.folhas.visible = e !== 'winter';
      tp.frutos.visible = e !== 'winter';
      tp.lista.forEach((pl) => tp.frutos.setColorAt(pl.i, corFruto.setHex(p.plantas[pl.corIdx] ?? 0xffffff)));
      if (tp.frutos.instanceColor) tp.frutos.instanceColor.needsUpdate = true;
    });
    esconderAgua();
  }
  const definirCrescimento = (alvo) => { crescimentoAlvo = alvo; };

  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const esc = new THREE.Vector3();
  const euler = new THREE.Euler();
  function atualizarPlantas(t, mover) {
    const s = crescimento;
    const comFrutos = s > 0.55;
    plantas.forEach((p) => {
      pos.set(p.x, 0.02, p.z);
      quat.setFromEuler(euler.set(0, p.giro, mover ? Math.sin(t * 1.5 + p.fase) * 0.05 : 0));
      esc.set(0.55 + 0.45 * s, s * p.variacao, 0.55 + 0.45 * s);
      m4.compose(pos, quat, esc);
      p.tipo.folhas.setMatrixAt(p.i, m4);
      p.tipo.frutos.setMatrixAt(p.i, comFrutos ? m4 : zero);
    });
    tipos.forEach((tp) => {
      tp.folhas.instanceMatrix.needsUpdate = true;
      tp.frutos.instanceMatrix.needsUpdate = true;
    });
  }

  function animar(t, dt, mover) {
    const antes = crescimento;
    crescimento += (crescimentoAlvo - crescimento) * Math.min(1, dt * 3);
    if (mover || Math.abs(antes - crescimento) > 1e-4 || t < 0.5) atualizarPlantas(t, mover);

    const esguicha = mover && estacao !== 'winter';
    if (esguicha) {
      let iGota = 0;
      let iResp = 0;
      irrig.forEach((ir, n) => {
        ir.prox -= dt;
        if (ir.fase < 0 && ir.prox <= 0) {
          ir.fase = 0;
          ir.prox = 8 + aleatorio() * 4;
        }
        if (ir.fase >= 0) ir.fase += dt;
        cabecas[n].rotation.y += ir.fase >= 0 ? dt * 9 : 0;
        ir.alvos.forEach((a, j) => {
          const dist = Math.hypot(a.dx, a.dz);
          for (let g = 0; g < GOTAS_POR_TILE; g++) {
            const f = (ir.fase - g * 0.12 - (j % 2) * 0.05) / VOO;
            if (ir.fase >= 0 && f >= 0 && f <= 1) {
              m4.makeTranslation(ir.x + a.dx * f, 0.55 + Math.sin(f * Math.PI) * 0.45 * dist - f * 0.5, ir.z + a.dz * f);
              if (f > 0.9 && a.tile >= 0) tiles[a.tile].molhado = 1;
            } else m4.copy(zero);
            gotas.setMatrixAt(iGota++, m4);
          }
          // Respingos quando a última gota cai
          const r = (ir.fase - VOO - 0.29) / 0.35;
          for (let s = 0; s < RESPINGOS_POR_TILE; s++) {
            if (ir.fase >= 0 && r >= 0 && r <= 1) {
              const ang = (s / RESPINGOS_POR_TILE) * Math.PI * 2 + j;
              m4.makeTranslation(ir.x + a.dx + Math.cos(ang) * 0.25 * r, 0.05 + Math.sin(r * Math.PI) * 0.2, ir.z + a.dz + Math.sin(ang) * 0.25 * r);
            } else m4.copy(zero);
            respingos.setMatrixAt(iResp++, m4);
          }
        });
        if (ir.fase > VOO + 0.8) ir.fase = -1;
      });
      gotas.instanceMatrix.needsUpdate = true;
      respingos.instanceMatrix.needsUpdate = true;
      aguaVisivel = true;
    } else if (aguaVisivel) {
      // Animações desligadas ou inverno: nada de gotas paradas no ar
      esconderAgua();
      irrig.forEach((ir) => { ir.fase = -1; });
      aguaVisivel = false;
    }

    // A terra molhada seca devagar
    let mudou = soloSujo;
    if (mover) {
      tiles.forEach((tl) => {
        if (tl.molhado > 0) {
          tl.molhado = Math.max(0, tl.molhado - dt / 22);
          mudou = true;
        }
      });
    }
    if (mudou) {
      tiles.forEach((tl, i) => solo.setColorAt(i, tmp.copy(tl.seco).lerp(COR_MOLHADA, Math.min(1, tl.molhado * 1.4) * 0.8)));
      solo.instanceColor.needsUpdate = true;
      soloSujo = false;
    }
  }

  return { grupo: lavoura, definirEstacao, definirCrescimento, animar };
}
