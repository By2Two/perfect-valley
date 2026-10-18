const FARM_WIDTH = 80;
const FARM_HEIGHT = 65;
const FARM_LOCATION = '<GameLocation xsi:type="Farm"';
const LOCATION_END = '</GameLocation>';
const LAYOUT_VERSION = 2;
const DEFAULT_FARMHOUSE = { x: 58, y: 11, w: 9, h: 6 };
const GATE = 'Gate';
const EXTENT_MARGIN = 2;
const MAP_KEYS = ['standard', 'riverland', 'forest', 'hilltop', 'wilderness', 'fourCorners', 'beach', 'meadowlands'];
const ANIMAL_PATTERN = /<FarmAnimal>[\s\S]*?<\/FarmAnimal>/g;
const INDOORS_PATTERN = /<indoors[\s\S]*<\/indoors>/;

const ENTRY_PATTERN = /<item><key><Vector2><X>(-?\d+)<\/X><Y>(-?\d+)<\/Y><\/Vector2><\/key><value>/g;
const CLUMP_PATTERN = /<ResourceClump[^>]*>[\s\S]*?<\/ResourceClump>/g;
const BUSH_PATTERN = /<LargeTerrainFeature xsi:type="Bush">[\s\S]*?<\/LargeTerrainFeature>/g;

const field = (xml, name) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1];
const numberField = (xml, name, fallback = 0) => Number(field(xml, name) ?? fallback);
const flag = (xml, name) => field(xml, name) === 'true';
const nonNilField = (xml, name) => field(xml, name)?.replace(/^\(\w+\)/, '');

function sectionBetween(xml, open, close) {
  const start = xml.indexOf(open);
  if (start === -1) {
    return '';
  }
  const end = xml.indexOf(close, start);
  return xml.slice(start, end === -1 ? xml.length : end);
}

function splitBalanced(xml, openTag, closeTag) {
  const blocks = [];
  let depth = 0;
  let start = -1;
  const pattern = new RegExp(`${openTag}|${closeTag}`, 'g');
  for (const match of xml.matchAll(pattern)) {
    if (match[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        blocks.push(xml.slice(start, match.index + match[0].length));
        start = -1;
      }
    } else {
      if (depth === 0) {
        start = match.index;
      }
      depth += 1;
    }
  }
  return blocks;
}

function removeBalanced(xml, openTag, closeTag) {
  let result = xml;
  splitBalanced(xml, openTag, closeTag).forEach((block) => {
    result = result.replace(block, '');
  });
  return result;
}

function entries(xml) {
  const starts = [...xml.matchAll(ENTRY_PATTERN)];
  return starts.map((match, index) => ({
    x: Number(match[1]),
    y: Number(match[2]),
    body: xml.slice(match.index + match[0].length, starts[index + 1]?.index ?? xml.length),
  }));
}

function animalsIn(xml) {
  const animals = new Map();
  [...xml.matchAll(ANIMAL_PATTERN)].forEach(([animal]) => {
    const id = field(animal, 'myID') ?? animals.size;
    animals.set(id, { type: field(animal, 'type') ?? 'Brown Chicken', home: field(animal, 'buildingTypeILiveIn') ?? '' });
  });
  return [...animals.values()];
}

function mapKeyOf(whichFarm) {
  if (/meadow/i.test(whichFarm)) {
    return 'meadowlands';
  }
  return MAP_KEYS[Number(whichFarm)] ?? 'standard';
}

function parseBuilding(block) {
  const outdoors = block.replace(INDOORS_PATTERN, '');
  const indoors = block.match(INDOORS_PATTERN)?.[0] ?? '';
  const type = nonNilField(outdoors, 'buildingType');
  if (!type) {
    return null;
  }
  return {
    type,
    x: numberField(outdoors, 'tileX'),
    y: numberField(outdoors, 'tileY'),
    w: numberField(outdoors, 'tilesWide', 1),
    h: numberField(outdoors, 'tilesHigh', 1),
    stage: numberField(indoors, 'upgradeLevel'),
    building: numberField(outdoors, 'daysOfConstructionLeft') === 0,
    animals: animalsIn(indoors).map((animal) => animal.type),
  };
}

function parseCrop(body) {
  const crop = body.match(/<crop>[\s\S]*?<\/crop>/)?.[0];
  if (!crop) {
    return null;
  }
  const phaseDays = [...(crop.match(/<phaseDays>[\s\S]*?<\/phaseDays>/)?.[0] ?? '').matchAll(/<int>(\d+)<\/int>/g)];
  return {
    id: nonNilField(crop, 'indexOfHarvest') ?? nonNilField(crop, 'whichForageCrop') ?? '0',
    phase: numberField(crop, 'currentPhase'),
    phases: Math.max(1, phaseDays.length - 1),
    dead: flag(crop, 'dead'),
  };
}

function parseTerrain(xml) {
  const result = { crops: [], flooring: [], grass: [], trees: [], fruitTrees: [] };
  entries(xml).forEach(({ x, y, body }) => {
    const type = body.match(/xsi:type="(\w+)"/)?.[1];
    if (type === 'HoeDirt') {
      const crop = parseCrop(body);
      result.crops.push({ x, y, watered: numberField(body, 'state') === 1, crop });
    } else if (type === 'Flooring') {
      result.flooring.push({ x, y, floor: numberField(body, 'whichFloor') });
    } else if (type === 'Grass') {
      result.grass.push({ x, y });
    } else if (type === 'Tree') {
      result.trees.push({ x, y, kind: numberField(body, 'treeType', 1), stage: numberField(body, 'growthStage'), stump: flag(body, 'stump') });
    } else if (type === 'FruitTree') {
      result.fruitTrees.push({
        x,
        y,
        kind: numberField(body, 'treeId', numberField(body, 'treeType')),
        stage: numberField(body, 'growthStage'),
        stump: flag(body, 'stump'),
        fruits: numberField(body, 'fruitsOnTree'),
      });
    }
  });
  return result;
}

function parseObjects(xml) {
  return entries(xml)
    .map(({ x, y, body }) => ({ x, y, name: field(body, 'name'), big: flag(body, 'bigCraftable') }))
    .filter((object) => object.name);
}

function parseBushes(xml) {
  return [...xml.matchAll(BUSH_PATTERN)].map(([bush]) => ({
    x: numberField(bush, 'X'),
    y: numberField(bush, 'Y'),
    size: numberField(bush, 'size'),
  }));
}

function parseClumps(xml) {
  return [...xml.matchAll(CLUMP_PATTERN)].map(([clump]) => ({
    x: numberField(clump, 'X'),
    y: numberField(clump, 'Y'),
    w: numberField(clump, 'width', 2),
    h: numberField(clump, 'height', 2),
    kind: numberField(clump, 'parentSheetIndex'),
  }));
}

export function isFarmSave(text) {
  return typeof text === 'string' && text.includes('<SaveGame') && text.includes(FARM_LOCATION);
}

export function parseFarmSave(text) {
  if (!isFarmSave(text)) {
    throw new Error('Not a farm save file');
  }
  const start = text.indexOf(FARM_LOCATION);
  const farm = text.slice(start, text.indexOf(LOCATION_END, start));
  const buildingsXml = splitBalanced(farm, '<Building(?: xsi:type="\\w+")?>', '</Building>');
  const buildings = buildingsXml.map(parseBuilding).filter(Boolean);
  const outdoors = removeBalanced(farm, '<buildings>', '</buildings>');
  const terrain = parseTerrain(sectionBetween(outdoors, '<terrainFeatures>', '</terrainFeatures>'));
  const objects = parseObjects(sectionBetween(outdoors, '<objects>', '</objects>'));
  const largeTerrain = sectionBetween(outdoors, '<largeTerrainFeatures>', '</largeTerrainFeatures>');
  const clumps = parseClumps(sectionBetween(outdoors, '<resourceClumps>', '</resourceClumps>'));
  const houseLevel = numberField(text, 'houseUpgradeLevel');
  const hasFarmhouse = buildings.some((building) => building.type === 'Farmhouse');

  const placed = [
    ...buildings.map((b) => ({ x: b.x + b.w, y: b.y + b.h })),
    ...terrain.crops,
    ...terrain.trees,
    ...terrain.flooring,
    ...objects,
    ...clumps,
  ];
  const extent = (axis, minimum) => Math.max(minimum, ...placed.map((p) => p[axis] + EXTENT_MARGIN));

  return {
    version: LAYOUT_VERSION,
    width: extent('x', FARM_WIDTH),
    height: extent('y', FARM_HEIGHT),
    farmType: field(text, 'whichFarm') ?? '0',
    map: mapKeyOf(field(text, 'whichFarm') ?? '0'),
    wanderers: animalsIn(sectionBetween(outdoors, '<animals>', '</animals>')),
    season: field(text, 'currentSeason') ?? 'spring',
    houseLevel,
    buildings: hasFarmhouse ? buildings : [...buildings, { type: 'Farmhouse', ...DEFAULT_FARMHOUSE, stage: houseLevel, building: true }],
    ...terrain,
    bushes: parseBushes(largeTerrain),
    clumps,
    objects,
  };
}

export function isFenceName(name) {
  return name === GATE || name.endsWith(' Fence');
}

export function isValidLayout(layout) {
  return Boolean(layout) && layout.version === LAYOUT_VERSION && Array.isArray(layout.buildings) && Array.isArray(layout.crops);
}
