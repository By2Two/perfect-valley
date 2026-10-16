import { describe, expect, it } from 'vitest';
import { createDefaultState, isSavedState, normalizeConfig, normalizeState } from './store.js';

describe('normalizeState', () => {
  it('fills a missing save with the default state', () => {
    expect(normalizeState(null)).toEqual(createDefaultState());
  });

  it('migrates saves written with the legacy Portuguese keys', () => {
    const state = normalizeState({
      itens: { fishing: { eel: true } },
      amigos: { Abigail: 8 },
      monstros: { slimes: 12 },
      habilidades: { farming: 7 },
      obeliscos: { 'earth-obelisk': true },
      estrelas: { 'stardrop-1': true },
      nozes: { 'island-east-1': true },
      relogio: true,
      atualizadoEm: 1700000000000,
    });
    expect(state.items.fishing.eel).toBe(true);
    expect(state.friends.Abigail).toBe(8);
    expect(state.monsters.slimes).toBe(12);
    expect(state.skills.farming).toBe(7);
    expect(state.obelisks['earth-obelisk']).toBe(true);
    expect(state.stardrops['stardrop-1']).toBe(true);
    expect(state.walnuts['island-east-1']).toBe(true);
    expect(state.clock).toBe(true);
    expect(state.updatedAt).toBe(1700000000000);
  });

  it('ignores values that are not plain objects', () => {
    const state = normalizeState({ friends: ['Abigail'], items: 'broken' });
    expect(state.friends).toEqual({});
    expect(state.items).toEqual(createDefaultState().items);
  });
});

describe('isSavedState', () => {
  it('accepts current and legacy backups', () => {
    expect(isSavedState({ items: {} })).toBe(true);
    expect(isSavedState({ itens: {} })).toBe(true);
  });

  it('rejects unrelated files', () => {
    expect(isSavedState(null)).toBe(false);
    expect(isSavedState({ unrelated: true })).toBe(false);
  });
});

describe('normalizeConfig', () => {
  it('uses the defaults when nothing was saved', () => {
    expect(normalizeConfig(null)).toEqual({ language: 'en', season: 'auto', hour: 'auto', animations: true, entry: null });
  });

  it('migrates the legacy Portuguese keys and values', () => {
    const config = normalizeConfig({ idioma: 'pt', estacao: 'winter', hora: 'noite', animacoes: false, entrada: 'conta' });
    expect(config).toEqual({ language: 'pt', season: 'winter', hour: 'night', animations: false, entry: 'account' });
  });
});
