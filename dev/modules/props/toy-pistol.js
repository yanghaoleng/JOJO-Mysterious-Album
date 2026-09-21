import { details } from '../model-details.js';
// 手枪: individually authored silhouette and fittings.
export function build(k) {
 const {part,group,THREE,moving,beam,color,cream,wood,gold,ink}=k;
 const {box,ball,cylinder,ring,panel,pivot,bolt}=details(k);

 panel([[-.7,.62],[.62,.62],[.7,.5],[.65,.3],[-.04,.3],[-.16,-.35],[-.5,-.35],[-.37,.3],[-.7,.3]],.23,color,[0,.43,0]);
 box(cream,[.02,.94,0],[1.15,.1,.25]);const muzzle=cylinder(gold,[.72,.87,0],[.13,.14,.13]);muzzle.rotation.z=Math.PI/2;
 box(ink,[-.12,1.02,0],[.1,.08,.07]);box(ink,[.51,1.02,0],[.055,.06,.065]);
 const guard=ring(wood,[0,.55,0],.18);guard.scale.x=1.35;
 for(let i=0;i<4;i++)box(ink,[-.3,.28+i*.075,.125],[.19,.023,.025]);
 bolt(-.52,.86,.13);bolt(.42,.86,.13);
}
