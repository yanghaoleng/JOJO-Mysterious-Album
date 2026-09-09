import * as THREE from '../vendor/three.module.js';
import { InkPlanetStage } from './ink-planet-stage.js';
import { createInkPlanetLines } from './ink-planet-lines.js';

// All simulator scenes have an intentional base world; no implicit orchard
// fallback. Interior worlds replace the story landmark with small local props.
export const LAB_PLANET_SCENES = Object.freeze({
  'paper-ground': { worldId: 'meadow', decor: 'paper', interior: true },
  'classroom-desk': { worldId: 'home', decor: 'desk', interior: true },
  library: { worldId: 'home', decor: 'library', interior: true },
  attic: { worldId: 'pocket', decor: 'attic', interior: true },
  'breakfast-table': { worldId: 'bakery', decor: 'breakfast', interior: true },
  'rainy-window': { worldId: 'home', decor: 'rain', interior: true },
  meadow: { worldId: 'meadow' },
  'mushroom-forest': { worldId: 'orchard', decor: 'mushrooms' },
  seaside: { worldId: 'cove' },
  greenhouse: { worldId: 'orchard', decor: 'greenhouse', interior: true },
  'paper-creek': { worldId: 'bridge', decor: 'boat' },
  'snow-globe': { worldId: 'cloud', decor: 'snow', interior: true },
  'castle-window': { worldId: 'home', decor: 'castle', interior: true },
  clouds: { worldId: 'cloud' },
  space: { worldId: 'observatory' },
  moon: { worldId: 'moon' },
  underwater: { worldId: 'reef' },
  train: { worldId: 'home', decor: 'train', interior: true },
  rooftop: { worldId: 'home', decor: 'roof' },
  'blanket-fort': { worldId: 'pocket', decor: 'fort', interior: true },
  'giant-pocket': { worldId: 'pocket' },
  'music-stage': { worldId: 'pocket', decor: 'music', interior: true },
});

/** Tiny scene-specific objects share geometry/materials, stay tangent to the
 * world, and belong only to this lab instance. Never modify the Dev factory. */
export function createLabPlanetDecor(world, config) {
  const group = new THREE.Group(); group.name = `lab-landmark-${config.decor || 'none'}`;
  const geometries = new Map(), materials = new Map();
  const colors = { wood: '#b69375', paper: '#f1e6c9', rose: '#c99597', blue: '#a5bfc6', leaf: '#a8be96', stone: '#b8b6ae', gold: '#d6be80' };
  const geo = type => {
    if (!geometries.has(type)) geometries.set(type, type === 'orb' ? new THREE.SphereGeometry(1, 12, 8)
      : type === 'ring' ? new THREE.TorusGeometry(1, .07, 5, 24)
        : type === 'cone' ? new THREE.ConeGeometry(1, 1, 12) : new THREE.BoxGeometry(1, 1, 1));
    return geometries.get(type);
  };
  const mat = key => {
    if (!materials.has(key)) {
      const material = new THREE.MeshStandardMaterial({ color: colors[key], roughness: 1 });
      material.userData.handcraftedSurface = key === 'wood' ? 'wood' : key === 'stone' ? 'stone' : key === 'leaf' ? 'foliage' : 'paper';
      materials.set(key, material);
    }
    return materials.get(key);
  };
  const mesh = (parent, type, key, position, scale, rotation = 0) => {
    const item = new THREE.Mesh(geo(type), mat(key)); item.position.set(...position); item.scale.set(...scale); item.rotation.z = rotation;
    parent.add(item); return item;
  };
  const anchor = (x, z) => {
    const root = new THREE.Group(); root.position.copy(world.surfacePoint(x, z, .07));
    root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), world.surfaceNormal(x, z)); group.add(root); return root;
  };
  const books = (root, count = 5) => {
    for (let i = 0; i < count; i++) mesh(root, 'box', ['rose','blue','gold','leaf'][i % 4], [(i-(count-1)/2)*.22, .42+(i%2)*.06, 0], [.16,.8+(i%2)*.12,.45], (i-count/2)*.035);
  };
  const frame = (root, key = 'wood') => {
    for (const x of [-.9,.9]) mesh(root,'box',key,[x,1.2,0],[.14,2.4,.18]);
    for (const y of [.18,1.2,2.35]) mesh(root,'box',key,[0,y,0],[1.95,.12,.18]);
    mesh(root,'box',key,[0,1.2,0],[.09,2.4,.18]);
  };
  const decor = config.decor;
  if (decor === 'desk' || decor === 'library') {
    const root = anchor(-1.5,-.3);
    mesh(root,'box','wood',[0,.1,0],[2.1,.2,.7]); books(root,7);
    if (decor === 'library') {
      for (const x of [-1,1]) mesh(root,'box','wood',[x,.85,0],[.12,1.7,.65]);
      mesh(root,'box','wood',[0,1,0],[2.1,.1,.65]); const upper=new THREE.Group(); upper.position.y=1.05; root.add(upper); books(upper,6);
    } else {
      const pencil=anchor(1.7,.1); mesh(pencil,'box','gold',[0,.13,0],[1.6,.13,.13],.1);
      mesh(pencil,'cone','stone',[.85,.13,0],[.1,.3,.1],-Math.PI/2);
    }
  } else if (decor === 'rain' || decor === 'castle' || decor === 'train') {
    const root=anchor(0,-.6); frame(root, decor==='castle'?'stone':'wood');
    if(decor==='castle') { const arch=mesh(root,'ring','stone',[0,2.35,0],[.9,.65,1]); arch.rotation.z=Math.PI; }
    if(decor==='rain') for(let i=0;i<14;i++) mesh(root,'orb','blue',[-.7+(i%4)*.45,.4+Math.floor(i/4)*.45,-.05],[.025,.08,.02]);
    if(decor==='train') for(const x of [-1.7,1.7]) {const seat=anchor(x,.15);mesh(seat,'box','rose',[0,.35,0],[.9,.65,.65]);mesh(seat,'box','wood',[0,.9,-.3],[.9,1.1,.15]);}
  } else if (decor === 'attic') {
    for(const [x,s] of [[-1.5,1],[1.65,.75]]) {const root=anchor(x,-.2);mesh(root,'box','wood',[0,s*.5,0],[s*1.3,s,s]);mesh(root,'box','gold',[0,s*.7,.51*s],[s*1.32,.1,.05]);mesh(root,'orb','rose',[.1,s+.25,0],[.35,.35,.35]);}
  } else if (decor === 'breakfast') {
    const root=anchor(-1.5,.05); mesh(root,'orb','paper',[0,.08,0],[.8,.08,.55]); mesh(root,'orb','gold',[0,.25,0],[.5,.2,.35]);
    const cup=anchor(1.5,-.1); mesh(cup,'orb','blue',[0,.45,0],[.38,.5,.38]);mesh(cup,'ring','blue',[.42,.48,0],[.27,.27,.27]);
  } else if (decor === 'mushrooms') {
    for(const [x,z,s] of [[-1.6,.7,.8],[1.8,.3,.65],[-2.2,-1,1]]) {const root=anchor(x,z);mesh(root,'orb','paper',[0,.45*s,0],[.16*s,.5*s,.16*s]);mesh(root,'orb','rose',[0,.95*s,0],[.65*s,.32*s,.65*s]);for(let i=0;i<3;i++)mesh(root,'orb','paper',[(i-1)*.28*s,1.17*s,.13*s],[.08*s,.025*s,.08*s]);}
  } else if (decor === 'greenhouse') {
    const root=anchor(0,-.4); frame(root,'leaf'); mesh(root,'ring','leaf',[0,2.3,0],[.95,.8,1]);
    for(const x of [-1.6,1.6]) { const pot=anchor(x,.2);mesh(pot,'cone','rose',[0,.3,0],[.38,.6,.38]);for(let i=0;i<3;i++)mesh(pot,'orb','leaf',[(i-1)*.24,.85+Math.abs(i-1)*.1,0],[.22,.48,.13],(i-1)*-.5);}
  } else if (decor === 'boat') {
    const root=anchor(-1.3,.5);mesh(root,'box','paper',[0,.2,0],[.9,.2,.5],.05);mesh(root,'cone','paper',[0,.58,0],[.4,.7,.035],-.25);
  } else if (decor === 'snow') {
    for(const x of [-1.6,1.7]) { const root=anchor(x,-.1);mesh(root,'orb','paper',[0,.45,0],[.55,.55,.55]);mesh(root,'orb','paper',[0,1.1,0],[.36,.36,.36]);mesh(root,'cone','gold',[0,1.1,.38],[.08,.3,.08]).rotation.x=Math.PI/2; }
    for(let i=0;i<15;i++)mesh(group,'orb','paper',[-2.7+(i%5)*1.3,1+Math.floor(i/5)*.6,-.9],[.035,.035,.035]);
  } else if (decor === 'fort' || decor === 'music') {
    const root=anchor(0,-.35);
    for(const x of [-1.65,1.65])mesh(root,'box','wood',[x,1.2,0],[.09,2.4,.09]);
    mesh(root,'box',decor==='fort'?'blue':'rose',[0,2.25,0],[3.4,.16,.9],-.04);
    for(const x of [-1.5,1.5])mesh(root,'box',decor==='fort'?'blue':'rose',[x,1.15,0],[.45,2.2,.2],x*.05);
    if(decor==='fort')for(const x of [-1.1,1.2])mesh(anchor(x,.7),'orb','paper',[0,.15,0],[.6,.2,.38]);
    else { const note=anchor(1.1,.5);mesh(note,'orb','stone',[0,.35,0],[.21,.13,.08]);mesh(note,'box','stone',[.16,.75,0],[.065,.9,.08]);mesh(note,'box','stone',[.34,1.18,0],[.4,.13,.08],-.25); }
  } else if (decor === 'roof') { const root=anchor(-1.6,.2);mesh(root,'box','stone',[0,.6,0],[.55,1.2,.55]);mesh(root,'box','rose',[0,1.2,0],[.75,.16,.75]); }
  let disposed=false;
  return { group, dispose() { if(disposed)return;disposed=true; group.removeFromParent();for(const geometry of geometries.values())geometry.dispose();for(const material of materials.values())material.dispose(); } };
}

export class LabPlanetStage extends InkPlanetStage {
  constructor(container, onTouch) {
    super(container,onTouch); this.studio=true;
    this.setViewportInsets({top:86,bottom:42,left:18,right:18});
    this.renderer.domElement.setAttribute('aria-label','角色小星球：拖动转动，滚轮或双指缩放，按 Home 复位');
  }
  releaseActors() {
    super.releaseActors();
    if(this.savedShadow) { this.savedShadow.object.visible=this.savedShadow.visible; this.savedShadow=null; }
  }
  setLabScene(sceneId, entry) {
    const config=LAB_PLANET_SCENES[sceneId];
    if(!config)throw new Error(`Unknown lab scene: ${sceneId}`);
    this.releaseActors(); this.labDecor?.dispose(); this.labDecor=null;
    const shadow=entry.holder?.userData.softShadow;
    // setStoryScene calls releaseActors again, so hide the borrowed sprite only
    // afterwards. It is excluded from visibleActorBounds and never disposed.
    super.setStoryScene({id:sceneId,worldId:config.worldId},[entry]);
    if(config.decor==='paper') {
      this.world.atmosphere={...this.world.atmosphere,period:'day',base:'#f4eee0',glow:'#faf4e5',horizon:'#e5dfcb'};
      this.setLighting(this.world.atmosphere);
    }
    if(shadow) {this.savedShadow={object:shadow,visible:shadow.visible};shadow.visible=false;}
    if(config.interior) this.world.group.traverse(node=>{if(node.isMesh&&!node.userData.planetBody)node.visible=false;});
    this.inkLines?.dispose();
    this.labDecor=createLabPlanetDecor(this.world,config);this.world.group.add(this.labDecor.group);
    this.style.apply(this.labDecor.group);
    this.inkLines=createInkPlanetLines();this.inkLines.apply(this.world.group);
    this.inkLines.resize(this.container.clientWidth,this.container.clientHeight);
    this.labSceneId=sceneId;
    this.resetCamera();
  }
  dispose() { if(this.disposed)return;this.labDecor?.dispose();this.labDecor=null;super.dispose(); }
}
