import { details } from '../model-details.js';
// 盾牌: individually authored silhouette and fittings.
export function build(k) {
 const {part,group,THREE,moving,beam,color,cream,wood,gold,ink}=k;
 const {box,ball,cylinder,ring,panel,pivot,bolt}=details(k);

 panel([[-.6,1.12],[0,1.38],[.6,1.12],[.47,.45],[0,.08],[-.47,.45]],.13,gold);
 panel([[-.48,1.06],[0,1.25],[.48,1.06],[.37,.5],[0,.22],[-.37,.5]],.17,color);
 part('star',cream,[0,.8,.13],[.28,.28,.07]);
 for(const [x,y] of [[-.46,1.08],[.46,1.08],[-.35,.51],[.35,.51],[0,.27]])bolt(x,y,.12);
 ring(wood,[0,.8,-.15],.22);
}
