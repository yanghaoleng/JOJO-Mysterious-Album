import { details } from '../model-details.js';
export function build(k) {
const {THREE,part,moving,beam,group,shapes,materials}=k;
const {box,ball,cylinder,ring,panel,pivot}=details(k);

const notes=pivot();for(let i=0;i<4;i++){const note=box(i%2?'#78ad83':'#a4c69a',[i*.045,.15+i*.12,0],[1.5,.08,.77],notes);note.rotation.y=(i-1.5)*.07;}
box('#e8dfb0',[.05,.65,0],[.28,.14,.8],notes);
for(const x of [-.48,.52]){box('#d8e8b8',[x,.565,0],[.3,.014,.48],notes);const mark=part('flag-star','#57936d',[x,.58,0],[.11,.11,.015],notes);mark.rotation.x=-Math.PI/2;}
moving(notes,'sway',.06);

}
