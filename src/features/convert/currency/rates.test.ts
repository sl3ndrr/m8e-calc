import { afterEach, describe, expect, it, vi } from 'vitest';
import { currencyCodes } from '../../../units/currency';
import {
  CurrencyRateClient,
  parseRateResponse,
  parseRateCache,
  isStale,
  RATE_CACHE_KEY,
  RATE_URL,
  REFRESH_INTERVAL,
  STALE_INTERVAL,
  REQUEST_TIMEOUT,
} from './rates';
const now = Date.parse('2026-10-14T16:00:00Z');
const rows = currencyCodes
  .filter((code) => code !== 'EUR')
  .map((quote) => ({
    base: 'EUR',
    quote,
    rate: quote === 'USD' ? 1.25 : quote === 'GBP' ? 0.8 : 1,
    date: '2026-10-14',
  }));
const response = () => new Response(JSON.stringify(rows));
function setup(initial: string | null = null) {
  let raw = initial;
  let enabled = true;
  let online = true;
  let time = now;
  const storage = {
    getItem: vi.fn(() => raw),
    setItem: vi.fn((_key: string, value: string) => {
      raw = value;
    }),
  };
  const request = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => response());
  const client = new CurrencyRateClient({
    consent: () => enabled,
    storage: () => storage,
    request,
    online: () => online,
    now: () => time,
  });
  return {
    client,
    storage,
    request,
    consent: (value: boolean) => {
      enabled = value;
    },
    online: (value: boolean) => {
      online = value;
    },
    time: (value: number) => {
      time = value;
    },
  };
}
afterEach(() => vi.useRealTimers());
describe('currency cache and requests', () => {
  it('does zero IO without opt-in, even for a forced load', async () => {
    const s = setup();
    s.consent(false);
    await s.client.load();
    await s.client.load(true);
    expect(s.request).not.toHaveBeenCalled();
    expect(s.storage.getItem).not.toHaveBeenCalled();
  });
  it('fetches one complete ECB snapshot, coalesces loads and persists timestamp', async () => {
    const s = setup();
    await Promise.all([s.client.load(), s.client.load(), s.client.load(true)]);
    expect(s.request).toHaveBeenCalledTimes(1);
    expect(s.request).toHaveBeenCalledWith(
      RATE_URL,
      expect.objectContaining({
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        redirect: 'error',
        mode: 'cors',
      }),
    );
    expect(s.client.getSnapshot()).toMatchObject({
      loading: false,
      error: null,
      cache: { fetchedAt: now, date: '2026-10-14', rates: { USD: '1.25' } },
    });
    expect(s.storage.setItem).toHaveBeenCalledWith(
      RATE_CACHE_KEY,
      expect.any(String),
    );
  });
  it('uses fresh cache with no requests and refreshes at most every four hours', async () => {
    const cache = parseRateResponse(rows, now);
    const s = setup(JSON.stringify(cache));
    await s.client.load();
    expect(s.request).not.toHaveBeenCalled();
    s.time(now + REFRESH_INTERVAL);
    await s.client.load();
    await s.client.load();
    expect(s.request).toHaveBeenCalledTimes(1);
    await s.client.load(true);
    expect(s.request).toHaveBeenCalledTimes(2);
  });
  it('keeps the previous cache offline, marks old rate dates independently of fetch time', async () => {
    const cache = parseRateResponse(
      rows.map((r) => ({ ...r, date: '2026-10-10' })),
      now - REFRESH_INTERVAL,
    );
    const s = setup(JSON.stringify(cache));
    s.online(false);
    await s.client.load();
    expect(s.request).not.toHaveBeenCalled();
    expect(s.client.getSnapshot()).toMatchObject({
      error: 'offline',
      fallback: true,
      cache,
    });
    expect(isStale(cache, now)).toBe(true);
    const fresh = parseRateResponse(rows, now);
    const date = Date.parse('2026-10-14T00:00:00Z');
    expect(isStale(fresh, date + STALE_INTERVAL - 1)).toBe(false);
    expect(isStale(fresh, date + STALE_INTERVAL)).toBe(true);
  });
  it.each(['network', 'api'] as const)(
    'handles %s failure and throttles automatic retries',
    async (failure) => {
      const s = setup(
        JSON.stringify(parseRateResponse(rows, now - REFRESH_INTERVAL)),
      );
      if (failure === 'network')
        s.request.mockRejectedValue(new TypeError('network'));
      else s.request.mockResolvedValue(new Response('{}', { status: 503 }));
      await s.client.load();
      await s.client.load();
      expect(s.client.getSnapshot()).toMatchObject({
        error: failure,
        loading: false,
        fallback: true,
      });
      expect(s.request).toHaveBeenCalledTimes(1);
      expect(s.storage.setItem).not.toHaveBeenCalled();
    },
  );
  it('aborts a timeout and keeps the cache', async () => {
    vi.useFakeTimers();
    const s = setup(
      JSON.stringify(parseRateResponse(rows, now - REFRESH_INTERVAL)),
    );
    s.request.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );
    const load = s.client.load();
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT);
    await load;
    expect(s.client.getSnapshot()).toMatchObject({
      loading: false,
      error: 'timeout',
      fallback: true,
    });
  });
  it('revokes consent during a request and ignores late responses', async () => {
    const s = setup();
    let resolve: ((response: Response) => void) | undefined;
    s.request.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const load = s.client.load();
    s.consent(false);
    s.client.disable();
    resolve?.(response());
    await load;
    expect(s.storage.setItem).not.toHaveBeenCalled();
    expect(s.client.getSnapshot()).toEqual({
      cache: null,
      loading: false,
      error: null,
      fallback: false,
    });
  });
  it('survives corrupt, denied and full storage', async () => {
    const s = setup('{broken');
    await s.client.load();
    expect(s.client.getSnapshot().cache).not.toBeNull();
    const denied = setup();
    denied.storage.getItem.mockImplementation(() => {
      throw Error('denied');
    });
    denied.storage.setItem.mockImplementation(() => {
      throw Error('quota');
    });
    await denied.client.load();
    expect(denied.client.getSnapshot()).toMatchObject({
      error: null,
      loading: false,
    });
  });
  it('rejects incomplete, mixed-date, duplicate, nonpositive and future API data', () => {
    for (const value of [
      {},
      [],
      rows.slice(1),
      [...rows.slice(1), rows[1]],
      rows.map((r, i) => (i ? r : { ...r, rate: 0 })),
      rows.map((r, i) => (i ? r : { ...r, date: '2026-10-13' })),
      rows.map((r) => ({ ...r, date: '2027-01-01' })),
    ])
      expect(() => parseRateResponse(value, now)).toThrow();
  });
  it('validates cache version, source, timestamps, dates and decimal strings', () => {
    const cache = parseRateResponse(rows, now);
    expect(parseRateCache(cache, now)).toEqual(cache);
    for (const patch of [
      { version: 2 },
      { source: 'other' },
      { fetchedAt: now + 1 },
      { date: '2026-02-30' },
      { rates: { ...cache.rates, USD: 'NaN' } },
      { rates: { ...cache.rates, EUR: '2' } },
    ])
      expect(parseRateCache({ ...cache, ...patch }, now)).toBeNull();
  });
});
