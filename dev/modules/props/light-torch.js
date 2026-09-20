// Independent first-light prefab; resource ownership and cleanup are provided by the toolkit.
export function build({THREE,group,part,moving}) {
 const torch=new THREE.Group();group.add(torch);
 part('cylinder','#8aafb0',[0,.48,0],[.15,.78,.15],torch);
 part('cylinder','#d7b873',[0,.92,0],[.25,.18,.25],torch);
 part('cylinder','#fff0aa',[0,1.04,0],[.22,.05,.22],torch);
 for(let i=0;i<5;i++)part('star','#fff0af',[Math.sin(i*1.7)*.24,1.23+i*.11,0],[.06,.06,.04],torch);
 moving(torch,'sway',.32,5);
}
