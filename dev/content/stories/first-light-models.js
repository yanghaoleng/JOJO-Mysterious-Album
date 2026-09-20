// Script-owned model composition. These are ordinary world commands, never rendering code.
const spawn=(id,asset,position=[0,0],scale=1)=>({type:'entity.spawn',id:`fl-${id}`,asset:`prop:${asset}`,position,scale});
const remove=id=>({type:'entity.remove',id:`fl-${id}`});
const sky=asset=>[spawn('sky',asset,[0,-.6],1.2)];
const floating=asset=>[spawn('floating',asset,[0,-.6],1.2)];
export const FIRST_LIGHT_MODEL_BEATS = {
 'room-hello': {enter:[spawn('star','sleepy-star',[-1.3,0],.65),spawn('torch','light-torch',[-1.6,1.5],.75)]},
 'world-name': {enter:[spawn('seed','light-seed',[.2,1.1],.9)]},
 'voice-light': {choices:{'为什么天是蓝的？':sky('blue-sky'),'为什么鱼会游泳？':floating('sky-fish')}},
 'gugu-feeling': {choices:{'粉色':sky('pink-sky'),'彩虹色':sky('rainbow-sky')}},
 'gugu-question': {enter:[spawn('seed','light-sprout',[.2,1.1],.9)],choices:{'棉花糖':floating('cotton-cloud'),'小鱼':floating('sky-fish')}},
 'gugu-key': {choices:{'想看看远方':[spawn('trail','light-trail',[.1,1],1)],'想和星星做朋友':[spawn('friends','star-friends',[0,-.6],1.2)]}},
 'garden-response': {answer:[spawn('seed','light-sprout',[1.1,1.4],1.15),spawn('trail','light-trail',[.1,1],1)]},
 'first-color': {answer:[spawn('thread','light-thread',[1.1,1.4],.85)]},
 'shell-invitation': {enter:[remove('seed'),spawn('bobo','bobo-light',[1.1,1.4],.9)]},
 'first-light-page': {enter:[spawn('book','light-book',[-.4,2],.85)]},
};
export function firstLightModelEvents(id){
 const beat=FIRST_LIGHT_MODEL_BEATS[id]||{};
 return [
  ...(beat.enter?[{id:`models-enter-${id}`,on:'scene.enter',effects:beat.enter}]:[]),
  ...(beat.answer?[{id:`models-answer-${id}`,on:'answer.accepted',effects:beat.answer}]:[]),
  ...Object.entries(beat.choices||{}).map(([label,effects],i)=>({id:`models-choice-${id}-${i}`,on:'answer.accepted',when:{modelChoice:label},effects})),
 ];
}
export function firstLightModelChoice(scene,answer){
 const labels=Object.keys(FIRST_LIGHT_MODEL_BEATS[scene.id]?.choices||{});
 if(labels.includes(answer))return answer;
 if(scene.id==='gugu-feeling')return /彩虹|七彩|七种/.test(answer)?'彩虹色':/粉/.test(answer)?'粉色':'';
 if(scene.id==='gugu-question')return /鱼/.test(answer)?'小鱼':/棉花糖/.test(answer)?'棉花糖':'';
 if(scene.id==='gugu-key')return /星星|朋友/.test(answer)?'想和星星做朋友':/远|旅行/.test(answer)?'想看看远方':'';
 if(scene.id==='voice-light')return /鱼/.test(answer)?'为什么鱼会游泳？':/天|蓝/.test(answer)?'为什么天是蓝的？':'';
 return '';
}
// Reconstruct the same composition from stable scene IDs and saved answers.
// Reading authored events also keeps editor changes in the rendering path.
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
