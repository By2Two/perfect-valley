import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { vidro } from './texturas.js';

export const COR_CONTORNO = 0x3b2410;

/** UVs planares em unidades do mundo, escolhendo o eixo pela normal de cada vértice */
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

export function criarUtil(cena) {
  const materiais = new Map();
  const mat = (cor) => {
    if (!materiais.has(cor)) materiais.set(cor, new THREE.MeshLambertMaterial({ color: cor }));
    return materiais.get(cor);
  };
  // Material único para peças de cor sólida (a cor vai em cada vértice)
  const matCor = new THREE.MeshLambertMaterial({ vertexColors: true });
  const matsTex = new Map();
  /** Material com textura em pixel art (tingível pelas cores dos vértices) */
  function matTex(textura) {
    if (!matsTex.has(textura)) matsTex.set(textura, new THREE.MeshLambertMaterial({ map: textura, vertexColors: true }));
    return matsTex.get(textura);
  }

  // Vidro das janelas e lanternas, compartilhados por todas as construções (acendem à noite)
  const janelaMat = new THREE.MeshLambertMaterial({ map: vidro(), color: 0x9fd0ee, emissive: 0x000000 });
  const lanternaMat = new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0x000000 });
  function definirLuzJanelas(noite) {
    janelaMat.emissive.setHex(noite ? 0xffb84a : 0x000000);
    janelaMat.color.setHex(noite ? 0xffd36b : 0x9fd0ee);
    lanternaMat.emissive.setHex(noite ? 0xffc870 : 0x000000);
  }

  const geoCaixa = new THREE.BoxGeometry(1, 1, 1);
  function caixa(w, h, d, material, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geoCaixa, typeof material === 'number' ? mat(material) : material);
    m.scale.set(w, h, d);
    m.position.set(x, y + h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  function grupo(x, z, ...filhos) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    filhos.forEach((f) => g.add(f));
    cena.add(g);
    return g;
  }
  const clicaveis = [];
  function clicavel(obj, cat) {
    obj.userData.cat = cat;
    clicaveis.push(obj);
  }
  // Fantasma (ainda não construído): só as arestas principais em wireframe, sobre um preenchimento bem translúcido
  const fantasmaMat = new THREE.MeshBasicMaterial({ color: 0xfff6dc, transparent: true, opacity: 0.1, depthWrite: false });
  const arestaMat = new THREE.LineBasicMaterial({ color: 0xfff6dc, transparent: true, opacity: 0.45 });
  function definirFantasma(obj, fantasma) {
    const malhas = [];
    obj.traverse((m) => { if (m.isMesh) malhas.push(m); });
    malhas.forEach((m) => {
      if (m.userData.semFantasma) return;
      if (m.userData.contorno) {
        m.visible = !fantasma;
        return;
      }
      if (fantasma && !m.userData.arestas) {
        m.userData.arestas = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), arestaMat);
        m.userData.arestas.raycast = () => {}; // o clique continua valendo pela malha
        m.add(m.userData.arestas);
      }
      if (m.userData.arestas) m.userData.arestas.visible = fantasma;
      m.userData.original ??= m.material;
      m.material = fantasma ? fantasmaMat : m.userData.original;
      m.castShadow = !fantasma;
    });
  }
  const aleatorio = (() => {
    let s = 7;
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  })();

  // ---------- Contorno de 1 pixel (casca invertida, empurrada em espaço de tela) ----------
  const resolucao = { value: new THREE.Vector2(1, 1) };
  const contornoMat = new THREE.MeshBasicMaterial({ color: COR_CONTORNO, side: THREE.BackSide });
  contornoMat.onBeforeCompile = (s) => {
    s.uniforms.uRes = resolucao;
    s.vertexShader = `uniform vec2 uRes;\n${s.vertexShader}`.replace('#include <project_vertex>', `#include <project_vertex>
      vec2 nTela = (projectionMatrix * vec4(normalMatrix * normal, 0.0)).xy * uRes;
      if (dot(nTela, nTela) > 1e-8) gl_Position.xy += normalize(nTela) * 2.0 / uRes * gl_Position.w;`);
  };
  const atualizarResolucao = (renderer) => renderer.getDrawingBufferSize(resolucao.value);

  /**
   * Junta peças estáticas que compartilham material numa única malha (menos draw calls).
   * Peças de cor sólida usam `matCor` com a cor nos vértices.
   */
  function construtor() {
    const porMat = new Map();
    const casca = [];
    const tmp = new THREE.Color();

    /** opts: cor (tingimento), pos [x,y,z], rot (Euler ou Matrix4), contorno, uv (false mantém as UVs da geometria) */
    function peca(geo, material, { cor = 0xffffff, pos, rot, contorno = false, uv = true } = {}) {
      let g = geo.index ? geo.toNonIndexed() : geo.clone();
      g.clearGroups();
      if (rot) {
        // UV no espaço da peça, para a textura acompanhar a inclinação (telhados)
        if (uv) uvPlanar(g);
        g.applyMatrix4(rot.isMatrix4 ? rot : new THREE.Matrix4().makeRotationFromEuler(rot));
        if (pos) g.translate(...pos);
      } else {
        if (pos) g.translate(...pos);
        if (uv) uvPlanar(g);
      }
      const solida = typeof material === 'number';
      tmp.set(solida ? material : cor);
      const cores = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < cores.length; i += 3) {
        cores[i] = tmp.r;
        cores[i + 1] = tmp.g;
        cores[i + 2] = tmp.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(cores, 3));
      const chave = solida ? matCor : material;
      if (!porMat.has(chave)) porMat.set(chave, []);
      porMat.get(chave).push(g);
      if (contorno) {
        let c = new THREE.BufferGeometry();
        c.setAttribute('position', g.attributes.position.clone());
        c = mergeVertices(c, 1e-4);
        c.computeVertexNormals();
        casca.push(c);
      }
      return g;
    }

    /** Caixa com a base em y (como `caixa`), cor sólida (número) ou material */
    function cx(w, h, d, material, x = 0, y = 0, z = 0, opts = {}) {
      return peca(new THREE.BoxGeometry(w, h, d), material, { ...opts, pos: [x, y + h / 2, z] });
    }

    /**
     * Placa inclinada (água de telhado) entre o ponto baixo `a` e o alto `b`, dados como [h, y]
     * no plano do perfil. `eixo` diz para onde a placa se estende ('x' ou 'z').
     * `ext` = [beiral além de a, sobra além de b]; `sobre` afasta a placa da linha (neve).
     */
    function placa(a, b, material, { esp = 0.15, comp = 1, ext = [0, 0], centro = 0, eixo = 'x', sobre = 0, ...opts } = {}) {
      const d = new THREE.Vector2(a[0] - b[0], a[1] - b[1]);
      const len = d.length();
      d.divideScalar(len);
      const n = new THREE.Vector2(-d.y, d.x);
      if (n.y < 0) n.negate();
      const total = len + ext[0] + ext[1];
      const ini = new THREE.Vector2(b[0], b[1]).addScaledVector(d, -ext[1]);
      const meio = ini.addScaledVector(d, total / 2).addScaledVector(n, esp / 2 + sobre);
      let Y;
      let Z;
      let pos;
      if (eixo === 'x') {
        Y = new THREE.Vector3(0, n.y, n.x);
        Z = new THREE.Vector3(0, d.y, d.x);
        pos = [centro, meio.y, meio.x];
      } else {
        Y = new THREE.Vector3(n.x, n.y, 0);
        Z = new THREE.Vector3(d.x, d.y, 0);
        pos = [meio.x, meio.y, centro];
      }
      const X = new THREE.Vector3().crossVectors(Y, Z).normalize();
      return peca(new THREE.BoxGeometry(comp, esp, total), material, { ...opts, rot: new THREE.Matrix4().makeBasis(X, Y, Z), pos });
    }

    /** Cria as malhas finais dentro de `pai` */
    function montar(pai, { sombra = true } = {}) {
      const malhas = new Map();
      porMat.forEach((geos, material) => {
        const m = new THREE.Mesh(mergeGeometries(geos), material);
        m.castShadow = sombra;
        m.receiveShadow = true;
        pai.add(m);
        malhas.set(material, m);
      });
      if (casca.length) {
        const c = new THREE.Mesh(mergeGeometries(casca), contornoMat);
        c.userData.contorno = true;
        c.onBeforeRender = atualizarResolucao;
        pai.add(c);
      }
      return malhas;
    }

    /** Só a geometria das peças de cor sólida, juntada (para usar em InstancedMesh) */
    const juntar = () => mergeGeometries(porMat.get(matCor));

    return { peca, cx, placa, montar, juntar };
  }

  return { cena, mat, matCor, matTex, janelaMat, lanternaMat, definirLuzJanelas, geoCaixa, caixa, grupo, clicaveis, clicavel, definirFantasma, aleatorio, construtor };
}
