import { mountProductIcons } from '../vendor/ui-icons.js?v=20260828-style-editor';

const ICONS = Object.freeze({
  home: 'house',
  style: 'paintbrush',
  restart: 'rotate-ccw',
});

function createControl({ kind, label, text, href, onActivate }) {
  const control = href ? document.createElement('a') : document.createElement('button');
  control.className = `app-navigation__control app-navigation__control--${kind}`;
  control.setAttribute('aria-label', label);
  control.title = label;

  if (href) control.href = href;
  else {
    control.type = 'button';
    control.addEventListener('click', onActivate);
  }

  const icon = document.createElement('i');
  icon.className = 'app-navigation__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.dataset.lucide = ICONS[kind];
  control.append(icon);
  if (text) {
    const caption = document.createElement('span');
    caption.className = 'app-navigation__label';
    caption.textContent = text;
    control.append(caption);
  }
  mountProductIcons(control);
  return control;
}

/**
 * Mount the app-wide corner navigation. Home is always an icon in the upper
 * left; restart, when a route supports it, is an icon in the upper right.
 */
export function mountAppNavigation(target, { homeHref, homeLabel = '返回主页', onHome, styleHref, onRestart } = {}) {
  if (!target) return null;

  target.replaceChildren();
  target.className = 'app-navigation';
  target.setAttribute('aria-label', '页面导航');

  const home = createControl({
    kind: 'home',
    label: homeLabel,
    href: homeHref,
    onActivate: onHome,
  });
  target.append(home);

  const actions = document.createElement('span');
  actions.className = 'app-navigation__actions';
  target.append(actions);

  if (styleHref) {
    actions.append(createControl({
      kind: 'style',
      label: '打开画面风格编辑器',
      text: '画面风格',
      href: styleHref,
    }));
  }

  if (onRestart) {
    actions.append(createControl({
      kind: 'restart',
      label: '重新开始',
      onActivate: onRestart,
    }));
  }

  return {
    home,
    style: target.querySelector('.app-navigation__control--style'),
    restart: target.querySelector('.app-navigation__control--restart'),
  };
}
