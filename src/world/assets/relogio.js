import * as THREE from 'three';
import { mostrador } from '../texturas.js';

const OURO = 0xf2c230;
const OURO_ESCURO = 0xc8901a;
const OURO_CLARO = 0xffe07a;
const GEMA = 0x9b4fc4;
const GEMA_CLARA = 0xc06ad8;
const FAISCAS = 3;

/** Relógio de Ouro: pedestal em degraus, corpo com gemas, mostrador com ponteiros na hora atual */
export function construirRelogio(u) {
  const { construtor, clicavel, grupo, definirFantasma, aleatorio } = u;
  // Ouro levemente emissivo, tingido pelas cores dos vértices
  const ouroMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x3a2600 });
  const k = construtor();
  const caixaOuro = (w, h, d, cor, x, y, z, contorno = false) => k.cx(w, h, d, ouroMat, x, y, z, { cor, contorno });
  const gema = (x, y, z, s = 0.14) => {
    k.cx(s, s, 0.08, GEMA, x, y, z);
    k.cx(s / 2, s / 2, 0.09, GEMA_CLARA, x - s / 5, y + s / 2, z);
  };

  // ---------- Pedestal em degraus ----------
  caixaOuro(1.9, 0.22, 1.7, OURO_ESCURO, 0, 0, 0, true);
  caixaOuro(1.62, 0.22, 1.42, OURO, 0, 0.22, 0, true);
  caixaOuro(1.34, 0.5, 1.14, OURO_ESCURO, 0, 0.44, 0, true);
  caixaOuro(1.4, 0.08, 1.2, OURO_CLARO, 0, 0.94, 0);
  gema(-0.35, 0.62, 0.58);
  gema(0.35, 0.62, 0.58);
  caixaOuro(0.3, 0.12, 0.06, OURO_CLARO, 0, 0.66, 0.58);

  // ---------- Corpo com janela do pêndulo ----------
  caixaOuro(1.0, 1.9, 0.8, OURO, 0, 1.02, 0, true);
  [-1, 1].forEach((s) => caixaOuro(0.14, 1.9, 0.86, OURO_ESCURO, s * 0.5, 1.02, 0));
  caixaOuro(0.64, 1.1, 0.06, OURO_ESCURO, 0, 1.4, 0.41);
  k.cx(0.5, 0.96, 0.06, 0x4a2a10, 0, 1.47, 0.42);
  caixaOuro(0.74, 0.12, 0.1, OURO_CLARO, 0, 2.52, 0.42);
  gema(0, 1.2, 0.47, 0.16);

  // ---------- Caixa do mostrador ----------
  caixaOuro(1.42, 1.38, 1.0, OURO, 0, 2.92, 0, true);
  caixaOuro(1.5, 0.12, 1.08, OURO_ESCURO, 0, 2.92, 0);
  caixaOuro(1.5, 0.12, 1.08, OURO_ESCURO, 0, 4.18, 0);
  k.peca(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 20), ouroMat, { cor: OURO_CLARO, rot: new THREE.Euler(Math.PI / 2, 0, 0), pos: [0, 3.61, 0.51] });
  k.peca(new THREE.CircleGeometry(0.5, 20), new THREE.MeshLambertMaterial({ map: mostrador() }), { pos: [0, 3.61, 0.56], uv: false });
  [[-0.58, 3.06], [0.58, 3.06], [-0.58, 4.14], [0.58, 4.14]].forEach(([x, y]) => gema(x, y, 0.53, 0.13));

  // ---------- Topo decorado ----------
  caixaOuro(1.2, 0.26, 0.86, OURO_ESCURO, 0, 4.3, 0, true);
  const cupula = new THREE.ConeGeometry(0.82, 0.7, 4);
  k.peca(cupula, ouroMat, { cor: OURO, rot: new THREE.Euler(0, Math.PI / 4, 0), pos: [0, 4.91, 0], contorno: true });
  k.peca(new THREE.SphereGeometry(0.14, 8, 6), ouroMat, { cor: OURO_CLARO, pos: [0, 5.32, 0] });
  k.cx(0.16, 0.16, 0.16, GEMA, 0, 5.42, 0);
  [[-0.55, -0.38], [0.55, -0.38], [-0.55, 0.38], [0.55, 0.38]].forEach(([x, z]) => caixaOuro(0.14, 0.2, 0.14, OURO_CLARO, x, 4.56, z));

  // À esquerda da casa, virado na diagonal para a câmera e um pouco menor
  const relogio = grupo(-11.7, -4.5);
  relogio.rotation.y = Math.PI / 4;
  relogio.scale.setScalar(0.8);
  k.montar(relogio);

  // Ponteiros (pivô no centro do mostrador)
  const ponteiroMat = new THREE.MeshLambertMaterial({ color: 0x3b2410 });
  const ponteiro = (comp, larg) => {
    const g = new THREE.Group();
    g.position.set(0, 3.61, 0.58);
    const m = new THREE.Mesh(new THREE.BoxGeometry(larg, comp, 0.03).translate(0, comp / 2 - 0.05, 0), ponteiroMat);
    g.add(m);
    relogio.add(g);
    return g;
  };
  const horas = ponteiro(0.3, 0.07);
  const minutos = ponteiro(0.42, 0.05);
  const centro = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), ponteiroMat);
  centro.position.set(0, 3.61, 0.6);
  relogio.add(centro);

  // Pêndulo
  const pendulo = new THREE.Group();
  pendulo.position.set(0, 2.38, 0.45);
  const kp = construtor();
  kp.cx(0.04, 0.6, 0.03, OURO_ESCURO, 0, -0.62, 0);
  kp.peca(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 12), ouroMat, { cor: OURO_CLARO, rot: new THREE.Euler(Math.PI / 2, 0, 0), pos: [0, -0.7, 0.01] });
  kp.montar(pendulo, { sombra: false });
  relogio.add(pendulo);
  clicavel(relogio, 'clock');

  // Faíscas douradas de vez em quando
  const faiscaMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  const faiscas = Array.from({ length: FAISCAS }, () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.06), faiscaMat), new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.06), faiscaMat));
    g.children.forEach((m) => { m.userData.semFantasma = true; });
    g.visible = false;
    relogio.add(g);
    return { g, t: -1, espera: 1 + aleatorio() * 4 };
  });
  const PONTOS = [[0.62, 4.0, 0.55], [-0.6, 2.2, 0.45], [0.4, 5.1, 0.2], [-0.5, 3.3, 0.55], [0.55, 1.1, 0.45], [0, 5.5, 0]];

  let construido = false;
  function definirConstruido(sim) {
    construido = sim;
    definirFantasma(relogio, !sim);
    if (!sim) faiscas.forEach((f) => { f.g.visible = false; });
  }
  function definirHora(h) {
    horas.rotation.z = -((h % 12) / 12) * Math.PI * 2;
    minutos.rotation.z = -(h % 1) * Math.PI * 2;
  }
  function animar(t, dt) {
    pendulo.rotation.z = Math.sin(t * 2.4) * 0.3;
    faiscas.forEach((f) => {
      if (!construido) return;
      if (f.t < 0) {
        f.espera -= dt;
        if (f.espera <= 0) {
          f.t = 0;
          f.g.position.set(...PONTOS[Math.floor(aleatorio() * PONTOS.length)]);
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
        f.espera = 2 + aleatorio() * 4;
        f.g.visible = false;
      }
    });
  }

  return { grupo: relogio, definirConstruido, definirHora, animar };
}
