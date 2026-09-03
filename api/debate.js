const TEMPLATE_IDS = new Set([
  'bean-dog', 'moon-cat', 'snow-rabbit', 'honey-bear', 'curl-fox',
  'bamboo-panda', 'pond-frog', 'book-owl', 'forest-deer', 'leaf-hedgehog',
  'river-otter', 'cloud-alpaca',
]);

const SAFETY = `你为5至8岁儿童生成双角色观点讨论。目标不是分胜负，而是展示两个合理角度。
每次发言只说一件事，最多38个中文字符；不讽刺、不贬低、不制造输赢或群体对立；不编造数据和专家结论。
不得讨论成人、性、仇恨、伤害、自残、违法方法、危险模仿、现实政治动员、医疗法律金融决策。
不得索取或复述姓名、学校、住址、电话、账号、精确生日。高风险问题allowed=false，给出温和安全说明并建议询问可信任成年人。
正常讨论输出6轮，A和B严格交替：开场各一轮、回应各一轮、总结各一轮。最后指出共同点并把判断交还给孩子。`;

function clean(value, max) {
  return String(value || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function privateInfo(text) {
  return /(?:1[3-9]\d{9}|\d{5,}@|住在|地址|学校叫|手机号|微信号|QQ号|身份证|我的学校|我家在)/.test(text);
}

function unsafe(text) {
  return /(?:自杀|自残|杀人|炸弹|制毒|强奸|色情|性爱|仇恨|怎么偷|怎么骗|怎么买股票|吃多少药|不告诉爸爸|不告诉妈妈)/.test(text);
}

function fallback(question, speakers) {
  const [a, b] = speakers;
  return {
    allowed: true,
    topic: question,
    turns: [
      { speakerId: a.id, phase: 'opening', text: `我先看看它带来的好处，也想找一个生活里的例子。`, emotion: 'happy' },
      { speakerId: b.id, phase: 'opening', text: `我来提醒另一面：做选择前，也要看看时间、规则和别人。`, emotion: 'thinking' },
      { speakerId: a.id, phase: 'response', text: `如果准备得更充分，好处也许能保留下来。`, emotion: 'happy' },
      { speakerId: b.id, phase: 'response', text: `如果遇到不合适的情况，我们也可以换一种办法。`, emotion: 'thinking' },
      { speakerId: a.id, phase: 'closing', text: `我的重点是先发现值得尝试的地方。`, emotion: 'happy' },
      { speakerId: b.id, phase: 'closing', text: `我的重点是尝试以前先想清楚责任和影响。`, emotion: 'thinking' },
    ],
    commonGround: '两边都希望先认真了解，再做适合自己的选择。',
    closingQuestion: '听完两种想法，你最在意哪一个理由？',
  };
}

function sanitizeResult(raw, question, speakers) {
  if (!raw || raw.allowed === false) return {
    allowed: false,
    topic: clean(raw?.topic || question, 80),
    safeMessage: clean(raw?.safeMessage, 100) || '这个问题不适合让角色争论。请和身边可信任的大人一起聊一聊。',
    turns: [], commonGround: '', closingQuestion: '',
  };
  const ids = new Set(speakers.map(item => item.id));
  const phases = new Set(['opening', 'response', 'closing']);
  const emotions = new Set(['happy', 'thinking', 'idle']);
  const turns = (Array.isArray(raw.turns) ? raw.turns : []).slice(0, 6).flatMap((turn, index) => {
    const expected = speakers[index % 2]?.id;
    const speakerId = ids.has(turn?.speakerId) ? turn.speakerId : expected;
    const text = clean(turn?.text, 76);
    if (!speakerId || !text) return [];
    return [{ speakerId, phase: phases.has(turn?.phase) ? turn.phase : ['opening', 'response', 'closing'][Math.floor(index / 2)], text, emotion: emotions.has(turn?.emotion) ? turn.emotion : 'idle' }];
  });
  if (turns.length !== 6 || turns.some((turn, index) => turn.speakerId !== speakers[index % 2].id)) return fallback(question, speakers);
  return {
    allowed: true,
    topic: clean(raw.topic || question, 80),
    turns,
    commonGround: clean(raw.commonGround, 100) || '两边都希望做出更周到的选择。',
    closingQuestion: clean(raw.closingQuestion, 80) || '听完以后，你最在意哪一个理由？',
  };
}

export const maxDuration = 45;

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'method_not_allowed' });
  const question = clean(request.body?.question, 80);
  const speakers = (Array.isArray(request.body?.speakers) ? request.body.speakers : []).slice(0, 2).map(item => ({
    id: clean(item?.id, 32), name: clean(item?.name, 20), hint: clean(item?.hint, 80),
  }));
  if (!question || speakers.length !== 2 || speakers[0].id === speakers[1].id || speakers.some(item => !TEMPLATE_IDS.has(item.id) || !item.name)) {
    return response.status(400).json({ error: 'invalid_debate' });
  }
  if (privateInfo(question)) return response.status(200).json({ allowed: false, topic: '', turns: [], safeMessage: '这些个人信息不用告诉角色。换一个不包含姓名、学校、住址或联系方式的问题吧。' });
  if (unsafe(question)) return response.status(200).json({ allowed: false, topic: question, turns: [], safeMessage: '这个问题不适合让角色分两边争论。请马上告诉身边可信任的成年人，和他一起处理。' });

  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) return response.status(200).json(fallback(question, speakers));
  try {
    const baseUrl = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ARK_LLM_MODEL || 'doubao-seed-2-0-mini-260428',
        messages: [
          { role: 'system', content: `${SAFETY}\n只输出JSON：{"allowed":true,"topic":"中性具体辩题","turns":[{"speakerId":"角色ID","phase":"opening|response|closing","text":"发言","emotion":"happy|thinking|idle"}],"commonGround":"共同点","closingQuestion":"邀请孩子思考的问题"}。` },
          { role: 'user', content: `问题：${question}\nA角色：${JSON.stringify(speakers[0])}\nB角色：${JSON.stringify(speakers[1])}` },
        ],
        reasoning_effort: 'minimal', response_format: { type: 'json_object' }, max_tokens: 900,
      }),
    });
    if (!upstream.ok) throw new Error(`upstream_${upstream.status}`);
    const data = await upstream.json();
    const raw = JSON.parse(String(data?.choices?.[0]?.message?.content || '{}').replace(/^```json|```$/g, '').trim());
    return response.status(200).json(sanitizeResult(raw, question, speakers));
  } catch (error) {
    console.error('Debate unavailable', error?.message || error);
    return response.status(200).json(fallback(question, speakers));
  }
}
