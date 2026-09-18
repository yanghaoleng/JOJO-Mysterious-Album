// One locally saved thread across the three independently addressable chapters.
const KEY = 'jma.curiosity-journey.v1';
export function journey() {
  try { const value = JSON.parse(localStorage.getItem(KEY)); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; }
}
export function rememberJourney(chapter, value) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...journey(), [chapter]: value })); } catch {}
}
export const CURIOSITY_MISSION = '让宇宙里的朋友重新愿意提问、听见不同想法，再一起动手试试。';
export const DEBATE_TOPICS = [
  '要救回好奇心，先去探索还是先把问题想清楚？',
  '大家想去不同星球，轮流选还是一起商量？',
  '新发明只听一个点子，还是把不同点子拼起来？',
];
export function debateFallback(topic, speakers) {
  const n = Math.max(0, DEBATE_TOPICS.indexOf(topic));
  const lines = [
    ['先想清楚一个问题，出发就知道要看什么。','先走出去也会发现，原来还有没想到的问题。','如果一直想却不出发，我们会错过什么？','如果边走边记问题，就能带着发现回来想。','我愿意带一个问题出发，再慢慢补充计划。','我也愿意停下来听。好奇心可以一边走一边长。'],
    ['轮流选目的地，安静的朋友也能带一次路。','先听大家想去的理由，也许能找到共同的路。','如果总是最响亮的人说话，轮流能帮上忙。','那就让每个人都说一句，再一起排顺序。','我想保留轮流的机会，让每个问题都被听见。','我想保留商量的时间，让路线可以改变。'],
    ['先试一个点子，比较容易看见它怎么工作。','把不同点子拼起来，可能会长出意外的办法。','一次拼太多，坏了可能不知道该改哪里。','那我们先试一个，再接上朋友的一小块。','试做不是考试。看见结果以后，还能修改。','听见不同的理由，宇宙就多了一条新路。'],
  ][n];
  return { allowed: true, topic, turns: lines.map((text, i) => ({ speakerId: speakers[i % 2].id, text })), commonGround: '让每个人的问题都有地方落下，再一起试一试。', closingQuestion: '你想先试哪种办法？说一个理由，也可以把两种办法合起来。' };
}
