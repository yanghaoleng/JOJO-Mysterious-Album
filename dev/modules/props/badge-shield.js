import { details } from '../model-details.js';
export function build(k) {
const {THREE,part,moving,beam,group,shapes,materials}=k;
const {box,ball,cylinder,ring,panel,pivot}=details(k);
const badge=pivot();panel([[-.57,1.35],[.57,1.35],[.48,.55],[0,.12],[-.48,.55]],.14,'#4784b8',[0,0,0],badge);part('flag-star','#ffe082',[0,.91,.12],[.25,.25,.05],badge);moving(badge,'sway',.12);
}
