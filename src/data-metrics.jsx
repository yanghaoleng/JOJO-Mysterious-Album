import React from 'react';
import { createRoot } from 'react-dom/client';
import { Calligraph } from 'calligraph';

const roots = new Map();
const values = new Map();

function Metric({ id }) {
  const value = values.get(id) || '0';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return <span>{value}</span>;
  return <Calligraph variant="slots" animation="snappy" initial stagger={0.035}>{value}</Calligraph>;
}

export function setSlotMetric(id, value) {
  const node = document.getElementById(id);
  if (!node) return;
  values.set(id, String(value));
  if (!roots.has(id)) roots.set(id, createRoot(node));
  roots.get(id).render(<Metric id={id} />);
  node.dataset.slotMetric = 'true';
}
