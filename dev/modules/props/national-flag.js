// Red field, one large star and four small stars facing its centre.
export function build({THREE,group,part,moving}) {
  part('cylinder','#bdb4a2',[-.72,1.02,0],[.045,2.04,.045]);
  part('cylinder','#bdb4a2',[-.72,.07,0],[.25,.14,.25]);
  const cloth=new THREE.Group();cloth.position.set(-.7,1.7,0);group.add(cloth);
  part('box','#de2910',[.6,0,0],[1.2,.8,.025],cloth);
  const cx=.2,cy=.2;
  for(const z of [-.022,.022]){
    part('flag-star','#ffde00',[cx,cy,z],[.12,.12,.012],cloth);
    for(const [x,y] of [[.4,.32],[.48,.24],[.48,.12],[.4,.04]]){
      const star=part('flag-star','#ffde00',[x,y,z],[.04,.04,.012],cloth);
      star.rotation.z=Math.atan2(cy-y,cx-x)-Math.PI/2;
    }
  }
  moving(cloth,'turn',.12,1.5);
}
