import zlib from 'zlib';

const SIGNATURE_LENGTH = 8;
const CHUNK_OVERHEAD = 12;
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const distances = [Math.abs(estimate - left), Math.abs(estimate - up), Math.abs(estimate - upLeft)];
  const best = distances.indexOf(Math.min(...distances));
  return [left, up, upLeft][best];
}

const UNFILTERS = [
  (value) => value,
  (value, { left }) => value + left,
  (value, { up }) => value + up,
  (value, { left, up }) => value + ((left + up) >> 1),
  (value, { left, up, upLeft }) => value + paeth(left, up, upLeft),
];

function readChunks(buffer) {
  const chunks = [];
  let position = SIGNATURE_LENGTH;
  while (position < buffer.length) {
    const length = buffer.readUInt32BE(position);
    chunks.push({ type: buffer.toString('ascii', position + 4, position + 8), data: buffer.subarray(position + 8, position + 8 + length) });
    position += CHUNK_OVERHEAD + length;
  }
  return chunks;
}

function unfilter(raw, { width, height, channels }) {
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const up = y ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = x >= channels && y ? pixels[(y - 1) * stride + x - channels] : 0;
      pixels[y * stride + x] = UNFILTERS[filter](raw[y * (stride + 1) + 1 + x], { left, up, upLeft }) & 255;
    }
  }
  return pixels;
}

export function decodePng(buffer) {
  const chunks = readChunks(buffer);
  const header = chunks.find((chunk) => chunk.type === 'IHDR').data;
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const colorType = header[9];
  const channels = CHANNELS[colorType];
  const palette = chunks.find((chunk) => chunk.type === 'PLTE')?.data;
  const alpha = chunks.find((chunk) => chunk.type === 'tRNS')?.data;
  const raw = zlib.inflateSync(Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data)));
  const pixels = unfilter(raw, { width, height, channels });
  const data = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index++) {
    const source = index * channels;
    if (colorType === 6) {
      pixels.copy(data, index * 4, source, source + 4);
    } else if (colorType === 2) {
      data.set([pixels[source], pixels[source + 1], pixels[source + 2], 255], index * 4);
    } else if (colorType === 3) {
      const entry = pixels[source];
      data.set([palette[entry * 3], palette[entry * 3 + 1], palette[entry * 3 + 2], alpha && entry < alpha.length ? alpha[entry] : 255], index * 4);
    } else {
      data.set([pixels[source], pixels[source], pixels[source], 255], index * 4);
    }
  }
  return { width, height, data };
}
