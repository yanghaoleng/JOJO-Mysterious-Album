// 直升机: independent prefab using the shared material and geometry toolkit.
export function build({THREE,group,part,moving,beam,color,cream,wood,gold,ink}) {
  const wheels = () => { for(const x of [-.7,.7])for(const z of [-.46,.46])part("cylinder",ink,[x,.25,z],[.24,.14,.24]).rotation.x=Math.PI/2; };
  part("ball",color,[0,.65,0],[.65,.5,.4]);beam([-.4,.7,0],[-1.35,1,0],.1,color);part("box",ink,[0,1.22,0],[2.5,.07,.14]);for(const z of [-.35,.35])beam([-.7,.1,z],[.7,.1,z],.06,ink);
  // Each prop has a visible activation response on a child pivot, leaving landing independent.
  const pivot = new THREE.Group();
  for(const child of [...group.children]) pivot.add(child);
  group.add(pivot);
  moving(pivot, "slide", .18);
}
