import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Calligraph } from 'calligraph';

const EVENT_NAME = 'mengmeng:bubble-text';
const splitText = value => {
  if (typeof Intl?.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(value), item => item.segment);
  }
  return Array.from(value);
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return undefined;
    const update = event => setReduced(event.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

function BubbleLetters({ initialText }) {
  const [fullText, setFullText] = useState(initialText);
  const [visibleText, setVisibleText] = useState('');
  const reduced = useReducedMotion();
  const characters = useMemo(() => splitText(fullText), [fullText]);

  useEffect(() => {
    const receive = event => setFullText(String(event.detail?.text || '我在认真听。'));
    window.addEventListener(EVENT_NAME, receive);
    return () => window.removeEventListener(EVENT_NAME, receive);
  }, []);

  useEffect(() => {
    if (reduced) {
      setVisibleText(fullText);
      return undefined;
    }
    let index = 0;
    let timer = 0;
    setVisibleText('');
    const tick = () => {
      index += 1;
      setVisibleText(characters.slice(0, index).join(''));
      if (index < characters.length) timer = window.setTimeout(tick, 34);
    };
    timer = window.setTimeout(tick, 105);
    return () => window.clearTimeout(timer);
  }, [characters, fullText, reduced]);

  return (
    <Calligraph
      animation="smooth"
      autoSize={false}
      drift={{ x: 2, y: 7 }}
      trend={1}
      initial={false}
      aria-hidden="true"
      className="lab-calligraph"
      style={{ display: 'inline' }}
    >
      {visibleText}
    </Calligraph>
  );
}

const target = document.getElementById('lab-bubble-text');
const bubble = document.getElementById('lab-bubble');
if (target && bubble) {
  const initialText = String(bubble.dataset.text || target.textContent || '我在认真听。');
  target.textContent = '';
  createRoot(target).render(<BubbleLetters initialText={initialText} />);
  document.documentElement.dataset.calligraphReady = 'true';
}
