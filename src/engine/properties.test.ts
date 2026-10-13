import { expect, it } from 'vitest';
import fc from 'fast-check';
import { evaluateString, parse, print } from './index.ts';
import type { Ast } from './index.ts';

const leaf = fc.oneof(
  fc.integer({ min: 0, max: 999 }).map(String),
  fc.constantFrom('.5', '1e-3', '2E5', 'x', 'π', 'e', 'ans'),
);
let expression = leaf;
for (let depth = 0; depth < 4; depth++) {
  const inner = expression;
  expression = fc.oneof(leaf,
    fc.tuple(inner, fc.constantFrom('+', '−', '*', '/', '^', '×', '÷', '·'), inner)
      .map(([left, operator, right]) => `(${left}${operator}${right})`),
    fc.tuple(fc.constantFrom('+', '-'), inner).map(([operator, arg]) => `${operator}(${arg})`),
    fc.tuple(inner, fc.constantFrom('!', '%')).map(([arg, operator]) => `(${arg})${operator}`),
    fc.tuple(inner, inner).map(([a, b]) => `(${a})(${b})`),
    fc.tuple(fc.constantFrom('sin', 'sqrt', 'abs', 'custom'), inner).map(([fn, arg]) => `${fn}(${arg})`),
    fc.tuple(inner, inner).map(([a, b]) => `max(${a},${b})`),
  );
}

function shape(ast: Ast): unknown {
  switch (ast.kind) {
    case 'number': return [ast.kind, ast.literal];
    case 'identifier': return [ast.kind, ast.name];
    case 'unary': case 'postfix': return [ast.kind, ast.operator, shape(ast.operand)];
    case 'binary': return [ast.kind, ast.operator, ast.implicit, shape(ast.left), shape(ast.right)];
    case 'group': return [ast.kind, shape(ast.expression)];
    case 'call': return [ast.kind, ast.name, ast.args.map(shape)];
  }
}

it('parse-print-parse preserves the public AST (2000 seeded expressions)', () => {
  fc.assert(fc.property(expression, (src) => {
    const first = parse(src);
    expect(first.ok, src).toBe(true);
    if (!first.ok) return;
    const second = parse(print(first.value));
    expect(second.ok, print(first.value)).toBe(true);
    if (!second.ok) return;
    expect(shape(second.value)).toEqual(shape(first.value));
    expect(print(second.value)).toBe(print(first.value));
  }), { numRuns: 2000, seed: 5012026 });
});

const arbitraryString = fc.oneof(fc.string({ maxLength: 512 }),
  fc.array(fc.integer({ min: 0, max: 65535 }), { maxLength: 512 })
    .map((codes) => String.fromCharCode(...codes)),
  fc.array(fc.constantFrom('1', '.', 'e', 'E', '+', '-', '^', '(', ')', '%', '!', ',', 'π', '\u0000'), { maxLength: 512 })
    .map((chars) => chars.join('')),
);

it('all arbitrary strings produce Results and valid original ranges (5000 cases)', () => {
  fc.assert(fc.property(arbitraryString, (src) => {
    for (const result of [parse(src), evaluateString(src)]) {
      expect(typeof result.ok).toBe('boolean');
      if (!result.ok) {
        expect(result.error).not.toHaveProperty('message');
        expect(result.error.range.start).toBeGreaterThanOrEqual(0);
        expect(result.error.range.end).toBeGreaterThanOrEqual(result.error.range.start);
        expect(result.error.range.end).toBeLessThanOrEqual(src.length);
      }
    }
  }), { numRuns: 5000, seed: 5052026 });
});
