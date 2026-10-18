let loading = null;

export function loadFarmMaps() {
  loading ??= import('../../data/farmMaps.json').then((module) => module.default);
  return loading;
}

export function resolveMap(data, key) {
  const map = data.maps[key] ?? data.maps.standard;
  const blocks = map.blocks.map(([x, y, kind, ...colors]) => ({ x, y, kind, colors: colors.map((index) => data.palette[index]) }));
  const at = (x, y) => map.ground[y * map.width + x] ?? 'x';
  return { width: map.width, height: map.height, ground: map.ground, buildable: map.build, blocks, at };
}
