import { iconHashOf, iconUrl } from '../items.js';
import { pixelIcon } from '../icons.js';

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const LOCALES = { en: 'en-US', pt: 'pt-BR' };

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);

export const clamp = (value, min, max) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));

export function iconHtml(definition, className = '') {
  if (definition?.pixel) {
    return `<span class="icon ${className}">${pixelIcon(definition.pixel)}</span>`;
  }
  const hash = definition?.hash ?? iconHashOf(definition?.collection, definition?.id);
  return hash ? `<img class="icon ${className}" src="${iconUrl(hash)}" alt="" draggable="false">` : '';
}

export function blockBarHtml(fraction, blocks = 20, className = '') {
  const filledBlocks = Math.round(clamp(fraction, 0, 1) * blocks);
  const html = Array.from({ length: blocks }, (_, index) => `<i${index < filledBlocks ? ' class="on"' : ''}></i>`).join('');
  return `<span class="blocks ${className}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(fraction * 100)}">${html}</span>`;
}

export const formatPercent = (percent, language) =>
  (Math.floor(percent * 10) / 10).toLocaleString(LOCALES[language], { minimumFractionDigits: 1, maximumFractionDigits: 1 });
