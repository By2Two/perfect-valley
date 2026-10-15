import { CATEGORIAS, SHEET, fracao, perfeicao } from '../data.js';
import { getState, update } from '../store.js';
import { t, getIdioma } from '../i18n.js';
import { icone } from '../icons.js';
import { esc, htmlIcone, barraBlocos, formatarPct, limitar } from './util.js';
import { htmlPainel, filtroDe } from './panels.js';

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
const SLOTS = [...CATEGORIAS.map((c) => c.id), 'extras'];
const ACOES_DE_MUDANCA = new Set(['marcar', 'relogio', 'monstro', 'rapido', 'busca']);

export function criarApp({ cena, abrirConfig }) {
  const $ = (id) => document.getElementById(id);
  const hud = $('hud');
  const controles = $('controles');
  const barra = $('barra');
  const painel = $('painel');
  const dica = $('dica');
  const toasts = $('toasts');

  let aberto = null;
  let historico = [];
  let statusChave = 'hud.local';
  let ultimasFracoes = null;
  let brilhar = null;

  // ---------- Estrutura fixa ----------
  function montar() {
    hud.className = 'moldura hud';
    hud.innerHTML = `
      <p class="hud-marca">${t('app.nome')}</p>
      <div class="hud-linha">
        <div class="hud-estrela">${icone('estrela')}</div>
        <p class="hud-valor"><span data-pct>0.0</span><small>%</small></p>
      </div>
      <p class="hud-rotulo">${t('hud.perfeicao')}</p>
      <div data-barra></div>
      <p class="hud-status" data-status></p>`;

    controles.innerHTML = [
      ['afastar', 'menos', 'btn.afastar'], ['aproximar', 'mais', 'btn.aproximar'],
      ['centralizar', 'alvo', 'btn.centralizar'], ['config', 'engrenagem', 'btn.config'],
    ].map(([acao, ic, chave]) => `<button class="botao icone-botao" data-acao="${acao}" aria-label="${t(chave)}" data-dica="${t(chave)}">${icone(ic)}</button>`).join('');

    barra.className = 'moldura barra';
    barra.innerHTML = SLOTS.map((id, i) => {
      const cat = CATEGORIAS.find((c) => c.id === id);
      const nome = t(`curto.${id}`);
      return `<button class="slot" data-slot="${id}" aria-pressed="${aberto === id}" aria-label="${nome}" data-dica="${nome} · ${t('tecla', { k: TECLAS[i] })}">
        <span class="tecla" aria-hidden="true">${TECLAS[i]}</span>${htmlIcone(cat ? cat.icone : { pixel: 'mochila' })}
        ${cat ? '<span class="enchimento"></span>' : ''}</button>`;
    }).join('');
    atualizar(getState());
    status(statusChave);
  }

  controles.addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const acao = b.dataset.acao;
    if (acao === 'config') abrirConfig();
    else cena[acao]();
  });
  barra.addEventListener('click', (e) => {
    const b = e.target.closest('.slot');
    if (b) alternar(b.dataset.slot);
  });
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!$('modal').hidden) return;
    const i = TECLAS.indexOf(e.key);
    if (i >= 0) alternar(SLOTS[i]);
    if (e.key === 'Escape') fechar();
    if (e.key === '+') cena.aproximar();
    if (e.key === '_') cena.afastar();
  });

  // Dicas em balão para qualquer elemento com data-dica
  document.addEventListener('pointerover', (e) => {
    if (e.target === document.getElementById('cena')) return;
    const el = e.target.closest?.('[data-dica]');
    mostrarDica(el ? el.dataset.dica : null, e.clientX, e.clientY);
  });
  document.addEventListener('pointerout', (e) => {
    if (e.target.closest?.('[data-dica]')) mostrarDica(null);
  });

  // ---------- Painel ----------
  function alternar(id) {
    if (aberto === id) fechar();
    else abrir(id);
  }
  function abrir(id, { empilhar = false } = {}) {
    if (empilhar && aberto) historico.push(aberto);
    else historico = [];
    aberto = id;
    painel.hidden = false;
    render(true);
    marcarSlots();
    cena.abrirEspaco(true);
  }
  function fechar() {
    aberto = null;
    historico = [];
    painel.hidden = true;
    marcarSlots();
    cena.abrirEspaco(false);
  }
  function marcarSlots() {
    const raiz = aberto?.startsWith('col:') ? 'extras' : aberto;
    barra.querySelectorAll('.slot').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.slot === raiz)));
  }

  function render(doTopo = false) {
    if (!aberto) return;
    mostrarDica(null);
    const ativo = document.activeElement;
    const focoId = ativo?.dataset?.foco;
    const cursor = ativo?.selectionStart;
    const rolagem = doTopo ? 0 : painel.querySelector('.corpo')?.scrollTop || 0;
    painel.className = `moldura painel${aberto.startsWith('col:') || CATEGORIAS.find((c) => c.id === aberto)?.tipo === 'colecao' ? ' largo' : ''}`;
    painel.innerHTML = htmlPainel(aberto, getState());
    const corpo = painel.querySelector('.corpo');
    if (corpo) corpo.scrollTop = rolagem;
    if (focoId) {
      const el = painel.querySelector(`[data-foco="${CSS.escape(focoId)}"]`);
      el?.focus({ preventScroll: true });
      if (el && cursor != null && el.setSelectionRange) el.setSelectionRange(cursor, cursor);
    }
    if (brilhar) {
      painel.querySelector(`[data-foco="it-${CSS.escape(brilhar)}"]`)?.classList.add('brilho');
      brilhar = null;
    }
  }

  const colecaoAtual = () => {
    if (aberto?.startsWith('col:')) return aberto.slice(4);
    return CATEGORIAS.find((c) => c.id === aberto)?.colecao;
  };

  function alternarItem(col, id) {
    update((s) => {
      s.itens[col][id] = !s.itens[col][id];
      if (s.itens[col][id]) brilhar = id;
      else delete s.itens[col][id];
    });
  }

  painel.addEventListener('click', (e) => {
    const el = e.target.closest('[data-acao]');
    if (!el || ACOES_DE_MUDANCA.has(el.dataset.acao)) return;
    const { acao, id, valor } = el.dataset;
    const n = Number(el.dataset.n);
    const col = colecaoAtual();
    switch (acao) {
      case 'fechar': fechar(); break;
      case 'voltar': {
        const anterior = historico.pop();
        if (anterior) { aberto = anterior; render(true); marcarSlots(); } else fechar();
        break;
      }
      case 'abrir': abrir(valor, { empilhar: true }); break;
      case 'status': filtroDe(col).status = valor; render(true); break;
      case 'secao': filtroDe(col).secao = valor || null; render(true); break;
      case 'status-nozes': filtroDe('nozes').status = valor; render(); break;
      case 'item': {
        const f = filtroDe(col);
        if (f.rapido && col !== 'bestiary') alternarItem(col, id);
        else { f.sel = id; render(); }
        break;
      }
      case 'alternar': alternarItem(col, id); break;
      case 'coracao':
        update((s) => { s.amigos[id] = (s.amigos[id] || 0) === n ? n - 1 : n; });
        break;
      case 'habilidade':
        update((s) => { s.habilidades[id] = (s.habilidades[id] || 0) === n ? n - 1 : n; });
        break;
      default: break;
    }
  });

  painel.addEventListener('input', (e) => {
    const el = e.target.closest('[data-acao="busca"]');
    if (!el) return;
    filtroDe(colecaoAtual()).busca = el.value;
    render(true);
  });

  painel.addEventListener('change', (e) => {
    const el = e.target.closest('[data-acao]');
    if (!el) return;
    const { acao, id, chave } = el.dataset;
    if (acao === 'marcar') update((s) => { s[chave][id] = el.checked; if (!el.checked) delete s[chave][id]; });
    if (acao === 'relogio') update((s) => { s.relogio = el.checked; });
    if (acao === 'monstro') update((s) => { s.monstros[id] = limitar(Math.floor(Number(el.value)), 0, 99999); });
    if (acao === 'rapido') { filtroDe(colecaoAtual()).rapido = el.checked; render(); }
  });

  // ---------- Atualização ----------
  function atualizar(s) {
    const p = perfeicao(s);
    hud.querySelector('[data-pct]').textContent = formatarPct(p, getIdioma());
    hud.querySelector('[data-barra]').innerHTML = barraBlocos(p / 100, 25, 'ouro');
    const fracoes = {};
    CATEGORIAS.forEach((c) => {
      const f = fracao(c, s);
      fracoes[c.id] = f;
      const slot = barra.querySelector(`[data-slot="${c.id}"]`);
      if (!slot) return;
      slot.querySelector('.enchimento').innerHTML = barraBlocos(f, 5, 'mini');
      slot.classList.toggle('completo', f >= 1);
    });
    // Comemora categorias que acabaram de chegar a 100%
    if (ultimasFracoes) {
      CATEGORIAS.forEach((c) => {
        if (fracoes[c.id] >= 1 && ultimasFracoes[c.id] < 1) {
          comemorar(t('toast.categoria', { cat: t(`curto.${c.id}`) }));
          barra.querySelector(`[data-slot="${c.id}"]`)?.classList.add('brilho');
        }
      });
    }
    ultimasFracoes = fracoes;
    render();
  }

  function status(chave) {
    statusChave = chave;
    const el = hud.querySelector('[data-status]');
    if (el) el.textContent = t(chave);
  }

  function aviso(texto) {
    const el = document.createElement('div');
    el.className = 'toast moldura-fina';
    el.textContent = texto;
    toasts.append(el);
    setTimeout(() => el.remove(), 4200);
  }

  function comemorar(texto) {
    const el = document.createElement('div');
    el.className = 'toast conquista moldura-fina';
    el.innerHTML = `<span class="toast-estrela">${icone('estrela')}</span><span><strong>${t('toast.objetivo')}</strong><br>${esc(texto)}</span>`;
    toasts.append(el);
    setTimeout(() => el.remove(), 5000);
  }

  function mostrarDica(texto, x, y) {
    if (!texto) { dica.hidden = true; return; }
    dica.textContent = texto;
    dica.hidden = false;
    const w = dica.offsetWidth;
    dica.style.left = `${Math.min(x + 14, window.innerWidth - w - 8)}px`;
    dica.style.top = `${y + 18}px`;
  }

  montar();
  return {
    abrir: (cat) => abrir(cat),
    atualizar,
    status,
    aviso,
    remontar: () => { montar(); render(); },
    mostrarDicaCena: (cat, x, y) => mostrarDica(cat ? t(`curto.${cat}`) : null, x, y),
  };
}

export { SHEET };
