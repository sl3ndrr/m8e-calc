import type { Ast } from '../engine/types.ts';
import { MAX_DEPTH, MAX_NODES } from '../engine/numeric.ts';
import { graphConstants } from './compile.ts';
import type { Bounds } from './types.ts';

type Affine = { slope: number; intercept: number };

function affine(slope: number, intercept: number): Affine | undefined {
  if (Number.isFinite(slope) && Number.isFinite(intercept))
    return { slope, intercept };
}

/** Collect candidates from the original tree, including divisions inside
 * subexpressions that are themselves outside the affine class. */
export function affineDenominatorCandidates(
  ast: Ast,
  params: Readonly<Record<string, number>>,
  { xMin, xMax }: Bounds,
): number[] {
  const candidates = new Set<number>();
  let visits = 0;
  function visit(node: Ast, depth: number): Affine | undefined {
    if (++visits > MAX_NODES || depth > MAX_DEPTH) return;
    const next = depth + 1;
    switch (node.kind) {
      case 'number':
        return affine(0, Number(node.literal));
      case 'identifier': {
        if (node.name === 'x') return { slope: 1, intercept: 0 };
        if (Object.hasOwn(graphConstants, node.name))
          return affine(0, graphConstants[node.name] ?? NaN);
        if (Object.hasOwn(params, node.name))
          return affine(0, params[node.name] ?? NaN);
        return;
      }
      case 'group':
        return visit(node.expression, next);
      case 'unary': {
        const operand = visit(node.operand, next);
        if (!operand || node.operator === '~') return;
        return node.operator === '-'
          ? { slope: -operand.slope, intercept: -operand.intercept }
          : operand;
      }
      case 'postfix':
        visit(node.operand, next);
        return;
      case 'call':
        for (const arg of node.args) visit(arg, next);
        return;
      case 'binary': {
        const left = visit(node.left, next);
        const right = visit(node.right, next);
        if (node.operator === '/' && right && right.slope !== 0) {
          const root = -right.intercept / right.slope;
          if (xMin < root && root < xMax) candidates.add(root);
        }
        if (!left || !right) return;
        switch (node.operator) {
          case '+':
            return affine(
              left.slope + right.slope,
              left.intercept + right.intercept,
            );
          case '-':
            return affine(
              left.slope - right.slope,
              left.intercept - right.intercept,
            );
          case '*':
            if (left.slope === 0)
              return affine(
                left.intercept * right.slope,
                left.intercept * right.intercept,
              );
            if (right.slope === 0)
              return affine(
                left.slope * right.intercept,
                left.intercept * right.intercept,
              );
            return;
          case '/':
            if (right.slope === 0 && right.intercept !== 0)
              return affine(
                left.slope / right.intercept,
                left.intercept / right.intercept,
              );
            return;
        }
        return;
      }
    }
  }
  visit(ast, 0);
  return [...candidates].sort((a, b) => a - b);
}
