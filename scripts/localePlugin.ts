import type { Plugin } from 'vite';
/** The app supports de/en. Keep upstream locale modules for exactly those languages. */
export function retainAppLocales(code: string): string {
  const removed = new Set<string>();
  let result = code.replace(
    /^import\s+([\w$]+)\s+from\s+["'][^"']*\/([a-z]{2}-[A-Z]{2})\.(?:mjs|js)["'];?\s*$/gm,
    (line, name: string, locale: string) => {
      if (locale === 'de-DE' || locale === 'en-US') return line;
      removed.add(name);
      return '';
    },
  );
  if (!removed.size) return code;
  result = result.replace(
    /^\s*["'][a-z]{2}-[A-Z]{2}["']:\s*([\w$]+),?\s*$/gm,
    (line, name: string) => (removed.has(name) ? '' : line),
  );
  return result;
}
export function localePlugin(): Plugin {
  return {
    name: 'm8e-locales',
    enforce: 'pre',
    apply: 'build',
    transform(code, id) {
      if (
        !/node_modules\/(?:react-aria|react-aria-components)\//.test(id) ||
        !/intl/.test(id)
      )
        return;
      const result = retainAppLocales(code);
      return result === code ? undefined : { code: result, map: null };
    },
  };
}
