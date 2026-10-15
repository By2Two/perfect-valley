import * as THREE from 'three';

/**
 * Texturas em pixel art desenhadas em código.
 * Todas usam a mesma densidade (DENSIDADE texels por unidade do mundo): as UVs das peças
 * ficam em unidades do mundo e o `repeat` de cada textura converte para o tamanho do canvas.
 */
export const DENSIDADE = 8;

const cache = new Map();

// Clareia (k > 0) ou escurece (k < 0) uma cor; devolve string CSS
export function tom(cor, k = 0) {
  const n = typeof cor === 'string' ? parseInt(cor.replace('#', ''), 16) : cor;
  const canal = (v) => Math.round(Math.max(0, Math.min(255, k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  const r = canal((n >> 16) & 255);
  const g = canal((n >> 8) & 255);
  const b = canal(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// Gerador determinístico, para a mesma textura sair sempre igual
function semente(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return h >>> 0 || 1;
}
function gerador(s) {
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** Cria (ou reaproveita) uma textura w×h desenhada pixel a pixel */
function criar(nome, params, w, h, desenhar) {
  const chave = nome + JSON.stringify(params);
  if (cache.has(chave)) return cache.get(chave);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  const r = gerador(semente(chave));
  // Pixel com repetição nas bordas, para a textura emendar sem costura
  const px = (x, y, cor) => {
    g.fillStyle = cor;
    g.fillRect(((Math.floor(x) % w) + w) % w, ((Math.floor(y) % h) + h) % h, 1, 1);
  };
  const ret = (x, y, rw, rh, cor) => {
    for (let i = 0; i < rw; i++) for (let j = 0; j < rh; j++) px(x + i, y + j, cor);
  };
  desenhar({ px, ret, r, w, h });
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(DENSIDADE / w, DENSIDADE / h);
  cache.set(chave, t);
  return t;
}

/** Tábuas verticais de parede */
export function tabuasVerticais({ base, larg = 4 } = {}) {
  return criar('tabuasV', { base, larg }, 16, 16, ({ px, ret, r, h }) => {
    for (let x0 = 0; x0 < 16; x0 += larg) {
      ret(x0, 0, larg, h, tom(base, r() * 0.1 - 0.05));
      ret(x0, 0, 1, h, tom(base, -0.38));
      for (let y = 0; y < h; y++) if (r() < 0.7) px(x0 + 1, y, tom(base, 0.14));
      // Veios
      for (let k = 0; k < 2; k++) {
        const x = x0 + 2 + Math.floor(r() * (larg - 2));
        const y = Math.floor(r() * h);
        const n = 2 + Math.floor(r() * 3);
        for (let j = 0; j < n; j++) px(x, y + j, tom(base, -0.14));
      }
      // Emenda de tábua com prego
      if (r() < 0.55) {
        const y = Math.floor(r() * h);
        ret(x0 + 1, y, larg - 1, 1, tom(base, -0.32));
        ret(x0 + 1, y + 1, larg - 1, 1, tom(base, 0.1));
        px(x0 + larg - 2, y + 2, tom(base, -0.45));
      }
    }
  });
}

/** Tábuas horizontais de deck, varanda e caixotes */
export function tabuasDeck({ base } = {}) {
  return criar('deck', { base }, 16, 16, ({ px, ret, r }) => {
    for (let y0 = 0; y0 < 16; y0 += 4) {
      ret(0, y0, 16, 4, tom(base, r() * 0.1 - 0.05));
      ret(0, y0, 16, 1, tom(base, 0.16));
      ret(0, y0 + 3, 16, 1, tom(base, -0.36));
      for (let k = 0; k < 3; k++) ret(Math.floor(r() * 16), y0 + 1 + Math.floor(r() * 2), 2 + Math.floor(r() * 3), 1, tom(base, -0.12));
      const x = Math.floor(r() * 16);
      ret(x, y0, 1, 3, tom(base, -0.36));
      px(x + 1, y0 + 1, tom(base, -0.5));
      px(x - 1, y0 + 1, tom(base, -0.5));
    }
  });
}

/** Telhas em fileiras, com a sombra da fileira de cima */
export function telhas({ base } = {}) {
  return criar('telhas', { base }, 16, 16, ({ px, ret, r }) => {
    for (let y0 = 0; y0 < 16; y0 += 4) {
      const off = (y0 / 4) % 2 ? 2 : 0;
      for (let x0 = 0; x0 < 16; x0 += 4) {
        ret(x0 + off, y0 + 1, 4, 3, tom(base, r() * 0.12 - 0.06));
        ret(x0 + off, y0 + 3, 4, 1, tom(base, 0.16));
        ret(x0 + off, y0 + 1, 1, 3, tom(base, -0.3));
      }
      ret(0, y0, 16, 1, tom(base, -0.45));
      if (r() < 0.6) px(Math.floor(r() * 16), y0 + 2, tom(base, 0.08));
    }
  });
}

/** Tijolos de pedra (fundação, chaminé) */
export function tijolos({ base, junta } = {}) {
  junta ??= tom(base, -0.45);
  return criar('tijolos', { base, junta }, 16, 16, ({ px, ret, r }) => {
    ret(0, 0, 16, 16, tom(junta));
    for (let y0 = 0; y0 < 16; y0 += 4) {
      const off = (y0 / 4) % 2 ? 4 : 0;
      for (let x0 = 0; x0 < 16; x0 += 8) {
        const c = r() * 0.24 - 0.12;
        ret(x0 + off + 1, y0, 7, 3, tom(base, c));
        ret(x0 + off + 1, y0, 7, 1, tom(base, c + 0.18));
        ret(x0 + off + 1, y0 + 2, 7, 1, tom(base, c - 0.12));
        if (r() < 0.5) px(x0 + off + 2 + Math.floor(r() * 5), y0 + 1, tom(base, c - 0.2));
      }
    }
  });
}

/** Rocha (morro da mina, pedras soltas) */
export function rocha({ base } = {}) {
  return criar('rocha', { base }, 16, 16, ({ px, ret, r }) => {
    ret(0, 0, 16, 16, tom(base));
    for (let k = 0; k < 10; k++) {
      const x = Math.floor(r() * 16);
      const y = Math.floor(r() * 16);
      const c = tom(base, r() < 0.5 ? 0.14 : -0.14);
      ret(x, y, 2 + Math.floor(r() * 2), 1 + Math.floor(r() * 2), c);
    }
    // Rachaduras
    for (let k = 0; k < 3; k++) {
      let x = Math.floor(r() * 16);
      let y = Math.floor(r() * 16);
      for (let j = 0; j < 5; j++) {
        px(x, y, tom(base, -0.4));
        px(x + 1, y - 1, tom(base, 0.18));
        x += r() < 0.5 ? 1 : 0;
        y += 1;
      }
    }
  });
}

/** Terra arada: sulcos horizontais e torrões (8×8, um por tile) */
export function terra({ base } = {}) {
  return criar('terra', { base }, 8, 8, ({ px, ret, r }) => {
    ret(0, 0, 8, 8, tom(base));
    for (const y of [1, 5]) {
      for (let x = 0; x < 8; x++) {
        if (r() < 0.85) px(x, y, tom(base, -0.3));
        if (r() < 0.6) px(x, y + 1, tom(base, 0.12));
      }
    }
    for (let k = 0; k < 4; k++) px(Math.floor(r() * 8), Math.floor(r() * 8), tom(base, r() < 0.5 ? -0.18 : 0.16));
  });
}

/** Grama com folhinhas (8×8) */
export function grama({ base } = {}) {
  return criar('grama', { base }, 8, 8, ({ px, ret, r }) => {
    ret(0, 0, 8, 8, tom(base));
    for (let k = 0; k < 6; k++) {
      const x = Math.floor(r() * 8);
      const y = Math.floor(r() * 8);
      px(x, y, tom(base, -0.2));
      px(x, y + 1, tom(base, -0.12));
    }
    for (let k = 0; k < 4; k++) px(Math.floor(r() * 8), Math.floor(r() * 8), tom(base, 0.16));
  });
}

/** Caminho de pedras (calçamento irregular) */
export function calcada({ pedra, junta } = {}) {
  junta ??= tom(pedra, -0.42);
  return criar('calcada', { pedra, junta }, 16, 16, ({ ret, r }) => {
    ret(0, 0, 16, 16, tom(junta));
    let y0 = 0;
    for (const alt of [5, 5, 6]) {
      let x0 = Math.floor(r() * 3);
      while (x0 < 16 + 2) {
        const larg = 4 + Math.floor(r() * 3);
        const c = r() * 0.2 - 0.1;
        ret(x0 + 1, y0 + 1, larg - 1, alt - 1, tom(pedra, c));
        ret(x0 + 1, y0 + 1, larg - 1, 1, tom(pedra, c + 0.16));
        ret(x0 + 1, y0 + alt - 1, larg - 1, 1, tom(pedra, c - 0.14));
        x0 += larg;
      }
      y0 += alt;
    }
  });
}

/** Água com reflexos em traços */
export function agua({ base } = {}) {
  return criar('agua', { base }, 16, 16, ({ ret, r }) => {
    ret(0, 0, 16, 16, tom(base));
    for (let k = 0; k < 7; k++) {
      const x = Math.floor(r() * 16);
      const y = Math.floor(r() * 16);
      const n = 2 + Math.floor(r() * 4);
      ret(x, y, n, 1, tom(base, 0.3));
      ret(x + 1, y + 1, n, 1, tom(base, -0.12));
    }
  });
}

/** Vidro de janela (neutro, tingido pela cor do material) */
export function vidro() {
  return criar('vidro', {}, 8, 8, ({ px, ret }) => {
    ret(0, 0, 8, 8, '#dfe9f2');
    ret(0, 7, 8, 1, '#b4c3d2');
    for (let i = 0; i < 3; i++) {
      px(5 - i, 1 + i, '#ffffff');
      px(6 - i, 1 + i, '#ffffff');
    }
    px(2, 5, '#ffffff');
  });
}

/** Ripas horizontais (venezianas) */
export function ripas({ base } = {}) {
  return criar('ripas', { base }, 8, 8, ({ ret }) => {
    for (let y = 0; y < 8; y += 2) {
      ret(0, y, 8, 1, tom(base, 0.08));
      ret(0, y + 1, 8, 1, tom(base, -0.32));
    }
  });
}

/**
 * Paisagem pintada que dá a volta no obelisco (32×36, sem repetição).
 * Temas: 'ilha', 'terra', 'deserto', 'agua'.
 */
export function obelisco(tema) {
  const t = criar('obelisco', { tema }, 32, 36, ({ px, ret, r }) => {
    const faixas = (lista) => {
      let y = 0;
      lista.forEach(([alt, cor]) => {
        ret(0, y, 32, alt, cor);
        y += alt;
      });
    };
    const estrelas = (n, y1, cor = '#f3ddb0') => {
      for (let i = 0; i < n; i++) px(Math.floor(r() * 32), Math.floor(r() * y1), cor);
    };
    // Linha ondulada preenchida para baixo (dunas, morros, ondas)
    const onda = (yBase, amp, freq, fase, cor, ate = 36) => {
      for (let x = 0; x < 32; x++) {
        const y0 = Math.round(yBase + Math.sin((x / 32) * Math.PI * 2 * freq + fase) * amp);
        ret(x, y0, 1, ate - y0, cor);
      }
    };
    if (tema === 'ilha') {
      faixas([[5, '#f2b45a'], [5, '#f7cf7e'], [6, '#fbe3a8'], [3, '#3fb6d8']]);
      for (let x = 0; x < 32; x += 3) px(x, 17, '#9fe6f0');
      // Vulcão ao longe
      for (let y = 9; y < 16; y++) ret(20 - (y - 9), y, 2 * (y - 9) + 3, 1, '#9a6a5a');
      px(21, 8, '#e8833a');
      px(20, 7, '#f2c230');
      onda(19, 1.5, 2, 0, '#2f7a3a');
      for (let i = 0; i < 26; i++) {
        const x = Math.floor(r() * 32);
        const y = 20 + Math.floor(r() * 15);
        ret(x, y, 2, 1, r() < 0.5 ? '#4fa33a' : '#8ad35c');
      }
      // Folhas grandes de palmeira em leque
      [[5, 22], [26, 24], [15, 28]].forEach(([cx, cy]) => {
        for (let k = -3; k <= 3; k++) {
          for (let j = 1; j < 5; j++) px(cx + k * j * 0.6, cy - j + Math.abs(k) * 0.6, k % 2 ? '#3f8f2f' : '#6ec24a');
        }
      });
      // Papagaio
      ret(9, 6, 2, 3, '#d8343b');
      px(11, 6, '#f2c230');
      px(8, 7, '#3d8fd6');
      ret(9, 9, 1, 2, '#3d8fd6');
      px(10, 6, '#1a1410');
    } else if (tema === 'terra') {
      faixas([[8, '#2a1f4a'], [4, '#4a2a6a'], [2, '#7a3f78'], [22, '#1f5a33']]);
      estrelas(9, 11);
      // Pinheiros
      for (let x = 0; x < 32; x += 4) {
        const h = 6 + Math.floor(r() * 6);
        const topo = 20 - h;
        for (let y = topo; y < 22; y++) {
          const larg = Math.floor((y - topo) / 2) + 1;
          ret(x + 2 - larg, y, larg * 2, 1, (x / 4) % 2 ? '#2f7a44' : '#16452a');
        }
      }
      ret(0, 24, 32, 12, '#5b3a1e');
      for (let i = 0; i < 18; i++) px(Math.floor(r() * 32), 25 + Math.floor(r() * 11), '#7a4a26');
      // Cogumelos vermelhos e cristais roxos
      [[4, 29], [13, 32], [22, 28], [28, 33]].forEach(([x, y]) => {
        ret(x, y, 1, 3, '#f3ddb0');
        ret(x - 1, y - 1, 3, 1, '#d8343b');
        px(x, y - 2, '#d8343b');
        px(x - 1, y - 1, '#fff4e0');
      });
      [[9, 27], [18, 34], [26, 25]].forEach(([x, y]) => {
        ret(x, y - 2, 1, 3, '#9b4fc4');
        px(x + 1, y, '#c06ad8');
      });
    } else if (tema === 'deserto') {
      faixas([[5, '#3e2a6a'], [4, '#5a3f8a'], [4, '#7a52a8'], [23, '#9a6ac4']]);
      estrelas(8, 10, '#fff4e0');
      onda(14, 2, 1.5, 0.5, '#c48ad8');
      onda(18, 2, 2, 2, '#e8a050');
      onda(23, 1.5, 1, 1, '#f2b25a');
      for (let i = 0; i < 20; i++) px(Math.floor(r() * 32), 24 + Math.floor(r() * 12), '#d8903a');
      // Cactos
      [[6, 30], [19, 33], [27, 27]].forEach(([x, y]) => {
        ret(x, y - 6, 2, 7, '#4f9a3a');
        ret(x - 2, y - 4, 2, 1, '#4f9a3a');
        ret(x - 2, y - 6, 1, 2, '#4f9a3a');
        ret(x + 2, y - 3, 2, 1, '#4f9a3a');
        ret(x + 3, y - 5, 1, 2, '#4f9a3a');
        px(x, y - 6, '#6ec24a');
      });
      // Palmeira pequena nas dunas
      ret(13, 15, 1, 6, '#8a5a2b');
      for (let k = -2; k <= 2; k++) px(13 + k, 14 + Math.abs(k) * 0.6, '#3f8f2f');
    } else {
      faixas([[3, '#d3edf7'], [5, '#9fd6ee'], [6, '#7ec8e3'], [6, '#4fa0e0'], [6, '#3a7fc4'], [5, '#2a5fa0'], [5, '#1f4a80']]);
      [6, 12, 18, 24, 30].forEach((y, i) => {
        for (let x = 0; x < 32; x++) {
          if (Math.sin((x / 32) * Math.PI * 4 + i) > 0.55) px(x, y + Math.round(Math.sin((x / 32) * Math.PI * 8 + i)), '#e8f6ff');
        }
      });
      [[8, 20], [24, 27]].forEach(([x, y]) => {
        ret(x, y, 3, 1, '#f2c230');
        px(x + 1, y - 1, '#f2c230');
        px(x + 1, y + 1, '#f2c230');
      });
      ret(17, 33, 2, 1, '#e8833a');
    }
  });
  t.repeat.set(1, 1);
  return t;
}

/** Portal em espiral roxa (topo dos obeliscos) */
export function espiral() {
  const t = criar('espiral', {}, 32, 32, ({ px, ret }) => {
    ret(0, 0, 32, 32, '#3a1458');
    for (let braco = 0; braco < 2; braco++) {
      for (let a = 0; a < Math.PI * 5; a += 0.04) {
        const raio = (a / (Math.PI * 5)) * 15;
        const x = 16 + Math.cos(a + braco * Math.PI) * raio;
        const y = 16 + Math.sin(a + braco * Math.PI) * raio;
        px(x, y, braco ? '#c86ad8' : '#e8a0f0');
        px(x + 1, y, '#8a3ab8');
      }
    }
    ret(15, 15, 2, 2, '#ffe6ff');
  });
  t.repeat.set(1, 1);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Fonte de 3×5 pixels para os números do relógio
const DIGITOS = {
  1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['###', '..#', '###', '#..', '###'],
  3: ['###', '..#', '###', '..#', '###'],
  6: ['###', '#..', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '###'],
};

/** Mostrador branco do Relógio de Ouro, com 12, 3, 6, 9 e marcas das outras horas */
export function mostrador() {
  const t = criar('mostrador', {}, 32, 32, ({ px, ret }) => {
    ret(0, 0, 32, 32, '#fffbe8');
    const escrever = (texto, x0, y0) => {
      [...texto].forEach((d, i) => DIGITOS[d].forEach((linha, y) => [...linha].forEach((c, x) => {
        if (c === '#') px(x0 + i * 4 + x, y0 + y, '#3b2410');
      })));
    };
    escrever('12', 12, 3);
    escrever('3', 25, 14);
    escrever('6', 15, 24);
    escrever('9', 4, 14);
    [1, 2, 4, 5, 7, 8, 10, 11].forEach((h) => {
      const a = (h / 12) * Math.PI * 2;
      px(16 + Math.sin(a) * 11.5, 16 - Math.cos(a) * 11.5, '#8a5a2b');
    });
  });
  t.repeat.set(1, 1);
  return t;
}
