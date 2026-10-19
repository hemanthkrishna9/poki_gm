// Storage wrapper: the only module that touches localStorage.
// Every access is in try/catch; on failure we keep going in memory.
// Unknown future save versions are kept read-only (never overwritten).

import { defaultProgress, normalizeProgress, PROGRESS_VERSION } from './progression.js';

export const SAVE_KEY = 'doorpolicy.save.v1';
export const SETTINGS_KEY = 'doorpolicy.settings.v1';
export const SETTINGS_VERSION = 1;

/**
 * @typedef {Object} Settings
 * @property {1} v
 * @property {boolean} sound
 * @property {number} volume        0..1
 * @property {boolean} music
 * @property {null|boolean} reducedMotion  null = follow the OS setting
 * @property {boolean} colorBlind
 * @property {string} locale
 */
export function defaultSettings() {
  return { v: SETTINGS_VERSION, sound: true, volume: 0.8, music: false, reducedMotion: null, colorBlind: false, locale: 'en' };
}

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // accessing localStorage itself can throw (blocked iframes)
  }
}

/** Migrate raw parsed data. Returns {data, readOnly}. */
export function migrate(raw, kind = 'save') {
  const def = kind === 'save' ? defaultProgress() : defaultSettings();
  const cur = kind === 'save' ? PROGRESS_VERSION : SETTINGS_VERSION;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { data: def, readOnly: false };
  const v = Number(raw.v);
  if (v > cur) return { data: raw, readOnly: true };
  if (v === cur || !raw.v) {
    const data = kind === 'save' ? normalizeProgress(raw) : { ...def, ...raw, v: cur };
    return { data, readOnly: false };
  }
  return { data: def, readOnly: false };
}

/**
 * @param {Storage|null} [storage] defaults to globalThis.localStorage (guarded)
 */
export function createSave(storage = defaultStorage()) {
  const mem = {};
  let persistent = !!storage;
  const ro = { save: false, settings: false };

  function readKey(key) {
    if (key in mem) return mem[key];
    if (!storage) return null;
    try {
      return storage.getItem(key);
    } catch {
      persistent = false;
      return null;
    }
  }

  function writeKey(key, str) {
    mem[key] = str;
    if (!storage) return false;
    try {
      storage.setItem(key, str);
      return true;
    } catch {
      persistent = false;
      return false;
    }
  }

  function parse(str) {
    if (str == null) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  function loadKind(key, kind) {
    const { data, readOnly } = migrate(parse(readKey(key)), kind);
    ro[kind] = readOnly;
    return data;
  }

  function saveKind(key, kind, data) {
    if (ro[kind]) return false;
    let str;
    try {
      str = JSON.stringify(data);
    } catch {
      return false;
    }
    return writeKey(key, str);
  }

  return {
    /** @returns {import('./progression.js').Progress} */
    load: () => loadKind(SAVE_KEY, 'save'),
    /** @returns {boolean} true if written to real storage */
    save: (data) => saveKind(SAVE_KEY, 'save', data),
    /** @returns {Settings} */
    loadSettings: () => loadKind(SETTINGS_KEY, 'settings'),
    saveSettings: (s) => saveKind(SETTINGS_KEY, 'settings', s),
    /** Reset progress (settings survive). Refused while read-only. */
    reset() {
      if (ro.save) return false;
      delete mem[SAVE_KEY];
      if (storage) {
        try {
          storage.removeItem(SAVE_KEY);
        } catch {
          persistent = false;
        }
      }
      return true;
    },
    /** True while the save is from a newer version (kept in memory, never written). */
    isReadOnly: () => ro.save,
    /** False once storage is missing or has thrown. */
    isPersistent: () => persistent,
  };
}
