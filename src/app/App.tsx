import { useEffect, useSyncExternalStore } from 'react';
import { t } from '../shared/i18n';
import { useAppStore } from '../shared/store';
import { modes, parseHash } from './routing';
import { DesignLab } from './DesignLab';
import { ThemeSwitch } from '../ui/ThemeSwitch';
import { AccentPicker } from '../ui/AccentPicker';

function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}
function getHash() {
  return window.location.hash;
}
export function App() {
  const mode = parseHash(useSyncExternalStore(subscribe, getHash));
  const locale = useAppStore((state) => state.locale);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t('app.name', locale);
  }, [locale]);
  return (
    <main className="placeholder">
      <p className="brand">{t('app.name', locale)}</p>
      <nav aria-label={t('app.navigation', locale)}>
        {modes.map((item) => (
          <a
            key={item}
            href={`#/${item}`}
            aria-current={mode === item ? 'page' : undefined}
          >
            {t(`mode.${item}`, locale)}
          </a>
        ))}
      </nav>
      <div
        className="appearance-toolbar"
        role="group"
        aria-label={t('design.controls', locale)}
      >
        <ThemeSwitch />
        <AccentPicker />
        <div className="language-select">
          <label htmlFor="app-language">{t('language.label', locale)}</label>
          <select
            id="app-language"
            value={locale}
            onChange={(event) =>
              useAppStore
                .getState()
                .setLocale(event.target.value === 'en' ? 'en' : 'de')
            }
          >
            <option value="de">{t('language.de', locale)}</option>
            <option value="en">{t('language.en', locale)}</option>
          </select>
        </div>
      </div>
      {mode === 'design' ? (
        <DesignLab />
      ) : (
        <section aria-labelledby="foundation-title">
          <h1 id="foundation-title">{t('app.foundation', locale)}</h1>
          <p>{t('app.placeholder', locale)}</p>
        </section>
      )}
    </main>
  );
}
