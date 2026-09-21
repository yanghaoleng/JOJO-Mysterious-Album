import { details } from '../model-details.js';
export function build(k) {
const {THREE,part,moving,beam,group,shapes,materials}=k;
const {box,ball,cylinder,ring,panel,pivot}=details(k);
const badge=pivot();panel([[-.6,.55],[-.7,1.3],[-.3,1.04],[0,1.55],[.3,1.04],[.7,1.3],[.6,.55]],.16,'#e8bd50',[0,0,0],badge);box('#fff0ac',[0,.55,.1],[1.2,.14,.09],badge);part('star','#9664bf',[0,.93,.13],[.16,.21,.08],badge);moving(badge,'sway',.12);
}
