import * as THREE from 'three';
import { buildFarm } from './farm.js';

const ZOOM_MIN = 0.75;
const ZOOM_MAX = 3.2;
const PAN_MAX = 13;
const PIXEL_SCALES = { strong: 3.8, smooth: 2.8, off: 1 };
const DEFAULT_PIXEL_EFFECT = 'strong';
const MAX_PIXEL_RATIO = 2;
const AZIMUTH = Math.PI / 4;
const CAMERA_ELEVATION = 0.6;
const CAMERA_DISTANCE = 60;
const FIXED_HOURS = { day: 12, sunset: 18.4, night: 22.5 };

const SKY = {
  day: { top: [0x7e, 0xc8, 0xe3], base: [0xd4, 0xf0, 0xf7] },
  sunset: { top: [0xe8, 0x8a, 0x5c], base: [0xff, 0xd5, 0x9a] },
  night: { top: [0x14, 0x1a, 0x3e], base: [0x3a, 0x3f, 0x73] },
};
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const rgb = (c) => `rgb(${c.join(',')})`;

export function createScene(canvas, { onClick, onHover }) {
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animations = !prefersReducedMotion;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 400);
  const farm = buildFarm(scene);

  const focus = new THREE.Vector3();
  const pan = new THREE.Vector3();
  const panTarget = new THREE.Vector3();
  const mouse = new THREE.Vector2();
  const parallax = new THREE.Vector2();
  let zoom = 1;
  let zoomTarget = 1;
  let offset = 0;
  let offsetTarget = 0;
  let view = 15;
  let pixelEffect = DEFAULT_PIXEL_EFFECT;

  function frame() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspectRatio = w / h;
    view = aspectRatio < 1 ? (28 / aspectRatio) * 0.6 : 17.4;
    const width = view * aspectRatio;
    const dx = aspectRatio < 1 ? 0 : offset * width * 0.42;
    const dy = aspectRatio < 1 ? offset * view * -0.5 : 0;
    Object.assign(camera, { left: -width + dx, right: width + dx, top: view + dy, bottom: -view + dy, zoom });
    camera.updateProjectionMatrix();
  }
  function place() {
    const az = AZIMUTH + parallax.x * 0.09;
    const elevation = CAMERA_ELEVATION + parallax.y * 0.05;
    focus.copy(pan);
    camera.position.set(
      focus.x + CAMERA_DISTANCE * Math.cos(elevation) * Math.sin(az),
      focus.y + CAMERA_DISTANCE * Math.sin(elevation),
      focus.z + CAMERA_DISTANCE * Math.cos(elevation) * Math.cos(az),
    );
    camera.lookAt(focus);
  }
  function clampPan(v) {
    if (v.length() > PAN_MAX) {
      v.setLength(PAN_MAX);
    }
    v.y = 0;
  }
  // The pixel scale stays constant: zoom and screen size never change how chunky the farm looks.
  function resize() {
    const scale = PIXEL_SCALES[pixelEffect] ?? PIXEL_SCALES[DEFAULT_PIXEL_EFFECT];
    renderer.setPixelRatio(scale === PIXEL_SCALES.off ? Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO) : 1);
    renderer.setSize(Math.ceil(window.innerWidth / scale), Math.ceil(window.innerHeight / scale), false);
    frame();
  }
  window.addEventListener('resize', resize);
  resize();
  place();

  const ray = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function ndc(ev) {
    const r = canvas.getBoundingClientRect();
    return new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  }
  function groundPoint(p) {
    ray.setFromCamera(p, camera);
    const target = new THREE.Vector3();
    return ray.ray.intersectPlane(ground, target) ? target : null;
  }
  function applyZoom(factor, p) {
    const nextZoom = THREE.MathUtils.clamp(zoomTarget * factor, ZOOM_MIN, ZOOM_MAX);
    const real = nextZoom / zoomTarget;
    if (p && real !== 1) {
      const under = groundPoint(p);
      if (under) {
        panTarget.add(under.sub(panTarget).multiplyScalar(1 - 1 / real));
        clampPan(panTarget);
      }
    }
    zoomTarget = nextZoom;
  }

  const pointers = new Map();
  let dragged = false;
  let last = null;
  let pinchDistance = 0;
  let over = null;

  function clickableTarget(p) {
    ray.setFromCamera(p, camera);
    const hits = ray.intersectObjects(farm.clickables, true);
    if (!hits.length) {
      return null;
    }
    let o = hits[0].object;
    while (o && !o.userData.cat) {
      o = o.parent;
    }
    return o;
  }

  canvas.addEventListener('pointerdown', (ev) => {
    canvas.setPointerCapture(ev.pointerId);
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    dragged = false;
    last = { x: ev.clientX, y: ev.clientY };
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
    const p = ndc(ev);
    mouse.copy(p);
    if (pointers.has(ev.pointerId)) {
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistance) {
          applyZoom(d / pinchDistance);
        }
        pinchDistance = d;
        dragged = true;
        return;
      }
      const dx = ev.clientX - last.x;
      const dy = ev.clientY - last.y;
      if (Math.abs(dx) + Math.abs(dy) > 4 || dragged) {
        dragged = true;
        const unit = (2 * view) / (window.innerHeight * zoom);
        const right = new THREE.Vector3(Math.cos(AZIMUTH), 0, -Math.sin(AZIMUTH));
        const front = new THREE.Vector3(-Math.sin(AZIMUTH), 0, -Math.cos(AZIMUTH));
        panTarget.addScaledVector(right, -dx * unit).addScaledVector(front, (dy * unit) / Math.sin(CAMERA_ELEVATION));
        clampPan(panTarget);
        last = { x: ev.clientX, y: ev.clientY };
        canvas.style.cursor = 'grabbing';
      }
      return;
    }
    const o = clickableTarget(p);
    if (o !== over) {
      if (over) {
        over.scale.setScalar(over.userData.scale || 1);
      }
      over = o;
      if (o) {
        o.userData.scale ??= o.scale.x;
        o.scale.setScalar(o.userData.scale * 1.06);
      }
    }
    canvas.style.cursor = o ? 'pointer' : 'grab';
    onHover(o ? o.userData.cat : null, ev.clientX, ev.clientY);
  });
  function release(ev) {
    pointers.delete(ev.pointerId);
    if (pointers.size < 2) {
      pinchDistance = 0;
    }
    canvas.style.cursor = 'grab';
  }
  canvas.addEventListener('pointerup', (ev) => {
    const wasClick = !dragged && pointers.size === 1;
    release(ev);
    if (wasClick) {
      const o = clickableTarget(ndc(ev));
      if (o) {
        onClick(o.userData.cat);
      }
    }
  });
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => {
    onHover(null);
    mouse.set(0, 0);
  });
  canvas.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault();
      applyZoom(Math.exp(-ev.deltaY * 0.0015), ndc(ev));
    },
    { passive: false },
  );
  canvas.addEventListener('dblclick', (ev) => applyZoom(1.6, ndc(ev)));

  let hourMode = 'auto';
  function currentHour() {
    const fixed = new URLSearchParams(window.location.search).get('hour');
    if (fixed !== null) {
      return Number(fixed);
    }
    if (FIXED_HOURS[hourMode] !== undefined) {
      return FIXED_HOURS[hourMode];
    }
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }
  let lastLight = -1;
  let night = false;
  function applyHour() {
    const h = currentHour();
    farm.setHour(h);
    const t = (h - 6) / 14;
    const light = t > 0 && t < 1 ? Math.min(1, Math.sin(t * Math.PI) * 1.6) : 0;
    if (Math.abs(light - lastLight) < 0.002) {
      return;
    }
    lastLight = light;
    const sunset = light > 0 && light < 0.6 ? (1 - Math.abs(light - 0.3) / 0.3) * 0.85 : 0;
    const topColor = mix(mix(SKY.night.top, SKY.day.top, light), SKY.sunset.top, sunset);
    const base = mix(mix(SKY.night.base, SKY.day.base, light), SKY.sunset.base, sunset);
    const root = document.documentElement.style;
    root.setProperty('--sky-top', rgb(topColor));
    root.setProperty('--sky-base', rgb(base));
    root.setProperty('--night', String(1 - Math.min(1, light * 2.5)));
    root.setProperty('--sun-y', `${Math.round(70 - Math.sin(Math.max(0, Math.min(1, t)) * Math.PI) * 55)}%`);
    night = farm.setLight(light, Math.max(0.15, Math.min(Math.PI - 0.15, t * Math.PI)));
  }

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    applyHour();
    const k = animations ? Math.min(1, dt * 5) : 1;
    zoom += (zoomTarget - zoom) * k;
    offset += (offsetTarget - offset) * k;
    pan.lerp(panTarget, k);
    if (animations) {
      parallax.lerp(mouse, Math.min(1, dt * 2.5));
    } else {
      parallax.set(0, 0);
    }
    frame();
    place();
    farm.animate(t, dt, { move: animations, night });
    renderer.render(scene, camera);
    const root = document.documentElement.style;
    root.setProperty('--px', parallax.x.toFixed(3));
    root.setProperty('--py', parallax.y.toFixed(3));
  });

  return {
    refresh: (s) => farm.updateProgress(s),
    setSeason: (e) => farm.setSeason(e),
    setHour: (m) => {
      hourMode = m;
      lastLight = -1;
    },
    setAnimations: (a) => {
      animations = a && !prefersReducedMotion;
    },
    setPixelEffect: (level) => {
      pixelEffect = PIXEL_SCALES[level] ? level : DEFAULT_PIXEL_EFFECT;
      resize();
    },
    openSpace: (isPanelOpen) => {
      offsetTarget = isPanelOpen ? 1 : 0;
    },
    zoomIn: () => applyZoom(1.35),
    zoomOut: () => applyZoom(1 / 1.35),
    recenter: () => {
      zoomTarget = 1;
      panTarget.set(0, 0, 0);
    },
  };
}
