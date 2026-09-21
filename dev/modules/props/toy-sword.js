import { details } from '../model-details.js';
// 宝剑: individually authored silhouette and fittings.
export function build(k) {
 const {part,group,THREE,moving,beam,color,cream,wood,gold,ink}=k;
 const {box,ball,cylinder,ring,panel,pivot,bolt}=details(k);

 panel([[-.11,.45],[-.16,1.32],[0,1.65],[.16,1.32],[.11,.45]],.065,'#aac1c7');
 panel([[0,.49],[0,1.59],[.09,1.3],[.065,.49]],.075,cream);
 box(gold,[0,.43,0],[.68,.1,.16]);for(const x of [-.33,.33])ball(gold,[x,.48,0],[.08,.1,.09]);
 cylinder(wood,[0,.23,0],[.08,.32,.08]);ball(color,[0,.07,0],[.13,.08,.13]);bolt(0,.43,.09);
}
