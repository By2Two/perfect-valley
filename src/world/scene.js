import * as THREE from 'three';
import { construirFazenda } from './farm.js';

const ZOOM_MIN = 0.75;
const ZOOM_MAX = 3.2;
const PAN_MAX = 13;
const HORAS_FIXAS = { dia: 12, tarde: 18.4, noite: 22.5 };

const CEU = {
  dia: { topo: [0x7e, 0xc8, 0xe3], base: [0xd4, 0xf0, 0xf7] },
  tarde: { topo: [0xe8, 0x8a, 0x5c], base: [0xff, 0xd5, 0x9a] },
  noite: { topo: [0x14, 0x1a, 0x3e], base: [0x3a, 0x3f, 0x73] },
};
const misturar = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const rgb = (c) => `rgb(${c.join(',')})`;

/**
 * Mundo 3D: renderiza em baixa resolução (pixel art), com zoom (roda, pinça ou botões),
 * arrastar para mover, câmera que acompanha o mouse suavemente e ciclo de dia e noite.
 */
export function criarCena(canvas, { aoClicar, aoPassar }) {
  const ESCALA = 3;
  const sistemaReduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animacoes = !sistemaReduz;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;

  const cena = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 400);
  const fazenda = construirFazenda(cena);

  // ---------- Câmera ----------
  const AZ = Math.PI / 4;
  const EL = 0.6;
  const DIST = 60;
  const foco = new THREE.Vector3();
  const pan = new THREE.Vector3();
  const panAlvo = new THREE.Vector3();
  const mouse = new THREE.Vector2();
  const parallax = new THREE.Vector2();
  let zoom = 1;
  let zoomAlvo = 1;
  let desloc = 0;
  let deslocAlvo = 0;
  let vista = 15;

  function enquadrar() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspecto = w / h;
    vista = aspecto < 1 ? (28 / aspecto) * 0.6 : 17.4;
    const largura = vista * aspecto;
    // Com o painel aberto, a fazenda desliza para o lado livre da tela
    const dx = aspecto < 1 ? 0 : desloc * largura * 0.42;
    const dy = aspecto < 1 ? desloc * vista * -0.5 : 0;
    Object.assign(camera, { left: -largura + dx, right: largura + dx, top: vista + dy, bottom: -vista + dy, zoom });
    camera.updateProjectionMatrix();
  }
  function posicionar() {
    const az = AZ + parallax.x * 0.09;
    const el = EL + parallax.y * 0.05;
    foco.copy(pan);
    camera.position.set(
      foco.x + DIST * Math.cos(el) * Math.sin(az),
      foco.y + DIST * Math.sin(el),
      foco.z + DIST * Math.cos(el) * Math.cos(az),
    );
    camera.lookAt(foco);
  }
  function limitarPan(v) {
    if (v.length() > PAN_MAX) v.setLength(PAN_MAX);
    v.y = 0;
  }
  function redimensionar() {
    renderer.setSize(Math.ceil(window.innerWidth / ESCALA), Math.ceil(window.innerHeight / ESCALA), false);
    enquadrar();
  }
  window.addEventListener('resize', redimensionar);
  redimensionar();
  posicionar();

  // Ponto do chão sob o cursor (para dar zoom na direção do mouse)
  const ray = new THREE.Raycaster();
  const chao = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function ndc(ev) {
    const r = canvas.getBoundingClientRect();
    return new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  }
  function pontoNoChao(p) {
    ray.setFromCamera(p, camera);
    const alvo = new THREE.Vector3();
    return ray.ray.intersectPlane(chao, alvo) ? alvo : null;
  }
  function aplicarZoom(fator, p) {
    const novo = THREE.MathUtils.clamp(zoomAlvo * fator, ZOOM_MIN, ZOOM_MAX);
    const real = novo / zoomAlvo;
    if (p && real !== 1) {
      const sob = pontoNoChao(p);
      if (sob) {
        panAlvo.add(sob.sub(panAlvo).multiplyScalar(1 - 1 / real));
        limitarPan(panAlvo);
      }
    }
    zoomAlvo = novo;
  }

  // ---------- Entrada: hover, clique, arrastar, roda, pinça ----------
  const ponteiros = new Map();
  let arrastou = false;
  let ultimo = null;
  let distPinca = 0;
  let sobre = null;

  function alvoClicavel(p) {
    ray.setFromCamera(p, camera);
    const hits = ray.intersectObjects(fazenda.clicaveis, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !o.userData.cat) o = o.parent;
    return o;
  }

  canvas.addEventListener('pointerdown', (ev) => {
    canvas.setPointerCapture(ev.pointerId);
    ponteiros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    arrastou = false;
    ultimo = { x: ev.clientX, y: ev.clientY };
    if (ponteiros.size === 2) {
      const [a, b] = [...ponteiros.values()];
      distPinca = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
    const p = ndc(ev);
    mouse.copy(p);
    if (ponteiros.has(ev.pointerId)) {
      ponteiros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (ponteiros.size === 2) {
        const [a, b] = [...ponteiros.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (distPinca) aplicarZoom(d / distPinca);
        distPinca = d;
        arrastou = true;
        return;
      }
      const dx = ev.clientX - ultimo.x;
      const dy = ev.clientY - ultimo.y;
      if (Math.abs(dx) + Math.abs(dy) > 4 || arrastou) {
        arrastou = true;
        const unidade = (2 * vista) / (window.innerHeight * zoom);
        const direita = new THREE.Vector3(Math.cos(AZ), 0, -Math.sin(AZ));
        const frente = new THREE.Vector3(-Math.sin(AZ), 0, -Math.cos(AZ));
        panAlvo.addScaledVector(direita, -dx * unidade).addScaledVector(frente, (dy * unidade) / Math.sin(EL));
        limitarPan(panAlvo);
        ultimo = { x: ev.clientX, y: ev.clientY };
        canvas.style.cursor = 'grabbing';
      }
      return;
    }
    const o = alvoClicavel(p);
    if (o !== sobre) {
      if (sobre) sobre.scale.setScalar(sobre.userData.escala || 1);
      sobre = o;
      if (o) {
        o.userData.escala ??= o.scale.x;
        o.scale.setScalar(o.userData.escala * 1.06);
      }
    }
    canvas.style.cursor = o ? 'pointer' : 'grab';
    aoPassar(o ? o.userData.cat : null, ev.clientX, ev.clientY);
  });
  function soltar(ev) {
    ponteiros.delete(ev.pointerId);
    if (ponteiros.size < 2) distPinca = 0;
    canvas.style.cursor = 'grab';
  }
  canvas.addEventListener('pointerup', (ev) => {
    const eraClique = !arrastou && ponteiros.size === 1;
    soltar(ev);
    if (eraClique) {
      const o = alvoClicavel(ndc(ev));
      if (o) aoClicar(o.userData.cat);
    }
  });
  canvas.addEventListener('pointercancel', soltar);
  canvas.addEventListener('pointerleave', () => {
    aoPassar(null);
    mouse.set(0, 0);
  });
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    aplicarZoom(Math.exp(-ev.deltaY * 0.0015), ndc(ev));
  }, { passive: false });
  canvas.addEventListener('dblclick', (ev) => aplicarZoom(1.6, ndc(ev)));

  // ---------- Hora do dia e céu ----------
  let modoHora = 'auto';
  function horaAtual() {
    const fixa = new URLSearchParams(window.location.search).get('hora');
    if (fixa !== null) return Number(fixa);
    if (HORAS_FIXAS[modoHora] !== undefined) return HORAS_FIXAS[modoHora];
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }
  let ultimaLuz = -1;
  let noite = false;
  function aplicarHora() {
    const h = horaAtual();
    fazenda.definirHora(h);
    const t = (h - 6) / 14;
    const luz = t > 0 && t < 1 ? Math.min(1, Math.sin(t * Math.PI) * 1.6) : 0;
    if (Math.abs(luz - ultimaLuz) < 0.002) return;
    ultimaLuz = luz;
    const tarde = luz > 0 && luz < 0.6 ? (1 - Math.abs(luz - 0.3) / 0.3) * 0.85 : 0;
    const topo = misturar(misturar(CEU.noite.topo, CEU.dia.topo, luz), CEU.tarde.topo, tarde);
    const base = misturar(misturar(CEU.noite.base, CEU.dia.base, luz), CEU.tarde.base, tarde);
    const raiz = document.documentElement.style;
    raiz.setProperty('--ceu-topo', rgb(topo));
    raiz.setProperty('--ceu-base', rgb(base));
    raiz.setProperty('--noite', String(1 - Math.min(1, luz * 2.5)));
    raiz.setProperty('--sol-y', `${Math.round(70 - Math.sin(Math.max(0, Math.min(1, t)) * Math.PI) * 55)}%`);
    noite = fazenda.definirLuz(luz, Math.max(0.15, Math.min(Math.PI - 0.15, t * Math.PI)));
  }

  // ---------- Loop ----------
  const relogio = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(relogio.getDelta(), 0.1);
    const t = relogio.elapsedTime;
    aplicarHora();
    const k = animacoes ? Math.min(1, dt * 5) : 1;
    zoom += (zoomAlvo - zoom) * k;
    desloc += (deslocAlvo - desloc) * k;
    pan.lerp(panAlvo, k);
    if (animacoes) parallax.lerp(mouse, Math.min(1, dt * 2.5));
    else parallax.set(0, 0);
    enquadrar();
    posicionar();
    fazenda.animar(t, dt, animacoes, noite);
    renderer.render(cena, camera);
    const raiz = document.documentElement.style;
    raiz.setProperty('--px', parallax.x.toFixed(3));
    raiz.setProperty('--py', parallax.y.toFixed(3));
  });

  return {
    atualizar: (s) => fazenda.atualizarProgresso(s),
    definirEstacao: (e) => fazenda.definirEstacao(e),
    definirHora: (m) => { modoHora = m; ultimaLuz = -1; },
    definirAnimacoes: (a) => { animacoes = a && !sistemaReduz; },
    abrirEspaco: (aberto) => { deslocAlvo = aberto ? 1 : 0; },
    aproximar: () => aplicarZoom(1.35),
    afastar: () => aplicarZoom(1 / 1.35),
    centralizar: () => { zoomAlvo = 1; panAlvo.set(0, 0, 0); },
  };
}
