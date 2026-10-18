import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { glass } from './textures.js';

export const OUTLINE_COLOR = 0x3b2410;

function uvPlanar(geo) {
  const p = geo.attributes.position;
  const n = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = n.getX(i);
    const ny = n.getY(i);
    const nz = n.getZ(i);
    const ax = Math.abs(nx);
    const ay = Math.abs(ny);
    const az = Math.abs(nz);
    let u;
    let v;
    if (ay >= ax && ay >= az) {
      u = p.getX(i);
      v = -p.getZ(i) * Math.sign(ny);
    } else if (ax >= az) {
      u = -p.getZ(i) * Math.sign(nx);
      v = p.getY(i);
    } else {
      u = p.getX(i) * Math.sign(nz);
      v = p.getY(i);
    }
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export function createWorldKit(scene) {
  const materials = new Map();
  const solidMaterial = (color) => {
    if (!materials.has(color)) {
      materials.set(color, new THREE.MeshLambertMaterial({ color }));
    }
    return materials.get(color);
  };
  const materialByColor = new THREE.MeshLambertMaterial({ vertexColors: true });
  const materialsTexture = new Map();
  function materialTexture(texture) {
    if (!materialsTexture.has(texture)) {
      materialsTexture.set(texture, new THREE.MeshLambertMaterial({ map: texture, vertexColors: true }));
    }
    return materialsTexture.get(texture);
  }

  const snowMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 1 });
  function setSnowAmount(amount) {
    snowMaterial.opacity = amount;
    snowMaterial.transparent = amount < 1;
  }

  const windowMaterial = new THREE.MeshLambertMaterial({ map: glass(), color: 0x9fd0ee, emissive: 0x000000 });
  const lanternMaterial = new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0x000000 });
  function setWindowLights(night) {
    windowMaterial.emissive.setHex(night ? 0xffb84a : 0x000000);
    windowMaterial.color.setHex(night ? 0xffd36b : 0x9fd0ee);
    lanternMaterial.emissive.setHex(night ? 0xffc870 : 0x000000);
  }

  const geoBox = new THREE.BoxGeometry(1, 1, 1);
  function box([width, height, depth], material, [x, y, z] = [0, 0, 0]) {
    const m = new THREE.Mesh(geoBox, typeof material === 'number' ? solidMaterial(material) : material);
    m.scale.set(width, height, depth);
    m.position.set(x, y + height / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  function group(x, z, ...children) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    children.forEach((f) => g.add(f));
    scene.add(g);
    return g;
  }
  const clickables = [];
  function clickable(obj, cat) {
    obj.userData.cat = cat;
    clickables.push(obj);
  }
  const ghostMaterial = new THREE.MeshBasicMaterial({ color: 0xfff6dc, transparent: true, opacity: 0.1, depthWrite: false });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xfff6dc, transparent: true, opacity: 0.45 });
  function setGhost(obj, ghost) {
    const meshes = [];
    obj.traverse((m) => {
      if (m.isMesh) {
        meshes.push(m);
      }
    });
    meshes.forEach((m) => {
      if (m.userData.withoutGhost) {
        return;
      }
      if (m.userData.outline) {
        m.visible = !ghost;
        return;
      }
      if (ghost && !m.userData.edges) {
        m.userData.edges = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), edgeMaterial);
        m.userData.edges.raycast = () => {};
        m.add(m.userData.edges);
      }
      if (m.userData.edges) {
        m.userData.edges.visible = ghost;
      }
      m.userData.original ??= m.material;
      m.material = ghost ? ghostMaterial : m.userData.original;
      m.castShadow = !ghost;
    });
  }
  const random = (() => {
    let s = 7;
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  })();

  const resolution = { value: new THREE.Vector2(1, 1) };
  const outlineMaterial = new THREE.MeshBasicMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide });
  outlineMaterial.onBeforeCompile = (s) => {
    s.uniforms.uRes = resolution;
    s.vertexShader = `uniform vec2 uRes;\n${s.vertexShader}`.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      vec2 nScreen = (projectionMatrix * vec4(normalMatrix * normal, 0.0)).xy * uRes;
      if (dot(nScreen, nScreen) > 1e-8) gl_Position.xy += normalize(nScreen) * 2.0 / uRes * gl_Position.w;`,
    );
  };
  const refreshResolution = (renderer) => renderer.getDrawingBufferSize(resolution.value);

  function builder() {
    const perMaterial = new Map();
    const bark = [];
    const tmp = new THREE.Color();

    function piece(geo, material, { color = 0xffffff, position, rot, outline = false, uv = true } = {}) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      g.clearGroups();
      if (rot) {
        if (uv) {
          uvPlanar(g);
        }
        g.applyMatrix4(rot.isMatrix4 ? rot : new THREE.Matrix4().makeRotationFromEuler(rot));
        if (position) {
          g.translate(...position);
        }
      } else {
        if (position) {
          g.translate(...position);
        }
        if (uv) {
          uvPlanar(g);
        }
      }
      const solid = typeof material === 'number';
      tmp.set(solid ? material : color);
      const colors = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = tmp.r;
        colors[i + 1] = tmp.g;
        colors[i + 2] = tmp.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const key = solid ? materialByColor : material;
      if (!perMaterial.has(key)) {
        perMaterial.set(key, []);
      }
      perMaterial.get(key).push(g);
      if (outline) {
        let c = new THREE.BufferGeometry();
        c.setAttribute('position', g.attributes.position.clone());
        c = mergeVertices(c, 1e-4);
        c.computeVertexNormals();
        bark.push(c);
      }
      return g;
    }

    function box([width, height, depth], material, { position: [x, y, z] = [0, 0, 0], ...options } = {}) {
      return piece(new THREE.BoxGeometry(width, height, depth), material, { ...options, position: [x, y + height / 2, z] });
    }

    function slab([from, to], material, { thickness = 0.15, length = 1, extension = [0, 0], center = 0, axis = 'x', over = 0, ...options } = {}) {
      const d = new THREE.Vector2(from[0] - to[0], from[1] - to[1]);
      const len = d.length();
      d.divideScalar(len);
      const n = new THREE.Vector2(-d.y, d.x);
      if (n.y < 0) {
        n.negate();
      }
      const total = len + extension[0] + extension[1];
      const start = new THREE.Vector2(to[0], to[1]).addScaledVector(d, -extension[1]);
      const middle = start.addScaledVector(d, total / 2).addScaledVector(n, thickness / 2 + over);
      let Y;
      let Z;
      let position;
      if (axis === 'x') {
        Y = new THREE.Vector3(0, n.y, n.x);
        Z = new THREE.Vector3(0, d.y, d.x);
        position = [center, middle.y, middle.x];
      } else {
        Y = new THREE.Vector3(n.x, n.y, 0);
        Z = new THREE.Vector3(d.x, d.y, 0);
        position = [middle.x, middle.y, center];
      }
      const X = new THREE.Vector3().crossVectors(Y, Z).normalize();
      return piece(new THREE.BoxGeometry(length, thickness, total), material, { ...options, rot: new THREE.Matrix4().makeBasis(X, Y, Z), position });
    }

    function mount(parent, { shadow = true } = {}) {
      const meshes = new Map();
      perMaterial.forEach((geos, material) => {
        const m = new THREE.Mesh(mergeGeometries(geos), material);
        m.castShadow = shadow;
        m.receiveShadow = true;
        parent.add(m);
        meshes.set(material, m);
      });
      if (bark.length) {
        const c = new THREE.Mesh(mergeGeometries(bark), outlineMaterial);
        c.userData.outline = true;
        c.onBeforeRender = refreshResolution;
        parent.add(c);
      }
      return meshes;
    }

    const join = () => mergeGeometries(perMaterial.get(materialByColor));

    return { piece, box, slab, mount, join };
  }

  return {
    scene,
    solidMaterial,
    materialByColor,
    materialTexture,
    windowMaterial,
    lanternMaterial,
    snowMaterial,
    setSnowAmount,
    setWindowLights,
    geoBox,
    box,
    group,
    clickables,
    clickable,
    setGhost,
    random,
    builder,
  };
}
