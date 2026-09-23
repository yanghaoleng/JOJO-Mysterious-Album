// Modular robot hand; its geometry shares the prop toolkit's disposal lifecycle.
export function build({part,color,cream,ink,gold}) {
  part('cylinder',ink,[0,.48,0],[.11,.28,.11]);part('box',cream,[0,.27,0],[.36,.3,.25]);for(const x of [-.15,.15]){part('box',color,[x,.05,.07],[.11,.22,.16]);part('box',gold,[x,.01,.15],[.1,.1,.12]);}
}
