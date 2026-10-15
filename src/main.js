import './style.css';
import { setIdioma } from './i18n.js';
import { getState, subscribe, replaceState, setCloudSaver, getConfig, onConfig } from './store.js';
import { criarCena } from './world/scene.js';
import { criarApp } from './ui/app.js';
import { criarModais } from './ui/modais.js';
import { observarUsuario, carregarNuvem, salvarNaNuvem } from './firebase.js';

setIdioma(getConfig().idioma);

let app = null;
const cena = criarCena(document.getElementById('cena'), {
  aoClicar: (cat) => app?.abrir(cat),
  aoPassar: (cat, x, y) => app?.mostrarDicaCena(cat, x, y),
});
const modais = criarModais({ aviso: (m) => app?.aviso(m) });
app = criarApp({ cena, abrirConfig: modais.abrirConfig });

// Preferências deste dispositivo (idioma, estação, hora, animações)
let idiomaAtual = getConfig().idioma;
function aplicarConfig(c) {
  setIdioma(c.idioma);
  cena.definirEstacao(c.estacao);
  cena.definirHora(c.hora);
  cena.definirAnimacoes(c.animacoes);
  document.body.dataset.estacao = c.estacao;
  document.body.classList.toggle('sem-animacao', !c.animacoes);
}
onConfig((c) => {
  aplicarConfig(c);
  if (c.idioma !== idiomaAtual) {
    idiomaAtual = c.idioma;
    app.remontar();
  }
  modais.rerender();
});
aplicarConfig(getConfig());

subscribe((s) => {
  cena.atualizar(s);
  app.atualizar(s);
});
cena.atualizar(getState());

if (!getConfig().entrada) modais.abrirBoas();

// Conta: vale o save mais recente (dispositivo ou nuvem)
observarUsuario(async (usuario) => {
  setCloudSaver(null);
  modais.definirUsuario(usuario);
  if (!usuario) {
    app.status('hud.local');
    return;
  }
  app.status('hud.sincronizando');
  try {
    const nuvem = await carregarNuvem(usuario.uid);
    const local = getState();
    if (nuvem && (nuvem.atualizadoEm || 0) > (local.atualizadoEm || 0)) replaceState(nuvem, { nuvem: false });
    else await salvarNaNuvem(usuario.uid, local);
    setCloudSaver((s) => {
      app.status('hud.salvando');
      salvarNaNuvem(usuario.uid, s).then(() => app.status('hud.nuvem')).catch(() => app.status('hud.falha'));
    });
    app.status('hud.nuvem');
  } catch {
    app.status('hud.offline');
  }
});
