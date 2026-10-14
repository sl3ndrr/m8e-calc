import { Component, createRef, type ReactNode } from 'react';
import { Button } from '../ui/Button';
import { t, type Locale } from '../shared/i18n';
interface Props {
  children: ReactNode;
  locale: Locale;
  onReset: (reload: boolean) => void;
}
export class ModeLoadError extends Error {}
/** A failing lazy import or render must leave the shell and other modes usable. */
export class ModeErrorBoundary extends Component<
  Props,
  { failed: boolean; reload: boolean }
> {
  private reset = createRef<HTMLButtonElement>();
  componentDidCatch() {
    this.reset.current?.focus();
  }
  state = { failed: false, reload: false };
  static getDerivedStateFromError(error: unknown) {
    return { failed: true, reload: error instanceof ModeLoadError };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="mode-placeholder" role="alert">
        <h1>{t('error.modeTitle', this.props.locale)}</h1>
        <p className="mode-hint">{t('error.modeHint', this.props.locale)}</p>
        <Button
          ref={this.reset}
          onPress={() => this.props.onReset(this.state.reload)}
        >
          {t('error.reset', this.props.locale)}
        </Button>
      </section>
    );
  }
}
