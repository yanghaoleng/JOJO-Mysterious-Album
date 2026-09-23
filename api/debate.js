const TEMPLATE_IDS = new Set([
  'bean-dog', 'moon-cat', 'snow-rabbit', 'honey-bear', 'curl-fox',
  'bamboo-panda', 'pond-frog', 'book-owl', 'forest-deer', 'leaf-hedgehog',
  'river-otter', 'cloud-alpaca',
]);

const SAFETY = `你是儿童绘本场景编剧，为5至8岁儿童写两个朋友之间的观点对话。目标不是分胜负，而是让他们真的听见并回应对方。
若问题提到宇宙、好奇心或救援队，沿用三章主线：孩子在第一章用提问唤醒星球；本章用理由和倾听保护好奇心；下一章会把自己的办法做成真实可见的故事物件。不要引入新的灾难或输赢。
先判断问题类型。选择题才展示两个合理角度，并找一个能把两种办法都试一试的小行动。像“为什么天是蓝的”这样的事实解释题绝不能硬编成正反观点：两位角色应合作解释可靠知识，分清事实与猜想；不知道就坦白不知道，不能用“观察一下、试一试”代替答案。
只输出4句，A/B/A/B严格交替。选择题依次为：offer提出具体办法；connect接住一点再提另一办法；challenge回应刚才内容并追问或调整；experiment提出连接两种办法的小实验。事实解释题依次为：offer给出核心事实；connect补充关键原因；challenge提出孩子自然会追问的相关现象并回答；experiment给出安全、可观察的验证或进一步发现。
每句18至34个汉字，只说一件事，适合直接说出口。至少两句包含具体动作、物品或场景。不要复述完整问题，不讲大道理，不使用“我认为”“另一方面”“我的重点是”“综合来看”“做出合适的选择”。两位角色的句式和语气必须不同。
书桌小鸮安静具体，喜欢“先看看”“我发现”，会提出观察问题；雪团小兔轻快爱行动，喜欢“那我们试一小步”“要不”，会先接住对方再提出试法。角色可以根据新理由调整想法。
不讽刺、不贬低、不制造输赢或群体对立；不编造数据和专家结论。
不得讨论成人、性、仇恨、伤害、自残、违法方法、危险模仿、现实政治动员、医疗法律金融决策。
不得索取或复述姓名、学校、住址、电话、账号、精确生日。高风险问题allowed=false，给出温和安全说明并建议询问可信任成年人。
事实题必须直接回答题目，不能把选择权或查答案的任务推回给孩子。最后用commonGround概括真正学到的内容；closingQuestion邀请孩子观察相关现象。选择题则邀请孩子选择、组合或改造办法。
事实题示例“为什么天是蓝的”：太阳光有许多颜色，空气把蓝光更多地撒向四面；傍晚阳光走过更长的空气，蓝光沿路散开，眼前更容易留下红橙光。`;

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
  const subject = clean(question.replace(/[？?。！!]/g, ''), 22) || '这件事';
  const isSkyQuestion = /(?:天空|天)(?:为什么|为何|怎么会|怎么是).{0,4}蓝|为什么.{0,4}(?:天空|天).{0,3}蓝/.test(question);
  const isWhyQuestion = /为什么|为何|怎么会|怎么是/.test(question);
  const isTogether = /一起|大家|轮流|商量|合作|不同/.test(question);
  const isTry = /发明|点子|试|探索|问题|好奇/.test(question);
  const lines = isSkyQuestion ? [
    '太阳光里藏着许多颜色，来到天空时会碰上空气。',
    '空气更容易把蓝光撒向四面，所以到处都能看到蓝色。',
    '那傍晚为什么变红？因为阳光穿过的空气更长了。',
    '蓝光一路被撒开，剩下的红橙光更容易来到我们眼前。',
  ] : isWhyQuestion ? [
    `这是在问“${subject.slice(0, 12)}”的原因，我们先找可靠线索。`,
    '我来分清哪些是已经知道的，哪些还只是有趣的猜想。',
    '如果证据还不够，就把不知道的地方清楚地留下来。',
    '等资料连上再回答；现在先观察它在什么时候会变化。',
  ] : isTogether ? [
    '我想先让每个人轮流说一句，安静的声音也不会漏掉。',
    '轮流很公平，不过先听理由，也许能找到一条共同的路。',
    '你说的共同路线很好。那谁来记下还没说出的想法？',
    '要不画张路线图：每人贴一颗星，再一起排先后。',
  ] : isTry ? [
    `我想先看看“${subject}”有哪些能观察到的线索。`,
    '你来观察，我来试一小步，看看眼前会有什么变化。',
    '这个试法不错。我们把变化记在哪儿才不会忘？',
    '画张小表格吧：试一次、记一笔，再一起看。',
  ] : [
    `我想先画出“${subject}”会遇到的两个小场景。`,
    '你先画，我来挑一个试试看，哪里不合适就停下来。',
    '先试一个场景很清楚。可我们要留意谁的感受呢？',
    '要不先演一分钟，再交换位置，说说各自看见了什么。',
  ];
  return {
    allowed: true,
    topic: question,
    turns: lines.map((text, index) => ({ speakerId: index % 2 ? b.id : a.id, phase: ['offer', 'connect', 'challenge', 'experiment'][index], text, emotion: index % 2 ? 'happy' : 'thinking' })),
    commonGround: isSkyQuestion ? '白天的蓝和傍晚的红，都和阳光穿过空气有关。' : isWhyQuestion ? '不知道时不硬猜，要分清事实、猜想和还缺少的线索。' : '两边都想先看见会发生什么，再照顾到同行的朋友。',
    closingQuestion: isSkyQuestion ? '下次看天空时，你想比较中午和傍晚的哪种颜色？' : isWhyQuestion ? '你还观察到什么变化，能成为寻找答案的新线索？' : '你想先试哪一步？也可以把两个办法拼成新办法。',
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
  const phaseOrder = ['offer', 'connect', 'challenge', 'experiment'];
  const emotions = new Set(['happy', 'thinking', 'idle']);
  const stiffLanguage = /我认为|另一方面|我的重点是|综合来看|做出合适的选择/;
  const turns = (Array.isArray(raw.turns) ? raw.turns : []).slice(0, 4).flatMap((turn, index) => {
    const expected = speakers[index % 2]?.id;
    const speakerId = ids.has(turn?.speakerId) ? turn.speakerId : expected;
    const text = clean(turn?.text, 76);
    if (!speakerId || text.length < 10 || text.length > 42 || stiffLanguage.test(text) || turn?.phase !== phaseOrder[index]) return [];
    return [{ speakerId, phase: phaseOrder[index], text, emotion: emotions.has(turn?.emotion) ? turn.emotion : 'idle' }];
  });
  if (turns.length !== 4 || turns.some((turn, index) => turn.speakerId !== speakers[index % 2].id || turn.phase !== phaseOrder[index])) return fallback(question, speakers);
  return {
    allowed: true,
    topic: clean(raw.topic || question, 80),
    turns,
    commonGround: clean(raw.commonGround, 100) || '两边都想先看看会发生什么，也愿意照顾彼此的想法。',
    closingQuestion: clean(raw.closingQuestion, 80) || '你想先试哪一步，还是把两个办法拼起来？',
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
          { role: 'system', content: `${SAFETY}\n只输出JSON：{"allowed":true,"topic":"中性具体问题","turns":[{"speakerId":"角色ID","phase":"offer|connect|challenge|experiment","text":"发言","emotion":"happy|thinking|idle"}],"commonGround":"共同关心的具体事情","closingQuestion":"邀请孩子选择或组合办法的问题"}。` },
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
