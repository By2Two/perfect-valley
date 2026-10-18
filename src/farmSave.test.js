import { describe, expect, it } from 'vitest';
import { isFarmSave, isFenceName, isValidLayout, parseFarmSave } from './farmSave.js';

const entry = (x, y, value) => `<item><key><Vector2><X>${x}</X><Y>${y}</Y></Vector2></key><value>${value}</value></item>`;

const SAVE = `<?xml version="1.0"?><SaveGame><player><houseUpgradeLevel>2</houseUpgradeLevel></player>
<currentSeason>fall</currentSeason><whichFarm>1</whichFarm>
<locations><GameLocation xsi:type="Farm"><buildings>
<Building xsi:type="Barn"><indoors xsi:type="AnimalHouse"><objects>${entry(1, 1, '<Object><name>Hay</name></Object>')}</objects></indoors>
<tileX>40</tileX><tileY>30</tileY><tilesWide>7</tilesWide><tilesHigh>4</tilesHigh><daysOfConstructionLeft>0</daysOfConstructionLeft><buildingType>Deluxe Barn</buildingType></Building>
<Building><indoors xsi:nil="true" /><tileX>71</tileX><tileY>14</tileY><tilesWide>2</tilesWide><tilesHigh>1</tilesHigh><buildingType>Shipping Bin</buildingType></Building>
</buildings>
<objects>${entry(5, 6, '<Object><name>Weeds</name><bigCraftable>false</bigCraftable></Object>')}${entry(7, 6, '<Object><name>Iridium Sprinkler</name><bigCraftable>false</bigCraftable></Object>')}${entry(8, 6, '<Object><name>Hardwood Fence</name></Object>')}</objects>
<terrainFeatures>
${entry(10, 11, '<TerrainFeature xsi:type="HoeDirt"><state>1</state><crop><phaseDays><int>1</int><int>2</int><int>99999</int></phaseDays><currentPhase>2</currentPhase><indexOfHarvest>264</indexOfHarvest><dead>false</dead></crop></TerrainFeature>')}
${entry(11, 11, '<TerrainFeature xsi:type="HoeDirt"><state>0</state></TerrainFeature>')}
${entry(20, 21, '<TerrainFeature xsi:type="Tree"><growthStage>5</growthStage><treeType>2</treeType><stump>false</stump></TerrainFeature>')}
${entry(30, 31, '<TerrainFeature xsi:type="Flooring"><whichFloor>8</whichFloor></TerrainFeature>')}
${entry(32, 31, '<TerrainFeature xsi:type="Grass"><grassType>1</grassType></TerrainFeature>')}
</terrainFeatures></GameLocation><GameLocation xsi:type="FarmHouse"><objects></objects></GameLocation></locations></SaveGame>`;

describe('farm save parsing', () => {
  it('recognizes farm saves only', () => {
    expect(isFarmSave(SAVE)).toBe(true);
    expect(isFarmSave('{"items":{}}')).toBe(false);
    expect(isFarmSave(null)).toBe(false);
    expect(() => parseFarmSave('<html></html>')).toThrow();
  });

  it('reads buildings without leaking what is inside them', () => {
    const { buildings, objects } = parseFarmSave(SAVE);
    expect(buildings.map((building) => building.type)).toEqual(['Deluxe Barn', 'Shipping Bin', 'Farmhouse']);
    expect(buildings[0]).toMatchObject({ x: 40, y: 30, w: 7, h: 4 });
    expect(objects.map((object) => object.name)).not.toContain('Hay');
  });

  it('reads crops, trees, flooring, grass and objects with their tiles', () => {
    const layout = parseFarmSave(SAVE);
    expect(layout.crops).toHaveLength(2);
    expect(layout.crops[0]).toMatchObject({ x: 10, y: 11, watered: true, crop: { id: '264', phase: 2, phases: 2, dead: false } });
    expect(layout.crops[1].crop).toBeNull();
    expect(layout.trees).toEqual([{ x: 20, y: 21, kind: 2, stage: 5, stump: false }]);
    expect(layout.flooring).toEqual([{ x: 30, y: 31, floor: 8 }]);
    expect(layout.grass).toEqual([{ x: 32, y: 31 }]);
    expect(layout.objects.map((object) => object.name)).toEqual(['Weeds', 'Iridium Sprinkler', 'Hardwood Fence']);
  });

  it('reads the farm settings and builds a usable layout', () => {
    const layout = parseFarmSave(SAVE);
    expect(layout).toMatchObject({ season: 'fall', farmType: '1', houseLevel: 2, width: 80, height: 65 });
    expect(layout.buildings.at(-1)).toMatchObject({ type: 'Farmhouse', stage: 2 });
    expect(isValidLayout(layout)).toBe(true);
    expect(isValidLayout({ version: 99 })).toBe(false);
    expect(isValidLayout(null)).toBe(false);
  });

  it('identifies fences', () => {
    expect(['Wood Fence', 'Gate', 'Iron Fence'].every(isFenceName)).toBe(true);
    expect(isFenceName('Chest')).toBe(false);
  });
});
