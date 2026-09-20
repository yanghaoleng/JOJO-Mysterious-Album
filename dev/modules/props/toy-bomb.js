import { details } from '../model-details.js';
// 炸弹: individually authored silhouette and fittings.
export function build(k) {
 const {part,group,THREE,moving,beam,color,cream,wood,gold,ink}=k;
 const {box,ball,cylinder,ring,panel,pivot,bolt}=details(k);

 const body=pivot([0,.5,0]);ball('#536575',[0,0,0],[.5,.5,.5],body);cylinder(gold,[0,.48,0],[.13,.15,.13],body);
 for(let i=0;i<7;i++){let x=i*.047,y=.61+.1*Math.sin(i*.45);ball(wood,[x,y,0],[.043,.043,.043],body);}
 const spark=part('star',gold,[.31,.63,0],[.15,.15,.05],body);moving(spark,'spin',1.3);
 const badge=panel([[-.13,0],[0,.22],[.13,0]],.03,cream,[0,-.06,.48],body);ball(ink,[0,.01,.505],[.023,.06,.016],body);
 moving(body,'sway',.12);
}
