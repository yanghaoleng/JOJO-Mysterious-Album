import React from 'react';
import { createRoot } from 'react-dom/client';
import { Calligraph } from 'calligraph';
import { replaceableWordRanges } from '../word-intent.js';

// Word wrappers preserve readable spacing and replacement hints during Text transitions.
export function mountWordText(node, value, variant = 'text', options = {}) {
  const root = createRoot(node);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = value, reading = null, disposed = false;
  const sentence=node.id==='lesson-sentence';
  function render() {
    if(disposed)return;
    if(sentence){
      const text=reading?.text??String(current),ranges=replaceableWordRanges(text);
      root.render(<span className="read-along-text">{[...text.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?|_{2,}|[^A-Za-z_]+/g)].map(({0:word,index},i)=>{
        if(!/[A-Za-z_]/.test(word))return <React.Fragment key={i}>{word}</React.Fragment>;
        const replaceable=word.includes('_')||ranges.some(r=>index<r.end&&index+word.length>r.start);
        const clickable=replaceable&&options.canReplace?.(i)&&!reading;
        const active=reading&&reading.start>=0&&index<reading.end&&index+word.length>reading.start;
        return <span key={i} role={clickable?'button':undefined} tabIndex={clickable?0:undefined} aria-label={clickable?`换一个 ${word}`:undefined} onClick={clickable?()=>options.onReplace(i):undefined} onKeyDown={clickable?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();options.onReplace(i);}}:undefined} data-replaceable={replaceable||undefined} className={`read-along-word${replaceable?' replaceable-word':''}${active?' is-reading':''}`}>
          {reduced.matches||reading ? word : <Calligraph variant="text" animation="smooth" initial={false}>{word}</Calligraph>}
        </span>;
      })}</span>);
    }else root.render(reduced.matches ? <span>{current}</span>
      : <Calligraph variant={variant} animation="smooth" initial={false}>{current}</Calligraph>);
  }
  const preference=()=>render();
  reduced.addEventListener('change',preference);render();
  return {
    update(next){current=next;reading=null;render();},
    read(text,packet){reading=['loading','playing'].includes(packet.status)?{text,start:packet.start,end:packet.end}:null;render();},
    dispose(){disposed=true;reduced.removeEventListener('change',preference);root.unmount();}
  };
}
