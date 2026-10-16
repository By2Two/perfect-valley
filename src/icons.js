const PALETTE = {
  k: '#3b2410',
  w: '#8a5a2b',
  W: '#c68b4e',
  p: '#8a4fc4',
  P: '#cfa2f2',
  y: '#f2c230',
  Y: '#fff0a0',
  s: '#c9d3dc',
  S: '#8e9aa6',
  b: '#8a5a2b',
  r: '#d8343b',
  R: '#ff9a84',
  g: '#6daa2c',
  G: '#9be06a',
  f: '#4f9fd8',
  F: '#a6dcff',
  e: '#ffffff',
  o: '#e8833a',
  c: '#f3ddb0',
};

export const ICONS = {
  crate: ['..........', '.kkkkkkkk.', '.kWWWWWWk.', '.kkkkkkkk.', '.kwwwwwwk.', '.kwkwwkwk.', '.kwwwwwwk.', '.kwkwwkwk.', '.kkkkkkkk.', '..........'],
  obelisk: [
    '....kk....',
    '...kPPk...',
    '...kppk...',
    '...kPpk...',
    '...kppk...',
    '..kpPppk..',
    '..kppppk..',
    '..kpPppk..',
    '.kkkkkkkk.',
    '.kSSSSSSk.',
  ],
  clock: ['...kkkk...', '..kyyyyk..', '.kyeeeeyk.', '.kyekeeyk.', '.kyekkeyk.', '.kyeeeeyk.', '.kyeeeeyk.', '..kyyyyk..', '...kkkk...', '..kyyyyk..'],
  sword: ['.......kk.', '......kesk', '.....kesk.', '....kesk..', '...kesk...', '.kkesk....', '..kyk.....', '.kbkyk....', 'kbk..k....', '.k........'],
  largeHeart: [
    '..........',
    '.kk...kk..',
    'kRrk.krrk.',
    'kRrrkrrrk.',
    'krrrrrrrk.',
    '.krrrrrk..',
    '..krrrk...',
    '...krk....',
    '....k.....',
    '..........',
  ],
  star: ['....kk....', '...kyyk...', '...kyyk...', 'kkkkyykkkk', 'kYyyyyyyyk', '.kkyyyykk.', '..kyyyyk..', '.kyykkyyk.', '.kykk.kyk.', '.kk....kk.'],
  fruit: ['.....g....', '....kgk...', '..kkkkkk..', '.kpPpppk..', 'kpPpppppk.', 'kppppppPk.', 'kpppppppk.', '.kpppppk..', '..kkkkk...', '..........'],
  bowl: ['...e..e...', '....e..e..', '...e..e...', 'kkkkkkkkkk', 'kgoGogoGok', 'kWWWWWWWWk', '.kwwwwwwk.', '.kwwwwwwk.', '..kkkkkk..', '..........'],
  hammer: [
    '.kkkkkk...',
    'kSssssSk..',
    'kSssssSk..',
    '.kkkbkk...',
    '....bk....',
    '....bk....',
    '....bk....',
    '....bk....',
    '....kk....',
    '..........',
  ],
  fish: ['..........', '...kkkk...', '..kFFffk.k', '.kfekfffkk', '.kffffffk.', '.kffffffkk', '..kffffk.k', '...kkkk...', '..........', '..........'],
  walnut: [
    '....kk....',
    '...kyyk...',
    '..kyYyyk..',
    '..kyyyyk..',
    '.kyYyyyyk.',
    '.kyyyyYyk.',
    '.kyYyyyyk.',
    '..kyyyyk..',
    '...kkkk...',
    '..........',
  ],
  account: [
    '...kkkk...',
    '..kcccck..',
    '..kcekck..',
    '..kcccck..',
    '...kkkk...',
    '..kggggk..',
    '.kgGgggGk.',
    '.kggggggk.',
    '.kkkkkkkk.',
    '..........',
  ],
  plus: ['..........', '...kkkk...', '...keek...', '.kkkeekkk.', '.keeeeeek.', '.keeeeeek.', '.kkkeekkk.', '...keek...', '...kkkk...', '..........'],
  minus: ['..........', '..........', '..........', '.kkkkkkkk.', '.keeeeeek.', '.keeeeeek.', '.kkkkkkkk.', '..........', '..........', '..........'],
  target: [
    '...kkkk...',
    '..keeeek..',
    '.kek..kek.',
    'kek.kk.kek',
    'ke.keek.ek',
    'ke.keek.ek',
    'kek.kk.kek',
    '.kek..kek.',
    '..keeeek..',
    '...kkkk...',
  ],
  gear: ['...k..k...', '..kekkek..', '.keeeeeek.', 'kkeekkeekk', '.keke.kek.', '.keke.kek.', 'kkeekkeekk', '.keeeeeek.', '..kekkek..', '...k..k...'],
  backpack: [
    '...kkkk...',
    '..kk..kk..',
    '.kkkkkkkk.',
    'kWWWWWWWWk',
    'kwwwwwwwwk',
    'kwwkyykwwk',
    'kwwkyykwwk',
    'kwwwwwwwwk',
    'kwwwwwwwwk',
    '.kkkkkkkk.',
  ],
  heart: ['.kk.kk.', 'krrkrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...'],
};

export function pixelIcon(name, swaps = {}) {
  const map = ICONS[name];
  const height = map.length;
  const width = map[0].length;
  let rects = '';
  map.forEach((line, y) => {
    [...line].forEach((ch, x) => {
      const color = swaps[ch] ?? PALETTE[ch];
      if (ch !== '.' && color) {
        rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${color}"/>`;
      }
    });
  });
  return `<svg viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}
