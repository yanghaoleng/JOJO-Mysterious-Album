import { details } from '../model-details.js';
export function build(k) {
const {THREE,part,moving,beam,group,shapes,materials}=k;
const {box,ball,cylinder,ring,panel,pivot}=details(k);
const badge=pivot();part('flag-star','#f0bf42',[0,.8,0],[.68,.68,.12],badge);part('flag-star','#fff0a0',[0,.8,.1],[.38,.38,.045],badge);moving(badge,'sway',.12);
}
