import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import vi from './locales/vi.json';
import en from './locales/en.json';
import zh from './locales/zh.json';

const resources = {
  vi: { translation: vi },
  en: { translation: en },
  zh: { translation: zh },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi',
    supportedLngs: ['vi', 'en', 'zh'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

/**
 * Helper translate server/backend messages or fallback strings
 */
export function translateMessage(msg: string | undefined | null): string {
  if (!msg) return '';
  const key = `server_messages.${msg}`;
  const translated = i18n.t(key);
  if (translated && translated !== key) {
    return translated;
  }
  return msg;
}

export default i18n;

