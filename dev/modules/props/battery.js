import { details } from '../model-details.js';
export function build(k) {
const {THREE,part,moving,beam,group,shapes,materials}=k;
const {box,ball,cylinder,ring,panel,pivot}=details(k);

box('#405967',[0,.8,0],[.82,1.35,.48]);box('#d8e4df',[0,1.51,0],[.34,.12,.3]);box('#98b39e',[0,.14,0],[.86,.12,.5]);
for(let i=0;i<3;i++)moving(box('#a5dc72',[0,.4+i*.31,.25],[.54,.2,.055]),'bounce',.015,2+i);
box('#f5e8b6',[0,1.24,.26],[.22,.045,.03]);box('#f5e8b6',[0,1.24,.26],[.045,.18,.03]);

}
