import { details } from '../model-details.js';
export function build(k) {
const {THREE,part,moving,beam,group,shapes,materials}=k;
const {box,ball,cylinder,ring,panel,pivot}=details(k);
const bug=pivot();
ball('#56786d',[0,.73,-.15],[.32,.32,.48],bug);ball('#424d51',[0,.8,.32],[.3,.29,.26],bug);for(const x of [-.2,.2])ball('#9b6479',[x,.88,.48],[.17,.18,.13],bug);
for(const x of [-1,1]){
const hinge=new THREE.Group();hinge.position.set(x*.15,1.02,0);bug.add(hinge);
const wing=ball('#d7e9ed',[x*.32,.04,-.12],[.49,.035,.25],hinge);wing.rotation.y=x*.35;moving(hinge,'sway',.42,14);
for(let i=0;i<3;i++){const leg=box('#655c48',[x*.37,.43,-.28+i*.24],[.035,.58,.035],bug);leg.rotation.z=x*.62;}

}
moving(bug,'bounce',.09,2.6);

}
