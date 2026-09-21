import { details } from '../model-details.js';
export function build(k) {
const {THREE,part,moving,beam,group,shapes,materials}=k;
const {box,ball,cylinder,ring,panel,pivot}=details(k);

const gem=pivot([0,.85,0]);const geo=new THREE.BufferGeometry(),vertices=[],colors=[];
const top=Array.from({length:8},(_,i)=>[Math.cos(i*Math.PI/4)*.32,.48,Math.sin(i*Math.PI/4)*.32]);const rim=top.map(([x,y,z])=>[x*2,.12,z*2]);
const tri=(a,b,c,tint)=>{vertices.push(...a,...b,...c);const color=new THREE.Color(tint);for(let i=0;i<3;i++)colors.push(color.r,color.g,color.b);};
for(let i=0;i<8;i++){const n=(i+1)%8;tri([0,.48,0],top[n],top[i],'#d1a3ff');tri(top[i],top[n],rim[i],i%2?'#a966e2':'#c493f5');tri(top[n],rim[n],rim[i],'#9960d4');tri(rim[i],rim[n],[0,-.75,0],i%2?'#783abb':'#ad75ed');}
geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();shapes.set('diamond-facets',geo);const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.28,side:THREE.DoubleSide});materials.set('diamond-facets',material);gem.add(new THREE.Mesh(geo,material));moving(gem,'turn',.4);

}
