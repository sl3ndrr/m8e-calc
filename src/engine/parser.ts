import type {
  Ast,
  ParseError,
  ParseErrorCode,
  Result,
  SourceRange,
} from './types.ts';
import { MAX_DEPTH, MAX_NODES, MAX_SOURCE_LENGTH } from './numeric.ts';

interface Token {
  readonly kind: 'number' | 'identifier' | 'operator' | '(' | ')' | ',' | 'eof';
  readonly text: string;
  readonly range: SourceRange;
}

class ParseFault extends Error {
  readonly error: ParseError;
  constructor(code: ParseErrorCode, range: SourceRange) {
    super();
    this.error = { code, range };
  }
}

class Lexer {
  private readonly src: string;
  private position = 0;
  constructor(src: string) {
    this.src = src;
  }

  next(): Token {
    while (
      /\s/u.test(this.src[this.position] ?? '') &&
      this.position < this.src.length
    )
      this.position++;
    const start = this.position;
    const character = this.src[start];
    if (character === undefined)
      return { kind: 'eof', text: '', range: { start, end: start } };
    const tail = this.src.slice(start);
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)/u.exec(tail)?.[0];
    if (number !== undefined) {
      let text = number;
      let end = start + text.length;
      if (/[eE]/u.test(this.src[end] ?? '')) {
        end++;
        if (/[+-]/u.test(this.src[end] ?? '')) end++;
        const exponent = /^\d+/u.exec(this.src.slice(end))?.[0];
        if (exponent === undefined)
          throw new ParseFault('E_INVALID_NUMBER', { start, end });
        end += exponent.length;
        text = this.src.slice(start, end);
      }
      this.position = end;
      return { kind: 'number', text, range: { start, end } };
    }
    const name = /^[a-zA-Z_][a-zA-Z_0-9]*/u.exec(tail)?.[0];
    if (name !== undefined || character === 'π') {
      const text = name ?? 'π';
      this.position += text.length;
      return { kind: 'identifier', text, range: { start, end: this.position } };
    }
    this.position++;
    const normalized =
      ({ '−': '-', '×': '*', '·': '*', '÷': '/' } as Record<string, string>)[
        character
      ] ?? character;
    if ('+-*/^!%'.includes(normalized))
      return {
        kind: 'operator',
        text: normalized,
        range: { start, end: this.position },
      };
    if (normalized === '(' || normalized === ')' || normalized === ',')
      return {
        kind: normalized,
        text: normalized,
        range: { start, end: this.position },
      };
    const end =
      start +
      (character.length === 1 && (this.src.codePointAt(start) ?? 0) > 0xffff
        ? 2
        : 1);
    throw new ParseFault('E_UNEXPECTED_TOKEN', { start, end });
  }
}

class Parser {
  private readonly lexer: Lexer;
  private current: Token;
  private previous: Token;
  private recursion = 0;
  private nodeCount = 0;
  private readonly heights = new WeakMap<Ast, number>();

  constructor(src: string) {
    this.lexer = new Lexer(src);
    this.current = this.lexer.next();
    this.previous = this.current;
  }

  private consume(): Token {
    const token = this.current;
    this.previous = token;
    this.current = this.lexer.next();
    return token;
  }

  private at(kind: Token['kind']): boolean {
    return this.current.kind === kind;
  }

  private node<T extends Ast>(ast: T, children: readonly Ast[] = []): T {
    const height =
      1 +
      children.reduce(
        (max, child) => Math.max(max, this.heights.get(child) ?? 0),
        0,
      );
    this.nodeCount++;
    if (height > MAX_DEPTH || this.nodeCount > MAX_NODES)
      throw new ParseFault('E_RESOURCE_LIMIT', ast.range);
    this.heights.set(ast, height);
    return ast;
  }

  parse(): Ast {
    if (this.at('eof')) throw new ParseFault('E_SYNTAX', this.current.range);
    const ast = this.sum();
    if (!this.at('eof'))
      throw new ParseFault(
        this.current.kind === ')' ? 'E_UNEXPECTED_PAREN' : 'E_UNEXPECTED_TOKEN',
        this.current.range,
      );
    return ast;
  }

  private sum(): Ast {
    let left = this.product();
    while (this.current.text === '+' || this.current.text === '-') {
      const operator = this.consume();
      const right = this.product();
      left = this.node(
        {
          kind: 'binary',
          operator: operator.text === '+' ? '+' : '-',
          left,
          right,
          implicit: false,
          operatorRange: operator.range,
          range: { start: left.range.start, end: right.range.end },
        },
        [left, right],
      );
    }
    return left;
  }

  private product(): Ast {
    let left = this.unary();
    while (true) {
      const explicit = this.current.text === '*' || this.current.text === '/';
      const implicit =
        this.current.kind === 'identifier' ||
        this.current.kind === '(' ||
        (this.current.kind === 'number' &&
          (this.previous.kind === ')' ||
            this.previous.text === '!' ||
            this.previous.text === '%'));
      if (!explicit && !implicit) break;
      const operator = explicit
        ? this.consume()
        : {
            text: '*',
            range: {
              start: this.current.range.start,
              end: this.current.range.start,
            },
          };
      const right = explicit ? this.unary() : this.power();
      left = this.node(
        {
          kind: 'binary',
          operator: operator.text === '/' ? '/' : '*',
          left,
          right,
          implicit: !explicit,
          operatorRange: operator.range,
          range: { start: left.range.start, end: right.range.end },
        },
        [left, right],
      );
    }
    return left;
  }

  private unary(): Ast {
    this.recursion++;
    if (this.recursion > MAX_DEPTH)
      throw new ParseFault('E_RESOURCE_LIMIT', this.current.range);
    try {
      if (this.current.text === '+' || this.current.text === '-') {
        const operator = this.consume();
        const operand = this.unary();
        return this.node(
          {
            kind: 'unary',
            operator: operator.text === '+' ? '+' : '-',
            operand,
            operatorRange: operator.range,
            range: { start: operator.range.start, end: operand.range.end },
          },
          [operand],
        );
      }
      return this.power();
    } finally {
      this.recursion--;
    }
  }

  private power(): Ast {
    const left = this.postfix();
    if (this.current.text !== '^') return left;
    const operator = this.consume();
    const right = this.unary();
    return this.node(
      {
        kind: 'binary',
        operator: '^',
        left,
        right,
        implicit: false,
        operatorRange: operator.range,
        range: { start: left.range.start, end: right.range.end },
      },
      [left, right],
    );
  }

  private postfix(): Ast {
    let operand = this.primary();
    while (this.current.text === '!' || this.current.text === '%') {
      const operator = this.consume();
      operand = this.node(
        {
          kind: 'postfix',
          operator: operator.text === '!' ? '!' : '%',
          operand,
          operatorRange: operator.range,
          range: { start: operand.range.start, end: operator.range.end },
        },
        [operand],
      );
    }
    return operand;
  }

  private closing(): Token {
    if (this.current.kind !== ')')
      throw new ParseFault('E_MISSING_PAREN', this.current.range);
    return this.consume();
  }

  private primary(): Ast {
    const token = this.current;
    if (token.kind === 'number') {
      this.consume();
      return this.node({
        kind: 'number',
        literal: token.text,
        range: token.range,
      });
    }
    if (token.kind === 'identifier') {
      this.consume();
      if (token.text !== 'π' && this.at('(')) {
        this.consume();
        const args: Ast[] = [];
        if (!this.at(')')) {
          args.push(this.sum());
          while (this.at(',')) {
            this.consume();
            args.push(this.sum());
          }
        }
        const end = this.closing().range.end;
        return this.node(
          {
            kind: 'call',
            name: token.text,
            nameRange: token.range,
            args,
            range: { start: token.range.start, end },
          },
          args,
        );
      }
      return this.node({
        kind: 'identifier',
        name: token.text,
        range: token.range,
      });
    }
    if (token.kind === '(') {
      this.consume();
      const expression = this.sum();
      const end = this.closing().range.end;
      return this.node(
        { kind: 'group', expression, range: { start: token.range.start, end } },
        [expression],
      );
    }
    throw new ParseFault('E_UNEXPECTED_TOKEN', token.range);
  }
}

export function parse(src: string): Result<Ast, ParseError> {
  try {
    if (src.length > MAX_SOURCE_LENGTH)
      return {
        ok: false,
        error: {
          code: 'E_RESOURCE_LIMIT',
          range: { start: 0, end: src.length },
        },
      };
    return { ok: true, value: new Parser(src).parse() };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof ParseFault
          ? error.error
          : { code: 'E_INTERNAL', range: { start: 0, end: src.length } },
    };
  }
}
