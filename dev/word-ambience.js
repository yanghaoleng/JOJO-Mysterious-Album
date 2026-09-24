// Small, finite performances. All world changes pass through the same command gateway.
export function createWordAmbience({entities,send,occupied=()=>[],canAct=()=>true,reduced=()=>false,camera=()=>{},random=Math.random,now=Date.now}) {
  const protectedUntil=new Map();let lease=null,nextAction=now()+15000,nextWeather=now()+5000,weather='clear',cameraAt=0,manualUntil=0,disposed=false,sequence=0;
  const participants=commands=>new Set(commands.flatMap(c=>[c.id,c.target,...(c.targets||[]),...(c.eaters||[]),...(c.foods||[])].filter(Boolean)));
  function release(){if(!lease)return;const old=lease;lease=null;const current=entities();send([{type:'feeding.stop',eaters:old.ids.filter(id=>current[id])},...old.ids.filter(id=>current[id]).map(id=>({type:'entity.move',id,position:current[id].position}))].filter(c=>c.type!=='feeding.stop'||c.eaters.length));}
  function before(commands){release();const at=now();for(const id of participants(commands))protectedUntil.set(id,at+15000);nextAction=at+12000;}
  function observe(commands){const at=now();const w=commands.findLast(c=>c.type==='weather.set');if(w){weather=w.preset;nextWeather=at+90000;}
    if(!reduced()&&at>=manualUntil&&at-cameraAt>4500&&commands.some(c=>['entity.spawn','entity.event','entity.effect','group.stack','feeding.start','group.patrol'].includes(c.type))){cameraAt=at;camera(sequence++%3);}
  }
  function tick(){if(disposed)return;const at=now();if(lease&&at>=lease.until)release();if(!canAct())return;
    if(at>=nextWeather){const presets=['clear','rain','snow'].filter(w=>w!==weather);weather=presets[Math.floor(random()*presets.length)];send([{type:'weather.set',preset:weather}]);nextWeather=at+45000+random()*30000;}
    if(reduced()||lease||at<nextAction)return;nextAction=at+12000+random()*8000;
    const all=Object.values(entities()),blocked=new Set(occupied());for(const [id,until]of protectedUntil)if(until<=at)protectedUntil.delete(id);
    const free=e=>!e.id.startsWith('demo-')&&!e.attachment&&!blocked.has(e.id)&&!protectedUntil.has(e.id)&&!['sleepy'].includes(e.effects?.emotion)&&(!e.effects?.motion||e.effects.motion==='stop')&&!e.effects?.gesture;
    const actors=all.filter(e=>free(e)&&(/^(npc:|yellow:|actor:)/.test(e.asset)||/^prop:(rword-)?(cat|dog|duck|bird|hen|pig|bear|rabbit|bunny|frog|fox|rat|cub|teddy|robot|turtle|octopus|jellyfish|starfish|hedgehog|penguin|seal|walrus)$/.test(e.asset)));
    if(!actors.length)return;const actor=actors[Math.floor(random()*actors.length)],foods=all.filter(e=>free(e)&&/^prop:(rword-)?(apple|nut|cake|bread|banana|carrot|cookie|hamburger|acorn)$/.test(e.asset));
    const choice=Math.floor(random()*4);let commands,ids=[actor.id];
    if(choice===2&&foods.length){const food=foods[Math.floor(random()*foods.length)];ids.push(food.id);commands=[{type:'feeding.start',eaters:[actor.id],foods:[food.id]}];}
    else if(choice===3&&actors.length>1){const other=actors.find(e=>e.id!==actor.id);ids.push(other.id);commands=[{type:'group.stack',targets:ids}];}
    else if(choice===0&&!actor.asset.startsWith('prop:'))commands=[{type:'entity.animate',id:actor.id,animation:'wave'}];
    else commands=[{type:'group.patrol',targets:ids,speed:.28,distance:.65}];
    if(send(commands)?.ok){lease={ids,until:at+7000};observe(commands);for(const id of ids)protectedUntil.set(id,at+22000);}
  }
  return {before,observe,tick,pause:release,manual(){manualUntil=now()+15000;},dispose(){release();disposed=true;protectedUntil.clear();},get status(){return {weather,active:lease?.ids||[],nextWeather,nextAction};}};
}
