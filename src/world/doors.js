import * as THREE from 'three';

const OPEN_ANGLE = (Math.PI * 3) / 4;
const OPEN_SECONDS = 3.5;
const FULLY_OPEN = 0.95;

const easeInOut = (value) => value * value * (3 - 2 * value);

export function createDoors(parent, leaves) {
  const pivots = leaves.map(({ builder, direction, position }) => {
    const pivot = new THREE.Group();
    pivot.position.set(...position);
    builder.mount(pivot);
    parent.add(pivot);
    return { pivot, direction };
  });
  const door = {
    value: 0,
    target: 0,
    request(open) {
      door.target = open ? 1 : 0;
    },
    isOpen: () => door.value >= FULLY_OPEN,
    progress: () => door.value,
    update(dt) {
      const remaining = door.target - door.value;
      door.value += Math.sign(remaining) * Math.min(dt / OPEN_SECONDS, Math.abs(remaining));
      pivots.forEach(({ pivot, direction }) => {
        pivot.rotation.y = direction * easeInOut(door.value) * OPEN_ANGLE;
      });
    },
    snap() {
      door.value = 0;
      door.target = 0;
      door.update(0);
    },
  };
  return door;
}
