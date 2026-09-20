import { details } from '../model-details.js';
// 弓箭: individually authored silhouette and fittings.
export function build(k) {
 const {part,group,THREE,moving,beam,color,cream,wood,gold,ink}=k;
 const {box,ball,cylinder,ring,panel,pivot,bolt}=details(k);

 const arc=panel([[0,.08],[-.36,.35],[-.5,.85],[-.36,1.35],[0,1.62],[-.13,1.3],[-.26,.85],[-.13,.4]],.1,wood);
 beam([0,.08,0],[.08,.85,0],.012,cream);beam([.08,.85,0],[0,1.62,0],.012,cream);
 box(color,[-.37,.85,0],[.18,.25,.15]);beam([-.5,.85,.1],[.7,.85,.1],.018,gold);
 panel([[.66,.75],[.91,.85],[.66,.95]],.025,cream,[0,0,.1]);
}
