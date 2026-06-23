import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Welcome } from '@/pages/Welcome';
import { Repository } from '@/pages/Repository';
import { Settings } from '@/pages/Settings';
import { Blame } from '@/pages/Blame';
import { Compare } from '@/pages/Compare';
import { Statistics } from '@/pages/Statistics';
import { CommandPalette } from '@/components/CommandPalette';
import { ContextMenu } from '@/components/ContextMenu';
import { CustomTitleBar } from '@/components/CustomTitleBar';
import { useUIStore } from '@/stores/ui-store';
import { usePreferencesStore } from '@/stores/preferences-store';
import { I18nProvider, useTranslation } from '@/i18n';
import type { Locale } from '@/i18n';

function AppContent() {
  const contextMenu = useUIStore((s) => s.contextMenu);
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const preferences = usePreferencesStore((s) => s.preferences);
  const updateGeneral = usePreferencesStore((s) => s.updateGeneral);
  const { setLocale } = useTranslation();

  // Sync locale from preferences on mount
  useEffect(() => {
    const prefLocale = preferences.general.language;
    if (prefLocale === 'en' || prefLocale === 'zh-CN') {
      setLocale(prefLocale as Locale);
    }
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P or Ctrl+Shift+P to toggle command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleCommandPalette]);

  return (
    <div className="flex flex-col w-full h-full bg-base">
      <CustomTitleBar />
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/repo" element={<Repository />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/blame" element={<Blame />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {commandPaletteOpen && (
        <CommandPalette onClose={() => setCommandPaletteOpen(false)} />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => useUIStore.getState().closeContextMenu()}
        />
      )}
    </div>
  );
}

export default function App() {
  const preferences = usePreferencesStore((s) => s.preferences);
  const updateGeneral = usePreferencesStore((s) => s.updateGeneral);

  const defaultLocale: Locale =
    preferences.general.language === 'en' || preferences.general.language === 'zh-CN'
      ? preferences.general.language
      : 'zh-CN';

  const handleLocaleChange = (locale: Locale) => {
    updateGeneral({ language: locale });
  };

  return (
    <I18nProvider defaultLocale={defaultLocale} onLocaleChange={handleLocaleChange}>
      <AppContent />
    </I18nProvider>
  );
}
