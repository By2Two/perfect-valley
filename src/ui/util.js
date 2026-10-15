import { iconeDe, iconeUrl } from '../data.js';
import { icone } from '../icons.js';

export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const limitar = (v, min, max) => Math.max(min, Math.min(max, Number.isFinite(v) ? v : 0));

/** Ícone de uma categoria: arte da planilha ou pixel art em código. */
export function htmlIcone(def, classe = '') {
  if (def?.pixel) return `<span class="icone ${classe}">${icone(def.pixel)}</span>`;
  const hash = def?.hash ?? iconeDe(def?.col, def?.id);
  return hash ? `<img class="icone ${classe}" src="${iconeUrl(hash)}" alt="" draggable="false">` : '';
}

/** Barra de progresso em blocos (segmentada). */
export function barraBlocos(fracao, blocos = 20, classe = '') {
  const cheios = Math.round(Math.max(0, Math.min(1, fracao)) * blocos);
  let html = '';
  for (let i = 0; i < blocos; i++) html += `<i${i < cheios ? ' class="on"' : ''}></i>`;
  return `<span class="blocos ${classe}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(fracao * 100)}">${html}</span>`;
}

export const formatarPct = (p, idioma) => (Math.floor(p * 10) / 10).toLocaleString(idioma === 'pt' ? 'pt-BR' : 'en-US', {
  minimumFractionDigits: 1, maximumFractionDigits: 1,
});
