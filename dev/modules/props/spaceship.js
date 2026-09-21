import { details } from '../model-details.js';
// 宇宙飞船: individually authored silhouette and fittings.
export function build(k) {
 const {part,group,THREE,moving,beam,color,cream,wood,gold,ink}=k;
 const {box,ball,cylinder,ring,panel,pivot,bolt}=details(k);

 const body=pivot([0,.7,0]);panel([[-.42,-.75],[-.48,.45],[0,1.25],[.48,.45],[.42,-.75]],.42,cream,[0,0,0],body).rotation.x=-Math.PI/2;
 ball('#8cb7bb',[0,.22,.42],[.28,.16,.44],body);
 for(const x of [-.65,.65]){const engine=cylinder(color,[x,-.05,-.15],[.23,1.5,.23],body);engine.rotation.x=Math.PI/2;const hoop=ring(gold,[x,-.05,-.91],.19,body);ball('#9cd3c8',[x,-.05,-.92],[.13,.13,.04],body);box(ink,[x/2,-.1,-.3],[.55,.13,.32],body);}
 for(let i=0;i<4;i++)box(gold,[0,.23,-.6+i*.15],[.18,.025,.035],body);
 for(const x of [-.4,.4]){beam([x,.65,.2],[x,.1,.3],.04,ink);box(color,[x,.08,.3],[.3,.1,.3]);}
 moving(body,'bounce',.1);
}
