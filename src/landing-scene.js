import * as THREE from '../vendor/three.module.js';
import { DioramaStage } from '../dev/stage.js';
import { createWorld } from '../dev/worlds.js';
import { createWowCharacter } from '../dev/wow-visuals.js';
import { createLandingSky } from './landing-sky.js?v=20260918-pop';

import { createLandingPuffs } from './landing-puffs.js?v=20260918-pop';

const clamp=THREE.MathUtils.clamp;
const ease=t=>{const x=clamp(t,0,1);return x*x*(3-2*x);};
const spring=t=>{const x=clamp(t,0,1);return x===1?1:1-Math.exp(-6*x)*Math.cos(10*x);};
const palettes=[
  {land:'#d9b589',shade:'#b4825e',sky:'#342a47',glow:'#a37164',halo:'#f9dba2'},
  {land:'#8dad99',shade:'#547e76',sky:'#153b48',glow:'#558981',halo:'#b2ead3'},
  {land:'#aba9cf',shade:'#777ca8',sky:'#242d53',glow:'#70688b',halo:'#d8d7ff'},
  {land:'#c89ba8',shade:'#9a6f89',sky:'#422d48',glow:'#996574',halo:'#ffd5be'},
];

export function createLandingScene(container,{motion=true}={}) {
  const stage=new DioramaStage(container), hero=container.closest('.landing-hero');
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  let reduced=preference.matches||!motion, elapsed=0,previous=0,visible=true,disposed=false;
  const cast=[
    {id:'hero',name:'鼓鼓',createActor:({scale})=>createWowCharacter({kind:'gugu',scale})},
    {id:'hero',name:'小荷',type:'frog'},
    {id:'hero',name:'雪团',type:'rabbit'},
    {id:'hero',name:'咕咕',type:'owl'},
    {id:'hero',name:'月牙',type:'cat'},
  ];
  stage.setScene('bakery',[cast[0]]);stage.space.visible=false;
  stage.yaw=.05;stage.pitch=.14;stage.target.set(-1.05,.65,.3);
  // Keep the framing steady when different-sized friends arrive.
  stage.characterFocus={width:2.5,height:2.8,meanHeight:2.4};
  const resize=stage.resize.bind(stage);
  stage.resize=()=>{
    const {width,height}=container.getBoundingClientRect(),mobile=width<768;
    stage.zoom=mobile?1.43:1.65;
    stage.viewportInsets={left:mobile?0:width*.53,right:mobile?0:width*.01,top:mobile?Math.min(390,height*.46):height*.18,bottom:mobile?0:height*.02};
    resize();
  };stage.resize();
  const globe=stage.world.group.getObjectByName('complete-planet-sphere');
  const colors=globe.geometry.attributes.color,positions=globe.geometry.attributes.position;
  const variations=Array.from({length:colors.count},(_,i)=>{
    const x=positions.getX(i)/4.5,y=positions.getY(i)/4.5,z=positions.getZ(i)/4.5;
    return (Math.sin(x*6+z*3)*Math.sin(y*5-z*4)*.5+.5)*.21;
  });
  const sky=createLandingSky(stage),puffs=createLandingPuffs(stage);
  // Worlds already expose the named sphere; its siblings hold their scenery.
  // Normalising their radius preserves the same ground while props change independently.
  const worlds=[stage.world,...['observatory','meadow'].map(id=>{
    const world=createWorld(id);stage.style.apply(world.group);stage.scene.add(world.group);
    world.group.scale.setScalar(4.5/world.planet.radius);
    world.group.getObjectByName('complete-planet-sphere').visible=false;
    return world;
  })];
  const scenery=worlds.map(world=>world.group.children.filter(child=>!child.getObjectByName('complete-planet-sphere')));
  const sceneryMaterials=scenery.map(roots=>{
    const values=new Set();roots.forEach(root=>root.traverse(node=>{if(node.material)for(const m of Array.isArray(node.material)?node.material:[node.material])values.add(m);}));
    return [...values].map(material=>({material,opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite}));
  });
  const schedules={
    actor:{index:0,at:0,next:4.4,intervals:[5.8,3.9,6.2,4.6]},
    scenery:{index:0,at:0,next:3.1,intervals:[4.7,3.4,5.6,4.1]},
    planet:{index:0,at:0,next:6.5,intervals:[7.8,5.4,8.2,6.1]},
  };
  let oldScenery=-1,actorTransition=null,lastPaint=-1,sceneryPuffed=-1,planetPuffed=-1;
  const color=new THREE.Color(),land=new THREE.Color(palettes[0].land),shade=new THREE.Color(palettes[0].shade);
  const skyColor=new THREE.Color(palettes[0].sky),glowColor=new THREE.Color(palettes[0].glow),haloColor=new THREE.Color(palettes[0].halo);
  const previousPalette={land:land.clone(),shade:shade.clone(),sky:skyColor.clone(),glow:glowColor.clone(),halo:haloColor.clone()};
  const targetPalette={...previousPalette};
  function publish(){container.dataset.actor=String(schedules.actor.index);container.dataset.scenery=String(schedules.scenery.index);container.dataset.scene=String(schedules.planet.index);}
  function nextSchedule(track){track.index++;track.at=elapsed;track.next=elapsed+track.intervals[(track.index-1)%track.intervals.length];}
  function paintPlanet(force=false){
    if(!force&&elapsed-lastPaint<.035)return;lastPaint=elapsed;
    const t=reduced?1:ease((elapsed-schedules.planet.at)/.65);
    for(const [key,value] of Object.entries({land,shade,sky:skyColor,glow:glowColor,halo:haloColor}))value.copy(previousPalette[key]).lerp(targetPalette[key],t);
    for(let i=0;i<colors.count;i++){color.copy(land).lerp(shade,variations[i]);colors.setXYZ(i,color.r,color.g,color.b);}colors.needsUpdate=true;
    hero.style.setProperty('--sky-base',`#${skyColor.getHexString()}`);hero.style.setProperty('--sky-glow',`#${glowColor.getHexString()}`);hero.style.setProperty('--hero-halo',`#${haloColor.getHexString()}`);
    stage.rim.color.copy(haloColor);
  }
  function sceneryVisibility(index,amount,movement=amount){
    scenery[index].forEach(root=>{root.visible=amount>.001;root.position.y=(movement-1)*.45;root.scale.setScalar(.92+.08*movement);});
    sceneryMaterials[index].forEach(({material,opacity,transparent,depthWrite})=>{
      const blending=amount<.999;
      if(material.transparent!==(blending||transparent)){material.transparent=blending||transparent;material.needsUpdate=true;}
      material.opacity=opacity*amount;material.depthWrite=blending?false:depthWrite;
    });
  }
  function onPreference(){reduced=preference.matches||!motion;if(reduced){actorTransition=null;scenery.forEach((_,i)=>sceneryVisibility(i,i===schedules.scenery.index%worlds.length?1:0));paintPlanet(true);}}
  preference.addEventListener('change',onPreference);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(container);
  stage.renderer.domElement.setAttribute('aria-hidden','true');stage.renderer.domElement.removeAttribute('role');stage.renderer.domElement.style.pointerEvents='none';
  publish();paintPlanet(true);
  stage.renderer.setAnimationLoop(now=>{
    const dt=previous?Math.min((now-previous)/1000,.05):0;previous=now;
    if(disposed||!visible||document.hidden)return;
    if(!reduced)elapsed+=dt;
    const actorTrack=schedules.actor,propTrack=schedules.scenery,planetTrack=schedules.planet;
    if(!reduced&&elapsed>=actorTrack.next){nextSchedule(actorTrack);actorTransition={start:elapsed,swapped:false};publish();}
    if(actorTransition&&!actorTransition.swapped&&elapsed-actorTransition.start>.14){
      stage.setCast([cast[actorTrack.index%cast.length]]);stage.actors.get('hero').setAction('wave');actorTransition.swapped=true;
    }
    if(!reduced&&elapsed>=propTrack.next){oldScenery=propTrack.index%worlds.length;nextSchedule(propTrack);publish();}
    if(!reduced&&elapsed>=planetTrack.next){
      for(const [key,value] of Object.entries({land,shade,sky:skyColor,glow:glowColor,halo:haloColor}))previousPalette[key].copy(value);
      nextSchedule(planetTrack);const palette=palettes[planetTrack.index%palettes.length];
      for(const key of Object.keys(targetPalette))targetPalette[key]=new THREE.Color(palette[key]);publish();
    }
    const entrance=reduced?1:spring(elapsed/.8);
    const planetAge=elapsed-planetTrack.at;
    const pulse=reduced||!planetTrack.index||planetAge>.65?0:Math.sin(planetAge/.65*Math.PI*3)*Math.exp(-planetAge*6);
    const scaleY=.94+.06*entrance-pulse*.024;
    globe.scale.set(.94+.06*entrance+pulse*.025,scaleY,.94+.06*entrance+pulse*.025);
    globe.position.y=-4.5*scaleY-(1-entrance)*2.3;
    const sceneryProgress=(elapsed-propTrack.at-(propTrack.index?0:.18))/.48;
    const sceneryEnter=reduced?1:ease(sceneryProgress),sceneryBounce=reduced?1:spring(sceneryProgress);
    worlds.forEach((world,i)=>{
      const amount=i===propTrack.index%worlds.length?sceneryEnter:i===oldScenery?1-sceneryEnter:0;
      sceneryVisibility(i,amount,i===propTrack.index%worlds.length?sceneryBounce:amount);if(amount>0)world.update(reduced?0:elapsed,reduced?0:dt);
    });
    for(const actor of stage.actors.values()){
      actor.update(reduced?0:elapsed,reduced?0:dt);
      let amount=reduced?1:spring((elapsed-.35)/.46);
      if(actorTransition){
        const age=elapsed-actorTransition.start;amount=age<.14?1-ease(age/.14):spring((age-.14)/.46);
        if(age>.35&&!actorTransition.puffed){puffs.burst(actor.group.position,elapsed);actorTransition.puffed=true;}
        if(age>=.6)actorTransition=null;
      }
      actor.group.scale.setScalar(.78*Math.max(.001,amount));actor.surfaceGrounding?.update();
      actor.group.position.y+=Math.max(0,1-amount)*.65+Math.max(0,amount-1)*.4;
    }
    if(!reduced&&propTrack.index!==sceneryPuffed&&sceneryProgress>.65){
      sceneryPuffed=propTrack.index;puffs.burst(stage.world.surfacePoint(1.8,.6,.1),elapsed,{size:.4,count:5});
    }
    if(!reduced&&planetTrack.index>0&&planetTrack.index!==planetPuffed&&planetAge>.34){
      planetPuffed=planetTrack.index;puffs.burst(stage.world.surfacePoint(-.6,1.8,.1),elapsed,{size:.34,count:5});
    }
    puffs.update(elapsed,{reduced});
    stage.yaw=.05+(reduced?0:Math.sin(elapsed*.23)*.045);stage.updateCamera();
    paintPlanet();sky.update(reduced?0:elapsed,{reduced});stage.renderer.render(stage.scene,stage.camera);
  });
  container.__heroScene={get status(){return {time:elapsed,reduced,visible,actor:schedules.actor.index,scenery:schedules.scenery.index,planet:schedules.planet.index,next:{actor:schedules.actor.next,scenery:schedules.scenery.next,planet:schedules.planet.next},sky:sky.stats,puffs:puffs.stats,actorScale:stage.actors.get('hero')?.group.scale.x,drawCalls:stage.renderer.info.render.calls,geometries:stage.renderer.info.memory.geometries};}};
  return {renderer:stage.renderer,stage,dispose(){disposed=true;observer.disconnect();preference.removeEventListener('change',onPreference);sky.dispose();puffs.dispose();worlds.slice(1).forEach(world=>world.dispose());delete container.__heroScene;stage.dispose();}};
}
