import { t, getLanguage } from '../i18n.js';
import { escapeHtml } from './util.js';
import {
  getState,
  update,
  replaceState,
  createDefaultState,
  normalizeState,
  isSavedState,
  getConfig,
  setConfig,
  getFarmLayout,
  setFarmLayout,
} from '../store.js';
import { parseFarmSave } from '../farmSave.js';
import { parsePlayerSave, mergeProgress, listPlayers } from '../playerSave.js';

const SEASONS = ['auto', 'spring', 'summer', 'fall', 'winter'];
const HOURS = ['auto', 'day', 'sunset', 'night'];
const PIXEL_EFFECTS = ['strong', 'smooth', 'off'];
const LANGUAGE_OPTIONS = [
  ['en', 'English'],
  ['pt', 'Português'],
];
const BACKUP_FILE_PREFIX = 'perfect-valley';
const BACKUP_JSON_INDENT = 2;

export function createModals({ notice }) {
  const modal = document.getElementById('modal');
  const backupInput = document.getElementById('file');
  const farmInput = document.getElementById('farm-file');
  let isOpen = false;
  let pendingImport = null;

  function open() {
    isOpen = true;
    modal.hidden = false;
    render();
    modal.querySelector('button, input')?.focus();
  }

  function close() {
    modal.hidden = true;
    isOpen = false;
  }

  function selectorHtml(action, current, options) {
    const buttons = options
      .map(
        ([value, label]) => `<button class="seg" data-action="${action}" data-value="${value}" aria-pressed="${current === value}">${label}</button>`,
      )
      .join('');
    return `<div class="segmented" role="group">${buttons}</div>`;
  }

  const languageSelectorHtml = () => selectorHtml('language', getLanguage(), LANGUAGE_OPTIONS);

  function farmSectionHtml() {
    return `<section><h3>${t('settings.farm')}</h3>
          <p class="text-hint">${t('settings.farmNote')}</p>
          <div class="pair">
            <button class="button secondary" data-action="importFarm">${t('settings.importFarm')}</button>
            ${getFarmLayout() ? `<button class="button secondary" data-action="removeFarm">${t('settings.removeFarm')}</button>` : ''}
          </div>
        </section>`;
  }

  function settingsHtml() {
    const config = getConfig();
    const languageNote = t('settings.languageNote') ? `<p class="text-hint">${t('settings.languageNote')}</p>` : '';
    const seasonOptions = SEASONS.map((season) => [season, t(`season.${season}`)]);
    const hourOptions = HOURS.map((hour) => [hour, t(`hour.${hour}`)]);
    const animationOptions = [
      ['true', t('settings.on')],
      ['false', t('settings.off')],
    ];
    const pixelOptions = PIXEL_EFFECTS.map((level) => [level, t(`pixel.${level}`)]);
    return `<div class="frame window config" role="dialog" aria-modal="true" aria-labelledby="title-modal">
      <header class="panel-top">
        <div class="panel-titles"><h2 id="title-modal">${t('settings.title')}</h2></div>
        <button class="close" data-action="close" aria-label="${t('btn.close')}">✕</button>
      </header>
      <div class="body">
        <section><h3>${t('settings.language')}</h3>${languageSelectorHtml()}${languageNote}</section>
        <section><h3>${t('settings.season')}</h3>${selectorHtml('season', config.season, seasonOptions)}</section>
        <section><h3>${t('settings.hour')}</h3>${selectorHtml('hour', config.hour, hourOptions)}</section>
        <section><h3>${t('settings.animations')}</h3>${selectorHtml('animations', String(config.animations), animationOptions)}</section>
        <section><h3>${t('settings.pixel')}</h3>${selectorHtml('pixel', config.pixelEffect, pixelOptions)}</section>
        ${farmSectionHtml()}
        <section><h3>${t('settings.data')}</h3>
          <div class="actions">
            <button class="button secondary" data-action="download">${t('settings.download')}</button>
            <button class="button secondary" data-action="restore">${t('settings.restore')}</button>
            <button class="button danger" data-action="erase">${t('settings.erase')}</button>
          </div>
        </section>
      </div>
    </div>`;
  }

  function pickerHtml() {
    const buttons = pendingImport.players
      .map(
        (player) => `<button class="button secondary" data-action="pickPlayer" data-index="${player.index}">${escapeHtml(player.name)}${player.isHost ? ` · ${t('import.host')}` : ''}</button>`,
      )
      .join('');
    return `<div class="frame window config" role="dialog" aria-modal="true" aria-labelledby="title-modal">
      <header class="panel-top">
        <div class="panel-titles"><h2 id="title-modal">${t('import.pickTitle')}</h2></div>
        <button class="close" data-action="cancelPick" aria-label="${t('btn.close')}">✕</button>
      </header>
      <div class="body"><p class="text-hint">${t('import.pickNote')}</p><div class="actions">${buttons}</div></div>
    </div>`;
  }

  function render() {
    if (isOpen) {
      modal.innerHTML = pendingImport ? pickerHtml() : settingsHtml();
    }
  }

  function eraseProgress() {
    if (confirm(t('settings.eraseConfirm'))) {
      replaceState(createDefaultState(), { touch: true });
      notice(t('msg.erased'));
    }
  }

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(getState(), null, BACKUP_JSON_INDENT)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${BACKUP_FILE_PREFIX}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const clickHandlers = {
    close,
    language: ({ value }) => setConfig({ language: value }),
    season: ({ value }) => setConfig({ season: value }),
    hour: ({ value }) => setConfig({ hour: value }),
    animations: ({ value }) => setConfig({ animations: value === 'true' }),
    pixel: ({ value }) => setConfig({ pixelEffect: value }),
    download: downloadBackup,
    restore: () => backupInput.click(),
    importFarm: () => farmInput.click(),
    pickPlayer: ({ index }) => {
      const { text, layout } = pendingImport;
      pendingImport = null;
      finishImport(parsePlayerSave(text, layout, Number(index)));
    },
    cancelPick: () => {
      pendingImport = null;
      render();
    },
    removeFarm: () => {
      setFarmLayout(null);
      notice(t('msg.farmRemoved'));
      render();
    },
    erase: eraseProgress,
  };

  modal.addEventListener('click', async (event) => {
    if (event.target === modal) {
      close();
      return;
    }
    const element = event.target.closest('[data-action]');
    if (element) {
      await clickHandlers[element.dataset.action]?.(element.dataset);
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) {
      close();
    }
  });

  backupInput.addEventListener('change', async () => {
    const [file] = backupInput.files;
    backupInput.value = '';
    if (!file) {
      return;
    }
    try {
      const backup = JSON.parse(await file.text());
      if (!isSavedState(backup)) {
        throw new Error('Unrecognized backup format');
      }
      replaceState(normalizeState(backup), { touch: true });
      notice(t('msg.restored'));
    } catch {
      notice(t('msg.backupInvalid'));
    }
  });

  farmInput.addEventListener('change', async () => {
    const [file] = farmInput.files;
    farmInput.value = '';
    if (!file) {
      return;
    }
    let text;
    let layout;
    let players;
    try {
      text = await file.text();
      layout = parseFarmSave(text);
      players = listPlayers(text);
    } catch {
      notice(t('msg.farmInvalid'));
      return;
    }
    if (players.length > 1) {
      pendingImport = { text, layout, players };
      open();
      return;
    }
    finishImport(parsePlayerSave(text, layout));
  });

  function finishImport(progress) {
    update((state) => mergeProgress(state, progress));
    notice(t('msg.farmImported'));
    render();
  }

  return {
    openConfig: open,
    rerender: render,
  };
}
