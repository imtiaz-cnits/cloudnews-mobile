import { useCallback, useState } from 'react';
import en from '../i18n/en.json';
import zh from '../i18n/zh.json';

type Language = 'en' | 'zh';
type Translations = typeof en;

const translations: Record<Language, Translations> = {
  en,
  zh,
};

export function useTranslation() {
  const [currentLang, setCurrentLang] = useState<Language>('en');

  const setLanguage = useCallback((lang: Language) => {
    setCurrentLang(lang);
  }, []);

  const t = useCallback(
    (keyPath: string): string => {
      const keys = keyPath.split('.');
      let current: any = translations[currentLang];

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          return keyPath;
        }
      }

      return typeof current === 'string' ? current : keyPath;
    },
    [currentLang],
  );

  return {
    t,
    currentLang,
    setLanguage,
    availableLanguages: ['en', 'zh'] as const,
  };
}

export default useTranslation;

