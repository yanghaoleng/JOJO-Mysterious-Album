import { details } from '../model-details.js';
export function build(k) {
const {THREE,part,moving,beam,group,shapes,materials}=k;
const {box,ball,cylinder,ring,panel,pivot}=details(k);
const badge=pivot();panel([[0,.13],[-.64,.6],[-.64,1.2],[0,1.54],[.64,1.2],[.64,.6]],.12,'#61a08b',[0,0,0],badge);const leaf=ball('#c4e393',[0,.92,.13],[.23,.43,.055],badge);leaf.rotation.z=-.45;box('#f0e6b7',[0,.68,.2],[.035,.65,.025],badge);moving(badge,'sway',.12);
}
