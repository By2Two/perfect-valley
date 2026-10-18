import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XNB from 'xnb';
import * as stardew from 'xnb/dist/plugins/stardewvalley/index.module.js';
import { parseTbin } from './lib/tbin.mjs';
import { decodePng } from './lib/png.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUTPUT = path.join(ROOT, 'src', 'data', 'farmMaps.json');
const SEASONS = ['spring', 'summer', 'fall', 'winter'];
const FARM_MAPS = {
  standard: 'Farm',
  riverland: 'Farm_Fishing',
  forest: 'Farm_Foraging',
  hilltop: 'Farm_Mining',
  wilderness: 'Farm_Combat',
  fourCorners: 'Farm_FourCorners',
  beach: 'Farm_Island',
  meadowlands: 'Farm_Ranching',
};
const GROUND_TYPES = { grass: 'g', dirt: 'd', sand: 'n', stone: 's', wood: 'o' };
const MIN_SAND_RED = 190;
const MIN_SAND_BLUE = 105;
const OVERHEAD_LAYERS = ['Front', 'AlwaysFront', 'AlwaysFront2', 'AlwaysFront3'];
const SOLID_LAYERS = ['Buildings', 'Buildings2'];
const TILE = 16;
const ALPHA_THRESHOLD = 128;
const THIN_COVERAGE = 0.45;
const MIN_SOLID_COVERAGE = 0.05;
const MIN_FOLIAGE_COVERAGE = 0.2;

if (stardew.default) {
  XNB.addReaders(stardew.default);
}

const isTrue = (value) => value !== undefined && ['t', 'true'].includes(String(value).toLowerCase());
const packColor = ([r, g, b]) => (r << 16) | (g << 8) | b;
const isPale = ([r, , b]) => r > MIN_SAND_RED && b > MIN_SAND_BLUE;
const isFoliage = ([r, g, b]) => (g > r * 1.08 && g > b * 1.2) || (r > 170 && b > 120 && g < r - 20);

async function unpack(contentDir, name) {
  const file = path.join(contentDir, `${name}.xnb`);
  if (!fs.existsSync(file)) {
    return null;
  }
  const { content } = await XNB.unpackToContent(fs.readFileSync(file));
  return Buffer.from(await content.arrayBuffer());
}

function seasonalImage(image, season) {
  return image.replace(/^spring_/, `${season}_`);
}

async function loadSheets(contentDir, maps) {
  const sheets = new Map();
  const wanted = new Set(maps.flatMap((map) => map.sheets.map((sheet) => sheet.image)));
  for (const image of wanted) {
    for (const season of SEASONS) {
      const name = seasonalImage(image, season);
      if (!sheets.has(name)) {
        const png = await unpack(contentDir, name).catch(() => null);
        sheets.set(name, png ? decodePng(png) : null);
      }
    }
  }
  return sheets;
}

function createTileStats(sheets) {
  const cache = new Map();
  function measure(image, index) {
    const sheet = sheets.get(image);
    if (!sheet) {
      return null;
    }
    const columns = Math.floor(sheet.width / TILE);
    const left = (index % columns) * TILE;
    const top = Math.floor(index / columns) * TILE;
    if (top + TILE > sheet.height) {
      return null;
    }
    const sum = [0, 0, 0];
    let count = 0;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const offset = ((top + y) * sheet.width + left + x) * 4;
        if (sheet.data[offset + 3] > ALPHA_THRESHOLD) {
          count += 1;
          sum.forEach((_, channel) => {
            sum[channel] += sheet.data[offset + channel];
          });
        }
      }
    }
    return { coverage: count / (TILE * TILE), rgb: count ? sum.map((total) => Math.round(total / count)) : [0, 0, 0] };
  }
  return (image, index) => {
    const key = `${image}|${index}`;
    if (!cache.has(key)) {
      cache.set(key, measure(image, index));
    }
    return cache.get(key);
  };
}

function tilePropertiesOf(map, tile) {
  const sheet = map.sheets.find((candidate) => candidate.id === tile.sheet);
  const result = {};
  Object.entries(sheet?.properties ?? {}).forEach(([key, value]) => {
    const [, , index, name] = key.split('@');
    if (Number(index) === tile.index && name) {
      result[name.toLowerCase()] = String(value);
    }
  });
  Object.entries(tile.properties).forEach(([key, value]) => {
    result[key.toLowerCase()] = String(value);
  });
  return result;
}

function groundOf(map, stats, tiles) {
  const present = tiles.filter(Boolean);
  if (!present.length) {
    return { ground: 'x', buildable: false };
  }
  const properties = present.map((tile) => tilePropertiesOf(map, tile));
  if (properties.some((entry) => isTrue(entry.water))) {
    return { ground: 'w', buildable: false };
  }
  const typed = properties.find((entry) => entry.type);
  const sheetImage = map.sheets.find((sheet) => sheet.id === present[0].sheet).image;
  const sample = stats(seasonalImage(sheetImage, 'spring'), present[0].index);
  let ground = GROUND_TYPES[(typed?.type ?? '').toLowerCase()];
  if (!ground) {
    ground = sample && isFoliage(sample.rgb) ? 'g' : 'd';
  }
  if (ground === 'd' && sample && isPale(sample.rgb)) {
    ground = 'n';
  }
  const own = properties[properties.length - 1];
  const buildable = own.buildable === undefined ? isTrue(own.diggable) : isTrue(own.buildable);
  return { ground, buildable };
}

function blockOf(map, stats, tile) {
  const image = map.sheets.find((sheet) => sheet.id === tile.sheet).image;
  return { image, sample: stats(seasonalImage(image, 'spring'), tile.index) };
}

function blocksOf(map, stats, packed) {
  const [width, height] = map.layers[0].size;
  const layerTiles = (ids) => map.layers.filter((layer) => ids.includes(layer.id)).map((layer) => layer.tiles);
  const solid = layerTiles(SOLID_LAYERS);
  const overhead = layerTiles(OVERHEAD_LAYERS);
  const blocks = [];
  for (let index = 0; index < width * height; index++) {
    const solidTile = solid.map((tiles) => tiles[index]).find(Boolean);
    let found = null;
    if (solidTile) {
      const { image, sample } = blockOf(map, stats, solidTile);
      if (sample && sample.coverage >= MIN_SOLID_COVERAGE) {
        found = { tile: solidTile, image, kind: sample.coverage < THIN_COVERAGE ? 'p' : 'b' };
      }
    } else {
      for (const tile of overhead.map((tiles) => tiles[index]).filter(Boolean)) {
        const { image, sample } = blockOf(map, stats, tile);
        if (sample && sample.coverage > MIN_FOLIAGE_COVERAGE && isFoliage(sample.rgb)) {
          found = { tile, image, kind: 'c' };
          break;
        }
      }
    }
    if (found) {
      const colors = SEASONS.map((season) => {
        const sample = stats(seasonalImage(found.image, season), found.tile.index) ?? stats(seasonalImage(found.image, 'spring'), found.tile.index);
        return packed(packColor(sample.rgb));
      });
      blocks.push([index % width, Math.floor(index / width), found.kind, ...colors]);
    }
  }
  return blocks;
}

function convertMap(map, stats, packed) {
  const [width, height] = map.layers[0].size;
  const find = (id) => map.layers.find((layer) => layer.id === id);
  const back = find('Back');
  const back2 = find('Back2');
  const solid = SOLID_LAYERS.map(find).filter(Boolean);
  const ground = [];
  const buildable = [];
  for (let index = 0; index < width * height; index++) {
    const result = groundOf(map, stats, [back2?.tiles[index], back.tiles[index]]);
    ground.push(result.ground);
    buildable.push(result.buildable && !solid.some((layer) => layer.tiles[index]) ? '1' : '0');
  }
  return { width, height, ground: ground.join(''), build: buildable.join(''), blocks: blocksOf(map, stats, packed) };
}

async function main() {
  const contentDir = process.argv[2];
  if (!contentDir) {
    throw new Error('Usage: node tools/extract_farm_maps.mjs <Stardew Valley/Content/Maps folder>');
  }
  const parsed = {};
  for (const [key, file] of Object.entries(FARM_MAPS)) {
    parsed[key] = parseTbin(await unpack(contentDir, file));
  }
  const sheets = await loadSheets(contentDir, Object.values(parsed));
  const stats = createTileStats(sheets);
  const palette = [];
  const paletteIndex = new Map();
  const packed = (color) => {
    if (!paletteIndex.has(color)) {
      paletteIndex.set(color, palette.length);
      palette.push(color);
    }
    return paletteIndex.get(color);
  };
  const maps = Object.fromEntries(Object.entries(parsed).map(([key, map]) => [key, convertMap(map, stats, packed)]));
  fs.writeFileSync(OUTPUT, JSON.stringify({ version: 1, palette, maps }));
  process.stdout.write(`${path.relative(ROOT, OUTPUT)}: ${Object.keys(maps).join(', ')}\n`);
}

main();
