import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useSettingsStore } from '../../../shared/settingsStore';
import { t, type Locale } from '../../../shared/i18n/extended';
import { snackbarQueue } from '../../../ui/snackbarQueue';
import {
  CurrencyRateClient,
  REFRESH_INTERVAL,
  type RateFailure,
} from './rates';

export const currencyRateClient = new CurrencyRateClient({
  consent: () => useSettingsStore.getState().onlineRates,
  storage: () => window.localStorage,
  request: (...args) => fetch(...args),
  online: () => navigator.onLine,
  now: () => Date.now(),
});
// Revocation works immediately, including while another mode is active.
useSettingsStore.subscribe((state, previous) => {
  if (previous.onlineRates && !state.onlineRates) currencyRateClient.disable();
});
export function useCurrencyRates(enabled: boolean, locale: Locale) {
  const state = useSyncExternalStore(
    currencyRateClient.subscribe,
    currencyRateClient.getSnapshot,
  );
  const reported = useRef<RateFailure | null>(null);
  useEffect(() => {
    if (!enabled) return;
    void currencyRateClient.load();
    const timer = window.setInterval(() => {
      void currencyRateClient.load();
    }, REFRESH_INTERVAL);
    return () => window.clearInterval(timer);
  }, [enabled]);
  useEffect(() => {
    if (enabled && state.error && reported.current !== state.error)
      snackbarQueue.add(
        { message: t(`currency.error.${state.error}`, locale) },
        { timeout: 8000 },
      );
    reported.current = state.error;
  }, [enabled, state.error, locale]);
  return state;
}
