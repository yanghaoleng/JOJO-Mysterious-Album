// Independent first-light prefab; resource ownership and cleanup are provided by the toolkit.
export function build({THREE,group,part,moving}) {
 const thread=new THREE.Group();group.add(thread);
 for(let i=0;i<22;i++){const a=i*.4;part('ball','#ffe5a1',[Math.sin(a)*(.3+i*.016),.2+i*.055,Math.cos(a)*.3],[.075,.065,.065],thread);}
 moving(thread,'turn',.22,2);
}
