import { details } from '../model-details.js';
// Authored expansion miniature; all geometry and materials belong to this instance.
export function build(k) {
  const d=details(k),g=d.pivot();
  const G='#8ab68c',P='#d89db8',T='#87644c',W='#f3efe4',I='#3e454b';
  const sphere=(c,p,s)=>d.ball(c,p,s,g),box=(c,p,s)=>d.box(c,p,s,g),cone=(c,p,s)=>k.part('cone',c,p,s,g);
  const rod=(a,b,r,c)=>{const m=k.beam(a,b,r,c);g.attach(m);return m;};
  const eyes=(y,z,x)=>{for(const side of [-1,1])sphere(I,[side*x,y,z],[.032,.04,.025]);};
  const tube=(points,color,r)=>{const geo=new k.THREE.TubeGeometry(new k.THREE.CatmullRomCurve3(points.map(p=>new k.THREE.Vector3(...p))),24,r,8,false);k.shapes.set('expansion-'+k.shapes.size,geo);const mesh=sphere(color,[0,0,0],[1,1,1]);mesh.geometry=geo;return mesh;};
sphere('#c3945b',[0,.46,0],[.34,.44,.34]);sphere(T,[0,.81,0],[.39,.19,.39]);
for(let ring=0;ring<3;ring++)for(let n=0;n<10;n++){const a=n*Math.PI/5+(ring%2)*.2,r=.37-ring*.085;sphere('#ab794c',[Math.cos(a)*r,.8+ring*.057,Math.sin(a)*r],[.055,.035,.055]);}
rod([0,.94,0],[.065,1.14,0],.045,T);cone('#b08450',[0,.045,0],[.08,.13,.08]).rotation.z=Math.PI;
  k.moving(g,'sway',.055,2);
}
