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
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { LoadingIndicator } from '../ui/LoadingIndicator';
import { NavigationRail } from '../ui/NavigationRail';
import { Snackbar } from '../ui/Snackbar';
import { snackbarQueue } from '../ui/snackbarQueue';
import { ThemeSwitch } from '../ui/ThemeSwitch';
import { Tooltip } from '../ui/Tooltip';
import { useMediaQuery } from '../ui/useMediaQuery';
import { useSpring } from '../ui/useSpring';
import { ModeStage } from './ModeStage';
const HistorySheet = lazy(() =>
  import('./HistorySheet').then((m) => ({ default: m.HistorySheet })),
);

const SettingsDialog = lazy(() =>
  import('./SettingsDialog').then((m) => ({ default: m.SettingsDialog })),
);
import './AppShell.css';
import './Comfort.css';
import '../ui/VisuallyHidden.css';
const CommandPalette = lazy(() =>
  import('./CommandPalette').then((m) => ({ default: m.CommandPalette })),
);
const ShortcutDialog = lazy(() =>
  import('./ShortcutDialog').then((m) => ({ default: m.ShortcutDialog })),
);
import { findGlobalShortcut, isInputTarget, shortcutHint } from './shortcuts';
import type { PaletteCommand } from './paletteModel';
import { insertScientific } from './scientificInsertion';
import { encodePermalink } from './permalinks';

import { isModeId } from '../shared/modes';
import { downloadFile } from './fileTransfer';
import { exportHistory } from '../shared/history';
import { usePwa } from './pwa';
if (__INTERNAL_DESIGN_LAB__) void import('./internalLabLink.css');

// Compile-time boundary: the normal build never retains these imports.
const LabAccentPicker = __INTERNAL_DESIGN_LAB__
  ? lazy(() =>
      import('../ui/AccentPicker').then((module) => ({
        default: module.AccentPicker,
      })),
    )
  : null;
const DesignLab = __INTERNAL_DESIGN_LAB__
  ? lazy(() =>
      import('./DesignLab').then((module) => ({ default: module.DesignLab })),
    )
  : null;
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
  const [presentation, setPresentation] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const presentationHistory = useSettingsStore((s) => s.presentationHistory);
  const uiSize = useSettingsStore((s) => s.uiSize);
  const savedVisible = useHistoryStore((state) => state.visibility[mode]);
  const visible = savedVisible && (!presentation || presentationHistory);
  const pwa = usePwa();
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
    useHistoryStore.getState().setVisible(mode, !savedVisible);
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
    document.documentElement.style.setProperty(
      '--ui-size',
      String(uiSize / 100),
    );
  }, [uiSize]);
  async function command(item: PaletteCommand): Promise<void> {
    switch (item.action) {
      case 'mode':
        if (isModeId(item.value)) window.location.hash = `#/${item.value}`;
        break;
      case 'settings':
        setSettingsOpen(true);
        break;
      case 'shortcuts':
        setHelpOpen(true);
        break;
      case 'history':
        toggleHistory();
        break;
      case 'presentation':
        setPresentation((value) => !value);
        break;
      case 'theme': {
        const settings = useSettingsStore.getState();
        settings.updateSettings({
          themeMode:
            settings.themeMode === 'light'
              ? 'system'
              : settings.themeMode === 'system'
                ? 'dark'
                : 'light',
        });
        break;
      }
      case 'accent':
        if (item.value)
          useSettingsStore.getState().updateSettings({ accent: item.value });
        break;
      case 'export':
        downloadFile(
          exportHistory(
            useHistoryStore
              .getState()
              .entries.filter((entry) => entry.mode === mode),
            'json',
          ),
          `m8e-calc-${mode}.json`,
          'application/json',
        );
        break;
      case 'insert':
        if (
          item.value &&
          !(mode === 'scientific' && insertScientific(item.value))
        )
          window.location.hash = encodePermalink('scientific', {
            expression: item.value ?? '',
            angleMode: 'deg',
          });
        break;
      case 'conversion': {
        const { convertReducer, initialConvertState } =
          await import('../features/convert/model');
        const state = convertReducer(initialConvertState(), {
          type: 'query',
          text: item.value ?? '',
          locale,
        });
        if (!state.error)
          window.location.hash = encodePermalink('convert', state);
        break;
      }
    }
  }
  useEffect(() => {
    function shortcut(event: KeyboardEvent): void {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        route === 'design'
      )
        return;
      const item = findGlobalShortcut(event, isInputTarget(event.target));
      if (!item) return;
      if (paletteOpen) {
        if (item.id === 'palette') {
          event.preventDefault();
          event.stopPropagation();
          setPaletteOpen(false);
        }
        return;
      }
      // Existing modal/menu scopes own all keys except the explicitly global palette opener.
      if (
        settingsOpen ||
        helpOpen ||
        document.querySelector(
          '[role="dialog"], [role="menu"], [role="listbox"]',
        )
      ) {
        if (item.id !== 'palette' || settingsOpen || helpOpen) return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (item.id === 'palette') setPaletteOpen(true);
      else if (item.id === 'help') setHelpOpen(true);
      else if (item.id === 'history') toggleHistory();
      else if (item.id === 'presentation') setPresentation((value) => !value);
      else if (item.id === 'settings') setSettingsOpen(true);
      else if (item.id.startsWith('mode.'))
        window.location.hash = `#/${item.id.slice(5)}`;
    }
    window.addEventListener('keydown', shortcut, true);
    return () => window.removeEventListener('keydown', shortcut, true);
  });
  const personalization = (
    <div
      className="shell-personalization"
      role="group"
      aria-label={t('design.controls', locale)}
    >
      <ThemeSwitch />
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
      {__INTERNAL_DESIGN_LAB__ && route === 'design' && DesignLab ? (
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
          {LabAccentPicker && (
            <Suspense fallback={null}>
              <LabAccentPicker />
            </Suspense>
          )}
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
          data-presentation={presentation || undefined}
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
              {__INTERNAL_DESIGN_LAB__ && (
                <a href="#/design" aria-label={t('mode.design', locale)}>
                  <Icon name="palette" />
                  <span>{t('mode.design', locale)}</span>
                </a>
              )}
            </div>
          </aside>
          <main className="shell-main" aria-labelledby="active-mode-title">
            <header className="shell-toolbar">
              {!presentation && (
                <h1 id="active-mode-title" className="shell-mode-title">
                  {t(`mode.${mode}`, locale)}
                </h1>
              )}
              <div className="shell-controls">
                {personalization}
                <Tooltip
                  trigger={
                    <Button
                      variant="text"
                      className="comfort-control"
                      onPress={() => setPaletteOpen(true)}
                      aria-label={t('comfort.palette', locale)}
                      aria-keyshortcuts="Control+K Meta+K"
                    >
                      <span aria-hidden="true">⌘</span>
                    </Button>
                  }
                >
                  {t('comfort.palette', locale)} · {shortcutHint('palette')}
                </Tooltip>
                <Tooltip
                  trigger={
                    <Button
                      variant="text"
                      aria-label={t('comfort.shortcuts', locale)}
                      onPress={() => setHelpOpen(true)}
                    >
                      ?
                    </Button>
                  }
                >
                  {t('comfort.shortcuts', locale)} · {shortcutHint('help')}
                </Tooltip>
                <Tooltip
                  trigger={
                    <Button
                      variant="text"
                      className="comfort-control"
                      onPress={() => setPresentation(true)}
                      aria-label={t('comfort.presentation', locale)}
                    >
                      <span aria-hidden="true">⛶</span>
                    </Button>
                  }
                >
                  {t('comfort.presentation', locale)} ·{' '}
                  {shortcutHint('presentation')}
                </Tooltip>
                <IconButton
                  icon="settings"
                  variant="text"
                  aria-label={t('shell.settings', locale)}
                  title={`${t('shell.settings', locale)} · ${shortcutHint('settings')}`}
                  onPress={() => setSettingsOpen(true)}
                />
                <Button
                  variant="tonal"
                  isSelected={visible}
                  aria-expanded={visible}
                  aria-controls="mode-history"
                  aria-keyshortcuts="Control+H"
                  title={`${t('history.toggle', locale)} · ${shortcutHint('history')}`}
                  onPress={toggleHistory}
                  aria-label={t('history.toggle', locale)}
                >
                  <Icon name="history" />
                  <span className="history-toggle-label">
                    {t('history.title', locale)}
                  </span>
                  <span className="history-badge" aria-hidden="true">
                    {count}
                  </span>
                </Button>
              </div>
            </header>
            {presentation && (
              <h1 id="active-mode-title" className="ui-visually-hidden">
                {t(`mode.${mode}`, locale)}
              </h1>
            )}
            <ModeStage mode={mode} routeKey={`${mode}:${hash}`} />
          </main>
          <div
            className="shell-history"
            id="mode-history"
            data-docked={docked || undefined}
            data-visible={visible || undefined}
          >
            {visible && (
              <Suspense
                fallback={<LoadingIndicator label={t('ui.loading', locale)} />}
              >
                <HistorySheet
                  key={`${mode}-${docked}`}
                  mode={mode}
                  visible={visible}
                  docked={docked}
                  onClose={() =>
                    useHistoryStore.getState().setVisible(mode, false)
                  }
                />
              </Suspense>
            )}
          </div>
        </div>
      )}
      {presentation && (
        <div className="presentation-exit">
          <Button variant="text" onPress={() => setPresentation(false)}>
            {t('comfort.exitPresentation', locale)} ·{' '}
            {shortcutHint('presentation')}
          </Button>
        </div>
      )}
      {paletteOpen && (
        <Suspense
          fallback={<LoadingIndicator label={t('ui.loading', locale)} />}
        >
          <CommandPalette
            onClose={() => setPaletteOpen(false)}
            onCommand={(item) => {
              void command(item).catch(() =>
                snackbarQueue.add({ message: t('error.global', locale) }),
              );
            }}
          />
        </Suspense>
      )}
      {helpOpen && (
        <Suspense
          fallback={<LoadingIndicator label={t('ui.loading', locale)} />}
        >
          <ShortcutDialog onClose={() => setHelpOpen(false)} />
        </Suspense>
      )}
      {settingsOpen && (
        <Suspense
          fallback={<LoadingIndicator label={t('ui.loading', locale)} />}
        >
          <SettingsDialog
            isOpen
            onOpenChange={setSettingsOpen}
            installation={pwa}
          />
        </Suspense>
      )}
      {route !== 'design' && notifications}
    </I18nProvider>
  );
}
