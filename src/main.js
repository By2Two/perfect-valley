import './style.css';
import { setLanguage, onTranslationLoaded } from './i18n.js';
import { getState, subscribe, getConfig, onConfig, getFarmLayout, onFarmLayout } from './store.js';
import { resolveSeason } from './season.js';
import { createScene } from './world/scene.js';
import { createApp } from './ui/app.js';
import { createModals } from './ui/modals.js';

setLanguage(getConfig().language);

let app = null;
const scene = createScene(document.getElementById('scene'), {
  onClick: (cat) => app?.open(cat),
  onHover: (cat, x, y) => app?.showSceneHint(cat, x, y),
});
const modals = createModals({ notice: (m) => app?.notice(m) });
app = createApp({ scene, openConfig: modals.openConfig });

let currentLanguage = getConfig().language;
function seasonFor(c) {
  const layout = getFarmLayout();
  return c.season === 'auto' && layout ? layout.season : resolveSeason(c.season);
}

let appliedLayout;
function applyConfig(c) {
  setLanguage(c.language);
  if (getFarmLayout() !== appliedLayout) {
    appliedLayout = getFarmLayout();
    scene.setLayout(appliedLayout);
  }
  scene.setSeason(seasonFor(c));
  scene.setHour(c.hour);
  scene.setAnimations(c.animations);
  document.body.dataset.season = seasonFor(c);
  document.body.classList.toggle('without-animation', !c.animations);
}
onFarmLayout(() => applyConfig(getConfig()));
onConfig((c) => {
  applyConfig(c);
  if (c.language !== currentLanguage) {
    currentLanguage = c.language;
    app.remount();
  }
  modals.rerender();
});
applyConfig(getConfig());
onTranslationLoaded(() => {
  app.remount();
  modals.rerender();
});

subscribe((s) => {
  scene.refresh(s);
  app.refresh(s);
});
scene.refresh(getState());
