/** Original solid clay models for 《哇呜！第一束好奇光》. */
import * as THREE from '../vendor/three.module.js';

const UP = new THREE.Vector3(0, 1, 0);
const COLORS = ['#e5bd5d', '#86b4cd', '#dce4e7', '#a5c3a0', '#dca9bd', '#d6b462'];
const KINDS = ['gugu', 'fish', 'cloud', 'clock', 'shadow', 'star'];

function sculpture() {
  const geometries = new Set(), materials = new Set();
  const group = new THREE.Group();
  const sphere = new THREE.SphereGeometry(1, 24, 18);
  geometries.add(sphere);
  const mat = (color, extra = {}, surface = 'paper') => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: .78, metalness: 0, ...extra });
    material.userData.handcraftedSurface = surface; materials.add(material); return material;
  };
  const mesh = (parent, name, geometry, material, position = [0, 0, 0], scale = [1, 1, 1]) => {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, material);
    object.name = name; object.position.set(...position); object.scale.set(...scale);
    object.castShadow = !material.transparent; object.receiveShadow = true;
    parent.add(object); return object;
  };
  const ball = (parent, name, material, position, scale) => mesh(parent, name, sphere, material, position, scale);
  const rod = (parent, name, material, a, b, radius = .045) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
    const result = mesh(parent, name, new THREE.CylinderGeometry(radius, radius, delta.length(), 12), material, start.add(end).multiplyScalar(.5).toArray());
    result.quaternion.setFromUnitVectors(UP, delta.normalize()); return result;
  };
  return { group, mat, mesh, ball, rod, ownMaterial(value) { materials.add(value); return value; }, releaseGeometry(geometry) { geometries.delete(geometry); geometry.dispose(); }, dispose() {
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    group.removeFromParent();
  } };
}

/** Bevelled silhouettes retain volume and rounded edges from every angle. */
function tokenGeometry(kind, size = 1, depth = .18) {
  const path = new THREE.Shape();
  if (kind === 'heart') {
    path.moveTo(0, -.65);
    path.bezierCurveTo(-1.35, .1, -.76, 1.05, 0, .48);
    path.bezierCurveTo(.76, 1.05, 1.35, .1, 0, -.65);
  } else if (kind === 'leaf') {
    path.moveTo(-.6, -.65); path.bezierCurveTo(-1.03, .25, -.08, .78, .64, .73);
    path.bezierCurveTo(.8, -.08, .26, -.95, -.6, -.65);
  } else if (kind === 'moon') {
    path.moveTo(.39, .76);
    path.bezierCurveTo(-.58, 1.08, -1.12, -.08, -.45, -.68);
    path.bezierCurveTo(-.17, -.91, .25, -.85, .55, -.57);
    path.bezierCurveTo(-.27, -.64, -.62, .2, .39, .76);
  } else if (kind === 'cloud') {
    path.moveTo(-.73, -.3);
    path.bezierCurveTo(-1.14, -.3, -1.04, .35, -.61, .32);
    path.bezierCurveTo(-.67, 1.03, .29, 1.04, .38, .42);
    path.bezierCurveTo(.97, .61, 1.2, -.27, .59, -.3);
    path.lineTo(-.73, -.3);
  } else if (kind === 'fish') {
    path.moveTo(-.47, 0); path.bezierCurveTo(-.09, .76, .94, .58, .9, 0);
    path.bezierCurveTo(.91, -.57, -.13, -.65, -.47, 0);
    path.lineTo(-.91, -.43); path.quadraticCurveTo(-1.01, 0, -.91, .43); path.lineTo(-.47, 0);
  } else {
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .46 : .91;
      if (!i) path.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else path.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  }
  path.closePath();
  const geometry = new THREE.ExtrudeGeometry(path, { depth, bevelEnabled: true, bevelThickness: .065, bevelSize: .065, bevelSegments: 4, curveSegments: 18, steps: 1 });
  geometry.translate(0, 0, -depth / 2); geometry.scale(size, size, size);
  return geometry;
}

/** Feet sit at local y=0. Only internal nodes animate; stage owns placement. */
export function createWowCharacter({ kind = 'gugu', color, scale = 1 } = {}) {
  if (![...KINDS, 'window'].includes(kind)) kind = 'gugu';
  const s = sculpture(), { group, mat, mesh, ball, rod } = s;
  group.name = `wow-momo-${kind}`;
  group.userData = { species: kind, source: 'dev/wow-visuals.js', restHeight: 2.35 };
  group.scale.setScalar(Number.isFinite(scale) && scale > 0 ? scale : 1);
  const skin = mat(color || COLORS[Math.max(0, KINDS.indexOf(kind))]);
  const cream = mat('#f5e9d5'), ink = mat('#393941', { roughness: .3 }, 'ink');
  const glint = mat('#fffaf0', { emissive: '#fff4d6', emissiveIntensity: .24 }, 'ink');
  const rosy = mat('#daa19f', {}, 'paint');
  const torso = new THREE.Group(), head = new THREE.Group();
  group.add(torso); torso.add(head);
  const supports = [], eyes = [], arms = [];
  let action = 'idle', expression = 'happy', hop = 0, phase = 0;
  const foot = (x, z, sx = .29, sy = .15, sz = .35, material = skin) => {
    const object = ball(torso, `sole-${supports.length}`, material, [x, sy, z], [sx, sy, sz]);
    object.userData.grounding = true; supports.push(object); return object;
  };
  const face = (y, z, spread = .23, eyesOnly = false) => {
    [-1, 1].forEach(side => {
      const eye = ball(head, `eye-${side}`, ink, [side * spread, y, z], [.066, .094, .046]);
      eyes.push(eye);
      ball(eye, 'glint', glint, [-.24, .34, .81], [.25, .19, .19]);
      if (!eyesOnly) ball(head, `cheek-${side}`, rosy, [side * (spread + .17), y - .12, z - .036], [.105, .052, .027]);
    });
    const mouth = mesh(head, 'smile', new THREE.TorusGeometry(.102, .017, 8, 20, Math.PI), ink, [0, y - .16, z + .011]);
    mouth.rotation.z = Math.PI; return mouth;
  };
  const arm = (side, y = .95, x = .67) => {
    const pivot = new THREE.Group(); pivot.position.set(side * x, y, .03); torso.add(pivot);
    ball(pivot, `arm-${side}`, skin, [side * .13, -.06, .1], [.2, .31, .2]);
    arms.push({ pivot, side });
  };
  let mouth;
  if (kind === 'window') {
    const wood = mat('#9c9793', {}, 'wood');
    const pane = mat('#89979d', { emissive: '#d7c690', emissiveIntensity: .12 }, 'paint');
    const base = mesh(torso, 'window-sill', new THREE.CapsuleGeometry(.11, 1.72, 6, 20), wood, [0, .11, 0]);
    base.rotation.z = Math.PI / 2; supports.push(base);
    for (const side of [-1, 1]) rod(torso, `window-post-${side}`, wood, [side * .78, .12, 0], [side * .78, 1.57, 0], .095);
    mesh(torso, 'window-arch', new THREE.TorusGeometry(.78, .095, 10, 32, Math.PI), wood, [0, 1.53, 0]);
    mesh(torso, 'window-glass', new THREE.CapsuleGeometry(.66, .8, 8, 28), pane, [0, 1.19, -.045], [1, 1, .12]);
    rod(torso, 'window-middle', wood, [0, .2, .02], [0, 2.23, .02], .035);
    rod(torso, 'window-cross', wood, [-.72, 1.16, .025], [.72, 1.16, .025], .035);
    mesh(torso, 'small-window-star', tokenGeometry('star', .19), glint, [.35, 1.78, .1]);
    skin.visible = false;
  } else if (kind === 'gugu') {
    ball(torso, 'round-tummy', skin, [0, 1.01, 0], [.81, .88, .66]);
    ball(torso, 'soft-tummy-patch', cream, [0, .89, .6], [.5, .45, .09]);
    const bellyLine = mat('#cba773', {}, 'ink');
    mesh(torso, 'tummy-ring', new THREE.TorusGeometry(.255, .022, 8, 28), bellyLine, [0, .83, .69]);
    ball(head, 'forehead', skin, [0, 1.62, .02], [.72, .65, .61]);
    for (const side of [-1, 1]) ball(head, `little-ear-${side}`, skin, [side * .54, 2.02, .01], [.2, .29, .21]);
    ball(head, 'curious-tuft', skin, [.05, 2.23, 0], [.16, .23, .16]).rotation.z = -.35;
    mouth = face(1.68, .61); foot(-.39, .18); foot(.39, .18); arm(-1); arm(1);
  } else if (kind === 'fish') {
    ball(torso, 'fish-body', skin, [-.06, .96, 0], [.84, .74, .55]);
    ball(torso, 'fish-belly', cream, [-.06, .82, .5], [.56, .4, .08]);
    const fin = mat('#95a8b6', {}, 'fabric');
    for (const side of [-1, 1]) {
      foot(side * .36, .03, .34, .17, .35, fin);
    }
    ball(torso, 'near-fin', fin, [-.83, .81, .02], [.18, .35, .13]).rotation.z = -.45;
    ball(head, 'dorsal-fin', fin, [-.07, 1.69, -.02], [.16, .26, .13]).rotation.z = -.35;
    ball(torso, 'tail-neck', fin, [.77, .99, -.1], [.3, .15, .16]);
    ball(torso, 'tail-upper', fin, [1.02, 1.15, -.1], [.21, .4, .16]).rotation.z = -.43;
    ball(torso, 'tail-lower', fin, [1.04, .76, -.1], [.21, .4, .16]).rotation.z = .43;
    mouth = face(1.22, .53, .27);
    for (let i = 0; i < 3; i++) mesh(torso, `gill-${i}`, new THREE.TorusGeometry(.11, .013, 6, 14, Math.PI * .55), fin, [.48 + i * .038, 1 - i * .12, .46]);
  } else if (kind === 'cloud') {
    [[0, 1.05, 0, .77], [-.62, .85, 0, .46], [.65, .84, 0, .47], [-.37, 1.55, 0, .47], [.24, 1.62, 0, .56]].forEach(([x,y,z,r], i) => ball(torso, `cloud-lobe-${i}`, skin, [x,y,z], [r,r,r * .8]));
    foot(-.37, .12, .37, .2, .35); foot(.37, .12, .37, .2, .35);
    mouth = face(1.24, .61, .27); arm(-1, .8, .79); arm(1, .8, .79);
    const rain = mat('#9cbbc8', {}, 'paint');
    ball(head, 'small-teardrop', rain, [.5, 1.02, .51], [.042, .078, .035]);
  } else if (kind === 'clock') {
    mesh(torso, 'clock-case', new THREE.CylinderGeometry(.84, .84, .64, 40), skin, [0, 1.2, 0]).rotation.x = Math.PI / 2;
    mesh(head, 'clock-face', new THREE.CylinderGeometry(.71, .71, .07, 40), cream, [0, 1.2, .355]).rotation.x = Math.PI / 2;
    mesh(head, 'clock-rim', new THREE.TorusGeometry(.745, .065, 10, 36), skin, [0, 1.2, .395]);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      ball(head, `hour-dot-${i}`, ink, [Math.sin(a) * .61, 1.2 + Math.cos(a) * .61, .4], [.02, .028, .014]);
    }
    rod(head, 'hour-hand', skin, [0, 1.46, .44], [-.12, 1.63, .44], .035);
    rod(head, 'minute-hand', skin, [0, 1.46, .445], [.25, 1.64, .445], .025);
    ball(head, 'clock-pin', skin, [0,1.46,.45], [.052,.052,.023]);
    for (const side of [-1, 1]) {
      ball(head, `alarm-bell-${side}`, skin, [side * .59, 2.02, -.02], [.3, .2, .23]).rotation.z = -side * .3;
      foot(side * .43, .03, .26, .2, .34); arm(side, 1.0, .82);
    }
    rod(head, 'bell-bridge', ink, [-.38,2.05,-.08],[.38,2.05,-.08],.027);
    mouth = face(1.2, .422, .25);
  } else if (kind === 'shadow') {
    ball(torso, 'shy-shadow-body', skin, [0, .93, 0], [.65, .84, .52]);
    ball(head, 'leaning-shadow-head', skin, [-.13, 1.68, .03], [.65, .59, .51]);
    ball(head, 'shadow-curl', skin, [-.5, 2.12, 0], [.22, .34, .2]).rotation.z = -.45;
    foot(-.29, .1, .29, .17, .32); foot(.29, .1, .29, .17, .32);
    mouth = face(1.64, .53, .22); arm(-1, .83, .52); arm(1, .83, .52);
    ball(torso, 'little-heart', rosy, [0, .96, .52], [.15,.12,.065]);
  } else {
    mesh(torso, 'rounded-star-body', tokenGeometry('star', 1.05, .63), skin, [0, 1.25, 0]);
    ball(head, 'soft-star-face', skin, [0, 1.23, .33], [.48, .48, .14]);
    mouth = face(1.33, .48, .2);
    for (const side of [-1, 1]) {
      rod(torso, `star-leg-${side}`, skin, [side * .5,.18,0], [side * .5,.6,0], .115);
      foot(side * .5, .04, .24, .15, .31);
    }
    ball(head, 'forehead-glow', glint, [.04, 1.85, .22], [.066,.066,.03]);
  }
  function update(time = 0, dt = .016) {
    phase += Math.max(0, Math.min(dt, .08));
    hop = action === 'hop' && kind !== 'window' ? Math.max(0, Math.sin(phase * 5.8)) * .17 : 0;
    torso.position.y = hop;
    // Breathing alters volume around the feet; no idle vertical translation.
    torso.scale.set(1 + Math.sin(time * 1.9) * .008, 1 + Math.sin(time * 1.9 + .8) * .007, 1);
    head.rotation.z = kind === 'window' ? 0 : Math.sin(time * 1.25) * .018;
    arms.forEach(({ pivot, side }) => { pivot.rotation.z = action === 'wave' ? side * (.5 + Math.sin(time * 6) * .25) : side * Math.sin(time * 1.8) * .035; });
    const blink = Math.sin(time * .69) > .995 ? .09 : 1;
    eyes.forEach(eye => { eye.scale.y = (expression === 'surprised' ? .115 : expression === 'sad' ? .07 : .094) * blink; });
    if (mouth) mouth.scale.y = action === 'talk' ? .75 + Math.sin(time * 12) * .4 : expression === 'surprised' ? 1.2 : .8;
  }
  return {
    group, update,
    grounding: { meshes: supports, getAirborneHeight: () => hop },
    setAction(value) { if (value !== action) phase = 0; action = value; },
    setExpression(value) { expression = value; },
    setColor(value) { if (value) skin.color.set(value); },
    setSize(value) { if (Number.isFinite(value) && value > 0) group.scale.setScalar(value); },
    dispose: s.dispose,
  };
}

/** Story props are independent of disposable world geometry and camera framing. */
export function createWowPresentation(stage) {
  const s = sculpture(), { group, mat, mesh, ball, rod } = s;
  group.name = 'wow-story-props';
  stage.scene.add(group);
  const nodes = {}, fogMaterials = [], tokens = [], fogVolumes = [];
  const brass = mat('#caa564', {}, 'paint'), cream = mat('#f3e7cf'), dark = mat('#666b72', {}, 'ink');
  const teal = mat('#85a9a9', {}, 'paint'), wood = mat('#b99572', {}, 'wood');
  const glow = mat('#fff1b1', { emissive: '#ffe091', emissiveIntensity: .65 }, 'ink');
  const node = name => { const value = new THREE.Group(); value.name = `wow-${name}`; group.add(value); nodes[name] = value; return value; };
  const torch = node('torch');
  mesh(torch, 'torch-body', new THREE.CapsuleGeometry(.145, .52, 6, 18), teal, [0,.43,0]);
  mesh(torch, 'torch-collar', new THREE.CylinderGeometry(.235,.145,.2,22), brass, [0,.78,0]);
  mesh(torch, 'torch-lens', new THREE.CylinderGeometry(.21,.21,.045,22), glow, [0,.897,0]);
  ball(torch,'torch-switch',cream,[0,.49,.15],[.055,.086,.034]);
  const beamMaterial = mat('#fff3b3', { transparent: true, opacity: .04, depthWrite: false, side: THREE.DoubleSide, emissive: '#ffe6a4', emissiveIntensity: .5 });
  const beam = mesh(torch, 'curiosity-light', new THREE.ConeGeometry(.75,1.8,28,1,true), beamMaterial,[0,1.83,0]);
  beam.rotation.z = Math.PI;
  beam.userData.tapIgnore = true;
  beam.castShadow = false; beam.receiveShadow = false;
  const lamp = new THREE.PointLight('#ffe4a1',0,3.3,1.5); lamp.position.set(0,1.2,0); torch.add(lamp);

  const radio = node('radio');
  mesh(radio,'radio-body',new THREE.CapsuleGeometry(.34,.47,8,24),teal,[0,.48,0],[1,1,.59]).rotation.z=Math.PI/2;
  for(const side of [-1,1]) ball(radio,`radio-foot-${side}`,wood,[side*.34,.075,0],[.11,.075,.16]);
  mesh(radio,'radio-speaker',new THREE.CylinderGeometry(.245,.245,.055,24),dark,[-.16,.5,.22]).rotation.x=Math.PI/2;
  for(let i=0;i<5;i++) rod(radio,`speaker-slats-${i}`,cream,[-.33,.37+i*.065,.258],[.015,.37+i*.065,.258],.013);
  ball(radio,'radio-tuning',brass,[.34,.45,.24],[.086,.086,.036]);
  ball(radio,'radio-power',glow,[.34,.64,.225],[.03,.03,.018]);
  rod(radio,'radio-antenna',dark,[.28,.83,-.04],[.45,1.32,-.04],.02);
  ball(radio,'radio-antenna-tip',brass,[.45,1.32,-.04],[.036,.036,.036]);
  const radioHandle=mesh(radio,'radio-handle',new THREE.TorusGeometry(.23,.035,8,24,Math.PI),wood,[0,.81,0]); radioHandle.scale.y=.65;

  const jar=node('jar');
  const glass=mat('#b9d7ca',{transparent:true,opacity:.39,depthWrite:false,roughness:.22},'water');
  const glassEdge=mat('#b7cfc1',{},'paint');
  mesh(jar,'jar-glass',new THREE.CylinderGeometry(.33,.36,.77,28),glass,[0,.44,0]);
  mesh(jar,'jar-floor',new THREE.CylinderGeometry(.36,.36,.085,28),cream,[0,.047,0]);
  mesh(jar,'jar-lid',new THREE.CylinderGeometry(.35,.35,.1,28),wood,[0,.88,0]);
  for(const y of [.08,.815]) mesh(jar,`glass-rim-${y}`,new THREE.TorusGeometry(y>.5?.33:.36,.018,8,28),glassEdge,[0,y,0]).rotation.x=Math.PI/2;
  for(const side of [-1,1]) rod(jar,`glass-edge-${side}`,glassEdge,[side*.35,.08,0],[side*.325,.815,0],.012);
  for(let i=0;i<6;i++) {
    const pigment=mat(COLORS[i],{emissive:COLORS[i],emissiveIntensity:.18},'paint');
    const token=ball(jar,`collected-color-${i}`,pigment,[Math.sin(i*2.4)*.15,.17+i*.103,Math.cos(i*2.4)*.1],[.115,.095,.115]);
    tokens.push(token);
  }

  const door=node('door');
  for(const side of [-1,1]) rod(door,`door-post-${side}`,wood,[side*.62,.07,0],[side*.62,1.36,0],.085);
  mesh(door,'door-arch',new THREE.TorusGeometry(.62,.085,10,32,Math.PI),wood,[0,1.33,0]);
  const doorGlow=mat('#c1c6c3',{emissive:'#edd895',emissiveIntensity:.12},'paint');
  mesh(door,'door-panel',new THREE.CapsuleGeometry(.52,.65,8,24),doorGlow,[0,1.0,-.07],[1,1,.13]);
  rod(door,'door-sill',wood,[-.68,.085,0],[.68,.085,0],.085);
  mesh(door,'keyhole-ring',new THREE.TorusGeometry(.1,.031,8,20),brass,[.34,.9,.065]);
  mesh(door,'keyhole-slot',new THREE.CylinderGeometry(.019,.046,.13,12),dark,[.34,.78,.069]);

  const key=node('key');
  const keyMaterial=mat('#e5c064',{emissive:'#e5c064',emissiveIntensity:.16},'paint');
  let keyHead=mesh(key,'key-shape',tokenGeometry('star',.34),keyMaterial,[0,.82,0]);
  keyHead.userData.shape='star';
  rod(key,'key-shaft',brass,[0,.15,0],[0,.65,0],.049);
  rod(key,'key-tooth-a',brass,[0,.2,0],[.2,.2,0],.045);
  rod(key,'key-tooth-b',brass,[0,.35,0],[.14,.35,0],.045);

  const mist=node('mist');
  mist.userData.tapIgnore = true;
  const mistNight=new THREE.Color('#46566b'), mistDawn=new THREE.Color('#a8b6c0');
  // Real volumes occupy the middle and far ground. The centre-front opening
  // keeps MOMO's face readable, while depth testing lets near objects emerge
  // through the banks. A soft silhouette avoids opaque-looking clay clouds.
  const mistVertex=`
    varying vec3 vMistNormal;
    varying vec3 vMistView;
    varying vec3 vMistLocal;
    #include <fog_pars_vertex>
    void main() {
      vMistNormal=normalize(normalMatrix*normal);
      vMistLocal=position;
      vec4 mvPosition=modelViewMatrix*vec4(position,1.0);
      vMistView=-mvPosition.xyz;
      gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
    }`;
  const mistFragment=`
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uTime;
    varying vec3 vMistNormal;
    varying vec3 vMistView;
    varying vec3 vMistLocal;
    #include <fog_pars_fragment>
    void main() {
      float facing=max(0.0,dot(normalize(vMistNormal),normalize(vMistView)));
      float wisps=.83+.10*sin(vMistLocal.x*4.1+vMistLocal.y*3.2+uTime*.075)
        +.07*sin(vMistLocal.z*5.0-vMistLocal.x*3.3-uTime*.055);
      float alpha=uOpacity*pow(facing,1.15)*wisps;
      gl_FragColor=vec4(uColor,alpha);
      #include <fog_fragment>
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  [
    [0,1.40,-1.25,1.70,1.06,.75,.40],
    [-1.42,1.10,-1.00,1.35,.82,.72,.34],
    [1.50,1.10,-.97,1.50,.85,.76,.36],
    [-.45,2.04,-2.20,1.60,.70,.70,.38],
    [1.75,2.05,-2.05,1.50,.76,.76,.34],
    [-1.32,.58,.35,.78,.49,.59,.24],
    [1.32,.61,.47,.87,.55,.62,.25],
    [.65,.22,-.33,1.65,.35,.70,.26],
  ].forEach(([x,y,z,sx,sy,sz,density],i)=>{
    const fog=s.ownMaterial(new THREE.ShaderMaterial({
      uniforms:{...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),uColor:{value:mistNight.clone()},uOpacity:{value:density},uTime:{value:0}},
      vertexShader:mistVertex,fragmentShader:mistFragment,transparent:true,depthWrite:false,fog:true,
    }));
    fog.userData.density=density;fogMaterials.push(fog);
    const volume=ball(mist,`mist-${i}`,fog,[x,y,z],[sx,sy,sz]);
    volume.castShadow=false;volume.receiveShadow=false;
    volume.userData.basePosition=[x,y,z];fogVolumes.push(volume);
  });
  stage.style?.apply(group);
  let targetProgress=0, progress=0, live=false, lastTime=0, frame=0, initialized=false, lastWorld=null;
  let motionTime=0;
  let state={chapter:1,scene:0,kind:'observe',props:[],colors:[],visual:null,lit:false,progress:0};
  const motions=new Map();
  const rollAxis=new THREE.Vector3(0,0,1), rollRotation=new THREE.Quaternion(), yawRotation=new THREE.Quaternion();
  const registerMotion=(object,name,amount,phase,token=false)=>{
    const diagnostics={factor:1,roll:0,entries:0,entering:false};
    object.userData.wowMotion=diagnostics;
    motions.set(object,{
      name,amount,phase,token,position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone(),
      seen:false,shown:false,age:Infinity,diagnostics,
    });
  };
  [['torch',.034],['radio',.023],['jar',.021],['door',.008],['key',.047]].forEach(([name,amount],i)=>registerMotion(nodes[name],name,amount,i*1.31));
  tokens.forEach((token,i)=>registerMotion(token,`color-${i}`,.028,i*1.19,true));
  const unregisterTaps = [];
  [['torch','stretch'],['radio','wiggle'],['jar','puff'],['door','twist'],['key','hop']].forEach(([name,mode]) => {
    const unregister = stage.registerTapObject?.(nodes[name], { name: `wow-${name}`, mode });
    if (unregister) unregisterTaps.push(unregister);
  });
  tokens.forEach((token,i) => {
    const unregister = stage.registerTapObject?.(token, { name: `wow-color-${i}`, mode: ['hop','puff','twist'][i%3] });
    if (unregister) unregisterTaps.push(unregister);
  });
  const anchor=(name,x,z,y=0,scale=1)=>{
    const value=nodes[name];
    value.position.copy(stage.world?.surfacePoint?.(x,z,y)||new THREE.Vector3(x,y,z));
    value.quaternion.setFromUnitVectors(UP,stage.world?.surfaceNormal?.(x,z)||UP);
    value.scale.setScalar(scale);
    const motion=motions.get(value);
    if(motion){motion.position.copy(value.position);motion.quaternion.copy(value.quaternion);motion.scale.copy(value.scale);}
  };
  function reveal(object,visible,seed){
    const motion=motions.get(object);
    object.visible=visible;
    if(seed){
      // A reload restores the saved display directly; replaying an already
      // collected item would make it look newly earned all over again.
      motion.seen=visible;motion.age=Infinity;
    }else if(visible&&!motion.shown&&!motion.seen){
      motion.seen=true;motion.age=stage.reduced?Infinity:0;
      if(!stage.reduced)motion.diagnostics.entries++;
    }
    motion.shown=visible;
  }
  function moveProps(dt=0){
    if(!stage.reduced)motionTime+=dt;
    for(const [object,motion] of motions){
      if(!motion.shown)continue;
      if(stage.reduced)motion.age=Infinity;
      else if(Number.isFinite(motion.age))motion.age+=dt;
      const t=Math.min(1,motion.age/.65), u=t-1;
      // Ease-out with a single restrained overshoot. Every prop's local
      // origin is its foot, so growing and rocking keep that foot anchored.
      const factor=stage.reduced||t>=1?1:Math.max(.001,1+2.4*u*u*u+1.4*u*u);
      const roll=stage.reduced?0:Math.sin(motionTime*.77+motion.phase)*motion.amount;
      const yaw=!stage.reduced&&motion.name==='key'?Math.sin(motionTime*.63+motion.phase)*.14:0;
      object.position.copy(motion.position);
      if(motion.token&&!stage.reduced)object.position.x+=Math.sin(motionTime*.64+motion.phase)*.009;
      object.scale.copy(motion.scale).multiplyScalar(factor);
      object.quaternion.copy(motion.quaternion)
        .multiply(yawRotation.setFromAxisAngle(UP,yaw))
        .multiply(rollRotation.setFromAxisAngle(rollAxis,roll));
      Object.assign(motion.diagnostics,{factor,roll,entering:t<1});
    }
  }
  function paintLight() {
    const clarity=THREE.MathUtils.smoothstep(progress,0,1);
    const remaining=Math.pow(1-clarity,1.15);
    fogMaterials.forEach(material=>{
      material.uniforms.uOpacity.value=material.userData.density*remaining;
      material.uniforms.uColor.value.copy(mistNight).lerp(mistDawn,clarity*.8);
    });
    fogVolumes.forEach(volume=>{
      const [x,y,z]=volume.userData.basePosition;
      volume.position.set(x+Math.sign(x)*clarity*.32,y+clarity*.12,z);
    });
    const torchOn=torch.visible&&(state.lit||progress>0||state.chapter>1);
    // Finding the torch opens a small warm pool. Only conversation progress
    // disperses the chapter's fog and gradually extends that pool of light.
    beamMaterial.opacity=torchOn ? .075+.11*clarity : 0;
    glow.emissiveIntensity=.2+(torchOn?.4:0)+clarity*.65;
    lamp.intensity=torchOn?.24+clarity*.76:0;
    lamp.distance=2.1+clarity*1.6;
    doorGlow.emissiveIntensity=state.visual?.shape?.length ? .48 : .1;
    doorGlow.color.set(state.visual ? '#f5e0b1' : '#c1c6c3');
    group.userData.progress=progress;
    group.userData.mistDensity=remaining;
  }
  function animate(now) {
    if(!live)return;
    const elapsed=(now-lastTime)/1000||.016;
    const dt=Math.min(.06,elapsed), motionDt=Math.min(.2,elapsed);lastTime=now;
    if(!document.hidden){
      progress=THREE.MathUtils.lerp(progress,targetProgress,1-Math.exp(-dt*2.4));
      paintLight();
      if(!stage.reduced)fogMaterials.forEach(material=>{material.uniforms.uTime.value=now/1000;});
      moveProps(motionDt);
    }
    frame=requestAnimationFrame(animate);
  }
  function set(next={}) {
    const chapterChanged=next.chapter!==undefined&&next.chapter!==state.chapter;
    const seedMotion=!initialized||chapterChanged||lastWorld!==stage.world||next.immediate===true;
    state={...state,...next,...(chapterChanged&&next.progress===undefined?{progress:0}:{})};
    if(group.parent!==stage.scene)stage.scene.add(group);
    const props=new Set(state.props||[]);
    reveal(torch,props.has('torch'),seedMotion);reveal(radio,props.has('radio'),seedMotion);reveal(jar,props.has('jar'),seedMotion);
    reveal(door,state.kind==='create'||Boolean(state.visual)||(state.chapter===1&&state.scene>=6),seedMotion);
    reveal(key,Boolean(state.visual),seedMotion);
    const requested=Number(state.progress);
    targetProgress=Number.isFinite(requested)?THREE.MathUtils.clamp(requested,0,1):0;
    // A newly mounted world starts at its saved chapter progress immediately.
    // This also prevents one bright frame from the preceding chapter, while
    // accepted answers within the same world still produce a gradual reveal.
    if(!initialized||chapterChanged||lastWorld!==stage.world||stage.reduced)progress=targetProgress;
    initialized=true;lastWorld=stage.world;
    tokens.forEach((token,i)=>{reveal(token,i<(state.colors?.length||0),seedMotion);});
    if(state.visual){
      const shape=['star','moon','leaf','heart','cloud','fish'].includes(state.visual.shape)?state.visual.shape:'star';
      if(keyHead.userData.shape!==shape){
        keyHead.removeFromParent();s.releaseGeometry(keyHead.geometry);
        keyHead=mesh(key,'key-shape',tokenGeometry(shape,.34),keyMaterial,[0,.82,0]);keyHead.userData.shape=shape;
      }
      const color=typeof state.visual.color==='string'?state.visual.color:COLORS[Math.max(0,state.chapter-1)];
      keyMaterial.color.set(color);keyMaterial.emissive.set(color);
    }
    // The existing story camera frames its first actor, whose spot is offset
    // from the planet's centre. Keep the companion props within that same
    // mobile composition instead of stranding them beyond the right edge.
    const spot=stage.world?.characterSpots?.[0]||{x:-1.45,z:.35};
    anchor('torch',spot.x-.4,spot.z+1.6,0,.67);
    anchor('radio',spot.x+.65,spot.z+1.5,0,.66);
    anchor('jar',spot.x+1.45,spot.z+1.3,0,.76);
    anchor('door',spot.x+1.1,spot.z-.65,0,.7);
    anchor('key',spot.x+.95,spot.z+.6,.03,.75);
    anchor('mist',spot.x,spot.z,0,1);
    group.userData.state={chapter:state.chapter,scene:state.scene,props:[...props],colors:state.colors?.length||0,key:state.visual?.shape||null,lit:!!state.lit,progress:targetProgress};
    paintLight();
    moveProps();
    if(!live){live=true;frame=requestAnimationFrame(animate);}
  }
  return {set,dispose(){live=false;cancelAnimationFrame(frame);unregisterTaps.forEach(unregister=>unregister());s.dispose();}};
}
