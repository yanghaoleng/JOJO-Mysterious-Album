/** Shared browser/server local reply. No network, storage, or platform dependencies. */
export const SHAPES = { star: '星星', moon: '月亮', leaf: '叶子', heart: '爱心', cloud: '云朵', fish: '小鱼' };
export const COLORS = [[/红/u, '#ef827c'], [/橙/u, '#efa45f'], [/黄|金/u, '#efd36e'], [/绿|翠/u, '#86ad83'], [/蓝|海|天空/u, '#88b6d4'], [/紫/u, '#b49bd4'], [/粉/u, '#e7a5b5'], [/白|银/u, '#eee9df'], [/黑/u, '#625e69']];
const COLOR_NAMES = { '#ef827c': '红色', '#efa45f': '橙色', '#efd36e': '金黄色', '#86ad83': '绿色', '#88b6d4': '蓝色', '#b49bd4': '紫色', '#e7a5b5': '粉色', '#eee9df': '银白色', '#625e69': '深灰色' };
export const PRIVATE = /(?:\d[\s-]*){7,}|[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}|(?:https?:\/\/|www\.)|我叫|我的名字|真名|姓什么|住在|住址|地址|学校|幼儿园|小学|中学|班级|电话|手机|微信|QQ|身份证|账号|密码|生日|定位|门牌|家庭|爸爸叫|妈妈叫|家长叫|\d+号/iu;
export const DANGER = /自杀|自残|跳楼|割腕|杀死|杀人|弄死|打死|伤害|砍|捅|流血|血腥|尸体|枪|炸弹|爆炸|毒药|下毒|刀|放火|纵火|触电|插座|裸|色情|性交|性器|强奸|绑架|绑走|虐待|欺负|打架|骂人|笨蛋|傻瓜|去死|武器|服药|吃药|药丸|秘密见面|跟陌生人|suicide|kill|bomb|weapon|nude|sex/iu;
const INCOMPLETE = /^(?:嗯+|啊+|哦+|呃+|我?(?:还)?(?:也)?不知道|我?(?:还)?没想好|等一下|再想想|我想想|让我想想|不想说|没有想法|想不出来|不知道怎么说|不清楚|idontknow)(?:呀|啊|呢)?$/iu;
const FALLBACKS = {
  observe: '我听见你的发现了。我们把这个小细节留在眼前，慢慢看。',
  light: '我听见你说的光了。我们就在这里，看看它照亮的地方。',
  listen: '我听见你的声音想法了。我们先安静一会儿，留意眼前的声音。',
  question: '我听见你的想法了。我们先把这个念头留下，慢慢想一想。',
  color: '我听见你想留下的这句话了。我们把这个发现和眼前的颜色放在一起。',
  finale: '我听见你想留下的这一刻了。它会和今天的其他发现一起留在故事里。',
};

export function visualFor(answer) {
  const shape = [[/月/u, 'moon'], [/叶|树叶|草/u, 'leaf'], [/心/u, 'heart'], [/云/u, 'cloud'], [/鱼/u, 'fish'], [/星/u, 'star']].find(([pattern]) => pattern.test(answer))?.[1] || 'star';
  const color = COLORS.find(([pattern]) => pattern.test(answer))?.[1] || '#efd36e';
  return { shape, color };
}

export function inputGuard(payload) {
  const joined = [payload.answer, payload.prompt, payload.momo].join(' ');
  if (PRIVATE.test(joined)) return '这些个人信息不用告诉我。我们只聊故事里的发现和想象。';
  if (DANGER.test(joined)) return '这个想法我们先放一放，换成不会伤到自己或别人的想象吧。';
  if (INCOMPLETE.test(payload.answer.replace(/[，。！？、,.!?\s'’]/gu, ''))) return '没关系，可以慢慢想。我会在这里等你的想法。';
  return '';
}

export function creationReaction(visual) {
  return `我把画面里的钥匙画成了${COLOR_NAMES[visual.color] || '这个颜色的'}${SHAPES[visual.shape]}模样，没画出的部分也留在你的想象里。`;
}

export function localResult(payload) {
  const guard = inputGuard(payload);
  const visual = visualFor(guard ? '' : payload.answer);
  const reaction = guard || (payload.kind === 'create' ? creationReaction(visual) : FALLBACKS[payload.kind]);
  return { source: 'local', reaction, visual, accepted: !guard };
}
