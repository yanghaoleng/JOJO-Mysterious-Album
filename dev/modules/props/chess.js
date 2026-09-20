import { details } from '../model-details.js';
// 国际象棋: individually authored silhouette and fittings.
export function build(k) {
 const {part,group,THREE,moving,beam,color,cream,wood,gold,ink}=k;
 const {box,ball,cylinder,ring,panel,pivot,bolt}=details(k);

 box(wood,[0,.06,0],[1.55,.12,1.55]);for(let x=0;x<8;x++)for(let z=0;z<8;z++)box((x+z)%2?ink:cream,[(x-3.5)*.18,.13,(z-3.5)*.18],[.18,.015,.18]);
 for(const [x,z,c] of [[-.45,-.45,cream],[.25,.35,wood],[.5,-.3,cream]]){cylinder(c,[x,.19,z],[.1,.08,.1]);cylinder(c,[x,.3,z],[.05,.2,.05]);ball(c,[x,.44,z],[.08,.08,.08]);}
 cylinder(gold,[0,.3,0],[.09,.3,.09]);box(gold,[0,.53,0],[.06,.2,.06]);box(gold,[0,.56,0],[.17,.05,.06]);
}
