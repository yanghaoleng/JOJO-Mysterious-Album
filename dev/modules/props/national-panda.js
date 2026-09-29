export function build({THREE,group,part,moving}) {
  group.userData.animalWord='panda';
  const root=new THREE.Group();group.add(root);
  part('ball','#f4efdf',[0,.6,0],[.43,.52,.34],root);
  part('ball','#f4efdf',[0,1.16,.05],[.44,.4,.36],root);
  for(const side of [-1,1]){
    part('ball','#343d40',[side*.33,1.48,.02],[.16,.18,.12],root);
    part('ball','#343d40',[side*.17,1.19,.35],[.13,.16,.035],root).rotation.z=side*.4;
    part('ball','#f7f4e7',[side*.17,1.21,.385],[.04,.055,.018],root);
    part('ball','#343d40',[side*.38,.66,.02],[.16,.32,.18],root);
    part('ball','#343d40',[side*.24,.18,.12],[.2,.18,.23],root);
  }
  part('ball','#343d40',[0,1.05,.407],[.065,.046,.026],root);
  moving(root,'sway',.1,1.3);
}
