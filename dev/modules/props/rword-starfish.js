import { details } from '../model-details.js';
// Authored expansion miniature; all geometry and materials belong to this instance.
export function build(k) {
  const d=details(k),g=d.pivot();
  const G='#8ab68c',P='#d89db8',T='#87644c',W='#f3efe4',I='#3e454b';
  const sphere=(c,p,s)=>d.ball(c,p,s,g),box=(c,p,s)=>d.box(c,p,s,g),cone=(c,p,s)=>k.part('cone',c,p,s,g);
  const rod=(a,b,r,c)=>{const m=k.beam(a,b,r,c);g.attach(m);return m;};
  const eyes=(y,z,x)=>{for(const side of [-1,1])sphere(I,[side*x,y,z],[.032,.04,.025]);};
  const tube=(points,color,r)=>{const geo=new k.THREE.TubeGeometry(new k.THREE.CatmullRomCurve3(points.map(p=>new k.THREE.Vector3(...p))),24,r,8,false);k.shapes.set('expansion-'+k.shapes.size,geo);const mesh=sphere(color,[0,0,0],[1,1,1]);mesh.geometry=geo;return mesh;};
const pts=[];for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.27:.66;pts.push([Math.cos(a)*r,.7+Math.sin(a)*r]);}d.panel(pts,.2,'#edac7d',[0,0,0],g);eyes(.77,.125,.12);
for(let n=0;n<5;n++){const a=Math.PI/2+n*Math.PI*2/5;for(const r of [.33,.47])sphere('#f7d5a5',[Math.cos(a)*r,.7+Math.sin(a)*r,.12],[.028,.028,.022]);}
  k.moving(g,'sway',.055,2);
}
