import OBJECT_NAMES from './data/objectNames.json';
import { SHEET, SKILLS } from './catalog.js';

const POINTS_PER_HEART = 250;
const SKILL_XP_INDEX = { farming: 0, fishing: 1, foraging: 2, mining: 3, combat: 4 };
const LEVEL_THRESHOLDS = [100, 380, 770, 1300, 2150, 3300, 4800, 6900, 10000, 15000];
const STARDROP_MAIL = {
  'stardew-valley-fair': 'CF_Fair',
  'the-mines': 'CF_Mines',
  marriage: 'CF_Spouse',
  'the-sewers': 'CF_Sewer',
  'the-secret-woods': 'CF_Statue',
  'master-angler': 'CF_Fish',
  'a-complete-collection': 'museumComplete',
};
const OBELISK_BUILDINGS = {
  'earth-obelisk': 'Earth Obelisk',
  'water-obelisk': 'Water Obelisk',
  'desert-obelisk': 'Desert Obelisk',
  'island-obelisk': 'Island Obelisk',
};
const MONSTER_GOALS = {
  slimes: ['Green Slime', 'Frost Jelly', 'Sludge', 'Tiger Slime'],
  'void-spirits': ['Shadow Guy', 'Shadow Brute', 'Shadow Shaman', 'Shadow Sniper'],
  bats: ['Bat', 'Frost Bat', 'Lava Bat', 'Iridium Bat'],
  skeletons: ['Skeleton', 'Skeleton Mage'],
  'cave-insects': ['Bug', 'Cave Fly', 'Fly', 'Grub', 'Mutant Fly', 'Mutant Grub'],
  duggies: ['Duggy', 'Magma Duggy'],
  'dust-sprites': ['Dust Spirit'],
  'rock-crabs': ['Rock Crab', 'Lava Crab', 'Iridium Crab'],
  mummies: ['Mummy'],
  'pepper-rex': ['Pepper Rex'],
  serpents: ['Serpent', 'Royal Serpent'],
  'magma-sprites': ['Magma Sprite', 'Magma Sparker'],
};
const POWER_MAIL = {
  'forest-magic': 'canReadJunimoText',
  'dwarvish-translation-guide': 'HasDwarvishTranslationGuide',
  'rusty-key': 'HasRustyKey',
  'club-card': 'HasClubCard',
  'special-charm': 'HasSpecialCharm',
  'skull-key': 'HasSkullKey',
  'magnifying-glass': 'HasMagnifyingGlass',
  'dark-talisman': 'HasDarkTalisman',
  'magic-ink': 'HasMagicInk',
  'key-to-the-town': 'HasTownKey',
};
const POWER_EVENTS = { 'bear-s-knowledge': '2120303', 'spring-onion-mastery': '3910974' };
const POWER_BOOKS = {
  'price-catalogue': 'Book_PriceCatalogue',
  'mapping-cave-systems': 'Book_Marlon',
  'way-of-the-wind-pt-1': 'Book_Speed',
  'way-of-the-wind-pt-2': 'Book_Speed2',
  'monster-compendium': 'Book_Void',
  'friendship-101': 'Book_Friendship',
  'jack-be-nimble-jack-be-thick': 'Book_Defense',
  'woody-s-secret': 'Book_Woodcutting',
  'raccoon-journal': 'Book_WildSeeds',
  'jewels-of-the-sea': 'Book_Roe',
  'dwarvish-safety-manual': 'Book_Bombs',
  'the-art-o-crabbing': 'Book_Crabbing',
  'the-alleyway-buffet': 'Book_Trash',
  'the-diamond-hunter': 'Book_Diamonds',
  'book-of-mysteries': 'Book_Mystery',
  'horse-the-book': 'Book_Horse',
  'treasure-appraisal-guide': 'Book_Artifact',
  'ol-slitherlegs': 'Book_Grass',
  'animal-catalogue': 'Book_AnimalCatalogue',
};
// Recipes the catalog lists but the game does not require: a finished save never has them.
const UNOBTAINABLE_RECIPES = ['iron-bar', 'gold-bar'];
const GOLD_CLOCK = 'Gold Clock';

const NAME_ALIASES = {
  'wild seeds (sp)': 'wild seeds - spring',
  'wild seeds (su)': 'wild seeds - summer',
  'wild seeds (fa)': 'wild seeds - fall',
  'wild seeds (wi)': 'wild seeds - winter',
};

const normalizeName = (name) => {
  const plain = String(name)
    .toLowerCase()
    .replace(/\s*\((artifact|crop|\d+)\)|\*/g, '')
    .trim();
  return NAME_ALIASES[plain] ?? plain;
};

const NAME_TO_ID = Object.fromEntries(
  Object.entries(SHEET.collections).map(([collection, items]) => [collection, new Map(items.map((item) => [normalizeName(item.name), item.id]))]),
);

const objectName = (key) => {
  const id = String(key).replace(/^\(\w+\)/, '');
  return OBJECT_NAMES[id] ?? id.replace(/([a-z])([A-Z])/g, '$1 $2');
};

// The save only stores how many walnuts were found, not which ones, so tick them in catalog order.
function foundWalnuts(text) {
  let remaining = Number(text.match(/<goldenWalnutsFound>(\d+)</)?.[1] ?? 0);
  const walnuts = {};
  SHEET.walnuts.forEach((walnut) => {
    if (walnut.points <= remaining) {
      walnuts[walnut.id] = true;
      remaining -= walnut.points;
    }
  });
  return walnuts;
}

function hostXml(text) {
  const start = text.indexOf('<player>');
  const end = text.indexOf('</player>', start);
  return start === -1 ? '' : text.slice(start, end === -1 ? text.length : end);
}

function farmhandsXml(text) {
  return (sectionOf(text, 'farmhands').match(/<Farmer>[\s\S]*?<\/Farmer>/g) ?? []).filter((xml) => field(xml, 'name'));
}

const field = (xml, name) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1]?.trim();

export function listPlayers(text) {
  return [hostXml(text), ...farmhandsXml(text)]
    .filter(Boolean)
    .map((xml, index) => ({ index, name: field(xml, 'name') || '?', isHost: index === 0 }));
}

function sectionOf(xml, tag) {
  const start = xml.indexOf(`<${tag}>`);
  if (start === -1) {
    return '';
  }
  const end = xml.indexOf(`</${tag}>`, start);
  return xml.slice(start, end === -1 ? xml.length : end);
}

function stringKeys(section) {
  return [...section.matchAll(/<item><key><string>([^<]+)<\/string><\/key><value>([\s\S]*?)<\/value><\/item>/g)].map((match) => ({
    key: match[1],
    value: match[2],
  }));
}

const firstNumber = (value) => Number(value.match(/-?\d+/)?.[0] ?? 0);

function marked(collection, names) {
  const ids = {};
  names.forEach((name) => {
    const id = NAME_TO_ID[collection].get(normalizeName(name));
    if (id) {
      ids[id] = true;
    }
  });
  return ids;
}

function levelOf(experience) {
  return LEVEL_THRESHOLDS.filter((threshold) => experience >= threshold).length;
}

function friendHearts(player) {
  const hearts = {};
  stringKeys(sectionOf(player, 'friendshipData')).forEach(({ key, value }) => {
    const points = Number(value.match(/<Points>(\d+)<\/Points>/)?.[1] ?? 0);
    if (SHEET.villagers.some((villager) => villager.name === key)) {
      hearts[key] = Math.floor(points / POINTS_PER_HEART);
    }
  });
  return hearts;
}

function skillLevels(player) {
  const experience = [...sectionOf(player, 'experiencePoints').matchAll(/<int>(-?\d+)<\/int>/g)].map((match) => Number(match[1]));
  return Object.fromEntries(SKILLS.map((skill) => [skill, levelOf(experience[SKILL_XP_INDEX[skill]] ?? 0)]));
}

function monsterKills(player) {
  const kills = Object.fromEntries(stringKeys(sectionOf(player, 'specificMonstersKilled')).map(({ key, value }) => [key, firstNumber(value)]));
  return Object.fromEntries(
    Object.entries(MONSTER_GOALS).map(([goal, names]) => [goal, names.reduce((total, name) => total + (kills[name] || 0), 0)]),
  );
}

function museumPieces(text) {
  const museum = sectionOf(text, 'museumPieces');
  return [...museum.matchAll(/<value><string>([^<]+)<\/string><\/value>/g)].map((match) => objectName(match[1]));
}

function powersOwned(player, mail) {
  const events = new Set([...sectionOf(player, 'eventsSeen').matchAll(/<int>(\d+)<\/int>/g)].map((match) => match[1]));
  const stats = sectionOf(player, 'stats');
  const hasBook = (stat) => Number(stats.match(new RegExp(`<string>${stat}</string></key><value><unsignedInt>(\\d+)`))?.[1] ?? 0) > 0;
  const owned = {};
  Object.entries(POWER_MAIL).forEach(([id, flagName]) => mail.has(flagName) && (owned[id] = true));
  Object.entries(POWER_EVENTS).forEach(([id, event]) => events.has(event) && (owned[id] = true));
  Object.entries(POWER_BOOKS).forEach(([id, stat]) => hasBook(stat) && (owned[id] = true));
  return owned;
}

function completeCrafting(crafted) {
  const required = SHEET.collections.crafting.filter((recipe) => !UNOBTAINABLE_RECIPES.includes(recipe.id));
  const isComplete = required.every((recipe) => crafted[recipe.id]);
  return isComplete ? { ...crafted, ...Object.fromEntries(UNOBTAINABLE_RECIPES.map((id) => [id, true])) } : crafted;
}

export function parsePlayerSave(text, layout, playerIndex = 0) {
  const player = [hostXml(text), ...farmhandsXml(text)][playerIndex] ?? hostXml(text);
  const mail = new Set([...sectionOf(player, 'mailReceived').matchAll(/<string>([^<]+)<\/string>/g)].map((match) => match[1]));
  const buildings = new Set((layout?.buildings ?? []).map((building) => building.type));
  const craftedRecipes = stringKeys(sectionOf(player, 'craftingRecipes')).filter(({ value }) => firstNumber(value) > 0);

  return {
    items: {
      shipping: marked(
        'shipping',
        stringKeys(sectionOf(player, 'basicShipped')).map(({ key }) => objectName(key)),
      ),
      fishing: marked(
        'fishing',
        stringKeys(sectionOf(player, 'fishCaught')).map(({ key }) => objectName(key)),
      ),
      cooking: marked(
        'cooking',
        stringKeys(sectionOf(player, 'recipesCooked')).map(({ key }) => objectName(key)),
      ),
      crafting: completeCrafting(
        marked(
          'crafting',
          craftedRecipes.map(({ key }) => key),
        ),
      ),
      powers: powersOwned(player, mail),
      museum: marked('museum', museumPieces(text)),
    },
    friends: friendHearts(player),
    skills: skillLevels(player),
    monsters: monsterKills(player),
    walnuts: foundWalnuts(text),
    stardrops: Object.fromEntries(
      Object.entries(STARDROP_MAIL)
        .filter(([, flagName]) => mail.has(flagName))
        .map(([id]) => [id, true]),
    ),
    obelisks: Object.fromEntries(
      Object.entries(OBELISK_BUILDINGS)
        .filter(([, type]) => buildings.has(type))
        .map(([id]) => [id, true]),
    ),
    clock: buildings.has(GOLD_CLOCK),
  };
}

// Only ever adds progress: nothing the player already ticked gets unticked.
export function mergeProgress(state, progress) {
  Object.entries(progress.items).forEach(([collection, ids]) => {
    state.items[collection] = { ...state.items[collection], ...ids };
  });
  Object.entries(progress.friends).forEach(([name, hearts]) => {
    state.friends[name] = Math.max(state.friends[name] || 0, hearts);
  });
  Object.entries(progress.skills).forEach(([skill, level]) => {
    state.skills[skill] = Math.max(state.skills[skill] || 0, level);
  });
  Object.entries(progress.monsters).forEach(([goal, kills]) => {
    state.monsters[goal] = Math.max(state.monsters[goal] || 0, kills);
  });
  Object.assign(state.walnuts, progress.walnuts);
  Object.assign(state.stardrops, progress.stardrops);
  Object.assign(state.obelisks, progress.obelisks);
  state.clock = state.clock || progress.clock;
}
