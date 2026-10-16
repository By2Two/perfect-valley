import sheet from './data/sheet.json';

export const SHEET = sheet;

export const SKILLS = ['farming', 'mining', 'foraging', 'fishing', 'combat'];
export const EXTRA_COLLECTIONS = ['museum', 'gear', 'tailoring', 'powers', 'statues', 'bestiary'];
export const MAX_FARMER_LEVEL = 25;

export const CATEGORIES = [
  { id: 'shipping', weight: 15, kind: 'collection', collection: 'shipping', icon: { collection: 'shipping', id: 'parsnip' } },
  { id: 'obelisks', weight: 4, kind: 'list', items: sheet.obelisks, key: 'obelisks', icon: { pixel: 'obelisk' } },
  { id: 'clock', weight: 10, kind: 'single', icon: { pixel: 'clock' } },
  { id: 'monsters', weight: 10, kind: 'goals', icon: { collection: 'bestiary', id: 'green-slime' } },
  { id: 'friends', weight: 11, kind: 'villagers', icon: { pixel: 'largeHeart' } },
  { id: 'level', weight: 5, kind: 'skills', icon: { pixel: 'star' } },
  { id: 'stardrops', weight: 10, kind: 'list', items: sheet.stardrops, key: 'stardrops', icon: { pixel: 'fruit' } },
  { id: 'cooking', weight: 10, kind: 'collection', collection: 'cooking', icon: { collection: 'cooking', id: 'pink-cake' } },
  { id: 'crafting', weight: 10, kind: 'collection', collection: 'crafting', icon: { collection: 'crafting', id: 'chest' } },
  { id: 'fishing', weight: 10, kind: 'collection', collection: 'fishing', icon: { collection: 'fishing', id: 'pufferfish' } },
  { id: 'walnuts', weight: 5, kind: 'walnuts', icon: { pixel: 'walnut' } },
];

export const EXTRA_COLLECTION_ICONS = {
  museum: { collection: 'museum', id: 'ancient-doll' },
  gear: { collection: 'gear', id: 'galaxy-sword' },
  tailoring: { collection: 'tailoring', id: 'abigail-s-bow' },
  powers: { collection: 'powers', id: 'rusty-key' },
  statues: { collection: 'statues', id: 'rarecrow-1' },
  bestiary: { collection: 'bestiary', id: 'green-slime' },
};
