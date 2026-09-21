const $ = id => document.getElementById(id);
const pageSize = 50;
let page = 1;
let total = 0;

async function request(url, options = {}) {
  const { redirectUnauthorized = true, ...fetchOptions } = options;
  const response = await fetch(url, { credentials: 'same-origin', ...fetchOptions });
  if (response.status === 401 && redirectUnauthorized) {
    showLogin();
    throw new Error('unauthorized');
  }
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'request_failed');
  return response.json();
}

function showLogin() {
  $('login-view').hidden = false;
  $('users-view').hidden = true;
  $('password').value = '';
}

function showUsers() {
  $('login-view').hidden = true;
  $('users-view').hidden = false;
}

function formatTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(value));
}

function shortId(value) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function text(tag, value, className = '') {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  return element;
}

function cell(value, className = '') {
  const element = text('td', value, className);
  return element;
}

function renderRows(items) {
  $('user-rows').replaceChildren(...items.map(user => {
    const row = document.createElement('tr');
    const identity = document.createElement('td');
    const idButton = text('button', shortId(user.id), 'id-button');
    idButton.type = 'button';
    idButton.title = user.id;
    idButton.addEventListener('click', () => openDetail(user.id));
    identity.append(idButton, text('small', user.online ? '最近活跃' : '当前不活跃', user.online ? 'online' : 'offline'));
    const state = cell(user.status === 'active' ? '正常' : '已停用', `state ${user.status}`);
    const action = document.createElement('td');
    const view = text('button', '查看', 'quiet compact');
    view.type = 'button';
    view.addEventListener('click', () => openDetail(user.id));
    action.append(view);
    row.append(identity, state, cell(formatTime(user.createdAt)), cell(formatTime(user.lastSeenAt)), cell(`${user.activeSessionCount} 个有效`), action);
    return row;
  }));
  $('empty').hidden = items.length > 0;
}

function queryString() {
  const params = new URLSearchParams({ page, pageSize, sort: $('sort').value });
  if ($('status').value) params.set('status', $('status').value);
  if ($('activity').value) params.set('activity', $('activity').value);
  if ($('user-id').value.trim()) params.set('id', $('user-id').value.trim());
  return params;
}

async function loadUsers() {
  $('list-error').hidden = true;
  try {
    const data = await request(`/api/admin/users?${queryString()}`);
    total = data.total;
    renderRows(data.items);
    $('total').textContent = `${total} 位用户`;
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    $('page-label').textContent = `第 ${data.page} / ${lastPage} 页`;
    $('previous').disabled = page <= 1;
    $('next').disabled = page >= lastPage;
  } catch (error) {
    if (error.message !== 'unauthorized') $('list-error').hidden = false;
  }
}

async function openDetail(id) {
  try {
    const { user } = await request(`/api/admin/users/${encodeURIComponent(id)}`);
    $('detail-id').textContent = shortId(user.id);
    $('detail-id').title = user.id;
    const values = [
      ['完整 ID', user.id], ['状态', user.status === 'active' ? '正常' : '已停用'],
      ['注册时间', formatTime(user.createdAt)], ['最近活跃', formatTime(user.lastSeenAt)],
      ['有效会话', String(user.activeSessionCount)],
    ];
    $('detail-summary').replaceChildren(...values.flatMap(([label, value]) => [text('dt', label), text('dd', value)]));
    $('session-list').replaceChildren(...user.sessions.map(session => {
      const card = document.createElement('article');
      card.append(
        text('strong', shortId(session.id)),
        text('span', session.active ? '有效' : session.revokedAt ? '已撤销' : '已过期', session.active ? 'online' : 'offline'),
        text('p', `创建：${formatTime(session.createdAt)}`),
        text('p', `最近活跃：${formatTime(session.lastSeenAt)}`),
        text('p', `到期：${formatTime(session.expiresAt)}`),
      );
      return card;
    }));
    $('detail-dialog').showModal();
  } catch (error) {
    if (error.message !== 'unauthorized') $('list-error').hidden = false;
  }
}

$('login-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('login-error').textContent = '';
  try {
    await request('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: $('username').value, password: $('password').value }),
      redirectUnauthorized: false,
    });
    showUsers();
    await loadUsers();
  } catch (error) {
    if (error.message === 'unauthorized') return;
    $('login-error').textContent = error.message === 'too_many_attempts' ? '尝试次数过多，请稍后再试。' : '账号或密码不正确。';
  }
});

$('filters').addEventListener('submit', event => { event.preventDefault(); page = 1; loadUsers(); });
$('clear-filters').addEventListener('click', () => { $('filters').reset(); $('user-id').value = ''; page = 1; loadUsers(); });
$('previous').addEventListener('click', () => { if (page > 1) { page -= 1; loadUsers(); } });
$('next').addEventListener('click', () => { if (page * pageSize < total) { page += 1; loadUsers(); } });
$('retry').addEventListener('click', loadUsers);
$('close-detail').addEventListener('click', () => $('detail-dialog').close());
$('logout').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
  showLogin();
});

request('/api/admin/session').then(data => {
  if (!data.ok) return showLogin();
  showUsers();
  return loadUsers();
}).catch(showLogin);
