import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import storage, { StorageKeys } from '../services/storage';
import { DarkThemeColors, LightThemeColors, ThemeColorPalette } from '../constants/colors';

export type AppTheme = 'dark' | 'light';

interface ThemeContextType {
  theme: AppTheme;
  isDark: boolean;
  colors: ThemeColorPalette;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>('dark');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await storage.getItem(StorageKeys.THEME);
        if (saved === 'light' || saved === 'dark') {
          setThemeState(saved);
        }
      } catch (e) {
        console.warn('[ThemeContext] Error loading theme:', e);
      }
    };
    loadTheme();
  }, []);

  const setTheme = useCallback((newTheme: AppTheme) => {
    setThemeState(newTheme);
    storage.setItem(StorageKeys.THEME, newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      storage.setItem(StorageKeys.THEME, next);
      return next;
    });
  }, []);

  const isDark = theme === 'dark';
  const colors = useMemo(() => (isDark ? DarkThemeColors : LightThemeColors), [isDark]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        colors,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;

