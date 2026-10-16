import { SHEET } from './catalog.js';

const itemsByCollectionAndId = {};
const itemsByName = new Map();

for (const [collection, items] of Object.entries(SHEET.collections)) {
  itemsByCollectionAndId[collection] = Object.fromEntries(items.map((item) => [item.id, item]));
  for (const item of items) {
    const lowerCaseName = item.name.toLowerCase();
    if (!itemsByName.has(lowerCaseName)) {
      itemsByName.set(lowerCaseName, item);
    }
  }
}

export const iconUrl = (hash) => `${import.meta.env.BASE_URL}icons/${hash}.png`;
export const iconHashOf = (collection, id) => itemsByCollectionAndId[collection]?.[id]?.icon;
export const findItemByName = (name) => itemsByName.get(String(name).toLowerCase());
