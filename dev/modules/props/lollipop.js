// 棒棒糖: independent prefab using the shared material and geometry toolkit.
export function build({THREE,group,part,moving,beam,color,cream,wood,gold,ink}) {
  const wheels = () => { for(const x of [-.7,.7])for(const z of [-.46,.46])part("cylinder",ink,[x,.25,z],[.24,.14,.24]).rotation.x=Math.PI/2; };
  beam([0,.05,0],[0,1.1,0],.05,cream);part("ball","#dc9cad",[0,1.25,0],[.48,.48,.15]);part("ring",cream,[0,1.25,.15],[.28,.28,.1]);
  // Each prop has a visible activation response on a child pivot, leaving landing independent.
  const pivot = new THREE.Group();
  for(const child of [...group.children]) pivot.add(child);
  group.add(pivot);
  moving(pivot, "sway", .1);
}
