import { de } from './locales/de';
import { en } from './locales/en';

/**
 * Texts of the admin settings page. The language follows Jellyfin Web (<html lang>), then the
 * browser, then English. A key missing in a language falls back to English.
 */
export type ConfigTranslationKey = keyof typeof en;
type Dictionary = Partial<Record<ConfigTranslationKey, string>>;

const dictionaries: Record<string, Dictionary> = { de, en };

function getLanguage(): string {
  const candidates = [document.documentElement.lang, ...(navigator.languages || []), navigator.language];
  for (const candidate of candidates) {
    const locale = String(candidate || '')
      .trim()
      .replace(/_/g, '-')
      .toLowerCase();
    if (!locale) continue;
    if (locale in dictionaries) return locale;
    const language = locale.split('-')[0];
    if (language in dictionaries) return language;
  }
  return 'en';
}

export function t(key: ConfigTranslationKey, values: Record<string, string | number> = {}): string {
  const template = dictionaries[getLanguage()]?.[key] ?? en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : placeholder
  );
}
