import { details } from '../model-details.js';
export function build(k){
  const {ball,pivot,panel}=details(k),body=pivot();
  for(let i=0;i<5;i++){const r=.15+i*.065;ball(i%2?'#bbc981':'#d0d99a',[-.65+i*.27,.2+i*.1,Math.sin(i*2)*.12],[r,r*.8,r],body);}
  panel([[-.16,.25],[.08,.54],[-.03,.55],[.19,.87],[-.2,.53],[-.06,.5]],.07,'#e8d27e',[.5,.25,.3],body);
  for(const x of [.1,.32])ball(k.ink,[x,.69,.28],[.045,.035,.025],body);
  k.moving(body,'sway',.2);
}
