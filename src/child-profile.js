export const CHILD_PROFILE_KEY = 'mengmeng-child-profile-v3';
export const LEGACY_CHILD_PROFILE_KEYS = [
  'mengmeng-child-profile-v2',
  'mengmeng-child-profile-v1',
];

export const PROFILE_FIELDS = [
  'ageBand',
  'learning',
  'attention',
  'explore',
  'challenge',
  'pace',
  'expression',
  'social',
  'role',
  'theme',
  'playStyle',
  'storyTone',
  'tone',
  'emotion',
  'encouragement',
  'sensitivities',
  'interest',
];

export const PROFILE_GROUPS = [
  { id: 'basics', label: '基本认识', fields: ['ageBand', 'learning', 'attention'] },
  { id: 'exploration', label: '探索方式', fields: ['explore', 'challenge', 'pace'] },
  { id: 'expression', label: '表达相处', fields: ['expression', 'social', 'role'] },
  { id: 'interests', label: '兴趣地图', fields: ['theme', 'playStyle', 'storyTone'] },
  { id: 'support', label: '陪伴方式', fields: ['tone', 'emotion', 'encouragement', 'sensitivities'] },
  { id: 'current', label: '最近着迷', fields: ['interest'] },
];

export function createEmptyChildProfile() {
  return {
    profileVersion: 3,
    ageBand: '',
    learning: '',
    attention: '',
    explore: '',
    challenge: '',
    pace: '',
    expression: '',
    social: '',
    role: '',
    theme: '',
    playStyle: '',
    storyTone: '',
    tone: '',
    emotion: '',
    encouragement: '',
    sensitivities: '',
    interest: '',
    voice: 'star',
    answers: {},
    reasons: [],
    scriptSummary: '',
    scriptNotes: [],
    completed: false,
  };
}

export function normalizeChildProfile(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const profile = { ...createEmptyChildProfile(), ...source };
  profile.profileVersion = 3;
  profile.voice = typeof profile.voice === 'string' && profile.voice ? profile.voice : 'star';
  profile.answers = profile.answers && typeof profile.answers === 'object' && !Array.isArray(profile.answers)
    ? profile.answers
    : {};
  profile.reasons = Array.isArray(profile.reasons) ? profile.reasons.filter(Boolean).slice(-12) : [];
  profile.scriptNotes = Array.isArray(profile.scriptNotes) ? profile.scriptNotes.filter(Boolean).slice(-8) : [];
  for (const field of PROFILE_FIELDS) {
    profile[field] = typeof profile[field] === 'string' ? profile[field].trim() : '';
  }
  profile.completed = PROFILE_FIELDS.every(field => Boolean(profile[field]));
  return profile;
}

export function loadChildProfile(storage = globalThis.localStorage) {
  if (!storage) return createEmptyChildProfile();
  try {
    const current = JSON.parse(storage.getItem(CHILD_PROFILE_KEY) || 'null');
    if (current && typeof current === 'object') return normalizeChildProfile(current);
    for (const key of LEGACY_CHILD_PROFILE_KEYS) {
      const legacy = JSON.parse(storage.getItem(key) || 'null');
      if (legacy && typeof legacy === 'object') return normalizeChildProfile(legacy);
    }
  } catch {
    // A malformed local profile should never block the experience.
  }
  return createEmptyChildProfile();
}

export function saveChildProfile(profile, storage = globalThis.localStorage) {
  const normalized = normalizeChildProfile(profile);
  if (storage) storage.setItem(CHILD_PROFILE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function profileCompletion(profile) {
  const answered = PROFILE_FIELDS.filter(field => Boolean(String(profile?.[field] || '').trim())).length;
  return { answered, total: PROFILE_FIELDS.length, complete: answered === PROFILE_FIELDS.length };
}

export function firstUnansweredProfileIndex(profile) {
  const field = PROFILE_FIELDS.find(item => !String(profile?.[item] || '').trim());
  return field ? PROFILE_FIELDS.indexOf(field) : PROFILE_FIELDS.length;
}

export function summarizeProfileGroups(profile) {
  const normalized = normalizeChildProfile(profile);
  return Object.fromEntries(PROFILE_GROUPS.map(group => {
    const values = group.fields.map(field => normalized[field]).filter(Boolean);
    return [group.id, values.length ? values.join(' · ') : '还在认识'];
  }));
}

function contains(value, word) {
  return String(value || '').includes(word);
}

export function buildGameInspiration(profile) {
  const p = normalizeChildProfile(profile);
  const theme = contains(p.theme, '动物') ? '藏着会说话的小动物'
    : contains(p.theme, '自然') ? '藏着会发光的叶子和种子'
      : contains(p.theme, '音乐') ? '藏着能听见的节奏线索'
        : contains(p.theme, '搭建') ? '藏着可以修好和搭起来的机关'
          : contains(p.theme, '宇宙') ? '藏着来自星空的小线索'
            : contains(p.theme, '神秘') ? '藏着一条等待推理的秘密路'
              : '藏着只属于你的新线索';
  const mission = contains(p.playStyle, '收集') ? '先留意散落的小光点，把它们一颗颗收集起来'
    : contains(p.playStyle, '自由探索') ? '可以先四处看看，再决定从哪里开始'
      : contains(p.playStyle, '创造') ? '一路上可以想想，怎样把找到的东西变成新作品'
        : contains(p.playStyle, '解谜') ? '先观察每个线索，再猜猜它们怎样连在一起'
          : '你可以自己决定先从哪里开始';
  const challenge = contains(p.challenge, '提示') ? '如果卡住了，我会先给你一个小提示。'
    : contains(p.challenge, '休息') ? '如果有点累，我们随时可以停一下再继续。'
      : contains(p.challenge, '换个办法') ? '第一种办法不成功，也可以换一种再试。'
        : '不用着急，我们可以一步一步来。';
  const encouragement = contains(p.encouragement, '努力') ? '我会记得你认真尝试过的每一步。'
    : contains(p.encouragement, '选择') ? '这一次仍然由你决定怎么做。'
      : contains(p.encouragement, '提示') ? '需要的时候，我会把线索变得更清楚一点。'
        : '你的办法会让这个世界继续长大。';
  const role = p.role || '小小世界发现者';
  const endingFlavor = contains(p.storyTone, '温暖') ? '这个安静又温暖的结尾，也有你的样子。'
    : contains(p.storyTone, '好笑') ? '等下一页图鉴打开，也许还会冒出一个怪笑话。'
      : contains(p.storyTone, '神秘') ? '雾门后还有一条小秘密，等着下次继续发现。'
        : '这场小小冒险，已经把下一条路点亮了。';
  return {
    role,
    theme,
    mission,
    openingHint: `我记得你喜欢的故事${theme}。${mission}。`,
    collectHint: contains(p.playStyle, '收集') ? '这正是你擅长的收集任务。' : '你刚刚发现了一条会留在图鉴里的线索。',
    gateEncouragement: `${challenge}${encouragement}`,
    endingLine: `作为${role}，你把自己的办法带进了花园。${endingFlavor}`,
    safetyPreference: p.sensitivities || '没有特别需要避开的内容',
    profileVersion: p.profileVersion,
  };
}
