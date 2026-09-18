const world = document.getElementById('landing-world');
const dialog = document.getElementById('landing-dialog');
const content = document.getElementById('landing-dialog-content');
const gate = document.getElementById('mode-gate');
let scene, sceneLoading, concept = 0, returnFocus;
const concepts = [
  {quote:'“我想坐自己造的火箭去月球！”', label:'想法造物台', detail:'轻点，把一句想象变成眼前的小东西', primary:'一艘大火箭', secondary:'好多棒棒糖', image:'hero'},
  {quote:'“喂——你愿意做我的新朋友吗？”', label:'漂浮朋友星系', detail:'朋友轻轻漂浮，目光跟着你 · 点一下和它们打招呼', primary:'换个朋友招手', secondary:'大家蹦一蹦', image:'concept-friends'},
  {quote:'“我的每一个主意，都让星球长大一点。”', label:'会长大的小星球', detail:'点“种下一个想法”，看小世界一点点生长', primary:'种下一个想法', secondary:'变回小小星球', image:'concept-grow'},
  {quote:'“如果口袋里，装得下三个小宇宙呢？”', label:'口袋里的宇宙', detail:'移动指针看看不同角度，轻点让星球翻个身', primary:'转一转星球', secondary:'回到小小宇宙', image:'concept-cosmos'},
  {quote:'“你说一个主意，我来接着想！”', label:'想象力接力', detail:'伙伴每隔一会儿交换灵感 · 也可以点一下接着想', primary:'接着想一个', secondary:'再来个惊喜', image:'concept-relay'},
];
const buttons = [...document.querySelectorAll('[data-concept]')];
async function ensureScene(){
  if(scene)return scene;
  if(sceneLoading)return sceneLoading;
  sceneLoading=import('./landing-scene.js?v=20260918-five-concepts').then(({createLandingScene})=>{
    scene=createLandingScene(world);scene.setConcept(concept);world.dataset.ready='true';scene.renderer.domElement.addEventListener('webglcontextlost',()=>{world.removeAttribute('data-ready');});return scene;
  }).catch(()=>{world.removeAttribute('data-ready');document.getElementById('concept-description').textContent='当前显示静态预览，仍可切换五个方案。';return null;});
  return sceneLoading;
}
function setConcept(index, focus=false){
  concept=(index+concepts.length)%concepts.length;const item=concepts[concept];
  buttons.forEach((button,i)=>{button.setAttribute('aria-selected',String(i===concept));button.tabIndex=i===concept?0:-1;});
  document.getElementById('hero-concept-panel').setAttribute('aria-labelledby',`concept-${concept}`);
  document.getElementById('hero-speech').textContent=item.quote;
  document.getElementById('concept-description').textContent=`${item.label} · ${item.detail}`;
  world.querySelector('img').src=`./assets/landing/${item.image}.webp`;
  world.querySelector('img').alt=`${item.label}的 3D 场景预览`;
  document.querySelector('[data-imagine=primary]').textContent=item.primary;
  document.querySelector('[data-imagine=secondary]').textContent=item.secondary;
  document.querySelectorAll('[data-imagine]').forEach(b=>b.setAttribute('aria-pressed','false'));
  scene?.setConcept(concept);if(focus)buttons[concept].focus();
}
buttons.forEach((button,i)=>{
  button.addEventListener('click',()=>setConcept(i));
  button.addEventListener('keydown',event=>{const delta=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;if(delta||['Home','End'].includes(event.key)){event.preventDefault();setConcept(event.key==='Home'?0:event.key==='End'?4:concept+delta,true);}});
});
document.querySelectorAll('[data-imagine]').forEach(button=>button.addEventListener('click',async()=>{
  const current=await ensureScene();current?.choose(button.dataset.imagine);
  document.querySelectorAll('[data-imagine]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  if(concept===0){document.getElementById('hero-speech').textContent=button.dataset.imagine==='secondary'?'“我要种好多棒棒糖，分给每个朋友！”':concepts[0].quote;if(!current)world.querySelector('img').src=`./assets/landing/${button.dataset.imagine==='secondary'?'candy':'hero'}.webp`;}
}));
// Only the visible home hero loads WebGL; the original simulator remains independent.
const heroObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){ensureScene();heroObserver.disconnect();}},{root:gate});heroObserver.observe(world);

const journeys={
  candy:{title:'小芽的甜甜星球',image:'candy',quote:'我要种一片棒棒糖森林，每个朋友都能分到一根。',steps:[['一个小小的愿望','小芽想要一根比自己还大的棒棒糖。'],['伙伴的好奇','“如果其他朋友也想尝一尝呢？”'],['又长出的主意','把一根棒棒糖变成一片森林，让每个朋友选一种味道。']],creation:'创造物 · 一片可以分享的棒棒糖森林'},
  moon:{title:'球球的月球快递',image:'chapter-moon',quote:'火箭可以送快递吗？月亮上的朋友还没吃过蛋糕。',steps:[['先定一个目的地','球球选择去月球，想见见那里的朋友。'],['发明自己的办法','造一艘能装下蛋糕的火箭，还要有一扇小窗。'],['多想一步','为了让蛋糕不颠坏，给火箭加上软软的座位。']],creation:'创造物 · 一艘送蛋糕的月光火箭'},
  question:{title:'米粒的第 N 个为什么',image:'chapter-debate',quote:'如果每个人都当船长，谁来发现新的小岛呢？',steps:[['带着兴趣出发','米粒喜欢大海，想和伙伴一起开船。'],['遇到不同的声音','星球主人觉得，船上只能听一个人的。'],['留下自己的想法','“可以轮流当船长，也要听见发现小岛的人。”']],creation:'留下的想法 · 轮流做决定，也一起听建议'},
};
function show(html){returnFocus=document.activeElement;content.innerHTML=html;if(!dialog.open)dialog.showModal();dialog.scrollTop=0;gate.style.overflow='hidden';}
function close(){dialog.close();}
dialog.querySelector('.dialog-close').addEventListener('click',close);
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
dialog.addEventListener('close',()=>{gate.style.overflow='';returnFocus?.focus({preventScroll:true});if(location.search.includes('journey=')||location.search.includes('preview=')){const u=new URL(location.href);u.searchParams.delete('journey');u.searchParams.delete('preview');history.replaceState(null,'',u);}});
function openJourney(id){const j=journeys[id];if(!j)return;show(`<span class="preview-label">冒险纪念册 · 模拟示例</span><h2 id="preview-title">${j.title}</h2><img class="dialog-art" src="./assets/landing/${j.image}.webp" alt="${j.creation}"><blockquote class="sample-quote">“${j.quote}”</blockquote><ol>${j.steps.map(([h,p])=>`<li><b>${h}</b>${p}</li>`).join('')}</ol><p><strong>${j.creation}</strong></p><p class="dialog-footnote">这是使用虚构昵称和模拟内容制作的功能预览，不是真实儿童记录。语音留存、个人旅程生成与授权分享正在规划中，当前没有录音或公开分享功能。</p><a class="landing-primary" href="./dev/?story=wow">开始第一章 ↗</a>`);}
document.querySelectorAll('[data-journey]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openJourney(a.dataset.journey);}));
const topics=[
  {name:'棒棒糖星球',a:'如果喜欢棒棒糖，就应该只种棒棒糖！',b:'可是朋友可能喜欢苹果呀。可以给不同的愿望留一点地方吗？',q:'你会怎样安排这个星球？'},
  {name:'谁来当船长',a:'我最熟悉这艘船，所以每次都应该听我的。',b:'你有经验，可是大家也会发现新的线索。要不要轮流听听？',q:'怎样做，能让船开得好，也让大家有机会表达？'},
  {name:'月球上的家',a:'所有房子都要长得一样，这样最好找！',b:'如果每个人给自己的家想一个特别的标记，也许同样找得到。',q:'你想住在怎样的房子里？为什么？'},
];
function debateTopic(i){const t=topics[i];content.querySelectorAll('[data-topic]').forEach((b,n)=>b.setAttribute('aria-pressed',String(n===i)));document.getElementById('debate-lines').innerHTML=`<p><strong>爱唱反调的星球主人</strong><br>“${t.a}”</p><p><strong>同行的小伙伴</strong><br>“${t.b}”</p><blockquote class="sample-quote">轮到你的想法了：<br>${t.q}</blockquote>`;}
function openDebate(){show(`<span class="preview-label">第二章 · 3D 新版方向预览</span><h2 id="preview-title">观点小剧场</h2><img class="dialog-art" src="./assets/landing/chapter-debate.webp" alt="3D 观点小剧场概念场景"><p>带着兴趣，来到爱唱反调的星球。先听一听，再说说自己的理由。选个话题，看看这次冒险会怎样开始。</p><div class="preview-topics" aria-label="选择示例话题">${topics.map((t,i)=>`<button data-topic="${i}" aria-pressed="${i===0}">${t.name}</button>`).join('')}</div><div id="debate-lines" aria-live="polite"></div><p class="dialog-footnote">以上是预设对话示例，3D 新版章节正在制作。当前预览不录音、不进行 AI 辩论；想完整体验现有讨论流程，可以进入原版小剧场。</p><div class="dialog-actions"><a class="landing-primary" href="./debate">体验原版小剧场 ↗</a><a href="./dev/?story=moon">直接进入第三章 ↗</a></div>`);content.querySelectorAll('[data-topic]').forEach(b=>b.addEventListener('click',()=>debateTopic(Number(b.dataset.topic))));debateTopic(0);}
document.querySelectorAll('[data-debate-preview]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openDebate();}));
const query=new URLSearchParams(location.search);if(query.has('journey'))openJourney(query.get('journey'));else if(query.get('preview')==='debate')openDebate();
window.addEventListener('pagehide',event=>{if(!event.persisted)scene?.dispose();});
