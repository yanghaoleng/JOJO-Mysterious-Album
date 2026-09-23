// Modular robot head; its geometry shares the prop toolkit's disposal lifecycle.
export function build({part,color,cream,ink,gold}) {
  part('box',cream,[0,.36,0],[.95,.66,.64]);part('box',ink,[0,.38,.33],[.72,.39,.045]);for(const x of [-.2,.2])part('box','#9ee5e5',[x,.42,.365],[.11,.12,.035]);part('box',cream,[0,.27,.37],[.19,.035,.02]);part('cylinder',gold,[0,.79,0],[.04,.23,.04]);part('ball',color,[0,.92,0],[.11,.11,.11]);for(const x of [-.55,.55])part('box',color,[x,.37,0],[.15,.25,.28]);
}
