import { t, getLanguage } from '../i18n.js';
import { getState, replaceState, createDefaultState, normalizeState, isSavedState, getConfig, setConfig } from '../store.js';
import { applySpreadsheetProgress } from '../progress.js';
import * as firebase from '../firebase.js';
import { escapeHtml } from './util.js';

const SEASONS = ['spring', 'summer', 'fall', 'winter'];
const HOURS = ['auto', 'day', 'sunset', 'night'];
const LANGUAGE_OPTIONS = [
  ['en', 'English'],
  ['pt', 'Português'],
];
const SILENT_AUTH_ERRORS = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);
const BACKUP_FILE_PREFIX = 'perfect-valley';
const BACKUP_JSON_INDENT = 2;

export function createModals({ notice }) {
  const modal = document.getElementById('modal');
  const backupInput = document.getElementById('file');
  let kind = null;
  let formMode = null;
  let errorMessage = '';
  let infoMessage = '';
  let isBusy = false;
  let user = null;

  function clearMessages() {
    errorMessage = '';
    infoMessage = '';
  }

  function open(requestedKind) {
    kind = requestedKind;
    formMode = null;
    clearMessages();
    modal.hidden = false;
    render();
    modal.querySelector('button, input')?.focus();
  }

  function close() {
    if (kind === 'welcome' && !getConfig().entry && !user) {
      return;
    }
    modal.hidden = true;
    kind = null;
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

  function accountFormHtml() {
    const isCreating = formMode === 'create';
    const nameField = isCreating ? `<label>${t('welcome.name')}<input name="name" autocomplete="nickname" maxlength="40"></label>` : '';
    const passwordHint = isCreating ? `<small>${t('welcome.passwordHint')}</small>` : '';
    const forgotButton = isCreating ? '' : `<button type="button" class="link" data-action="forgot">${t('welcome.forgot')}</button>`;
    return `<form class="form-account" data-form="${formMode}" novalidate>
      ${nameField}
      <label>${t('welcome.email')}<input name="email" type="email" autocomplete="email" required></label>
      <label>${t('welcome.password')}<input name="password" type="password" autocomplete="${isCreating ? 'new-password' : 'current-password'}" minlength="6" required>
        ${passwordHint}</label>
      <button class="button primary wide" type="submit" ${isBusy ? 'disabled' : ''}>${isCreating ? t('welcome.createBtn') : t('welcome.signInBtn')}</button>
      <div class="links">
        <button type="button" class="link" data-action="form" data-value="${isCreating ? 'signIn' : 'create'}">${isCreating ? t('welcome.hasAccount') : t('welcome.withoutAccount')}</button>
        ${forgotButton}
      </div>
    </form>`;
  }

  function accountChoiceHtml() {
    return `
        <div class="pair">
          <button class="button secondary" data-action="form" data-value="create">${t('welcome.create')}</button>
          <button class="button secondary" data-action="form" data-value="signIn">${t('welcome.signIn')}</button>
        </div>`;
  }

  function accountsHtml() {
    if (!firebase.isFirebaseEnabled) {
      return `<p class="text-hint">${t('welcome.withoutFirebase')}</p>`;
    }
    return `
      <button class="button wide google" data-action="google" ${isBusy ? 'disabled' : ''}><span class="g">G</span> ${t('welcome.google')}</button>
      ${formMode ? accountFormHtml() : accountChoiceHtml()}
      ${errorMessage ? `<p class="error" role="alert">${escapeHtml(errorMessage)}</p>` : ''}
      ${infoMessage ? `<p class="info" role="status">${escapeHtml(infoMessage)}</p>` : ''}`;
  }

  function welcomeHtml() {
    return `<div class="frame window welcome" role="dialog" aria-modal="true" aria-labelledby="title-modal">
      <div class="welcome-language">${languageSelectorHtml()}</div>
      <h1 id="title-modal" class="logo">${t('welcome.title')}</h1>
      <p class="subtitle">${t('app.subtitle')}</p>
      ${accountsHtml()}
      ${firebase.isFirebaseEnabled ? `<p class="or"><span>${t('welcome.or')}</span></p>` : ''}
      <button class="button wide guest" data-action="guest">${t('welcome.guest')}</button>
      <p class="text-hint center">${t('welcome.guestHint')}</p>
    </div>`;
  }

  function settingsAccountHtml() {
    if (user) {
      const displayName = `<strong>${escapeHtml(user.displayName || user.email || '')}</strong>`;
      return `<p>${t('settings.connected', { name: displayName })}</p>
         <button class="button secondary" data-action="signOut">${t('settings.signOut')}</button>`;
    }
    return `<p class="text-hint">${t('settings.local')}</p>
         <button class="button secondary" data-action="signIn">${t('settings.signIn')}</button>`;
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
        <section><h3>${t('settings.account')}</h3>${settingsAccountHtml()}</section>
        <section><h3>${t('settings.data')}</h3>
          <button class="button primary" data-action="import-spreadsheet">${t('settings.importSpreadsheet')}</button>
          <p class="text-hint">${t('settings.importSpreadsheetHint')}</p>
          <div class="pair">
            <button class="button secondary" data-action="download">${t('settings.download')}</button>
            <button class="button secondary" data-action="restore">${t('settings.restore')}</button>
          </div>
          <button class="button danger" data-action="erase">${t('settings.erase')}</button>
        </section>
      </div>
    </div>`;
  }

  function render() {
    if (kind) {
      modal.innerHTML = kind === 'welcome' ? welcomeHtml() : settingsHtml();
    }
  }

  function describeAuthError(error) {
    const key = `error.${error?.code}`;
    return t(key) === key ? t('error.default') : t(key);
  }

  async function attempt(action) {
    isBusy = true;
    clearMessages();
    render();
    try {
      await action();
    } catch (error) {
      if (!SILENT_AUTH_ERRORS.has(error?.code)) {
        errorMessage = describeAuthError(error);
      }
    }
    isBusy = false;
    render();
  }

  function showForm(mode) {
    formMode = mode;
    clearMessages();
    render();
    modal.querySelector('input')?.focus();
  }

  async function sendPasswordReset() {
    const email = modal.querySelector('input[name="email"]')?.value.trim();
    if (!email) {
      errorMessage = t('error.auth/invalid-email');
      render();
      return;
    }
    await attempt(async () => {
      await firebase.recoverPassword(email);
      infoMessage = t('welcome.resetLinkSent', { email });
    });
  }

  async function signOutUser() {
    await firebase.signOutUser();
    notice(t('msg.signedOut'));
    render();
  }

  function importSpreadsheet() {
    const state = structuredClone(getState());
    applySpreadsheetProgress(state);
    replaceState(state, { touch: true });
    notice(t('msg.imported'));
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
    guest: () => {
      setConfig({ entry: 'local' });
      close();
    },
    google: () => attempt(() => firebase.signInWithGoogle()),
    form: ({ value }) => showForm(value),
    forgot: sendPasswordReset,
    signIn: () => open('welcome'),
    signOut: signOutUser,
    'import-spreadsheet': importSpreadsheet,
    download: downloadBackup,
    restore: () => backupInput.click(),
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

  modal.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const fields = Object.fromEntries(new FormData(form));
    await attempt(() =>
      form.dataset.form === 'create'
        ? firebase.createAccount(fields.name?.trim(), fields.email.trim(), fields.password)
        : firebase.signInWithEmail(fields.email.trim(), fields.password),
    );
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

  return {
    openWelcome: () => open('welcome'),
    openConfig: () => open('config'),
    setUser(nextUser) {
      user = nextUser;
      if (nextUser && kind === 'welcome') {
        setConfig({ entry: 'account' });
        modal.hidden = true;
        kind = null;
      }
      render();
    },
    rerender: render,
  };
}
