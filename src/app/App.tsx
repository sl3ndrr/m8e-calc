import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import { I18nProvider } from 'react-aria-components';
import { t } from '../shared/i18n';
import { useAppStore } from '../shared/store';
import { useHistoryStore } from '../shared/historyStore';
import { useSettingsStore } from '../shared/settingsStore';
import { parseHash } from './routing';
import { modeRegistry } from './modeRegistry';
import {
  AccentPicker,
  Button,
  Icon,
  IconButton,
  LoadingIndicator,
  NavigationRail,
  Snackbar,
  ThemeSwitch,
  useMediaQuery,
  useSpring,
} from '../ui';
import { ModeStage } from './ModeStage';
import { HistorySheet } from './HistorySheet';
import { SettingsDialog } from './SettingsDialog';
import './AppShell.css';
const DesignLab = lazy(() =>
  import('./DesignLab').then((module) => ({ default: module.DesignLab })),
);
function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}
function getHash() {
  return window.location.hash;
}
export function App() {
  const hash = useSyncExternalStore(subscribe, getHash);
  const lastMode = useAppStore((state) => state.lastMode);
  const route = parseHash(hash, lastMode);
  const mode = route === 'design' ? lastMode : route;
  const locale = useAppStore((state) => state.locale);
  const visible = useHistoryStore((state) => state.visibility[mode]);
  const count = useHistoryStore(
    (state) => state.entries.filter((entry) => entry.mode === mode).length,
  );
  const limit = useSettingsStore((state) => state.historyLimit);
  const docked = useMediaQuery('(min-width: 1440px)');
  const wideRail = useMediaQuery('(min-width: 1600px)');
  const [railOverride, setRailOverride] = useState<boolean | null>(null);
  const expanded = railOverride ?? wideRail;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dockProgress = useSpring(
    docked && visible && route !== 'design' ? 1 : 0,
    'spatial-default',
  );
  function toggleHistory(): void {
    useHistoryStore.getState().setVisible(mode, !visible);
  }
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t('app.name', locale);
  }, [locale]);
  useEffect(() => {
    if (route !== 'design') useAppStore.getState().setLastMode(route);
  }, [route]);
  useEffect(() => {
    useHistoryStore.getState().setLimit(limit);
  }, [limit]);
  useEffect(() => {
    function shortcut(event: KeyboardEvent): void {
      if (
        event.ctrlKey &&
        event.key.toLowerCase() === 'h' &&
        !event.altKey &&
        !event.shiftKey &&
        !event.repeat &&
        route !== 'design' &&
        !settingsOpen
      ) {
        event.preventDefault();
        toggleHistory();
      }
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  });
  const personalization = (
    <div
      className="shell-personalization"
      role="group"
      aria-label={t('design.controls', locale)}
    >
      <ThemeSwitch />
      <AccentPicker />
    </div>
  );
  const notifications = (
    <Snackbar
      label={t('ui.notifications', locale)}
      closeLabel={t('ui.close', locale)}
    />
  );
  return (
    <I18nProvider locale={locale}>
      {route === 'design' ? (
        <main className="placeholder">
          <p className="brand">{t('app.name', locale)}</p>
          <nav aria-label={t('app.navigation', locale)}>
            {[
              ...modeRegistry.map((item) => ({
                id: item.id,
                label: t(item.labelKey, locale),
              })),
              { id: 'design', label: t('mode.design', locale) },
            ].map((item) => (
              <a
                key={item.id}
                href={`#/${item.id}`}
                aria-current={route === item.id ? 'page' : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
          {personalization}
          <Suspense
            fallback={<LoadingIndicator label={t('ui.loading', locale)} />}
          >
            <DesignLab />
          </Suspense>
        </main>
      ) : (
        <div
          className="app-shell"
          data-expanded={expanded || undefined}
          data-history-open={(visible && docked) || undefined}
          style={
            { '--dock-progress': Math.max(0, dockProgress) } as CSSProperties
          }
        >
          <aside className="shell-rail">
            <p className="shell-brand">{t('app.name', locale)}</p>
            <NavigationRail
              scaled
              label={t('app.navigation', locale)}
              selectedId={mode}
              expanded={expanded}
              items={modeRegistry.map((item) => ({
                id: item.id,
                href: `#/${item.id}`,
                label: t(item.labelKey, locale),
                icon: item.icon,
              }))}
            />
            <div className="shell-rail-bottom">
              <IconButton
                icon={expanded ? 'menu_open' : 'menu'}
                variant="text"
                aria-label={t(
                  expanded ? 'shell.collapse' : 'shell.expand',
                  locale,
                )}
                onPress={() => setRailOverride(!expanded)}
              />
              <a href="#/design" aria-label={t('mode.design', locale)}>
                <Icon name="palette" />
                <span>{t('mode.design', locale)}</span>
              </a>
            </div>
          </aside>
          <main className="shell-main">
            <header className="shell-toolbar">
              <div>
                <p className="shell-eyebrow">{t('shell.eyebrow', locale)}</p>
                <span>{t(`mode.${mode}`, locale)}</span>
              </div>
              <div className="shell-controls">
                {personalization}
                <IconButton
                  icon="settings"
                  variant="text"
                  aria-label={t('shell.settings', locale)}
                  onPress={() => setSettingsOpen(true)}
                />
                <Button
                  variant="tonal"
                  isSelected={visible}
                  aria-expanded={visible}
                  aria-controls="mode-history"
                  aria-keyshortcuts="Control+H"
                  onPress={toggleHistory}
                  aria-label={t('history.toggle', locale)}
                >
                  <Icon name="history" />
                  <span className="history-toggle-label">
                    {t('history.title', locale)}
                  </span>
                  <span className="history-badge">{count}</span>
                </Button>
              </div>
            </header>
            <ModeStage mode={mode} />
          </main>
          <div
            className="shell-history"
            id="mode-history"
            data-docked={docked || undefined}
            data-visible={visible || undefined}
          >
            <HistorySheet
              key={`${mode}-${docked}`}
              mode={mode}
              visible={visible}
              docked={docked}
              onClose={() => useHistoryStore.getState().setVisible(mode, false)}
            />
          </div>
        </div>
      )}
      <SettingsDialog isOpen={settingsOpen} onOpenChange={setSettingsOpen} />
      {route !== 'design' && notifications}
    </I18nProvider>
  );
}
