// Script-owned model composition. These are ordinary world commands, never rendering code.
const spawn=(id,asset,position=[0,0],scale=1)=>({type:'entity.spawn',id:`fl-${id}`,asset:`prop:${asset}`,position,scale});
const remove=id=>({type:'entity.remove',id:`fl-${id}`});
const sky=asset=>spawn('sky',asset,[0,-.6],1.2);
const floating=asset=>spawn('floating',asset,[0,-.6],1.2);
const skyChoices={
  '粉色天空里有小鱼':[sky('pink-sky'),floating('sky-fish')],
  '粉色天空里有棉花糖':[sky('pink-sky'),floating('cotton-cloud')],
  '彩虹色天空里有小鱼':[sky('rainbow-sky'),floating('sky-fish')],
  '彩虹色天空里有棉花糖':[sky('rainbow-sky'),floating('cotton-cloud')],
  '粉色':[sky('pink-sky')],
  '彩虹色':[sky('rainbow-sky')],
  '小鱼':[floating('sky-fish')],
  '棉花糖':[floating('cotton-cloud')],
};
export const FIRST_LIGHT_MODEL_BEATS = {
  'first-sound': {enter:[spawn('star','sleepy-star',[-1.3,0],.65),spawn('torch','light-torch',[-1.6,1.5],.75),spawn('seed','light-seed',[.2,1.1],.9)]},
  'voice-light': {choices:{'为什么天是蓝的？':[sky('blue-sky')],'为什么鱼会游泳？':[floating('sky-fish')]}},
  'gugu-feeling': {choices:skyChoices},
  'garden-response': {answer:[remove('seed'),spawn('sprout','light-sprout',[1.1,1.4],1.15),spawn('trail','light-trail',[.1,1],1),spawn('thread','light-thread',[1.1,1.4],.85),spawn('bobo','bobo-light',[1.1,1.4],.9)]},
  'first-light-page': {enter:[spawn('book','light-book',[-.4,2],.85)]},
};
export function firstLightSky(answer='') {
  const color=/彩虹|七彩|七种/.test(answer)?'彩虹色':/粉/.test(answer)?'粉色':'';
  const thing=/鱼/.test(answer)?'小鱼':/棉花糖/.test(answer)?'棉花糖':'';
  return {color,thing};
}
export function firstLightModelEvents(id){
  const beat=FIRST_LIGHT_MODEL_BEATS[id]||{};
  return [
    ...(beat.enter?[{id:`models-enter-${id}`,on:'scene.enter',effects:beat.enter}]:[]),
    ...(beat.answer?[{id:`models-answer-${id}`,on:'answer.accepted',effects:beat.answer}]:[]),
    ...Object.entries(beat.choices||{}).map(([label,effects],i)=>({id:`models-choice-${id}-${i}`,on:'answer.accepted',when:{modelChoice:label},effects})),
  ];
}
export function firstLightModelChoice(scene,answer){
  if(scene.id==='gugu-feeling'){
    const {color,thing}=firstLightSky(answer);
    return color && thing ? `${color}天空里有${thing}` : color || thing;
  }
  if(scene.id==='voice-light')return /鱼/.test(answer)?'为什么鱼会游泳？':/天|蓝/.test(answer)?'为什么天是蓝的？':'';
  return '';
}
// Reconstruct the same composition from stable scene IDs and saved answers.
export function firstLightWorldCommands(story,scene,entries){
  const objects=new Map();
  for(const beat of story.scenes.slice(0,story.scenes.findIndex(s=>s.id===scene.id)+1)){
    const entry=entries.find(e=>e.id===beat.id);
    for(const event of beat.events||[]){
      if(!event.id.startsWith('models-'))continue;
      if(event.on==='answer.accepted' && (!entry || event.when?.modelChoice && event.when.modelChoice!==firstLightModelChoice(beat,entry.answer)))continue;
      for(const effect of event.effects){
        if(effect.type==='entity.spawn')objects.set(effect.id,effect);
        if(effect.type==='entity.remove')objects.delete(effect.id);
      }
    }
  }
  return [...objects.values()];
}
