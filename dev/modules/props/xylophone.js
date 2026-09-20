// 木琴: independent prefab using the shared material and geometry toolkit.
export function build({THREE,group,part,moving,beam,color,cream,wood,gold,ink}) {
  const wheels = () => { for(const x of [-.7,.7])for(const z of [-.46,.46])part("cylinder",ink,[x,.25,z],[.24,.14,.24]).rotation.x=Math.PI/2; };
  for(let i=0;i<7;i++)part("box",[color,gold,"#94b7c1","#d899aa"][i%4],[(i-3)*.22,.2,0],[.18,.2,.9-i*.07]);beam([-.7,.4,.35],[.7,.4,-.35],.035,wood);
  // Each prop has a visible activation response on a child pivot, leaving landing independent.
  const pivot = new THREE.Group();
  for(const child of [...group.children]) pivot.add(child);
  group.add(pivot);
  moving(pivot, "sway", .1);
}
