import * as THREE from 'three';
import { tabuasVerticais, tabuasDeck, telhas, tijolos, ripas } from '../texturas.js';

// Cores da casa do jogador: paredes amareladas, telhado vermelho, molduras em madeira escura
const COR = {
  parede: 0xe9a548, telha: 0xc8432f, cumeeira: 0x8e2a22, pedra: 0x9a958c, chamine: 0x8f8778, deck: 0xc87a3a,
  moldura: 0x6e3a1e, faixa: 0x7a4426, veneziana: 0x9a3a28, porta: 0x9a5530, portaEscura: 0x7a4024,
  corrimao: 0xa0582a, neve: 0xf6fafc, folha: 0x4f9a3a, folhaClara: 0x6ec24a,
};
const CORES_FLOR = [0xf08ab8, 0xfff4e0, 0xf2c230, 0x9b4fc4];

// Dimensões: largura (x), profundidade (z), início do andar de cima (sob o telhado em mansarda)
const L = 6;
const P = 4.2;
const Y0 = 2.72;
// Perfil da mansarda (gambrel): [z, y] a partir de Y0
const PERFIL = [[-2.1, 0], [-1.55, 1.25], [0, 1.95], [1.55, 1.25], [2.1, 0]];

/** Casa da fazenda, caixa de envios e bancada de criação */
export function construirCasa(u) {
  const { construtor, matTex, clicavel, grupo, janelaMat, lanternaMat } = u;
  const mParede = matTex(tabuasVerticais({ base: COR.parede }));
  const mTelha = matTex(telhas({ base: COR.telha }));
  const mPedra = matTex(tijolos({ base: COR.pedra }));
  const mChamine = matTex(tijolos({ base: COR.chamine }));
  const mDeck = matTex(tabuasDeck({ base: COR.deck }));
  const mVeneziana = matTex(ripas({ base: COR.veneziana }));

  const k = construtor();
  const kNeve = construtor();
  const kFlores = construtor();

  /** Posiciona caixas numa parede: `uu` corre ao longo da parede, `o` é o centro para fora dela */
  const naParede = (kk, face, plano) => (w, h, d, material, uu, y, o, opts) => (face === 'z'
    ? kk.cx(w, h, d, material, uu, y, plano + o, opts)
    : kk.cx(d, h, w, material, plano + o, y, -uu, opts));

  /** Janela com moldura, cruz, peitoril e, opcionalmente, venezianas e floreira */
  function janela(face, plano, uu, y, w, h, { venezianas = true, floreira = false } = {}) {
    const pz = naParede(k, face, plano);
    const e = 0.09;
    pz(w + 2 * e, e, 0.1, COR.moldura, uu, y - e, 0.05);
    pz(w + 2 * e, e, 0.1, COR.moldura, uu, y + h, 0.05);
    pz(e, h, 0.1, COR.moldura, uu - w / 2 - e / 2, y, 0.05);
    pz(e, h, 0.1, COR.moldura, uu + w / 2 + e / 2, y, 0.05);
    pz(w, h, 0.06, janelaMat, uu, y, 0.03);
    pz(0.06, h, 0.08, COR.moldura, uu, y, 0.04);
    pz(w, 0.06, 0.08, COR.moldura, uu, y + h / 2 - 0.03, 0.04);
    pz(w + 0.34, 0.07, 0.2, COR.moldura, uu, y - e - 0.07, 0.1);
    if (venezianas) [-1, 1].forEach((s) => pz(0.24, h + 0.1, 0.05, mVeneziana, uu + s * (w / 2 + e + 0.14), y - 0.05, 0.03));
    if (floreira) {
      const yb = y - e - 0.36;
      pz(w + 0.1, 0.22, 0.26, mDeck, uu, yb, 0.13, { cor: 0xb08060 });
      const pf = naParede(kFlores, face, plano);
      pf(w, 0.1, 0.2, COR.folha, uu, yb + 0.22, 0.13);
      const n = Math.round(w / 0.18);
      for (let i = 0; i < n; i++) {
        const fu = uu - w / 2 + 0.09 + (i * (w - 0.18)) / (n - 1);
        pf(0.13, 0.13, 0.13, i % 2 ? COR.folhaClara : CORES_FLOR[i % CORES_FLOR.length], fu, yb + 0.3, 0.13 + ((i % 3) - 1) * 0.04);
      }
    }
  }

  // ---------- Volume principal ----------
  k.cx(L + 0.3, 0.5, P + 0.3, mPedra, 0, 0, 0, { contorno: true });
  k.cx(L, 2.1, P, mParede, 0, 0.5, 0, { contorno: true });
  k.cx(L + 0.14, 0.22, P + 0.14, COR.faixa, 0, 2.5, 0);
  // Tábuas de acabamento nos cantos
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => k.cx(0.16, 2.0, 0.16, COR.faixa, sx * L / 2, 0.5, sz * P / 2));
  const forma = new THREE.Shape(PERFIL.map(([z, y]) => new THREE.Vector2(z, y)));
  k.peca(new THREE.ExtrudeGeometry(forma, { depth: L, bevelEnabled: false }), mParede,
    { rot: new THREE.Euler(0, Math.PI / 2, 0), pos: [-L / 2, Y0, 0], contorno: true });

  // ---------- Telhado em mansarda ----------
  const esp = 0.16;
  const Lt = L + 0.5;
  [1, -1].forEach((s) => {
    const beiral = [s * 2.1, Y0];
    const joelho = [s * 1.55, Y0 + 1.25];
    const cume = [0, Y0 + 1.95];
    k.placa(beiral, joelho, mTelha, { esp, comp: Lt, ext: [0.32, 0.1], contorno: true });
    k.placa(joelho, cume, mTelha, { esp, comp: Lt, ext: [0.04, 0.06], contorno: true });
    kNeve.placa(joelho, cume, COR.neve, { esp: 0.12, comp: Lt + 0.04, ext: [0.08, 0.06], sobre: esp });
  });
  k.cx(Lt + 0.04, 0.16, 0.34, COR.cumeeira, 0, Y0 + 2.0, 0, { contorno: true });
  kNeve.cx(Lt + 0.08, 0.12, 0.42, COR.neve, 0, Y0 + 2.14, 0);

  // Águas-furtadas com janelinha na água da frente
  [-1.5, 1.5].forEach((dx) => {
    k.cx(1.1, 0.95, 1.05, mParede, dx, Y0 + 0.4, 1.45, { contorno: true });
    janela('z', 1.975, dx, Y0 + 0.76, 0.6, 0.44, { venezianas: false });
    const a = [2.12, Y0 + 1.3];
    const b = [0.9, Y0 + 1.55];
    k.placa(a, b, mTelha, { esp: 0.12, comp: 1.35, centro: dx, ext: [0.1, 0], contorno: true });
    kNeve.placa(a, b, COR.neve, { esp: 0.1, comp: 1.4, centro: dx, ext: [0.1, 0], sobre: 0.12 });
  });

  // ---------- Chaminé de pedra ----------
  const CH = [2.2, -0.75];
  k.cx(0.8, 3.25, 0.8, mChamine, CH[0], 2.6, CH[1], { contorno: true });
  k.cx(0.98, 0.16, 0.98, 0x5e5a55, CH[0], 5.85, CH[1], { contorno: true });
  kNeve.cx(0.98, 0.08, 0.98, COR.neve, CH[0], 6.01, CH[1]);

  // ---------- Fachada ----------
  const frente = naParede(k, 'z', P / 2);
  // Porta de madeira com janelinha de vidro
  frente(0.1, 1.85, 0.1, COR.moldura, -0.5, 0.52, 0.05);
  frente(0.1, 1.85, 0.1, COR.moldura, 0.5, 0.52, 0.05);
  frente(1.1, 0.1, 0.1, COR.moldura, 0, 2.27, 0.05);
  frente(0.9, 1.75, 0.07, COR.porta, 0, 0.52, 0.035);
  [-0.2, 0.2].forEach((uu) => frente(0.3, 0.55, 0.09, COR.portaEscura, uu, 0.68, 0.045));
  frente(0.5, 0.45, 0.09, janelaMat, 0, 1.62, 0.045);
  frente(0.05, 0.45, 0.1, COR.porta, 0, 1.62, 0.05);
  frente(0.5, 0.05, 0.1, COR.porta, 0, 1.82, 0.05);
  frente(0.08, 0.08, 0.14, 0xf2c230, 0.3, 1.25, 0.07);
  // Toldo sobre a porta e lanterna
  k.placa([2.95, 2.3], [2.12, 2.52], mTelha, { esp: 0.1, comp: 1.5, contorno: true });
  kNeve.placa([2.95, 2.3], [2.12, 2.52], COR.neve, { esp: 0.08, comp: 1.5, sobre: 0.1 });
  [-0.65, 0.65].forEach((uu) => frente(0.07, 0.07, 0.8, COR.moldura, uu, 2.24, 0.4));
  frente(0.2, 0.28, 0.2, lanternaMat, 0.8, 1.85, 0.18);
  frente(0.26, 0.06, 0.26, COR.moldura, 0.8, 2.13, 0.18);
  frente(0.05, 0.05, 0.12, COR.moldura, 0.8, 2.0, 0.06);
  // Janelas com venezianas e floreiras
  [-2.0, 2.0].forEach((uu) => janela('z', P / 2, uu, 1.15, 0.8, 0.8, { floreira: true }));
  // Lateral direita (visível pela câmera)
  janela('x', L / 2, 0, 1.15, 0.9, 0.8, { floreira: true });
  janela('x', L / 2, 0, Y0 + 0.45, 0.7, 0.6, { venezianas: false });

  // ---------- Varanda ----------
  k.cx(L + 0.3, 0.38, 1.2, mPedra, 0, 0, 2.85, { contorno: true });
  k.cx(L + 0.42, 0.14, 1.45, mDeck, 0, 0.38, 2.82, { contorno: true });
  k.cx(1.6, 0.34, 0.4, mDeck, 0, 0, 3.75, { contorno: true });
  k.cx(1.6, 0.17, 0.4, mDeck, 0, 0, 4.15, { contorno: true });
  [[-3.15, 3.45], [-0.88, 3.45], [0.88, 3.45], [3.15, 3.45], [-3.15, 2.25], [3.15, 2.25]]
    .forEach(([x, z]) => k.cx(0.14, 0.62, 0.14, COR.moldura, x, 0.52, z));
  [-1, 1].forEach((s) => {
    [1.05, 0.8].forEach((y, i) => {
      k.cx(2.41, i ? 0.06 : 0.09, 0.12, COR.corrimao, s * 2.015, y, 3.45);
      k.cx(0.12, i ? 0.06 : 0.09, 1.2, COR.corrimao, s * 3.15, y, 2.85);
    });
  });
  // Tapete
  k.cx(0.9, 0.025, 0.5, 0x8e2a22, 0, 0.52, 2.45);
  k.cx(0.74, 0.03, 0.36, 0xd8603a, 0, 0.52, 2.45);
  // Banco encostado no corrimão
  k.cx(0.42, 0.07, 0.95, 0xb06a34, -2.75, 0.85, 2.85);
  [[-0.15, -0.4], [0.15, -0.4], [-0.15, 0.4], [0.15, 0.4]].forEach(([dx, dz]) => k.cx(0.07, 0.33, 0.07, COR.moldura, -2.75 + dx, 0.52, 2.85 + dz));
  // Vaso com flores
  k.peca(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 8), 0xb5603a, { pos: [-0.8, 0.68, 2.42] });
  k.cx(0.44, 0.06, 0.44, 0xa04f30, -0.8, 0.82, 2.42);
  k.cx(0.36, 0.18, 0.36, COR.folha, -0.8, 0.86, 2.42);
  k.cx(0.2, 0.16, 0.2, COR.folhaClara, -0.8, 1.02, 2.42);
  [[-0.12, 0.1], [0.12, -0.08], [0.06, 0.14]].forEach(([dx, dz], i) => kFlores.cx(0.14, 0.14, 0.14, [0x9b4fc4, 0xc06ad8, 0x9b4fc4][i], -0.8 + dx, 1.08, 2.42 + dz));
  // Caixote com cogumelos
  k.cx(0.55, 0.25, 0.4, mDeck, 0.95, 0.52, 2.45, { cor: 0x9a7050 });
  [[-0.14, 0], [0.1, 0.05], [0.02, -0.08]].forEach(([dx, dz], i) => {
    k.cx(0.07, 0.12 + i * 0.03, 0.07, 0xfff4e0, 0.95 + dx, 0.77, 2.45 + dz);
    k.cx(0.18, 0.08, 0.18, 0xd8343b, 0.95 + dx, 0.88 + i * 0.03, 2.45 + dz);
    k.cx(0.05, 0.02, 0.05, 0xffffff, 0.95 + dx + 0.04, 0.96 + i * 0.03, 2.45 + dz + 0.04);
  });

  // ---------- Caixa de correio ----------
  k.cx(0.12, 0.85, 0.12, COR.moldura, -1.35, 0, 4.0);
  k.cx(0.34, 0.3, 0.52, 0x5f7fb0, -1.35, 0.85, 4.0, { contorno: true });
  k.cx(0.3, 0.06, 0.5, 0x7f9fd0, -1.35, 1.15, 4.0);
  k.cx(0.04, 0.22, 0.1, 0xd8343b, -1.17, 0.95, 3.9);

  const casa = grupo(-5.5, -6.5);
  k.montar(casa);
  const neve = [...kNeve.montar(casa, { sombra: false }).values()];
  const flores = [...kFlores.montar(casa).values()];
  clicavel(casa, 'friends');
  const chamine = new THREE.Vector3(-5.5 + CH[0], 6.05, -6.5 + CH[1]);

  // ---------- Caixa de envios ----------
  const kc = construtor();
  kc.cx(1.3, 0.62, 0.85, mDeck, 0, 0, 0, { cor: 0xb98a60, contorno: true });
  [[-0.62, -0.4], [0.62, -0.4], [-0.62, 0.4], [0.62, 0.4]].forEach(([x, z]) => kc.cx(0.1, 0.64, 0.1, COR.moldura, x, 0, z));
  kc.cx(0.25, 0.18, 0.25, 0xe8833a, -0.3, 0.6, 0.1);
  kc.cx(0.22, 0.2, 0.22, 0x9b4fc4, 0.1, 0.6, -0.05);
  kc.cx(0.2, 0.16, 0.2, 0xd8343b, 0.35, 0.6, 0.12);
  kc.peca(new THREE.BoxGeometry(1.42, 0.12, 0.95), mDeck, { rot: new THREE.Euler(-0.22, 0, 0), pos: [0, 0.78, -0.08], contorno: true });
  kc.cx(0.3, 0.1, 0.06, 0xf2c230, 0, 0.42, 0.44);
  const caixaEnvio = grupo(-1.3, -3.2);
  kc.montar(caixaEnvio);
  clicavel(caixaEnvio, 'shipping');

  // ---------- Bancada de criação ----------
  const kb = construtor();
  kb.cx(1.7, 0.14, 0.85, mDeck, 0, 0.7, 0, { contorno: true });
  [[-0.75, -0.35], [0.75, -0.35], [-0.75, 0.35], [0.75, 0.35]].forEach(([x, z]) => kb.cx(0.12, 0.7, 0.12, COR.moldura, x, 0, z));
  kb.cx(1.5, 0.08, 0.7, mDeck, 0, 0.2, 0, { cor: 0xb08060 });
  kb.cx(1.1, 0.12, 0.3, mDeck, 0, 0.28, 0.05, { cor: 0xd8a070 });
  kb.cx(0.35, 0.22, 0.3, 0x8a8f94, -0.5, 0.84, 0.1);
  kb.cx(0.1, 0.1, 0.4, 0x5e636a, -0.5, 0.92, 0.1);
  kb.cx(0.06, 0.06, 0.45, 0x8a5a2b, 0.35, 0.84, 0.12);
  kb.cx(0.22, 0.1, 0.1, 0x5e636a, 0.35, 0.86, -0.12);
  kb.cx(0.5, 0.02, 0.18, 0xc0c4c8, 0.05, 0.84, -0.22);
  const bancada = grupo(-1.3, -6.2);
  kb.montar(bancada);
  clicavel(bancada, 'crafting');

  function definirEstacao(estacao) {
    neve.forEach((m) => { m.visible = estacao === 'winter'; });
    flores.forEach((m) => { m.visible = estacao !== 'winter'; });
  }
  return { grupo: casa, chamine, definirEstacao };
}
