// Independent first-light prefab; resource ownership and cleanup are provided by the toolkit.
export function build({THREE,group,part,moving}) {
 group.userData.suspended=true;
 const star=new THREE.Group();star.position.y=2.5;group.add(star);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const ray=part('cone','#ebd68c',[Math.sin(a)*.2,Math.cos(a)*.2,0],[.16,.5,.10],star);ray.rotation.z=-a;}
 part('ball','#edda94',[0,0,0],[.23,.23,.12],star);
 for(const x of [-.09,.09])part('ball','#635f69',[x,.01,.13],[.045,.018,.025],star);
 moving(star,'sway',.3,3);
}
