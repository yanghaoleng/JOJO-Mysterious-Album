import { details } from '../model-details.js';
// 火箭筒: individually authored silhouette and fittings.
export function build(k) {
 const {part,group,THREE,moving,beam,color,cream,wood,gold,ink}=k;
 const {box,ball,cylinder,ring,panel,pivot,bolt}=details(k);

 const tube=cylinder('#809b7c',[0,.6,0],[.22,1.75,.22]);tube.rotation.z=Math.PI/2;
 for(const x of [-.85,.7]){const rim=ring(gold,[x,.6,0],.23);rim.rotation.y=Math.PI/2;}
 const nose=part('cone',cream,[1.02,.6,0],[.24,.42,.24]);nose.rotation.z=-Math.PI/2;
 box(wood,[-.22,.27,0],[.16,.5,.2]);box(ink,[.3,.89,0],[.22,.12,.1]);box(gold,[.3,1.01,0],[.12,.12,.05]);
 for(let i=0;i<4;i++){const band=ring(wood,[-.55+i*.14,.6,0],.225);band.rotation.y=Math.PI/2;}
 beam([-.64,.43,.12],[.4,.13,.12],.025,wood);
}
