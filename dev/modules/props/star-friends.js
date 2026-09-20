// Independent first-light prefab; resource ownership and cleanup are provided by the toolkit.
export function build({THREE,group,part,moving}) {
 group.userData.suspended=true;
 for(let i=0;i<5;i++){
 const friend=new THREE.Group();friend.position.set((i-2)*.65,3.55+Math.sin(i*1.5)*.22,.4);group.add(friend);
 for(let j=0;j<5;j++){const a=j*Math.PI*2/5;const ray=part('cone','#ffe29b',[Math.sin(a)*.08,Math.cos(a)*.08,0],[.065,.21,.05],friend);ray.rotation.z=-a;}
 for(const x of [-.045,.045])part('ball','#756351',[x,0,.055],[.018,.025,.015],friend);
 moving(friend,'bounce',.2,1.5+i*.3);
 }
}
