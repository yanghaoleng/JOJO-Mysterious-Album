import { createEventSymbol } from './event-symbols.js';
import * as THREE from '../../vendor/three.module.js';

// A separate transform group lets word effects compose with each prefab's own animation.
export function createWordEffects() {
  const owned = new Set();
  function badge(emotion) {
    const group = new THREE.Group();
    const sphere = new THREE.SphereGeometry(1, 12, 8);
    const yellow = new THREE.MeshBasicMaterial({color:emotion === 'angry' ? '#ed947d' : '#f7d977'});
    const ink = new THREE.MeshBasicMaterial({color:'#4d453f'});
    const face = new THREE.Mesh(sphere, yellow); face.scale.set(.19,.19,.05); group.add(face);
    for (const x of [-.064,.064]) { const eye = new THREE.Mesh(sphere,ink); eye.scale.set(.018,emotion==='sleepy'?.006:.025,.018); eye.position.set(x,.04,.05); group.add(eye); }
    const points = Array.from({length:13},(_,i) => {const x=(i/12-.5)*.15;return new THREE.Vector3(x,(['happy','yummy','funny'].includes(emotion) ? 1 : -1)*x*x*8-.07,.058);});
    const mouthGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const mouthMaterial = new THREE.LineBasicMaterial({color:'#4d453f'});
    group.add(new THREE.Line(mouthGeometry,mouthMaterial));
    group.userData.dispose = () => {sphere.dispose();yellow.dispose();ink.dispose();mouthGeometry.dispose();mouthMaterial.dispose();};
    return group;
  }
  function surfaceSmile(model,asset='') {
    const face=new THREE.Group();face.name='surface-smile';
    model.updateWorldMatrix(true,true);
    const inverse=model.matrixWorld.clone().invert(),bounds=new THREE.Box3(),meshes=[];
    model.traverse(node=>{if(node.isMesh){meshes.push(node);node.geometry.computeBoundingBox();bounds.union(node.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(node.matrixWorld)));}});
    if(bounds.isEmpty())return face;
    const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    const ray=new THREE.Raycaster(),direction=new THREE.Vector3(0,0,-1).transformDirection(model.matrixWorld);
    function surface(x,y){
      const origin=new THREE.Vector3(x,y,bounds.max.z+Math.max(1,size.z)).applyMatrix4(model.matrixWorld);
      ray.set(origin,direction);const hit=ray.intersectObjects(meshes,false)[0];
      return hit?model.worldToLocal(hit.point.clone()):null;
    }
    let middle=null;
    for(const y of /npc:|robot|cat|dog|bear|rabbit|bunny|pig|frog|duck|boy|girl|mom|dad/.test(asset)?[.82,.7,.5,.35]:[.62,.5,.75,.35]){middle=surface(center.x,bounds.min.y+size.y*y);if(middle)break;}
    if(!middle)return face;
    let span=Math.min(size.x*.32,size.y*.26);
    // Thin or curved models get a smaller fitted face, rather than a floating badge.
    for(let i=0;i<5;i++){if(surface(middle.x-span*.55,middle.y+span*.24)&&surface(middle.x+span*.55,middle.y+span*.24))break;span*=.7;}
    const ink=new THREE.MeshBasicMaterial({color:'#382d31',polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const sphere=new THREE.SphereGeometry(1,16,10),lift=Math.max(.008,span*.04);
    for(const x of [-.48,.48]){const point=surface(middle.x+x*span,middle.y+span*.25)||middle.clone();point.z+=lift;const eye=new THREE.Mesh(sphere,ink);eye.position.copy(point);eye.scale.set(span*.13,span*.19,lift);face.add(eye);}
    const points=Array.from({length:17},(_,i)=>{const x=(i/16-.5)*span*1.12,y=middle.y-span*.3+(x/span)**2*span*.75;const p=surface(middle.x+x,y)||new THREE.Vector3(middle.x+x,y,middle.z);p.z+=lift;return p;});
    const mouthGeometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,span*.07,8,false);
    face.add(new THREE.Mesh(mouthGeometry,ink));
    face.userData.dispose=()=>{sphere.dispose();mouthGeometry.dispose();ink.dispose();};
    return face;
  }
  function surfaceDirt(model) {
    const group=new THREE.Group();group.name='surface-dirt';model.updateWorldMatrix(true,true);
    const inverse=model.matrixWorld.clone().invert(),bounds=new THREE.Box3(),meshes=[];
    model.traverse(m=>{if(m.isMesh){meshes.push(m);m.geometry.computeBoundingBox();bounds.union(m.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(m.matrixWorld)));}});
    const geometry=new THREE.SphereGeometry(1,10,6),material=new THREE.MeshStandardMaterial({color:'#816247',roughness:1});
    const size=bounds.getSize(new THREE.Vector3()),ray=new THREE.Raycaster(),direction=new THREE.Vector3(0,0,-1).transformDirection(model.matrixWorld);
    if(!bounds.isEmpty())for(let n=0;n<14;n++){
      const x=bounds.min.x+size.x*(.15+(n*7%13)/13*.7),y=bounds.min.y+size.y*(.15+(n*5%11)/11*.65);
      ray.set(new THREE.Vector3(x,y,bounds.max.z+1).applyMatrix4(model.matrixWorld),direction);
      const hit=ray.intersectObjects(meshes,false)[0];if(!hit)continue;
      const patch=new THREE.Mesh(geometry,material),r=Math.max(.025,Math.min(size.x,size.y)*(.045+(n%3)*.012));
      patch.position.copy(model.worldToLocal(hit.point.clone()));patch.position.z+=.007;patch.scale.set(r,r*.7,.012);group.add(patch);
    }
    group.userData.dispose=()=>{geometry.dispose();material.dispose();};return group;
  }
  function sync(item, record) {
    if(item.wordEffects?.motion!==record.effects?.motion)item.wordMotionAge=0;
    item.wordEffects = record.effects || {};
    item.wordAttachment = record.attachment;
    item.wordIndex = Number(String(record.id||'').match(/-(\d+)$/)?.[1])||0;
    if (!item.effectRoot) {
      item.effectRoot = new THREE.Group(); item.effectRoot.name='word-effects';
      item.cueRoot=new THREE.Group();item.cueRoot.name='word-cues';
      item.anchor.add(item.cueRoot);item.cueRoot.add(item.effectRoot);item.effectRoot.add(item.model.group);owned.add(item);
    }
    if (item.wordEmotion !== item.wordEffects.emotion) {
      item.emotionBadge?.userData.dispose?.(); item.emotionBadge?.removeFromParent();
      item.wordEmotion = item.wordEffects.emotion;
      if (item.wordEmotion) {item.emotionBadge=item.wordEmotion==='happy'?surfaceSmile(item.model.group,record.asset):badge(item.wordEmotion);(item.wordEmotion==='happy'?item.model.group:item.anchor).add(item.emotionBadge);}
    }
    const kind=item.wordEffects.motion==='sleep'||item.wordEffects.emotion==='sleepy'?'z':item.wordEffects.symbol==='hum'?'note':item.wordEffects.symbol==='hot'?'steam':item.wordEffects.symbol==='new'?'star':item.wordEffects.symbol==='cold'?'snowflake':item.wordEffects.symbol==='hungry'?'food':item.wordEffects.symbol==='thirsty'?'drop':item.wordEffects.emotion==='yummy'?'heart':null;
    if(kind!==item.wordSymbolKind){
      for(const s of item.wordSymbols||[]){s.userData.dispose();s.removeFromParent();}
      item.wordSymbolKind=kind;item.wordSymbols=kind?Array.from({length:3},()=>createEventSymbol(kind)):[];
      for(const s of item.wordSymbols)item.anchor.add(s);
    }
    if(item.wordEffects.dirt&&!item.dirtPatches){item.dirtPatches=surfaceDirt(item.model.group);item.model.group.add(item.dirtPatches);}
    if(item.dirtPatches)item.dirtPatches.visible=Boolean(item.wordEffects.dirt);
    if(item.wordEffects.surface==='wet'&&!item.waterDrops){
      const root=new THREE.Group(),geometry=new THREE.SphereGeometry(.055,8,6),material=new THREE.MeshBasicMaterial({color:'#74bde3'});
      for(let i=0;i<5;i++){const drop=new THREE.Mesh(geometry,material);drop.scale.y=1.6;root.add(drop);}
      root.userData.dispose=()=>{geometry.dispose();material.dispose();};item.effectRoot.add(root);item.waterDrops=root;
    }
    if(item.waterDrops)item.waterDrops.visible=item.wordEffects.surface==='wet';
  }
  function cue(item, command) {
    if(command.cue==='cancel'){item.wordCue=null;item.wordDrop=null;item.wordFlyAway=null;item.cueRoot?.position.set(0,0,0);item.cueRoot?.rotation.set(0,0,0);item.cueRoot?.scale.setScalar(1);return;}
    if(command.cue==='mention')item.wordCue={age:0};
    if(command.cue==='put-in'){item.wordCue=null;item.wordDrop={age:0,target:command.target,start:item.anchor.position.clone()};}
    if(command.cue==='fly-away'){item.wordCue=null;item.wordDrop=null;item.wordFlyAway={age:0};}
  }
  function update(entries, dt, time, reduced) {
    for (const item of entries.values()) {
      const root = item.effectRoot; if (!root) continue;
      item.cueRoot.position.set(0,0,0);item.cueRoot.rotation.set(0,0,0);item.cueRoot.scale.setScalar(1);
      if(item.wordCue&&(item.entrance===undefined||item.entrance>=2)){
        const c=item.wordCue;c.age+=dt;
        const p=Math.min(1,c.age/.9),wave=Math.abs(Math.sin(p*Math.PI*2));
        item.cueRoot.position.y=reduced?0:wave*Math.min(.55,Math.max(.22,(item.modelTop||.7)*.42));
        item.cueRoot.scale.setScalar(1+(reduced?.06:.1)*wave);
        if(p>=1)item.wordCue=null;
      }
      if(item.wordFlyAway){
        const flight=item.wordFlyAway;flight.age+=dt;
        const p=Math.min(1,flight.age/1.25),ease=p*p*(3-2*p);
        item.cueRoot.position.set(reduced?0:3.8*ease,5.2*ease,reduced?0:1.1*ease);
        item.cueRoot.rotation.z=reduced?0:-p*1.25;
        item.cueRoot.scale.setScalar(Math.max(.05,1-.94*ease));
      }
      const e=item.wordEffects || {}, t=reduced?0:time*(e.speed==='fast'?1.9:e.speed==='slow'?.42:1);
      item.wordMotionAge=(item.wordMotionAge||0)+dt;
      const scalar=e.shape==='grow'?1.8:e.shape==='shrink'?.5:1;
      const target=new THREE.Vector3(e.stretch==='long'?1.9*scalar:scalar,e.stretch==='tall'?1.9*scalar:scalar,scalar);
      root.scale.lerp(target,reduced?1:1-Math.exp(-dt*2.8));
      root.position.set(0,0,0); root.rotation.set(0,0,0);
      if (e.motion==='jump') root.position.y=reduced?.3:Math.abs(Math.sin(t*3.8))*(e.altitude==='high'?1.8:.9);
      if (e.motion==='fly') {root.position.y=(e.altitude==='high'?2.3:1.4)+Math.sin(t*2)*.13;root.rotation.z=Math.sin(t*3)*.08;}
      if (e.motion==='swim') {root.position.x=Math.sin(t*1.4)*.55;root.rotation.z=Math.sin(t*3)*.15;root.rotation.x=.25;}
      if (e.motion==='walk' || e.motion==='run' || (e.motion==='run-stop'&&item.wordMotionAge<3)) {const running=e.motion!=='walk';root.position.x=Math.sin(t*(running?1.8:.7))*.8;root.position.y=Math.abs(Math.sin(t*8))*(running?.18:.07);root.rotation.z=Math.sin(t*6)*.07;}
      if (e.motion==='roll') {root.position.x=Math.sin(t)*.5;root.rotation.z=reduced?.3:-t*2;}
      if (e.gesture==='dance') {root.rotation.z+=Math.sin(t*5)*.25;root.position.y+=Math.abs(Math.sin(t*5))*.14;}
      if (e.gesture==='spin') root.rotation.y=reduced?.3:t*2.4;
      if (e.motion==='sail') {root.position.x=Math.sin(t*.7)*.8;root.rotation.z=Math.sin(t*1.5)*.08;}
      if (e.motion==='sleep') root.scale.y*=1+Math.sin(t*1.3)*.025;
      if(e.symbol==='cold'&&!reduced)root.rotation.z+=Math.sin(t*19)*.02;
      if (e.surface==='wet') {root.rotation.z+=Math.sin(t*16)*.015;}
      if(e.emotion==='funny')root.rotation.z+=Math.sin(t*4)*.13;
      if(item.waterDrops?.visible)item.waterDrops.children.forEach((drop,i)=>{drop.position.set(Math.sin(i*2)*.5,1.4-((t*.8+i*.23)%1.4),Math.cos(i*2)*.4);});
      if(e.palette==='rainbow') {let i=0;item.model.group.traverse(node=>{if(!node.isMesh)return;for(const mat of Array.isArray(node.material)?node.material:[node.material])if(mat.color){const hsl={};mat.color.getHSL(hsl);if(hsl.l>.18)mat.color.setHSL((i++*.13+t*.04)%1,.55,.65);}});}
      if(e.luminance==='glow')item.model.group.traverse(node=>{if(!node.isMesh)return;for(const mat of Array.isArray(node.material)?node.material:[node.material])if(mat.emissive)mat.emissiveIntensity=Math.max(mat.emissiveIntensity,.48+(reduced?0:Math.sin(time*3)*.13));});
      for(const [i,s] of (item.wordSymbols||[]).entries()){const age=reduced?i*.3:(time*.55+i*.32)%1;s.position.set(.25+age*.35,(item.modelTop||item.scale*1.3)*root.scale.y+.3+age*.8,0);s.scale.setScalar(.65+age*.35);s.quaternion.copy(item.anchor.quaternion).invert();}
      if(item.emotionBadge&&item.wordEmotion!=='happy') {item.emotionBadge.position.set(.4*item.scale,1.5*item.scale*root.scale.y+.35,0);item.emotionBadge.quaternion.copy(item.anchor.quaternion).invert();}
    }
    const done=new Set();
    function attach(item,depth=0) {
      if(done.has(item)||depth>20)return;
      done.add(item);
      const link=item.wordAttachment, target=link&&entries.get(link.target);if(!target){item.wordDrop=null;return;}
      attach(target,depth+1);
      const s=target.scale*(target.effectRoot?.scale.y||1);
      const offsets={on:[0,1.15,0],in:[item.wordIndex===0?0:(item.wordIndex%2?-.2:.2),.12,Math.floor(item.wordIndex/3)*.16],over:[0,2.2,0],beside:[1.1,0,0],near:[1.4,0,.3],head:[0,1.0,0],hair:[0,1.45,0],face:[0,.75,.4],'left-eye':[-.23,.85,.4],'right-eye':[.23,.85,.4],'middle-eye':[0,1.1,.4],nose:[0,.63,.43],mouth:[0,.4,.44],'left-ear':[-.45,.8,0],'right-ear':[.45,.8,0],'left-hand':[-.7,.5,0],'right-hand':[.7,.5,0],'left-foot':[-.3,-.05,.15],'right-foot':[.3,-.05,.15],tail:[0,.3,-.7]};
      const offset=new THREE.Vector3(...(offsets[link.slot]||offsets.on)).multiplyScalar(s).applyQuaternion(target.anchor.quaternion);
      if(link.slot==='on')offset.set(0,(target.modelTop||s)*(target.effectRoot?.scale.y||1),0).applyQuaternion(target.anchor.quaternion);
      item.anchor.position.copy(target.anchor.position).add(offset);
      if(target.effectRoot){const motion=target.effectRoot.position.clone().applyQuaternion(target.anchor.quaternion);item.anchor.position.add(motion);}
      if(target.cueRoot)item.anchor.position.add(target.cueRoot.position.clone().applyQuaternion(target.anchor.quaternion));
      if(item.wordDrop){
        const drop=item.wordDrop;
        if(reduced||drop.target!==link.target){item.wordDrop=null;}
        else if((item.entrance??2)<2||(target.entrance??2)<2){drop.start.copy(item.anchor.position).add(new THREE.Vector3(0,1.8,0));item.anchor.position.copy(drop.start);}
        else {
          drop.age+=dt;const destination=item.anchor.position.clone();
          const above=destination.clone().add(new THREE.Vector3(0,Math.max(1.5,(target.modelTop||.5)+.8),0));
          if(drop.age<.35){const p=drop.age/.35;item.anchor.position.lerpVectors(drop.start,above,1-(1-p)**3);}
          else {const p=Math.min(1,(drop.age-.35)/.65);item.anchor.position.lerpVectors(above,destination,p*p);if(p===1)item.wordDrop=null;}
        }
      }
      item.anchor.quaternion.copy(target.anchor.quaternion);
      item.anchor.visible=target.anchor.visible;
    }
    for(const item of entries.values())attach(item);
  }
  function remove(item){if(!item)return;for(const s of item.wordSymbols||[]){s.userData.dispose();s.removeFromParent();}item.emotionBadge?.userData.dispose?.();item.emotionBadge?.removeFromParent();item.dirtPatches?.userData.dispose();item.dirtPatches?.removeFromParent();item.waterDrops?.userData.dispose();item.waterDrops?.removeFromParent();owned.delete(item);}
  return {sync,cue,update,remove,dispose(){for(const item of owned)remove(item);}};
}
