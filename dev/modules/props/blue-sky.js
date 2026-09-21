// Independent first-light prefab; resource ownership and cleanup are provided by the toolkit.
export function build({THREE,group,part,moving}) {
 group.userData.suspended=true;
 for(let i=0;i<7;i++){
 const cloud=new THREE.Group();cloud.position.set((i-3)*.62,3.25+Math.sin(i*.8)*.22,-.55);group.add(cloud);
 part('ball','#9ccddd',[0,0,0],[.68,.46,.22],cloud);
 part('ball','#9ccddd',[.15,.24,0],[.32,.32,.22],cloud);moving(cloud,'sway',.025,1);
 }
}
