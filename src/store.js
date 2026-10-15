import { SHEET, SKILLS } from './data.js';

const CHAVE_SAVE = 'rumo-perfeicao:save';
const CHAVE_CONFIG = 'rumo-perfeicao:config';

export function estadoPadrao() {
  return {
    versao: 2,
    itens: Object.fromEntries(Object.keys(SHEET.colecoes).map((c) => [c, {}])),
    amigos: {},
    monstros: {},
    habilidades: Object.fromEntries(SKILLS.map((k) => [k, 0])),
    obeliscos: {},
    estrelas: {},
    nozes: {},
    relogio: false,
    atualizadoEm: 0,
  };
}

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

export function normalizar(bruto) {
  const p = estadoPadrao();
  const b = obj(bruto);
  const itens = obj(b.itens);
  return {
    ...p,
    itens: Object.fromEntries(Object.keys(p.itens).map((c) => [c, { ...obj(itens[c]) }])),
    amigos: { ...obj(b.amigos) },
    monstros: { ...obj(b.monstros) },
    habilidades: { ...p.habilidades, ...obj(b.habilidades) },
    obeliscos: { ...obj(b.obeliscos) },
    estrelas: { ...obj(b.estrelas) },
    nozes: { ...obj(b.nozes) },
    relogio: Boolean(b.relogio),
    atualizadoEm: Number(b.atualizadoEm) || 0,
  };
}

function lerJSON(chave) {
  try {
    return JSON.parse(localStorage.getItem(chave));
  } catch {
    return null;
  }
}
function gravarJSON(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* sem espaço ou navegação privada */
  }
}

// ---------- Save do jogador ----------
let estado = normalizar(lerJSON(CHAVE_SAVE));
const ouvintes = new Set();
let salvarNuvem = null;
let timer = null;

export const getState = () => estado;
export function subscribe(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}
function persistir({ nuvem = true } = {}) {
  gravarJSON(CHAVE_SAVE, estado);
  if (nuvem && salvarNuvem) {
    clearTimeout(timer);
    timer = setTimeout(() => salvarNuvem(estado), 900);
  }
}
/** update(s => { s.itens.fishing.eel = true }) */
export function update(fn) {
  fn(estado);
  estado.atualizadoEm = Date.now();
  persistir();
  ouvintes.forEach((f) => f(estado));
}
export function replaceState(novo, { tocar = false, nuvem = true } = {}) {
  estado = normalizar(novo);
  if (tocar) estado.atualizadoEm = Date.now();
  persistir({ nuvem });
  ouvintes.forEach((f) => f(estado));
}
export function setCloudSaver(fn) {
  salvarNuvem = fn;
}

// ---------- Preferências deste dispositivo ----------
const CONFIG_PADRAO = { idioma: 'en', estacao: 'spring', hora: 'auto', animacoes: true, entrada: null };
let config = { ...CONFIG_PADRAO, ...obj(lerJSON(CHAVE_CONFIG)) };
const ouvintesConfig = new Set();

export const getConfig = () => config;
export function setConfig(parcial) {
  config = { ...config, ...parcial };
  gravarJSON(CHAVE_CONFIG, config);
  ouvintesConfig.forEach((f) => f(config));
}
export function onConfig(fn) {
  ouvintesConfig.add(fn);
  return () => ouvintesConfig.delete(fn);
}
