import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import en from './locales/en';
import zhCN from './locales/zh-CN';

// Language type
export type Locale = 'en' | 'zh-CN';

// Translation key-value type
export type TranslationKeys = Record<string, string>;

// All supported locales
export const SUPPORTED_LOCALES: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh-CN', label: '简体中文' },
];

// Locale display map
export const LOCALE_LABELS: Record<Locale, string> = {
  'en': 'English',
  'zh-CN': '简体中文',
};

// All locale messages
export const locales: Record<Locale, TranslationKeys> = {
  'en': en,
  'zh-CN': zhCN,
};

// Context value type
interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, ...args: (string | number)[]) => string;
}

// Create context with default values
export const I18nContext = createContext<I18nContextValue>({
  locale: 'zh-CN',
  setLocale: () => {},
  t: (key: string) => key,
});

// Provider props
interface I18nProviderProps {
  children: React.ReactNode;
  defaultLocale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
}

/**
 * I18nProvider - wraps the app with internationalization context
 */
export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  defaultLocale = 'zh-CN',
  onLocaleChange,
}) => {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      onLocaleChange?.(newLocale);
    },
    [onLocaleChange]
  );

  // Translation function with interpolation support
  // Usage: t('welcome.openRepo'), t('workingCopy.stagedCount', 3) => "已暂存变更 (3)"
  const t = useCallback(
    (key: string, ...args: (string | number)[]): string => {
      const messages = locales[locale];
      let text = messages[key] || locales['en'][key] || key;

      // Replace placeholders: {0}, {1}, etc.
      if (args.length > 0) {
        args.forEach((arg, index) => {
          text = text.replace(new RegExp(`\\{${index}\\}`, 'g'), String(arg));
        });
      }

      return text;
    },
    [locale]
  );

  const contextValue = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

export default I18nContext;

// Re-export useTranslation for convenience
export { useTranslation } from './useTranslation';
