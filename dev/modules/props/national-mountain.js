export function build({part,moving}) {
  part('cone','#779782',[-.4,.59,0],[.7,1.18,.65]);
  const peak=part('cone','#8ba68b',[.25,.9,.05],[.8,1.8,.7]);
  part('cone','#efe6d3',[.25,1.55,.05],[.24,.51,.21]);
  part('ball','#668675',[.7,.16,.35],[.45,.19,.4]);
  moving(peak,'sway',.012,.7);
}
