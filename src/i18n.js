import { DICTIONARY } from './dictionary.js';
import { GLOSSARY, SEASON_WORDS } from './glossary.js';

const DEFAULT_LANGUAGE = 'en';
const PORTUGUESE = 'pt';
const DATED_TERM_PATTERN = /^(Spring|Summer|Fall|Winter) (\d+)$/;
const SEASON_WORD_PATTERN = /\b(Spring|Summer|Fall|Winter|Also|Rainy|Sunny)\b/g;
const TERM_SEPARATOR = ' · ';
const HTML_LANGUAGES = { en: 'en', pt: 'pt-BR' };

let translations = null;
let loadingTranslations = null;
let language = DEFAULT_LANGUAGE;
const translationListeners = new Set();

export function onTranslationLoaded(listener) {
  translationListeners.add(listener);
}

function loadTranslations() {
  loadingTranslations ??= import('./data/pt.json').then((module) => {
    translations = module.default;
    translationListeners.forEach((listener) => listener());
  });
  return loadingTranslations;
}

export function setLanguage(requestedLanguage) {
  language = requestedLanguage === PORTUGUESE ? PORTUGUESE : DEFAULT_LANGUAGE;
  document.documentElement.lang = HTML_LANGUAGES[language];
  document.title = t('app.name');
  if (language === PORTUGUESE && !translations) {
    loadTranslations();
  }
}

export const getLanguage = () => language;

export function t(key, variables) {
  const text = DICTIONARY[language][key] ?? DICTIONARY[DEFAULT_LANGUAGE][key] ?? key;
  return variables ? text.replace(/\{(\w+)\}/g, (_, name) => variables[name] ?? '') : text;
}

export function translateTerm(term) {
  if (language !== PORTUGUESE || !term) {
    return term;
  }
  const translated = translations?.[term] ?? GLOSSARY[term];
  if (translated) {
    return translated;
  }
  const datedTerm = term.match(DATED_TERM_PATTERN);
  if (datedTerm) {
    return `${datedTerm[2]} de ${SEASON_WORDS[datedTerm[1]].toLowerCase()}`;
  }
  if (term.includes(TERM_SEPARATOR)) {
    return term.split(TERM_SEPARATOR).map(translateTerm).join(TERM_SEPARATOR);
  }
  return term.replace(SEASON_WORD_PATTERN, (word) => SEASON_WORDS[word]);
}
