import { t, getIdioma } from '../i18n.js';
import { getState, replaceState, estadoPadrao, normalizar, getConfig, setConfig } from '../store.js';
import { progressoDaPlanilha } from '../data.js';
import * as fb from '../firebase.js';
import { esc } from './util.js';

/** Boas-vindas (entrar/criar conta/continuar sem conta) e Configurações. */
export function criarModais({ aviso }) {
  const modal = document.getElementById('modal');
  const arquivo = document.getElementById('arquivo');
  let tipo = null;
  let modoForm = null; // 'entrar' | 'criar' | null
  let erro = '';
  let info = '';
  let ocupado = false;
  let usuario = null;

  function abrir(qual) {
    tipo = qual;
    modoForm = null;
    erro = '';
    info = '';
    modal.hidden = false;
    render();
    modal.querySelector('button, input')?.focus();
  }
  function fechar() {
    if (tipo === 'boas' && !getConfig().entrada && !usuario) return;
    modal.hidden = true;
    tipo = null;
  }

  function seletor(acao, atual, opcoes) {
    return `<div class="segmentado" role="group">${opcoes.map(([v, rotulo]) =>
      `<button class="seg" data-acao="${acao}" data-valor="${v}" aria-pressed="${atual === v}">${rotulo}</button>`).join('')}</div>`;
  }
  const seletorIdioma = () => seletor('idioma', getIdioma(), [['en', 'English'], ['pt', 'Português']]);

  function formulario() {
    const criar = modoForm === 'criar';
    return `<form class="form-conta" data-form="${modoForm}" novalidate>
      ${criar ? `<label>${t('boas.nome')}<input name="nome" autocomplete="nickname" maxlength="40"></label>` : ''}
      <label>${t('boas.email')}<input name="email" type="email" autocomplete="email" required></label>
      <label>${t('boas.senha')}<input name="senha" type="password" autocomplete="${criar ? 'new-password' : 'current-password'}" minlength="6" required>
        ${criar ? `<small>${t('boas.senhaDica')}</small>` : ''}</label>
      <button class="botao primario largo" type="submit" ${ocupado ? 'disabled' : ''}>${criar ? t('boas.criarBtn') : t('boas.entrarBtn')}</button>
      <div class="links">
        <button type="button" class="link" data-acao="form" data-valor="${criar ? 'entrar' : 'criar'}">${criar ? t('boas.temConta') : t('boas.semConta')}</button>
        ${criar ? '' : `<button type="button" class="link" data-acao="esqueci">${t('boas.esqueci')}</button>`}
      </div>
    </form>`;
  }

  function htmlContas() {
    if (!fb.firebaseAtivo) return `<p class="texto-dica">${t('boas.semFirebase')}</p>`;
    return `
      <button class="botao largo google" data-acao="google" ${ocupado ? 'disabled' : ''}><span class="g">G</span> ${t('boas.google')}</button>
      ${modoForm ? formulario() : `
        <div class="dupla">
          <button class="botao secundario" data-acao="form" data-valor="criar">${t('boas.criar')}</button>
          <button class="botao secundario" data-acao="form" data-valor="entrar">${t('boas.entrar')}</button>
        </div>`}
      ${erro ? `<p class="erro" role="alert">${esc(erro)}</p>` : ''}
      ${info ? `<p class="info" role="status">${esc(info)}</p>` : ''}`;
  }

  function htmlBoas() {
    return `<div class="moldura janela boas" role="dialog" aria-modal="true" aria-labelledby="titulo-modal">
      <div class="boas-idioma">${seletorIdioma()}</div>
      <h1 id="titulo-modal" class="logo">${t('boas.titulo')}</h1>
      <p class="sub">${t('app.sub')}</p>
      ${htmlContas()}
      ${fb.firebaseAtivo ? `<p class="ou"><span>${t('boas.ou')}</span></p>` : ''}
      <button class="botao largo convidado" data-acao="convidado">${t('boas.convidado')}</button>
      <p class="texto-dica centro">${t('boas.convidadoDica')}</p>
    </div>`;
  }

  function htmlConfig() {
    const c = getConfig();
    const conta = usuario
      ? `<p>${t('cfg.conectado', { nome: `<strong>${esc(usuario.displayName || usuario.email || '')}</strong>` })}</p>
         <button class="botao secundario" data-acao="sair">${t('cfg.sair')}</button>`
      : `<p class="texto-dica">${t('cfg.local')}</p>
         <button class="botao secundario" data-acao="entrar">${t('cfg.entrar')}</button>`;
    return `<div class="moldura janela config" role="dialog" aria-modal="true" aria-labelledby="titulo-modal">
      <header class="painel-topo">
        <div class="painel-titulos"><h2 id="titulo-modal">${t('cfg.titulo')}</h2></div>
        <button class="fechar" data-acao="fechar" aria-label="${t('btn.fechar')}">✕</button>
      </header>
      <div class="corpo">
        <section><h3>${t('cfg.idioma')}</h3>${seletorIdioma()}
          ${t('cfg.idiomaNota') ? `<p class="texto-dica">${t('cfg.idiomaNota')}</p>` : ''}</section>
        <section><h3>${t('cfg.estacao')}</h3>
          ${seletor('estacao', c.estacao, ['spring', 'summer', 'fall', 'winter'].map((e) => [e, t(`est.${e}`)]))}</section>
        <section><h3>${t('cfg.hora')}</h3>
          ${seletor('hora', c.hora, [['auto', t('hora.auto')], ['dia', t('hora.dia')], ['tarde', t('hora.tarde')], ['noite', t('hora.noite')]])}</section>
        <section><h3>${t('cfg.animacoes')}</h3>
          ${seletor('animacoes', String(c.animacoes), [['true', t('cfg.ligado')], ['false', t('cfg.desligado')]])}</section>
        <section><h3>${t('cfg.conta')}</h3>${conta}</section>
        <section><h3>${t('cfg.dados')}</h3>
          <button class="botao primario" data-acao="importar-planilha">${t('cfg.importarPlanilha')}</button>
          <p class="texto-dica">${t('cfg.importarPlanilhaDica')}</p>
          <div class="dupla">
            <button class="botao secundario" data-acao="baixar">${t('cfg.baixar')}</button>
            <button class="botao secundario" data-acao="restaurar">${t('cfg.restaurar')}</button>
          </div>
          <button class="botao perigo" data-acao="apagar">${t('cfg.apagar')}</button>
        </section>
      </div>
    </div>`;
  }

  function render() {
    if (!tipo) return;
    modal.innerHTML = tipo === 'boas' ? htmlBoas() : htmlConfig();
  }

  async function tentar(acao) {
    ocupado = true;
    erro = '';
    info = '';
    render();
    try {
      await acao();
    } catch (e) {
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        const chave = `erro.${e?.code}`;
        erro = t(chave) === chave ? t('erro.padrao') : t(chave);
      }
    }
    ocupado = false;
    render();
  }

  modal.addEventListener('click', async (e) => {
    if (e.target === modal) { fechar(); return; }
    const el = e.target.closest('[data-acao]');
    if (!el) return;
    const { acao, valor } = el.dataset;
    switch (acao) {
      case 'fechar': fechar(); break;
      case 'idioma': setConfig({ idioma: valor }); break;
      case 'estacao': setConfig({ estacao: valor }); break;
      case 'hora': setConfig({ hora: valor }); break;
      case 'animacoes': setConfig({ animacoes: valor === 'true' }); break;
      case 'convidado': setConfig({ entrada: 'local' }); fechar(); break;
      case 'google': await tentar(() => fb.entrarComGoogle()); break;
      case 'form': modoForm = valor; erro = ''; info = ''; render(); modal.querySelector('input')?.focus(); break;
      case 'esqueci': {
        const email = modal.querySelector('input[name="email"]')?.value.trim();
        if (!email) { erro = t('erro.auth/invalid-email'); render(); break; }
        await tentar(async () => { await fb.recuperarSenha(email); info = t('boas.linkEnviado', { email }); });
        break;
      }
      case 'entrar': abrir('boas'); break;
      case 'sair': await fb.sair(); aviso(t('msg.saiu')); render(); break;
      case 'importar-planilha': {
        const s = structuredClone(getState());
        progressoDaPlanilha(s);
        replaceState(s, { tocar: true });
        aviso(t('msg.importado'));
        break;
      }
      case 'baixar': baixar(); break;
      case 'restaurar': arquivo.click(); break;
      case 'apagar':
        if (confirm(t('cfg.apagarConfirma'))) {
          replaceState(estadoPadrao(), { tocar: true });
          aviso(t('msg.apagado'));
        }
        break;
      default: break;
    }
  });

  modal.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const dados = Object.fromEntries(new FormData(form));
    await tentar(() => (form.dataset.form === 'criar'
      ? fb.criarConta(dados.nome?.trim(), dados.email.trim(), dados.senha)
      : fb.entrarComEmail(dados.email.trim(), dados.senha)));
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) fechar();
  });

  function baixar() {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vale-perfeito-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  arquivo.addEventListener('change', async () => {
    const f = arquivo.files[0];
    arquivo.value = '';
    if (!f) return;
    try {
      const dados = JSON.parse(await f.text());
      if (!dados || typeof dados.itens !== 'object') throw new Error('formato');
      replaceState(normalizar(dados), { tocar: true });
      aviso(t('msg.restaurado'));
    } catch {
      aviso(t('msg.backupInvalido'));
    }
  });

  return {
    abrirBoas: () => abrir('boas'),
    abrirConfig: () => abrir('config'),
    definirUsuario(u) {
      usuario = u;
      if (u && tipo === 'boas') {
        setConfig({ entrada: 'conta' });
        modal.hidden = true;
        tipo = null;
      }
      render();
    },
    rerender: render,
  };
}
