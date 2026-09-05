/**
 * Real-DOM acceptance checks. The app's diagnostic status is only read.
 * No application functions/state, storage writes, or network replies are mocked.
 * Usage: node dev/tools/verify-story-flows.mjs [doudou|echo|moon]
 */
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { STORIES } from '../stories.js';

const browser = '/Users/jojo/.npm-global/bin/agent-browser';
const session = process.env.DEV_QA_SESSION || 'dev-story-qa';
const base = process.env.DEV_QA_BASE || 'http://127.0.0.1:8913/dev/';
const stories = process.argv[2] ? [process.argv[2]] : ['doudou', 'echo', 'moon'];
const command = (...args) => execFileSync(browser, ['--session', session, ...args], { encoding: 'utf8', timeout: 25000 }).trim();
const evaluate = source => JSON.parse(command('eval', source));
const status = () => evaluate('window.__DEV_STORY__.status');
const log = [];
const record = (event, details) => { const entry = { event, ...details }; log.push(entry); console.log(JSON.stringify(entry)); };
const capture = name => command('screenshot', `/tmp/dev-story-qa-${name}.png`);
const click = selector => {
  // Short viewports need a real scroll before pointer clicks below the fold.
  command('eval', `document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'center',inline:'center',behavior:'instant'})`);
  return command('click', selector);
};
function decision() {
  return evaluate(`(async()=>{
    const lines=[],seen=new Set();let skips=0;
    const began=Date.now();
    while(Date.now()-began<18000){
      const state=window.__DEV_STORY__.status;
      if(['setup','question','complete'].includes(state.phase)&&!state.busy)return {state,lines,skips};
      const card=document.querySelector('#speech-card');
      if(card&&!card.hidden&&card.dataset.speaking==='true'){
        const text=document.querySelector('#speech-text').textContent;
        if(text&&!seen.has(text)){lines.push({speaker:document.querySelector('#speaker').textContent,text});seen.add(text);}
        card.click();skips++;
      }
      await new Promise(resolve=>setTimeout(resolve,140));
    }
    throw Error('Decision timeout '+JSON.stringify(window.__DEV_STORY__.status));
  })()`);
}
function choices() {
  const open = evaluate(`document.querySelector('#show-choices').getAttribute('aria-expanded')==='true'`);
  if (!open) click('#show-choices');
  return evaluate(`Array.from(document.querySelectorAll('#choices button')).map(button=>({id:button.dataset.choice,label:button.textContent,visible:button.getClientRects().length>0}))`);
}
function submit(text) {
  if (!evaluate(`document.querySelector('#show-text').getAttribute('aria-expanded')==='true'`)) click('#show-text');
  command('fill', '#answer-input', text);
  click('#text-form button');
}

for (const story of stories) {
  const definition = STORIES.find(item => item.id === story);
  if (!definition || definition.scenes.length < 6) throw Error(`Missing six-scene story definition: ${story}`);
  const setupCount = story === 'moon' ? 0 : 3;
  if ((definition.onboarding === 'direct') !== (setupCount === 0)) throw Error(`Unexpected onboarding contract: ${story}`);
  const lastScene = definition.scenes.length - 1;
  command('open', base);
  command('snapshot', '-i');
  click(`a[href="?story=${story}"]`);
  command('snapshot', '-i');
  click('#restart');
  click('#start-story');
  let next = decision();
  if (setupCount === 0) {
    if (next.state.phase !== 'question' || next.state.sceneIndex !== 0) throw Error(`Direct story asked unnecessary partner questions: ${story}`);
    record('direct-start', { story, setupQuestions: 0, state: next.state, narration: next.lines, skips: next.skips });
  }
  for (let step = 0; step < setupCount; step++) {
    if (next.state.phase !== 'setup' || next.state.setupStep !== step) throw Error(`Missing partner question ${story}/${step}`);
    const options = choices();
    if (!options.length || options.some(item => !item.visible)) throw Error('Choice reveal failed');
    const selection = options[step === 1 ? 2 : 0];
    record('partner-question', { story, step, question: evaluate(`document.querySelector('#speech-text').textContent`), options, selection, narration: next.lines, skips: next.skips });
    if (step === 2) submit(selection.label);
    else click(`[data-choice="${selection.id}"]`);
    next = decision();
  }
  for (let scene = 0; scene < definition.scenes.length; scene++) {
    if (next.state.phase !== 'question' || next.state.sceneIndex !== scene) throw Error(`Missing scene ${story}/${scene}: ${JSON.stringify(next.state)}`);
    const question = evaluate(`document.querySelector('#speech-text').textContent`);
    const sceneTitle = evaluate(`document.querySelector('#scene-title').textContent`);
    record('scene-question', { story, scene, title: sceneTitle, question, state: next.state, narration: next.lines, skips: next.skips });
    if (scene === 0) capture(`${story}-first-question`);
    if (scene === 2) {
      const before = status();
      command('reload');
      command('snapshot', '-i');
      const restored = status();
      const resumeLabel = evaluate(`document.querySelector('#start-story').textContent`);
      if (restored.sceneIndex !== scene || restored.phase !== 'ready' || resumeLabel !== '继续故事') throw Error(`Refresh restoration failed ${story}`);
      click('#start-story'); next = decision();
      if (next.state.sceneIndex !== scene || next.state.phase !== 'question') throw Error('Continue resumed wrong scene');
      record('refresh-continue', { story, before, restored, resumeLabel, resumed: next.state });
    }
    if (story === 'moon' && scene === 0) {
      submit('我想造一艘带导航灯和防水气泡的火箭。');
      next = decision();
      if (!next.state.inventions.includes('rocket') || !next.state.stage.invention) throw Error('Custom idea did not create visible invention model');
      record('custom-invention', { story, state: next.state });
      capture('moon-original-rocket');
      continue;
    }
    const options = choices();
    const selection = options[scene % 2 && options.length > 1 ? 1 : 0];
    if (!selection?.visible) throw Error('Missing visible scene answer');
    record('scene-answer', { story, scene, selection, method: scene === 1 ? 'typed visible answer' : 'visible choice click' });
    if (scene === 1) submit(selection.label);
    else click(`[data-choice="${selection.id}"]`);
    next = decision();
  }
  if (next.state.phase !== 'complete' || !next.state.completed || next.state.sceneIndex !== lastScene) throw Error(`Missing ending ${story}`);
  capture(`${story}-ending`);
  click('#bag-button');
  const bag = evaluate(`({open:document.querySelector('#bag-dialog').open,items:Array.from(document.querySelectorAll('#bag-content .bag-item')).map(item=>item.textContent),count:document.querySelector('#bag-count').textContent})`);
  if (!bag.open || !bag.items.length || Number(bag.count) !== bag.items.length) throw Error('Inventory dialog failed');
  capture(`${story}-bag`);
  click('#close-bag');
  click('#save-memory');
  const saved = evaluate(`({button:document.querySelector('#save-memory').textContent,disabled:document.querySelector('#save-memory').disabled,memories:JSON.parse(localStorage.getItem('jma.dev.clay.v1.memories')||'[]').map(item=>({story:item.story,inventory:item.inventory.length,inventions:item.inventions.length}))})`);
  if (!saved.disabled || !saved.memories.some(item => item.story === story)) throw Error('Memory not saved');
  record('complete-and-save', { story, state: next.state, bag, saved });
  command('reload');
  command('snapshot', '-i');
  const persisted = status();
  if (!persisted.completed || persisted.sceneIndex !== lastScene) throw Error('Ending completion lost on reload');
  record('completed-refresh', { story, state: persisted });
}
await writeFile(new URL(`./verify-story-${stories.join('-')}-results.json`, import.meta.url), `${JSON.stringify({ base, session, checkedAt: new Date().toISOString(), method: 'real DOM clicks, input fills, speech bubble skip; diagnostics and storage read only', log }, null, 2)}\n`);
console.log('All selected story flows passed.');
