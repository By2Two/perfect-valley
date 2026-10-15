import sheet from './data/sheet.json';

/** Tudo o que veio da planilha (itens, ícones, aldeões, metas, nozes...). */
export const SHEET = sheet;

export const SKILLS = ['farming', 'mining', 'foraging', 'fishing', 'combat'];
export const COLECOES_EXTRAS = ['museum', 'gear', 'tailoring', 'powers', 'statues', 'bestiary'];
export const TOTAL_NOZES = sheet.nozes.reduce((t, n) => t + n.pontos, 0);

const porId = {};
const porNome = new Map();
for (const [col, itens] of Object.entries(sheet.colecoes)) {
  porId[col] = Object.fromEntries(itens.map((it) => [it.id, it]));
  for (const it of itens) if (!porNome.has(it.nome.toLowerCase())) porNome.set(it.nome.toLowerCase(), it);
}

export const iconeUrl = (hash) => `${import.meta.env.BASE_URL}icons/${hash}.png`;
export const iconeDe = (col, id) => porId[col]?.[id]?.icone;
/** Acha o ícone de um item pelo nome (usado nos presentes favoritos dos aldeões). */
export const itemPorNome = (nome) => porNome.get(String(nome).toLowerCase());

// icone: { col, id } usa a arte da planilha; { pixel } usa um ícone desenhado em código
export const CATEGORIAS = [
  { id: 'shipping', peso: 15, tipo: 'colecao', colecao: 'shipping', icone: { col: 'shipping', id: 'parsnip' } },
  { id: 'obelisks', peso: 4, tipo: 'lista', itens: sheet.obeliscos, chave: 'obeliscos', icone: { pixel: 'obelisco' } },
  { id: 'clock', peso: 10, tipo: 'unico', icone: { pixel: 'relogio' } },
  { id: 'monsters', peso: 10, tipo: 'metas', icone: { col: 'bestiary', id: 'green-slime' } },
  { id: 'friends', peso: 11, tipo: 'aldeoes', icone: { pixel: 'coracaoGrande' } },
  { id: 'level', peso: 5, tipo: 'habilidades', icone: { pixel: 'estrela' } },
  { id: 'stardrops', peso: 10, tipo: 'lista', itens: sheet.estrelas, chave: 'estrelas', icone: { pixel: 'fruta' } },
  { id: 'cooking', peso: 10, tipo: 'colecao', colecao: 'cooking', icone: { col: 'cooking', id: 'pink-cake' } },
  { id: 'crafting', peso: 10, tipo: 'colecao', colecao: 'crafting', icone: { col: 'crafting', id: 'chest' } },
  { id: 'fishing', peso: 10, tipo: 'colecao', colecao: 'fishing', icone: { col: 'fishing', id: 'pufferfish' } },
  { id: 'walnuts', peso: 5, tipo: 'nozes', icone: { pixel: 'noz' } },
];

export const ICONE_EXTRAS = {
  museum: { col: 'museum', id: 'ancient-doll' },
  gear: { col: 'gear', id: 'galaxy-sword' },
  tailoring: { col: 'tailoring', id: 'abigail-s-bow' },
  powers: { col: 'powers', id: 'rusty-key' },
  statues: { col: 'statues', id: 'rarecrow-1' },
  bestiary: { col: 'bestiary', id: 'green-slime' },
};

export const coracoesNecessarios = (a) => (a.solteiro ? 8 : 10);

export function nivelFazendeiro(s) {
  const soma = SKILLS.reduce((t, k) => t + (s.habilidades[k] || 0), 0);
  return Math.min(25, Math.floor(soma / 2));
}

export function contarColecao(s, col) {
  const marcados = s.itens[col] || {};
  return sheet.colecoes[col].filter((it) => marcados[it.id]).length;
}

export function concluidos(cat, s) {
  switch (cat.tipo) {
    case 'colecao': return contarColecao(s, cat.colecao);
    case 'lista': return cat.itens.filter((it) => s[cat.chave][it.id]).length;
    case 'unico': return s.relogio ? 1 : 0;
    case 'metas': return sheet.metasMonstros.filter((m) => (s.monstros[m.id] || 0) >= m.meta).length;
    case 'aldeoes': return sheet.aldeoes.filter((a) => (s.amigos[a.nome] || 0) >= coracoesNecessarios(a)).length;
    case 'habilidades': return nivelFazendeiro(s);
    case 'nozes': return sheet.nozes.reduce((t, n) => t + (s.nozes[n.id] ? n.pontos : 0), 0);
    default: return 0;
  }
}

export function totalDe(cat) {
  switch (cat.tipo) {
    case 'colecao': return sheet.colecoes[cat.colecao].length;
    case 'lista': return cat.itens.length;
    case 'unico': return 1;
    case 'metas': return sheet.metasMonstros.length;
    case 'aldeoes': return sheet.aldeoes.length;
    case 'habilidades': return 25;
    case 'nozes': return TOTAL_NOZES;
    default: return 1;
  }
}

export const fracao = (cat, s) => concluidos(cat, s) / totalDe(cat);
export const perfeicao = (s) => CATEGORIAS.reduce((t, c) => t + c.peso * fracao(c, s), 0);

/** Converte as marcações salvas na planilha em progresso do app (soma ao que já existe). */
export function progressoDaPlanilha(s) {
  for (const [col, itens] of Object.entries(sheet.colecoes)) {
    s.itens[col] ??= {};
    for (const it of itens) if (it.planilha) s.itens[col][it.id] = true;
  }
  for (const a of sheet.aldeoes) {
    if (a.planilha) s.amigos[a.nome] = Math.max(s.amigos[a.nome] || 0, coracoesNecessarios(a));
  }
  for (const m of sheet.metasMonstros) {
    if (m.planilha) s.monstros[m.id] = Math.max(s.monstros[m.id] || 0, m.meta);
  }
  for (const n of sheet.nozes) if (n.planilha) s.nozes[n.id] = true;
  for (const e of sheet.estrelas) if (e.planilha) s.estrelas[e.id] = true;
  for (const o of sheet.obeliscos) if (o.planilha) s.obeliscos[o.id] = true;
  if (sheet.planilha.relogio) s.relogio = true;
  for (const [k, v] of Object.entries(sheet.planilha.habilidades)) {
    s.habilidades[k] = Math.max(s.habilidades[k] || 0, v);
  }
}
