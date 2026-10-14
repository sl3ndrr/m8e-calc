import { Component, createRef, type ReactNode } from 'react';
import { I18nProvider } from 'react-aria-components';
import { Button } from '../ui/Button';
import { Snackbar } from '../ui/Snackbar';
import { snackbarQueue } from '../ui/snackbarQueue';
import { useAppStore } from '../shared/store';
import { t } from '../shared/i18n';
import { refreshAppChunks } from './reloadMode';
/** Keep shared shell/dialog failures recoverable even outside a mode boundary. */
export class AppErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  private reset = createRef<HTMLButtonElement>();
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.reset.current?.focus();
    snackbarQueue.add({ message: t('error.global') });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const locale = useAppStore.getState().locale;
    return (
      <I18nProvider locale={locale}>
        <main className="placeholder">
          <section className="mode-placeholder">
            <h1>{t('error.appTitle', locale)}</h1>
            <p className="mode-hint">{t('error.appHint', locale)}</p>
            <Button
              ref={this.reset}
              onPress={async () => {
                if (this.props.onReset) {
                  this.props.onReset();
                  return;
                }
                await refreshAppChunks(
                  performance.getEntriesByType('resource'),
                  window.location.origin,
                );
                window.location.reload();
              }}
            >
              {t('error.reset', locale)}
            </Button>
          </section>
        </main>
        <Snackbar
          label={t('ui.notifications', locale)}
          closeLabel={t('ui.close', locale)}
        />
      </I18nProvider>
    );
  }
}
