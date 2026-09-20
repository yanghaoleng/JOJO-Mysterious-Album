import { details } from '../model-details.js';
export function build(k) {
const {THREE,part,moving,beam,group,shapes,materials}=k;
const {box,ball,cylinder,ring,panel,pivot}=details(k);
const bug=pivot();
ball('#9b8360',[0,.77,-.25],[.12,.14,.67],bug);ball('#746859',[0,.87,.39],[.16,.17,.21],bug);const nose=part('cone','#665a49',[0,.83,.96],[.025,.8,.025],bug);nose.rotation.x=Math.PI/2;
for(const x of [-1,1]){
const hinge=new THREE.Group();hinge.position.set(x*.15,1.02,0);bug.add(hinge);
const wing=ball('#d7e9ed',[x*.32,.04,-.12],[.49,.035,.25],hinge);wing.rotation.y=x*.35;moving(hinge,'sway',.42,14);
for(let i=0;i<3;i++){const leg=box('#655c48',[x*.37,.43,-.28+i*.24],[.035,.58,.035],bug);leg.rotation.z=x*.62;}

}
for(const x of [-.09,.09])ball('#243d42',[x,.93,.55],[.04,.04,.025],bug);
moving(bug,'bounce',.09,2.6);

}
