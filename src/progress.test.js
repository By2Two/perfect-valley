import { describe, expect, it } from 'vitest';
import { CATEGORIES, SHEET, SKILLS } from './catalog.js';
import { createDefaultState } from './store.js';
import { applySpreadsheetProgress, completionFraction, countCollected, farmerLevel, perfectionPercent, requiredHearts, totalOf } from './progress.js';

const maxedSkills = () => Object.fromEntries(SKILLS.map((skill) => [skill, 10]));

describe('progress', () => {
  it('starts a new save at zero percent perfection', () => {
    expect(perfectionPercent(createDefaultState())).toBe(0);
  });

  it('weighs every category so that a complete save reaches one hundred percent', () => {
    expect(CATEGORIES.reduce((total, category) => total + category.weight, 0)).toBe(100);
  });

  it('requires fewer hearts from marriage candidates', () => {
    expect(requiredHearts({ isMarriageCandidate: true })).toBe(8);
    expect(requiredHearts({ isMarriageCandidate: false })).toBe(10);
  });

  it('derives the farmer level from half of the skill levels', () => {
    const state = createDefaultState();
    state.skills = maxedSkills();
    expect(farmerLevel(state)).toBe(25);
    state.skills = { ...maxedSkills(), combat: 9 };
    expect(farmerLevel(state)).toBe(24);
  });

  it('counts only the collection items that were checked', () => {
    const state = createDefaultState();
    const [first, second] = SHEET.collections.fishing;
    state.items.fishing[first.id] = true;
    state.items.fishing[second.id] = true;
    expect(countCollected(state, 'fishing')).toBe(2);
  });

  it('completes the clock category once the clock is built', () => {
    const clockCategory = CATEGORIES.find((category) => category.id === 'clock');
    const state = createDefaultState();
    expect(completionFraction(clockCategory, state)).toBe(0);
    state.clock = true;
    expect(completionFraction(clockCategory, state)).toBe(1);
  });

  it('treats every category total as positive', () => {
    CATEGORIES.forEach((category) => expect(totalOf(category)).toBeGreaterThan(0));
  });

  it('imports the checks saved in the spreadsheet without lowering existing progress', () => {
    const state = createDefaultState();
    state.skills.farming = 10;
    state.items.shipping.manual = true;
    applySpreadsheetProgress(state);
    expect(state.skills.farming).toBe(10);
    expect(state.items.shipping.manual).toBe(true);
    const checkedShipping = SHEET.collections.shipping.filter((item) => item.fromSpreadsheet);
    checkedShipping.forEach((item) => expect(state.items.shipping[item.id]).toBe(true));
  });
});
