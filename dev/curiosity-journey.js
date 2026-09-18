// One locally saved thread across the three independently addressable chapters.
const KEY = 'jma.curiosity-journey.v1';
export function journey() {
  try { const value = JSON.parse(localStorage.getItem(KEY)); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; }
}
export function rememberJourney(chapter, value) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...journey(), [chapter]: value })); } catch {}
}

export { CURIOSITY_MISSION, DEBATE_TOPICS, debateFallback } from './content/stories/debate.js';
