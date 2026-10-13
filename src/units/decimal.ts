import Decimal from 'decimal.js';

/** Private arithmetic context, independent of consumers and the engine. */
export const UDecimal = Decimal.clone({
  precision: 80,
  rounding: Decimal.ROUND_HALF_UP,
});
export const pi = (): Decimal => UDecimal.acos(-1);
