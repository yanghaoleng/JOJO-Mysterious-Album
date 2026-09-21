import { details } from '../model-details.js';
// 大炮: individually authored silhouette and fittings.
export function build(k) {
 const {part,group,THREE,moving,beam,color,cream,wood,gold,ink}=k;
 const {box,ball,cylinder,ring,panel,pivot,bolt}=details(k);

 for(const z of [-.38,.38]){const wheel=cylinder(wood,[0,.27,z],[.27,.09,.27]);wheel.rotation.x=Math.PI/2;for(let i=0;i<6;i++){let a=i*Math.PI/3;beam([0,.27,z],[Math.cos(a)*.25,.27+Math.sin(a)*.25,z],.018,gold);}}
 box(wood,[0,.36,0],[.6,.16,.7]);const barrel=cylinder(ink,[.18,.64,0],[.2,1.12,.2]);barrel.rotation.z=-Math.PI/2+.18;
 const muzzle=ring(gold,[.73,.74,0],.205);muzzle.rotation.y=Math.PI/2;ball(ink,[-.43,.08,.2],[.08,.08,.08]);
}
