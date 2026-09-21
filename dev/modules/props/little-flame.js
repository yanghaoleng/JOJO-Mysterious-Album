import { details } from '../model-details.js';
export function build(k) {
const {THREE,part,moving,beam,group,shapes,materials}=k;
const {box,ball,cylinder,ring,panel,pivot}=details(k);

const fire=pivot();
panel([[-.45,.12],[-.57,.48],[-.3,.9],[-.15,.65],[.07,1.65],[.42,1.12],[.34,.88],[.57,.51],[.4,.13],[0,0]],.22,'#f28b26',[0,0,0],fire);
panel([[-.22,.13],[-.28,.4],[.05,1.04],[.12,.65],[.3,.35],[.2,.12]],.05,'#ffe16c',[0,0,.15],fire);
moving(fire,'sway',.09,3);moving(ball('#ffce50',[.35,1.64,0],[.06,.1,.06]),'bounce',.16,3);

}
