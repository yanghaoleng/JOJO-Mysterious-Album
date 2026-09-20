import { details } from '../model-details.js';
export function build(k) {
const {THREE,part,moving,beam,group,shapes,materials}=k;
const {box,ball,cylinder,ring,panel,pivot}=details(k);

const bean=pivot();bean.rotation.z=-.2;
ball('#ef9227',[0,.7,0],[.5,.67,.35],bean);
const curve=new THREE.CatmullRomCurve3(Array.from({length:25},(_,i)=>{const t=i/24,y=(t-.5)*1.2,x=Math.sin(t*Math.PI*2)*.065;return new THREE.Vector3(x,.7+y,.35*Math.sqrt(Math.max(0,1-(y/.67)**2-(x/.5)**2))+.003);}));
const seamGeometry=new THREE.TubeGeometry(curve,48,.023,8,false);shapes.set('bean-seam',seamGeometry);
const seam=box('#ac5417',[0,0,0],[1,1,1],bean);seam.geometry=seamGeometry;
ball('#ffbd5d',[-.29,.95,.27],[.06,.22,.025],bean);moving(bean,'bounce',.1);

}
