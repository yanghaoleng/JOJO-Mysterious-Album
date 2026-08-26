const QUESTION_FIELDS = new Set(['theme', 'approach', 'companion', 'comfort']);
const SPECIES = new Set(['cat', 'dog', 'human']);
const PALETTES = new Set(['moss', 'sky', 'coral', 'moon']);
const FEATURES = new Set(['listening-ears', 'bright-eyes', 'soft-tail', 'star-freckles']);

const SYSTEM_PROMPT = `你是“萌萌星的奇妙图鉴”的儿童安全故事伙伴。
当前孩子正在用自由回答帮助一只小宠物长出性格。孩子约 5 至 8 岁。
你的任务先判断这句话是否已经包含足够内容，值得角色现在回应。若只是“嗯、啊、等一下、不知道”、明显没说完的半句话或无关环境声，shouldRespond=false，让角色继续听。若已表达一种喜欢的事物、准备采取的行动、陪伴方法或想放慢的情境，shouldRespond=true。不要机械等待固定词，儿童的简短但明确回答也算完整。
forceRespond=true 表示孩子点了完整选项，必须 shouldRespond=true。
当 shouldRespond=true 时，像朋友一样给出一句自然、具体、不评判对错的回应，再抽取一个低敏感度偏好。回应只承接刚才的内容，不要再向孩子提出新问题，因为下一道正式问题会紧接着出现。
不要索取或重复姓名、学校、住址、电话、账号、精确生日等个人信息。若回答里出现这些内容，用温柔的话提醒“不用告诉我这些，我们只聊你喜欢怎样冒险”，并且不要把个人信息写入任何字段。
不要诊断孩子，不给人格贴负面标签，不生成恐怖、伤害、羞辱、成人或竞争压力内容。
只输出 JSON：
{
  "shouldRespond": true,
  "keywords": ["最多3个真正听到的关键词"],
  "listeningPrompt": "shouldRespond=false时给孩子的8至22字继续表达提示",
  "reaction": "18至38个中文字符，具体回应孩子刚才说的内容",
  "heard": "不超过12个中文字符的偏好摘要",
  "profileValue": "不超过18个中文字符",
  "petHint": {
    "species": "cat|dog|human",
    "palette": "moss|sky|coral|moon",
    "feature": "listening-ears|bright-eyes|soft-tail|star-freckles"
  },
  "privacyRedirect": false
}
不要输出 Markdown。`;

function text(value, max) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
}

function hasLikelyPrivateInfo(value) {
  const source = String(value || '');
  return /(?:1[3-9]\d{9}|\d{5,}@|(?:住在|地址|学校叫|手机号|微信号|QQ号|身份证))/.test(source);
}

function fallbackHint(answer) {
  const value = String(answer || '');
  const species = /一起|伙伴|热闹|跑|玩/.test(value) ? 'dog' : /安静|慢|看看|听/.test(value) ? 'cat' : 'human';
  const palette = /星|月|太空|夜/.test(value) ? 'moon' : /海|水|雨|蓝/.test(value) ? 'sky' : /花|暖|红|太阳/.test(value) ? 'coral' : 'moss';
  const feature = /听|安静|声音/.test(value) ? 'listening-ears' : /看|观察|发现/.test(value) ? 'bright-eyes' : /一起|朋友|陪/.test(value) ? 'soft-tail' : 'star-freckles';
  return { species, palette, feature };
}

function fallbackKeywords(questionId, answer) {
  const pools = {
    theme: ['动物', '猫', '狗', '狐狸', '太空', '星星', '飞船', '森林', '植物', '海', '雨'],
    approach: ['看', '观察', '推', '打开', '敲门', '等', '叫', '伙伴', '一起'],
    companion: ['陪', '坐', '玩', '问', '听', '抱', '一起', '安静'],
    comfort: ['声音', '太大', '没看懂', '没看明白', '慢', '自己选', '累', '害怕'],
  };
  return (pools[questionId] || []).filter(keyword => String(answer).includes(keyword)).slice(0, 3);
}

function fallbackShouldRespond(questionId, answer) {
  const compact = String(answer).replace(/[，。！？、,.!?\s]/g, '');
  if (/^(嗯+|啊+|哦+|呃+|不知道|没想好|等一下|再想想|我?还?想一想|我想想|让我想想|听不清)$/.test(compact)) return false;
  return fallbackKeywords(questionId, answer).length > 0 || compact.length >= 3;
}

function clean(raw, answer, questionId, forceRespond = false) {
  const privateInfo = hasLikelyPrivateInfo(answer);
  let parsed = {};
  try {
    parsed = JSON.parse(String(raw || '').replace(/^```json\s*|\s*```$/g, ''));
  } catch {
    parsed = {};
  }

  const hint = fallbackHint(answer);
  const fallbackWords = fallbackKeywords(questionId, answer);
  const parsedWords = Array.isArray(parsed.keywords) ? parsed.keywords.map(value => text(value, 10)).filter(Boolean).slice(0, 3) : [];
  const keywords = parsedWords.length ? parsedWords : fallbackWords;
  const safeToRespond = fallbackShouldRespond(questionId, answer);
  const shouldRespond = forceRespond || safeToRespond && (typeof parsed.shouldRespond === 'boolean' ? parsed.shouldRespond : safeToRespond);
  const suggested = parsed.petHint && typeof parsed.petHint === 'object' ? parsed.petHint : {};
  const petHint = {
    species: SPECIES.has(suggested.species) ? suggested.species : hint.species,
    palette: PALETTES.has(suggested.palette) ? suggested.palette : hint.palette,
    feature: FEATURES.has(suggested.feature) ? suggested.feature : hint.feature,
  };

  if (privateInfo || parsed.privacyRedirect === true) {
    return {
      shouldRespond: true,
      keywords: [],
      listeningPrompt: '',
      reaction: '这些个人信息不用告诉我，我们只聊你喜欢怎样冒险就好。',
      heard: '保护自己的信息',
      profileValue: '愿意保护个人信息',
      questionId,
      petHint,
      privacyRedirect: true,
    };
  }

  return {
    shouldRespond,
    keywords,
    listeningPrompt: text(parsed.listeningPrompt, 42) || (keywords.length ? `听见了“${keywords.join('、')}”，你还可以接着说。` : '我还在听，你可以再说完整一点。'),
    reaction: text(parsed.reaction, 48) || '我听见了。这个想法会变成小伙伴身上的一个秘密。',
    heard: text(parsed.heard, 12) || text(answer, 12),
    profileValue: text(parsed.profileValue, 18) || text(answer, 18),
    questionId,
    petHint,
    privacyRedirect: false,
  };
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'method_not_allowed' });

  const answer = text(request.body?.answer, 180);
  const questionId = text(request.body?.questionId, 24);
  const question = text(request.body?.question, 100);
  const forceRespond = request.body?.forceRespond === true;
  if (!QUESTION_FIELDS.has(questionId)) return response.status(400).json({ error: 'unknown_question' });
  if (answer.length < 1) return response.status(400).json({ error: 'answer_required' });

  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) return response.status(503).json({ error: 'story_ai_not_configured' });

  try {
    const baseUrl = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.ARK_LLM_MODEL || 'doubao-seed-2-0-mini-260428',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `问题字段：${questionId}\n问题：${question}\n孩子当前说的话：${answer}\nforceRespond：${forceRespond}` },
        ],
        reasoning_effort: 'minimal',
        response_format: { type: 'json_object' },
        max_tokens: 320,
      }),
      signal: AbortSignal.timeout(24000),
    });

    if (!upstream.ok) return response.status(502).json({ error: 'story_ai_upstream_error' });
    const data = await upstream.json();
    return response.status(200).json(clean(data.choices?.[0]?.message?.content, answer, questionId, forceRespond));
  } catch (error) {
    console.error('Story turn failed', error?.name || 'Error', error?.message || 'unknown');
    return response.status(502).json({ error: 'story_ai_unavailable' });
  }
}
