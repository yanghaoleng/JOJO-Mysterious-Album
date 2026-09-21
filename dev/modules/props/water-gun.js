import { details } from '../model-details.js';
// 水枪: individually authored silhouette and fittings.
export function build(k) {
 const {part,group,THREE,moving,beam,color,cream,wood,gold,ink}=k;
 const {box,ball,cylinder,ring,panel,pivot,bolt}=details(k);

 panel([[-.65,.45],[.58,.45],[.75,.65],[.65,.87],[-.55,.87]],.25,color);
 box(gold,[.81,.67,0],[.22,.16,.18]);ball('#8bc3c9',[-.22,1.02,0],[.45,.22,.21]);cylinder(cream,[-.22,1.24,0],[.1,.08,.1]);
 box(wood,[-.25,.23,0],[.19,.4,.2]).rotation.z=-.16;ring(gold,[.05,.39,0],.14);for(let i=0;i<3;i++)bolt(.02+i*.16,.65,.15);
}
