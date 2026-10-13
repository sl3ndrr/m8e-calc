import { constantRegistry, functionRegistry } from '../../engine';
import type { Locale } from '../../shared/i18n';
const signatures: Readonly<Record<string, string>> = {
  sum: 'sum(expr, k, from, to)',
  prod: 'prod(expr, k, from, to)',
  integral: 'integral(expr, x, a, b)',
  deriv: 'deriv(expr, x, point)',
  logb: 'logb(base, x)',
  root: 'root(n, x)',
  atan2: 'atan2(y, x)',
  nCr: 'nCr(n, r)',
  nPr: 'nPr(n, r)',
  round: 'round(x, n?)',
};
export function completionEntries(locale: Locale) {
  return [
    ...Object.values(functionRegistry).map((fn) => ({
      name: fn.name,
      kind: 'function' as const,
      signature:
        signatures[fn.name] ??
        `${fn.name}(${typeof fn.arity === 'number' ? Array.from({ length: fn.arity }, (_, i) => (fn.arity === 1 ? 'x' : `x${i + 1}`)).join(', ') : 'x, …'})`,
      description: fn.doc[locale],
    })),
    ...Object.values(constantRegistry).map((c) => ({
      name: c.id,
      kind: 'constant' as const,
      signature: `${c.symbol} = ${c.value} ${c.unit}`,
      description: c.name[locale],
    })),
  ];
}
