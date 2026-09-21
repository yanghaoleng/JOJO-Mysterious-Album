import { details } from '../model-details.js';
// 飞碟: individually authored silhouette and fittings.
export function build(k) {
 const {part,group,THREE,moving,beam,color,cream,wood,gold,ink}=k;
 const {box,ball,cylinder,ring,panel,pivot,bolt}=details(k);

 const hull=pivot([0,.48,0]);
 ball(color,[0,0,0],[1.05,.22,1.05],hull);ball(cream,[0,.1,0],[.72,.2,.72],hull);
 ball('#83b9bd',[0,.3,0],[.43,.33,.43],hull);
 const rim=ring(gold,[0,0,0],.96,hull);rim.rotation.x=Math.PI/2;
 for(let i=0;i<10;i++){let a=i*Math.PI/5;ball(i%2?gold:'#99c5bd',[Math.cos(a)*.87,-.02,Math.sin(a)*.87],[.085,.055,.085],hull);}
 for(let i=0;i<3;i++){let a=i*Math.PI*2/3;beam([Math.cos(a)*.55,.45,Math.sin(a)*.55],[Math.cos(a)*.73,.09,Math.sin(a)*.73],.04,ink);ball(ink,[Math.cos(a)*.73,.07,Math.sin(a)*.73],[.16,.06,.16]);}
 moving(hull,'turn',.22);
}
