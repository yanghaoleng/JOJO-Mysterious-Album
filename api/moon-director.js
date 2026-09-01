const SCENE_IDS = new Set(['moon-hill', 'moon-underwater', 'moon-pocket', 'moon-clouds', 'moon-landing']);
const VISUAL_KINDS = new Set(['portal', 'rocket', 'submarine', 'ladder', 'parachute', 'balloon', 'vehicle']);
const MOTIONS = new Set(['pulse', 'lift', 'drift']);

const SYSTEM_PROMPT = `你是“萌萌星的奇妙图鉴”中《登月计划》的实时故事导演与道具设计师。
体验者约 10 岁以上。整段旅程只有一个固定目标：登上月球。孩子可以自由提出传送门、火箭或任何安全的虚构发明；你要认真沿用这个想法，组织下一小段剧情，并把它翻译成前端能立即画出的结构化视觉方案。

必须遵守：
1. 不把孩子的想法判错，不用考试口吻。明确说出刚才哪一部分被画进了发明。
2. 当前场景给出的 destination 和 constraint 是固定故事骨架，必须发生；可以写得有趣，但不能跳过、改写成别的终点或让角色受伤。
3. 每次只推进一个场景。不要提前总结整段故事，也不要替孩子决定下一轮方案。
4. visual.kind 只能是 portal、rocket、submarine、ladder、parachute、balloon、vehicle。选最接近孩子原话的一种；无法归类就用 vehicle。
5. visual.name 是 2 至 10 个汉字的发明名；primary 和 accent 必须是六位十六进制颜色；motion 只能是 pulse、lift、drift。
6. 不索取、复述或保存姓名、学校、住址、电话、账号、精确生日。拒绝危险模仿、武器、伤害、成人、恐怖、羞辱内容，把它温和改写为安全的绘本机关。
7. 若只是语气词、明显没说完或“不知道”，shouldRespond=false，并给一句具体提示，引导先说要造或要改的一件东西。

只输出 JSON：
{
  "shouldRespond": true,
  "reaction": "不超过48字，具体承接孩子想法并说清画进了什么",
  "outcome": "不超过76字，按固定骨架写出本轮装置怎样行动并抵达指定地点",
  "listeningPrompt": "shouldRespond=false时的具体引导",
  "visual": {
    "kind": "portal|rocket|submarine|ladder|parachute|balloon|vehicle",
    "name": "发明名",
    "primary": "#5f718c",
    "accent": "#d1a44b",
    "details": "不超过24字的可见细节",
    "motion": "pulse|lift|drift"
  },
  "privacyRedirect": false
}
不要输出 Markdown。`;

function text(value, max) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
}

function hasLikelyPrivateInfo(value) {
  return /(?:1[3-9]\d{9}|\d{5,}@|(?:住在|地址|学校叫|手机号|微信号|QQ号|身份证))/.test(String(value || ''));
}

function fallbackKind(answer) {
  const value = String(answer || '');
  if (/传送|门|通道/.test(value)) return 'portal';
  if (/火箭|飞船|推进/.test(value)) return 'rocket';
  if (/潜水|船|气泡/.test(value)) return 'submarine';
  if (/梯|弹簧|绳/.test(value)) return 'ladder';
  if (/伞|降落/.test(value)) return 'parachute';
  if (/气球|热气球/.test(value)) return 'balloon';
  return 'vehicle';
}

function fallbackOutcome(sceneId) {
  return {
    'moon-hill': '装置顺利启动，却把海面反光认成了月光。大家安全落进海底，第一条航线需要修正。',
    'moon-underwater': '新改造把大家送出海面，一阵上升气流又把整支小队轻轻兜进巨人的外套口袋。',
    'moon-pocket': '口袋里的纽扣和线都派上了用场。装置冲出袋口，一直升进厚厚的云层。',
    'moon-clouds': '导航功能找到了云层上方。装置穿过最后一团白云，抵达月球上空。',
    'moon-landing': '着陆装置放慢速度，轻轻碰到月球表面。所有人站稳以后，第一枚脚印留了下来。',
  }[sceneId];
}

function fallbackName(kind) {
  return {
    portal: '折叠传送门', rocket: '月光火箭', submarine: '气泡潜航器', ladder: '弹簧折叠梯',
    parachute: '月面降落伞', balloon: '云层气球', vehicle: '自由组合飞行器',
  }[kind];
}

function cleanResult(raw, payload) {
  let parsed = {};
  try {
    parsed = JSON.parse(String(raw || '').replace(/^```json\s*|\s*```$/g, ''));
  } catch {
    parsed = {};
  }
  if (hasLikelyPrivateInfo(payload.answer) || parsed.privacyRedirect === true) {
    return {
      shouldRespond: false,
      reaction: '',
      outcome: '',
      listeningPrompt: '个人信息不用告诉我，只说想造或想改什么。',
      visual: null,
      privacyRedirect: true,
    };
  }
  const compact = String(payload.answer || '').replace(/[，。！？、,.!?\s]/g, '');
  const incomplete = /^(?:嗯+|啊+|哦+|呃+|不知道|没想好|等一下|再想想|我想想|让我想想)$/u.test(compact);
  if (!compact || incomplete || parsed.shouldRespond === false) {
    return {
      shouldRespond: false,
      reaction: '',
      outcome: '',
      listeningPrompt: text(parsed.listeningPrompt, 42) || '先说一件要造或要改的东西，我会接着画。',
      visual: null,
      privacyRedirect: false,
    };
  }
  const suggested = parsed.visual && typeof parsed.visual === 'object' ? parsed.visual : {};
  const fallback = fallbackKind(payload.answer);
  const kind = VISUAL_KINDS.has(suggested.kind) ? suggested.kind : fallback;
  const primary = /^#[0-9a-f]{6}$/i.test(suggested.primary || '') ? suggested.primary : '#5f718c';
  const accent = /^#[0-9a-f]{6}$/i.test(suggested.accent || '') ? suggested.accent : '#d1a44b';
  let outcome = text(parsed.outcome, 92);
  if (!outcome || !outcome.includes(payload.destination)) outcome = fallbackOutcome(payload.sceneId);
  return {
    shouldRespond: true,
    reaction: text(parsed.reaction, 64) || `我把你的想法画进了“${fallbackName(kind)}”。`,
    outcome,
    listeningPrompt: '',
    visual: {
      kind,
      name: text(suggested.name, 16) || fallbackName(kind),
      primary,
      accent,
      details: text(suggested.details, 32) || text(payload.answer, 24),
      motion: MOTIONS.has(suggested.motion) ? suggested.motion : kind === 'portal' ? 'pulse' : kind === 'submarine' ? 'drift' : 'lift',
    },
    privacyRedirect: false,
  };
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'method_not_allowed' });
  const payload = {
    storyId: text(request.body?.storyId, 32),
    sceneId: text(request.body?.sceneId, 32),
    sceneName: text(request.body?.sceneName, 40),
    question: text(request.body?.question, 140),
    destination: text(request.body?.destination, 32),
    constraint: text(request.body?.constraint, 120),
    answer: text(request.body?.answer, 180),
    previousInventions: Array.isArray(request.body?.previousInventions)
      ? request.body.previousInventions.map(value => text(value, 16)).filter(Boolean).slice(0, 3)
      : [],
  };
  if (payload.storyId !== 'moon-plan' || !SCENE_IDS.has(payload.sceneId)) return response.status(400).json({ error: 'unknown_scene' });
  if (!payload.answer) return response.status(400).json({ error: 'answer_required' });
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) return response.status(503).json({ error: 'moon_director_not_configured' });

  try {
    const baseUrl = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ARK_LLM_MODEL || 'doubao-seed-2-0-mini-260428',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `当前场景：${payload.sceneName}（${payload.sceneId}）\n角色问题：${payload.question}\n孩子刚才说：${payload.answer}\n本轮必须抵达：${payload.destination}\n固定剧情约束：${payload.constraint}\n之前造过：${payload.previousInventions.join('、') || '还没有'}`,
          },
        ],
        reasoning_effort: 'minimal',
        response_format: { type: 'json_object' },
        max_tokens: 520,
      }),
      signal: AbortSignal.timeout(24000),
    });
    if (!upstream.ok) return response.status(502).json({ error: 'moon_director_upstream_error' });
    const data = await upstream.json();
    return response.status(200).json(cleanResult(data.choices?.[0]?.message?.content, payload));
  } catch (error) {
    console.error('Moon director failed', error?.name || 'Error', error?.message || 'unknown');
    return response.status(502).json({ error: 'moon_director_unavailable' });
  }
}
