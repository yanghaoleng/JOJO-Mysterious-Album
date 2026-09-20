// 汉堡: independent prefab using the shared material and geometry toolkit.
export function build({THREE,group,part,moving,beam,color,cream,wood,gold,ink}) {
  const wheels = () => { for(const x of [-.7,.7])for(const z of [-.46,.46])part("cylinder",ink,[x,.25,z],[.24,.14,.24]).rotation.x=Math.PI/2; };
  part("ball",wood,[0,.7,0],[.65,.3,.65]);part("cylinder","#754f3d",[0,.36,0],[.63,.2,.63]);part("box","#91a46d",[0,.5,0],[1.2,.08,1.2]);part("cylinder",wood,[0,.14,0],[.64,.25,.64]);
  // Each prop has a visible activation response on a child pivot, leaving landing independent.
  const pivot = new THREE.Group();
  for(const child of [...group.children]) pivot.add(child);
  group.add(pivot);
  moving(pivot, "sway", .1);
}
