// Independent first-light prefab; resource ownership and cleanup are provided by the toolkit.
export function build({THREE,group,part,moving}) {
  group.userData.suspended=true;
  for(let i=0;i<3;i++){
    const cotton=new THREE.Group();cotton.position.set((i-1)*1.08,3+(i%2)*.24,.08);group.add(cotton);
    const stick=part('cylinder','#f8e5c5',[0,-.44,0],[.035,.66,.035],cotton);stick.rotation.z=-.18;
    for(let j=0;j<5;j++)part('ball',j%2?'#fce5ed':'#efb8d2',[Math.cos(j*1.25)*.19,Math.sin(j*1.25)*.22,0],[.27,.28,.22],cotton);
    moving(cotton,'sway',.22,1.4+i*.2);
  }
}
