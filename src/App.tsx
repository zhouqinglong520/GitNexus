import { useEffect, useCallback } from 'react';
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
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

function AppContent() {
  const contextMenu = useUIStore((s) => s.contextMenu);
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const preferences = usePreferencesStore((s) => s.preferences);
  const updateGeneral = usePreferencesStore((s) => s.updateGeneral);
  const { setLocale } = useTranslation();

  // Notification & Dialog state
  const notifications = useUIStore((s) => s.notifications);
  const removeNotification = useUIStore((s) => s.removeNotification);
  const dialog = useUIStore((s) => s.dialog);
  const closeDialog = useUIStore((s) => s.closeDialog);

  // Command registration helpers
  const registerCommand = useUIStore((s) => s.registerCommand);
  const unregisterCommand = useUIStore((s) => s.unregisterCommand);

  // Sync locale from preferences on mount
  useEffect(() => {
    const prefLocale = preferences.general.language;
    if (prefLocale === 'en' || prefLocale === 'zh-CN') {
      setLocale(prefLocale as Locale);
    }
  }, []);

  // Register commands
  useEffect(() => {
    const commands = [
      {
        id: 'open-repo',
        label: 'Open Repository',
        category: 'Repository',
        shortcut: 'Ctrl+O',
        action: () => {
          // Trigger open repo dialog via file dialog or similar
          useUIStore.getState().addNotification({
            type: 'info',
            title: 'Open Repository',
            message: 'Use the welcome page to open a repository.',
          });
        },
      },
      {
        id: 'clone-repo',
        label: 'Clone Repository',
        category: 'Repository',
        action: () => {
          useUIStore.getState().addNotification({
            type: 'info',
            title: 'Clone Repository',
            message: 'Use the welcome page to clone a repository.',
          });
        },
      },
      {
        id: 'init-repo',
        label: 'Initialize Repository',
        category: 'Repository',
        action: () => {
          useUIStore.getState().addNotification({
            type: 'info',
            title: 'Initialize Repository',
            message: 'Use the welcome page to initialize a new repository.',
          });
        },
      },
      {
        id: 'settings',
        label: 'Open Settings',
        category: 'Application',
        shortcut: 'Ctrl+,',
        action: () => {
          window.location.hash = '#/settings';
        },
      },
      {
        id: 'push',
        label: 'Push',
        category: 'Remote',
        action: () => {
          useUIStore.getState().addNotification({
            type: 'info',
            title: 'Push',
            message: 'Push is available from the repository page.',
          });
        },
      },
      {
        id: 'pull',
        label: 'Pull',
        category: 'Remote',
        action: () => {
          useUIStore.getState().addNotification({
            type: 'info',
            title: 'Pull',
            message: 'Pull is available from the repository page.',
          });
        },
      },
      {
        id: 'fetch',
        label: 'Fetch',
        category: 'Remote',
        action: () => {
          useUIStore.getState().addNotification({
            type: 'info',
            title: 'Fetch',
            message: 'Fetch is available from the repository page.',
          });
        },
      },
      {
        id: 'command-palette',
        label: 'Command Palette',
        category: 'Application',
        shortcut: 'Ctrl+P',
        action: () => {
          useUIStore.getState().toggleCommandPalette();
        },
      },
    ];

    commands.forEach((cmd) => registerCommand(cmd));

    return () => {
      commands.forEach((cmd) => unregisterCommand(cmd.id));
    };
  }, [registerCommand, unregisterCommand]);

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

  const handleDialogConfirm = useCallback(() => {
    if (dialog?.onConfirm) {
      dialog.onConfirm();
    }
    closeDialog();
  }, [dialog, closeDialog]);

  const handleDialogCancel = useCallback(() => {
    if (dialog?.onCancel) {
      dialog.onCancel();
    }
    closeDialog();
  }, [dialog, closeDialog]);

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

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>

      {/* Dialog */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Modal overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleDialogCancel}
          />
          {/* Dialog content */}
          <div className="relative bg-base border border-border rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {dialog.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {dialog.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDialogCancel}
                className="px-4 py-2 text-sm rounded-md border border-border bg-background hover:bg-accent text-foreground transition-colors"
              >
                {dialog.cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={handleDialogConfirm}
                className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {dialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Notification icon mapping
const notificationIcons = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
};

// Notification border color mapping
const notificationBorderColors = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  warning: 'border-l-yellow-500',
  info: 'border-l-blue-500',
};

function NotificationToast({
  notification,
  onClose,
}: {
  notification: {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
    duration?: number;
  };
  onClose: () => void;
}) {
  return (
    <div
      className="pointer-events-auto animate-in slide-in-from-right-full fade-in duration-300 max-w-sm w-full bg-background border border-border rounded-lg shadow-lg p-4 border-l-4 cursor-pointer"
      style={{ borderLeftColor: undefined }}
      onClick={onClose}
    >
      <div className={`flex items-start gap-3 border-l-4 rounded-lg -ml-4 pl-3 ${notificationBorderColors[notification.type]}`}>
        <div className="flex-shrink-0 mt-0.5">
          {notificationIcons[notification.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {notification.title}
          </p>
          {notification.message && (
            <p className="text-xs text-muted-foreground mt-1">
              {notification.message}
            </p>
          )}
        </div>
        <button
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
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
