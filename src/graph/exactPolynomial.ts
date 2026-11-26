import type { Ast } from '../engine/types.ts';
import { detectParams } from './compile.ts';
import {
  UnsupportedExactAnalysis,
  add,
  decimal,
  divide,
  multiply,
  negate,
  one,
  rational,
  zero,
  type Rational,
} from './exactNumbers.ts';

export type Polynomial = readonly Rational[];

interface PolynomialForm {
  readonly coefficients: Polynomial;
  readonly factors: readonly Polynomial[];
}

const maxDegree = 24;
export const coefficient = (p: Polynomial, i: number): Rational => p[i] ?? zero;

export function trim(p: Rational[]): Polynomial {
  while (p.length > 1 && p.at(-1)?.numerator === 0n) p.pop();
  return p;
}

export function asPolynomial(coefficients: Polynomial): PolynomialForm {
  return {
    coefficients,
    factors: coefficients.length > 1 ? [coefficients] : [],
  };
}

export function sum(
  a: Polynomial,
  b: Polynomial,
  subtract = false,
): Polynomial {
  return trim(
    Array.from({ length: Math.max(a.length, b.length) }, (_, i) =>
      add(
        coefficient(a, i),
        subtract ? negate(coefficient(b, i)) : coefficient(b, i),
      ),
    ),
  );
}

export function isZero(p: Polynomial): boolean {
  return p.length === 1 && coefficient(p, 0).numerator === 0n;
}

export function difference(
  a: PolynomialForm,
  b: PolynomialForm,
): PolynomialForm {
  if (isZero(b.coefficients)) return a;
  if (isZero(a.coefficients)) return scale(b, negate(one));
  return asPolynomial(sum(a.coefficients, b.coefficients, true));
}

function product(a: Polynomial, b: Polynomial): Polynomial {
  const length = a.length + b.length - 1;
  if (length > maxDegree + 1) throw new UnsupportedExactAnalysis();
  const result = new Array<Rational>(length).fill(zero);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      result[i + j] = add(
        coefficient(result, i + j),
        multiply(coefficient(a, i), coefficient(b, j)),
      );
    }
  }
  return trim(result);
}

function times(a: PolynomialForm, b: PolynomialForm): PolynomialForm {
  const coefficients = product(a.coefficients, b.coefficients);
  return {
    coefficients,
    factors: coefficients.length > 1 ? [...a.factors, ...b.factors] : [],
  };
}

function scale(form: PolynomialForm, factor: Rational): PolynomialForm {
  return {
    coefficients: trim(form.coefficients.map((c) => multiply(c, factor))),
    factors: form.factors,
  };
}

export function polynomial(
  ast: Ast,
  params: Readonly<Record<string, number>>,
): PolynomialForm {
  const names = new Set(detectParams(ast));
  let visits = 0;
  function convert(node: Ast, depth: number): PolynomialForm {
    if (++visits > 2048 || depth > 128) throw new UnsupportedExactAnalysis();
    const child = (operand: Ast) => convert(operand, depth + 1);
    switch (node.kind) {
      case 'number': {
        const { numerator, denominator } = decimal(node.literal);
        return asPolynomial([rational(numerator, denominator)]);
      }
      case 'identifier': {
        if (node.name === 'x') return asPolynomial([zero, one]);
        if (!names.has(node.name)) throw new UnsupportedExactAnalysis();
        const value = Object.hasOwn(params, node.name) ? params[node.name] : 1;
        const { numerator, denominator } = decimal(String(value));
        return asPolynomial([rational(numerator, denominator)]);
      }
      case 'group':
        return child(node.expression);
      case 'unary':
        if (node.operator === '+') return child(node.operand);
        if (node.operator === '-')
          return scale(child(node.operand), negate(one));
        break;
      case 'postfix':
        if (node.operator === '%')
          return scale(child(node.operand), rational(1n, 100n));
        break;
      case 'binary': {
        // Validate both original operands, even if an operation could cancel one.
        const left = child(node.left);
        const right = child(node.right);
        if (node.operator === '-') return difference(left, right);
        if (node.operator === '+') {
          if (isZero(left.coefficients)) return right;
          if (isZero(right.coefficients)) return left;
          return asPolynomial(sum(left.coefficients, right.coefficients));
        }
        if (node.operator === '*') return times(left, right);
        const constant = coefficient(right.coefficients, 0);
        if (right.coefficients.length !== 1) break;
        if (node.operator === '/') return scale(left, divide(one, constant));
        if (node.operator === '^' && constant.denominator === 1n) {
          const exponent = constant.numerator;
          if (exponent < 0n || exponent > BigInt(maxDegree)) break;
          if (
            exponent === 0n &&
            (left.coefficients.length !== 1 ||
              !coefficient(left.coefficients, 0).numerator)
          )
            break;
          let power = asPolynomial([one]);
          for (let i = 0n; i < exponent; i++) power = times(power, left);
          return power;
        }
        break;
      }
    }
    throw new UnsupportedExactAnalysis();
  }
  return convert(ast, 0);
}

export function differentiate(p: Polynomial): Polynomial {
  return p.length <= 1
    ? [zero]
    : p.slice(1).map((c, i) => multiply(c, rational(BigInt(i + 1))));
}

export function polynomialKey(p: Polynomial): string {
  return p.map((c) => `${c.numerator}/${c.denominator}`).join(',');
}

export function derivativeForm(form: PolynomialForm): PolynomialForm {
  const coefficients = differentiate(form.coefficients);
  if (coefficients.length <= 1) return asPolynomial(coefficients);

  // Each occurrence after the first contributes a factor to the derivative.
  const seen = new Set<string>();
  const repeated = form.factors.filter((p) => {
    const key = polynomialKey(p);
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
  if (!repeated.length) return asPolynomial(coefficients);
  const divisor = repeated.reduce(product, [one]);
  let remainder = coefficients;
  const quotient = new Array<Rational>(
    coefficients.length - divisor.length + 1,
  ).fill(zero);
  for (let i = quotient.length - 1; i >= 0; i--) {
    const q = divide(
      coefficient(remainder, i + divisor.length - 1),
      coefficient(divisor, divisor.length - 1),
    );
    quotient[i] = q;
    remainder = sum(
      remainder,
      [
        ...new Array<Rational>(i).fill(zero),
        ...divisor.map((c) => multiply(c, q)),
      ],
      true,
    );
  }
  return {
    coefficients,
    factors: [...repeated, ...asPolynomial(quotient).factors],
  };
}
