// 小黄鸭: independent prefab using the shared material and geometry toolkit.
export function build({THREE,group,part,moving,beam,color,cream,wood,gold,ink}) {
  const wheels = () => { for(const x of [-.7,.7])for(const z of [-.46,.46])part("cylinder",ink,[x,.25,z],[.24,.14,.24]).rotation.x=Math.PI/2; };
  part("ball",gold,[0,.35,0],[.6,.35,.4]);part("ball",gold,[.3,.8,0],[.3,.3,.3]);part("cone","#d78b53",[.64,.8,0],[.15,.35,.15]).rotation.z=-Math.PI/2;part("ball",ink,[.38,.87,.27],[.035,.035,.03]);
  // Each prop has a visible activation response on a child pivot, leaving landing independent.
  const pivot = new THREE.Group();
  for(const child of [...group.children]) pivot.add(child);
  group.add(pivot);
  moving(pivot, "sway", .1);
}
