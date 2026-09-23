// Modular robot body; its geometry shares the prop toolkit's disposal lifecycle.
export function build({part,color,cream,ink,gold}) {
  part('box',color,[0,.52,0],[.85,1,.5]);part('box',cream,[0,.55,.27],[.57,.65,.06]);part('box',ink,[0,.7,.31],[.34,.13,.03]);for(const x of [-.13,.13])part('ball',gold,[x,.41,.32],[.07,.07,.035]);part('cylinder',ink,[0,1.08,0],[.15,.14,.15]);
}
