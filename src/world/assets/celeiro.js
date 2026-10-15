import * as THREE from 'three';
import { tabuasVerticais, tabuasDeck, telhas, tijolos } from '../texturas.js';

// Celeiro vermelho com acabamento em pergaminho (cor da interface) e telhado de madeira
const COR = {
  parede: 0xc0392f, porta: 0xe3b6ae, telha: 0x8a5a2b, cumeeira: 0x5b3a1e, branco: 0xf3ddb0, pedra: 0x9a958c,
  escuro: 0x3b2410, ferro: 0x3b3f45, feno: 0xe8c060, fenoEscuro: 0xb08a3a, poste: 0x8a5a2b, travessa: 0xa8763f,
};
const L = 4.6;
const P = 3.6;
const Y0 = 2.6;
const PERFIL = [[-1.8, 0], [-1.25, 1.0], [0, 1.6], [1.25, 1.0], [1.8, 0]];

// Posição do celeiro (girado: as portas da empena +x ficam viradas para +z) e cercado na frente delas
const POS = [-11.6, 2.0];
const GIRO = -Math.PI / 2;
export const CERCADO = { x0: -12.8, z0: POS[1] + L / 2, x1: -8.2, z1: 9.0 };

/** Cerca no estilo de Stardew: postes grossos de topo arredondado e duas travessas */
export function cerca(k, a, b, { passo = 1.3 } = {}) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const n = Math.max(1, Math.round(len / passo));
  const geoPoste = new THREE.CylinderGeometry(0.11, 0.12, 0.72, 6);
  const geoTopo = new THREE.SphereGeometry(0.11, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2);
  for (let i = 0; i <= n; i++) {
    const x = a[0] + (dx * i) / n;
    const z = a[1] + (dz * i) / n;
    k.peca(geoPoste, COR.poste, { pos: [x, 0.36, z] });
    k.peca(geoTopo, COR.poste, { pos: [x, 0.72, z] });
  }
  const rot = new THREE.Euler(0, -Math.atan2(dz, dx), 0);
  [0.3, 0.58].forEach((y) => k.peca(new THREE.BoxGeometry(len, 0.11, 0.07), COR.travessa,
    { rot, pos: [a[0] + dx / 2, y, a[1] + dz / 2] }));
}

export function construirCeleiro(u) {
  const { cena, construtor, matTex, clicavel, grupo, janelaMat, lanternaMat, mat } = u;
  const mParede = matTex(tabuasVerticais({ base: COR.parede }));
  const mTelha = matTex(telhas({ base: COR.telha }));
  const mPedra = matTex(tijolos({ base: COR.pedra }));
  const mDeck = matTex(tabuasDeck({ base: 0xc87a3a }));
  const k = construtor();
  const kNeve = construtor();

  // Caixas numa parede: face 'x' (empena das portas, x = plano) ou '-z' (lateral que fica visível depois do giro)
  const naParede = (face, plano) => (w, h, d, material, uu, y, o, opts) => (face === '-z'
    ? k.cx(w, h, d, material, -uu, y, plano - o, opts)
    : k.cx(d, h, w, material, plano + o, y, -uu, opts));

  /** Folha de porta com moldura e o "X" clássico, na lateral +x */
  function folhaX(uu, y, w, h) {
    const px = naParede('x', L / 2);
    const e = 0.1;
    px(w, h, 0.08, mParede, uu, y, 0.04, { cor: COR.porta });
    px(w, e, 0.12, COR.branco, uu, y, 0.06);
    px(w, e, 0.12, COR.branco, uu, y + h - e, 0.06);
    px(e, h, 0.12, COR.branco, uu - w / 2 + e / 2, y, 0.06);
    px(e, h, 0.12, COR.branco, uu + w / 2 - e / 2, y, 0.06);
    const wi = w - 2 * e;
    const hi = h - 2 * e;
    const ang = Math.atan2(hi, wi);
    [ang, -ang].forEach((a) => k.peca(new THREE.BoxGeometry(0.1, 0.1, Math.hypot(wi, hi) - 0.04), COR.branco,
      { rot: new THREE.Euler(a, 0, 0), pos: [L / 2 + 0.07, y + h / 2, -uu] }));
  }

  // ---------- Volume e telhado em mansarda ----------
  k.cx(L + 0.2, 0.3, P + 0.2, mPedra, 0, 0, 0, { contorno: true });
  k.cx(L, 2.3, P, mParede, 0, 0.3, 0, { contorno: true });
  const forma = new THREE.Shape(PERFIL.map(([z, y]) => new THREE.Vector2(z, y)));
  k.peca(new THREE.ExtrudeGeometry(forma, { depth: L, bevelEnabled: false }), mParede,
    { rot: new THREE.Euler(0, Math.PI / 2, 0), pos: [-L / 2, Y0, 0], contorno: true });
  k.cx(L + 0.1, 0.12, P + 0.1, COR.branco, 0, Y0 - 0.12, 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => k.cx(0.16, 2.3, 0.16, COR.branco, (sx * L) / 2, 0.3, (sz * P) / 2));

  const esp = 0.15;
  const Lt = L + 0.4;
  [1, -1].forEach((s) => {
    const beiral = [s * 1.8, Y0];
    const joelho = [s * 1.25, Y0 + 1.0];
    const cume = [0, Y0 + 1.6];
    k.placa(beiral, joelho, mTelha, { esp, comp: Lt, ext: [0.28, 0.1], contorno: true });
    k.placa(joelho, cume, mTelha, { esp, comp: Lt, ext: [0.04, 0.06], contorno: true });
    kNeve.placa(joelho, cume, 0xf6fafc, { esp: 0.12, comp: Lt + 0.04, ext: [0.08, 0.06], sobre: esp });
    // Acabamento claro na borda do telhado, nas duas empenas
    [-1, 1].forEach((sx) => {
      k.placa(beiral, joelho, COR.branco, { esp: esp + 0.04, comp: 0.1, centro: sx * (Lt / 2 + 0.05), ext: [0.28, 0.1] });
      k.placa(joelho, cume, COR.branco, { esp: esp + 0.04, comp: 0.1, centro: sx * (Lt / 2 + 0.05), ext: [0.04, 0.06] });
    });
  });
  k.cx(Lt + 0.2, 0.14, 0.3, COR.cumeeira, 0, Y0 + 1.66, 0, { contorno: true });
  kNeve.cx(Lt + 0.24, 0.1, 0.38, 0xf6fafc, 0, Y0 + 1.8, 0);

  // Cata-vento com galo sobre a cumeeira
  k.cx(0.06, 0.6, 0.06, COR.ferro, -1.2, Y0 + 1.78, 0);
  k.cx(0.06, 0.04, 0.6, COR.ferro, -1.2, Y0 + 2.2, 0);
  k.cx(0.06, 0.2, 0.26, COR.ferro, -1.2, Y0 + 2.38, 0);
  k.cx(0.06, 0.12, 0.1, COR.ferro, -1.2, Y0 + 2.5, 0.12);
  k.cx(0.06, 0.18, 0.08, COR.ferro, -1.2, Y0 + 2.46, -0.15);

  // ---------- Portas grandes na empena +x ----------
  const lado = naParede('x', L / 2);
  lado(2.2, 2.05, 0.04, COR.escuro, 0, 0.3, 0.02);
  folhaX(-0.5, 0.32, 1.0, 1.9);
  folhaX(0.5, 0.32, 1.0, 1.9);
  lado(2.4, 0.14, 0.14, COR.branco, 0, 2.24, 0.07);
  lado(2.7, 0.08, 0.1, COR.escuro, 0, 2.42, 0.1);
  lado(0.2, 0.26, 0.2, lanternaMat, 1.35, 1.75, 0.16);
  lado(0.26, 0.06, 0.26, COR.escuro, 1.35, 2.01, 0.16);
  // Portinhola do palheiro e viga com roldana
  folhaX(0, Y0 + 0.2, 0.8, 0.75);
  k.cx(0.9, 0.14, 0.14, COR.cumeeira, L / 2 + 0.35, Y0 + 1.3, 0);
  k.cx(0.03, 0.5, 0.03, 0xd8c08a, L / 2 + 0.7, Y0 + 0.8, 0);
  k.cx(0.1, 0.08, 0.06, COR.ferro, L / 2 + 0.7, Y0 + 0.74, 0);

  // ---------- Janelas na lateral visível ----------
  const frente = naParede('-z', -P / 2);
  [-1.3, 1.3].forEach((uu) => {
    const w = 0.62;
    const y = 1.25;
    frente(w + 0.2, 0.1, 0.1, COR.branco, uu, y - 0.1, 0.05);
    frente(w + 0.2, 0.1, 0.1, COR.branco, uu, y + w, 0.05);
    frente(0.1, w, 0.1, COR.branco, uu - w / 2 - 0.05, y, 0.05);
    frente(0.1, w, 0.1, COR.branco, uu + w / 2 + 0.05, y, 0.05);
    frente(w, w, 0.06, janelaMat, uu, y, 0.03);
    frente(0.06, w, 0.08, COR.branco, uu, y, 0.04);
    frente(w, 0.06, 0.08, COR.branco, uu, y + w / 2 - 0.03, 0.04);
  });

  // ---------- Fardos de feno ----------
  const fardo = (x, y, z, rotY = 0) => {
    k.peca(new THREE.BoxGeometry(0.8, 0.45, 0.5), COR.feno, { rot: new THREE.Euler(0, rotY, 0), pos: [x, y + 0.225, z] });
    [-0.2, 0.2].forEach((d) => k.peca(new THREE.BoxGeometry(0.05, 0.47, 0.52), COR.fenoEscuro,
      { rot: new THREE.Euler(0, rotY, 0), pos: [x + Math.cos(rotY) * d, y + 0.225, z - Math.sin(rotY) * d] }));
  };
  fardo(-1.7, 0, -2.25);
  fardo(-0.85, 0, -2.3, 0.15);
  fardo(-1.3, 0.45, -2.28, -0.1);

  const celeiro = grupo(...POS);
  celeiro.rotation.y = GIRO;
  k.montar(celeiro);
  const neve = [...kNeve.montar(celeiro, { sombra: false }).values()];
  clicavel(celeiro, 'cooking');

  // ---------- Cercado ----------
  const kc = construtor();
  const { x0, z0, x1, z1 } = CERCADO;
  cerca(kc, [x0, z0], [x0, z1]);
  cerca(kc, [x0, z1], [x1, z1]);
  cerca(kc, [x1, z1], [x1, z0]);
  cerca(kc, [x0, z0], [POS[0] - P / 2, z0], { passo: 2 });
  cerca(kc, [POS[0] + P / 2, z0], [x1, z0], { passo: 2 });
  // Cocho com água e um fardo solto
  kc.cx(1.4, 0.3, 0.5, mDeck, x1 - 1.1, 0, z1 - 0.5, { cor: 0xa07050 });
  kc.cx(1.26, 0.04, 0.36, 0x56a3e2, x1 - 1.1, 0.27, z1 - 0.5);
  const cercado = grupo(0, 0);
  kc.montar(cercado);
  const kf = construtor();
  const fx = x0 + 0.7;
  const fz = z1 - 0.6;
  kf.cx(0.8, 0.45, 0.5, COR.feno, fx, 0, fz);
  [-0.2, 0.2].forEach((d) => kf.cx(0.05, 0.47, 0.52, COR.fenoEscuro, fx + d, 0, fz));
  kf.montar(cercado);

  // ---------- Animais ----------
  const area = [x0 + 0.5, z0 + 0.6, x1 - 0.5, z1 - 0.5];
  const animais = [];

  /**
   * Monta um bicho em blocos: corpo, cabeça (pivô no pescoço) e pernas (pivô no quadril).
   * `def(kc, kh)` desenha corpo e cabeça; `pernas` = [x, z] de cada perna.
   */
  function bicho(x, z, { quadril, pernas, larg, corPerna, pescoco, vel, galinha = false }, def) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = u.aleatorio() * Math.PI * 2;
    const corpo = new THREE.Group();
    const cabeca = new THREE.Group();
    cabeca.position.set(...pescoco);
    const kCorpo = construtor();
    const kCabeca = construtor();
    def(kCorpo, kCabeca);
    kCorpo.montar(corpo);
    kCabeca.montar(cabeca);
    corpo.add(cabeca);
    g.add(corpo);
    const geoPerna = new THREE.BoxGeometry(larg, quadril, larg).translate(0, -quadril / 2, 0);
    const listaPernas = pernas.map(([px, pz]) => {
      const m = new THREE.Mesh(geoPerna, mat(corPerna));
      m.position.set(px, quadril, pz);
      m.castShadow = true;
      g.add(m);
      return m;
    });
    cena.add(g);
    const a = { g, corpo, cabeca, pernas: listaPernas, vel, galinha, alvo: new THREE.Vector2(x, z), espera: u.aleatorio() * 3, pasta: 0, passo: u.aleatorio() * 6 };
    animais.push(a);
    return a;
  }

  function galinha(x, z, cor, asa) {
    bicho(x, z, { quadril: 0.16, pernas: [[-0.1, 0], [0.1, 0]], larg: 0.06, corPerna: 0xf2a030, pescoco: [0, 0.42, 0.16], vel: 0.9, galinha: true },
      (kc, kh) => {
        kc.cx(0.42, 0.34, 0.5, cor, 0, 0.16, -0.02);
        kc.cx(0.44, 0.16, 0.28, asa, 0, 0.24, -0.04);
        kc.cx(0.28, 0.22, 0.12, cor, 0, 0.4, -0.26);
        kh.cx(0.28, 0.28, 0.26, cor, 0, -0.04, 0.06);
        kh.cx(0.08, 0.1, 0.16, 0xd8343b, 0, 0.24, 0.06);
        kh.cx(0.1, 0.07, 0.1, 0xf2a030, 0, 0.06, 0.23);
        kh.cx(0.06, 0.08, 0.05, 0xd8343b, 0, -0.02, 0.2);
        kh.cx(0.3, 0.05, 0.05, 0x1a1410, 0, 0.12, 0.13);
      });
  }
  galinha(-11.8, 8.2, 0xfff8ec, 0xeadfcf);
  galinha(-9.2, 8.4, 0xb5713a, 0x8e5428);
  galinha(-10.4, 7.6, 0x8aa8c8, 0x6e8cae);

  // Vaca
  bicho(-11.6, 5.6, { quadril: 0.42, pernas: [[-0.27, 0.42], [0.27, 0.42], [-0.27, -0.42], [0.27, -0.42]], larg: 0.18, corPerna: 0xfff8ec, pescoco: [0, 0.88, 0.6], vel: 0.45 },
    (kc, kh) => {
      kc.cx(0.78, 0.62, 1.2, 0xfff8ec, 0, 0.42, 0);
      kc.cx(0.8, 0.32, 0.38, 0x5b3a1e, 0, 0.56, 0.2);
      kc.cx(0.5, 0.64, 0.3, 0x5b3a1e, -0.15, 0.41, -0.35);
      kc.cx(0.25, 0.1, 0.2, 0xf0b0a0, 0, 0.34, -0.25);
      kc.cx(0.06, 0.4, 0.06, 0xfff8ec, 0, 0.6, -0.62);
      kc.cx(0.1, 0.1, 0.1, 0x5b3a1e, 0, 0.52, -0.62);
      kh.cx(0.5, 0.46, 0.42, 0xfff8ec, 0, -0.14, 0.16);
      kh.cx(0.44, 0.22, 0.12, 0xf0b0a0, 0, -0.14, 0.42);
      kh.cx(0.54, 0.07, 0.07, 0x1a1410, 0, 0.12, 0.24);
      kh.cx(0.08, 0.12, 0.08, 0xf3ddb0, -0.17, 0.32, 0.12);
      kh.cx(0.08, 0.12, 0.08, 0xf3ddb0, 0.17, 0.32, 0.12);
      kh.cx(0.74, 0.08, 0.12, 0x5b3a1e, 0, 0.2, 0.08);
    });

  // Porco
  bicho(-9.0, 5.8, { quadril: 0.25, pernas: [[-0.2, 0.3], [0.2, 0.3], [-0.2, -0.3], [0.2, -0.3]], larg: 0.14, corPerna: 0xf2a7b0, pescoco: [0, 0.55, 0.45], vel: 0.6 },
    (kc, kh) => {
      kc.cx(0.62, 0.5, 0.9, 0xf2a7b0, 0, 0.25, 0);
      kc.cx(0.64, 0.12, 0.7, 0xf6bcc3, 0, 0.25, 0);
      kc.cx(0.06, 0.12, 0.06, 0xe8858f, 0, 0.62, -0.47);
      kc.cx(0.12, 0.06, 0.06, 0xe8858f, 0.04, 0.72, -0.47);
      kh.cx(0.5, 0.44, 0.36, 0xf2a7b0, 0, -0.2, 0.12);
      kh.cx(0.26, 0.18, 0.1, 0xe8858f, 0, -0.12, 0.33);
      kh.cx(0.04, 0.05, 0.02, 0x8a4a50, -0.06, -0.06, 0.385);
      kh.cx(0.04, 0.05, 0.02, 0x8a4a50, 0.06, -0.06, 0.385);
      kh.cx(0.52, 0.06, 0.06, 0x1a1410, 0, 0.06, 0.22);
      kh.cx(0.14, 0.14, 0.08, 0xe8858f, -0.17, 0.22, 0.08);
      kh.cx(0.14, 0.14, 0.08, 0xe8858f, 0.17, 0.22, 0.08);
    });

  // Ovelha
  bicho(-10.2, 6.4, { quadril: 0.3, pernas: [[-0.22, 0.32], [0.22, 0.32], [-0.22, -0.32], [0.22, -0.32]], larg: 0.12, corPerna: 0x4a3a30, pescoco: [0, 0.75, 0.48], vel: 0.5 },
    (kc, kh) => {
      kc.cx(0.74, 0.6, 0.92, 0xf6efe0, 0, 0.3, 0);
      kc.cx(0.5, 0.12, 0.6, 0xfffaf0, 0, 0.9, 0);
      kc.cx(0.8, 0.36, 0.5, 0xeee4d0, 0, 0.4, -0.08);
      kc.cx(0.6, 0.4, 0.96, 0xfffaf0, 0, 0.42, 0);
      kh.cx(0.32, 0.36, 0.32, 0x5a4638, 0, -0.22, 0.12);
      kh.cx(0.38, 0.14, 0.32, 0xfffaf0, 0, 0.1, 0.08);
      kh.cx(0.6, 0.08, 0.12, 0x5a4638, 0, -0.02, 0.06);
      kh.cx(0.34, 0.05, 0.05, 0xf3ddb0, 0, 0.0, 0.2);
    });

  // Cabra
  bicho(-11.8, 7.0, { quadril: 0.36, pernas: [[-0.18, 0.3], [0.18, 0.3], [-0.18, -0.3], [0.18, -0.3]], larg: 0.1, corPerna: 0xc8beae, pescoco: [0, 0.8, 0.45], vel: 0.65 },
    (kc, kh) => {
      kc.cx(0.54, 0.46, 0.85, 0xe0d6c4, 0, 0.36, 0);
      kc.cx(0.2, 0.04, 0.85, 0xa89a84, 0, 0.82, 0);
      kc.cx(0.08, 0.16, 0.08, 0xa89a84, 0, 0.78, -0.44);
      kh.cx(0.3, 0.32, 0.36, 0xe0d6c4, 0, -0.1, 0.14);
      kh.cx(0.24, 0.18, 0.12, 0xc8beae, 0, -0.14, 0.36);
      kh.cx(0.08, 0.14, 0.06, 0xa89a84, 0, -0.32, 0.36);
      kh.cx(0.07, 0.24, 0.07, 0x6e5a48, -0.08, 0.18, 0.02);
      kh.cx(0.07, 0.24, 0.07, 0x6e5a48, 0.08, 0.18, 0.02);
      kh.cx(0.55, 0.07, 0.1, 0xe0d6c4, 0, 0.08, 0.08);
      kh.cx(0.32, 0.05, 0.05, 0x1a1410, 0, 0.06, 0.24);
    });

  function definirEstacao(estacao) {
    neve.forEach((m) => { m.visible = estacao === 'winter'; });
  }

  const v = new THREE.Vector2();
  function animar(t, dt) {
    animais.forEach((a) => {
      const { g, corpo, cabeca, pernas } = a;
      if (a.espera > 0) {
        a.espera -= dt;
        a.pasta -= dt;
        // Parado: pasta (cabeça baixa) ou bica o chão
        const alvoCabeca = a.pasta > 0 ? (a.galinha ? 0.6 + Math.sin(t * 18) * 0.4 : 0.7 + Math.sin(t * 5) * 0.08) : 0;
        cabeca.rotation.x += (alvoCabeca - cabeca.rotation.x) * Math.min(1, dt * 8);
        pernas.forEach((p) => { p.rotation.x *= 0.8; });
        corpo.position.y *= 0.8;
        corpo.rotation.z *= 0.8;
        if (a.espera <= 0) {
          const [ax0, az0, ax1, az1] = area;
          a.alvo.set(ax0 + u.aleatorio() * (ax1 - ax0), az0 + u.aleatorio() * (az1 - az0));
        }
        return;
      }
      v.set(a.alvo.x - g.position.x, a.alvo.y - g.position.z);
      const dist = v.length();
      if (dist < 0.1) {
        a.espera = 1.5 + u.aleatorio() * (a.galinha ? 3 : 6);
        a.pasta = u.aleatorio() < 0.7 ? a.espera * 0.8 : 0;
        return;
      }
      // Vira suavemente para o destino e anda
      const angAlvo = Math.atan2(v.x, v.y);
      let dif = angAlvo - g.rotation.y;
      dif = Math.atan2(Math.sin(dif), Math.cos(dif));
      g.rotation.y += dif * Math.min(1, dt * 5);
      const passo = Math.min(dist, a.vel * dt * (Math.abs(dif) > 1 ? 0.3 : 1));
      g.position.x += Math.sin(g.rotation.y) * passo;
      g.position.z += Math.cos(g.rotation.y) * passo;
      cabeca.rotation.x *= 0.85;
      // Passos com balanço
      a.passo += dt * (a.galinha ? 16 : 9);
      pernas.forEach((p, i) => { p.rotation.x = Math.sin(a.passo + (i === 1 || i === 2 ? Math.PI : 0)) * 0.5; });
      corpo.position.y = Math.abs(Math.sin(a.passo)) * (a.galinha ? 0.06 : 0.04);
      corpo.rotation.z = Math.sin(a.passo) * 0.05;
    });
  }

  return { grupo: celeiro, definirEstacao, animar };
}
