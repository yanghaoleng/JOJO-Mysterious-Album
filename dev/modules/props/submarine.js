// 潜水艇: independent prefab using the shared material and geometry toolkit.
export function build({THREE,group,part,moving,beam,color,cream,wood,gold,ink}) {
  const wheels = () => { for(const x of [-.7,.7])for(const z of [-.46,.46])part("cylinder",ink,[x,.25,z],[.24,.14,.24]).rotation.x=Math.PI/2; };
  part("ball",color,[0,.55,0],[1.1,.5,.5]);part("box",cream,[0,1,0],[.5,.4,.4]);beam([0,1.1,0],[0,1.5,0],.07,ink);for(const x of [-.5,0,.5])part("ring",gold,[x,.6,.49],[.16,.16,.08]);
  // Each prop has a visible activation response on a child pivot, leaving landing independent.
  const pivot = new THREE.Group();
  for(const child of [...group.children]) pivot.add(child);
  group.add(pivot);
  moving(pivot, "slide", .18);
}
