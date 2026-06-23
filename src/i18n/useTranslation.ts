import { useContext } from 'react';
import { I18nContext } from './index';
import type { Locale } from './index';

/**
 * useTranslation - custom hook for accessing i18n context
 *
 * Usage:
 *   const { locale, setLocale, t } = useTranslation();
 *   t('welcome.openRepo') => "Open Repository" / "打开仓库"
 *   t('workingCopy.stagedCount', 3) => "Staged Changes (3)" / "已暂存变更 (3)"
 */
export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return {
    locale: context.locale as Locale,
    setLocale: context.setLocale,
    t: context.t,
  };
}
