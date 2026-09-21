// Independent first-light prefab; resource ownership and cleanup are provided by the toolkit.
export function build({THREE,group,part,moving}) {
 part('box','#91afa9',[0,.14,0],[1.35,.14,.93]);
 const page=new THREE.Group();page.position.set(-.61,.24,0);group.add(page);
 part('box','#fff5d9',[.6,0,0],[1.2,.04,.82],page);
 for(let i=0;i<3;i++)part('box','#c2b892',[.59,.026,.15+i*.10],[.62,.015,.025],page);
 part('star','#e8c263',[.60,.04,-.20],[.14,.02,.14],page);moving(page,'swing',.65,1.3);
}
