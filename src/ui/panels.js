import { SHEET, CATEGORIES, SKILLS, EXTRA_COLLECTION_ICONS, EXTRA_COLLECTIONS } from '../catalog.js';
import { findItemByName, iconUrl } from '../items.js';
import { completedCount, totalOf, completionFraction, farmerLevel, requiredHearts, countCollected } from '../progress.js';
import { t, translateTerm } from '../i18n.js';
import { pixelIcon } from '../icons.js';
import { escapeHtml, iconHtml, blockBarHtml } from './util.js';

const COLLECTION_PANEL_PREFIX = 'collection:';
const REFERENCE_ONLY_COLLECTION = 'bestiary';
const EMPTY_HEART_COLORS = { r: '#e8c98d', k: '#8a5a2b' };
const MAX_HEARTS = 10;
const MAX_SKILL_LEVEL = 10;
const PROGRESS_BAR_BLOCKS = 24;
const MINI_BAR_BLOCKS = 10;

const filters = {};

export function filterOf(collection) {
  filters[collection] ??= { status: 'all', section: null, search: '', selected: null, quick: false };
  return filters[collection];
}

export const collectionPanelId = (collection) => `${COLLECTION_PANEL_PREFIX}${collection}`;

export const collectionOfPanel = (panelId) => (panelId?.startsWith(COLLECTION_PANEL_PREFIX) ? panelId.slice(COLLECTION_PANEL_PREFIX.length) : null);

export const isReferenceOnly = (collection) => collection === REFERENCE_ONLY_COLLECTION;

const progressText = (done, total) => t('panel.progress', { a: done, b: total });

function headerHtml({ icon, title, lines, fraction, hasBackButton = false }) {
  const backButton = hasBackButton
    ? `<button class="button square small" data-action="back" data-focus="back" aria-label="${t('btn.back')}">‹</button>`
    : '';
  const progressBar = fraction === undefined ? '' : `<div class="panel-bar">${blockBarHtml(fraction, PROGRESS_BAR_BLOCKS)}</div>`;
  return `
    <header class="panel-top">
      ${backButton}
      <div class="panel-icon">${iconHtml(icon)}</div>
      <div class="panel-titles"><h2>${escapeHtml(title)}</h2>${lines.map((line) => `<p>${line}</p>`).join('')}</div>
      <button class="close" data-action="close" data-focus="close" aria-label="${t('btn.close')}">✕</button>
    </header>
    ${progressBar}`;
}

function categoryProgressLine(category, state) {
  if (category.kind === 'single') {
    return '';
  }
  const done = completedCount(category, state);
  const total = totalOf(category);
  return category.kind === 'walnuts' ? t('walnuts.total', { a: done, b: total }) : progressText(done, total);
}

function extraCollectionPanel(collection, state) {
  const referenceOnly = isReferenceOnly(collection);
  const total = SHEET.collections[collection].length;
  const done = countCollected(state, collection);
  const header = headerHtml({
    icon: EXTRA_COLLECTION_ICONS[collection],
    title: t(`collection.${collection}`),
    lines: [referenceOnly ? t('detail.withoutCheck') : progressText(done, total)],
    fraction: referenceOnly ? undefined : done / total,
    hasBackButton: true,
  });
  return header + collectionBody(collection, state);
}

function categoryPanel(category, state) {
  const header = headerHtml({
    icon: category.icon,
    title: t(`cat.${category.id}`),
    lines: [t('panel.vale', { p: category.weight }), categoryProgressLine(category, state)].filter(Boolean),
    fraction: completionFraction(category, state),
  });
  if (category.kind === 'collection') {
    return header + collectionBody(category.collection, state);
  }
  const bodies = {
    list: () => listBody(category, state),
    single: () => clockBody(state),
    goals: () => goalsBody(state),
    villagers: () => villagersBody(state),
    skills: () => skillsBody(state),
    walnuts: () => walnutsBody(state),
  };
  return `${header}<div class="body"><p class="text-hint">${t(`hint.${category.id}`)}</p>${bodies[category.kind]()}</div>`;
}

export function panelHtml(panelId, state) {
  if (panelId === 'extras') {
    return extrasPanel(state);
  }
  const collection = collectionOfPanel(panelId);
  if (collection) {
    return extraCollectionPanel(collection, state);
  }
  return categoryPanel(
    CATEGORIES.find((category) => category.id === panelId),
    state,
  );
}

function isItemVisible(item, { filter, checked, referenceOnly }) {
  if (filter.section && item.section !== filter.section) {
    return false;
  }
  if (!referenceOnly && filter.status === 'missing' && checked[item.id]) {
    return false;
  }
  if (!referenceOnly && filter.status === 'done' && !checked[item.id]) {
    return false;
  }
  const search = filter.search.trim().toLowerCase();
  return !search || item.name.toLowerCase().includes(search) || translateTerm(item.name).toLowerCase().includes(search);
}

function statusFilterHtml(filter) {
  const buttons = ['missing', 'done', 'all']
    .map(
      (status) =>
        `<button class="seg" data-action="status" data-value="${status}" data-focus="st-${status}" aria-pressed="${filter.status === status}">${t(`filter.${status}`)}</button>`,
    )
    .join('');
  return `<div class="segmented" role="group">${buttons}</div>`;
}

function quickFilterHtml(filter) {
  return `
    <label class="switch" title="${t('filter.quickHint')}">
      <input type="checkbox" class="box" data-action="quick" data-focus="quick" ${filter.quick ? 'checked' : ''}> ${t('filter.quick')}
    </label>`;
}

function sectionChipsHtml(sections, filter) {
  if (sections.length <= 1) {
    return '';
  }
  const chips = sections
    .map(
      (section, index) =>
        `<button class="chip" data-action="section" data-value="${escapeHtml(section)}" data-focus="section-${index}" aria-pressed="${filter.section === section}">${escapeHtml(translateTerm(section))}</button>`,
    )
    .join('');
  return `
    <div class="chips" role="group">
      <button class="chip" data-action="section" data-value="" data-focus="section-all" aria-pressed="${!filter.section}">${t('filter.everything')}</button>
      ${chips}
    </div>`;
}

function itemSlotHtml(item, { isSelected, isDone, referenceOnly }) {
  const name = escapeHtml(translateTerm(item.name));
  const stateLabel = referenceOnly ? '' : `: ${isDone ? t('detail.done') : t('detail.missing')}`;
  const seenMark = !referenceOnly && isDone ? '<span class="seen" aria-hidden="true"></span>' : '';
  return `<button class="slot-item${isDone ? ' done' : ''}${isSelected ? ' selected' : ''}" data-action="item" data-id="${item.id}"
        data-focus="it-${item.id}" data-hint="${name}" aria-label="${name}${stateLabel}">
        <img src="${iconUrl(item.icon)}" alt="" loading="lazy" draggable="false">${seenMark}</button>`;
}

function itemGridHtml(visibleItems, { filter, checked, referenceOnly }) {
  if (!visibleItems.length) {
    const message = filter.search.trim() ? t('empty.search', { q: escapeHtml(filter.search) }) : t('empty.missing');
    return `<p class="empty">${message}</p>`;
  }
  const slots = visibleItems
    .map((item) => itemSlotHtml(item, { isSelected: filter.selected === item.id, isDone: referenceOnly || checked[item.id], referenceOnly }))
    .join('');
  return `<div class="grid">${slots}</div>`;
}

function collectionBody(collection, state) {
  const referenceOnly = isReferenceOnly(collection);
  const filter = filterOf(collection);
  const items = SHEET.collections[collection];
  const checked = state.items[collection] || {};
  const sections = [...new Set(items.map((item) => item.section).filter(Boolean))];
  const filterContext = { filter, checked, referenceOnly };
  const visibleItems = items.filter((item) => isItemVisible(item, filterContext));
  const selectedItem = items.find((item) => item.id === filter.selected);

  return `
    <div class="tools">
      ${referenceOnly ? '' : statusFilterHtml(filter)}
      <label class="search"><span class="sr">${t('filter.search')}</span>
        <input type="search" placeholder="${t('filter.search')}" value="${escapeHtml(filter.search)}" data-action="search" data-focus="search"></label>
      ${referenceOnly ? '' : quickFilterHtml(filter)}
    </div>
    ${sectionChipsHtml(sections, filter)}
    ${itemDetail(selectedItem, checked, referenceOnly)}
    <div class="body">${itemGridHtml(visibleItems, filterContext)}</div>`;
}

function itemDetail(item, checked, referenceOnly) {
  if (!item) {
    return `<div class="detail empty-detail"><p>${t('detail.choice')}</p></div>`;
  }
  const isDone = referenceOnly || checked[item.id];
  const details = (item.details || [])
    .map(([label, value]) => `<dt>${escapeHtml(translateTerm(label.replace(/\s*\(.*\)$/, '')))}</dt><dd>${escapeHtml(translateTerm(value))}</dd>`)
    .join('');
  const toggleButton = referenceOnly
    ? ''
    : `<button class="button ${isDone ? 'secondary' : 'primary'}" data-action="toggle" data-id="${item.id}" data-focus="toggle">
        ${isDone ? t('detail.unmark') : t('detail.mark')}</button>`;
  return `
    <div class="detail${isDone ? ' done' : ''}">
      <div class="detail-icon"><img src="${iconUrl(item.icon)}" alt=""></div>
      <div class="detail-text">
        <h3>${escapeHtml(translateTerm(item.name))}</h3>
        ${item.section ? `<p class="detail-section">${escapeHtml(translateTerm(item.section))}</p>` : ''}
        ${details ? `<dl>${details}</dl>` : ''}
        ${item.note ? `<details><summary>${t('detail.notes')}</summary><p class="note">${escapeHtml(translateTerm(item.note))}</p></details>` : ''}
      </div>
      ${toggleButton}
    </div>`;
}

const translatedName = (key, fallback) => {
  const translation = t(key);
  return translation === key ? translateTerm(fallback) : translation;
};

function listBody(category, state) {
  const rows = category.items
    .map((item) => {
      const isDone = Boolean(state[category.key][item.id]);
      const source = translatedName(`source.${item.id}`, item.source || '');
      return `<li><label class="line${isDone ? ' done' : ''}">
      <input type="checkbox" class="box" data-action="mark" data-key="${category.key}" data-id="${item.id}" data-focus="m-${item.id}" ${isDone ? 'checked' : ''}>
      <span class="line-text"><strong>${escapeHtml(translatedName(`name.${item.id}`, item.name))}</strong>${source ? `<small>${escapeHtml(source)}</small>` : ''}</span>
    </label></li>`;
    })
    .join('');
  return `<ul class="list">${rows}</ul>`;
}

function clockBody(state) {
  return `<label class="line large${state.clock ? ' done' : ''}">
    <input type="checkbox" class="box" data-action="clock" data-focus="clock" ${state.clock ? 'checked' : ''}>
    <span class="line-text"><strong>${t('clock.mark')}</strong><small>${t('clock.sub')}</small></span>
  </label>`;
}

function goalsBody(state) {
  const rows = SHEET.monsterGoals
    .map((monster) => {
      const slain = state.monsters[monster.id] || 0;
      const description = monster.description ? ` (${escapeHtml(translateTerm(monster.description))})` : '';
      return `<li class="line${slain >= monster.goal ? ' done' : ''}">
      <span class="line-text"><strong>${escapeHtml(translatedName(`name.${monster.id}`, monster.name))}</strong>
        <small>${t('monsters.reward')}: ${escapeHtml(translateTerm(monster.reward))}${description}</small>
        ${blockBarHtml(slain / monster.goal, MINI_BAR_BLOCKS, 'mini')}</span>
      <label class="goal-field">
        <input type="number" inputmode="numeric" min="0" value="${slain}" data-action="monster" data-id="${monster.id}" data-focus="mo-${monster.id}" aria-label="${escapeHtml(monster.name)}">
        <span>/ ${monster.goal}</span>
      </label>
    </li>`;
    })
    .join('');
  return `<ul class="list">${rows}</ul>
  <button class="button secondary wide" data-action="open" data-value="${collectionPanelId(REFERENCE_ONLY_COLLECTION)}" data-focus="bestiary">${iconHtml(EXTRA_COLLECTION_ICONS.bestiary)} ${t('collection.bestiary')}</button>`;
}

function pipsHtml({ action, id, value, required, label, isHeart }) {
  const pips = Array.from({ length: MAX_HEARTS }, (_, index) => {
    const position = index + 1;
    const isFull = position <= value;
    const symbol = isHeart ? pixelIcon('heart', isFull ? {} : EMPTY_HEART_COLORS) : '<span class="point"></span>';
    return `<button class="pip${position > required ? ' extra' : ''}" data-action="${action}" data-id="${escapeHtml(id)}" data-n="${position}"
      data-focus="${action}-${escapeHtml(id)}-${position}" aria-label="${escapeHtml(label)}: ${position}" aria-pressed="${isFull}">
      ${symbol}</button>`;
  });
  return pips.join('');
}

function giftsHtml(names) {
  return (names || [])
    .map((name) => {
      const item = findItemByName(name);
      const translatedGiftName = escapeHtml(translateTerm(name));
      return item
        ? `<img class="gift" src="${iconUrl(item.icon)}" alt="${translatedGiftName}" data-hint="${translatedGiftName}" loading="lazy">`
        : `<span class="gift-text">${translatedGiftName}</span>`;
    })
    .join('');
}

function villagerGiftsHtml(villager) {
  if (!villager.loves?.length) {
    return '';
  }
  const likes = villager.likes?.length ? `<p class="small">${t('friends.likes')}</p><div class="gifts">${giftsHtml(villager.likes)}</div>` : '';
  return `<details><summary>${t('friends.loves')} / ${t('friends.likes')}</summary>
          <p class="small">${t('friends.loves')}</p><div class="gifts">${giftsHtml(villager.loves)}</div>
          ${likes}
        </details>`;
}

function villagersBody(state) {
  const rows = SHEET.villagers
    .map((villager) => {
      const hearts = state.friends[villager.name] || 0;
      const required = requiredHearts(villager);
      const name = translateTerm(villager.name);
      const candidateSeal = villager.isMarriageCandidate ? ` <span class="seal" title="${t('friends.candidate')}">♥</span>` : '';
      return `<li class="villager${hearts >= required ? ' done' : ''}">
      <div class="portrait"><img src="${iconUrl(villager.icon)}" alt="" loading="lazy"></div>
      <div class="villager-info">
        <h3>${escapeHtml(name)}${candidateSeal}</h3>
        <p class="small">${t('friends.birthday')}: ${escapeHtml(translateTerm(villager.birthday))} · ${t('friends.hearts', { n: hearts, m: required })}</p>
        <div class="pips">${pipsHtml({ action: 'heart', id: villager.name, value: hearts, required, label: name, isHeart: true })}</div>
        ${villagerGiftsHtml(villager)}
      </div>
    </li>`;
    })
    .join('');
  return `<ul class="villagers">${rows}</ul>`;
}

function skillsBody(state) {
  const rows = SKILLS.map((skill) => {
    const level = state.skills[skill] || 0;
    const label = t(`skill.${skill}`);
    return `<li class="line${level >= MAX_SKILL_LEVEL ? ' done' : ''}">
        <span class="line-text"><strong>${label}</strong><small>${t('level.n', { n: level })}</small></span>
        <span class="pips">${pipsHtml({ action: 'skill', id: skill, value: level, required: MAX_SKILL_LEVEL, label, isHeart: false })}</span>
      </li>`;
  }).join('');
  return `<p class="highlight">${t('level.title', { n: `<strong>${farmerLevel(state)}</strong>` })}</p>
    <ul class="list">${rows}</ul>`;
}

function groupBySection(walnuts) {
  const groups = {};
  for (const walnut of walnuts) {
    (groups[walnut.section] ??= []).push(walnut);
  }
  return groups;
}

const sumPoints = (walnuts, isIncluded = () => true) => walnuts.reduce((total, walnut) => total + (isIncluded(walnut) ? walnut.points : 0), 0);

function walnutRowHtml(walnut, state) {
  const isDone = state.walnuts[walnut.id];
  return `<li><label class="line${isDone ? ' done' : ''}">
          <input type="checkbox" class="box" data-action="mark" data-key="walnuts" data-id="${walnut.id}" data-focus="nz-${walnut.id}" ${isDone ? 'checked' : ''}>
          <span class="line-text"><strong>${escapeHtml(translateTerm(walnut.kind))} <span class="points">×${walnut.points}</span></strong>${walnut.source ? `<small>${escapeHtml(translateTerm(walnut.source))}</small>` : ''}</span>
        </label></li>`;
}

function walnutSectionHtml([section, walnuts], state, filter) {
  const visibleWalnuts = walnuts.filter((walnut) => filter.status !== 'missing' || !state.walnuts[walnut.id]);
  if (!visibleWalnuts.length) {
    return '';
  }
  const done = sumPoints(walnuts, (walnut) => state.walnuts[walnut.id]);
  return `<h3 class="subtitle">${escapeHtml(translateTerm(section))} <small>${done}/${sumPoints(walnuts)}</small></h3>
        <ul class="list">${visibleWalnuts.map((walnut) => walnutRowHtml(walnut, state)).join('')}</ul>`;
}

function walnutsBody(state) {
  const filter = filterOf('walnuts');
  const statusButtons = ['missing', 'all']
    .map((status) => {
      const isActive = status === 'missing' ? filter.status === 'missing' : filter.status !== 'missing';
      return `<button class="seg" data-action="status-walnuts" data-value="${status}" data-focus="nz-${status}" aria-pressed="${isActive}">${t(`filter.${status}`)}</button>`;
    })
    .join('');
  const sections = Object.entries(groupBySection(SHEET.walnuts))
    .map((sectionEntry) => walnutSectionHtml(sectionEntry, state, filter))
    .join('');
  return `<div class="segmented" role="group">${statusButtons}</div>${sections}`;
}

function extraCollectionButtonHtml(collection, state) {
  const total = SHEET.collections[collection].length;
  const done = countCollected(state, collection);
  const referenceOnly = isReferenceOnly(collection);
  return `<button class="extra frame-thin" data-action="open" data-value="${collectionPanelId(collection)}" data-focus="ex-${collection}">
        ${iconHtml(EXTRA_COLLECTION_ICONS[collection], 'large')}
        <span><strong>${t(`collection.${collection}`)}</strong><small>${referenceOnly ? total : progressText(done, total)}</small></span>
        ${referenceOnly ? '' : blockBarHtml(done / total, MINI_BAR_BLOCKS, 'mini')}
      </button>`;
}

function extrasPanel(state) {
  const header = headerHtml({ icon: { pixel: 'backpack' }, title: t('cat.extras'), lines: [t('hint.extras')] });
  return `${header}
    <div class="body"><div class="extras">${EXTRA_COLLECTIONS.map((collection) => extraCollectionButtonHtml(collection, state)).join('')}</div></div>`;
}
