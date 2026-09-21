import { details } from '../model-details.js';
export function build(k) {
const {THREE,part,moving,beam,group,shapes,materials}=k;
const {box,ball,cylinder,ring,panel,pivot}=details(k);
const badge=pivot();for(const x of [-.22,.22])panel([[-.16,0],[.16,0],[.2,-.65],[0,-.5],[-.2,-.65]],.06,'#6b95c9',[x,.68,-.08],badge);const disc=cylinder('#eac45b',[0,.96,0],[.47,.12,.47],badge);disc.rotation.x=Math.PI/2;ring('#fff0a1',[0,.96,.08],.36,badge);part('flag-star','#fff1a0',[0,.96,.09],[.23,.23,.04],badge);moving(badge,'sway',.12);
}
