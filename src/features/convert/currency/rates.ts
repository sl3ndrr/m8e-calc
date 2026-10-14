import { currencyCodes, createCurrencyProvider } from '../../../units/currency';

export const RATE_CACHE_KEY = 'm8e-calc.currency-rates';
export const RATE_ATTEMPT_KEY = `${RATE_CACHE_KEY}.last-attempt`;
export const REFRESH_INTERVAL = 4 * 60 * 60 * 1000;
export const STALE_INTERVAL = 48 * 60 * 60 * 1000;
export const REQUEST_TIMEOUT = 10_000;
export const RATE_ENDPOINT =
  'https://api.frankfurter.dev/v2/providers/ecb/rates';
export const RATE_URL = `${RATE_ENDPOINT}?base=EUR&quotes=${currencyCodes.filter((code) => code !== 'EUR').join(',')}`;
export interface RateCache {
  version: 1;
  source: 'ecb-frankfurter';
  date: string;
  fetchedAt: number;
  rates: Record<string, string>;
}
export type RateFailure = 'network' | 'api' | 'timeout' | 'offline';
export interface RateState {
  cache: RateCache | null;
  loading: boolean;
  error: RateFailure | null;
  fallback: boolean;
}
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
function validDate(value: unknown, now: number): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return (
    Number.isFinite(timestamp) &&
    timestamp <= now &&
    new Date(timestamp).toISOString().slice(0, 10) === value
  );
}
export function isStale(cache: RateCache, now = Date.now()): boolean {
  return now - Date.parse(`${cache.date}T00:00:00Z`) >= STALE_INTERVAL;
}
export function parseRateResponse(value: unknown, now: number): RateCache {
  if (!Array.isArray(value) || value.length < 29 || value.length > 30)
    throw new Error('Invalid ECB response');
  const rates: Record<string, string> = { EUR: '1' };
  let date: string | undefined;
  for (const row of value) {
    if (
      !record(row) ||
      row.base !== 'EUR' ||
      typeof row.quote !== 'string' ||
      !currencyCodes.some((code) => code === row.quote) ||
      !validDate(row.date, now) ||
      (date !== undefined && date !== row.date) ||
      (row.quote !== 'EUR' && row.quote in rates) ||
      (typeof row.rate !== 'number' && typeof row.rate !== 'string')
    )
      throw new Error('Invalid ECB row');
    date = row.date;
    rates[row.quote] = String(row.rate);
  }
  if (!date || rates.EUR !== '1') throw new Error('Invalid EUR base');
  createCurrencyProvider(rates); // Complete, finite, strictly positive quotes.
  return { version: 1, source: 'ecb-frankfurter', date, fetchedAt: now, rates };
}
export function parseRateCache(value: unknown, now: number): RateCache | null {
  try {
    if (
      !record(value) ||
      value.version !== 1 ||
      value.source !== 'ecb-frankfurter' ||
      !validDate(value.date, now) ||
      typeof value.fetchedAt !== 'number' ||
      !Number.isFinite(value.fetchedAt) ||
      value.fetchedAt < 0 ||
      value.fetchedAt > now ||
      !record(value.rates)
    )
      return null;
    const rates: Record<string, string> = {};
    for (const code of currencyCodes) {
      const rate = value.rates[code];
      if (typeof rate !== 'string' || rate.length > 100) return null;
      rates[code] = rate;
    }
    if (rates.EUR !== '1') return null;
    createCurrencyProvider(rates);
    return {
      version: 1,
      source: 'ecb-frankfurter',
      date: value.date,
      fetchedAt: value.fetchedAt,
      rates,
    };
  } catch {
    return null;
  }
}
interface RateDependencies {
  consent: () => boolean;
  storage: () => Pick<Storage, 'getItem' | 'setItem'>;
  request: typeof fetch;
  online: () => boolean;
  now: () => number;
}
/** The only external request adapter. Consent is checked immediately before IO. */
export class CurrencyRateClient {
  private state: RateState = {
    cache: null,
    loading: false,
    error: null,
    fallback: false,
  };
  private listeners = new Set<() => void>();
  private pending: Promise<void> | null = null;
  private controller: AbortController | null = null;
  private lastAttempt = -Infinity;
  private read = false;
  constructor(private readonly dependencies: RateDependencies) {}
  getSnapshot = (): RateState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<RateState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  disable(): void {
    this.controller?.abort();
    this.controller = null;
    this.pending = null;
    this.read = false;
    this.lastAttempt = -Infinity;
    this.publish({ cache: null, loading: false, error: null, fallback: false });
  }
  load(manual = false): Promise<void> {
    if (!this.dependencies.consent()) return Promise.resolve();
    if (this.pending) return this.pending;
    const now = this.dependencies.now();
    if (!this.read) {
      this.read = true;
      try {
        const raw = this.dependencies.storage().getItem(RATE_CACHE_KEY);
        const cache =
          raw && raw.length <= 20000
            ? parseRateCache(JSON.parse(raw), now)
            : null;
        this.publish({ cache });
      } catch {
        /* Denied or corrupt optional storage. */
      }
    }
    try {
      const raw = this.dependencies.storage().getItem(RATE_ATTEMPT_KEY);
      const attempt = raw === null ? NaN : Number(raw);
      if (Number.isFinite(attempt) && attempt >= 0 && attempt <= now)
        this.lastAttempt = Math.max(this.lastAttempt, attempt);
    } catch {
      /* Optional persistence; the in-memory throttle still applies. */
    }
    if (!this.dependencies.online()) {
      this.lastAttempt = now;
      this.publish({ error: 'offline', fallback: !!this.state.cache });
      return Promise.resolve();
    }
    if (
      !manual &&
      (now - this.lastAttempt < REFRESH_INTERVAL ||
        (this.state.cache &&
          now - this.state.cache.fetchedAt < REFRESH_INTERVAL))
    )
      return Promise.resolve();
    this.lastAttempt = now;
    try {
      this.dependencies.storage().setItem(RATE_ATTEMPT_KEY, String(now));
    } catch {
      /* Optional persistence. */
    }
    const controller = new AbortController();
    this.controller = controller;
    this.publish({ loading: true, error: null });
    this.pending = this.fetchRates(controller).finally(() => {
      if (this.controller === controller) {
        this.pending = null;
        this.controller = null;
        this.publish({ loading: false });
      }
    });
    return this.pending;
  }
  private async fetchRates(controller: AbortController): Promise<void> {
    let failure: RateFailure = 'network';
    const timeout = setTimeout(() => {
      failure = 'timeout';
      controller.abort();
    }, REQUEST_TIMEOUT);
    try {
      if (!this.dependencies.consent()) return;
      const response = await this.dependencies.request(RATE_URL, {
        signal: controller.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        redirect: 'error',
        mode: 'cors',
      });
      failure = 'api';
      if (!response.ok) throw new Error('API status');
      const cache = parseRateResponse(
        await response.json(),
        this.dependencies.now(),
      );
      if (
        controller.signal.aborted ||
        !this.dependencies.consent() ||
        this.controller !== controller
      )
        return;
      try {
        this.dependencies
          .storage()
          .setItem(RATE_CACHE_KEY, JSON.stringify(cache));
      } catch {
        /* In-memory quotes remain usable. */
      }
      this.publish({ cache, error: null, fallback: false });
    } catch {
      if (this.controller === controller && this.dependencies.consent())
        this.publish({ error: failure, fallback: !!this.state.cache });
    } finally {
      clearTimeout(timeout);
    }
  }
}
