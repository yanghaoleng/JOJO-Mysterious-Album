const ENDPOINT = '/api/auth/anonymous';
const LOCK_NAME = 'jma-anonymous-bootstrap';
const LEASE_KEY = 'jma.identity.bootstrap-lease.v1';
const LEASE_MS = 8000;

async function register() {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!response.ok) throw new Error('identity_unavailable');
    const data = await response.json();
    const user = typeof data?.user?.id === 'string' ? data.user : null;
    window.dispatchEvent(new CustomEvent('jma:identity-ready', { detail: { user } }));
    return user;
  } catch {
    // Identity must never interrupt the child's experience. A later page load retries.
    window.dispatchEvent(new CustomEvent('jma:identity-unavailable'));
    return null;
  }
}

function leaseOwner() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

async function withStorageLease(task) {
  const owner = leaseOwner();
  try {
    const now = Date.now();
    const current = JSON.parse(localStorage.getItem(LEASE_KEY) || 'null');
    if (current?.expiresAt > now) return;
    localStorage.setItem(LEASE_KEY, JSON.stringify({ owner, expiresAt: now + LEASE_MS }));
    const confirmed = JSON.parse(localStorage.getItem(LEASE_KEY) || 'null');
    if (confirmed?.owner !== owner) return;
    const result = await task();
    const latest = JSON.parse(localStorage.getItem(LEASE_KEY) || 'null');
    if (latest?.owner === owner) localStorage.removeItem(LEASE_KEY);
    return result;
  } catch {
    return task();
  }
}

export async function bootstrapAnonymousIdentity() {
  if (navigator.locks?.request) {
    return navigator.locks.request(LOCK_NAME, register);
  }
  return withStorageLease(register);
}

export const identityReady = bootstrapAnonymousIdentity();
