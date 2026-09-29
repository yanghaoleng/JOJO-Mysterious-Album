export function build({THREE,group,part,moving}) {
  const bag=new THREE.Group();group.add(bag);
  part('box','#d79b56',[0,.65,0],[.95,1.12,.44],bag);
  for(const x of [-.3,.3])part('box','#f0ca80',[x,.65,.235],[.055,1.05,.025],bag);
  part('box','#6b665e',[0,1.27,0],[.35,.08,.13],bag);
  for(const x of [-.17,.17])part('box','#6b665e',[x,1.19,0],[.06,.18,.13],bag);
  for(const x of [-.32,.32])part('ball','#555a59',[x,.1,0],[.1,.1,.1],bag);
  moving(bag,'sway',.07,1.5);
}
