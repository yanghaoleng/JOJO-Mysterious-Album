import * as THREE from '../vendor/three.module.js';

export const EXPLORATION_ZONES = [
  { id: 'home', name: '星星小屋', hint: '故事从这里开始', x: 0, z: 1.8, color: '#e6bb79' },
  { id: 'lake', name: '小鱼湖', hint: '靠近岸边，小鱼会来打招呼', x: -6.5, z: 1, color: '#83bfc3' },
  { id: 'flowers', name: '弹弹花地', hint: '走过花丛，花儿一朵朵跳起来', x: 6.3, z: 1.7, color: '#daa0a0' },
  { id: 'mushrooms', name: '蘑菇小径', hint: '沿着石子路，看看谁在点头', x: -3.5, z: 7, color: '#c7a9cf' },
  { id: 'bells', name: '风铃坡', hint: '走近风铃，摇出一圈小星光', x: 4.5, z: -6.5, color: '#b0c68b' },
];

/** Shared low-poly clay pieces. These decorations have no story side effects. */
export function createExplorationWorld(world) {
  const root = new THREE.Group(); root.name = 'walkable-neighborhoods';
  const geometries = new Map(), materials = new Map(), reactions = [];
  const up = new THREE.Vector3(0, 1, 0);
  const geometry = kind => {
    if (!geometries.has(kind)) geometries.set(kind, kind === 'box' ? new THREE.BoxGeometry(1, 1, 1) : kind === 'ring' ? new THREE.TorusGeometry(1, .035, 6, 36) : kind === 'cone' ? new THREE.ConeGeometry(1, 1, 10) : new THREE.SphereGeometry(1, 12, 8));
    return geometries.get(kind);
  };
  function shape(parent, color, position, scale, kind = 'ball') {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .92, userData: { handcraftedSurface: 'paper' } }));
    const mesh = new THREE.Mesh(geometry(kind), materials.get(color)); mesh.position.set(...position); mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function anchor(x, z, height = .025) {
    const group = new THREE.Group(); root.add(group);
    group.position.copy(world.surfacePoint(x, z, height)); group.quaternion.setFromUnitVectors(up, world.surfaceNormal(x, z));
    return group;
  }
  function reactive(x, z, radius, build, kind) {
    const base = anchor(x, z), group = new THREE.Group(); base.add(group); build(group);
    reactions.push({ group, normal: world.surfaceNormal(x, z), radius, kind, age: 100, inside: false, count: 0 });
    return group;
  }
  function flower(parent, color, size = 1) {
    shape(parent, '#71885a', [0, .25 * size, 0], [.035, .3 * size, .035]);
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * .4; shape(parent, color, [Math.cos(a) * .18 * size, .5 * size, Math.sin(a) * .18 * size], [.16 * size, .09, .16 * size]); }
    shape(parent, '#e8bd68', [0, .57 * size, 0], [.095, .055, .095]);
  }
  // Pebbled paths branch from the same clearing. Every stone hugs the sphere.
  EXPLORATION_ZONES.slice(1).forEach(zone => {
    for (let i = 0; i < 16; i++) {
      const t = i / 15, x = zone.x * t + Math.sin(t * Math.PI) * .5, z = 1.8 + (zone.z - 1.8) * t;
      if (zone.id === 'lake' && t > .67) continue;
      const base = anchor(x, z, .01);
      shape(base, i % 3 ? '#dfcfac' : '#e9dabb', [0, .025, 0], [.27 + .04 * (i % 2), .04, .19]);
    }
  });
  // A curved water disc follows the actual globe instead of floating above it.
  const lake = EXPLORATION_ZONES[1], lakeRadius = 1.65;
  const vertices = [], indices = [];
  for (let ring = 0; ring <= 8; ring++) for (let i = 0; i <= 48; i++) {
    const a = i / 48 * Math.PI * 2, r = ring / 8 * lakeRadius;
    vertices.push(...world.surfacePoint(lake.x + Math.cos(a) * r, lake.z + Math.sin(a) * r * .8, .035).toArray());
    if (ring < 8 && i < 48) { const n = ring * 49 + i; indices.push(n, n + 49, n + 1, n + 1, n + 49, n + 50); }
  }
  const waterGeometry = new THREE.BufferGeometry(); waterGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); waterGeometry.setIndex(indices); waterGeometry.computeVertexNormals(); geometries.set('water', waterGeometry);
  const waterMaterial = new THREE.MeshStandardMaterial({ color: '#83bec2', roughness: .42, side: THREE.DoubleSide, userData: { handcraftedSurface: 'water' } }); materials.set('water', waterMaterial);
  const water = new THREE.Mesh(waterGeometry, waterMaterial); water.receiveShadow = true; root.add(water);
  for (let i = 0; i < 13; i++) {
    const a = i / 13 * Math.PI * 2;
    const bank = anchor(lake.x + Math.cos(a) * 1.8, lake.z + Math.sin(a) * 1.45);
    shape(bank, i % 2 ? '#b7c5a0' : '#d6ccb2', [0, .04, 0], [.24, .13, .19]);
    if (i % 4 === 0) for (let j = 0; j < 3; j++) shape(bank, '#839a6e', [j * .08, .28, -.04], [.03, .35 + j * .04, .035]);
  }
  const fish = reactive(lake.x, lake.z, 2.9, group => {
    for (let i = 0; i < 3; i++) {
      const model = new THREE.Group(); group.add(model); model.position.set((i - 1) * .55, 0, (i % 2) * .4 - .2);
      shape(model, ['#edb97d', '#e9d998', '#dca3a0'][i], [0, 0, 0], [.23, .13, .12]);
      shape(model, '#f3cf98', [-.23, 0, 0], [.14, .17, .055], 'cone').rotation.z = Math.PI / 2;
      shape(model, '#424944', [.13, .045, .10], [.025, .025, .025]);
      model.userData.rest = model.position.clone();
    }
  }, 'fish'); fish.visible = false;
  const ripple = anchor(lake.x, lake.z, .06);
  const rippleMesh = shape(ripple, '#c8e6dc', [0, 0, 0], [.7, .7, .7], 'ring'); rippleMesh.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 10; i++) {
    const a = i * 2.4, r = .65 + (i % 3) * .48;
    reactive(6.3 + Math.cos(a) * r, 1.7 + Math.sin(a) * r, 1.5, group => flower(group, ['#e4b2a9', '#f1d09c', '#d9c5de'][i % 3], .8 + (i % 3) * .15), 'flower');
  }
  for (let i = 0; i < 8; i++) {
    const x = -3.5 + Math.sin(i * 1.7) * 1.25, z = 5.4 + i * .45;
    reactive(x, z, 1.3, group => {
      const height = .38 + (i % 3) * .12;
      shape(group, '#ecdec4', [0, height * .5, 0], [.13, height * .6, .13]);
      shape(group, i % 2 ? '#c597a5' : '#ba9e83', [0, height, 0], [.39, .23, .36]);
      for (let j = 0; j < 3; j++) shape(group, '#f2dfc8', [Math.cos(j * 2.1) * .19, height + .17, Math.sin(j * 2.1) * .17], [.06, .035, .06]);
    }, 'mushroom');
  }
  for (let i = 0; i < 3; i++) {
    const x = 3.5 + i, z = -6.4 + (i % 2) * .9;
    const post = anchor(x, z); shape(post, '#a48d6a', [0, 1, 0], [.07, 1.05, .075]);
    shape(post, '#a48d6a', [.25, 2, 0], [.7, .08, .08], 'box');
    reactive(x + .4, z, 1.7, group => {
      shape(group, '#dcc899', [0, 1.8, 0], [.015, .18, .015]);
      shape(group, ['#d3c281', '#9fbab1', '#d3aba2'][i], [0, 1.55, 0], [.2, .28, .2], 'cone');
      shape(group, '#ecdba9', [0, 1.25, 0], [.055, .12, .055]);
      for (let j = 0; j < 3; j++) shape(group, '#f4d788', [Math.cos(j * 2) * .6, 1 + j * .25, Math.sin(j * 2) * .6], [.045, .09, .045]);
    }, 'bell');
  }
  // Small breathing shrubs connect the clearings without blocking paths.
  for (let i = 0; i < 24; i++) {
    const a = i * 2.39996, r = 4.4 + (i % 5) * 1.05, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (EXPLORATION_ZONES.some(zone => Math.hypot(x - zone.x, z - zone.z) < 2)) continue;
    reactive(x, z, 1.25, group => {
      shape(group, i % 2 ? '#9bb280' : '#b0bd8c', [0, .23, 0], [.36, .3, .32]);
      shape(group, '#bdc994', [.23, .17, .08], [.22, .22, .23]);
    }, 'shrub');
  }
  const zones = EXPLORATION_ZONES.map(zone => ({ ...zone, normal: world.surfaceNormal(zone.x, zone.z) }));
  const obstacles = [[-1.45, .35, .64], [-1.62, -2.22, 1.55], [2.55, -1.69, 1.02], [2.7, .95, .9], [lake.x, lake.z, 1.72]].map(([x, z, radius]) => ({ normal: world.surfaceNormal(x, z), radius }));
  return {
    root, zones, obstacles,
    update(dt, normal, reduced) {
      for (const item of reactions) {
        const near = normal.angleTo(item.normal) * world.planet.radius < item.radius;
        if (near && !item.inside) { item.age = 0; item.count++; }
        item.inside = near; item.age += dt;
        const pulse = item.age < 1.6 ? Math.sin(Math.PI * Math.min(1, item.age / 1.6)) : 0;
        if (item.kind === 'fish') {
          item.group.visible = item.age < 1.6;
          item.group.children.forEach((fish, i) => { const t = Math.max(0, Math.min(1, (item.age - i * .13) / 1.1)); fish.position.copy(fish.userData.rest); fish.position.y = .1 + Math.sin(t * Math.PI) * (reduced ? .16 : .85); fish.rotation.z = reduced ? 0 : -.6 + t * 1.2; });
        } else if (item.kind === 'bell') item.group.rotation.z = reduced ? pulse * .025 : Math.sin(item.age * 12) * pulse * .2;
        else {
          item.group.position.y = pulse * (reduced ? .02 : item.kind === 'flower' ? .35 : .14);
          item.group.scale.set(1 - pulse * .07, 1 + pulse * .16, 1 - pulse * .07);
          item.group.rotation.z = reduced ? 0 : Math.sin(item.age * 10) * pulse * .10;
        }
      }
      rippleMesh.scale.setScalar(.65 + (fish.visible ? (reactions[0].age % 1.6) * .5 : 0));
    },
    get reactions() { return reactions.map(({ kind, count, inside }) => ({ kind, count, inside })); },
    dispose() { root.removeFromParent(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}

export function createChildAvatar() {
  const group = new THREE.Group(), body = new THREE.Group(), facing = new THREE.Group(); group.add(facing); facing.add(body);
  group.name = 'child-explorer';
  const geometry = new THREE.SphereGeometry(1, 16, 12), materials = new Map();
  const ball = (parent, color, p, s) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .86, userData: { handcraftedSurface: 'fabric' } }));
    const mesh = new THREE.Mesh(geometry, materials.get(color)); mesh.position.set(...p); mesh.scale.set(...s); mesh.castShadow = true; parent.add(mesh); return mesh;
  };
  const boots = [-1, 1].map(side => ball(body, '#806b56', [side * .15, .11, .07], [.135, .11, .2]));
  ball(body, '#91ad9a', [0, .53, 0], [.34, .4, .25]);
  ball(body, '#efd4b2', [0, 1.05, .025], [.34, .34, .31]);
  ball(body, '#695649', [0, 1.26, -.02], [.34, .18, .30]);
  ball(body, '#695649', [-.22, 1.16, .23], [.15, .13, .07]);
  [-1, 1].forEach(side => {
    ball(body, '#514b46', [side * .115, 1.05, .32], [.026, .038, .023]);
    ball(body, '#dba9a0', [side * .21, .95, .29], [.055, .029, .019]);
  });
  ball(body, '#d4a66c', [0, .58, -.26], [.25, .3, .13]);
  ball(body, '#edce94', [0, .63, -.38], [.12, .12, .025]);
  const arms = [-1, 1].map(side => { const arm = new THREE.Group(); arm.position.set(side * .31, .69, 0); body.add(arm); ball(arm, '#91ad9a', [side * .035, -.12, 0], [.1, .22, .105]); ball(arm, '#efd4b2', [side * .055, -.30, .01], [.095, .095, .09]); return arm; });
  let step = 0;
  return { group, facing,
    update(dt, moving, reduced) {
      if (moving) step += dt * 11;
      const stride = moving && !reduced ? Math.sin(step) : 0;
      boots.forEach((boot, i) => { boot.position.z = .07 + stride * (i ? 1 : -1) * .12; boot.position.y = .11 + Math.max(0, stride * (i ? 1 : -1)) * .07; });
      arms.forEach((arm, i) => { arm.rotation.x = stride * (i ? -1 : 1) * .55; });
      body.position.y = moving && !reduced ? Math.abs(Math.sin(step)) * .035 : 0;
    },
    dispose() { geometry.dispose(); materials.forEach(m => m.dispose()); group.removeFromParent(); },
  };
}
