import './style.css';
import { setLanguage, onTranslationLoaded } from './i18n.js';
import { getState, subscribe, replaceState, setCloudSaver, getConfig, onConfig } from './store.js';
import { createScene } from './world/scene.js';
import { createApp } from './ui/app.js';
import { createModals } from './ui/modals.js';
import { observeUser, loadCloudSave, saveToCloud } from './firebase.js';

setLanguage(getConfig().language);

let app = null;
const scene = createScene(document.getElementById('scene'), {
  onClick: (cat) => app?.open(cat),
  onHover: (cat, x, y) => app?.showSceneHint(cat, x, y),
});
const modals = createModals({ notice: (m) => app?.notice(m) });
app = createApp({ scene, openConfig: modals.openConfig });

let currentLanguage = getConfig().language;
function applyConfig(c) {
  setLanguage(c.language);
  scene.setSeason(c.season);
  scene.setHour(c.hour);
  scene.setAnimations(c.animations);
  document.body.dataset.season = c.season;
  document.body.classList.toggle('without-animation', !c.animations);
}
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

if (!getConfig().entry) {
  modals.openWelcome();
}

observeUser(async (user) => {
  setCloudSaver(null);
  modals.setUser(user);
  if (!user) {
    app.status('hud.local');
    return;
  }
  app.status('hud.syncing');
  try {
    const cloud = await loadCloudSave(user.uid);
    const local = getState();
    if (cloud && (cloud.updatedAt || 0) > (local.updatedAt || 0)) {
      replaceState(cloud, { cloud: false });
    } else {
      await saveToCloud(user.uid, local);
    }
    setCloudSaver((s) => {
      app.status('hud.saving');
      saveToCloud(user.uid, s)
        .then(() => app.status('hud.cloud'))
        .catch(() => app.status('hud.failure'));
    });
    app.status('hud.cloud');
  } catch {
    app.status('hud.offline');
  }
});
