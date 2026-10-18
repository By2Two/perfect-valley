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
  } catch {
    // A blocked sessionStorage only means the screen may come back on the next load.
  }
}

// Android Chrome goes fullscreen and locks to landscape; Safari has neither API and just keeps going.
async function requestLandscape() {
  try {
    await document.documentElement.requestFullscreen?.();
  } catch {
    // Fullscreen refused: the farm still works in portrait.
  }
  try {
    await screen.orientation?.lock?.('landscape');
  } catch {
    // Orientation lock refused: the farm still works in portrait.
  }
}

/**
 * Asks for landscape on a phone held in portrait. Returns true when the screen is
 * showing, in which case onDismiss runs once the player taps or turns the phone.
 */
export function showRotateScreen({ onDismiss }) {
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
    onDismiss();
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
