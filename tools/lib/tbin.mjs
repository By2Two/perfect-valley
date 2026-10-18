const MAGIC = 'tBIN10';
const PROPERTY_READERS = {
  0: (reader) => reader.byte() !== 0,
  1: (reader) => reader.int(),
  2: (reader) => reader.float(),
  3: (reader) => reader.string(),
};

function createReader(buffer) {
  let position = MAGIC.length;
  const reader = {
    int() {
      const value = buffer.readInt32LE(position);
      position += 4;
      return value;
    },
    float() {
      const value = buffer.readFloatLE(position);
      position += 4;
      return value;
    },
    byte() {
      const value = buffer[position];
      position += 1;
      return value;
    },
    peek: () => String.fromCharCode(buffer[position]),
    string() {
      const length = reader.int();
      const value = buffer.toString('utf8', position, position + length);
      position += length;
      return value;
    },
    pair: () => [reader.int(), reader.int()],
    properties() {
      const count = reader.int();
      const result = {};
      for (let index = 0; index < count; index++) {
        const key = reader.string();
        result[key] = PROPERTY_READERS[reader.byte()](reader);
      }
      return result;
    },
    atEnd: () => position === buffer.length,
  };
  return reader;
}

function readTileSheet(reader) {
  const sheet = { id: reader.string(), description: reader.string(), image: reader.string() };
  Object.assign(sheet, {
    sheetSize: reader.pair(),
    tileSize: reader.pair(),
    margin: reader.pair(),
    spacing: reader.pair(),
    properties: reader.properties(),
  });
  return sheet;
}

function readTile(reader, state) {
  const kind = String.fromCharCode(reader.byte());
  if (kind === 'T') {
    state.sheet = reader.string();
    return readTile(reader, state);
  }
  if (kind === 'S') {
    const index = reader.int();
    reader.byte();
    return { sheet: state.sheet, index, properties: reader.properties() };
  }
  if (kind === 'A') {
    reader.int();
    const frames = Array.from({ length: reader.int() }, () => readTile(reader, state));
    return { sheet: frames[0].sheet, index: frames[0].index, properties: reader.properties() };
  }
  throw new Error(`Unknown tile kind ${kind}`);
}

function readLayer(reader) {
  const layer = { id: reader.string(), visible: reader.byte() !== 0, description: reader.string() };
  Object.assign(layer, { size: reader.pair(), tileSize: reader.pair(), properties: reader.properties() });
  const [width, height] = layer.size;
  const state = { sheet: null };
  layer.tiles = new Array(width * height).fill(null);
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      if (reader.peek() === 'N') {
        reader.byte();
        x += reader.int();
      } else {
        layer.tiles[y * width + x] = readTile(reader, state);
        x += 1;
      }
    }
  }
  return layer;
}

export function parseTbin(buffer) {
  if (buffer.toString('latin1', 0, MAGIC.length) !== MAGIC) {
    throw new Error('Not a tBIN map');
  }
  const reader = createReader(buffer);
  const map = { id: reader.string(), description: reader.string(), properties: reader.properties() };
  map.sheets = Array.from({ length: reader.int() }, () => readTileSheet(reader));
  map.layers = Array.from({ length: reader.int() }, () => readLayer(reader));
  if (!reader.atEnd()) {
    throw new Error('Unread bytes at the end of the map');
  }
  return map;
}
