import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Language, ThemeMode, SiteSettings } from '../types';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../services/api';
import { translations } from '../i18n/translations';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  language: Language;
  theme: ThemeMode;
  siteSettings: SiteSettings | null;
  t: (key: string, params?: Record<string, string | number>) => string;
  login: (nickname: string, password: string) => Promise<void>;
  register: (nickname: string, telegram: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('p2p_calc_lang') as Language;
    return saved && ['uk', 'ru', 'en'].includes(saved) ? saved : 'uk';
  });
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('p2p_calc_theme') as ThemeMode;
    return saved && ['light', 'navy'].includes(saved) ? saved : 'navy';
  });
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  // Apply theme to document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'navy') {
      root.classList.add('dark', 'theme-navy');
      root.classList.remove('theme-light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark', 'theme-navy');
      root.classList.add('theme-light');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('p2p_calc_theme', theme);
  }, [theme]);

  // Save language to localStorage
  useEffect(() => {
    localStorage.setItem('p2p_calc_lang', language);
  }, [language]);

  // Initial load
  useEffect(() => {
    async function init() {
      const existingToken = getStoredToken();
      if (!existingToken) {
        try {
          const pub = await api.getPublicSettings();
          setSiteSettings(pub);
          if (!localStorage.getItem('p2p_calc_theme')) {
            setThemeState('navy');
          }
        } catch {}
        setIsLoading(false);
        return;
      }

      try {
        const { user: me, siteSettings: settings } = await api.getMe();
        setUser(me);
        setSiteSettings(settings);
        if (me.languagePreference) setLanguageState(me.languagePreference);
        if (me.themePreference) setThemeState(me.themePreference);
      } catch (err) {
        console.error('Failed to restore session:', err);
        removeStoredToken();
        setTokenState(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  const login = async (nickname: string, password: string) => {
    const res = await api.login({ nickname, password });
    setStoredToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    if (res.user.languagePreference) setLanguageState(res.user.languagePreference);
    if (res.user.themePreference) setThemeState(res.user.themePreference);
    if (res.siteSettings) {
      setSiteSettings(prev => ({ ...prev, ...res.siteSettings }));
    }
  };

  const register = async (nickname: string, telegram: string, password: string, confirmPassword: string) => {
    const res = await api.register({ nickname, telegram, password, confirmPassword });
    setStoredToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    if (res.user.languagePreference) setLanguageState(res.user.languagePreference);
    if (res.user.themePreference) setThemeState(res.user.themePreference);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    removeStoredToken();
    setTokenState(null);
    setUser(null);
  };

  const setLanguage = async (newLang: Language) => {
    setLanguageState(newLang);
    if (user) {
      try {
        await api.updateProfile({ languagePreference: newLang });
        setUser(prev => prev ? { ...prev, languagePreference: newLang } : null);
      } catch {}
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    if (user) {
      try {
        await api.updateProfile({ themePreference: newTheme });
        setUser(prev => prev ? { ...prev, themePreference: newTheme } : null);
      } catch {}
    }
  };

  const refreshUser = async () => {
    try {
      const { user: me, siteSettings: settings } = await api.getMe();
      setUser(me);
      setSiteSettings(settings);
    } catch {}
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.uk;
    let str = dict[key] || translations.uk[key] || key;
    if (params) {
      Object.entries(params).forEach(([pKey, pVal]) => {
        str = str.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      });
    }
    return str;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        language,
        theme,
        siteSettings,
        t,
        login,
        register,
        logout,
        setLanguage,
        setTheme,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
