// 披萨: independent prefab using the shared material and geometry toolkit.
export function build({THREE,group,part,moving,beam,color,cream,wood,gold,ink}) {
  const wheels = () => { for(const x of [-.7,.7])for(const z of [-.46,.46])part("cylinder",ink,[x,.25,z],[.24,.14,.24]).rotation.x=Math.PI/2; };
  part("cylinder",wood,[0,.12,0],[.85,.24,.85]);part("cylinder",gold,[0,.25,0],[.78,.06,.78]);for(let i=0;i<7;i++)part("cylinder","#c56954",[Math.cos(i)*.5,.3,Math.sin(i)*.5],[.14,.05,.14]);
  // Each prop has a visible activation response on a child pivot, leaving landing independent.
  const pivot = new THREE.Group();
  for(const child of [...group.children]) pivot.add(child);
  group.add(pivot);
  moving(pivot, "sway", .1);
}
