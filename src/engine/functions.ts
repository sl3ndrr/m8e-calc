import type Decimal from 'decimal.js';
import type { FunctionDefinition, FunctionRegistry } from './types.ts';
import { Guard, D, requireDomain } from './numeric.ts';
import { define, unary, binary } from './functionHelpers.ts';
import { scientificDefinitions } from './scientificFunctions.ts';
import { fromRadians, sineCosine } from './trigonometry.ts';
import { floatImplementations } from './floatFunctions.ts';

function root(order: Decimal, radicand: Decimal): Decimal {
  requireDomain(order.isInteger() && !order.isZero());
  requireDomain(!radicand.isNegative() || order.abs().mod(2).eq(1));
  requireDomain(
    !order.isNegative() || !radicand.isZero(),
    'E_DIVISION_BY_ZERO',
  );
  const degree = new Guard(order.abs());
  const magnitude = new Guard(radicand.abs());
  let value = degree.eq(1)
    ? magnitude
    : degree.eq(2)
      ? magnitude.sqrt()
      : degree.eq(3)
        ? magnitude.cbrt()
        : magnitude.pow(new Guard(1).div(degree));
  if (radicand.isNegative()) value = value.neg();
  if (order.isNegative()) value = new Guard(1).div(value);
  return value;
}

const definitions: readonly FunctionDefinition[] = [
  unary(
    'sqrt',
    'algebra',
    'Quadratwurzel; komplexer Hauptzweig bei complex:on.',
    'Square root; complex principal branch with complex:on.',
    (x) => {
      requireDomain(x.gte(0));
      return x.sqrt();
    },
  ),
  unary('cbrt', 'algebra', 'Reelle Kubikwurzel.', 'Real cube root.', (x) =>
    x.cbrt(),
  ),
  binary(
    'root',
    'algebra',
    'root(n,x): reelle ganzzahlige Wurzelordnung.',
    'root(n,x): real integer-order root.',
    root,
  ),
  unary('abs', 'algebra', 'Absolutbetrag.', 'Absolute value.', (x) => x.abs()),
  unary(
    'exp',
    'exponential',
    'Exponentialfunktion zur Basis e.',
    'Base-e exponential.',
    (x) => {
      const value = x.exp();
      requireDomain(!value.isZero(), 'E_OVERFLOW');
      return value;
    },
  ),
  unary(
    'ln',
    'exponential',
    'Natürlicher Logarithmus; komplexer Hauptzweig bei complex:on.',
    'Natural logarithm; complex principal branch with complex:on.',
    (x) => {
      requireDomain(x.gt(0));
      return x.ln();
    },
  ),
  unary(
    'log',
    'exponential',
    'Logarithmus zur Basis 10 (x > 0).',
    'Base-10 logarithm (x > 0).',
    (x) => {
      requireDomain(x.gt(0));
      return x.log(10);
    },
  ),
  unary(
    'log2',
    'exponential',
    'Logarithmus zur Basis 2 (x > 0).',
    'Base-2 logarithm (x > 0).',
    (x) => {
      requireDomain(x.gt(0));
      return x.log(2);
    },
  ),
  binary(
    'logb',
    'exponential',
    'logb(b,x): Logarithmus (b > 0, b ≠ 1, x > 0).',
    'logb(b,x): logarithm (b > 0, b ≠ 1, x > 0).',
    (b, x) => {
      requireDomain(b.gt(0) && !b.eq(1) && x.gt(0));
      return x.log(b);
    },
  ),
  unary(
    'sin',
    'trigonometry',
    'Sinus im Kontext-Winkelmodus.',
    'Sine in the context angle mode.',
    (x, ctx) => sineCosine(x, ctx.angleMode)[0],
  ),
  unary(
    'cos',
    'trigonometry',
    'Kosinus im Kontext-Winkelmodus.',
    'Cosine in the context angle mode.',
    (x, ctx) => sineCosine(x, ctx.angleMode)[1],
  ),
  unary(
    'tan',
    'trigonometry',
    'Tangens; Pole sind Definitionsfehler.',
    'Tangent; poles are domain errors.',
    (x, ctx) => {
      const [sin, cos] = sineCosine(x, ctx.angleMode);
      requireDomain(!cos.isZero());
      return sin.div(cos);
    },
  ),
  unary(
    'asin',
    'trigonometry',
    'Arkussinus (-1 ≤ x ≤ 1).',
    'Arcsine (-1 ≤ x ≤ 1).',
    (x, ctx) => {
      requireDomain(x.abs().lte(1));
      return fromRadians(new Guard(x).asin(), ctx.angleMode);
    },
  ),
  unary(
    'acos',
    'trigonometry',
    'Arkuskosinus (-1 ≤ x ≤ 1).',
    'Arccosine (-1 ≤ x ≤ 1).',
    (x, ctx) => {
      requireDomain(x.abs().lte(1));
      return fromRadians(new Guard(x).acos(), ctx.angleMode);
    },
  ),
  unary(
    'atan',
    'trigonometry',
    'Arkustangens im Kontext-Winkelmodus.',
    'Arctangent in the context angle mode.',
    (x, ctx) => fromRadians(new Guard(x).atan(), ctx.angleMode),
  ),
  binary(
    'atan2',
    'trigonometry',
    'atan2(y,x): quadrantentreuer Winkel; (0,0) undefiniert.',
    'atan2(y,x): quadrant-aware angle; (0,0) undefined.',
    (y, x, ctx) => {
      requireDomain(!y.isZero() || !x.isZero());
      return fromRadians(Guard.atan2(y, x), ctx.angleMode);
    },
  ),
  unary(
    'floor',
    'rounding',
    'Zur nächstkleineren ganzen Zahl.',
    'Round down to an integer.',
    (x) => x.floor(),
  ),
  unary(
    'ceil',
    'rounding',
    'Zur nächstgrößeren ganzen Zahl.',
    'Round up to an integer.',
    (x) => x.ceil(),
  ),
  unary(
    'round',
    'rounding',
    'Zur ganzen Zahl, Gleichstand vom Nullpunkt weg.',
    'Round to integer, ties away from zero.',
    (x) => x.round(),
  ),
  unary(
    'trunc',
    'rounding',
    'Nachkommastellen abschneiden.',
    'Truncate fractional digits.',
    (x) => x.trunc(),
  ),
  unary(
    'sign',
    'rounding',
    'Vorzeichen: -1, 0 oder 1.',
    'Sign: -1, 0 or 1.',
    (x) => new D(x.isZero() ? 0 : x.isNegative() ? -1 : 1),
  ),
  define(
    'min',
    { min: 1 },
    'aggregation',
    'Minimum einer oder mehrerer Zahlen.',
    'Minimum of one or more numbers.',
    (args) => args.reduce((a, b) => (a.lte(b) ? a : b)),
  ),
  define(
    'max',
    { min: 1 },
    'aggregation',
    'Maximum einer oder mehrerer Zahlen.',
    'Maximum of one or more numbers.',
    (args) => args.reduce((a, b) => (a.gte(b) ? a : b)),
  ),
  binary(
    'mod',
    'arithmetic',
    'Euklidischer Rest: 0 ≤ r < abs(b).',
    'Euclidean remainder: 0 ≤ r < abs(b).',
    (a, b) => {
      requireDomain(!b.isZero(), 'E_DIVISION_BY_ZERO');
      return a.mod(b);
    },
  ),
];

export const functionRegistry: FunctionRegistry = Object.freeze(
  Object.fromEntries(
    [...definitions, ...scientificDefinitions].map((definition) => [
      definition.name,
      Object.freeze({
        ...definition,
        ...(floatImplementations[definition.name]
          ? { floatImpl: floatImplementations[definition.name] }
          : {}),
        doc: Object.freeze({ ...definition.doc }),
      }),
    ]),
  ),
);
