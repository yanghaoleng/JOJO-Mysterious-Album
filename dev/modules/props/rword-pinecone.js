import { details } from '../model-details.js';
// Authored expansion miniature; all geometry and materials belong to this instance.
export function build(k) {
  const d=details(k),g=d.pivot();
  const G='#8ab68c',P='#d89db8',T='#87644c',W='#f3efe4',I='#3e454b';
  const sphere=(c,p,s)=>d.ball(c,p,s,g),box=(c,p,s)=>d.box(c,p,s,g),cone=(c,p,s)=>k.part('cone',c,p,s,g);
  const rod=(a,b,r,c)=>{const m=k.beam(a,b,r,c);g.attach(m);return m;};
  const eyes=(y,z,x)=>{for(const side of [-1,1])sphere(I,[side*x,y,z],[.032,.04,.025]);};
  const tube=(points,color,r)=>{const geo=new k.THREE.TubeGeometry(new k.THREE.CatmullRomCurve3(points.map(p=>new k.THREE.Vector3(...p))),24,r,8,false);k.shapes.set('expansion-'+k.shapes.size,geo);const mesh=sphere(color,[0,0,0],[1,1,1]);mesh.geometry=geo;return mesh;};
sphere(T,[0,.61,0],[.23,.56,.23]);
for(let row=0;row<6;row++){const y=.15+row*.17,r=.32*Math.sin((row+1)/7*Math.PI);for(let n=0;n<8;n++){const a=n*Math.PI/4+(row%2)*Math.PI/8;const m=sphere(row%2?'#b98c63':'#9e7450',[Math.cos(a)*r,y,Math.sin(a)*r],[.15,.075,.17]);m.rotation.set(Math.sin(a)*.3,a,Math.cos(a)*.3);}}
rod([0,1.06,0],[.02,1.22,0],.045,T);
  k.moving(g,'sway',.055,2);
}
