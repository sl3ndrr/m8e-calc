import type { Ast } from './types.ts';

function precedence(ast: Ast): number {
  switch (ast.kind) {
    case 'binary': return ast.operator === '^' ? 3 : ast.operator === '*' || ast.operator === '/' ? 1 : 0;
    case 'unary': return 2;
    case 'postfix': return 4;
    default: return 5;
  }
}

function wrap(ast: Ast, needed: boolean): string {
  const text = print(ast);
  return needed ? `(${text})` : text;
}

/** Canonical source for a valid, bounded, acyclic public AST. */
export function print(ast: Ast): string {
  switch (ast.kind) {
    case 'number': return ast.literal;
    case 'identifier': return ast.name;
    case 'group': return `(${print(ast.expression)})`;
    case 'call': return `${ast.name}(${ast.args.map(print).join(', ')})`;
    case 'unary': return ast.operator + wrap(ast.operand, precedence(ast.operand) < 2);
    case 'postfix': return wrap(ast.operand, precedence(ast.operand) < 4) + ast.operator;
    case 'binary': {
      const priority = precedence(ast);
      const left = wrap(ast.left, precedence(ast.left) < priority || (ast.operator === '^' && precedence(ast.left) === priority));
      const rightNeedsGroup = ast.operator === '^'
        ? precedence(ast.right) < 2 : precedence(ast.right) <= priority;
      const right = wrap(ast.right, rightNeedsGroup);
      return ast.implicit ? `${left} ${right}` : `${left} ${ast.operator} ${right}`;
    }
  }
}
