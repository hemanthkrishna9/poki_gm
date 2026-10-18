// Daily Door helpers. Pure (callers pass the Date / key). Runtime-safe: imports only the codec.
import { decodeLevel } from './codec.js';

/** Daily #1 date key (UTC). */
export const DAILY_EPOCH = '2026-11-01';
/** DAILY_EPOCH as a UTC timestamp (ms). */
export const DAILY_EPOCH_MS = Date.UTC(2026, 10, 1);
const DAY = 86400000;

/** 'YYYY-MM-DD' of a Date in UTC. */
export function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

/** Daily number: days since 2026-11-01, plus 1 (can be <= 0 before launch day). */
export function dailyNumber(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - DAILY_EPOCH_MS) / DAY) + 1;
}

/**
 * Decoded baked level for a date key. Keys outside the baked range wrap around the
 * baked table (same key -> same level for every player); the id is set to `daily-<key>`.
 * @param {string} key 'YYYY-MM-DD'
 * @param {{daily:Object<string,object>}} LEVELS
 * @returns {object|null}
 */
export function dailyLevel(key, LEVELS) {
  const table = LEVELS && LEVELS.daily;
  if (!table) return null;
  if (table[key]) return decodeLevel(table[key]);
  const keys = Object.keys(table).sort();
  if (!keys.length) return null;
  const n = dailyNumber(key) - 1;
  const i = ((n % keys.length) + keys.length) % keys.length;
  const L = decodeLevel(table[keys[i]]);
  L.id = `daily-${key}`;
  return L;
}

/**
 * Decoded pre-launch "sneak peek" level (LEVELS.preview, id 'daily-preview'): Daily-shaped,
 * a C2-family rule, and not any real Daily Door.
 * @param {{preview?:object}} LEVELS
 * @returns {object|null}
 */
export function previewLevel(LEVELS) {
  return LEVELS && LEVELS.preview ? decodeLevel(LEVELS.preview) : null;
}
