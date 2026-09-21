// 泰迪熊: independent prefab using the shared material and geometry toolkit.
export function build({THREE,group,part,moving,beam,color,cream,wood,gold,ink}) {
  const wheels = () => { for(const x of [-.7,.7])for(const z of [-.46,.46])part("cylinder",ink,[x,.25,z],[.24,.14,.24]).rotation.x=Math.PI/2; };
  part("ball",wood,[0,.4,0],[.4,.4,.3]);part("ball",wood,[0,.95,0],[.42,.4,.3]);for(const x of [-.32,.32]){part("ball",wood,[x,1.25,0],[.16,.16,.12]);part("ball",cream,[x,.15,.15],[.2,.15,.2]);part("ball",ink,[x*.4,1,.29],[.035,.04,.02]);}part("ball",cream,[0,.83,.29],[.18,.12,.08]);
  // Each prop has a visible activation response on a child pivot, leaving landing independent.
  const pivot = new THREE.Group();
  for(const child of [...group.children]) pivot.add(child);
  group.add(pivot);
  moving(pivot, "sway", .1);
}
