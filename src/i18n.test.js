import { describe, expect, it } from 'vitest';
import { DICTIONARY } from './dictionary.js';
import { t, translateTerm } from './i18n.js';

describe('t', () => {
  it('returns the english text by default', () => {
    expect(t('hud.perfection')).toBe('Perfection');
  });

  it('replaces the placeholders with the given variables', () => {
    expect(t('panel.progress', { a: 3, b: 10 })).toBe('3 of 10');
  });

  it('falls back to the key when the text does not exist', () => {
    expect(t('missing.key')).toBe('missing.key');
  });
});

describe('translateTerm', () => {
  it('keeps item terms untouched while the language is english', () => {
    expect(translateTerm('Fruit Trees')).toBe('Fruit Trees');
  });
});

describe('dictionary', () => {
  it('has a portuguese text for every english text', () => {
    const missing = Object.keys(DICTIONARY.en).filter((key) => !(key in DICTIONARY.pt));
    expect(missing).toEqual([]);
  });
});
