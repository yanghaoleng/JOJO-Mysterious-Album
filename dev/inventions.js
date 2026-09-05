const NAMES = { portal: '折叠传送门', rocket: '月光火箭', submarine: '气泡潜航器', balloon: '云层气球', ladder: '伸缩绳梯', parachute: '云朵降落伞', vehicle: '组合飞行器' };
const KINDS = Object.keys(NAMES);

export function describeInvention(text, previous, world, suggested) {
  const replace = /换成|改成|重新造|新造|替换|变成|不要原来/.test(text);
  const modifying = Boolean(previous && !replace);
  const namedKind = /传送|门|通道/.test(text) ? 'portal' : /火箭|飞船/.test(text) ? 'rocket'
    : /潜水|潜航|船/.test(text) ? 'submarine' : /气球/.test(text) ? 'balloon'
      : /梯|绳/.test(text) ? 'ladder' : /降落伞/.test(text) && world !== 'moon' ? 'parachute' : null;
  let kind = modifying ? previous.kind : KINDS.includes(suggested?.kind) ? suggested.kind : namedKind || 'vehicle';
  if (world === 'moon' && kind === 'parachute') kind = previous?.kind === 'parachute' ? 'vehicle' : previous?.kind || 'vehicle';
  const upgrades = [...new Set([
    ...(modifying ? previous.upgrades || [] : []),
    ...(/导航|雷达|地图|屏|方向|灯|航线/.test(text) ? ['navigation'] : []),
    ...(/推进|喷气|减速/.test(text) ? ['thruster'] : []),
    ...(/浮|气泡|防水/.test(text) ? ['float'] : []),
    ...(/绳|线|绑/.test(text) ? ['rope'] : []),
    ...(modifying && /梯/.test(text) ? ['ladder'] : []),
    ...(/桨|划水/.test(text) ? ['paddles'] : []),
    ...(/帆|借风/.test(text) ? ['sail'] : []),
  ])];
  const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  return {
    kind, name: modifying ? previous.name : String(suggested?.name || NAMES[kind]).slice(0, 16),
    primary: color(modifying ? previous.primary : suggested?.primary, '#7b9aab'),
    accent: color(modifying ? previous.accent : suggested?.accent, '#e1b671'),
    details: String(suggested?.details || text).slice(0, 32), upgrades,
  };
}
