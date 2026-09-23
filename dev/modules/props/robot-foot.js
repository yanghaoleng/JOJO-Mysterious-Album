// Modular robot foot; its geometry shares the prop toolkit's disposal lifecycle.
export function build({part,color,cream,ink,gold}) {
  part('box',ink,[0,.33,0],[.2,.5,.24]);part('box',cream,[0,.14,.14],[.44,.25,.64]);part('box',color,[0,.12,.48],[.44,.16,.09]);for(const x of [-.1,.1])part('box',gold,[x,.28,.27],[.035,.025,.17]);
}
