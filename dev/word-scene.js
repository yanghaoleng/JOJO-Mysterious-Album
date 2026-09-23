// Separate ownership without changing the shared world's save format.
export const isDemonstration = id => String(id).startsWith('demo-');
export function wordSceneEntities(entities, owner='player') {
  return Object.fromEntries(Object.entries(entities).filter(([id])=>isDemonstration(id)===(owner==='demo')));
}

// New objects sample different, well-spaced landing spots; edits retain their position.
export function scatterWordSpawns(commands, entities, random=Math.random, isAvailable=()=>true) {
  const occupied=Object.values(entities).filter(e=>!e.attachment).map(e=>({position:e.position,scale:e.scale||.7}));
  const attached=new Set(commands.filter(c=>c.type==='entity.attach').map(c=>c.id));
  return commands.map(command=>{
    if(command.type!=='entity.spawn'||entities[command.id])return command;
    const demo=isDemonstration(command.id),scale=command.scale||.7;
    let best=null,bestGap=-Infinity;
    for(let i=0;i<100;i++){
      const position=[(demo?-2.6:.4)+random()*2.2,.35+random()*2.4];
      if(!attached.has(command.id)&&!isAvailable(position,scale))continue;
      const gap=occupied.length?Math.min(...occupied.map(e=>Math.hypot(position[0]-e.position[0],position[1]-e.position[1])-.65*(scale+e.scale))):1;
      if(gap>bestGap){best=position;bestGap=gap;}
      if(gap>.5)break;
    }
    best ||= [(demo?-.8:.8)+(random()-.5)*.3,.6+random()*.4];
    if(!attached.has(command.id))occupied.push({position:best,scale});
    return {...command,position:best};
  });
}
export function unknownWordCommands(){
  return [{type:'entity.spawn',id:`wg-surprise-${crypto.randomUUID()}`,asset:'prop:rword-poop',position:[0,0],scale:.65}];
}
// A remote proposal may only address the child's objects; it cannot reach the demo.
export function playerWordProposal(commands){
  return commands.filter(c=>!isDemonstration(c.id)&&!isDemonstration(c.target)&&
    !['targets','eaters','foods'].some(key=>c[key]?.some(isDemonstration)));
}
