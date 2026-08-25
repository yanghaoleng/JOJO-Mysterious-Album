import * as THREE from 'three';
import { setRender, U } from './part.js';
import { newRecipe, ensureParams, buildCharacter } from './rig.js';
import { createAnimator } from './anim.js';
import { buildGameInspiration, loadChildProfile } from './child-profile.js';

setRender({ u: 176, frames: 2 });
THREE.ColorManagement.enabled = false;

const $ = id => document.getElementById(id);
const panels = [...document.querySelectorAll('.story-panel')];
const layer = $('choice-layer');
const guide = $('guide');
const guideCopy = $('guide-copy');
const guideAction = $('guide-action');
const gameHud = $('game-hud');
const tapHint = $('tap-hint');
const seedDots = [...document.querySelectorAll('.seed-dot')];
let childProfile = loadChildProfile();
let gameInspiration = buildGameInspiration(childProfile);

function refreshGameInspiration() {
  childProfile = loadChildProfile();
  gameInspiration = buildGameInspiration(childProfile);
  if (window.__adventure) Object.assign(window.__adventure, { childProfile, gameInspiration });
}

const profile = {
  trait: null,
  traitLabel: '',
  traitLine: '',
  gateLine: '',
  heart: null,
  name: '',
  customIdea: '',
};

const game = {
  phase: 'welcome',
  collected: 0,
  movementEnabled: false,
  target: null,
  moving: false,
  gateReady: false,
  ending: false,
  formed: 0,
};

const TRAITS = {
  transparent: {
    label: '变透明',
    line: '它害怕时会变成一小团透明的雾。',
    gate: '让身体变透明，从雾门的缝隙里轻轻穿过去。',
  },
  bounce: {
    label: '鼓成小球',
    line: '它害怕时会鼓成一颗有弹性的小球。',
    gate: '鼓成小球，借着勇气弹过雾门前的裂缝。',
  },
  glow: {
    label: '发出暖光',
    line: '它害怕时，身体反而会亮起暖暖的光。',
    gate: '把紧张变成暖光，照出雾门上真正的入口。',
  },
};

const HEARTS = {
  flower: '它会先送出一朵小花。',
  stay: '它会安静坐在朋友旁边。',
  joke: '它会讲一个奇怪的笑话。',
};

const VOICE = {
  welcome: 'assets/voice/01-welcome.mp3',
  trait: 'assets/voice/02-trait.mp3',
  heart: 'assets/voice/03-heart.mp3',
  name: 'assets/voice/04-name.mp3',
  world: 'assets/voice/05-world.mp3',
  play: 'assets/voice/06-play.mp3',
  seeds: 'assets/voice/07-seeds.mp3',
  gate: 'assets/voice/08-gate.mp3',
  brave: 'assets/voice/09-brave.mp3',
  complete: 'assets/voice/10-complete.mp3',
};

class VoiceGuide {
  constructor() {
    this.enabled = true;
    this.current = null;
  }

  stop() {
    if (this.current) {
      this.current.pause();
      this.current.currentTime = 0;
      this.current = null;
    }
  }

  speak(key) {
    this.stop();
    if (!this.enabled) return;
    const src = VOICE[key];
    if (!src) return;
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = .92;
    const keepVisualOnly = () => {
      if (this.current === audio) this.current = null;
      document.documentElement.dataset.storyAudioSource = 'visual';
    };
    document.documentElement.dataset.storyAudioSource = 'cached-fish';
    audio.addEventListener('error', keepVisualOnly, { once: true });
    audio.addEventListener('ended', () => { if (this.current === audio) this.current = null; }, { once: true });
    this.current = audio;
    audio.play().catch(keepVisualOnly);
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stop();
    return this.enabled;
  }
}

class GameSound {
  constructor() { this.ctx = null; }
  ready() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  tone(freq, at = 0, duration = .16, volume = .055, type = 'sine') {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(.001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + .02);
    g.gain.exponentialRampToValueAtTime(.001, t + duration);
    o.connect(g).connect(this.ctx.destination);
    o.start(t); o.stop(t + duration + .03);
  }
  tap() { this.ready(); this.tone(330, 0, .08, .028, 'triangle'); }
  choose() { this.ready(); this.tone(392, 0, .12); this.tone(523, .08, .16); }
  collect(n) { this.ready(); this.tone([523, 659, 784][n - 1] || 784, 0, .22); this.tone(1046, .1, .25, .04); }
  reveal() { this.ready(); [392, 523, 659, 784].forEach((f, i) => this.tone(f, i * .11, .28, .04)); }
}

const voice = new VoiceGuide();
const sfx = new GameSound();

function showPanel(id) {
  for (const panel of panels) panel.hidden = panel.id !== id;
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

let toastTimer = 0;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function say(text, action = null) {
  guideCopy.textContent = text;
  guide.classList.add('show');
  if (action) {
    guideAction.textContent = action.label;
    guideAction.hidden = false;
    guideAction.onclick = action.onClick;
  } else {
    guideAction.hidden = true;
    guideAction.onclick = null;
  }
}

function hideGuide() {
  guide.classList.remove('show');
  guideAction.hidden = true;
  guideAction.onclick = null;
}

// ------------------------------------------------------------------
// The paper world
// ------------------------------------------------------------------
const stage = $('stage');
const displayPixelRatio = Math.min(2.5, Math.max(1.5, devicePixelRatio || 1));
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(displayPixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0xeee6d2, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);
renderer.domElement.style.imageRendering = 'auto';
document.documentElement.dataset.storyTextureScale = String(U);
document.documentElement.dataset.storyPixelRatio = String(displayPixelRatio);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeee6d2);
scene.fog = new THREE.Fog(0xeee6d2, 15, 30);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 80);
const cameraTarget = new THREE.Vector3(0, .2, 0);
camera.position.set(8.6, 11.8, 10.4);
camera.lookAt(cameraTarget);

const world = new THREE.Group();
scene.add(world);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const rayHit = new THREE.Vector3();

function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  draw(ctx, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function wobbleLoop(cx, cy, rx, ry, n = 40, phase = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2;
    const j = 1 + Math.sin(a * 3 + phase) * .035 + Math.sin(a * 7 + 1.7) * .018;
    pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
  }
  return pts;
}

function strokeLoop(ctx, pts, close = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

function makeIsland() {
  const texture = canvasTexture(1200, 900, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const island = wobbleLoop(w / 2, h / 2, w * .46, h * .42, 70, .4);
    strokeLoop(ctx, island);
    ctx.fillStyle = '#d7ddc3'; ctx.fill();
    ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(52,55,45,.62)'; ctx.stroke();
    ctx.save(); strokeLoop(ctx, island); ctx.clip();
    for (let i = 0; i < 430; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      const len = 3 + Math.random() * 12;
      ctx.strokeStyle = `rgba(65,78,56,${.07 + Math.random() * .13})`;
      ctx.lineWidth = .8 + Math.random() * 1.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + len * .4, y - 4, x + len, y + Math.random() * 4 - 2); ctx.stroke();
    }
    // A path whose strokes never quite agree.
    ctx.lineCap = 'round';
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.moveTo(w * .18, h * (.63 + j * .006));
      ctx.bezierCurveTo(w * .38, h * (.48 - j * .005), w * .62, h * (.57 + j * .004), w * .83, h * (.39 - j * .003));
      ctx.strokeStyle = `rgba(108,94,69,${.14 - j * .025})`; ctx.lineWidth = 11 - j * 2; ctx.stroke();
    }
    ctx.restore();
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(15.4, 11.6),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -.04;
  mesh.renderOrder = 0;
  world.add(mesh);
  return mesh;
}

function makePond() {
  const texture = canvasTexture(520, 360, (ctx, w, h) => {
    const pts = wobbleLoop(w / 2, h / 2, w * .44, h * .39, 50, 1.4);
    strokeLoop(ctx, pts); ctx.fillStyle = 'rgba(137,178,177,.82)'; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(53,76,73,.62)'; ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const y = h * (.28 + i * .05);
      ctx.beginPath(); ctx.moveTo(w * (.2 + Math.random() * .1), y);
      ctx.bezierCurveTo(w * .4, y - 8, w * .6, y + 8, w * (.78 - Math.random() * .08), y);
      ctx.strokeStyle = `rgba(245,240,220,${.18 + Math.random() * .2})`; ctx.lineWidth = 2; ctx.stroke();
    }
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.4), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = -.18;
  mesh.position.set(-3.25, .01, 1.95); mesh.renderOrder = 1;
  world.add(mesh);
}

function makeTree(x, z, scale = 1, tint = '#8ca57f') {
  const texture = canvasTexture(360, 520, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const trunk = [[w*.45,h*.88],[w*.47,h*.46],[w*.41,h*.24],[w*.52,h*.47],[w*.57,h*.89]];
    strokeLoop(ctx, trunk);
    ctx.fillStyle = '#8b7356'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(48,42,34,.75)'; ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const pts = wobbleLoop(w * (.48 + (i%2 ? .1 : -.08)), h * (.24 + i * .06), w * (.26 - i*.018), h * (.19 - i*.012), 34, i * 1.3);
      strokeLoop(ctx, pts); ctx.fillStyle = tint; ctx.globalAlpha = .68; ctx.fill();
      ctx.globalAlpha = 1; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(48,55,42,.63)'; ctx.stroke();
    }
    for (let i = 0; i < 34; i++) {
      const xx = w * (.22 + Math.random()*.56), yy = h * (.08 + Math.random()*.38);
      ctx.fillStyle = `rgba(246,239,217,${.08 + Math.random()*.22})`;
      ctx.fillRect(xx, yy, 2 + Math.random()*3, 1 + Math.random()*2);
    }
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2 * scale, 3.2 * scale), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, alphaTest: .01 }));
  mesh.position.set(x, 1.5 * scale, z);
  mesh.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z);
  mesh.renderOrder = 20 + Math.round((6 - z) * 2);
  world.add(mesh);
  return mesh;
}

function makeFlower(x, z, hue = '#d47c6b') {
  const texture = canvasTexture(180, 230, (ctx, w, h) => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(44,55,42,.76)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(w*.5,h*.88); ctx.quadraticCurveTo(w*.44,h*.58,w*.52,h*.32); ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const a = i/7*Math.PI*2;
      const pts = wobbleLoop(w*.5+Math.cos(a)*w*.15,h*.27+Math.sin(a)*h*.11,w*.11,h*.09,16,a);
      strokeLoop(ctx,pts); ctx.fillStyle=hue; ctx.globalAlpha=.72; ctx.fill(); ctx.globalAlpha=1;
      ctx.lineWidth=2.2; ctx.strokeStyle='rgba(65,47,42,.55)'; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(w*.5,h*.27,w*.07,0,Math.PI*2); ctx.fillStyle='#d7b75e'; ctx.fill();
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(.58,.75), new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
  mesh.position.set(x,.37,z); mesh.rotation.y=Math.atan2(camera.position.x-x,camera.position.z-z); mesh.renderOrder=30;
  world.add(mesh); return mesh;
}

function makeLantern() {
  const group = new THREE.Group();
  const texture = canvasTexture(360, 480, (ctx,w,h) => {
    ctx.lineCap='round';ctx.lineJoin='round';
    const body=wobbleLoop(w*.5,h*.49,w*.22,h*.27,36,.5);strokeLoop(ctx,body);
    ctx.fillStyle='rgba(237,194,94,.58)';ctx.fill();ctx.lineWidth=6;ctx.strokeStyle='rgba(50,44,36,.78)';ctx.stroke();
    ctx.strokeStyle='rgba(50,44,36,.72)';ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(w*.37,h*.29);ctx.quadraticCurveTo(w*.5,h*.08,w*.63,h*.29);ctx.stroke();
    ctx.beginPath();ctx.moveTo(w*.29,h*.78);ctx.lineTo(w*.71,h*.78);ctx.stroke();
    ctx.font='700 82px KaiTi, serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgba(47,83,73,.88)';ctx.fillText('雾',w*.5,h*.5);
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.45,1.9),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
  mesh.position.y=.92;mesh.rotation.y=Math.atan2(camera.position.x-.3,camera.position.z+.2);mesh.renderOrder=42;group.add(mesh);
  const glowMat=new THREE.MeshBasicMaterial({map:makeGlowTexture('#e8bd63'),transparent:true,depthWrite:false,opacity:.08,blending:THREE.AdditiveBlending});
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(4.1,4.1),glowMat);glow.rotation.x=-Math.PI/2;glow.position.y=.04;glow.renderOrder=2;group.add(glow);
  group.position.set(.25,0,.1);world.add(group);return {group,glow,mesh,lit:0};
}

function makeGlowTexture(color='#f0c96c') {
  return canvasTexture(256,256,(ctx,w,h)=>{
    const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,color);g.addColorStop(.25,'rgba(240,201,108,.46)');g.addColorStop(1,'rgba(240,201,108,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  });
}

function makeSeed(x,z,index) {
  const group=new THREE.Group();
  const tex=canvasTexture(220,260,(ctx,w,h)=>{
    ctx.translate(w/2,h/2);ctx.rotate((index-2)*.11);
    const pts=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5;const r=i%2===0?w*.27:w*.11;pts.push([Math.cos(a)*r,Math.sin(a)*r]);}
    strokeLoop(ctx,pts);ctx.fillStyle='rgba(235,189,82,.84)';ctx.fill();ctx.lineWidth=5;ctx.strokeStyle='rgba(68,56,39,.8)';ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,w*.045,0,Math.PI*2);ctx.fillStyle='#f8edc9';ctx.fill();
  });
  const star=new THREE.Mesh(new THREE.PlaneGeometry(.76,.9),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));
  star.position.y=.62;star.rotation.y=Math.atan2(camera.position.x-x,camera.position.z-z);star.renderOrder=60;group.add(star);
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),new THREE.MeshBasicMaterial({map:makeGlowTexture(),transparent:true,depthWrite:false,opacity:.42,blending:THREE.AdditiveBlending}));
  glow.rotation.x=-Math.PI/2;glow.position.y=.03;glow.renderOrder=3;group.add(glow);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.5,.56,36),new THREE.MeshBasicMaterial({color:0x6f8b73,transparent:true,opacity:.34,side:THREE.DoubleSide,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.025;ring.renderOrder=4;group.add(ring);
  group.position.set(x,0,z);group.userData={kind:'seed',index,collected:false,star,glow,ring};world.add(group);return group;
}

function makeFog(x,z,scale=1,phase=0) {
  const tex=canvasTexture(420,220,(ctx,w,h)=>{
    ctx.clearRect(0,0,w,h);
    for(let i=0;i<5;i++){
      const pts=wobbleLoop(w*(.2+i*.15),h*(.54+Math.sin(i)*.05),w*.19,h*.24,26,i);
      strokeLoop(ctx,pts);ctx.fillStyle=`rgba(247,242,226,${.28+i*.045})`;ctx.fill();
    }
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(3.2*scale,1.65*scale),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:.9}));
  mesh.position.set(x,.7*scale,z);mesh.rotation.y=Math.atan2(camera.position.x-x,camera.position.z-z);mesh.renderOrder=70;mesh.userData={baseX:x,baseY:.7*scale,phase};world.add(mesh);return mesh;
}

function makeGate() {
  const group=new THREE.Group();
  const stone=new THREE.MeshBasicMaterial({color:0xb4aa93,transparent:true,opacity:.98,depthWrite:false});
  const edge=new THREE.MeshBasicMaterial({color:0x5d554a,transparent:true,opacity:.78,depthWrite:false});
  const left=new THREE.Mesh(new THREE.PlaneGeometry(.65,2.75),stone);left.position.set(-.82,1.35,0);group.add(left);
  const right=new THREE.Mesh(new THREE.PlaneGeometry(.65,2.75),stone);right.position.set(.82,1.35,0);group.add(right);
  const top=new THREE.Mesh(new THREE.PlaneGeometry(2.25,.72),stone);top.position.set(0,2.55,0);group.add(top);
  const wordTex=canvasTexture(220,220,(ctx,w,h)=>{ctx.font='800 150px KaiTi, serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#3e564c';ctx.fillText('勇',w/2,h/2+7);});
  const word=new THREE.Mesh(new THREE.PlaneGeometry(.7,.7),new THREE.MeshBasicMaterial({map:wordTex,transparent:true,depthWrite:false}));word.position.set(0,2.55,.02);group.add(word);
  const crack=new THREE.Mesh(new THREE.PlaneGeometry(.06,2.1),edge);crack.position.set(0,1.08,.01);crack.rotation.z=.04;group.add(crack);
  group.position.set(4.75,0,-2.35);group.rotation.y=Math.atan2(camera.position.x-group.position.x,camera.position.z-group.position.z);group.visible=false;group.userData={left,right,top,word,crack,opened:0};world.add(group);return group;
}

function makeTargetRipple() {
  const mesh=new THREE.Mesh(new THREE.RingGeometry(.16,.22,34),new THREE.MeshBasicMaterial({color:0x496f62,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
  mesh.rotation.x=-Math.PI/2;mesh.position.y=.035;mesh.renderOrder=7;world.add(mesh);return mesh;
}

function buildCreature() {
  const recipe=newRecipe(7712093);
  recipe.species='cat';recipe.base='quad';recipe.media='watercolor';recipe.color='color';
  ensureParams(recipe);
  // Keep this first creature legible and friendly while every detail
  // remains part of Kindergrimm's recipe system.
  recipe.parts.eyes.params.type='sparkle';
  recipe.parts.eyes.params.scale=Math.max(1.1,recipe.parts.eyes.params.scale||1);
  recipe.parts.extras.params.tears=false;
  recipe.parts.extras.params.accidents=false;
  recipe.parts.extras.params.smudge=false;
  recipe.parts.extras.params.eraser=false;
  recipe.parts.extras.params.blush=true;
  recipe.parts.hair.params.style='bald';
  const face=buildCharacter(recipe);
  const holder=new THREE.Group();
  face.group.position.y=face.F.B.floorY/U;
  holder.add(face.group);
  const scale=(2.15/1.4)*(.58/(face.F.s/U));
  holder.scale.setScalar(scale);
  holder.position.set(-4.25,0,2.75);
  holder.rotation.y=Math.atan2(camera.position.x-holder.position.x,camera.position.z-holder.position.z);
  world.add(holder);

  const shadowTex=canvasTexture(260,150,(ctx,w,h)=>{const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w*.44);g.addColorStop(0,'rgba(54,47,38,.32)');g.addColorStop(1,'rgba(54,47,38,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);});
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.7,.92),new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.set(holder.position.x,.03,holder.position.z);shadow.renderOrder=6;world.add(shadow);

  const aura=new THREE.Mesh(new THREE.PlaneGeometry(2.7,2.7),new THREE.MeshBasicMaterial({map:makeGlowTexture('#f0c96c'),transparent:true,depthWrite:false,opacity:0,blending:THREE.AdditiveBlending}));
  aura.rotation.x=-Math.PI/2;aura.position.set(holder.position.x,.025,holder.position.z);aura.renderOrder=5;world.add(aura);

  const options={boil:true,blink:true,gaze:true,sway:true,breath:true,talk:false,amp:.95,phase:.4};
  const animator=createAnimator(()=>face,options);
  animator.setPose('idle');
  return {recipe,face,holder,shadow,aura,options,animator,baseScale:scale,traitPulse:0,traitMode:null};
}

makeIsland();
makePond();
[
  [-5.5,-2.9,1.1,'#829b76'],[-5.8,1.4,.9,'#98aa80'],[-3.8,-4.1,.85,'#75927b'],
  [5.4,2.8,1.05,'#849b73'],[5.9,-.1,.83,'#a1ad7e'],[3.4,4.2,.9,'#789780'],
  [-.8,4.5,.72,'#91a878'],[1.7,-4.5,.78,'#829b76'],
].forEach(t=>makeTree(...t));
[
  [-2.4,-1.9,'#d47c6b'],[-1.75,-2.35,'#9a7597'],[2.5,1.6,'#d47c6b'],[3.1,1.25,'#849ab3'],[-4.1,.1,'#d2a65d'],[1.25,3.4,'#d47c6b'],
].forEach(f=>makeFlower(...f));

const lantern=makeLantern();
const seeds=[makeSeed(-3.7,-.35,1),makeSeed(1.85,2.8,2),makeSeed(2.45,-2.45,3)];
const fogs=[makeFog(3.6,-1.25,1.1,.2),makeFog(4.5,-2.1,1.25,1.4),makeFog(5.2,-2.7,.9,2.6),makeFog(3.9,-3.05,.85,3.5)];
const gate=makeGate();
const targetRipple=makeTargetRipple();
const creature=buildCreature();

function applyTraitPreview(trait, hold=false) {
  creature.traitMode=trait;
  creature.traitPulse=hold?2.8:1.7;
  if(trait==='transparent') creature.face.entries.forEach(e=>{e.part.matl.opacity=.35;});
  if(trait==='glow') creature.aura.material.opacity=.6;
  if(trait==='bounce') creature.animator.setPose('run',{speed:1.15});
}

function resetTraitVisual() {
  creature.face.entries.forEach(e=>{e.part.matl.opacity=1;});
  creature.aura.material.opacity=profile.trait==='glow'?.16:0;
  creature.holder.scale.setScalar(creature.baseScale);
  creature.animator.setPose(game.moving?'walk':'idle',{speed:1});
}

function updateCamera() {
  const aspect=innerWidth/innerHeight;
  let halfH=6.6;
  if(aspect<.78) halfH=8.5;
  else if(aspect>2.05) halfH=5.2;
  camera.left=-halfH*aspect;camera.right=halfH*aspect;camera.top=halfH;camera.bottom=-halfH;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(displayPixelRatio);
}
updateCamera();
addEventListener('resize',updateCamera,{passive:true});

function setMoveTarget(x,z,{auto=false}={}) {
  if((!game.movementEnabled&&!auto)||game.ending)return;
  const px=Math.max(-5.2,Math.min(5.2,x));
  const pz=Math.max(-3.8,Math.min(3.8,z));
  game.target=new THREE.Vector3(px,0,pz);game.moving=true;
  creature.animator.setPose('walk',{speed:1.15});
  targetRipple.position.set(px,.035,pz);targetRipple.scale.setScalar(.6);targetRipple.material.opacity=.6;
  if(!auto){sfx.tap();tapHint.classList.remove('show');}
}

renderer.domElement.addEventListener('pointerdown',e=>{
  if(!game.movementEnabled||game.ending)return;
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.x=((e.clientX-rect.left)/rect.width)*2-1;
  pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  if(raycaster.ray.intersectPlane(floorPlane,rayHit))setMoveTarget(rayHit.x,rayHit.z);
});

addEventListener('keydown',e=>{
  if(!game.movementEnabled)return;
  const step=1.15;let dx=0,dz=0;
  if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')dx=-step;
  if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')dx=step;
  if(e.key==='ArrowUp'||e.key.toLowerCase()==='w')dz=-step;
  if(e.key==='ArrowDown'||e.key.toLowerCase()==='s')dz=step;
  if(dx||dz){e.preventDefault();setMoveTarget(creature.holder.position.x+dx,creature.holder.position.z+dz);}
});

function collectSeed(seed) {
  if(seed.userData.collected||game.phase!=='play')return;
  seed.userData.collected=true;game.collected++;
  seedDots[game.collected-1]?.classList.add('got');
  sfx.collect(game.collected);
  seed.userData.collectAt=clock.elapsedTime;
  if(game.collected===1){say(`找到第 1 颗。灯里还空着两个小位置。${gameInspiration.collectHint}`);}
  else if(game.collected===2){say('现在有 2 颗了。花园另一边还有最后一点光。');}
  else {
    say('最先找到的 1 颗，加上后来找到的 2 颗，正好是 3 颗。雾灯要亮了！');
    voice.speak('seeds','一颗，加上后来找到的两颗，正好是三颗。雾灯要亮了！');
    startGateSequence();
  }
}

async function startGateSequence() {
  game.phase='lantern';game.movementEnabled=false;tapHint.classList.remove('show');
  await delay(900);sfx.reveal();lantern.lit=1;
  fogs.forEach((f,i)=>{f.userData.fadeAt=clock.elapsedTime+i*.08;});
  await delay(900);gate.visible=true;gate.scale.set(.88,.88,.88);
  say('雾后面真的有一扇门。上面写着一个字：勇。');
  voice.speak('gate','雾后面真的有一扇门。上面写着一个字，勇。');
  await delay(1100);
  game.phase='gate-approach';
  setMoveTarget(3.25,-1.8,{auto:true});
}

function showGateChallenge() {
  game.phase='gate';game.moving=false;creature.animator.setPose('idle');creature.animator.setFace('scared');
  const action=`用“${profile.traitLabel}”试试`;
  const gateUse=profile.gateLine||TRAITS[profile.trait]?.gate||profile.traitLine;
  const text=`${profile.name}有一点害怕。勇敢不是一点都不怕，是害怕的时候，仍然愿意试一试。${gateUse}${gameInspiration.gateEncouragement}`;
  say(text,{label:action,onClick:runGateAbility});
  voice.speak('brave','勇敢不是一点都不怕，是害怕的时候，仍然愿意试一试。');
}

async function runGateAbility() {
  guideAction.disabled=true;creature.animator.setFace('idle');sfx.reveal();
  applyTraitPreview(profile.trait,true);
  await delay(1050);
  gate.userData.opened=1;
  await delay(650);
  hideGuide();
  game.phase='through-gate';
  setMoveTarget(5.05,-2.45,{auto:true});
  await delay(1700);
  game.moving=false;creature.animator.setPose('idle');
  await finishAdventure();
}

async function finishAdventure() {
  if(game.ending)return;
  game.ending=true;game.phase='complete';gameHud.classList.remove('show');tapHint.classList.remove('show');
  resetTraitVisual();
  for(let i=0;i<18;i++)makeCelebrationParticle(i);
  voice.speak('complete','第一张图鉴完成了。你创造的本领，真的帮助它走过了自己的世界。');
  await delay(1000);
  $('ending-name').textContent=profile.name;
  const traitBody=profile.traitLine.replace(/^(?:以)?它害怕时[，,：:\s]*/,'').replace(/。+$/,'');
  $('ending-story').textContent=`${profile.name}害怕时，${traitBody}。${HEARTS[profile.heart]}今天，它用这个本领穿过雾门，还把三颗萤火种送回了灯里。${gameInspiration.endingLine}`;
  $('ending').classList.add('show');
}

const confetti=[];
function makeCelebrationParticle(i){
  const tex=canvasTexture(64,64,(ctx,w,h)=>{ctx.translate(w/2,h/2);ctx.rotate(i*.7);ctx.fillStyle=i%2?'#d47c6b':'#d2a65d';ctx.globalAlpha=.8;ctx.fillRect(-8,-20,16,40);});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.22,.22),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));
  mesh.position.set(4.6+(Math.random()-.5)*2.2,1+Math.random()*2.6,-2.2+(Math.random()-.5)*1.6);mesh.rotation.y=Math.atan2(camera.position.x-mesh.position.x,camera.position.z-mesh.position.z);mesh.renderOrder=100;mesh.userData={vy:.5+Math.random()*.5,vx:(Math.random()-.5)*.3,phase:Math.random()*6};world.add(mesh);confetti.push(mesh);
}

function tick() {
  requestAnimationFrame(tick);
  const dt=Math.min(.04,clock.getDelta());
  const t=clock.elapsedTime;
  if(document.body.dataset.mode==='debug')return;
  creature.animator.update(t,dt);

  for(const seed of seeds){
    if(seed.userData.collected){
      const p=Math.min(1,(t-seed.userData.collectAt)/.5);seed.scale.setScalar(Math.max(.001,1-p));seed.position.y=Math.sin(p*Math.PI)*.9;
      if(p>=1)seed.visible=false;
    }else{
      const bob=Math.sin(t*2.2+seed.userData.index)*.08;seed.userData.star.position.y=.62+bob;
      const pulse=1+Math.sin(t*2.8+seed.userData.index)*.12;seed.userData.glow.scale.setScalar(pulse);seed.userData.ring.material.opacity=.22+Math.sin(t*2.4+seed.userData.index)*.1;
    }
  }

  if(lantern.lit){
    lantern.glow.material.opacity+=(.72-lantern.glow.material.opacity)*Math.min(1,dt*3);
    lantern.glow.scale.setScalar(1+Math.sin(t*2.2)*.06);
  }
  for(const fog of fogs){
    fog.position.x=fog.userData.baseX+Math.sin(t*.42+fog.userData.phase)*.2;
    fog.position.y=fog.userData.baseY+Math.cos(t*.5+fog.userData.phase)*.05;
    if(fog.userData.fadeAt!=null){const p=Math.min(1,(t-fog.userData.fadeAt)/1.25);fog.material.opacity=.9*(1-p*.86);fog.position.x+=p*.75;}
  }

  if(gate.visible){
    gate.scale.lerp(new THREE.Vector3(1,1,1),Math.min(1,dt*4));
    if(gate.userData.opened){
      gate.userData.left.position.x+=( -1.36-gate.userData.left.position.x)*Math.min(1,dt*3.2);
      gate.userData.right.position.x+=(1.36-gate.userData.right.position.x)*Math.min(1,dt*3.2);
      gate.userData.crack.material.opacity+=(0-gate.userData.crack.material.opacity)*Math.min(1,dt*4);
    }
  }

  if(creature.traitPulse>0){
    creature.traitPulse-=dt;
    if(creature.traitMode==='transparent'){
      const alpha=.27+Math.sin(t*7)*.09;creature.face.entries.forEach(e=>{e.part.matl.opacity=alpha;});
    }else if(creature.traitMode==='bounce'){
      const jump=Math.abs(Math.sin(t*5.5))*Math.min(1,creature.traitPulse*1.5);creature.holder.position.y=jump*.65;const squish=.92+Math.sin(t*5.5)*.08;creature.holder.scale.set(creature.baseScale/squish,creature.baseScale*squish,creature.baseScale);
    }else if(creature.traitMode==='glow'){
      creature.aura.material.opacity=.42+Math.sin(t*4)*.16;creature.aura.scale.setScalar(1+Math.sin(t*3)*.08);
    }
    if(creature.traitPulse<=0)resetTraitVisual();
  }

  if(game.moving&&game.target){
    const p=creature.holder.position;const dx=game.target.x-p.x,dz=game.target.z-p.z;const d=Math.hypot(dx,dz);
    if(d<.09){
      p.x=game.target.x;p.z=game.target.z;game.moving=false;creature.animator.setPose('idle');
      if(game.phase==='gate-approach')showGateChallenge();
    }else{
      const speed=2.05;const step=Math.min(d,speed*dt);p.x+=dx/d*step;p.z+=dz/d*step;
      creature.holder.rotation.y=Math.atan2(camera.position.x-p.x,camera.position.z-p.z);
    }
  }
  creature.shadow.position.x=creature.holder.position.x;creature.shadow.position.z=creature.holder.position.z;creature.shadow.material.opacity=.28-Math.min(.16,creature.holder.position.y*.18);
  creature.aura.position.x=creature.holder.position.x;creature.aura.position.z=creature.holder.position.z;

  if(game.phase==='play')for(const seed of seeds){if(!seed.userData.collected&&creature.holder.position.distanceTo(seed.position)<.72)collectSeed(seed);}

  if(targetRipple.material.opacity>0){targetRipple.material.opacity=Math.max(0,targetRipple.material.opacity-dt*.7);targetRipple.scale.multiplyScalar(1+dt*1.7);}
  for(const c of confetti){c.position.y-=dt*c.userData.vy;c.position.x+=dt*c.userData.vx;c.rotation.z+=dt*(1.5+Math.sin(c.userData.phase));if(c.position.y<.12)c.position.y=2.8+Math.random();}

  renderer.render(scene,camera);
}
tick();

// ------------------------------------------------------------------
// Onboarding
// ------------------------------------------------------------------
$('sound-toggle').addEventListener('click',()=>{
  const on=voice.toggle();$('sound-toggle').textContent=`声音：${on?'开':'关'}`;$('sound-toggle').setAttribute('aria-pressed',String(on));sfx.tap();
  if(on)voice.speak('welcome','小芽在这里。声音已经打开啦。');
});

$('start-adventure').addEventListener('click',async()=>{
  sfx.ready();sfx.choose();game.phase='trait';showPanel('panel-trait');
  applyTraitPreview('transparent');await delay(420);resetTraitVisual();
  voice.speak('trait','嘘，先别惊动它。它一害怕，身体就会发生奇怪的变化。你觉得会是什么？');
});

async function chooseTrait(trait,sourceLine=''){
  profile.trait=trait;profile.traitLabel=TRAITS[trait].label;profile.traitLine=sourceLine||TRAITS[trait].line;profile.gateLine='';
  sfx.choose();
  creature.holder.position.set(-1.35,0,.75);
  creature.shadow.position.set(-1.35,.03,.75);
  creature.aura.position.set(-1.35,.025,.75);
  layer.classList.add('reveal');
  applyTraitPreview(trait);
  await delay(1450);
  showPanel('panel-heart');
  layer.classList.remove('reveal');
  voice.speak('heart','你已经发现它的一个秘密了。再听听它的心。树洞里有朋友在哭，它会怎么做？');
}

$('trait-choices').addEventListener('click',e=>{
  const btn=e.target.closest('[data-trait]');if(btn)chooseTrait(btn.dataset.trait);
});

$('custom-idea-toggle').addEventListener('click',()=>{
  $('custom-idea-form').hidden=false;$('idea-privacy').hidden=false;$('custom-idea-input').focus();$('idea-error').textContent='';
});

$('custom-idea-form').addEventListener('submit',async e=>{
  e.preventDefault();const idea=$('custom-idea-input').value.trim();const error=$('idea-error');
  if(idea.length<2){error.textContent='再多说一点点，小芽才能听明白。';return;}
  const submit=$('custom-idea-submit');submit.disabled=true;submit.textContent='世界导演在听';error.textContent='';
  try{
    const response=await fetch('/api/director',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idea})});
    if(!response.ok)throw new Error('director unavailable');
    const data=await response.json();const trait=TRAITS[data.mechanic]?data.mechanic:'glow';
    profile.customIdea=idea;profile.traitLabel=(data.abilityLabel||idea).slice(0,12);
    const line=(data.narratorLine||`它害怕时，${idea}。`).slice(0,60);
    await chooseTrait(trait,line);
    profile.traitLabel=(data.abilityLabel||idea).slice(0,12);profile.traitLine=line;profile.gateLine=String(data.gateLine||`它用“${profile.traitLabel}”在雾门上找到了一条刚刚好的小路。`).slice(0,60);
  }catch(err){
    profile.customIdea=idea;
    await chooseTrait('glow',`它害怕时，${idea.replace(/[。！!?]+$/,'')}。`);
    profile.traitLabel=idea.slice(0,12);profile.gateLine=`它用“${profile.traitLabel}”在雾门上找到了一条刚刚好的小路。`;
    toast('世界导演暂时打了个喷嚏，你的想法仍然被画进来了。');
  }finally{submit.disabled=false;submit.textContent='让它出现';}
});

$('heart-choices').addEventListener('click',async e=>{
  const btn=e.target.closest('[data-heart]');if(!btn)return;
  profile.heart=btn.dataset.heart;sfx.choose();creature.options.talk=true;await delay(540);creature.options.talk=false;
  showPanel('panel-name');voice.speak('name','它现在有了模样，也有了自己的心。最后一件事，给它取一个只属于它的名字吧。');
});

document.querySelector('.suggestions').addEventListener('click',e=>{
  const btn=e.target.closest('[data-name]');if(!btn)return;$('creature-name').value=btn.dataset.name;$('creature-name').focus();sfx.tap();
});

$('confirm-name').addEventListener('click',async()=>{
  const raw=$('creature-name').value.trim().replace(/[<>]/g,'');
  if(!raw){$('name-error').textContent='它正在认真等你写下名字。';$('creature-name').focus();return;}
  profile.name=raw.slice(0,8);$('name-error').textContent='';$('forming-name').textContent=profile.name;sfx.choose();showPanel('panel-forming');
  voice.speak('world','名字写好了。现在，草地、萤火和秘密小路，会一起长出来。');
  const rows=[...document.querySelectorAll('.forming-row')];
  for(let i=0;i<rows.length;i++){
    if(i>0)rows[i-1].classList.remove('active');
    rows[i].classList.add('active');game.formed=i+1;
    if(i===1)seeds.forEach((s,j)=>{s.scale.setScalar(.001);setTimeout(()=>{s.scale.setScalar(1);},j*120);});
    if(i===2)fogs.forEach(f=>f.material.opacity=.9);
    if(i===3)gate.visible=true;
    await delay(720);rows[i].classList.add('done');
  }
  rows.at(-1).classList.remove('active');$('enter-world').disabled=false;
});

$('enter-world').addEventListener('click',async()=>{
  refreshGameInspiration();
  sfx.reveal();gate.visible=false;layer.classList.add('hidden');$('chapter-mark').classList.add('show');gameHud.classList.add('show');tapHint.classList.add('show');
  game.phase='play';game.movementEnabled=true;creature.holder.position.set(-4.25,0,2.75);creature.shadow.position.set(-4.25,.03,2.75);seeds.forEach(s=>{s.visible=true;s.scale.setScalar(1);s.position.y=0;});
  say(`欢迎来到雾灯花园，${profile.name}。点一下草地，就能带它走过去。先找到会一闪一闪的萤火种。${gameInspiration.openingHint}`);
  voice.speak('play','欢迎来到雾灯花园。点一下草地，就能带它走过去。先找到会一闪一闪的萤火种。');
  await delay(5200);if(game.phase==='play'&&game.collected===0)hideGuide();
});

$('save-card').addEventListener('click',()=>{
  const entry={name:profile.name,trait:profile.traitLabel,heart:profile.heart,completedAt:new Date().toISOString(),world:'雾灯花园',inspiration:{role:gameInspiration.role,theme:childProfile.theme,playStyle:childProfile.playStyle},profileVersion:gameInspiration.profileVersion};
  try{const book=JSON.parse(localStorage.getItem('mengmeng-atlas')||'[]');book.push(entry);localStorage.setItem('mengmeng-atlas',JSON.stringify(book.slice(-24)));toast('已经收进这台设备上的奇妙图鉴。');$('save-card').disabled=true;$('save-card').textContent='已经收进图鉴';}
  catch{toast('这一次没能保存，但冒险仍然完成了。');}
});

$('replay').addEventListener('click',()=>location.reload());

$('start-adventure').disabled=false;
$('start-adventure').textContent='轻轻叫醒它';
document.documentElement.dataset.sceneReady='true';
window.__adventure={profile,game,seeds,creature,gate,lantern,childProfile,gameInspiration,collectSeed,setMoveTarget,finishAdventure};
