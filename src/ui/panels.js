import {
  SHEET, CATEGORIAS, SKILLS, ICONE_EXTRAS, COLECOES_EXTRAS, TOTAL_NOZES,
  concluidos, totalDe, fracao, nivelFazendeiro, coracoesNecessarios, contarColecao, itemPorNome, iconeUrl,
} from '../data.js';
import { t, termo, getIdioma } from '../i18n.js';
import { icone } from '../icons.js';
import { esc, htmlIcone, barraBlocos } from './util.js';

const CORACAO_VAZIO = { r: '#e8c98d', k: '#8a5a2b' };

// Filtros de cada coleção (ficam guardados enquanto a página estiver aberta)
const filtros = {};
export function filtroDe(col) {
  filtros[col] ??= { status: 'todos', secao: null, busca: '', sel: null, rapido: false };
  return filtros[col];
}

function topo(def, titulo, linhas, f, voltar = false) {
  return `
    <header class="painel-topo">
      ${voltar ? `<button class="botao quadrado pequeno" data-acao="voltar" data-foco="voltar" aria-label="${t('btn.voltar')}">‹</button>` : ''}
      <div class="painel-icone">${htmlIcone(def)}</div>
      <div class="painel-titulos"><h2>${esc(titulo)}</h2>${linhas.map((l) => `<p>${l}</p>`).join('')}</div>
      <button class="fechar" data-acao="fechar" data-foco="fechar" aria-label="${t('btn.fechar')}">✕</button>
    </header>
    ${f === undefined ? '' : `<div class="painel-barra">${barraBlocos(f, 24)}</div>`}`;
}

export function htmlPainel(aberto, s) {
  if (aberto === 'extras') return painelExtras(s);
  if (aberto.startsWith('col:')) {
    const col = aberto.slice(4);
    const semCheck = col === 'bestiary';
    const total = SHEET.colecoes[col].length;
    const feitos = contarColecao(s, col);
    return topo(ICONE_EXTRAS[col], t(`col.${col}`), semCheck ? [t('det.semCheck')] : [t('painel.progresso', { a: feitos, b: total })],
      semCheck ? undefined : feitos / total, true) + corpoColecao(col, s, semCheck);
  }
  const cat = CATEGORIAS.find((c) => c.id === aberto);
  const linhas = [
    t('painel.vale', { p: cat.peso }),
    cat.tipo === 'unico' ? '' : cat.tipo === 'nozes'
      ? t('nozes.total', { a: concluidos(cat, s), b: totalDe(cat) })
      : t('painel.progresso', { a: concluidos(cat, s), b: totalDe(cat) }),
  ].filter(Boolean);
  const corpos = { colecao: () => corpoColecao(cat.colecao, s), lista: () => corpoLista(cat, s), unico: () => corpoRelogio(s),
    metas: () => corpoMetas(s), aldeoes: () => corpoAldeoes(s), habilidades: () => corpoHabilidades(s), nozes: () => corpoNozes(s) };
  const dica = `<p class="texto-dica">${t(`dica.${cat.id}`)}</p>`;
  if (cat.tipo === 'colecao') return topo(cat.icone, t(`cat.${cat.id}`), linhas, fracao(cat, s)) + corpos.colecao();
  return `${topo(cat.icone, t(`cat.${cat.id}`), linhas, fracao(cat, s))}<div class="corpo">${dica}${corpos[cat.tipo]()}</div>`;
}

// ---------- Coleções em grade de inventário ----------
function corpoColecao(col, s, semCheck = false) {
  const f = filtroDe(col);
  const itens = SHEET.colecoes[col];
  const marcados = s.itens[col] || {};
  const secoes = [...new Set(itens.map((i) => i.secao).filter(Boolean))];
  const busca = f.busca.trim().toLowerCase();
  const visiveis = itens.filter((it) => {
    if (f.secao && it.secao !== f.secao) return false;
    if (!semCheck && f.status === 'faltando' && marcados[it.id]) return false;
    if (!semCheck && f.status === 'feitos' && !marcados[it.id]) return false;
    if (busca && !it.nome.toLowerCase().includes(busca)) return false;
    return true;
  });
  const sel = itens.find((i) => i.id === f.sel);

  const status = semCheck ? '' : `
    <div class="segmentado" role="group">
      ${['faltando', 'feitos', 'todos'].map((k) => `<button class="seg" data-acao="status" data-valor="${k}" data-foco="st-${k}" aria-pressed="${f.status === k}">${t(`filtro.${k}`)}</button>`).join('')}
    </div>`;
  const rapido = semCheck ? '' : `
    <label class="interruptor" title="${t('filtro.rapidoDica')}">
      <input type="checkbox" class="caixa" data-acao="rapido" data-foco="rapido" ${f.rapido ? 'checked' : ''}> ${t('filtro.rapido')}
    </label>`;
  const chips = secoes.length > 1 ? `
    <div class="chips" role="group">
      <button class="chip" data-acao="secao" data-valor="" data-foco="sec-todas" aria-pressed="${!f.secao}">${t('filtro.tudo')}</button>
      ${secoes.map((sec, i) => `<button class="chip" data-acao="secao" data-valor="${esc(sec)}" data-foco="sec-${i}" aria-pressed="${f.secao === sec}">${esc(termo(sec))}</button>`).join('')}
    </div>` : '';

  let grade;
  if (!visiveis.length) {
    grade = `<p class="vazio">${busca ? t('vazio.busca', { q: esc(f.busca) }) : t('vazio.faltando')}</p>`;
  } else {
    grade = `<div class="grade">${visiveis.map((it) => {
      const ok = semCheck || marcados[it.id];
      return `<button class="slot-item${ok ? ' feito' : ''}${f.sel === it.id ? ' selecionado' : ''}" data-acao="item" data-id="${it.id}"
        data-foco="it-${it.id}" data-dica="${esc(it.nome)}" aria-label="${esc(it.nome)}${semCheck ? '' : `: ${ok ? t('det.feito') : t('det.faltando')}`}">
        <img src="${iconeUrl(it.icone)}" alt="" loading="lazy" draggable="false">${!semCheck && ok ? '<span class="visto" aria-hidden="true"></span>' : ''}</button>`;
    }).join('')}</div>`;
  }

  return `
    <div class="ferramentas">
      ${status}
      <label class="busca"><span class="sr">${t('filtro.buscar')}</span>
        <input type="search" placeholder="${t('filtro.buscar')}" value="${esc(f.busca)}" data-acao="busca" data-foco="busca"></label>
      ${rapido}
    </div>
    ${chips}
    ${detalheItem(col, sel, marcados, semCheck)}
    <div class="corpo">${grade}</div>`;
}

function detalheItem(col, it, marcados, semCheck) {
  if (!it) return `<div class="detalhe vazio-detalhe"><p>${t('det.escolha')}</p></div>`;
  const ok = semCheck || marcados[it.id];
  const linhas = (it.detalhes || []).map(([k, v]) => `<dt>${esc(termo(k.replace(/\s*\(.*\)$/, '')))}</dt><dd>${esc(termo(v))}</dd>`).join('');
  return `
    <div class="detalhe${ok ? ' feito' : ''}">
      <div class="detalhe-icone"><img src="${iconeUrl(it.icone)}" alt=""></div>
      <div class="detalhe-texto">
        <h3>${esc(it.nome)}</h3>
        ${it.secao ? `<p class="detalhe-secao">${esc(termo(it.secao))}</p>` : ''}
        ${linhas ? `<dl>${linhas}</dl>` : ''}
        ${it.nota ? `<details><summary>${t('det.notas')}</summary><p class="nota">${esc(it.nota)}</p></details>` : ''}
      </div>
      ${semCheck ? '' : `<button class="botao ${ok ? 'secundario' : 'primario'}" data-acao="alternar" data-id="${it.id}" data-foco="alternar">
        ${ok ? t('det.desmarcar') : t('det.marcar')}</button>`}
    </div>`;
}

// ---------- Listas simples ----------
const nomeTraduzido = (chave, padrao) => {
  const v = t(chave);
  return v === chave ? padrao : v;
};

function corpoLista(cat, s) {
  return `<ul class="lista">${cat.itens.map((it) => {
    const ok = Boolean(s[cat.chave][it.id]);
    const como = nomeTraduzido(`como.${it.id}`, it.como || '');
    return `<li><label class="linha${ok ? ' feito' : ''}">
      <input type="checkbox" class="caixa" data-acao="marcar" data-chave="${cat.chave}" data-id="${it.id}" data-foco="m-${it.id}" ${ok ? 'checked' : ''}>
      <span class="linha-texto"><strong>${esc(nomeTraduzido(`nome.${it.id}`, it.nome))}</strong>${como ? `<small>${esc(como)}</small>` : ''}</span>
    </label></li>`;
  }).join('')}</ul>`;
}

function corpoRelogio(s) {
  return `<label class="linha grande${s.relogio ? ' feito' : ''}">
    <input type="checkbox" class="caixa" data-acao="relogio" data-foco="relogio" ${s.relogio ? 'checked' : ''}>
    <span class="linha-texto"><strong>${t('relogio.marcar')}</strong><small>${t('relogio.sub')}</small></span>
  </label>`;
}

function corpoMetas(s) {
  const pt = getIdioma() === 'pt';
  return `<ul class="lista">${SHEET.metasMonstros.map((m) => {
    const v = s.monstros[m.id] || 0;
    const ok = v >= m.meta;
    return `<li class="linha${ok ? ' feito' : ''}">
      <span class="linha-texto"><strong>${esc(nomeTraduzido(`nome.${m.id}`, m.nome))}</strong>
        <small>${t('monstros.recompensa')}: ${esc(m.recompensa)}${!pt && m.descricao ? ` (${esc(m.descricao)})` : ''}</small>
        ${barraBlocos(v / m.meta, 10, 'mini')}</span>
      <label class="meta-campo">
        <input type="number" inputmode="numeric" min="0" value="${v}" data-acao="monstro" data-id="${m.id}" data-foco="mo-${m.id}" aria-label="${esc(m.nome)}">
        <span>/ ${m.meta}</span>
      </label>
    </li>`;
  }).join('')}</ul>
  <button class="botao secundario largo" data-acao="abrir" data-valor="col:bestiary" data-foco="bestiario">${htmlIcone(ICONE_EXTRAS.bestiary)} ${t('col.bestiary')}</button>`;
}

function pips(acao, id, valor, max, necessario, rotulo, coracao) {
  let html = '';
  for (let i = 1; i <= max; i++) {
    const cheio = i <= valor;
    html += `<button class="pip${i > necessario ? ' extra' : ''}" data-acao="${acao}" data-id="${esc(id)}" data-n="${i}"
      data-foco="${acao}-${esc(id)}-${i}" aria-label="${esc(rotulo)}: ${i}" aria-pressed="${cheio}">
      ${coracao ? icone('coracao', cheio ? {} : CORACAO_VAZIO) : '<span class="ponto"></span>'}</button>`;
  }
  return html;
}

function presentes(lista) {
  return (lista || []).map((nome) => {
    const it = itemPorNome(nome);
    return it
      ? `<img class="presente" src="${iconeUrl(it.icone)}" alt="${esc(nome)}" data-dica="${esc(nome)}" loading="lazy">`
      : `<span class="presente-texto">${esc(nome)}</span>`;
  }).join('');
}

function corpoAldeoes(s) {
  return `<ul class="aldeoes">${SHEET.aldeoes.map((a) => {
    const v = s.amigos[a.nome] || 0;
    const precisa = coracoesNecessarios(a);
    const nome = termo(a.nome);
    return `<li class="aldeao${v >= precisa ? ' feito' : ''}">
      <div class="retrato"><img src="${iconeUrl(a.icone)}" alt="" loading="lazy"></div>
      <div class="aldeao-info">
        <h3>${esc(nome)}${a.solteiro ? ` <span class="selo" title="${t('amigos.solteiro')}">♥</span>` : ''}</h3>
        <p class="pequeno">${t('amigos.aniversario')}: ${esc(termo(a.aniversario))} · ${t('amigos.coracoes', { n: v, m: precisa })}</p>
        <div class="pips">${pips('coracao', a.nome, v, 10, precisa, nome, true)}</div>
        ${a.ama?.length ? `<details><summary>${t('amigos.ama')} / ${t('amigos.gosta')}</summary>
          <p class="pequeno">${t('amigos.ama')}</p><div class="presentes">${presentes(a.ama)}</div>
          ${a.gosta?.length ? `<p class="pequeno">${t('amigos.gosta')}</p><div class="presentes">${presentes(a.gosta)}</div>` : ''}
        </details>` : ''}
      </div>
    </li>`;
  }).join('')}</ul>`;
}

function corpoHabilidades(s) {
  return `<p class="destaque">${t('nivel.titulo', { n: `<strong>${nivelFazendeiro(s)}</strong>` })}</p>
    <ul class="lista">${SKILLS.map((k) => {
      const v = s.habilidades[k] || 0;
      return `<li class="linha${v >= 10 ? ' feito' : ''}">
        <span class="linha-texto"><strong>${t(`skill.${k}`)}</strong><small>${t('nivel.n', { n: v })}</small></span>
        <span class="pips">${pips('habilidade', k, v, 10, 10, t(`skill.${k}`), false)}</span>
      </li>`;
    }).join('')}</ul>`;
}

function corpoNozes(s) {
  const f = filtroDe('nozes');
  const grupos = {};
  for (const n of SHEET.nozes) (grupos[n.secao] ??= []).push(n);
  return `
    <div class="segmentado" role="group">
      ${['faltando', 'todos'].map((k) => `<button class="seg" data-acao="status-nozes" data-valor="${k}" data-foco="nz-${k}" aria-pressed="${f.status === k || (k === 'todos' && f.status !== 'faltando')}">${t(`filtro.${k}`)}</button>`).join('')}
    </div>
    ${Object.entries(grupos).map(([sec, lista]) => {
      const visiveis = lista.filter((n) => f.status !== 'faltando' || !s.nozes[n.id]);
      if (!visiveis.length) return '';
      const feitos = lista.reduce((t2, n) => t2 + (s.nozes[n.id] ? n.pontos : 0), 0);
      const total = lista.reduce((t2, n) => t2 + n.pontos, 0);
      return `<h3 class="subtitulo">${esc(termo(sec))} <small>${feitos}/${total}</small></h3>
        <ul class="lista">${visiveis.map((n) => `<li><label class="linha${s.nozes[n.id] ? ' feito' : ''}">
          <input type="checkbox" class="caixa" data-acao="marcar" data-chave="nozes" data-id="${n.id}" data-foco="nz-${n.id}" ${s.nozes[n.id] ? 'checked' : ''}>
          <span class="linha-texto"><strong>${esc(termo(n.tipo))} <span class="pontos">×${n.pontos}</span></strong>${n.como ? `<small>${esc(n.como)}</small>` : ''}</span>
        </label></li>`).join('')}</ul>`;
    }).join('')}`;
}

function painelExtras(s) {
  return `${topo({ pixel: 'mochila' }, t('cat.extras'), [t('dica.extras')])}
    <div class="corpo"><div class="extras">${COLECOES_EXTRAS.map((col) => {
      const total = SHEET.colecoes[col].length;
      const feitos = contarColecao(s, col);
      const semCheck = col === 'bestiary';
      return `<button class="extra moldura-fina" data-acao="abrir" data-valor="col:${col}" data-foco="ex-${col}">
        ${htmlIcone(ICONE_EXTRAS[col], 'grande')}
        <span><strong>${t(`col.${col}`)}</strong><small>${semCheck ? total : t('painel.progresso', { a: feitos, b: total })}</small></span>
        ${semCheck ? '' : barraBlocos(feitos / total, 10, 'mini')}
      </button>`;
    }).join('')}</div></div>`;
}

export { TOTAL_NOZES };
