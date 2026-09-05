import * as THREE from '../vendor/three.module.js';
import { createPlanetSurface } from './planet.js';

/** Independently modelled, material-batched miniature worlds for the /dev edition. */
export const WORLD_CATALOG = [
  { id: 'orchard', name: '红苹果园', tint: '#e7eedc' },
  { id: 'bakery', name: '阿暖面包房', tint: '#f3e7d5' },
  { id: 'bridge', name: '吱呀小木桥', tint: '#e1ece8' },
  { id: 'home', name: '豆豆的家', tint: '#efe7d7' },
  { id: 'observatory', name: '望远镜山丘', tint: '#dce3ef' },
  { id: 'reef', name: '海底维修站', tint: '#d8eceb' },
  { id: 'pocket', name: '巨人的口袋', tint: '#e9dfe9' },
  { id: 'cloud', name: '云层导航站', tint: '#e7e9f2' },
  { id: 'moon', name: '月球接引区', tint: '#e5e4ee' },
  { id: 'meadow', name: '萤火草地', tint: '#e3e9df' },
  { id: 'cove', name: '听听贝河湾', tint: '#e2eee8' },
];

const PALETTES = {
  orchard: ['#aebf83', '#79965b', '#d7b988'], bakery: ['#d9be95', '#b99369', '#ecd7b2'],
  bridge: ['#a8bc91', '#779878', '#d2c6a7'], home: ['#bac491', '#8fa264', '#dec59d'],
  observatory: ['#9bafaf', '#758994', '#c4c9c5'], reef: ['#b9d5c5', '#70b5ad', '#e0d4b4'],
  pocket: ['#b3a8c3', '#847697', '#d4bdc6'], cloud: ['#d6d9e6', '#adb9d0', '#eee5de'],
  moon: ['#c0c3d1', '#939daf', '#e4dcca'], meadow: ['#9aae90', '#687e6c', '#c3c89f'],
  cove: ['#b4c9a5', '#7c9e8b', '#dbceb0'],
};

function seededRandom(seed) {
  let state = typeof seed === 'number' ? seed >>> 0 : [...String(seed)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 1);
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
}

export function createWorld(requestedId, { seed = 1 } = {}) {
  const id = PALETTES[requestedId] ? requestedId : 'orchard';
  const palette = PALETTES[id];
  const rng = seededRandom(seed);
  const group = new THREE.Group();
  group.name = `handmade-planet-${id}`;
  const surface = createPlanetSurface();
  const { radius, center, surfacePoint, surfaceNormal } = surface;
  const staticRoot = new THREE.Group();
  const liveRoot = new THREE.Group();
  const planetRoot = new THREE.Group();
  const backsideRoot = new THREE.Group();
  group.add(planetRoot, staticRoot, backsideRoot, liveRoot);
  const geometryCache = new Map();
  const materials = new Map();
  const extraGeometries = new Set();
  const animators = [];
  const reactions = [];
  let elapsed = 0;
  let reactionAt = -100;
  let reactionName = '';
  let disposed = false;

  const geometry = (key, construct) => {
    if (!geometryCache.has(key)) geometryCache.set(key, construct());
    return geometryCache.get(key);
  };
  const clay = (color, emissive = false, transparent = false) => {
    const key = `${color}/${emissive}/${transparent}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({
      color, roughness: 0.84, metalness: 0,
      ...(emissive ? { emissive: color, emissiveIntensity: 0.48 } : {}),
      ...(transparent ? { transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.25 } : {}),
    }));
    return materials.get(key);
  };
  const mesh = (geo, color, pos = [0, 0, 0], scale = [1, 1, 1], parent = staticRoot, rotation) => {
    const item = new THREE.Mesh(geo, typeof color === 'string' ? clay(color) : color);
    item.position.set(...pos);
    item.scale.set(...scale);
    if (rotation) item.rotation.set(...rotation);
    item.castShadow = !item.material.transparent;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  };
  const ball = (color, x, y, z, sx, sy = sx, sz = sx, parent = staticRoot) => mesh(
    geometry('sphere', () => new THREE.SphereGeometry(1, 16, 12)), color, [x, y, z], [sx, sy, sz], parent,
  );
  const box = (color, x, y, z, w, h, d, parent = staticRoot, rotation) => mesh(
    geometry('box', () => new THREE.BoxGeometry(1, 1, 1)), color, [x, y, z], [w, h, d], parent, rotation,
  );
  const cylinder = (color, x, y, z, r1, r2, h, parent = staticRoot, rotation) => mesh(
    geometry(`cylinder-${r1}-${r2}-${h}`, () => new THREE.CylinderGeometry(r1, r2, h, 20)),
    color, [x, y, z], [1, 1, 1], parent, rotation,
  );
  const torus = (color, x, y, z, radius, thickness, parent = staticRoot, rotation = [Math.PI / 2, 0, 0]) => mesh(
    geometry(`torus-${radius}-${thickness}`, () => new THREE.TorusGeometry(radius, thickness, 8, 32)),
    color, [x, y, z], [1, 1, 1], parent, rotation,
  );
  const rod = (color, start, end, radius, parent = staticRoot) => {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const delta = b.clone().sub(a);
    const item = cylinder(color, ...a.clone().add(b).multiplyScalar(0.5).toArray(), radius, radius * 1.1, delta.length(), parent);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return item;
  };
  const part = (x = 0, y = 0, z = 0, parent = staticRoot, rotation = 0) => {
    const node = new THREE.Group(); node.position.set(x, y, z); node.rotation.y = rotation; parent.add(node); return node;
  };
  const shapeMesh = (points, color, depth, parent, pos = [0, 0, 0], bevel = 0.08) => {
    const shape = new THREE.Shape();
    points.forEach(([x, y], n) => n ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1 });
    extraGeometries.add(geo);
    return mesh(geo, color, pos, [1, 1, 1], parent);
  };
  const arc = (color, x, y, z, radius, thickness, parent = staticRoot) => mesh(
    geometry(`arc-${radius}-${thickness}`, () => new THREE.TorusGeometry(radius, thickness, 8, 28, Math.PI)), color, [x, y, z], [1, 1, 1], parent, [0, 0, 0],
  );
  const pebble = (x, z, scale = 1, color = palette[2], parent = staticRoot) => {
    const stone = ball(color, x, 0.12 * scale, z, 0.32 * scale, 0.15 * scale, 0.23 * scale, parent);
    stone.rotation.y = rng() * Math.PI;
  };
  const leaf = (x, y, z, size, color, parent = staticRoot, angle = 0) => {
    const item = ball(color, x, y, z, size * 0.55, size * 0.12, size, parent);
    item.rotation.z = angle; item.rotation.y = rng() * Math.PI;
    return item;
  };
  const flower = (x, z, color = '#f1d296', size = 0.16, parent = staticRoot) => {
    rod('#829367', [x, 0.02, z], [x + 0.015, 0.25, z], 0.022, parent);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 0.4;
      ball(color, x + Math.cos(a) * size * 0.63, 0.25, z + Math.sin(a) * size * 0.63, size * 0.57, 0.045, size * 0.54, parent);
    }
    ball('#bb8b47', x, 0.285, z, size * 0.28, 0.045, size * 0.28, parent);
  };
  const grass = (x, z, size = 1, color = palette[1], parent = staticRoot) => {
    [-0.12, 0, 0.12].forEach((offset, n) => {
      const blade = ball(color, x + offset * size, 0.16 * size, z, 0.055 * size, (0.2 + (n % 2) * 0.07) * size, 0.07 * size, parent);
      blade.rotation.z = -offset * 3;
    });
  };
  const bush = (x, z, size = 1, parent = staticRoot) => {
    [[0, 0.35, 0, 0.55], [-0.33, 0.25, 0.12, 0.35], [0.3, 0.25, 0.06, 0.4]].forEach(([dx, dy, dz, r]) => ball(palette[1], x + dx * size, dy * size, z + dz * size, r * size, r * size * 0.8, r * size, parent));
  };
  const tree = (x, z, height = 2.9, fruit = false, color = '#7f9f65') => {
    const node = part(x, 0, z);
    rod('#927052', [0, 0, 0], [-0.08, height * 0.72, 0], 0.16, node);
    rod('#927052', [0, height * 0.38, 0], [-0.65, height * 0.73, 0.05], 0.08, node);
    rod('#927052', [0, height * 0.5, 0], [0.6, height * 0.83, 0], 0.09, node);
    [[0, 0.81, 0, 0.82], [-0.62, 0.7, 0.04, 0.61], [0.61, 0.77, -0.1, 0.62], [-0.22, 0.93, -0.13, 0.57]].forEach(([dx, dy, dz, r]) => ball(color, dx, height * dy, dz, r, r * 0.88, r * 0.83, node));
    if (fruit) [[-0.51, 0.68, 0.54], [0.43, 0.75, 0.48], [0.05, 0.87, 0.59], [-0.2, 0.68, -0.54]].forEach(([dx, dy, dz]) => apple(dx, height * dy, dz, 0.16, node));
    ball('#b2c58b', -0.13, 0.09, 0, 0.57, 0.12, 0.48, node);
    return node;
  };
  const apple = (x, y, z, size = 0.16, parent = staticRoot) => {
    const node = part(x, y, z, parent);
    ball('#c96a55', -size * 0.22, 0, 0, size * 0.78, size, size * 0.85, node);
    ball('#d7785e', size * 0.24, 0, 0, size * 0.78, size * 0.98, size * 0.85, node);
    rod('#806349', [0, size * 0.65, 0], [size * 0.1, size * 1.35, 0], 0.025, node);
    leaf(size * 0.28, size * 1.04, 0, size * 0.65, '#6e8958', node, -0.3);
    return node;
  };
  const fence = (x, z, width, rotation = 0) => {
    const node = part(x, 0, z, staticRoot, rotation);
    const count = Math.ceil(width / 0.44);
    for (let i = 0; i <= count; i++) {
      const dx = (i / count - 0.5) * width;
      box('#bda079', dx, 0.4, 0, 0.13, 0.76, 0.12, node);
      ball('#cbb38f', dx, 0.8, 0, 0.075, 0.1, 0.07, node);
    }
    [0.26, 0.61].forEach(y => box('#ac875e', 0, y, -0.06, width + 0.2, 0.1, 0.1, node));
  };
  const clouds = (x, y, z, scale = 1, parent = staticRoot, color = '#f1eee7') => {
    const node = part(x, y, z, parent);
    [[0, 0, 0, 0.76], [-0.63, -0.12, 0, 0.49], [0.65, -0.15, 0.04, 0.47], [-0.18, 0.34, -0.04, 0.5]].forEach(([dx, dy, dz, r]) => ball(color, dx * scale, dy * scale, dz * scale, r * scale, r * scale * 0.65, r * scale * 0.7, node));
    return node;
  };
  const path = (points, color = '#e4d3ab', size = 0.55) => points.forEach(([x, z], i) => {
    const stone = ball(color, x, 0.035, z, size * (0.9 + (i % 2) * 0.2), 0.055, size * 0.6);
    stone.rotation.y = i * 0.8;
  });
  const bone = (x, y, z, scale, parent) => {
    box('#f0e2bb', x, y, z, scale * 0.72, scale * 0.25, scale * 0.15, parent);
    [-1, 1].forEach(s => [-1, 1].forEach(t => ball('#f0e2bb', x + s * scale * 0.4, y + t * scale * 0.12, z, scale * 0.17, scale * 0.17, scale * 0.1, parent)));
  };
  const windowCircle = (x, y, z, parent, size = 0.26) => {
    cylinder(clay('#edc881', true), x, y, z, size, size, 0.06, parent, [Math.PI / 2, 0, 0]);
    torus('#a58361', x, y, z + 0.04, size, 0.045, parent, [0, 0, 0]);
    box('#ac885f', x, y, z + 0.08, size * 1.85, 0.055, 0.04, parent);
    box('#ac885f', x, y, z + 0.08, 0.055, size * 1.85, 0.04, parent);
  };
  const cottage = (x, z, scale = 1, roofColor = '#be6a55', sign = 'bone', rotation = 0) => {
    const node = part(x, 0, z, staticRoot, rotation); node.scale.setScalar(scale);
    box('#ead7b6', 0, 0.98, 0, 1.94, 1.86, 1.55, node);
    shapeMesh([[-0.97, 1.82], [0, 2.66], [0.97, 1.82]], '#ead7b6', 1.55, node, [0, 0, -0.78], 0.03);
    box(roofColor, -0.57, 2.29, 0, 1.55, 0.16, 1.95, node, [0, 0, Math.PI / 4.1]);
    box(roofColor, 0.57, 2.29, 0, 1.55, 0.16, 1.95, node, [0, 0, -Math.PI / 4.1]);
    for (let i = 0; i < 7; i++) rod('#d09a7b', [-1.07, 1.79, -0.81 + i * 0.27], [0, 2.79, -0.81 + i * 0.27], 0.027, node);
    for (let i = 0; i < 7; i++) rod('#d09a7b', [1.07, 1.79, -0.81 + i * 0.27], [0, 2.79, -0.81 + i * 0.27], 0.027, node);
    box('#93765e', 0, 0.58, 0.817, 0.66, 1.15, 0.07, node);
    arc('#af9070', 0, 1.14, 0.84, 0.35, 0.05, node);
    cylinder('#93765e', 0, 1.14, 0.82, 0.32, 0.32, 0.04, node, [Math.PI / 2, 0, 0]);
    ball('#d9b76c', 0.2, 0.61, 0.89, 0.045, 0.045, 0.032, node);
    windowCircle(-0.65, 1.15, 0.84, node, 0.21);
    windowCircle(0.65, 1.15, 0.84, node, 0.21);
    box('#b49370', 0.62, 2.45, -0.37, 0.3, 0.68, 0.33, node);
    box('#ceb08a', 0.62, 2.81, -0.37, 0.42, 0.12, 0.44, node);
    box('#dec39b', 0, 0.07, 0.99, 0.93, 0.14, 0.48, node);
    if (sign === 'bone') bone(0, 1.91, 0.91, 0.53, node);
    else {
      ball('#d4dedb', -0.03, 1.91, 0.93, 0.19, 0.1, 0.06, node);
      shapeMesh([[0.13, 1.91], [0.32, 2.07], [0.32, 1.77]], '#d4dedb', 0.07, node, [0, 0, 0.9], 0.02);
    }
    return node;
  };

  // The world is a closed sphere all the way to its south pole. Quiet colour
  // variation and radial terrain give the sides and reverse their own surface.
  const globeGeometry = new THREE.SphereGeometry(radius, 72, 48);
  const globePositions = globeGeometry.getAttribute('position');
  const globeColors = [];
  const land = new THREE.Color(palette[0]); const shade = new THREE.Color(palette[1]);
  const sand = new THREE.Color(palette[2]); const sample = new THREE.Color();
  for (let i = 0; i < globePositions.count; i++) {
    const x = globePositions.getX(i) / radius; const y = globePositions.getY(i) / radius; const z = globePositions.getZ(i) / radius;
    const variation = Math.sin(x * 6 + z * 3) * Math.sin(y * 5 - z * 4) * 0.5 + 0.5;
    const patch = Math.max(0, Math.sin(x * 4 - y * 2 + 0.8) + Math.cos(z * 5 + y * 3) - 0.86);
    sample.copy(land).lerp(shade, variation * 0.15).lerp(sand, Math.min(0.25, patch * 0.18));
    globeColors.push(sample.r, sample.g, sample.b);
  }
  globeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(globeColors, 3));
  extraGeometries.add(globeGeometry);
  const globeMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.94 });
  materials.set('complete-planet-surface', globeMaterial);
  const globe = mesh(globeGeometry, globeMaterial, center.toArray(), [1, 1, 1], planetRoot);
  globe.name = 'complete-planet-sphere';
  globe.userData.planetBody = true;

  // A small burst stays physically inside the diorama and responds to every choice.
  const sparks = [];
  const sparkleGeo = geometry('spark', () => new THREE.OctahedronGeometry(0.045, 0));
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI * 2 / 16;
    const spark = mesh(sparkleGeo, clay('#f2d498', true), [Math.cos(a) * 2.25, 0.12, Math.sin(a) * 2.1], [1, 1, 1], liveRoot);
    spark.visible = false; sparks.push({ mesh: spark, angle: a });
  }
  animators.push(time => {
    const age = time - reactionAt;
    sparks.forEach(({ mesh: spark, angle }, n) => {
      spark.visible = age >= 0 && age < 2.4;
      if (!spark.visible) return;
      const t = age / 2.4;
      const radius = 1.6 + t * 1.8;
      spark.position.set(Math.cos(angle) * radius, 0.2 + Math.sin(t * Math.PI) * (0.75 + (n % 3) * 0.18), Math.sin(angle) * radius);
      spark.scale.setScalar(Math.sin(t * Math.PI) * 1.3);
      spark.rotation.y = time + n;
    });
  });

  if (id === 'orchard') {
    tree(-2.55, -1.45, 3.2, true, '#809a5f');
    tree(2.65, -2.02, 2.5, true, '#a3b277');
    fence(-0.18, -3.27, 3.35);
    fence(-3.55, 0.1, 1.8, -0.55);
    path([[0.15, -2.9], [0.03, -2.25], [0.15, -1.6], [0.06, -0.9]], '#decea1', 0.53);
    bush(-3.23, 1.1, 1.14); bush(3.5, 0.5, 1.02);
    const basket = part(2.83, 0.03, 0.62);
    cylinder('#b78b58', 0, 0.23, 0, 0.39, 0.3, 0.44, basket);
    [0.09, 0.21, 0.33, 0.45].forEach(y => torus('#dbb77c', 0, y, 0, 0.32 + y * 0.13, 0.023, basket));
    arc('#a0784e', 0, 0.4, 0, 0.39, 0.045, basket);
    apple(-0.13, 0.51, 0.04, 0.14, basket); apple(0.13, 0.51, -0.06, 0.14, basket);
    const offeredApple = apple(-2, 0.2, 1.55, 0.21, liveRoot);
    animators.push(time => { const age = time - reactionAt; offeredApple.position.y = 0.2 + (age < 2.5 ? Math.max(0, Math.sin(age * Math.PI * 2)) * Math.exp(-age) * 0.65 : 0); });
    [-3.6, -2.8, 2.9, 3.5].forEach((x, i) => flower(x, 2.05 - (i % 2) * 0.6, i % 2 ? '#e9c79b' : '#ebe1be'));
  }

  if (id === 'bakery') {
    const bakery = cottage(-1.62, -2.22, 1.1, '#a46f52', 'bone', 0.06);
    const awning = part(0, 1.52, 0.87, bakery);
    for (let i = 0; i < 6; i++) box(i % 2 ? '#f0dcad' : '#b97357', -0.82 + i * 0.33, 0, 0.27, 0.33, 0.085, 0.75, awning, [0.13, 0, 0]);
    const oven = part(2.55, 0, -1.69);
    ball('#bc9575', 0, 0.57, 0, 0.86, 0.8, 0.7, oven);
    cylinder('#ceb18e', 0, 0.09, 0, 0.9, 0.95, 0.18, oven);
    ball('#715645', 0, 0.44, 0.62, 0.48, 0.39, 0.1, oven);
    arc('#dec4a2', 0, 0.4, 0.69, 0.46, 0.105, oven);
    [-0.45, 0.45].forEach(x => box('#dec4a2', x, 0.25, 0.7, 0.19, 0.38, 0.15, oven));
    box('#997a60', 0.37, 1.24, -0.16, 0.28, 0.66, 0.27, oven);
    const fire = ball(clay('#edb062', true), 2.55, 0.35, -1.02, 0.24, 0.19, 0.07, liveRoot);
    animators.push(time => { fire.scale.y = 0.19 * (1 + Math.sin(time * 3) * 0.1 + Math.max(0, 1 - (time - reactionAt) / 3) * 0.6); });
    const table = part(2.7, 0, 0.95, staticRoot, -0.2);
    box('#c49b6e', 0, 0.58, 0, 1.46, 0.16, 0.81, table);
    [-0.51, 0.51].forEach(x => [-0.25, 0.25].forEach(z => box('#9d7754', x, 0.27, z, 0.11, 0.55, 0.11, table)));
    for (let i = 0; i < 3; i++) {
      ball('#d49e5b', -0.39 + i * 0.4, 0.78, 0, 0.17, 0.14, 0.3, table);
      [-0.09, 0.08].forEach(z => rod('#f0cc8a', [-0.48 + i * 0.4, 0.88, z], [-0.33 + i * 0.4, 0.88, z + 0.04], 0.017, table));
    }
    const sketch = part(-2.7, 0.7, 1.52);
    sketch.rotation.x = -0.16;
    box('#b89c78', 0, 0, 0, 0.88, 1.03, 0.09, sketch);
    box('#f1e5cb', 0, 0.02, 0.06, 0.75, 0.87, 0.018, sketch);
    rod('#ad9270', [-0.32, -0.68, -0.06], [-0.22, 0.32, -0.06], 0.035, sketch);
    rod('#ad9270', [0.32, -0.68, -0.06], [0.22, 0.32, -0.06], 0.035, sketch);
    shapeMesh([[-0.25, 0.2], [0, 0.4], [0.25, 0.2]], '#b87762', 0.015, sketch, [0, 0, 0.076], 0.008);
    box('#c6b290', 0, 0.13, 0.082, 0.39, 0.14, 0.012, sketch);
    bone(0, -0.09, 0.089, 0.29, sketch);
    rod('#a89477', [-0.27, -0.28, 0.085], [0.27, -0.28, 0.085], 0.018, sketch);
    [-0.24, 0, 0.24].forEach(x => rod('#a89477', [x, -0.35, 0.085], [x, -0.2, 0.085], 0.015, sketch));
    path([[-1.55, -0.68], [-1.2, -0.07], [-0.88, 0.57]], '#e9d7b8', 0.45);
    tree(-3.15, 0.24, 2.3, false, '#9fa778');
    for (let i = 0; i < 3; i++) {
      const puff = ball('#f2ece0', -0.94, 3.6 + i * 0.32, -2.6, 0.12 + i * 0.06, 0.11 + i * 0.04, 0.12, liveRoot);
      animators.push(time => { puff.position.x = -0.94 + Math.sin(time * 0.6 + i) * 0.08; puff.scale.setScalar(0.11 + i * 0.045 + Math.sin(time + i) * 0.02); });
    }
  }

  if (id === 'bridge' || id === 'cove') {
    // The creek is a modelled ribbon with its own bed, banks and stone stepping edge.
    const creekShape = new THREE.Shape();
    creekShape.moveTo(-3.8, -1.7); creekShape.bezierCurveTo(-2.8, -0.9, -1.2, -2.1, 0.15, -1.75); creekShape.bezierCurveTo(1.7, -1.5, 2.3, -0.1, 4.05, -0.65);
    creekShape.lineTo(4.25, -1.75); creekShape.bezierCurveTo(2.35, -0.94, 2.12, -2.8, 0.26, -2.8); creekShape.bezierCurveTo(-1.8, -3.1, -2.75, -2.05, -4.1, -2.8); creekShape.closePath();
    const creekGeo = new THREE.ShapeGeometry(creekShape, 24); creekGeo.rotateX(-Math.PI / 2);
    const creekVertices = creekGeo.getAttribute('position');
    for (let i = 0; i < creekVertices.count; i++) {
      const x = creekVertices.getX(i); const z = creekVertices.getZ(i); const radius = Math.hypot(x, z);
      if (radius > 4.49) creekVertices.setXYZ(i, x / radius * 4.49, creekVertices.getY(i), z / radius * 4.49);
    }
    extraGeometries.add(creekGeo);
    mesh(creekGeo, '#75aaa5', [0, 0.014, 0]);
    [[-3.75, 1.62], [-3.1, 1.23], [2.8, 0.87], [3.55, 0.76], [-1.84, 2.23], [2.3, 2.15]].forEach(([x, z], i) => pebble(x, z, 0.85 + (i % 3) * 0.18));
    for (let i = 0; i < 6; i++) {
      const ripple = torus('#b9dcce', -3 + i * 1.12, 0.026, 1.95 + Math.sin(i) * 0.35, 0.2, 0.014, liveRoot);
      ripple.scale.z = 0.34;
      animators.push(time => { ripple.scale.x = 0.8 + Math.sin(time * 1.2 + i) * 0.18; });
    }
    if (id === 'bridge') {
      const bridge = part(0.4, 0.04, 1.82, liveRoot, -0.18);
      for (let i = 0; i < 9; i++) {
        const x = (i - 4) * 0.32;
        box(i % 2 ? '#bc9669' : '#cba77a', x, 0.23 + Math.sin(i / 8 * Math.PI) * 0.25, 0, 0.3, 0.14, 1.05, bridge);
      }
      for (const z of [-0.55, 0.55]) {
        [-1.3, -0.64, 0, 0.64, 1.3].forEach(x => rod('#987149', [x, 0.1, z], [x, 0.89, z], 0.06, bridge));
        rod('#a9865b', [-1.35, 0.76, z], [0, 1.02, z], 0.055, bridge);
        rod('#a9865b', [0, 1.02, z], [1.35, 0.76, z], 0.055, bridge);
      }
      animators.push(time => { const age = time - reactionAt; bridge.rotation.z = age < 2.7 ? Math.sin(age * 9) * Math.exp(-age * 1.1) * 0.015 : 0; });
      const boat = part(-2.3, 0.075, 1.98, liveRoot, 0.25);
      ball('#bb8d60', 0, 0.04, 0, 0.73, 0.14, 0.34, boat);
      ball('#806346', 0, 0.13, 0, 0.58, 0.07, 0.23, boat);
      [-0.25, 0.25].forEach(x => box('#d0ab79', x, 0.17, 0, 0.14, 0.08, 0.51, boat));
      rod('#bd956a', [-0.6, 0.3, -0.12], [0.6, 0.22, 0.41], 0.026, boat);
      animators.push(time => { boat.position.y = 0.085 + Math.sin(time * 1.4) * 0.024; boat.rotation.z = Math.sin(time) * 0.025; const age = time - reactionAt; boat.position.x = -2.3 + (reactionName.includes('boat') && age < 4 ? Math.sin(age / 4 * Math.PI) * 0.8 : 0); });
      tree(-2.8, -2.15, 2.85, false, '#88a06c'); tree(2.83, -1.8, 2.2, false, '#a6b87e');
      bush(3.25, 0.02, 0.9);
    } else {
      tree(-2.8, -1.52, 2.9, false, '#96b18a');
      const shell = part(1.5, 0.16, -2.45, liveRoot, -0.24);
      for (let i = 0; i < 9; i++) {
        const a = -0.95 + i * 0.24;
        const rib = ball(i % 2 ? '#e5c7ad' : '#f0d9bb', Math.sin(a) * 0.6, 0.52 + Math.cos(a) * 0.43, 0, 0.2, 0.73, 0.21, shell);
        rib.rotation.z = -a;
      }
      ball('#d7b190', 0, 0.19, 0.2, 0.61, 0.18, 0.39, shell);
      const pearl = ball(clay('#f1dfb0', true), 0, 0.4, 0.27, 0.2, 0.2, 0.2, shell);
      animators.push(time => { pearl.scale.setScalar(0.2 * (1 + Math.sin(time * 1.3) * 0.05 + Math.max(0, 1 - (time - reactionAt) / 3) * 0.25)); });
      for (let i = 0; i < 3; i++) {
        const echoRing = torus(clay('#f2dbad', true), 1.5, 1, -2.1, 0.75 + i * 0.26, 0.022, liveRoot, [0, 0, 0]);
        echoRing.visible = false;
        animators.push(time => { const age = time - reactionAt - i * 0.25; echoRing.visible = age > 0 && age < 2; echoRing.scale.setScalar(1 + Math.max(0, age) * 0.23); });
      }
      [[-3.4, 0.45], [3.2, 0.9], [-1.98, 2.86]].forEach(([x, z]) => grass(x, z, 1.6, '#83a58d'));
      path([[-0.2, -1.5], [0.35, -1.97], [0.86, -2.36]], '#e4d7b7', 0.35);
    }
  }

  if (id === 'home') {
    cottage(-2.29, -2.23, 0.8, '#738b98', 'fish', 0.15);
    cottage(1.45, -2.06, 1.05, '#b86d58', 'bone', -0.07);
    fence(-2.82, -0.57, 1.83, 0.11); fence(3.43, -0.17, 1.57, -0.7);
    path([[1.4, -0.78], [1.06, -0.1], [0.71, 0.49], [0.3, 1.06], [-0.02, 1.69], [-0.31, 2.28]], '#e4d2aa', 0.51);
    tree(-3.45, 0.72, 2.6, false, '#92a46c'); bush(3.2, 1.4);
    for (let i = 0; i < 5; i++) flower(2.72 + (i % 2) * 0.36, -0.55 + i * 0.48, i % 2 ? '#ebc3a0' : '#e7d995');
    const sign = part(-1.37, 0, 1.83);
    rod('#a48056', [0, 0.04, 0], [0, 1.2, 0], 0.045, sign);
    box('#dcc59d', 0, 0.95, 0, 0.66, 0.35, 0.09, sign);
    bone(0, 0.95, 0.07, 0.39, sign);
    const welcome = clouds(1.5, 3.14, -2.1, 0.2, liveRoot, '#f1d4b2');
    welcome.visible = false;
    animators.push(time => { const age = time - reactionAt; welcome.visible = age < 3; welcome.position.y = 3.14 + Math.min(age, 3) * 0.2; welcome.scale.setScalar(1 + Math.sin(Math.min(age, 3) * Math.PI / 3) * 0.2); });
  }

  if (id === 'observatory') {
    ball('#829796', -2.48, 0.13, -1.82, 1.49, 0.24, 1.3);
    const telescope = part(-2.5, 0.23, -1.83, liveRoot, -0.42);
    [[-0.57, 0, 0.32], [0.57, 0, 0.32], [0, 0, -0.53]].forEach(p => rod('#b49166', p, [0, 1.18, 0], 0.075, telescope));
    cylinder('#a27f58', 0, 1.1, 0, 0.22, 0.22, 0.22, telescope);
    const tube = part(0, 1.4, 0, telescope); tube.rotation.x = -0.66;
    cylinder('#d2b57e', 0, 0.15, 0, 0.25, 0.19, 1.46, tube);
    cylinder('#8b9a96', 0, 0.91, 0, 0.29, 0.29, 0.11, tube);
    cylinder('#455f72', 0, 0.971, 0, 0.22, 0.22, 0.016, tube);
    cylinder('#e0c995', 0, -0.65, 0, 0.1, 0.13, 0.2, tube);
    animators.push(time => { const age = time - reactionAt; telescope.rotation.y = -0.42 + Math.sin(time * 0.18) * 0.035 + (age < 3 ? Math.sin(age * Math.PI / 3) * 0.15 : 0); });
    cylinder('#909fa7', 1.88, 0.045, -1.74, 1.28, 1.33, 0.09);
    torus('#e3d4a9', 1.88, 0.105, -1.74, 1.1, 0.045);
    const rocket = part(1.88, 0.18, -1.74, liveRoot);
    cylinder('#e8e3d2', 0, 1.17, 0, 0.4, 0.43, 1.61, rocket);
    cylinder('#b77260', 0, 2.22, 0, 0.01, 0.4, 0.62, rocket);
    cylinder('#8a9b9b', 0, 0.34, 0, 0.29, 0.24, 0.23, rocket);
    windowCircle(0, 1.42, 0.41, rocket, 0.21);
    for (let i = 0; i < 3; i++) {
      const fin = part(0, 0, 0, rocket, i * Math.PI * 2 / 3);
      shapeMesh([[0.29, 1.02], [0.79, 0.17], [0.36, 0.31]], '#b77260', 0.14, fin, [0, 0, -0.07], 0.035);
    }
    const plume = ball(clay('#e6c47f', true), 0, 0.16, 0, 0.22, 0.25, 0.22, rocket); plume.visible = false;
    animators.push(time => { const age = time - reactionAt; const lift = age >= 0 && age < 4 ? Math.sin(age / 4 * Math.PI) : 0; rocket.position.y = 0.18 + lift * 1.2; plume.visible = lift > 0.1; plume.scale.y = 0.25 + lift * 0.3; });
    const mapDesk = part(-2.8, 0, 1.25, staticRoot, 0.15);
    box('#b49b77', 0, 0.61, 0, 1.05, 0.12, 0.65, mapDesk);
    [-0.39, 0.39].forEach(x => box('#8e806a', x, 0.29, 0, 0.09, 0.58, 0.46, mapDesk));
    box('#e9dfc4', 0, 0.683, 0, 0.8, 0.015, 0.49, mapDesk);
    torus('#9aabaf', 0, 0.696, 0, 0.14, 0.018, mapDesk);
    for (let i = 0; i < 5; i++) pebble(3.1 + Math.sin(i) * 0.45, 0.9 + i * 0.4, 0.7 + (i % 2) * 0.3, '#b1b5ad');
    clouds(-1.1, 3.9, -3.75, 0.46, staticRoot, '#dce2e6');
  }

  if (id === 'reef') {
    ball('#9fc7b8', -2.75, 0.17, -1.64, 1.42, 0.27, 1.1);
    ball('#91c1b5', 2.78, 0.11, -1.65, 1.15, 0.23, 1.21);
    const coral = (x, z, color, scale = 1) => {
      const node = part(x, 0, z); node.scale.setScalar(scale);
      rod(color, [0, 0.03, 0], [0, 1.26, 0], 0.115, node);
      [[-0.47, 0.95, 0.01], [0.52, 1.38, -0.05], [-0.17, 1.71, -0.06]].forEach((p, i) => {
        rod(color, [0, 0.53 + i * 0.17, 0], p, 0.085, node);
        rod(color, p, [p[0], p[1] + 0.4, p[2]], 0.075, node);
        ball(color, p[0], p[1] + 0.4, p[2], 0.076, 0.1, 0.076, node);
      });
    };
    coral(-2.94, -2.15, '#cc9e8f', 1.35); coral(2.87, -2.22, '#ba9db5', 1.06); coral(3.6, 0.17, '#d5b387', 0.58);
    const chest = part(-2.74, 0.15, 0.59, staticRoot, 0.2);
    box('#b18b62', 0, 0.32, 0, 1.03, 0.57, 0.68, chest);
    cylinder('#9b7858', 0, 0.62, 0, 0.34, 0.34, 1.04, chest, [0, 0, Math.PI / 2]);
    [-0.33, 0.33].forEach(x => box('#d0b573', x, 0.36, 0.355, 0.09, 0.73, 0.04, chest));
    box('#d6ba75', 0, 0.51, 0.38, 0.13, 0.19, 0.05, chest);
    const bolt = part(2.62, 0.07, 0.69, liveRoot, 0.3);
    cylinder('#789cac', 0, 0.23, 0, 0.12, 0.12, 0.45, bolt);
    mesh(geometry('bolt-cap', () => new THREE.CylinderGeometry(0.26, 0.26, 0.13, 6)), '#9bbbc2', [0, 0.5, 0], [1, 1, 1], bolt);
    [0.12, 0.21, 0.3].forEach(y => torus('#a0bfca', 0, y, 0, 0.13, 0.025, bolt));
    animators.push(time => { bolt.rotation.y = 0.3 + Math.sin(time * 0.5) * 0.05; const age = time - reactionAt; bolt.position.y = 0.07 + (age < 3 ? Math.sin(age / 3 * Math.PI) * 0.45 : 0); });
    for (let i = 0; i < 9; i++) {
      const bubble = ball(clay('#b9deda', false, true), 0, 0, 0, 0.12 + (i % 3) * 0.06, undefined, undefined, liveRoot);
      const x = (i % 2 ? -1 : 1) * (2.65 + rng() * 0.7); const z = -1.6 + rng() * 2.3;
      animators.push(time => { bubble.position.set(x + Math.sin(time * 0.55 + i) * 0.13, 0.3 + ((time * 0.23 + i * 0.43) % 2.9), z); });
    }
    const soundBubble = part(2.2, 1.82, -1.07, liveRoot);
    ball(clay('#c8e6db', false, true), 0, 0, 0, 0.39, 0.39, 0.39, soundBubble);
    torus('#d8eee2', 0, 0, 0, 0.39, 0.013, soundBubble, [0, 0, 0]);
    ball(clay('#efd5a1', true), 0, 0, 0, 0.085, 0.085, 0.085, soundBubble);
    animators.push(time => {
      const age = time - reactionAt;
      const response = age > 0 && age < 3 ? Math.sin(age / 3 * Math.PI) : 0;
      soundBubble.position.y = 1.82 + Math.sin(time * 0.85) * 0.08 + response * 0.22;
      soundBubble.scale.setScalar(1 + response * 0.45);
    });
    [[-3.6, -0.5], [3.3, 1.72], [-2.7, 2.26]].forEach(([x, z]) => grass(x, z, 1.9, '#6fa697'));
    const star = part(1.9, 0.045, 2.46, staticRoot, 0.4);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 0.4;
      const ray = ball('#d5ab88', Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15, 0.11, 0.06, 0.28, star); ray.rotation.y = a;
    }
  }

  if (id === 'pocket') {
    // A broad curved cloth panel, raised welt and hand-built running stitches.
    const clothShape = new THREE.Shape();
    clothShape.moveTo(-3.8, 0.1); clothShape.quadraticCurveTo(-3.8, 2.8, -3.15, 3.45); clothShape.quadraticCurveTo(0, 2.95, 3.15, 3.45); clothShape.quadraticCurveTo(3.8, 2.8, 3.8, 0.1); clothShape.quadraticCurveTo(0, -0.18, -3.8, 0.1);
    const clothGeo = new THREE.ExtrudeGeometry(clothShape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.13, bevelSegments: 3 }); extraGeometries.add(clothGeo);
    mesh(clothGeo, '#9889ac', [0, -0.05, -3.02]);
    rod('#cbb7c9', [-3.13, 3.32, -2.78], [0, 3.08, -2.78], 0.105);
    rod('#cbb7c9', [0, 3.08, -2.78], [3.13, 3.32, -2.78], 0.105);
    for (let i = 0; i < 21; i++) {
      const x = -3.15 + i * 0.31;
      rod('#dec9d1', [x, 2.9 + Math.abs(x) * 0.064, -2.72], [x + 0.11, 2.96 + Math.abs(x) * 0.064, -2.72], 0.028);
    }
    for (let i = 0; i < 6; i++) [-1, 1].forEach(side => rod('#cfbbc9', [side * 3.49, 0.32 + i * 0.36, -2.68], [side * 3.5, 0.48 + i * 0.36, -2.68], 0.028));
    const spool = part(-2.65, 0, -0.82, staticRoot, 0.18);
    cylinder('#cfb596', 0, 0.71, 0, 0.65, 0.65, 1.29, spool);
    [0.13, 1.36].forEach(y => cylinder('#ba9b78', 0, y, 0, 0.8, 0.8, 0.15, spool));
    for (let i = 0; i < 10; i++) torus('#dfc09e', 0, 0.25 + i * 0.1, 0, 0.651, 0.025, spool);
    const button = (x, y, z, radius, color, parent = staticRoot, rotation = [-Math.PI / 2, 0, 0]) => {
      const node = part(x, y, z, parent); node.rotation.set(...rotation);
      cylinder(color, 0, 0, 0, radius, radius, 0.15, node, [Math.PI / 2, 0, 0]);
      torus('#ddcbbb', 0, 0, 0.09, radius * 0.79, 0.025, node, [0, 0, 0]);
      [-1, 1].forEach(s => [-1, 1].forEach(t => ball('#756c7e', s * radius * 0.2, t * radius * 0.2, 0.082, radius * 0.07, radius * 0.07, 0.026, node)));
      return node;
    };
    button(2.62, 0.72, -1.72, 0.72, '#cda0a2', staticRoot, [0.07, -0.25, -0.12]);
    button(2.85, 0.14, 1.16, 0.49, '#d9c58d');
    const thread = part(-2.16, 0.2, 1.52, liveRoot);
    ball('#b68780', 0, 0, 0, 0.44, 0.37, 0.41, thread);
    for (let i = 0; i < 5; i++) torus('#d1a29a', 0, 0, 0, 0.4, 0.028, thread, [0.2 + i * 0.42, i * 0.58, 0.3]);
    animators.push(time => { const age = time - reactionAt; thread.rotation.z = age < 3 ? Math.sin(age * 4) * Math.exp(-age) * 0.3 : 0; });
    const ladder = part(0.89, 0, -2.12, liveRoot); ladder.rotation.x = -0.2;
    [-0.35, 0.35].forEach(x => rod('#d3b48f', [x, 0.12, 0], [x, 2.76, 0], 0.05, ladder));
    for (let i = 0; i < 7; i++) rod('#e1c9a2', [-0.35, 0.3 + i * 0.36, 0], [0.35, 0.3 + i * 0.36, 0], 0.045, ladder);
    animators.push(time => { const age = time - reactionAt; ladder.rotation.z = age < 3 ? Math.sin(age * 3) * 0.025 * Math.exp(-age) : 0; });
  }

  if (id === 'cloud') {
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      clouds(Math.cos(a) * 3.8, 0.07, Math.sin(a) * 3.8, 0.65, staticRoot, i % 2 ? '#e5e4e8' : '#f1ece7');
    }
    const gate = part(0.25, 0.06, -2.78);
    arc('#b5c5cb', 0, 1.36, 0, 1.35, 0.2, gate);
    [-1.35, 1.35].forEach(x => rod('#b5c5cb', [x, 0, 0], [x, 1.36, 0], 0.2, gate));
    [[-1.36, 1.1], [-1.14, 2.11], [-0.42, 2.64], [0.45, 2.65], [1.19, 2.08], [1.36, 1.02]].forEach(([x, y], i) => clouds(x, y, 0, 0.35, gate, i % 2 ? '#e7e6e7' : '#f2eee8'));
    const compass = part(2.84, 0.03, 0.55, liveRoot);
    cylinder('#a7b6bd', 0, 0.28, 0, 0.5, 0.63, 0.5, compass);
    cylinder('#dfcaa3', 0, 0.56, 0, 0.58, 0.58, 0.12, compass);
    const needle = part(0, 0.65, 0, compass);
    shapeMesh([[0, -0.31], [-0.1, 0], [0, 0.31], [0.1, 0]], '#ab7d6a', 0.03, needle, [0, 0, 0], 0.01).rotation.x = -Math.PI / 2;
    animators.push(time => { const age = time - reactionAt; needle.rotation.y = age < 3 ? Math.sin(age * 4) * Math.exp(-age) * 1.1 : Math.sin(time * 0.8) * 0.06; });
    const windmill = part(-2.7, 0.1, -0.68);
    cylinder('#c6b492', 0, 1.06, 0, 0.25, 0.4, 2.1, windmill);
    cylinder('#c5a67f', 0, 2.25, 0, 0, 0.45, 0.45, windmill);
    const rotor = part(-2.7, 1.96, -0.29, liveRoot);
    for (let i = 0; i < 4; i++) {
      const blade = part(0, 0, 0, rotor); blade.rotation.z = i * Math.PI / 2;
      box('#ded3b5', 0, 0.48, 0, 0.21, 0.92, 0.055, blade);
      box('#b4bbaa', 0, 0.67, 0.035, 0.27, 0.37, 0.05, blade);
    }
    ball('#aa9277', 0, 0, 0.06, 0.14, 0.14, 0.07, rotor);
    animators.push((time, dt) => { const active = time - reactionAt < 3; rotor.rotation.z += dt * (active ? 1.8 : 0.25); });
    path([[-0.35, -1.5], [-0.15, -0.88], [0.2, -0.25]], '#e9e1d0', 0.45);
    const glowSeed = ball(clay('#f0d49c', true), 0.22, 0.15, -2.1, 0.11, 0.15, 0.11, liveRoot);
    for (let i = 0; i < 5; i++) {
      const pathLight = ball(clay('#f4ddb0', true), 0.2 - Math.sin(i * 0.65) * 0.35, 0.065, -2.23 + i * 0.4, 0.055, 0.035, 0.055, liveRoot);
      animators.push(time => {
        const age = time - reactionAt - i * 0.18;
        pathLight.visible = age >= 0 && age < 4;
        pathLight.scale.setScalar(0.045 + Math.max(0, Math.sin(age / 4 * Math.PI)) * 0.045);
      });
    }
    animators.push(time => { const age = time - reactionAt; glowSeed.scale.y = 0.15 + (age < 4 ? Math.sin(age / 4 * Math.PI) * 0.13 : 0); });
  }

  if (id === 'moon') {
    const crater = (x, z, radius) => {
      cylinder('#a6aebd', x, 0.007, z, radius * 0.93, radius * 0.93, 0.025);
      torus('#cdd0d8', x, 0.095, z, radius, radius * 0.12);
      torus('#b2b8c5', x, 0.049, z, radius * 0.82, radius * 0.032);
    };
    crater(-2.1, -2.12, 1.22); crater(2.92, 1.24, 0.57); crater(-2.87, 1.9, 0.42);
    const listeningShell = part(-2.08, 0.17, -0.63);
    for (let i = 0; i < 6; i++) {
      const a = -0.9 + i * 0.36;
      const rib = ball(i % 2 ? '#dec8ad' : '#e9d6b8', Math.sin(a) * 0.19, 0.17 + Math.cos(a) * 0.13, 0, 0.074, 0.23, 0.08, listeningShell);
      rib.rotation.z = -a;
    }
    ball('#c9b99e', 0, 0.06, 0.07, 0.19, 0.055, 0.13, listeningShell);
    for (let i = 0; i < 3; i++) {
      const echoRing = torus(clay('#ecd8b1', true), -2.08, 0.43, -0.46, 0.27 + i * 0.12, 0.016, liveRoot, [0, 0, 0]);
      echoRing.visible = false;
      animators.push(time => { const age = time - reactionAt - i * 0.22; echoRing.visible = reactionName.includes('listen') && age > 0 && age < 2.4; echoRing.scale.setScalar(1 + Math.max(0, age) * 0.35); });
    }
    [[-3.3, -0.3, 0.8], [3.1, -1.68, 1.25], [1.32, -3.43, 0.75], [-1.15, 3.17, 0.45]].forEach(([x, z, s]) => pebble(x, z, s, '#a3abba'));
    const flagpole = part(1.87, 0, -2.2);
    rod('#a38c6a', [0, 0.04, 0], [0, 2.57, 0], 0.045, flagpole);
    ball('#dac59d', 0, 2.63, 0, 0.075, 0.075, 0.075, flagpole);
    const flag = part(1.88, 2.31, -2.2, liveRoot);
    shapeMesh([[0, 0.17], [0.97, 0.06], [0.97, -0.53], [0, -0.44]], '#bb816f', 0.035, flag, [0, 0, 0], 0.025);
    cylinder('#edddbb', 0.45, -0.16, 0.055, 0.15, 0.15, 0.02, flag, [Math.PI / 2, 0, 0]);
    animators.push(time => { flag.rotation.y = Math.sin(time * 0.8) * 0.09 + (time - reactionAt < 3 ? Math.sin((time - reactionAt) * 4) * 0.12 : 0); });
    const earth = part(-0.75, 3.58, -3.58, liveRoot);
    ball('#7fabb1', 0, 0, 0, 0.46, 0.46, 0.46, earth);
    ball('#b3c49d', -0.14, 0.19, 0.33, 0.18, 0.21, 0.105, earth);
    ball('#b3c49d', 0.21, -0.13, 0.34, 0.15, 0.23, 0.09, earth);
    animators.push(time => { earth.position.y = 3.58 + Math.sin(time * 0.4) * 0.045; });
    for (let i = 0; i < 7; i++) {
      const z = -1.1 + i * 0.47;
      [-0.1, 0.1].forEach((offset, n) => ball('#aab2c2', 0.67 + Math.sin(i * 0.6) * 0.19 + offset, 0.012, z + n * 0.1, 0.05, 0.015, 0.092));
    }
  }

  if (id === 'meadow') {
    tree(-2.73, -1.8, 3.05, false, '#789078'); tree(2.66, -2.12, 2.7, false, '#a0b095');
    const mound = part(0, 0.01, -2.8);
    ball('#8f9f83', 0, 0.11, 0, 1.37, 0.25, 0.79, mound);
    const log = part(-2.5, 0.28, 0.63, staticRoot, 0.17);
    cylinder('#9b7e63', 0, 0, 0, 0.3, 0.34, 1.58, log, [0, 0, Math.PI / 2]);
    cylinder('#d1b38c', 0.8, 0, 0, 0.26, 0.26, 0.022, log, [0, 0, Math.PI / 2]);
    torus('#ae906e', 0.819, 0, 0, 0.16, 0.018, log, [0, Math.PI / 2, 0]);
    for (let i = 0; i < 11; i++) {
      const x = (i % 2 ? -1 : 1) * (2.5 + rng() * 0.8); const z = -0.9 + rng() * 3.45;
      grass(x, z, 0.8 + rng() * 0.7, i % 2 ? '#7f987c' : '#afba8b');
      if (i % 3 === 0) flower(x + 0.17, z + 0.15, '#e4d79b', 0.12);
    }
    for (let i = 0; i < 11; i++) {
      const firefly = part(-2.9 + i * 0.56, 0.6 + (i % 4) * 0.33, -1.1 + Math.cos(i) * 0.35, liveRoot);
      ball(clay('#e9d997', true), 0, 0, 0, 0.04, 0.057, 0.04, firefly);
      [-1, 1].forEach(s => ball('#d8d9bd', s * 0.047, 0.02, 0, 0.041, 0.012, 0.025, firefly));
      const y = firefly.position.y; const x = firefly.position.x;
      animators.push(time => {
        const age = time - reactionAt - i * 0.11;
        const response = age > 0 && age < 3 ? Math.sin(age / 3 * Math.PI) : 0;
        firefly.position.set(x + Math.sin(time * 0.5 + i) * 0.12, y + Math.sin(time * 1.1 + i) * 0.13 + response * 0.33, -1.1 + Math.cos(i) * 0.35);
        firefly.scale.setScalar(0.9 + Math.sin(time * 1.5 + i) * 0.1 + response * 0.7);
      });
    }
    path([[-0.23, -2.07], [0.05, -1.55], [-0.07, -0.95]], '#b8c1a0', 0.38);
  }

  // Sparse foreground accents frame the stage without filling character standing space.
  if (!['cloud', 'moon', 'pocket', 'reef'].includes(id)) {
    [[-3.27, 2.06], [2.91, 2.08], [-1.65, 3.52], [1.15, 3.58]].forEach(([x, z], i) => {
      grass(x, z, 0.8 + (i % 2) * 0.25);
      if (i % 2 === 0) pebble(x + 0.35, z + 0.12, 0.55);
    });
  }

  // The reverse is explorable too: low radial landmarks leave the north-pole
  // story cast unobstructed while making every orbit recognisably this world.
  const secondaryAnchors = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 14; i++) {
    const polar = [1.43, 1.86, 2.29, 2.69][i % 4];
    const longitude = i * 2.3999632297 + 0.37;
    const normal = new THREE.Vector3(Math.sin(polar) * Math.cos(longitude), Math.cos(polar), Math.sin(polar) * Math.sin(longitude));
    const anchor = part(0, 0, 0, backsideRoot);
    anchor.position.copy(normal).multiplyScalar(radius).add(center);
    anchor.quaternion.setFromUnitVectors(up, normal);
    anchor.name = `radial-terrain-${i}`;
    secondaryAnchors.push({ point: anchor.position.toArray(), normal: normal.toArray() });
    const size = 0.45 + (i % 3) * 0.14;
    if (id === 'moon' || id === 'observatory') {
      ball(palette[1], 0, 0.016, 0, size, 0.026, size, anchor);
      torus(palette[2], 0, 0.04, 0, size, size * 0.1, anchor);
      if (i % 3 === 0) {
        ball('#a4afba', 0.57, 0.09, 0.15, 0.2, 0.14, 0.18, anchor);
        ball('#c1c5c5', -0.33, 0.09, -0.43, 0.12, 0.14, 0.15, anchor);
      }
    } else if (id === 'cloud') {
      clouds(0, 0.025, 0, size * 0.87, anchor, i % 2 ? '#e7e7ef' : '#f4efea');
    } else if (id === 'pocket') {
      cylinder(i % 2 ? '#ceafb3' : '#d9c89f', 0, 0.065, 0, size * 0.6, size * 0.6, 0.13, anchor);
      torus('#e4d1c7', 0, 0.14, 0, size * 0.48, 0.018, anchor);
      [-1, 1].forEach(x => [-1, 1].forEach(z => ball('#8a7897', x * size * 0.15, 0.14, z * size * 0.15, 0.035, 0.012, 0.035, anchor)));
    } else if (id === 'reef') {
      ball('#8ebcaf', 0, -0.01, 0, size, 0.12, size * 0.8, anchor);
      const coralColor = i % 2 ? '#cdad9c' : '#bb9fba';
      rod(coralColor, [0, 0, 0], [0.04, 0.65, 0], 0.065, anchor);
      rod(coralColor, [0.02, 0.23, 0], [-0.23, 0.46, 0.01], 0.05, anchor);
      rod(coralColor, [0.03, 0.4, 0], [0.25, 0.72, 0], 0.05, anchor);
      ball(coralColor, 0.25, 0.72, 0, 0.06, 0.07, 0.06, anchor);
    } else {
      ball(i % 2 ? palette[1] : '#b3c28d', 0, 0.015, 0, size, 0.115, size * 0.72, anchor);
      if (i % 4 === 0 && ['orchard', 'meadow', 'home', 'bakery'].includes(id)) {
        rod('#a28562', [0, 0.05, 0], [0, 0.65, 0], 0.075, anchor);
        ball(id === 'orchard' ? '#97ad71' : '#a5b386', 0, 0.73, 0, 0.36, 0.34, 0.31, anchor);
        if (id === 'orchard') apple(0.16, 0.7, 0.25, 0.075, anchor);
      } else {
        grass(0, 0, 0.75, palette[1], anchor);
        if (i % 3 === 0) flower(0.2, 0.1, '#efe1b5', 0.1, anchor);
        if (i % 2 === 0) pebble(-0.24, -0.15, 0.45, palette[2], anchor);
      }
    }
  }
  if (id === 'pocket') {
    for (let i = 0; i < 48; i++) {
      const angle = i / 48 * Math.PI * 2;
      const threadPoint = value => {
        const polar = 1.79 + Math.sin(value * 2) * 0.1;
        return [Math.sin(polar) * Math.cos(value) * (radius + 0.035), Math.cos(polar) * (radius + 0.035) - radius, Math.sin(polar) * Math.sin(value) * (radius + 0.035)];
      };
      rod('#dfcdd4', threadPoint(angle - 0.032), threadPoint(angle + 0.032), 0.027, backsideRoot);
    }
  }
  if (['bridge', 'cove', 'reef'].includes(id)) {
    const positions = []; const normals = []; const indices = [];
    const lengthSegments = 112, widthSegments = 4, rowSize = widthSegments + 1;
    for (let i = 0; i <= lengthSegments; i++) {
      const longitude = i / lengthSegments * Math.PI * 2;
      const latitude = 1.7 + Math.sin(longitude * 2 + 0.8) * 0.24 + Math.sin(longitude * 3) * 0.09;
      // Cross-river subdivisions follow the sphere instead of cutting a chord
      // underneath it, keeping even the wider reef ribbon continuously visible.
      for (let j = 0; j <= widthSegments; j++) {
        const side = j / widthSegments * 2 - 1;
        const polar = latitude + side * (id === 'reef' ? 0.12 : 0.065);
        const n = new THREE.Vector3(Math.sin(polar) * Math.cos(longitude), Math.cos(polar), Math.sin(polar) * Math.sin(longitude));
        positions.push(n.x * (radius + 0.014), n.y * (radius + 0.014) - radius, n.z * (radius + 0.014));
        normals.push(n.x, n.y, n.z);
      }
      if (i < lengthSegments) {
        for (let j = 0; j < widthSegments; j++) {
          const a = i * rowSize + j, b = a + rowSize;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
    const riverGeometry = new THREE.BufferGeometry();
    riverGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    riverGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    riverGeometry.setIndex(indices); extraGeometries.add(riverGeometry);
    mesh(riverGeometry, '#81b7b3', [0, 0, 0], [1, 1, 1], backsideRoot);
  }

  // Long terrain triangles need subdivision before curving, otherwise their
  // chords disappear into the sphere. Static work happens only at creation.
  function batchStatic(root, curved = false) {
    root.updateMatrixWorld(true);
    const batches = new Map();
    const normalMatrix = new THREE.Matrix3();
    const p = new THREE.Vector3(); const n = new THREE.Vector3();
    const mappedPoint = new THREE.Vector3(); const mappedNormal = new THREE.Vector3();
    const readVertex = (position, normal, vertex, matrix) => {
      p.fromBufferAttribute(position, vertex).applyMatrix4(matrix);
      n.fromBufferAttribute(normal, vertex).applyNormalMatrix(normalMatrix);
      return [p.x, p.y, p.z, n.x, n.y, n.z];
    };
    const append = (batch, vertex) => {
      if (curved) {
        surfacePoint(vertex[0], vertex[2], vertex[1], mappedPoint);
        n.set(vertex[3], vertex[4], vertex[5]);
        surface.mapNormal(vertex[0], vertex[1], vertex[2], n, mappedNormal);
        batch.position.push(mappedPoint.x, mappedPoint.y, mappedPoint.z);
        batch.normal.push(mappedNormal.x, mappedNormal.y, mappedNormal.z);
      } else {
        batch.position.push(vertex[0], vertex[1], vertex[2]);
        batch.normal.push(vertex[3], vertex[4], vertex[5]);
      }
    };
    const planarLength = (a, b) => (a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2;
    const emitTriangle = (batch, a, b, c, depth = 0) => {
      if (curved && depth < 9) {
        const ab = planarLength(a, b), bc = planarLength(b, c), ca = planarLength(c, a);
        if (Math.max(ab, bc, ca) > 0.42 ** 2) {
          if (bc > ab && bc >= ca) return emitTriangle(batch, b, c, a, depth);
          if (ca > ab && ca > bc) return emitTriangle(batch, c, a, b, depth);
          const middle = a.map((value, i) => (value + b[i]) / 2);
          emitTriangle(batch, a, middle, c, depth + 1); emitTriangle(batch, middle, b, c, depth + 1);
          return;
        }
      }
      append(batch, a); append(batch, b); append(batch, c);
    };
    root.traverse(item => {
      if (!item.isMesh) return;
      const key = item.material.uuid;
      if (!batches.has(key)) batches.set(key, { material: item.material, position: [], normal: [] });
      const batch = batches.get(key);
      const pos = item.geometry.getAttribute('position');
      const normals = item.geometry.getAttribute('normal');
      const indices = item.geometry.index;
      normalMatrix.getNormalMatrix(item.matrixWorld);
      for (let i = 0, count = indices ? indices.count : pos.count; i < count; i += 3) {
        emitTriangle(batch, ...[0, 1, 2].map(offset => readVertex(pos, normals, indices ? indices.getX(i + offset) : i + offset, item.matrixWorld)));
      }
    });
    root.clear();
    batches.forEach(({ material, position, normal }) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
      geo.computeBoundingSphere(); extraGeometries.add(geo);
      mesh(geo, material, [0, 0, 0], [1, 1, 1], root);
    });
  }
  batchStatic(staticRoot, true);
  batchStatic(backsideRoot);

  // Animation functions keep their original planar coordinates. A parent
  // matrix independently places each rigid landmark in its local gravity,
  // so launches rise radially and repeated updates never accumulate a warp.
  const dynamicAnchors = [...liveRoot.children].map((object, index) => {
    const anchor = new THREE.Group();
    anchor.name = `planet-dynamic-anchor-${index}`;
    anchor.matrixAutoUpdate = false;
    anchor.userData = { planetAnchor: true, planarPosition: { x: 0, y: 0, z: 0 } };
    liveRoot.add(anchor); anchor.add(object);
    return { anchor, object };
  });
  const gravityRotation = new THREE.Quaternion();
  const gravityNormal = new THREE.Vector3(); const gravityPosition = new THREE.Vector3();
  const unitScale = new THREE.Vector3(1, 1, 1); const translation = new THREE.Matrix4();
  const placeDynamicAnchors = () => dynamicAnchors.forEach(({ anchor, object }) => {
    const { x, y, z } = object.position;
    surfacePoint(x, z, y, gravityPosition); surfaceNormal(x, z, gravityNormal);
    gravityRotation.setFromUnitVectors(up, gravityNormal);
    anchor.matrix.compose(gravityPosition, gravityRotation, unitScale).multiply(translation.makeTranslation(-x, -y, -z));
    anchor.matrixWorldNeedsUpdate = true;
    Object.assign(anchor.userData.planarPosition, { x, y, z });
  });
  placeDynamicAnchors();
  let meshes = 0; let triangles = 0;
  group.traverse(item => { if (item.isMesh) { meshes++; triangles += (item.geometry.index?.count || item.geometry.getAttribute('position').count) / 3; } });
  group.userData = { worldId: id, modelSource: 'independently-modelled-dev-planets', meshes, triangles, planetRadius: radius, secondaryAnchors };

  return {
    group,
    planet: { radius, center: center.clone() },
    surfacePoint,
    surfaceNormal,
    characterSpots: [{ x: -1.45, y: 0.045, z: 0.35, rotation: 0.24 }, { x: 0, y: 0.045, z: 0.85, rotation: 0 }, { x: 1.45, y: 0.045, z: 0.35, rotation: -0.24 }],
    focus: { x: 0, y: -1.45, z: 0 },
    camera: { position: [9, 7.4, 14], target: [0, -1.8, 0] },
    tint: WORLD_CATALOG.find(world => world.id === id).tint,
    stats: { meshes, triangles, materials: materials.size, staticBatches: staticRoot.children.length + backsideRoot.children.length + 1, radius, secondaryLandmarks: secondaryAnchors.length },
    update(time, dt = 1 / 60) {
      if (disposed) return;
      elapsed = Number.isFinite(time) ? time : elapsed + dt;
      animators.forEach(animate => animate(elapsed, Math.max(0, Math.min(dt, 0.1))));
      placeDynamicAnchors();
    },
    react(action = 'celebrate') {
      if (disposed) return;
      reactionAt = elapsed;
      reactionName = typeof action === 'string' ? action : action?.id || action?.type || 'celebrate';
      reactions.forEach(react => react(reactionName));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometryCache.forEach(geo => geo.dispose());
      extraGeometries.forEach(geo => geo.dispose());
      materials.forEach(material => material.dispose());
      group.removeFromParent(); group.clear();
    },
  };
}
