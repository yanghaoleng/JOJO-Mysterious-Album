const ICONS = Object.freeze({
  home: '⌂',
  restart: '↻',
});

function createControl({ kind, label, href, onActivate }) {
  const control = href ? document.createElement('a') : document.createElement('button');
  control.className = `app-navigation__control app-navigation__control--${kind}`;
  control.setAttribute('aria-label', label);
  control.title = label;

  if (href) control.href = href;
  else {
    control.type = 'button';
    control.addEventListener('click', onActivate);
  }

  const icon = document.createElement('span');
  icon.className = 'app-navigation__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = ICONS[kind];
  control.append(icon);
  return control;
}

/**
 * Mount the app-wide corner navigation. Home is always an icon in the upper
 * left; restart, when a route supports it, is an icon in the upper right.
 */
export function mountAppNavigation(target, { homeHref, onHome, onRestart } = {}) {
  if (!target) return null;

  target.replaceChildren();
  target.className = 'app-navigation';
  target.setAttribute('aria-label', '页面导航');

  const home = createControl({
    kind: 'home',
    label: '返回主页',
    href: homeHref,
    onActivate: onHome,
  });
  target.append(home);

  if (onRestart) {
    target.append(createControl({
      kind: 'restart',
      label: '重新开始',
      onActivate: onRestart,
    }));
  }

  return { home, restart: target.querySelector('.app-navigation__control--restart') };
}
