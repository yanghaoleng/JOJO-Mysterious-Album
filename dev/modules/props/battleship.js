import { details } from '../model-details.js';
// 战舰: individually authored silhouette and fittings.
export function build(k) {
 const {part,group,THREE,moving,beam,color,cream,wood,gold,ink}=k;
 const {box,ball,cylinder,ring,panel,pivot,bolt}=details(k);

 const hull=panel([[-.46,-1.1],[-.52,.45],[0,1.4],[.52,.45],[.46,-1.1]],.3,color,[0,.28,0]);hull.rotation.x=-Math.PI/2;
 box(cream,[0,.5,-.1],[.75,.12,1.8]);box(ink,[0,.76,-.2],[.4,.45,.6]);box(cream,[0,1.02,-.3],[.5,.14,.4]);
 for(const z of [-.8,.68]){const turret=pivot([0,.62,z]);cylinder(ink,[0,0,0],[.23,.18,.23],turret);box(color,[0,.1,0],[.34,.2,.32],turret);for(const x of [-.08,.08]){const barrel=cylinder(ink,[x,.15,.33],[.035,.5,.035],turret);barrel.rotation.x=Math.PI/2;}moving(turret,'turn',.3);}
 beam([0,1.03,-.3],[0,1.64,-.3],.025,wood);box('#397fc4',[.18,1.48,-.3],[.35,.16,.035]);
 for(const z of [-.323,-.277])part('flag-star','#ffda45',[.18,1.48,z],[.063,.063,.008]);
 for(const x of [-.35,.35])for(let i=0;i<6;i++)bolt(x,.58,-.8+i*.28);
}
