// Native modal provides focus containment, Escape dismissal and inert background.
let active=null;
export function closeWordDialog(){active?.remove();active=null;}
export function openWordDialog({title,content,trigger,imageSelector,className=''}){
  closeWordDialog();
  const dialog=document.createElement('dialog');dialog.className=`word-dialog ${className}`;
  dialog.setAttribute('aria-label',title);
  dialog.innerHTML=`<button class="dialog-close" aria-label="关闭"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M18 6 6 18"/></svg></button>${content}`;
  const small=trigger?.querySelector('img')?.getBoundingClientRect();
  document.body.append(dialog);active=dialog;dialog.showModal();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const image=imageSelector?dialog.querySelector(imageSelector):null;
  const frames=[{opacity:0,transform:reduced?'none':'scale(.96)'},{opacity:1,transform:'none'}];
  const motion={duration:250,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'};
  let animation=dialog.animate(frames,motion),imageAnimation=null,closing=false;
  if(image&&small&&!reduced){
    const large=image.getBoundingClientRect();
    const origin=`translate(${small.x-large.x}px,${small.y-large.y}px) scale(${small.width/large.width})`;
    image.style.transformOrigin='top left';
    imageAnimation=image.animate([{transform:origin},{transform:'none'}],motion);
    image.dataset.origin=origin;
  }
  async function close(){
    if(closing)return;closing=true;
    animation.cancel();imageAnimation?.cancel();
    const exit=dialog.animate([...frames].reverse(),{...motion,duration:200});
    if(image?.dataset.origin)image.animate([{transform:'none'},{transform:image.dataset.origin}],{...motion,duration:200});
    await exit.finished.catch(()=>{});
    if(active!==dialog)return;
    dialog.close();dialog.remove();active=null;if(trigger?.isConnected)trigger.focus();
  }
  dialog.querySelector('.dialog-close').onclick=close;
  dialog.addEventListener('cancel',event=>{event.preventDefault();void close();});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)void close();});
  return dialog;
}
