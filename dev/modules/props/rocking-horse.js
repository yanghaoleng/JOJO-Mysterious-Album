// 木马: independent prefab using the shared material and geometry toolkit.
export function build({THREE,group,part,moving,beam,color,cream,wood,gold,ink}) {
  const wheels = () => { for(const x of [-.7,.7])for(const z of [-.46,.46])part("cylinder",ink,[x,.25,z],[.24,.14,.24]).rotation.x=Math.PI/2; };
  part("ball",wood,[0,.7,0],[.65,.3,.3]);part("box",wood,[.45,1.15,0],[.25,.8,.3]);part("ball",wood,[.62,1.5,0],[.35,.2,.2]);for(const x of [-.4,.4])for(const z of [-.2,.2])beam([x,.6,z],[x,.15,z],.06,wood);for(const z of [-.3,.3])part("ball",color,[0,.1,z],[.95,.1,.08]);
  // Each prop has a visible activation response on a child pivot, leaving landing independent.
  const pivot = new THREE.Group();
  for(const child of [...group.children]) pivot.add(child);
  group.add(pivot);
  moving(pivot, "sway", .1);
}
