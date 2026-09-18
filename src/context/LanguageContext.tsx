import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import storage from '../services/storage';
import en from '../i18n/en.json';
import zh from '../i18n/zh.json';

export type Language = 'en' | 'zh';

const translations: Record<Language, any> = {
  en,
  zh,
};

interface LanguageContextType {
  currentLang: Language;
  setLanguage: (lang: Language) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
  isZh: boolean;
}

const STORAGE_LANG_KEY = '@cloudnews_app_language';

const LanguageContext = createContext<LanguageContextType>({
  currentLang: 'zh',
  setLanguage: async () => {},
  toggleLanguage: async () => {},
  t: (key: string) => key,
  isZh: true,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLang, setCurrentLangState] = useState<Language>('zh');

  useEffect(() => {
    (async () => {
      try {
        const saved = await storage.getItem(STORAGE_LANG_KEY);
        if (saved === 'en' || saved === 'zh') {
          setCurrentLangState(saved);
        } else {
          setCurrentLangState('zh');
        }
      } catch (e) {
        console.warn('[LanguageContext] Error loading saved language:', e);
      }
    })();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setCurrentLangState(lang);
    try {
      await storage.setItem(STORAGE_LANG_KEY, lang);
    } catch (e) {
      console.warn('[LanguageContext] Error saving language:', e);
    }
  }, []);

  const toggleLanguage = useCallback(async () => {
    const nextLang = currentLang === 'en' ? 'zh' : 'en';
    await setLanguage(nextLang);
  }, [currentLang, setLanguage]);

  const t = useCallback(
    (keyPath: string, params?: Record<string, string | number>): string => {
      const keys = keyPath.split('.');
      let current: any = translations[currentLang];

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          // Fallback to English
          let fallbackCurrent: any = translations['en'];
          for (const fbK of keys) {
            if (fallbackCurrent && typeof fallbackCurrent === 'object' && fbK in fallbackCurrent) {
              fallbackCurrent = fallbackCurrent[fbK];
            } else {
              return keyPath;
            }
          }
          current = fallbackCurrent;
          break;
        }
      }

      if (typeof current !== 'string') {
        return keyPath;
      }

      if (params) {
        let text = current;
        for (const [paramKey, paramVal] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
        }
        return text;
      }

      return current;
    },
    [currentLang],
  );

  return (
    <LanguageContext.Provider
      value={{
        currentLang,
        setLanguage,
        toggleLanguage,
        t,
        isZh: currentLang === 'zh',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
export default useTranslation;
