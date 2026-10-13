import { t } from '../shared/i18n';
import { useAppStore } from '../shared/store';
import { getMode } from './modeRegistry';
import type { ModeId } from '../shared/modes';
import { Card, Icon } from '../ui';
export function ModePlaceholder({ mode }: { mode: ModeId }) {
  const locale = useAppStore(state => state.locale);
  const definition = getMode(mode);
  return <section className="mode-placeholder" aria-label={t('shell.workspace', locale)}>
    <div className="mode-orbit" aria-hidden="true"><Icon name={definition.icon} /></div>
    <p className="shell-eyebrow">{t(definition.labelKey, locale)}</p>
    <h1>{t('shell.ready', locale)}</h1>
    <p className="mode-hint">{t('shell.hint', locale)}</p>
    <Card className="mode-coming"><Icon name="construction" /><span>{t('shell.soon', locale)}</span></Card>
  </section>;
}
