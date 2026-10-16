import { describe, expect, it } from 'vitest';
import { resolveSeason, seasonForDate } from './season.js';

describe('seasonForDate', () => {
  it('maps each calendar month to a season in the northern hemisphere', () => {
    expect(seasonForDate(new Date(2026, 0, 15), 'America/New_York')).toBe('winter');
    expect(seasonForDate(new Date(2026, 3, 15), 'Europe/Lisbon')).toBe('spring');
    expect(seasonForDate(new Date(2026, 6, 15), 'Europe/Paris')).toBe('summer');
    expect(seasonForDate(new Date(2026, 9, 15), 'America/Chicago')).toBe('fall');
    expect(seasonForDate(new Date(2026, 11, 15), 'Europe/London')).toBe('winter');
  });

  it('inverts the seasons in the southern hemisphere', () => {
    expect(seasonForDate(new Date(2026, 0, 15), 'America/Sao_Paulo')).toBe('summer');
    expect(seasonForDate(new Date(2026, 6, 15), 'America/Argentina/Buenos_Aires')).toBe('winter');
    expect(seasonForDate(new Date(2026, 9, 15), 'Australia/Sydney')).toBe('spring');
  });
});

describe('resolveSeason', () => {
  it('keeps a season chosen by the player', () => {
    expect(resolveSeason('summer')).toBe('summer');
  });

  it('follows the real date when the season is automatic', () => {
    expect(resolveSeason('auto')).toBe(seasonForDate());
  });
});
