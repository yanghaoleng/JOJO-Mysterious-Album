import { details } from '../model-details.js';
export function build(k) {
const {THREE,part,moving,beam,group,shapes,materials}=k;
const {box,ball,cylinder,ring,panel,pivot}=details(k);

const coin=pivot([0,.68,0]);const disc=cylinder('#edb630',[0,0,0],[.62,.16,.62],coin);disc.rotation.x=Math.PI/2;
for(const z of [-.095,.095]){ring('#ffe499',[0,0,z],.5,coin);part('flag-star','#fff0a0',[0,0,z],[.29,.29,.04],coin);}
for(let i=0;i<24;i++){const a=i*Math.PI/12;const edge=box('#ffd76c',[Math.sin(a)*.6,Math.cos(a)*.6,0],[.035,.065,.16],coin);edge.rotation.z=-a;}
moving(coin,'turn',.25);

}
