// Development/CI probe only. Never imported by the app or included in its build.
const url = 'https://api.frankfurter.dev/v2/providers/ecb/rates?base=EUR';
const response = await fetch(url, {
  headers: { Origin: 'https://sl3ndrr.github.io' },
  signal: AbortSignal.timeout(20000),
  redirect: 'error',
});
const cors = response.headers.get('access-control-allow-origin');
if (!response.ok) throw new Error(`Availability: HTTP ${response.status}`);
if (cors !== '*' && cors !== 'https://sl3ndrr.github.io')
  throw new Error(`CORS does not allow the Pages origin: ${cors}`);
const rows = await response.json();
if (
  !Array.isArray(rows) ||
  rows.length < 29 ||
  rows.some(
    (row) =>
      row.base !== 'EUR' ||
      typeof row.quote !== 'string' ||
      !row.date ||
      !(Number(row.rate) > 0),
  )
)
  throw new Error('Unexpected provider response');
console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      endpoint: url,
      status: response.status,
      cors,
      currencies: rows.map((row) => row.quote),
      dates: [...new Set(rows.map((row) => row.date))],
    },
    null,
    2,
  ),
);
