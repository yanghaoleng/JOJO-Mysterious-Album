const world = document.getElementById('landing-world');
const dialog = document.getElementById('landing-dialog');
const content = document.getElementById('landing-dialog-content');
const gate = document.getElementById('mode-gate');
let scene, returnFocus;
const heroObserver=new IntersectionObserver(entries=>{
  if(!entries.some(e=>e.isIntersecting))return;
  heroObserver.disconnect();
  import('./landing-scene.js?v=20260918-living').then(({createLandingScene})=>{
    scene=createLandingScene(world);world.dataset.ready='true';
    scene.renderer.domElement.addEventListener('webglcontextlost',()=>world.removeAttribute('data-ready'));
  }).catch(()=>world.removeAttribute('data-ready'));
},{root:gate});heroObserver.observe(world);
// Touch devices reveal the summary on the first tap; the second tap follows the link.
const cards=[...document.querySelectorAll('.chapter-card')];
cards.forEach(card=>card.addEventListener('click',event=>{
  if(!matchMedia('(hover: none)').matches||card.classList.contains('is-expanded'))return;
  event.preventDefault();cards.forEach(c=>c.classList.remove('is-expanded'));card.classList.add('is-expanded');
}));
const journeys={
  candy:{title:'小芽的甜甜星球',image:'journey-candy',quote:'我要种一片棒棒糖森林，每个朋友都能分到一根。',steps:[['一个小小的愿望','小芽想要一根比自己还大的棒棒糖。'],['伙伴的好奇','“如果其他朋友也想尝一尝呢？”'],['又长出的主意','把一根棒棒糖变成一片森林，让每个朋友选一种味道。']],creation:'创造物 · 一片可以分享的棒棒糖森林'},
  moon:{title:'球球的月球快递',image:'journey-moon',quote:'火箭可以送快递吗？月亮上的朋友还没吃过蛋糕。',steps:[['先定一个目的地','球球选择去月球，想见见那里的朋友。'],['发明自己的办法','造一艘能装下蛋糕的火箭，还要有一扇小窗。'],['多想一步','为了让蛋糕不颠坏，给火箭加上软软的座位。']],creation:'创造物 · 一艘送蛋糕的月光火箭'},
  question:{title:'米粒的第 N 个为什么',image:'journey-question',quote:'如果每个人都当船长，谁来发现新的小岛呢？',steps:[['带着兴趣出发','米粒喜欢大海，想和伙伴一起开船。'],['遇到不同的声音','星球主人觉得，船上只能听一个人的。'],['留下自己的想法','“可以轮流当船长，也要听见发现小岛的人。”']],creation:'留下的想法 · 轮流做决定，也一起听建议'},
};
function show(html){returnFocus=document.activeElement;content.innerHTML=html;if(!dialog.open)dialog.showModal();dialog.scrollTop=0;gate.style.overflow='hidden';}
function close(){dialog.close();}
dialog.querySelector('.dialog-close').addEventListener('click',close);
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
dialog.addEventListener('close',()=>{gate.style.overflow='';returnFocus?.focus({preventScroll:true});if(location.search.includes('journey=')||location.search.includes('preview=')){const u=new URL(location.href);u.searchParams.delete('journey');u.searchParams.delete('preview');history.replaceState(null,'',u);}});
function openJourney(id){const j=journeys[id];if(!j)return;show(`<span class="preview-label">冒险纪念册 · 模拟示例</span><h2 id="preview-title">${j.title}</h2><img class="dialog-art" src="./assets/landing/${j.image}.webp" alt="${j.creation}"><blockquote class="sample-quote">“${j.quote}”</blockquote><ol>${j.steps.map(([h,p])=>`<li><b>${h}</b>${p}</li>`).join('')}</ol><p><strong>${j.creation}</strong></p><p class="dialog-footnote">这是使用虚构昵称和模拟内容制作的功能预览，不是真实儿童记录。语音留存、个人旅程生成与授权分享正在规划中，当前没有录音或公开分享功能。</p><a class="landing-primary" href="./dev/?story=wow">开始第一章 ↗</a>`);}
document.querySelectorAll('[data-journey]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openJourney(a.dataset.journey);}));
const query=new URLSearchParams(location.search);
if(query.has('journey'))openJourney(query.get('journey'));
else if(query.get('preview')==='debate')location.replace('./dev/debate');
window.addEventListener('pagehide',event=>{if(!event.persisted)scene?.dispose();});
