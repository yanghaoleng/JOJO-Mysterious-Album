import * as THREE from '../../vendor/three.module.js';
import { createCreationModel } from '../creation-models.js';
import { BEHAVIOR_ACTIONS } from '../content/behavior-events.js';
import { createEventSymbol } from './event-symbols.js';
const definitions=Object.fromEntries(BEHAVIOR_ACTIONS.map(a=>[a.id,a]));
const clamp=n=>Math.min(1,Math.max(0,n));
// Finite performances own only temporary props. Original entities are never deleted.
export function createBehaviorController({entries,stage,dispatch=()=>({ok:true})}) {
  const jobs=new Map();let disposed=0;
  function stop(id){
    for(const [key,j] of [...jobs])if(!id||key===id||j.target?.id===id){
      for(const item of [j.item,j.target].filter(Boolean)){item.eventControlled=false;if(item.effectRoot){item.effectRoot.position.set(0,0,0);item.effectRoot.rotation.set(0,0,0);}item.model.group.visible=j.visibility.get(item);}
      for(const model of j.models)model.dispose();for(const s of j.symbols)s.userData.dispose();
      for(const g of j.geometries)g.dispose();for(const m of j.materials)m.dispose();
      j.root.removeFromParent();jobs.delete(key);disposed++;
    }
  }
  function start(command){
    const item=entries.get(command.id),def=definitions[command.action];if(!item||(!def&&command.action!=='wet'))return;
    stop(item.id);
    let target=entries.get(command.target);
    const preferred={swim:['prop:swimming-pool'],wet:['prop:swimming-pool'],sail:['prop:airplane','prop:rword-jet','prop:rword-ship','prop:sailboat','prop:ship'],ride:['prop:rword-bike','prop:bicycle','prop:airplane','prop:rocket']};
    if(preferred[command.action])target=(target&&preferred[command.action].includes(target.asset)?target:null)||[...entries.values()].find(e=>e!==item&&preferred[command.action].includes(e.asset));
    if(target)stop(target.id);
    const root=new THREE.Group();root.name=`behavior-${command.action}`;stage.scene.add(root);
    const j={item,target,root,action:command.action,colors:command.colors,age:0,duration:command.duration||7,models:[],symbols:[],geometries:[],materials:[],parts:{},visibility:new Map([item,target].filter(Boolean).map(e=>[e,e.model.group.visible]))};
    item.eventControlled=true;if(target)target.eventControlled=true;
    root.position.copy(item.anchor.position);root.quaternion.copy(item.anchor.quaternion);
    const size=Math.max(.6,Math.min(1.5,(item.modelTop||1)*.85));j.size=size;root.scale.setScalar(size);
    const mesh=(kind,color,pos,scale)=>{const geometry=kind==='ball'?new THREE.SphereGeometry(1,16,10):new THREE.BoxGeometry(1,1,1);const material=new THREE.MeshStandardMaterial({color,transparent:true,roughness:.8});j.geometries.push(geometry);j.materials.push(material);const m=new THREE.Mesh(geometry,material);m.position.set(...pos);m.scale.set(...scale);root.add(m);return m;};
    j.mesh=mesh;
    const symbol=(kind,pos=[0,2,0])=>{const s=createEventSymbol(kind);s.position.set(...pos);root.add(s);j.symbols.push(s);return s;};j.symbol=symbol;
    const prop=(id,pos=[1.1,0,0],scale=.8)=>{const m=createCreationModel(id);m.group.position.set(...pos);m.group.scale.multiplyScalar(scale);root.add(m.group);j.models.push(m);return m.group;};
    const defaultProp=command.action==='wet'?'swimming-pool':def?.prop;
    if(defaultProp&&(!target||['clean','dip','sip','dig','knit','draw','read'].includes(j.action)))j.prop=prop(defaultProp,['swim','wet','sail','ride','skate','sit','pop'].includes(j.action)?[0,0,0]:[1.1,0,0],['swim','wet','skate'].includes(j.action)?1.05:.85);
    j.parts.mark=symbol(({get:'check',take:'check',tap:'note',sip:'heart',pay:'check',help:'heart',look:'eyes',guess:'question','look-out':'alert',play:'note',read:'note',clean:'star',bake:'steam'})[j.action]||'star');
    if(['open','rip','guess','pop'].includes(j.action)){
      const cover=new THREE.Group();root.add(cover);j.parts.cover=cover;
      for(const side of [-1,1]){const panel=mesh('box','#d7bb8a',[side*.5,.6,.55],[1,1.2,.12]);cover.attach(panel);}
      j.parts.left=cover.children[0];j.parts.right=cover.children[1];
    }
    if(j.action==='draw'){
      mesh('box','#f9eed8',[1.1,1,.05],[1.5,1.5,.06]);j.parts.strokes=[];
      for(let i=0;i<7;i++){const a=i*Math.PI/3;const m=mesh(i===6?'box':'ball',i===6?'#75a679':'#dc96a7',[1.1+(i===6?0:Math.cos(a)*.3),i===6?.65:1.2+Math.sin(a)*.3,.1],i===6?[.045,.55,.045]:[.15,.15,.045]);j.parts.strokes.push(m);}
    }
    if(j.action==='mix'){
      const palette=j.colors||['#de7066','#efd06d'];const key=[...palette].sort().join(':');
      const combinations={'#6eabd0:#efd06d':'#8cba87','#de7066:#efd06d':'#e9a260','#6eabd0:#de7066':'#b09ace'};
      j.mixedColor=combinations[key]||('#'+new THREE.Color(palette[0]).lerp(new THREE.Color(palette[1]),.5).getHexString());
      j.parts.red=mesh('ball',palette[0],[.65,.45,.1],[.3,.15,.3]);j.parts.yellow=mesh('ball',palette[1],[1.5,.45,.1],[.3,.15,.3]);j.parts.mixed=mesh('ball',j.mixedColor,[1.1,.46,.1],[.5,.16,.45]);
    }
    if(j.action==='clean'){j.parts.dirt=Array.from({length:6},(_,i)=>mesh('ball','#977755',[Math.sin(i*2)*.4,.25+i*.15,.3],[.09,.07,.05]));}
    if(j.action==='dip'){j.parts.paint=mesh('ball','#b37acb',[.98,.37,.1],[.36,.06,.35]);j.parts.stain=mesh('ball','#b37acb',[0,.16,.25],[.25,.1,.1]);}
    if(j.action==='sip')j.parts.liquid=mesh('ball','#84ccdf',[1.12,.44,.08],[.12,.3,.12]);
    if(j.action==='dig'){
      j.parts.hole=mesh('ball','#796953',[.95,.01,0],[.6,.035,.48]);j.parts.soil=Array.from({length:5},(_,i)=>mesh('ball','#a58666',[.95+(i%3-.8)*.23,.06,Math.floor(i/3)*.2],[.17,.12,.16]));j.parts.treasure=prop('rword-nut',[.95,.03,0],.45);
    }
    if(j.action==='knit'){j.parts.scarf=mesh('box','#d692a9',[.8,.55,.3],[.65,.08,.18]);}
    if(j.action==='bake'){
      if(!j.prop)j.prop=prop('rword-cake',[1.1,0,.7],.8);
      mesh('box','#dfb994',[1.1,.6,0],[1.35,1.2,.9]);j.parts.door=mesh('box','#8d7261',[1.1,.65,.49],[1.1,.7,.05]);j.parts.dough=mesh('ball','#efd7a2',[1.1,.3,.6],[.35,.2,.3]);
    }
    if(j.action==='read')j.parts.lines=Array.from({length:4},(_,i)=>mesh('box','#879bb4',[1.08,.5+i*.1,.38],[.48,.025,.01]));
    if(j.action==='help')j.parts.bars=Array.from({length:4},(_,i)=>mesh('box','#bdb6a0',[.7+i*.24,.6,.35],[.05,1.2,.05]));
    if(j.action==='zip')j.parts.trails=Array.from({length:3},(_,i)=>mesh('box','#dce3b6',[-.45,.5+i*.15,0],[.7,.035,.04]));
    if(j.action==='tap')j.parts.hammer=prop('rword-tool',[.5,1,0],.45);
    if(j.action==='pay')j.parts.coin=prop('gold-coin',[0,.6,.2],.5);
    if(j.action==='skate'&&j.prop)j.prop.scale.z*=.8;
    jobs.set(item.id,j);
  }
  function update(dt,time,reduced){
    for(const j of [...jobs.values()]){
      if(!entries.has(j.item.id)||(j.target&&!entries.has(j.target.id))){stop(j.item.id);continue;}
      // Let the regular entrance land before starting a self-contained performance.
      if(j.item.entrance<2)continue;
      j.age+=dt;const p=clamp(j.age/j.duration),wave=reduced?0:Math.sin(j.age*3),travel=reduced?0:Math.sin(p*Math.PI),r=j.item.effectRoot;
      if(!r){stop(j.item.id);continue;}
      j.root.position.copy(j.item.anchor.position);j.root.quaternion.copy(j.item.anchor.quaternion);
      const targetOffset=j.target?j.target.anchor.position.clone().sub(j.item.anchor.position).applyQuaternion(j.item.anchor.quaternion.clone().invert()):new THREE.Vector3();
      for(const m of j.models)m.update(dt,reduced,false);
      const fade=clamp((1-p)*5),placement=Math.min(clamp(p*5),fade);j.root.scale.setScalar(j.size*(p>.8?fade:1));
      j.parts.mark.position.y=1.9+(reduced?0:Math.sin(j.age*1.5)*.08);
      for(const s of j.symbols)s.quaternion.copy(j.item.anchor.quaternion).invert();
      r.position.set(0,0,0);r.rotation.set(0,0,0);
      const offset=r.position;
      if(['swim','wet','skate','sail','ride','sit'].includes(j.action)&&j.target)offset.addScaledVector(targetOffset,placement);
      if(j.target?.effectRoot&&!['swim','wet','sail','ride','skate','sit','get','take'].includes(j.action)){
        const desired=new THREE.Vector3(1.1*j.size,0,0).applyQuaternion(j.item.anchor.quaternion).add(j.item.anchor.position).sub(j.target.anchor.position).applyQuaternion(j.target.anchor.quaternion.clone().invert());
        j.target.effectRoot.position.copy(desired.multiplyScalar(placement));
      }
      if(j.action==='swim'){offset.x+=wave*.45;offset.y+=.2;r.rotation.z=wave*.09;}
      if(j.action==='sail'||j.action==='ride'){offset.y+=(j.action==='sail'?.75:.55)*j.size;offset.x+=travel*.65;if(j.prop){j.prop.position.x=travel*.65/j.size;j.prop.position.y=j.action==='sail'?travel*.55:0;offset.y+=j.prop.position.y*j.size;}r.rotation.z=wave*.04;}
      if(j.action==='skate'){offset.x+=wave*.65;r.rotation.z=wave*.12;}
      if(j.action==='sit'){offset.y-=.1;r.rotation.x=-.13;}
      if(j.action==='leap'){offset.x+=travel*.9;offset.y+=travel*.85;}
      if(j.action==='hop'){offset.y+=reduced?.1:Math.max(0,Math.sin(j.age*5))*.35;r.rotation.z=.1;}
      if(j.action==='zip')offset.x+=Math.sin(p*Math.PI*2)*.9;
      if(j.action==='look-out'){offset.x-=travel*.7;if(j.prop)j.prop.position.x=1.5-p*3;}
      if(['get','take'].includes(j.action)){
        if(j.prop){j.prop.position.x=1.1-travel*.9;j.prop.position.y=travel*.55;}
        if(j.target?.effectRoot){const d=j.item.anchor.position.clone().sub(j.target.anchor.position).applyQuaternion(j.target.anchor.quaternion.clone().invert());j.target.effectRoot.position.copy(d.multiplyScalar(travel*.7));j.target.effectRoot.position.y+=travel*.5;}
      }
      if(j.action==='tap'){j.parts.hammer.rotation.z=wave*.6;}
      if(j.action==='clean'){for(const [i,m]of j.parts.dirt.entries())m.visible=p<i/6+.18;if(j.prop)j.prop.position.set(wave*.35,.6,.4);}
      if(j.action==='open'||j.action==='rip'){j.parts.left.position.x=-.5-travel*.7;j.parts.right.position.x=.5+travel*.7;j.parts.left.rotation.y=-travel*.8;j.parts.right.rotation.y=travel*.8;}
      if(j.action==='guess'){j.parts.cover.visible=p<.6;j.parts.mark.visible=p<.6;}
      if(j.action==='pop'){j.parts.cover.visible=p<.35;offset.y+=Math.sin(clamp((p-.25)*2)*Math.PI)*.9;}
      if(j.action==='draw')j.parts.strokes.forEach((s,i)=>s.visible=p>(i+1)/10);
      if(j.action==='mix'){j.parts.red.position.x=.65+clamp(p*2)*.45;j.parts.yellow.position.x=1.5-clamp(p*2)*.4;j.parts.red.visible=j.parts.yellow.visible=p<.55;j.parts.mixed.visible=p>=.55;}
      if(j.action==='dip'){offset.x+=travel*.6;offset.y-=travel*.1;j.parts.stain.visible=p>.5;}
      if(j.action==='sip'){if(j.prop)j.prop.rotation.z=-travel*.8;j.parts.liquid.scale.y=Math.max(.01,.3*(1-p));}
      if(j.action==='dig'){for(const [i,m]of j.parts.soil.entries()){m.position.x+=dt*(i%2?.13:-.13);m.visible=p<.7;}j.parts.treasure.visible=p>.4;if(j.prop)j.prop.rotation.z=wave*.35;}
      if(j.action==='knit'){j.parts.scarf.scale.y=.08+p*.9;if(j.prop)j.prop.scale.setScalar(.85*(1-p*.65));}
      if(j.action==='bake'){if(j.target)j.target.model.group.visible=p>.6;j.parts.dough.visible=p<.55;j.parts.door.rotation.x=p>.55?-1.2:0;if(j.prop){j.prop.visible=p>.55;j.prop.position.z=.7;}}
      if(j.action==='play'){if(j.prop){j.prop.position.y=Math.abs(wave)*.22;j.prop.rotation.z=wave*.12;}r.rotation.z=wave*.08;}
      if(j.action==='read')j.parts.lines.forEach((m,i)=>m.visible=p>(i+1)/7);
      if(j.action==='help'){j.parts.bars.forEach(m=>m.visible=p<.5);if(j.target?.effectRoot)j.target.effectRoot.position.y+=travel*.5;}
      if(j.action==='pay')j.parts.coin.position.x=travel*1.1;
      if(p>=1){const id=j.item.id,action=j.action;stop(id);if(action==='clean')dispatch([{type:'entity.effect',id,effect:'dry'}]);if(action==='mix')dispatch([{type:'entity.color',id,color:j.mixedColor}]);}
    }
  }
  return {start,stop,update,clear:()=>stop(),dispose:()=>stop(),get stats(){return {active:jobs.size,temporaryModels:[...jobs.values()].reduce((s,j)=>s+j.models.length,0),disposed,jobs:[...jobs.values()].map(j=>({id:j.item.id,action:j.action,target:j.target?.id||null,progress:j.age/j.duration}))};}};
}
