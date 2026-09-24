import { details } from '../model-details.js';
// Authored expansion miniature; all geometry and materials belong to this instance.
export function build(k) {
  const d=details(k),g=d.pivot();
  const G='#8ab68c',P='#d89db8',T='#87644c',W='#f3efe4',I='#3e454b';
  const sphere=(c,p,s)=>d.ball(c,p,s,g),box=(c,p,s)=>d.box(c,p,s,g),cone=(c,p,s)=>k.part('cone',c,p,s,g);
  const rod=(a,b,r,c)=>{const m=k.beam(a,b,r,c);g.attach(m);return m;};
  const eyes=(y,z,x)=>{for(const side of [-1,1])sphere(I,[side*x,y,z],[.032,.04,.025]);};
  const tube=(points,color,r)=>{const geo=new k.THREE.TubeGeometry(new k.THREE.CatmullRomCurve3(points.map(p=>new k.THREE.Vector3(...p))),24,r,8,false);k.shapes.set('expansion-'+k.shapes.size,geo);const mesh=sphere(color,[0,0,0],[1,1,1]);mesh.geometry=geo;return mesh;};
// Separate ice blocks form the dome; the front arch stays open.
for(let row=0;row<5;row++){const a=(row+.5)*Math.PI/10,r=Math.cos(a)*.73,y=Math.sin(a)*.73,count=Math.max(5,14-row*2);for(let n=0;n<count;n++){const theta=(n+.5*(row%2))*Math.PI*2/count;if(row<2&&Math.cos(theta)>.75)continue;const m=box(row%2?'#d6ecf1':'#edf7f6',[Math.sin(theta)*r,y,Math.cos(theta)*r],[2*r*Math.sin(Math.PI/count)*.92,.19,.17]);m.rotation.y=theta;}}
sphere('#edf7f6',[0,.76,0],[.2,.065,.2]);
for(let n=0;n<7;n++){const a=n*Math.PI/6;const m=box('#d6ecf1',[Math.cos(a)*.27,.1+Math.sin(a)*.3,.71],[.16,.17,.47]);m.rotation.z=a-Math.PI/2;}
  k.moving(g,'sway',.055,2);
}
