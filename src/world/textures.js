import * as THREE from 'three';

export const DENSITY = 8;

const cache = new Map();

export function tone(color, k = 0) {
  const n = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : color;
  const channel = (v) => Math.round(Math.max(0, Math.min(255, k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function seed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0 || 1;
}
function generator(s) {
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function create(name, params, { size: [w, h], draw }) {
  const key = name + JSON.stringify(params);
  if (cache.has(key)) {
    return cache.get(key);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  const r = generator(seed(key));
  const px = (x, y, color) => {
    g.fillStyle = color;
    g.fillRect(((Math.floor(x) % w) + w) % w, ((Math.floor(y) % h) + h) % h, 1, 1);
  };
  const rect = ([x, y], [rw, rh], color) => {
    for (let i = 0; i < rw; i++) {
      for (let j = 0; j < rh; j++) {
        px(x + i, y + j, color);
      }
    }
  };
  draw({ px, rect, r, w, h });
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(DENSITY / w, DENSITY / h);
  cache.set(key, t);
  return t;
}

export function verticalPlanks({ base, width = 4 } = {}) {
  return create(
    'planksV',
    { base, width },
    {
      size: [16, 16],
      draw: ({ px, rect, r, h }) => {
        for (let x0 = 0; x0 < 16; x0 += width) {
          rect([x0, 0], [width, h], tone(base, r() * 0.1 - 0.05));
          rect([x0, 0], [1, h], tone(base, -0.38));
          for (let y = 0; y < h; y++) {
            if (r() < 0.7) {
              px(x0 + 1, y, tone(base, 0.14));
            }
          }
          for (let k = 0; k < 2; k++) {
            const x = x0 + 2 + Math.floor(r() * (width - 2));
            const y = Math.floor(r() * h);
            const n = 2 + Math.floor(r() * 3);
            for (let j = 0; j < n; j++) {
              px(x, y + j, tone(base, -0.14));
            }
          }
          if (r() < 0.55) {
            const y = Math.floor(r() * h);
            rect([x0 + 1, y], [width - 1, 1], tone(base, -0.32));
            rect([x0 + 1, y + 1], [width - 1, 1], tone(base, 0.1));
            px(x0 + width - 2, y + 2, tone(base, -0.45));
          }
        }
      },
    },
  );
}

export function deckPlanks({ base } = {}) {
  return create(
    'deck',
    { base },
    {
      size: [16, 16],
      draw: ({ px, rect, r }) => {
        for (let y0 = 0; y0 < 16; y0 += 4) {
          rect([0, y0], [16, 4], tone(base, r() * 0.1 - 0.05));
          rect([0, y0], [16, 1], tone(base, 0.16));
          rect([0, y0 + 3], [16, 1], tone(base, -0.36));
          for (let k = 0; k < 3; k++) {
            rect([Math.floor(r() * 16), y0 + 1 + Math.floor(r() * 2)], [2 + Math.floor(r() * 3), 1], tone(base, -0.12));
          }
          const x = Math.floor(r() * 16);
          rect([x, y0], [1, 3], tone(base, -0.36));
          px(x + 1, y0 + 1, tone(base, -0.5));
          px(x - 1, y0 + 1, tone(base, -0.5));
        }
      },
    },
  );
}

export function shingles({ base } = {}) {
  return create(
    'shingles',
    { base },
    {
      size: [16, 16],
      draw: ({ px, rect, r }) => {
        for (let y0 = 0; y0 < 16; y0 += 4) {
          const off = (y0 / 4) % 2 ? 2 : 0;
          for (let x0 = 0; x0 < 16; x0 += 4) {
            rect([x0 + off, y0 + 1], [4, 3], tone(base, r() * 0.12 - 0.06));
            rect([x0 + off, y0 + 3], [4, 1], tone(base, 0.16));
            rect([x0 + off, y0 + 1], [1, 3], tone(base, -0.3));
          }
          rect([0, y0], [16, 1], tone(base, -0.45));
          if (r() < 0.6) {
            px(Math.floor(r() * 16), y0 + 2, tone(base, 0.08));
          }
        }
      },
    },
  );
}

export function bricks({ base, joint } = {}) {
  joint ??= tone(base, -0.45);
  return create(
    'bricks',
    { base, joint },
    {
      size: [16, 16],
      draw: ({ px, rect, r }) => {
        rect([0, 0], [16, 16], tone(joint));
        for (let y0 = 0; y0 < 16; y0 += 4) {
          const off = (y0 / 4) % 2 ? 4 : 0;
          for (let x0 = 0; x0 < 16; x0 += 8) {
            const c = r() * 0.24 - 0.12;
            rect([x0 + off + 1, y0], [7, 3], tone(base, c));
            rect([x0 + off + 1, y0], [7, 1], tone(base, c + 0.18));
            rect([x0 + off + 1, y0 + 2], [7, 1], tone(base, c - 0.12));
            if (r() < 0.5) {
              px(x0 + off + 2 + Math.floor(r() * 5), y0 + 1, tone(base, c - 0.2));
            }
          }
        }
      },
    },
  );
}

export function rock({ base } = {}) {
  return create(
    'rock',
    { base },
    {
      size: [16, 16],
      draw: ({ px, rect, r }) => {
        rect([0, 0], [16, 16], tone(base));
        for (let k = 0; k < 10; k++) {
          const x = Math.floor(r() * 16);
          const y = Math.floor(r() * 16);
          const c = tone(base, r() < 0.5 ? 0.14 : -0.14);
          rect([x, y], [2 + Math.floor(r() * 2), 1 + Math.floor(r() * 2)], c);
        }
        for (let k = 0; k < 3; k++) {
          let x = Math.floor(r() * 16);
          let y = Math.floor(r() * 16);
          for (let j = 0; j < 5; j++) {
            px(x, y, tone(base, -0.4));
            px(x + 1, y - 1, tone(base, 0.18));
            x += r() < 0.5 ? 1 : 0;
            y += 1;
          }
        }
      },
    },
  );
}

export function earth({ base } = {}) {
  return create(
    'earth',
    { base },
    {
      size: [8, 8],
      draw: ({ px, rect, r }) => {
        rect([0, 0], [8, 8], tone(base));
        for (const y of [1, 5]) {
          for (let x = 0; x < 8; x++) {
            if (r() < 0.85) {
              px(x, y, tone(base, -0.3));
            }
            if (r() < 0.6) {
              px(x, y + 1, tone(base, 0.12));
            }
          }
        }
        for (let k = 0; k < 4; k++) {
          px(Math.floor(r() * 8), Math.floor(r() * 8), tone(base, r() < 0.5 ? -0.18 : 0.16));
        }
      },
    },
  );
}

export function grass({ base } = {}) {
  return create(
    'grass',
    { base },
    {
      size: [8, 8],
      draw: ({ px, rect, r }) => {
        rect([0, 0], [8, 8], tone(base));
        for (let k = 0; k < 6; k++) {
          const x = Math.floor(r() * 8);
          const y = Math.floor(r() * 8);
          px(x, y, tone(base, -0.2));
          px(x, y + 1, tone(base, -0.12));
        }
        for (let k = 0; k < 4; k++) {
          px(Math.floor(r() * 8), Math.floor(r() * 8), tone(base, 0.16));
        }
      },
    },
  );
}

export function pavement({ stone, joint } = {}) {
  joint ??= tone(stone, -0.42);
  return create(
    'pavement',
    { stone, joint },
    {
      size: [16, 16],
      draw: ({ rect, r }) => {
        rect([0, 0], [16, 16], tone(joint));
        let y0 = 0;
        for (const alt of [5, 5, 6]) {
          let x0 = Math.floor(r() * 3);
          while (x0 < 16 + 2) {
            const width = 4 + Math.floor(r() * 3);
            const c = r() * 0.2 - 0.1;
            rect([x0 + 1, y0 + 1], [width - 1, alt - 1], tone(stone, c));
            rect([x0 + 1, y0 + 1], [width - 1, 1], tone(stone, c + 0.16));
            rect([x0 + 1, y0 + alt - 1], [width - 1, 1], tone(stone, c - 0.14));
            x0 += width;
          }
          y0 += alt;
        }
      },
    },
  );
}

export function water({ base } = {}) {
  return create(
    'water',
    { base },
    {
      size: [16, 16],
      draw: ({ rect, r }) => {
        rect([0, 0], [16, 16], tone(base));
        for (let k = 0; k < 7; k++) {
          const x = Math.floor(r() * 16);
          const y = Math.floor(r() * 16);
          const n = 2 + Math.floor(r() * 4);
          rect([x, y], [n, 1], tone(base, 0.3));
          rect([x + 1, y + 1], [n, 1], tone(base, -0.12));
        }
      },
    },
  );
}

export function glass() {
  return create(
    'glass',
    {},
    {
      size: [8, 8],
      draw: ({ px, rect }) => {
        rect([0, 0], [8, 8], '#dfe9f2');
        rect([0, 7], [8, 1], '#b4c3d2');
        for (let i = 0; i < 3; i++) {
          px(5 - i, 1 + i, '#ffffff');
          px(6 - i, 1 + i, '#ffffff');
        }
        px(2, 5, '#ffffff');
      },
    },
  );
}

export function slats({ base } = {}) {
  return create(
    'slats',
    { base },
    {
      size: [8, 8],
      draw: ({ rect }) => {
        for (let y = 0; y < 8; y += 2) {
          rect([0, y], [8, 1], tone(base, 0.08));
          rect([0, y + 1], [8, 1], tone(base, -0.32));
        }
      },
    },
  );
}

export function obelisk(theme) {
  const t = create(
    'obelisk',
    { theme },
    {
      size: [32, 36],
      draw: ({ px, rect, r }) => {
        const bands = (list) => {
          let y = 0;
          list.forEach(([alt, color]) => {
            rect([0, y], [32, alt], color);
            y += alt;
          });
        };
        const stars = (n, y1, color = '#f3ddb0') => {
          for (let i = 0; i < n; i++) {
            px(Math.floor(r() * 32), Math.floor(r() * y1), color);
          }
        };
        const wave = ({ yBase, amp, freq, phase, color, endY = 36 }) => {
          for (let x = 0; x < 32; x++) {
            const y0 = Math.round(yBase + Math.sin((x / 32) * Math.PI * 2 * freq + phase) * amp);
            rect([x, y0], [1, endY - y0], color);
          }
        };
        if (theme === 'island') {
          bands([
            [5, '#f2b45a'],
            [5, '#f7cf7e'],
            [6, '#fbe3a8'],
            [3, '#3fb6d8'],
          ]);
          for (let x = 0; x < 32; x += 3) {
            px(x, 17, '#9fe6f0');
          }
          for (let y = 9; y < 16; y++) {
            rect([20 - (y - 9), y], [2 * (y - 9) + 3, 1], '#9a6a5a');
          }
          px(21, 8, '#e8833a');
          px(20, 7, '#f2c230');
          wave({ yBase: 19, amp: 1.5, freq: 2, phase: 0, color: '#2f7a3a' });
          for (let i = 0; i < 26; i++) {
            const x = Math.floor(r() * 32);
            const y = 20 + Math.floor(r() * 15);
            rect([x, y], [2, 1], r() < 0.5 ? '#4fa33a' : '#8ad35c');
          }
          [
            [5, 22],
            [26, 24],
            [15, 28],
          ].forEach(([centerX, cy]) => {
            for (let k = -3; k <= 3; k++) {
              for (let j = 1; j < 5; j++) {
                px(centerX + k * j * 0.6, cy - j + Math.abs(k) * 0.6, k % 2 ? '#3f8f2f' : '#6ec24a');
              }
            }
          });
          rect([9, 6], [2, 3], '#d8343b');
          px(11, 6, '#f2c230');
          px(8, 7, '#3d8fd6');
          rect([9, 9], [1, 2], '#3d8fd6');
          px(10, 6, '#1a1410');
        } else if (theme === 'earth') {
          bands([
            [8, '#2a1f4a'],
            [4, '#4a2a6a'],
            [2, '#7a3f78'],
            [22, '#1f5a33'],
          ]);
          stars(9, 11);
          for (let x = 0; x < 32; x += 4) {
            const h = 6 + Math.floor(r() * 6);
            const topY = 20 - h;
            for (let y = topY; y < 22; y++) {
              const width = Math.floor((y - topY) / 2) + 1;
              rect([x + 2 - width, y], [width * 2, 1], (x / 4) % 2 ? '#2f7a44' : '#16452a');
            }
          }
          rect([0, 24], [32, 12], '#5b3a1e');
          for (let i = 0; i < 18; i++) {
            px(Math.floor(r() * 32), 25 + Math.floor(r() * 11), '#7a4a26');
          }
          [
            [4, 29],
            [13, 32],
            [22, 28],
            [28, 33],
          ].forEach(([x, y]) => {
            rect([x, y], [1, 3], '#f3ddb0');
            rect([x - 1, y - 1], [3, 1], '#d8343b');
            px(x, y - 2, '#d8343b');
            px(x - 1, y - 1, '#fff4e0');
          });
          [
            [9, 27],
            [18, 34],
            [26, 25],
          ].forEach(([x, y]) => {
            rect([x, y - 2], [1, 3], '#9b4fc4');
            px(x + 1, y, '#c06ad8');
          });
        } else if (theme === 'desert') {
          bands([
            [5, '#3e2a6a'],
            [4, '#5a3f8a'],
            [4, '#7a52a8'],
            [23, '#9a6ac4'],
          ]);
          stars(8, 10, '#fff4e0');
          wave({ yBase: 14, amp: 2, freq: 1.5, phase: 0.5, color: '#c48ad8' });
          wave({ yBase: 18, amp: 2, freq: 2, phase: 2, color: '#e8a050' });
          wave({ yBase: 23, amp: 1.5, freq: 1, phase: 1, color: '#f2b25a' });
          for (let i = 0; i < 20; i++) {
            px(Math.floor(r() * 32), 24 + Math.floor(r() * 12), '#d8903a');
          }
          [
            [6, 30],
            [19, 33],
            [27, 27],
          ].forEach(([x, y]) => {
            rect([x, y - 6], [2, 7], '#4f9a3a');
            rect([x - 2, y - 4], [2, 1], '#4f9a3a');
            rect([x - 2, y - 6], [1, 2], '#4f9a3a');
            rect([x + 2, y - 3], [2, 1], '#4f9a3a');
            rect([x + 3, y - 5], [1, 2], '#4f9a3a');
            px(x, y - 6, '#6ec24a');
          });
          rect([13, 15], [1, 6], '#8a5a2b');
          for (let k = -2; k <= 2; k++) {
            px(13 + k, 14 + Math.abs(k) * 0.6, '#3f8f2f');
          }
        } else {
          bands([
            [3, '#d3edf7'],
            [5, '#9fd6ee'],
            [6, '#7ec8e3'],
            [6, '#4fa0e0'],
            [6, '#3a7fc4'],
            [5, '#2a5fa0'],
            [5, '#1f4a80'],
          ]);
          [6, 12, 18, 24, 30].forEach((y, i) => {
            for (let x = 0; x < 32; x++) {
              if (Math.sin((x / 32) * Math.PI * 4 + i) > 0.55) {
                px(x, y + Math.round(Math.sin((x / 32) * Math.PI * 8 + i)), '#e8f6ff');
              }
            }
          });
          [
            [8, 20],
            [24, 27],
          ].forEach(([x, y]) => {
            rect([x, y], [3, 1], '#f2c230');
            px(x + 1, y - 1, '#f2c230');
            px(x + 1, y + 1, '#f2c230');
          });
          rect([17, 33], [2, 1], '#e8833a');
        }
      },
    },
  );
  t.repeat.set(1, 1);
  return t;
}

export function spiral() {
  const t = create(
    'spiral',
    {},
    {
      size: [32, 32],
      draw: ({ px, rect }) => {
        rect([0, 0], [32, 32], '#3a1458');
        for (let arm = 0; arm < 2; arm++) {
          for (let a = 0; a < Math.PI * 5; a += 0.04) {
            const radius = (a / (Math.PI * 5)) * 15;
            const x = 16 + Math.cos(a + arm * Math.PI) * radius;
            const y = 16 + Math.sin(a + arm * Math.PI) * radius;
            px(x, y, arm ? '#c86ad8' : '#e8a0f0');
            px(x + 1, y, '#8a3ab8');
          }
        }
        rect([15, 15], [2, 2], '#ffe6ff');
      },
    },
  );
  t.repeat.set(1, 1);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

const DIGITS = {
  1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['###', '..#', '###', '#..', '###'],
  3: ['###', '..#', '###', '..#', '###'],
  6: ['###', '#..', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '###'],
};

export function dial() {
  const t = create(
    'dial',
    {},
    {
      size: [32, 32],
      draw: ({ px, rect }) => {
        rect([0, 0], [32, 32], '#fffbe8');
        const write = (text, x0, y0) => {
          [...text].forEach((d, i) =>
            DIGITS[d].forEach((line, y) =>
              [...line].forEach((c, x) => {
                if (c === '#') {
                  px(x0 + i * 4 + x, y0 + y, '#3b2410');
                }
              }),
            ),
          );
        };
        write('12', 12, 3);
        write('3', 25, 14);
        write('6', 15, 24);
        write('9', 4, 14);
        [1, 2, 4, 5, 7, 8, 10, 11].forEach((h) => {
          const a = (h / 12) * Math.PI * 2;
          px(16 + Math.sin(a) * 11.5, 16 - Math.cos(a) * 11.5, '#8a5a2b');
        });
      },
    },
  );
  t.repeat.set(1, 1);
  return t;
}
