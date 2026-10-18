import { t } from '../i18n.js';
import { getConfig } from '../store.js';

const DISMISSED_STORAGE_KEY = 'perfect-valley:rotate-dismissed';
const PHONE_MAX_SIDE = 520;

const isTouchPhone = () => matchMedia('(pointer: coarse)').matches && Math.min(window.innerWidth, window.innerHeight) <= PHONE_MAX_SIDE;

const isPortrait = () => window.innerHeight > window.innerWidth;

function wasDismissed() {
  try {
    return sessionStorage.getItem(DISMISSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    sessionStorage.setItem(DISMISSED_STORAGE_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

const ignoreUnsupported = () => false;

async function requestLandscape() {
  await Promise.resolve(document.documentElement.requestFullscreen?.()).catch(ignoreUnsupported);
  await Promise.resolve(screen.orientation?.lock?.('landscape')).catch(ignoreUnsupported);
}

export function showRotateScreen() {
  if (!isTouchPhone() || !isPortrait() || wasDismissed()) {
    return false;
  }
  const isStill = !getConfig().animations || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const screenElement = document.createElement('div');
  screenElement.id = 'rotate';
  screenElement.className = `rotate${isStill ? ' still' : ''}`;
  screenElement.innerHTML = `
    <div class="rotate-stage" aria-hidden="true">
      <div class="phone"><span class="phone-screen"></span><span class="phone-key"></span></div>
    </div>
    <p class="rotate-title">${t('rotate.title')}</p>
    <p class="rotate-tap">${t('rotate.tap')}</p>`;
  document.body.append(screenElement);

  let isOpen = true;
  function dismiss() {
    if (!isOpen) {
      return;
    }
    isOpen = false;
    rememberDismissal();
    screenElement.remove();
    window.removeEventListener('resize', onViewportChange);
    window.removeEventListener('orientationchange', onViewportChange);
  }
  function onViewportChange() {
    if (!isPortrait()) {
      dismiss();
    }
  }

  screenElement.addEventListener('pointerdown', () => {
    requestLandscape();
    dismiss();
  });
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('orientationchange', onViewportChange);
  return true;
}
