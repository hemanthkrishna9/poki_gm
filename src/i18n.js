// i18n: t(key, params) with {param} substitution.
// Merges src/data/strings.en.js (UI) with src/engine/ruleStrings.en.js (rule.*
// templates, owned by WP-A).
//
// Plurals: if params.n is a number and `${key}.one` / `${key}.other` exist,
// the matching form is used.

import STRINGS_EN from './data/strings.en.js';
import RULE_STRINGS_EN from './engine/ruleStrings.en.js';

const TABLES = { en: { ...RULE_STRINGS_EN, ...STRINGS_EN } };
let locale = 'en';

export function setLocale(code) {
  locale = TABLES[code] ? code : 'en';
  return locale;
}

export function getLocale() {
  return locale;
}

/** Add or override strings at runtime (e.g. tests, future locales). */
export function addStrings(table, code = 'en') {
  TABLES[code] = { ...(TABLES[code] || {}), ...table };
}

export function has(key) {
  return lookup(key) !== undefined;
}

function lookup(key) {
  const tab = TABLES[locale] || TABLES.en;
  return tab[key] ?? TABLES.en[key];
}

/**
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
export function t(key, params) {
  let s;
  if (params && typeof params.n === 'number') {
    s = lookup(`${key}.${params.n === 1 ? 'one' : 'other'}`);
  }
  if (s === undefined) s = lookup(key);
  if (s === undefined) return key;
  if (!params) return s;
  return String(s).replace(/\{(\w+)\}/g, (m, p) => (p in params && params[p] != null ? String(params[p]) : m));
}

export default t;
