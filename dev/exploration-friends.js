import * as THREE from '../vendor/three.module.js';
import { createActor } from './presentation/actor-factory.js';
import { createEncounterDialog } from './presentation/encounter-dialog.js';
import { getNpc } from '../src/story-npcs/catalog.js';
import { FOUR } from './content/yellow-friends.js';
import { encountersFor, ENCOUNTER_PLACES } from './encounter-catalog.js';
import { createCreationModel } from './creation-models.js';

const UP = new THREE.Vector3(0,1,0);
export function createExplorationFriends(stage, { storyId, canInteract = () => true, onInteraction = () => {}, onSpeech = () => {}, onEvent = () => {}, onCommands }) {
  const world = stage.world, root = new THREE.Group(); root.name = 'curiosity-friends'; stage.scene.add(root);
  const actors = [], creations = [], obstacles = [];
  let active = null, time = 0;
  const view = createEncounterDialog({onClose:finish});
  function finish() {
    if(!active)return;active.cooldown=time+10;active=null;view.hide();onInteraction(false);
  }
  function animateActor(id,action,expression='happy',duration=3) {
    const item=actors.find(n=>n.config.id===id&&n.present);
    if(!item)return false;
    item.action=action;item.actor.setAction(action);item.actor.setExpression(expression);item.actionUntil=time+duration;return true;
  }
  function activate(id) { const item=actors.find(n=>n.config.id===id&&n.present)||actors.find(n=>n.config.id===id);item?.props.forEach(p=>p.trigger());return Boolean(item); }
  function open(item) {
    if(active || !canInteract())return;
    active=item;item.count++;onInteraction(true);
    view.show(item.config,choice=>{
      onSpeech(choice.response,item.config);
      const effects=choice.effects||[{type:'actor.animate',target:item.config.id,animation:choice.action,expression:'happy'},{type:'encounter.activate',target:item.config.id}];
      if(onCommands)onCommands(effects);else{animateActor(item.config.id,choice.action);activate(item.config.id);}
      onEvent('encounter.choice',{npcId:item.config.id,choiceId:choice.id||choice.label});
    });
    onSpeech(item.config.greeting,item.config);
    onEvent('encounter.enter',{npcId:item.config.id});
  }
  function station(config, normal, propKinds=[config.prop], color) {
    const anchor=new THREE.Group();anchor.position.copy(world.planet.center).addScaledVector(normal,world.planet.radius+.03);anchor.quaternion.setFromUnitVectors(UP,normal);root.add(anchor);
    const actor=createActor({asset:config.yellow?config.id:`npc:${config.id}`},.7);
    actor.group.position.x=-.5;anchor.add(actor.group);
    const props=propKinds.map((kind,i)=>{const prop=createCreationModel(kind,color);prop.group.scale.setScalar(.57);prop.group.position.set(.6+(i%2)*.85,0,Math.floor(i/2)*.85);anchor.add(prop.group);return prop;});
    const item={config,normal,anchor,actor,props,inside:false,count:0,cooldown:0,actionUntil:0,action:'hop',present:true};
    anchor.userData.encounter=item;actors.push(item);obstacles.push({normal,radius:propKinds.length>1?1.65:1.15});stage.style.apply(anchor);return item;
  }
  encountersFor(storyId,world.group.userData.worldId).forEach((config,i)=>station(config,world.surfaceNormal(...ENCOUNTER_PLACES[i])));
  function setCreations(records=[]) {
    for(const item of creations){if(active===item)finish();item.actor.dispose();item.props.forEach(p=>p.dispose());item.anchor.removeFromParent();actors.splice(actors.indexOf(item),1);const i=obstacles.findIndex(o=>o.normal===item.normal);if(i>=0)obstacles.splice(i,1);}creations.length=0;
    for(const record of records.slice(-12)) {
      if(!Array.isArray(record.normal)||record.normal.length!==3||!record.normal.every(Number.isFinite)||!Array.isArray(record.parts))continue;
      const yellow=typeof record.helper==='string' && record.helper.startsWith('yellow:') && FOUR.find(n=>`yellow:${n.id}`===record.helper);
      const helper=yellow ? {id:record.helper,name:yellow.name,sampleLine:'这件新作品真有意思，一起试试吧。'} : getNpc(record.helper)||getNpc('baozai');
      const item=station({id:helper.id,name:helper.name,yellow:Boolean(yellow),occupation:`试用${record.name}`,greeting:`你做的${record.name}还在这里。要不要再试一下？`,choices:[{label:'试试我的作品',response:record.response,action:'hop'},{label:'和伙伴打招呼',response:`我是${helper.name}。${helper.sampleLine}`,action:'wave'}]},new THREE.Vector3(...record.normal).normalize(),record.parts,record.primary);
      item.creationId=record.id;creations.push(item);
    }
    // A summoned friend moves to the latest work, instead of appearing twice on one planet.
    const present = new Set();
    for(const item of [...actors].reverse()){item.present=!present.has(item.config.id);item.actor.group.visible=item.present;present.add(item.config.id);}
  }
  return { root,obstacles,setCreations,animateActor,activate,get active(){return Boolean(active);},
    showCreation(id){const item=creations.find(n=>n.creationId===id);item?.props.forEach(p=>p.trigger());if(item){item.action='hop';item.actor.setAction('hop');item.actionUntil=time+4;}},
    creationNormal(id){return creations.find(n=>n.creationId===id)?.normal;},
    pick(raycaster, playerNormal, walk){
      const hit=raycaster.intersectObject(root,true)[0];let obj=hit?.object;while(obj&&!obj.userData.encounter)obj=obj.parent;
      const surface=raycaster.ray.intersectSphere(new THREE.Sphere(world.planet.center,world.planet.radius),new THREE.Vector3());
      if(hit&&surface&&hit.distance>raycaster.ray.origin.distanceTo(surface)+.2)return false;
      if(!obj)return false;const item=obj.userData.encounter;
      if(!item.present&&!item.creationId)return false;
      if(playerNormal.angleTo(item.normal)*world.planet.radius<2.7)open(item);else walk(item.normal);return true;
    },
    update(dt,normal,moving){
      time+=dt;
      for(const item of actors){
        item.actor.setAction(item.actionUntil>time?item.action:active===item?'talk':'idle');item.actor.update(stage.reduced?0:time,dt);item.props.forEach(p=>p.update(dt,stage.reduced,true));
        const distance=normal.angleTo(item.normal)*world.planet.radius;
        if(distance>3.1)item.inside=false;
        if(distance<2.5&&!item.inside&&moving&&(item.present||item.creationId)&&time>item.cooldown&&canInteract()&&!active){item.inside=true;open(item);}
      }
    },
    get stats(){return actors.map(item=>{const p=new THREE.Box3().setFromObject(item.actor.group).getCenter(new THREE.Vector3()).project(stage.camera),r=stage.container.getBoundingClientRect();return {id:item.config.id,name:item.config.name,present:item.present,prop:item.props.map(p=>p.kind),normal:item.normal.toArray(),count:item.count,creationId:item.creationId||null,screen:{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2}};});},
    dispose(){finish();view.dispose();actors.forEach(item=>{item.actor.dispose();item.props.forEach(p=>p.dispose());});root.removeFromParent();},
  };
}
