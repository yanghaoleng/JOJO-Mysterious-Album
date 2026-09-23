import React from 'react';
import { createRoot } from 'react-dom/client';
import { Calligraph } from 'calligraph';

// A single root owns both text transitions and real audio-timestamp highlighting.
export function mountWordText(node, value, variant = 'text') {
  const root = createRoot(node);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = value, reading = null, disposed = false;
  function render() {
    if(disposed)return;
    if(reading){
      const {text,start,end}=reading;
      root.render(<span className="read-along-text">{[...text.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?|[^A-Za-z]+/g)].map(({0:word,index})=>/[A-Za-z]/.test(word)
        ? <span key={index} className={`read-along-word${start>=0&&index<end&&index+word.length>start?' is-reading':''}`}>{word}</span>
        : word)}</span>);
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
