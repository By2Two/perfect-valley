import { SHEET, SKILLS } from './catalog.js';
import { isValidLayout } from './farmSave.js';

const SAVE_STORAGE_KEY = 'perfect-valley:save';
const CONFIG_STORAGE_KEY = 'perfect-valley:config';
const FARM_STORAGE_KEY = 'perfect-valley:farm';
const LEGACY_SAVE_STORAGE_KEY = 'rumo-perfeicao:save';
const LEGACY_CONFIG_STORAGE_KEY = 'rumo-perfeicao:config';
const SAVE_VERSION = 2;

const LEGACY_SAVE_KEYS = {
  itens: 'items',
  amigos: 'friends',
  monstros: 'monsters',
  habilidades: 'skills',
  obeliscos: 'obelisks',
  estrelas: 'stardrops',
  nozes: 'walnuts',
  relogio: 'clock',
  atualizadoEm: 'updatedAt',
};
const LEGACY_CONFIG_KEYS = { idioma: 'language', estacao: 'season', hora: 'hour', animacoes: 'animations' };
const LEGACY_HOUR_VALUES = { dia: 'day', tarde: 'sunset', noite: 'night' };
const PORTUGUESE_LANGUAGE_PATTERN = /^pt(-|_|$)/i;
const FALLBACK_LANGUAGE = 'en';

const DEFAULT_CONFIG = { language: null, season: 'auto', hour: 'auto', animations: true, pixelEffect: 'strong' };

export function detectLanguage() {
  const preferred = typeof navigator === 'undefined' ? '' : navigator.language || navigator.languages?.[0] || '';
  return PORTUGUESE_LANGUAGE_PATTERN.test(preferred) ? 'pt' : FALLBACK_LANGUAGE;
}

const asPlainObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const renameLegacyKeys = (raw, legacyKeys) =>
  Object.fromEntries(Object.entries(asPlainObject(raw)).map(([key, value]) => [legacyKeys[key] ?? key, value]));

function renameKey(object, from, to) {
  const { [from]: value, ...rest } = object;
  return value === undefined ? { ...object } : { ...rest, [to]: rest[to] ?? value };
}

export function createDefaultState() {
  return {
    version: SAVE_VERSION,
    items: Object.fromEntries(Object.keys(SHEET.collections).map((collection) => [collection, {}])),
    friends: {},
    monsters: {},
    skills: Object.fromEntries(SKILLS.map((skill) => [skill, 0])),
    masteries: {},
    obelisks: {},
    stardrops: {},
    walnuts: {},
    clock: false,
    updatedAt: 0,
  };
}

export function normalizeState(raw) {
  const defaults = createDefaultState();
  const source = renameLegacyKeys(raw, LEGACY_SAVE_KEYS);
  const items = asPlainObject(source.items);
  return {
    ...defaults,
    items: Object.fromEntries(Object.keys(defaults.items).map((collection) => [collection, { ...asPlainObject(items[collection]) }])),
    friends: renameKey(asPlainObject(source.friends), 'Elliot', 'Elliott'),
    monsters: { ...asPlainObject(source.monsters) },
    skills: { ...defaults.skills, ...asPlainObject(source.skills) },
    masteries: { ...asPlainObject(source.masteries) },
    obelisks: { ...asPlainObject(source.obelisks) },
    stardrops: { ...asPlainObject(source.stardrops) },
    walnuts: { ...asPlainObject(source.walnuts) },
    clock: Boolean(source.clock),
    updatedAt: Number(source.updatedAt) || 0,
  };
}

export function isSavedState(raw) {
  const { items } = renameLegacyKeys(raw, LEGACY_SAVE_KEYS);
  return Boolean(items) && typeof items === 'object';
}

export function normalizeConfig(raw) {
  const stored = renameLegacyKeys(raw, LEGACY_CONFIG_KEYS);
  return {
    ...DEFAULT_CONFIG,
    ...stored,
    language: stored.language ?? detectLanguage(),
    hour: LEGACY_HOUR_VALUES[stored.hour] ?? stored.hour ?? DEFAULT_CONFIG.hour,
    pixelEffect: stored.pixelEffect ?? DEFAULT_CONFIG.pixelEffect,
  };
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

let state = normalizeState(readJson(SAVE_STORAGE_KEY) ?? readJson(LEGACY_SAVE_STORAGE_KEY));
const listeners = new Set();

export const getState = () => state;

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function persist() {
  writeJson(SAVE_STORAGE_KEY, state);
}

function notifyListeners() {
  listeners.forEach((listener) => listener(state));
}

export function update(mutate) {
  mutate(state);
  state.updatedAt = Date.now();
  persist();
  notifyListeners();
}

export function replaceState(incomingState, { touch = false } = {}) {
  state = normalizeState(incomingState);
  if (touch) {
    state.updatedAt = Date.now();
  }
  persist();
  notifyListeners();
}

let config = normalizeConfig(readJson(CONFIG_STORAGE_KEY) ?? readJson(LEGACY_CONFIG_STORAGE_KEY));
const configListeners = new Set();

export const getConfig = () => config;

export function setConfig(partial) {
  config = { ...config, ...partial };
  writeJson(CONFIG_STORAGE_KEY, config);
  configListeners.forEach((listener) => listener(config));
}

export function onConfig(listener) {
  configListeners.add(listener);
  return () => configListeners.delete(listener);
}

const storedLayout = readJson(FARM_STORAGE_KEY);
let farmLayout = isValidLayout(storedLayout) ? storedLayout : null;
const farmListeners = new Set();

export const getFarmLayout = () => farmLayout;

export function setFarmLayout(layout) {
  if (layout && !writeJson(FARM_STORAGE_KEY, layout)) {
    return false;
  }
  if (!layout) {
    localStorage.removeItem(FARM_STORAGE_KEY);
  }
  farmLayout = layout;
  farmListeners.forEach((listener) => listener(farmLayout));
  return true;
}

export function onFarmLayout(listener) {
  farmListeners.add(listener);
  return () => farmListeners.delete(listener);
}
