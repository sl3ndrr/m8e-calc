import {
  UnsupportedExactAnalysis,
  add,
  compareExact,
  decimal,
  evaluateExact,
  exact,
  exactZero,
  gcd,
  negate,
  one,
  rational,
  sign,
  simplifySqrt,
  zero,
  type ExactNumber,
  type Rational,
} from './exactNumbers.ts';
import {
  coefficient,
  derivativeForm,
  difference,
  differentiate,
  isZero,
  polynomial,
  polynomialKey,
  type Polynomial,
} from './exactPolynomial.ts';
import { validateBounds } from './geometry.ts';
import type { Bounds, Curve } from './types.ts';

export type ExactAnalysisKind =
  'roots' | 'extrema' | 'inflections' | 'intersections';
export type Classification =
  'minimum' | 'maximum' | 'inflection' | 'stationaryInflection';

export type ExactStep =
  | { readonly kind: 'compare'; readonly f: Polynomial; readonly g: Polynomial }
  | {
      readonly kind: 'derivative';
      readonly order: 1 | 2;
      readonly expression: Polynomial;
    }
  | { readonly kind: 'equation'; readonly expression: Polynomial }
  | {
      readonly kind: 'factors';
      readonly factors: readonly Polynomial[];
      readonly selected: Polynomial;
    }
  | {
      readonly kind: 'linear';
      readonly coefficient: Rational;
      readonly right: Rational;
    }
  | { readonly kind: 'square'; readonly right: Rational }
  | {
      readonly kind: 'quadratic';
      readonly a: bigint;
      readonly b: bigint;
      readonly c: bigint;
      readonly discriminant: bigint;
    }
  | { readonly kind: 'solution'; readonly x: ExactNumber }
  | {
      readonly kind: 'substitute';
      readonly x: ExactNumber;
      readonly y: ExactNumber;
    }
  | {
      readonly kind: 'classify';
      readonly order: number;
      readonly derivative: 1 | 2;
      readonly value: ExactNumber;
      readonly x: ExactNumber;
      readonly rightSign: -1 | 1;
      readonly classification: Classification;
    };

export interface ExactHit {
  readonly x: ExactNumber;
  readonly y: ExactNumber;
  readonly classification?: Classification;
  readonly steps: readonly ExactStep[];
}

export type ExactAnalysis =
  | { readonly status: 'hits'; readonly hits: readonly ExactHit[] }
  | { readonly status: 'infinite' | 'none' | 'unsupported' };

interface Solution {
  x: ExactNumber;
  steps: readonly ExactStep[];
}

function lowDegree(p: Polynomial, spendTrial: () => void): Solution[] {
  const [c, b, a] = [coefficient(p, 0), coefficient(p, 1), coefficient(p, 2)];
  if (p.length <= 1) return [];
  if (p.length === 2) {
    return [
      {
        x: exact(
          rational(-c.numerator * b.denominator, c.denominator * b.numerator),
        ),
        steps: [{ kind: 'linear', coefficient: b, right: negate(c) }],
      },
    ];
  }
  // Clear denominators and remove common content before taking the discriminant.
  const common = p.reduce(
    (lcm, n) => (lcm / gcd(lcm, n.denominator)) * n.denominator,
    1n,
  );
  const integers = p.map((n) => n.numerator * (common / n.denominator));
  const content = integers.reduce(gcd, 0n) * BigInt(sign(a.numerator));
  const aInt = (integers[2] ?? 0n) / content;
  const bInt = (integers[1] ?? 0n) / content;
  const cInt = (integers[0] ?? 0n) / content;
  const discriminant = bInt * bInt - 4n * aInt * cInt;
  if (discriminant < 0n) return [];
  const denominator = 2n * aInt;
  const center = rational(-bInt, denominator);
  const steps: ExactStep[] =
    bInt === 0n
      ? [{ kind: 'square', right: rational(-cInt, aInt) }]
      : [{ kind: 'quadratic', a: aInt, b: bInt, c: cInt, discriminant }];
  if (discriminant === 0n) return [{ x: exact(center), steps }];
  const { factor, radicand } = simplifySqrt(discriminant, spendTrial);
  const offset = rational(factor, denominator);
  return [negate(offset), offset].map((term) => ({
    x:
      radicand === 1n
        ? exact(add(center, term))
        : exact(center, term, radicand),
    steps,
  }));
}

function solve(
  { coefficients, factors }: ReturnType<typeof polynomial>,
  spendTrial: () => void,
): Solution[] {
  if (coefficients.length <= 2) return lowDegree(coefficients, spendTrial);
  const split: Polynomial[] = [];
  for (const p of factors) {
    if (p.length <= 3) {
      split.push(p);
      continue;
    }
    const first = p.findIndex((c) => c.numerator !== 0n);
    if (first <= 0 || p.length - first > 3)
      throw new UnsupportedExactAnalysis();
    split.push([zero, one]);
    const rest = p.slice(first);
    if (rest.length > 1) split.push(rest);
  }
  const unique = [...new Map(split.map((p) => [polynomialKey(p), p])).values()];
  return unique.flatMap((p) =>
    lowDegree(p, spendTrial).map((solution) => ({
      ...solution,
      steps:
        unique.length > 1 || coefficients.length > p.length
          ? [
              { kind: 'factors', factors: unique, selected: p },
              ...solution.steps,
            ]
          : solution.steps,
    })),
  );
}

function classify(
  original: Polynomial,
  target: Polynomial,
  order: 1 | 2,
  x: ExactNumber,
): Extract<ExactStep, { kind: 'classify' }> | undefined {
  // The first nonzero Taylor coefficient determines the signs on both sides.
  let derivative = target;
  for (let multiplicity = 1; derivative.length > 1; multiplicity++) {
    derivative = differentiate(derivative);
    const value = evaluateExact(derivative, x);
    const right = compareExact(value, exactZero);
    if (!right) continue;
    if (multiplicity % 2 === 0) return;
    const classification =
      order === 1
        ? right > 0
          ? 'minimum'
          : 'maximum'
        : compareExact(evaluateExact(differentiate(original), x), exactZero) ===
            0
          ? 'stationaryInflection'
          : 'inflection';
    return {
      kind: 'classify',
      order: order + multiplicity,
      derivative: order,
      value,
      x,
      rightSign: right,
      classification,
    };
  }
}

export function analyzeExact(
  curve: Curve,
  kind: ExactAnalysisKind,
  bounds: Bounds,
  other?: Curve,
): ExactAnalysis {
  validateBounds(bounds);
  if (
    curve.kind !== 'explicit' ||
    (kind === 'intersections' && other?.kind !== 'explicit')
  )
    return { status: 'unsupported' };
  let trials = 20_000;
  const spendTrial = () => {
    if (--trials < 0) throw new UnsupportedExactAnalysis();
  };
  try {
    const f = polynomial(curve.expression, curve.params ?? {});
    const xMin = exact(decimal(String(bounds.xMin)));
    const xMax = exact(decimal(String(bounds.xMax)));
    const yMin = exact(decimal(String(bounds.yMin)));
    const yMax = exact(decimal(String(bounds.yMax)));
    const withinY = (y: ExactNumber) =>
      compareExact(yMin, y) <= 0 && compareExact(y, yMax) <= 0;
    const steps: ExactStep[] = [];
    const order = kind === 'extrema' ? 1 : kind === 'inflections' ? 2 : 0;
    let target = f;
    if (kind === 'intersections' && other?.kind === 'explicit') {
      const g = polynomial(other.expression, other.params ?? {});
      steps.push({ kind: 'compare', f: f.coefficients, g: g.coefficients });
      target = difference(f, g);
    } else if (order) {
      target = derivativeForm(f);
      if (order === 2) target = derivativeForm(target);
      steps.push({
        kind: 'derivative',
        order,
        expression: target.coefficients,
      });
    }
    if (target.coefficients.length === 1) {
      if (
        isZero(target.coefficients) &&
        (kind === 'intersections' || (kind === 'roots' && withinY(exactZero)))
      )
        return { status: 'infinite' };
      return { status: 'none' };
    }
    steps.push({ kind: 'equation', expression: target.coefficients });
    const solutions = solve(target, spendTrial).sort((a, b) =>
      compareExact(a.x, b.x),
    );
    const hits: ExactHit[] = [];
    for (const [index, solution] of solutions.entries()) {
      const x = solution.x;
      const previous = solutions[index - 1];
      if (previous && compareExact(previous.x, x) === 0) continue;
      if (compareExact(xMin, x) > 0 || compareExact(x, xMax) > 0) continue;
      const classification = order
        ? classify(f.coefficients, target.coefficients, order, x)
        : undefined;
      if (order && !classification) continue;
      const y = kind === 'roots' ? exactZero : evaluateExact(f.coefficients, x);
      if (!withinY(y)) continue;
      const hitSteps: ExactStep[] = [
        ...steps,
        ...solution.steps,
        { kind: 'solution', x },
      ];
      if (classification) hitSteps.push(classification);
      if (kind !== 'roots') hitSteps.push({ kind: 'substitute', x, y });
      hits.push({
        x,
        y,
        classification: classification?.classification,
        steps: hitSteps,
      });
    }
    return hits.length ? { status: 'hits', hits } : { status: 'none' };
  } catch (error) {
    if (error instanceof UnsupportedExactAnalysis)
      return { status: 'unsupported' };
    throw error;
  }
}
