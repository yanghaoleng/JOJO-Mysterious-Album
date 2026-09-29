export function build({THREE,group,part,moving}) {
  const balloon=new THREE.Group();group.add(balloon);
  part('ball','#e6856f',[0,1.5,0],[.44,.55,.4],balloon);
  part('cone','#cd705e',[0,.96,0],[.065,.12,.06],balloon);
  part('cylinder','#e9d7b7',[0,.5,0],[.012,.9,.012],balloon);
  part('ball','#f4c2a7',[-.17,1.72,.33],[.07,.12,.018],balloon);
  moving(balloon,'sway',.15,1.1);
}
