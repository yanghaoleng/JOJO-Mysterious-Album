// Independent first-light prefab; resource ownership and cleanup are provided by the toolkit.
export function build({THREE,group,part,moving}) {
 const shell=new THREE.Group();group.add(shell);
 part('ball','#b3aaa0',[0,.26,0],[.36,.26,.27],shell);
 for(let i=0;i<5;i++)part('ball','#f3dda0',[-.12+i*.055,.4+Math.sin(i)*.025,.2],[.035,.06,.025],shell);
 moving(shell,'sway',.4,5);
}
