import { CATEGORIES, MAX_FARMER_LEVEL, SHEET, SKILLS } from './catalog.js';

const BACHELOR_HEARTS = 8;
const FULL_HEARTS = 10;
const SKILL_POINTS_PER_LEVEL = 2;

export const TOTAL_WALNUTS = SHEET.walnuts.reduce((total, walnut) => total + walnut.points, 0);

export const requiredHearts = (villager) => (villager.isMarriageCandidate ? BACHELOR_HEARTS : FULL_HEARTS);

export function farmerLevel(state) {
  const skillPoints = SKILLS.reduce((total, skill) => total + (state.skills[skill] || 0), 0);
  return Math.min(MAX_FARMER_LEVEL, Math.floor(skillPoints / SKILL_POINTS_PER_LEVEL));
}

export function countCollected(state, collection) {
  const checked = state.items[collection] || {};
  return SHEET.collections[collection].filter((item) => checked[item.id]).length;
}

const COMPLETED_COUNTERS = {
  collection: (category, state) => countCollected(state, category.collection),
  list: (category, state) => category.items.filter((item) => state[category.key][item.id]).length,
  single: (category, state) => (state.clock ? 1 : 0),
  goals: (category, state) => SHEET.monsterGoals.filter((monster) => (state.monsters[monster.id] || 0) >= monster.goal).length,
  villagers: (category, state) => SHEET.villagers.filter((villager) => (state.friends[villager.name] || 0) >= requiredHearts(villager)).length,
  skills: (category, state) => farmerLevel(state),
  walnuts: (category, state) => SHEET.walnuts.reduce((total, walnut) => total + (state.walnuts[walnut.id] ? walnut.points : 0), 0),
};

const TOTAL_COUNTERS = {
  collection: (category) => SHEET.collections[category.collection].length,
  list: (category) => category.items.length,
  single: () => 1,
  goals: () => SHEET.monsterGoals.length,
  villagers: () => SHEET.villagers.length,
  skills: () => MAX_FARMER_LEVEL,
  walnuts: () => TOTAL_WALNUTS,
};

export const completedCount = (category, state) => COMPLETED_COUNTERS[category.kind]?.(category, state) ?? 0;
export const totalOf = (category) => TOTAL_COUNTERS[category.kind]?.(category) ?? 1;
export const completionFraction = (category, state) => completedCount(category, state) / totalOf(category);
export const perfectionPercent = (state) => CATEGORIES.reduce((total, category) => total + category.weight * completionFraction(category, state), 0);

const markFromSpreadsheet = (entries, checked) => {
  entries
    .filter((entry) => entry.fromSpreadsheet)
    .forEach((entry) => {
      checked[entry.id] = true;
    });
};

export function applySpreadsheetProgress(state) {
  for (const [collection, items] of Object.entries(SHEET.collections)) {
    state.items[collection] ??= {};
    markFromSpreadsheet(items, state.items[collection]);
  }
  markFromSpreadsheet(SHEET.walnuts, state.walnuts);
  markFromSpreadsheet(SHEET.stardrops, state.stardrops);
  markFromSpreadsheet(SHEET.obelisks, state.obelisks);
  SHEET.villagers
    .filter((villager) => villager.fromSpreadsheet)
    .forEach((villager) => {
      state.friends[villager.name] = Math.max(state.friends[villager.name] || 0, requiredHearts(villager));
    });
  SHEET.monsterGoals
    .filter((monster) => monster.fromSpreadsheet)
    .forEach((monster) => {
      state.monsters[monster.id] = Math.max(state.monsters[monster.id] || 0, monster.goal);
    });
  if (SHEET.fromSpreadsheet.clock) {
    state.clock = true;
  }
  for (const [skill, level] of Object.entries(SHEET.fromSpreadsheet.skills)) {
    state.skills[skill] = Math.max(state.skills[skill] || 0, level);
  }
}
