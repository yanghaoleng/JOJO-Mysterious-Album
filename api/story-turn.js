const QUESTION_FIELDS = new Set(['appearance', 'color', 'companion']);
const SCENE_IDS = new Set(['paper-harbor', 'whisper-slope', 'backward-market', 'moon-post', 'silent-lighthouse', 'page-sea']);
const SPECIES = new Set(['cat', 'dog', 'human']);
const PALETTES = new Set(['moss', 'sky', 'coral', 'moon']);
const FEATURES = new Set(['listening-ears', 'bright-eyes', 'soft-tail', 'star-freckles']);

const SYSTEM_PROMPT = `你是“萌萌星的奇妙图鉴”的儿童安全故事伙伴。
当前孩子正在回答三个直接问题，帮助系统画出刚刚随机分配的小宠物。三个问题只涉及外形特征、颜色和陪伴方式。孩子约 5 至 7 岁。
你的任务先判断这句话是否已经包含足够内容，值得角色现在回应。若只是“嗯、啊、等一下、不知道”、明显没说完的半句话或无关环境声，shouldRespond=false，让角色继续听。若已表达一种外形特征、颜色或陪伴方法，shouldRespond=true。不要机械等待固定词，儿童的简短但明确回答也算完整。
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

const SCENE_SYSTEM_PROMPT = `你是“萌萌星的奇妙图鉴”的儿童安全故事角色。
孩子约 5 至 7 岁，正用自然语音回答故事情境。界面不显示选项，你要把孩子自己的说法理解成当前场景里最接近的一种行动。
只允许从提供的 choiceId 中选择，不得编造新 ID。若只是语气词、明显没说完、不知道、环境声，或无法判断想采取哪种行动，shouldRespond=false，并用 8 至 22 个中文字符温柔引导孩子把想做的事再说具体一点。
如果表达已经明确，即使只有很短的一句，也应 shouldRespond=true。reaction 用孩子一听就懂的短句承接，最多 36 个中文字符，一次只说一件具体发生的事。不要使用抽象隐喻，不评价对错，不再提出新问题。
不要索取或重复姓名、学校、住址、电话、账号、精确生日等个人信息。若出现个人信息，privacyRedirect=true，shouldRespond=false，引导回故事行动。
不要生成恐怖、伤害、羞辱、成人或竞争压力内容。
只输出 JSON：
{
  "shouldRespond": true,
  "choiceId": "必须来自提供的 ID",
  "reaction": "场景回应",
  "listeningPrompt": "没听完整时的引导",
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
  const palette = /紫|银|星|月|夜/.test(value) ? 'moon' : /蓝|白|海|水|雨/.test(value) ? 'sky' : /粉|橙|红|暖/.test(value) ? 'coral' : 'moss';
  const feature = /耳|听|安静/.test(value) ? 'listening-ears' : /眼|亮|看/.test(value) ? 'bright-eyes' : /尾|软|陪|抱/.test(value) ? 'soft-tail' : 'star-freckles';
  return { species, palette, feature };
}

function fallbackKeywords(questionId, answer) {
  const pools = {
    appearance: ['耳朵', '眼睛', '尾巴', '翅膀', '花纹', '毛', '角', '圆', '长', '亮'],
    color: ['红', '黄', '蓝', '绿', '紫', '粉', '白', '黑', '彩色', '金色'],
    companion: ['陪', '坐', '玩', '问', '听', '抱', '一起', '安静'],
  };
  return (pools[questionId] || []).filter(keyword => String(answer).includes(keyword)).slice(0, 3);
}

function fallbackShouldRespond(questionId, answer) {
  const compact = String(answer).replace(/[，。！？、,.!?\s]/g, '');
  if (/^(嗯+|啊+|哦+|呃+|不知道|没想好|等一下|再想想|我?还?想一想|我想想|让我想想|听不清)$/.test(compact)) return false;
  return fallbackKeywords(questionId, answer).length > 0 || compact.length >= 3;
}

function sanitizeSceneChoices(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 4).map(choice => ({
    id: text(choice?.id, 32).replace(/[^a-z0-9-]/g, ''),
    label: text(choice?.label, 36),
    result: text(choice?.result, 80),
    trait: text(choice?.trait, 24),
    voiceHints: Array.isArray(choice?.voiceHints) ? choice.voiceHints.map(value => text(value, 16)).filter(Boolean).slice(0, 6) : [],
  })).filter(choice => choice.id && choice.label);
}

function fallbackSceneChoice(answer, choices) {
  const compact = String(answer || '').replace(/[，。！？、,.!?\s]/g, '');
  let best = null;
  for (const choice of choices) {
    const hints = [...choice.voiceHints, choice.label];
    const score = hints.reduce((total, hint) => total + (compact.includes(String(hint).replace(/\s/g, '')) ? String(hint).length : 0), 0);
    if (!best || score > best.score) best = { id: choice.id, score };
  }
  return best?.score > 0 ? best.id : '';
}

function cleanScene(raw, answer, sceneId, choices) {
  let parsed = {};
  try {
    parsed = JSON.parse(String(raw || '').replace(/^```json\s*|\s*```$/g, ''));
  } catch {
    parsed = {};
  }
  if (hasLikelyPrivateInfo(answer) || parsed.privacyRedirect === true) {
    return {
      shouldRespond: false,
      choiceId: '',
      reaction: '',
      listeningPrompt: '这些信息不用告诉我，只说故事里想做什么。',
      privacyRedirect: true,
      sceneId,
    };
  }
  const compact = String(answer).replace(/[，。！？、,.!?\s]/g, '');
  const incomplete = /^(嗯+|啊+|哦+|呃+|不知道|没想好|等一下|再想想|我想想|让我想想)$/u.test(compact);
  const allowed = new Set(choices.map(choice => choice.id));
  const parsedChoice = text(parsed.choiceId, 32);
  const choiceId = allowed.has(parsedChoice) ? parsedChoice : fallbackSceneChoice(answer, choices);
  const shouldRespond = !incomplete && Boolean(choiceId) && parsed.shouldRespond !== false;
  const choice = choices.find(item => item.id === choiceId);
  return {
    shouldRespond,
    choiceId: shouldRespond ? choiceId : '',
    reaction: shouldRespond ? text(parsed.reaction, 56) || choice?.result || '' : '',
    listeningPrompt: shouldRespond ? '' : text(parsed.listeningPrompt, 42) || '我还在听，可以再说具体一点。',
    privacyRedirect: false,
    sceneId,
  };
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

  const mode = text(request.body?.mode, 16) || 'interview';
  const answer = text(request.body?.answer, 180);
  const questionId = text(request.body?.questionId, 24);
  const question = text(request.body?.question, 100);
  const forceRespond = request.body?.forceRespond === true;
  if (answer.length < 1) return response.status(400).json({ error: 'answer_required' });
  const sceneId = text(request.body?.sceneId, 32);
  const sceneChoices = sanitizeSceneChoices(request.body?.choices);
  if (mode === 'scene') {
    if (!SCENE_IDS.has(sceneId) || sceneChoices.length < 2) return response.status(400).json({ error: 'unknown_scene' });
  } else if (!QUESTION_FIELDS.has(questionId)) {
    return response.status(400).json({ error: 'unknown_question' });
  }

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
          { role: 'system', content: mode === 'scene' ? SCENE_SYSTEM_PROMPT : SYSTEM_PROMPT },
          {
            role: 'user',
            content: mode === 'scene'
              ? `场景：${sceneId}\n角色问题：${question}\n可用行动：${JSON.stringify(sceneChoices.map(({ id, label, voiceHints }) => ({ id, label, voiceHints })))}\n孩子说：${answer}`
              : `问题字段：${questionId}\n问题：${question}\n孩子当前说的话：${answer}\nforceRespond：${forceRespond}`,
          },
        ],
        reasoning_effort: 'minimal',
        response_format: { type: 'json_object' },
        max_tokens: 320,
      }),
      signal: AbortSignal.timeout(24000),
    });

    if (!upstream.ok) return response.status(502).json({ error: 'story_ai_upstream_error' });
    const data = await upstream.json();
    const raw = data.choices?.[0]?.message?.content;
    return response.status(200).json(mode === 'scene'
      ? cleanScene(raw, answer, sceneId, sceneChoices)
      : clean(raw, answer, questionId, forceRespond));
  } catch (error) {
    console.error('Story turn failed', error?.name || 'Error', error?.message || 'unknown');
    return response.status(502).json({ error: 'story_ai_unavailable' });
  }
}
