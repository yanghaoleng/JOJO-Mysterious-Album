import { trackAnalytics } from './analytics.js';

document.documentElement.classList.add('js');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealItems = [...document.querySelectorAll('.reveal')];

if (reducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach(item => item.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, {
    rootMargin: '0px 0px -8% 0px',
    threshold: 0.08,
  });

  revealItems.forEach(item => observer.observe(item));
}

for (const link of document.querySelectorAll('[data-intro-event]')) {
  link.addEventListener('click', () => {
    trackAnalytics(`intro_${link.dataset.introEvent}`, { depth: 1 });
  });
}
