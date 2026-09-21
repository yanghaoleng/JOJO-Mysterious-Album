import { details } from '../model-details.js';
export function build(k){
  const {ball,pivot}=details(k),body=pivot();
  for(let i=0;i<7;i++){const a=i*2.39996;const puff=ball(i%2?'#c1bbdb':'#d7d9e9',[Math.cos(a)*.4,.42+(i%3)*.15,Math.sin(a)*.3],[.38,.34,.32],body);k.moving(puff,'bounce',.07);}
  for(const x of [-.15,.15])ball(k.ink,[x,.65,.57],[.035,.055,.025],body);
  ball(k.cream,[0,.47,.58],[.085,.035,.035],body);k.moving(body,'sway',.12);
}
