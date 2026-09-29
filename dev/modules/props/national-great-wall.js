export function build({part,moving}) {
  for(let i=-2;i<=2;i++){
    const x=i*.43,y=.48+Math.abs(i)*.06;
    part('box','#a79883',[x,y,0],[.44,.72,.38]);
    for(const z of [-.2,.2])part('box','#c4b7a2',[x,y+.46,z],[.23,.21,.12]);
    for(let row=0;row<3;row++)part('box','#877d70',[x,y-.23+row*.2,.198],[.4,.018,.014]);
  }
  for(const x of [-1.05,1.05]){
    const tower=part('box','#b6a58c',[x,.78,0],[.55,1.35,.6]);
    part('box','#4a5151',[x,.91,.305],[.13,.26,.02]);
    for(const dx of [-.2,.2])for(const z of [-.23,.23])part('box','#d4c5ab',[x+dx,1.51,z],[.15,.22,.15]);
    moving(tower,'bounce',.015,.7);
  }
}
