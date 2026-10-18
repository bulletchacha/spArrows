import { getLocales } from 'expo-localization';

import en from './en';

/**
 * String tables (PRD §13: localization from day one). Add a language by creating
 * `<code>.ts` with the same keys as `en.ts` and registering it here.
 */
const TABLES: Record<string, Partial<typeof en>> = { en };

export type StringKey = keyof typeof en;

const lang = getLocales()[0]?.languageCode ?? 'en';
const table = TABLES[lang] ?? en;

export function t(key: StringKey, params: Record<string, string | number> = {}): string {
  const template = table[key] ?? en[key];
  return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
}
