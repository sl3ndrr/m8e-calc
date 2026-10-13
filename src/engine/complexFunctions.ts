import type { EvalError, FunctionContext, Result, Value } from './types.ts';
import {
  checkedNumber,
  D,
  failure,
  NumericFault,
  requireDomain,
} from './numeric.ts';
import { checkedComplex, components, normalizeValue } from './values.ts';
import { fromRadians, sineCosine } from './trigonometry.ts';

/** undefined delegates to the existing AP5 real implementation. */
export function complexFunction(
  name: string,
  args: readonly Value[],
  ctx: FunctionContext,
): Result<Value, EvalError> | undefined {
  const v = args[0];
  if (v === undefined) return undefined;
  const extensions = ['arg', 'conj', 're', 'im'];
  const promotion =
    ctx.complex === 'on' &&
    v.kind === 'number' &&
    v.value.isNegative() &&
    (name === 'sqrt' || name === 'ln');
  if (!extensions.includes(name) && v.kind !== 'complex' && !promotion)
    return undefined;
  if (!['sqrt', 'ln', 'exp', 'sin', 'cos', 'abs', ...extensions].includes(name))
    return undefined;
  try {
    requireDomain(v.kind !== 'complex' || ctx.complex === 'on', 'E_DOMAIN');
    const normalized = normalizeValue(v, ctx.range, ctx.complex ?? 'off');
    if (!normalized.ok) return normalized;
    const [a, b] = components(normalized.value),
      range = ctx.range;
    if (name === 're') return checkedNumber(a, range);
    if (name === 'im') return checkedNumber(b, range);
    if (name === 'conj')
      return v.kind === 'number'
        ? checkedNumber(a, range)
        : checkedComplex(a, b.neg(), range);
    const magnitude = a.mul(a).add(b.mul(b)).sqrt();
    if (name === 'abs') return checkedNumber(magnitude, range);
    if (name === 'arg') {
      requireDomain(!magnitude.isZero());
      return checkedNumber(fromRadians(D.atan2(b, a), ctx.angleMode), range);
    }
    if (name === 'sqrt') {
      if (magnitude.isZero()) return checkedComplex(0, 0, range);
      // Stable formula: compute the larger component, derive the smaller by division.
      if (a.gte(0)) {
        const re = magnitude.add(a).div(2).sqrt();
        return checkedComplex(re, b.div(re.mul(2)), range);
      }
      const im = magnitude
        .sub(a)
        .div(2)
        .sqrt()
        .mul(b.isNegative() ? -1 : 1);
      return checkedComplex(b.div(im.mul(2)), im, range);
    }
    if (name === 'ln') {
      requireDomain(!magnitude.isZero());
      return checkedComplex(magnitude.ln(), D.atan2(b, a), range);
    }
    if (name === 'exp') {
      const scale = a.exp();
      requireDomain(!scale.isZero(), 'E_OVERFLOW');
      const [sin, cos] = sineCosine(b, 'rad');
      return checkedComplex(scale.mul(cos), scale.mul(sin), range);
    }
    const factor =
      ctx.angleMode === 'rad'
        ? new D(1)
        : D.acos(-1).div(ctx.angleMode === 'deg' ? 180 : 200);
    const [sin, cos] = sineCosine(a, ctx.angleMode),
      imag = b.mul(factor);
    return name === 'sin'
      ? checkedComplex(sin.mul(imag.cosh()), cos.mul(imag.sinh()), range)
      : checkedComplex(cos.mul(imag.cosh()), sin.mul(imag.sinh()).neg(), range);
  } catch (e) {
    return failure(
      e instanceof NumericFault ? e.code : 'E_INTERNAL',
      ctx.range,
    );
  }
}
