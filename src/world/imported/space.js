export const TILE = 0.66;

export function createSpace({ width, height }, map) {
  return {
    width,
    height,
    map,
    size: [width * TILE, height * TILE],
    x: (tileX) => (tileX - width / 2) * TILE,
    z: (tileY) => (tileY - height / 2) * TILE,
    center: (tileX, tileY) => [(tileX + 0.5 - width / 2) * TILE, (tileY + 0.5 - height / 2) * TILE],
  };
}
