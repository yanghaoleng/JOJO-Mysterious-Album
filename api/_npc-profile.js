import { getNpc } from '../src/story-npcs/catalog.js';

// The request selects an authored profile; it never supplies a persona, voice
// definition or system instruction. Do not trim/repair an unknown ID into one.
export function npcProfile(id) {
  if (typeof id !== 'string' || id.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) return null;
  return getNpc(id);
}

export function npcSystemContext(id) {
  const profile = npcProfile(id);
  if (!profile) return '';
  const { name, personality, speakingStyle, sampleLine } = profile;
  return '\n\n当前发言的是下面这位故事 NPC，不是孩子创建的伙伴。只用这些设定调整 reaction 和 listeningPrompt 的口吻，不替换主角或其他人物身份。以上儿童安全规则、行动 ID 白名单、剧情约束、字数与输出格式始终优先；示例只参考语气，不必复述，也不能额外追问。\n受控角色设定：'
    + JSON.stringify({ npcId: profile.id, name, personality, speakingStyle, sampleLine });
}

export function npcSpeechRate(profile, fallback = 1) {
  const value = typeof profile?.speechRate === 'number' && Number.isFinite(profile.speechRate) ? profile.speechRate : fallback;
  return Math.max(.86, Math.min(1.08, Number.isFinite(value) ? value : 1));
}
