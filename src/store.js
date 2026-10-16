import { SHEET, SKILLS } from './catalog.js';

const SAVE_STORAGE_KEY = 'perfect-valley:save';
const CONFIG_STORAGE_KEY = 'perfect-valley:config';
const LEGACY_SAVE_STORAGE_KEY = 'rumo-perfeicao:save';
const LEGACY_CONFIG_STORAGE_KEY = 'rumo-perfeicao:config';
const SAVE_VERSION = 2;
const CLOUD_SAVE_DELAY_MS = 900;

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
const LEGACY_CONFIG_KEYS = { idioma: 'language', estacao: 'season', hora: 'hour', animacoes: 'animations', entrada: 'entry' };
const LEGACY_HOUR_VALUES = { dia: 'day', tarde: 'sunset', noite: 'night' };
const LEGACY_ENTRY_VALUES = { conta: 'account' };

const DEFAULT_CONFIG = { language: 'en', season: 'spring', hour: 'auto', animations: true, entry: null };

const asPlainObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const renameLegacyKeys = (raw, legacyKeys) =>
  Object.fromEntries(Object.entries(asPlainObject(raw)).map(([key, value]) => [legacyKeys[key] ?? key, value]));

export function createDefaultState() {
  return {
    version: SAVE_VERSION,
    items: Object.fromEntries(Object.keys(SHEET.collections).map((collection) => [collection, {}])),
    friends: {},
    monsters: {},
    skills: Object.fromEntries(SKILLS.map((skill) => [skill, 0])),
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
    friends: { ...asPlainObject(source.friends) },
    monsters: { ...asPlainObject(source.monsters) },
    skills: { ...defaults.skills, ...asPlainObject(source.skills) },
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
    hour: LEGACY_HOUR_VALUES[stored.hour] ?? stored.hour ?? DEFAULT_CONFIG.hour,
    entry: LEGACY_ENTRY_VALUES[stored.entry] ?? stored.entry ?? DEFAULT_CONFIG.entry,
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
let cloudSaver = null;
let cloudSaveTimer = null;
const listeners = new Set();

export const getState = () => state;

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function persist({ cloud = true } = {}) {
  writeJson(SAVE_STORAGE_KEY, state);
  if (cloud && cloudSaver) {
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => cloudSaver(state), CLOUD_SAVE_DELAY_MS);
  }
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

export function replaceState(incomingState, { touch = false, cloud = true } = {}) {
  state = normalizeState(incomingState);
  if (touch) {
    state.updatedAt = Date.now();
  }
  persist({ cloud });
  notifyListeners();
}

export function setCloudSaver(saver) {
  cloudSaver = saver;
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
