import { details } from '../model-details.js';
// 悠悠球: individually authored silhouette and fittings.
export function build(k) {
 const {part,group,THREE,moving,beam,color,cream,wood,gold,ink}=k;
 const {box,ball,cylinder,ring,panel,pivot,bolt}=details(k);

 for(const z of [-.13,.13]){const disc=cylinder(color,[0,.38,z],[.37,.16,.37]);disc.rotation.x=Math.PI/2;const rim=ring(gold,[0,.38,z*1.65],.28);part('star',cream,[0,.38,z*1.7],[.15,.15,.03]);}
 beam([0,.38,0],[.26,1.3,0],.012,wood);ring(wood,[.3,1.36,0],.09);
}
