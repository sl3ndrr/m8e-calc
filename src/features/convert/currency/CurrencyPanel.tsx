import { useEffect, useMemo, useState } from 'react';
import { createUnitsEngine, type UnitErrorCode } from '../../../units';
import { createCurrencyProvider } from '../../../units/currency';
import { t, type Locale } from '../../../shared/i18n/extended';
import { useSettingsStore } from '../../../shared/settingsStore';
import { Button } from '../../../ui/Button';
import { Fab } from '../../../ui/Fab';
import { Card } from '../../../ui/Card';
import { Select } from '../../../ui/Select';
import { TextField } from '../../../ui/TextField';
import { LoadingIndicator } from '../../../ui/LoadingIndicator';
import { snackbarQueue } from '../../../ui/snackbarQueue';
import { numberLocale, parseInput, errorCode } from '../model';
import { useConvertStore } from '../preferences';
import { currencyCategory } from './catalog';
import { currencyRateClient } from './useCurrencyRates';
import { isStale, type RateState } from './rates';
import { NumberRegion } from '../NumberRegion';
import { UnitResultCard } from '../UnitResultCard';
import './CurrencyPanel.css';

export function CurrencyPanel({
  rates,
  locale,
}: {
  rates: RateState;
  locale: Locale;
}) {
  const [from, setFrom] = useState('EUR');
  const [to, setTo] = useState('USD');
  const [input, setInput] = useState('1');
  const [now, setNow] = useState(Date.now);
  const decimalSeparator = useSettingsStore((s) => s.decimalSeparator);
  const grouping = useSettingsStore((s) => s.grouping);
  const preferences = useConvertStore();
  const category = useMemo(() => currencyCategory(), []);
  const engine = useMemo(
    () =>
      rates.cache
        ? createUnitsEngine(
            [category],
            [createCurrencyProvider(rates.cache.rates)],
          )
        : null,
    [category, rates.cache],
  );
  const formatLocale = numberLocale(locale, { decimalSeparator, grouping });
  const options = {
    locale: formatLocale,
    grouping,
    digits: preferences.digits,
    notation: preferences.notation,
  };
  const pickerOptions = category.units.map((unit) => ({
    id: unit.id,
    label: `${unit.id} · ${unit.symbol} · ${unit.names[locale]}`,
  }));
  let result: string | null = null;
  let error: UnitErrorCode | null = null;
  let value: string | null = null;
  try {
    value = parseInput(input, formatLocale, grouping);
    result = engine?.convert(value, from, to).toString() ?? null;
  } catch (e) {
    error = errorCode(e);
  }
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  async function copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      snackbarQueue.add({ message: t('history.copied', locale) });
    } catch {
      snackbarQueue.add({ message: t('history.copyError', locale) });
    }
  }
  return (
    <section
      className="currency-panel"
      aria-label={t('currency.category', locale)}
    >
      <header className="convert-category-heading">
        <h2>{t('currency.category', locale)}</h2>
        <Button
          variant="outlined"
          isDisabled={rates.loading}
          onPress={() => {
            void currencyRateClient.load(true);
          }}
        >
          {t('currency.refresh', locale)}
        </Button>
      </header>
      <div className="currency-status" role="status">
        {rates.loading && (
          <LoadingIndicator label={t('currency.loading', locale)} size={40} />
        )}
        <p>{t('currency.source', locale)}</p>
        {rates.cache ? (
          <p className="currency-date">
            {t('currency.date', locale, {
              date: new Intl.DateTimeFormat(locale, {
                dateStyle: 'medium',
                timeZone: 'UTC',
              }).format(new Date(`${rates.cache.date}T00:00:00Z`)),
            })}
            {isStale(rates.cache, now) && (
              <strong className="currency-stale">
                {t('currency.stale', locale)}
              </strong>
            )}
          </p>
        ) : (
          <p>{t('currency.unavailable', locale)}</p>
        )}
        {rates.fallback && <p>{t('currency.fallback', locale)}</p>}
      </div>
      <div className="convert-fields">
        <Card className="convert-field">
          <TextField
            label={t('convert.from', locale)}
            inputMode="decimal"
            value={input}
            onChange={setInput}
            isInvalid={!!error}
            errorMessage={
              error ? t(`convert.error.${error}`, locale) : undefined
            }
          />
          <Select
            searchable
            label={t('convert.fromUnit', locale)}
            options={pickerOptions}
            selectedKey={from}
            onSelectionChange={(key) => {
              if (key) setFrom(String(key));
            }}
          />
        </Card>
        <Fab
          icon="swap_horiz"
          className="convert-swap"
          isDisabled={!result}
          aria-label={t('convert.swap', locale)}
          onPress={() => {
            if (!result || !engine) return;
            setInput(
              formatLocale.startsWith('de') ? result.replace('.', ',') : result,
            );
            setFrom(to);
            setTo(from);
          }}
        />
        <Card className="convert-field convert-target">
          <Select
            searchable
            label={t('convert.toUnit', locale)}
            options={pickerOptions}
            selectedKey={to}
            onSelectionChange={(key) => {
              if (key) setTo(String(key));
            }}
          />
          <NumberRegion
            label={t('convert.valueRegion', locale, {
              unit:
                category.units.find((unit) => unit.id === to)?.names[locale] ??
                to,
            })}
          >
            <output
              aria-label={t('convert.result', locale)}
              aria-live="polite"
              className="convert-result"
            >
              {result && engine
                ? `${engine.formatQuantity(result, to, options)} (${to})`
                : '—'}
            </output>
          </NumberRegion>
        </Card>
      </div>
      <p className="convert-note">{t('currency.disclaimer', locale)}</p>
      <section aria-label={t('convert.all', locale)}>
        <h3>{t('convert.all', locale)}</h3>
        <div className="convert-unit-grid">
          {category.units.map((unit) => {
            const text =
              value && !error && engine
                ? engine.formatQuantity(
                    engine.convert(value, from, unit.id),
                    unit.id,
                    options,
                  )
                : '—';
            return (
              <UnitResultCard
                key={unit.id}
                name={`${unit.id} · ${unit.names[locale]}`}
                value={text}
                symbol={unit.symbol}
                valueLabel={t('convert.valueRegion', locale, {
                  unit: unit.names[locale],
                })}
                copyLabel={t('convert.copyUnit', locale, {
                  unit: unit.names[locale],
                })}
                disabled={!engine || !!error}
                onCopy={() => {
                  void copy(`${text} (${unit.id})`);
                }}
              />
            );
          })}
        </div>
      </section>
    </section>
  );
}
