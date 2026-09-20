import { details } from '../model-details.js';
// 战斗机: individually authored silhouette and fittings.
export function build(k) {
 const {part,group,THREE,moving,beam,color,cream,wood,gold,ink}=k;
 const {box,ball,cylinder,ring,panel,pivot,bolt}=details(k);

 ball(color,[0,.45,0],[.3,.27,1.05]);const nose=part('cone',cream,[0,.46,1.2],[.26,.6,.26]);nose.rotation.x=Math.PI/2;
 const wing=panel([[-1.22,-.52],[-.35,.5],[.35,.5],[1.22,-.52],[.45,-.38],[-.45,-.38]],.08,color,[0,.42,0]);wing.rotation.x=-Math.PI/2;
 ball('#7dabb8',[0,.68,.38],[.2,.2,.43]);
 for(const x of [-.28,.28]){const fin=panel([[-.25,0],[.05,.55],[.3,0]],.065,ink,[x,.52,-.68]);fin.rotation.y=Math.PI/2;const exhaust=cylinder(ink,[x,.44,-.97],[.14,.22,.14]);exhaust.rotation.x=Math.PI/2;ball('#d8a96c',[x,.44,-1.08],[.09,.09,.02]);}
 for(const x of [-.65,.65]){box(cream,[x,.35,-.05],[.1,.1,.6]);bolt(x,.5,-.1);}
 for(const x of [-.23,.23]){beam([x,.36,.4],[x,.12,.4],.025,ink);ball(ink,[x,.1,.4],[.06,.1,.1]);}
}
