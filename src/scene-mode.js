// Scene depth is independent of the selected character/painting style.
export const SCENE_3D_STORAGE_KEY = 'mengmeng-scene-3d-v1';

export function createSceneModeStore(host = globalThis) {
  const listeners = new Set();
  const decode = value => value !== 'false';
  const read = fallback => {
    try { return decode(host.localStorage?.getItem(SCENE_3D_STORAGE_KEY)); }
    catch { return fallback; }
  };
  let enabled = read(true);
  let unsaved = false;
  const update = value => {
    if (enabled === value) return;
    enabled = value;
    for (const listener of listeners) listener(enabled);
  };
  const onStorage = event => {
    if (event.key !== SCENE_3D_STORAGE_KEY && event.key !== null) return;
    try {
      if (event.storageArea && event.storageArea !== host.localStorage) return;
    } catch { /* A restricted browser can still deliver a storage event. */ }
    unsaved = false;
    update(event.key === null ? true : decode(event.newValue));
  };
  const refresh = () => { if (!unsaved) update(read(enabled)); };
  host.addEventListener?.('storage', onStorage);
  host.addEventListener?.('pageshow', refresh);
  host.addEventListener?.('focus', refresh);
  return {
    get: () => enabled,
    set(value) {
      const next = Boolean(value);
      try {
        const storage = host.localStorage;
        if (!storage) throw new Error('Storage unavailable');
        storage.setItem(SCENE_3D_STORAGE_KEY, String(next));
        unsaved = false;
      } catch { unsaved = true; /* Keep this choice, even after focus/pageshow. */ }
      update(next);
      return enabled;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      listeners.clear();
      host.removeEventListener?.('storage', onStorage);
      host.removeEventListener?.('pageshow', refresh);
      host.removeEventListener?.('focus', refresh);
    },
  };
}

const sceneMode = createSceneModeStore();
export const getScene3DEnabled = sceneMode.get;
export const setScene3DEnabled = sceneMode.set;
export const subscribeScene3D = sceneMode.subscribe;
