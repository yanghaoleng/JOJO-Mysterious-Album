import { details } from '../model-details.js';
// 游戏手柄: individually authored silhouette and fittings.
export function build(k) {
 const {part,group,THREE,moving,beam,color,cream,wood,gold,ink}=k;
 const {box,ball,cylinder,ring,panel,pivot,bolt}=details(k);

 panel([[-.82,.08],[-.92,.45],[-.65,.79],[.65,.79],[.92,.45],[.82,.08],[.44,.15],[.28,.38],[-.28,.38],[-.44,.15]],.27,color);
 box(ink,[-.45,.55,.16],[.32,.09,.06]);box(ink,[-.45,.55,.16],[.09,.32,.06]);
 for(const [x,y,c] of [[.49,.69,'#dbaa68'],[.65,.53,'#ae777b'],[.49,.37,'#8aac8e'],[.33,.53,'#8da9c5']])ball(c,[x,y,.18],[.063,.063,.03]);
 for(const x of [-.2,.2]){const knob=cylinder(ink,[x,.32,.19],[.085,.07,.085]);knob.rotation.x=Math.PI/2;}
 box(cream,[0,.65,.16],[.2,.045,.03]);
}
