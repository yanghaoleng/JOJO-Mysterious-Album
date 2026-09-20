import { details } from '../model-details.js';
// 坦克: individually authored silhouette and fittings.
export function build(k) {
 const {part,group,THREE,moving,beam,color,cream,wood,gold,ink}=k;
 const {box,ball,cylinder,ring,panel,pivot,bolt}=details(k);

 for(const x of [-.57,.57]){box(ink,[x,.25,0],[.3,.4,1.65]);for(let i=0;i<5;i++){const wheel=cylinder(wood,[x+Math.sign(x)*.16,.27,-.63+i*.31],[.16,.035,.16]);wheel.rotation.z=Math.PI/2;}for(let i=0;i<10;i++)box(cream,[x,.46,-.73+i*.16],[.32,.035,.065]);}
 box(color,[0,.56,0],[1.05,.3,1.45]);const turret=pivot([0,.83,-.15]);ball(color,[0,0,0],[.44,.25,.48],turret);
 const barrel=cylinder(ink,[0,.07,.66],[.065,1.15,.065],turret);barrel.rotation.x=Math.PI/2;ring(gold,[0,.07,1.25],.075,turret);
 cylinder(cream,[0,.22,-.1],[.17,.05,.17],turret);moving(turret,'turn',.35);
}
