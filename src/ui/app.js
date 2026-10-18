import { CATEGORIES } from '../catalog.js';
import { completionFraction, perfectionPercent } from '../progress.js';
import { getState, update } from '../store.js';
import { t, getLanguage } from '../i18n.js';
import { pixelIcon } from '../icons.js';
import { escapeHtml, iconHtml, blockBarHtml, formatPercent, clamp } from './util.js';
import { panelHtml, filterOf, collectionOfPanel, isReferenceOnly } from './panels.js';

const SLOT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
const EXTRAS_SLOT = 'extras';
const SLOTS = [...CATEGORIES.map((category) => category.id), EXTRAS_SLOT];
const CHANGE_ACTIONS = new Set(['mark', 'clock', 'monster', 'quick', 'search']);
const CONTROLS = [
  { action: 'zoomOut', icon: 'minus', labelKey: 'btn.zoomOut' },
  { action: 'zoomIn', icon: 'plus', labelKey: 'btn.zoomIn' },
  { action: 'recenter', icon: 'target', labelKey: 'btn.recenter' },
  { action: 'config', icon: 'gear', labelKey: 'btn.config' },
];
const HUD_BAR_BLOCKS = 25;
const SLOT_BAR_BLOCKS = 5;
const MAX_KILL_COUNT = 99999;
const NOTICE_DURATION_MS = 4200;
const ACHIEVEMENT_DURATION_MS = 5000;
const HINT_OFFSET = { x: 14, y: 18, margin: 8 };
const FOCUSABLE_INPUTS = 'input, textarea, select';

export function createApp({ scene, openConfig }) {
  const byId = (id) => document.getElementById(id);
  const hud = byId('hud');
  const controls = byId('controls');
  const bar = byId('bar');
  const panel = byId('panel');
  const hint = byId('hint');
  const toasts = byId('toasts');

  let openPanelId = null;
  let panelHistory = [];
  let lastFractions = null;
  let highlightedItemId = null;

  function slotHtml(id, index) {
    const category = CATEGORIES.find((candidate) => candidate.id === id);
    const name = t(`short.${id}`);
    return `<button class="slot" data-slot="${id}" aria-pressed="${openPanelId === id}" aria-label="${name}" data-hint="${name} · ${t('key', { k: SLOT_KEYS[index] })}">
        <span class="key" aria-hidden="true">${SLOT_KEYS[index]}</span>${iconHtml(category ? category.icon : { pixel: 'backpack' })}
        ${category ? '<span class="fill"></span>' : ''}</button>`;
  }

  function controlHtml({ action, icon, labelKey }) {
    return `<button class="button icon-button" data-action="${action}" aria-label="${t(labelKey)}" data-hint="${t(labelKey)}">${pixelIcon(icon)}</button>`;
  }

  function mount() {
    hud.className = 'frame hud';
    hud.innerHTML = `
      <p class="hud-brand">${t('app.name')}</p>
      <div class="hud-line">
        <div class="hud-star">${pixelIcon('star')}</div>
        <p class="hud-value"><span data-pct>0.0</span><small>%</small></p>
      </div>
      <p class="hud-label">${t('hud.perfection')}</p>
      <div data-bar></div>
      <p class="hud-status">${t('hud.local')}</p>`;
    controls.innerHTML = CONTROLS.map(controlHtml).join('');
    bar.className = 'frame bar';
    bar.innerHTML = SLOTS.map(slotHtml).join('');
    refresh(getState());
  }

  function togglePanel(id) {
    if (openPanelId === id) {
      closePanel();
    } else {
      openPanel(id);
    }
  }

  function openPanel(id, { stack = false } = {}) {
    panelHistory = stack && openPanelId ? [...panelHistory, openPanelId] : [];
    openPanelId = id;
    panel.hidden = false;
    document.body.classList.add('panel-open');
    render({ fromTop: true });
    markSlots();
    scene.openSpace(true);
  }

  function closePanel() {
    openPanelId = null;
    panelHistory = [];
    panel.hidden = true;
    document.body.classList.remove('panel-open');
    markSlots();
    scene.openSpace(false);
  }

  function goBack() {
    const previousPanelId = panelHistory.pop();
    if (!previousPanelId) {
      closePanel();
      return;
    }
    openPanelId = previousPanelId;
    render({ fromTop: true });
    markSlots();
  }

  function markSlots() {
    const rootSlot = collectionOfPanel(openPanelId) ? EXTRAS_SLOT : openPanelId;
    bar.querySelectorAll('.slot').forEach((slot) => slot.setAttribute('aria-pressed', String(slot.dataset.slot === rootSlot)));
  }

  const currentCollection = () => collectionOfPanel(openPanelId) ?? CATEGORIES.find((category) => category.id === openPanelId)?.collection;

  const isWidePanel = () =>
    Boolean(collectionOfPanel(openPanelId)) || CATEGORIES.find((category) => category.id === openPanelId)?.kind === 'collection';

  function restoreFocus({ focusId, cursor }) {
    if (!focusId) {
      return;
    }
    const element = panel.querySelector(`[data-focus="${CSS.escape(focusId)}"]`);
    element?.focus({ preventScroll: true });
    if (element?.setSelectionRange && cursor !== undefined) {
      element.setSelectionRange(cursor, cursor);
    }
  }

  function render({ fromTop = false } = {}) {
    if (!openPanelId) {
      return;
    }
    showHint(null);
    const { focus: focusId } = document.activeElement?.dataset ?? {};
    const cursor = document.activeElement?.selectionStart ?? undefined;
    const scroll = fromTop ? 0 : panel.querySelector('.body')?.scrollTop || 0;
    const collection = currentCollection();
    const hasDetail = Boolean(collection && filterOf(collection).selected);
    panel.className = `frame panel${isWidePanel() ? ' wide' : ''}${hasDetail ? ' detail-open' : ''}`;
    panel.innerHTML = panelHtml(openPanelId, getState());
    const body = panel.querySelector('.body');
    if (body) {
      body.scrollTop = scroll;
    }
    restoreFocus({ focusId, cursor });
    if (highlightedItemId) {
      panel.querySelector(`[data-focus="it-${CSS.escape(highlightedItemId)}"]`)?.classList.add('glow');
      highlightedItemId = null;
    }
  }

  function toggleItem(collection, id) {
    update((state) => {
      state.items[collection][id] = !state.items[collection][id];
      if (state.items[collection][id]) {
        highlightedItemId = id;
      } else {
        delete state.items[collection][id];
      }
    });
  }

  function setPips(group, id, value) {
    update((state) => {
      state[group][id] = (state[group][id] || 0) === value ? value - 1 : value;
    });
  }

  function selectItem(collection, id) {
    const filter = filterOf(collection);
    if (filter.quick && !isReferenceOnly(collection)) {
      toggleItem(collection, id);
      return;
    }
    filter.selected = id;
    render();
  }

  const panelClickHandlers = {
    close: closePanel,
    back: goBack,
    open: ({ value }) => openPanel(value, { stack: true }),
    status: ({ value, collection }) => {
      filterOf(collection).status = value;
      render({ fromTop: true });
    },
    section: ({ value, collection }) => {
      filterOf(collection).section = value || null;
      render({ fromTop: true });
    },
    'status-walnuts': ({ value }) => {
      filterOf('walnuts').status = value;
      render();
    },
    item: ({ id, collection }) => selectItem(collection, id),
    deselect: ({ collection }) => {
      filterOf(collection).selected = null;
      render();
    },
    toggle: ({ id, collection }) => toggleItem(collection, id),
    heart: ({ id, count }) => setPips('friends', id, count),
    skill: ({ id, count }) => setPips('skills', id, count),
  };

  const panelChangeHandlers = {
    mark: ({ element, id, key }) =>
      update((state) => {
        state[key][id] = element.checked;
        if (!element.checked) {
          delete state[key][id];
        }
      }),
    clock: ({ element }) =>
      update((state) => {
        state.clock = element.checked;
      }),
    monster: ({ element, id }) =>
      update((state) => {
        state.monsters[id] = clamp(Math.floor(Number(element.value)), 0, MAX_KILL_COUNT);
      }),
    quick: ({ element }) => {
      filterOf(currentCollection()).quick = element.checked;
      render();
    },
  };

  controls.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) {
      return;
    }
    const { action } = button.dataset;
    if (action === 'config') {
      openConfig();
    } else {
      scene[action]();
    }
  });

  bar.addEventListener('click', (event) => {
    const slot = event.target.closest('.slot');
    if (slot) {
      togglePanel(slot.dataset.slot);
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.target.matches(FOCUSABLE_INPUTS) || event.ctrlKey || event.metaKey || event.altKey || !byId('modal').hidden) {
      return;
    }
    const slotIndex = SLOT_KEYS.indexOf(event.key);
    if (slotIndex >= 0) {
      togglePanel(SLOTS[slotIndex]);
    }
    if (event.key === 'Escape') {
      closePanel();
    }
    if (event.key === '+') {
      scene.zoomIn();
    }
    if (event.key === '_') {
      scene.zoomOut();
    }
  });

  document.addEventListener('pointerover', (event) => {
    if (event.target === byId('scene')) {
      return;
    }
    const element = event.target.closest?.('[data-hint]');
    showHint(element ? element.dataset.hint : null, event.clientX, event.clientY);
  });

  document.addEventListener('pointerout', (event) => {
    if (event.target.closest?.('[data-hint]')) {
      showHint(null);
    }
  });

  panel.addEventListener('click', (event) => {
    const element = event.target.closest('[data-action]');
    if (!element || CHANGE_ACTIONS.has(element.dataset.action)) {
      return;
    }
    const { action, id, value, n } = element.dataset;
    panelClickHandlers[action]?.({ id, value, count: Number(n), collection: currentCollection() });
  });

  panel.addEventListener('input', (event) => {
    const element = event.target.closest('[data-action="search"]');
    if (element) {
      filterOf(currentCollection()).search = element.value;
      render({ fromTop: true });
    }
  });

  panel.addEventListener('change', (event) => {
    const element = event.target.closest('[data-action]');
    if (element) {
      const { action, id, key } = element.dataset;
      panelChangeHandlers[action]?.({ element, id, key });
    }
  });

  function celebrateCompletedCategories(fractions) {
    if (!lastFractions) {
      return;
    }
    CATEGORIES.filter((category) => fractions[category.id] >= 1 && lastFractions[category.id] < 1).forEach((category) => {
      celebrate(t('toast.category', { cat: t(`short.${category.id}`) }));
      bar.querySelector(`[data-slot="${category.id}"]`)?.classList.add('glow');
    });
  }

  function refresh(state) {
    const percent = perfectionPercent(state);
    hud.querySelector('[data-pct]').textContent = formatPercent(percent, getLanguage());
    hud.querySelector('[data-bar]').innerHTML = blockBarHtml(percent / 100, HUD_BAR_BLOCKS, 'gold');
    const fractions = {};
    CATEGORIES.forEach((category) => {
      const fraction = completionFraction(category, state);
      fractions[category.id] = fraction;
      const slot = bar.querySelector(`[data-slot="${category.id}"]`);
      if (slot) {
        slot.querySelector('.fill').innerHTML = blockBarHtml(fraction, SLOT_BAR_BLOCKS, 'mini');
        slot.classList.toggle('complete', fraction >= 1);
      }
    });
    celebrateCompletedCategories(fractions);
    lastFractions = fractions;
    render();
  }

  function showToast({ className, html, durationMs }) {
    const element = document.createElement('div');
    element.className = `toast ${className}`;
    element.innerHTML = html;
    toasts.append(element);
    setTimeout(() => element.remove(), durationMs);
  }

  function notice(text) {
    showToast({ className: 'frame-thin', html: escapeHtml(text), durationMs: NOTICE_DURATION_MS });
  }

  function celebrate(text) {
    showToast({
      className: 'achievement frame-thin',
      html: `<span class="toast-star">${pixelIcon('star')}</span><span><strong>${t('toast.goal')}</strong><br>${escapeHtml(text)}</span>`,
      durationMs: ACHIEVEMENT_DURATION_MS,
    });
  }

  function showHint(text, x, y) {
    if (!text) {
      hint.hidden = true;
      return;
    }
    hint.textContent = text;
    hint.hidden = false;
    hint.style.left = `${Math.min(x + HINT_OFFSET.x, window.innerWidth - hint.offsetWidth - HINT_OFFSET.margin)}px`;
    hint.style.top = `${y + HINT_OFFSET.y}px`;
  }

  mount();

  return {
    open: (categoryId) => openPanel(categoryId),
    refresh,
    notice,
    remount: () => {
      mount();
      render();
    },
    showSceneHint: (categoryId, x, y) => showHint(categoryId ? t(`short.${categoryId}`) : null, x, y),
  };
}
