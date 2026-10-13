import type Decimal from 'decimal.js';

export interface SourceRange {
  readonly start: number;
  readonly end: number;
}

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export type ParseErrorCode =
  | 'E_SYNTAX'
  | 'E_INVALID_NUMBER'
  | 'E_UNEXPECTED_TOKEN'
  | 'E_MISSING_PAREN'
  | 'E_UNEXPECTED_PAREN'
  | 'E_RESOURCE_LIMIT'
  | 'E_INTERNAL';
export type EvalErrorCode =
  | 'E_DIVISION_BY_ZERO'
  | 'E_DOMAIN'
  | 'E_OVERFLOW'
  | 'E_UNKNOWN_VARIABLE'
  | 'E_UNKNOWN_FUNCTION'
  | 'E_ARGUMENT_COUNT'
  | 'E_TYPE'
  | 'E_RESOURCE_LIMIT'
  | 'E_INTERNAL';
export interface ParseError {
  readonly code: ParseErrorCode;
  readonly range: SourceRange;
}
export interface EvalError {
  readonly code: EvalErrorCode;
  readonly range: SourceRange;
}
export type EngineError = ParseError | EvalError;
export interface FormatError {
  readonly code:
    'E_INVALID_LOCALIZED_NUMBER' | 'E_OVERFLOW' | 'E_RESOURCE_LIMIT';
  readonly range: SourceRange;
}

interface AstBase {
  readonly range: SourceRange;
}
export interface NumberAst extends AstBase {
  readonly kind: 'number';
  readonly literal: string;
}
export interface IdentifierAst extends AstBase {
  readonly kind: 'identifier';
  readonly name: string;
}
export interface UnaryAst extends AstBase {
  readonly kind: 'unary';
  readonly operator: '+' | '-';
  readonly operand: Ast;
  readonly operatorRange: SourceRange;
}
export interface BinaryAst extends AstBase {
  readonly kind: 'binary';
  readonly operator: '+' | '-' | '*' | '/' | '^';
  readonly left: Ast;
  readonly right: Ast;
  readonly implicit: boolean;
  readonly operatorRange: SourceRange;
}
export interface PostfixAst extends AstBase {
  readonly kind: 'postfix';
  readonly operator: '!' | '%';
  readonly operand: Ast;
  readonly operatorRange: SourceRange;
}
export interface GroupAst extends AstBase {
  readonly kind: 'group';
  readonly expression: Ast;
}
export interface CallAst extends AstBase {
  readonly kind: 'call';
  readonly name: string;
  readonly nameRange: SourceRange;
  readonly args: readonly Ast[];
}
export type Ast =
  | NumberAst
  | IdentifierAst
  | UnaryAst
  | BinaryAst
  | PostfixAst
  | GroupAst
  | CallAst;

export interface NumberValue {
  readonly kind: 'number';
  readonly value: Decimal;
}
// Declaration merging makes additional value variants possible without changing callers.
export interface ValueKinds {
  readonly number: NumberValue;
}
export type Value = ValueKinds[keyof ValueKinds];
export type AngleMode = 'deg' | 'rad' | 'grad';
export type PercentMode = 'strict' | 'calculator';
export type Arity = number | { readonly min: number; readonly max?: number };
export interface FunctionContext {
  readonly angleMode: AngleMode;
  readonly range: SourceRange;
}
export interface FunctionDefinition {
  readonly name: string;
  readonly arity: Arity;
  readonly impl: (
    args: readonly Value[],
    context: FunctionContext,
  ) => Result<Value, EvalError>;
  readonly doc: { readonly de: string; readonly en: string };
  readonly category: string;
}
export type FunctionRegistry = Readonly<Record<string, FunctionDefinition>>;
export interface EvaluationContext {
  readonly angleMode?: AngleMode;
  readonly percentMode?: PercentMode;
  readonly variables?: Readonly<Record<string, Value>>;
  readonly ans?: Value;
  readonly functions?: FunctionRegistry;
}
export interface FormatOptions {
  readonly notation?: 'auto' | 'fixed' | 'sci' | 'eng';
  readonly digits?: number;
  readonly locale?: string;
  readonly grouping?: boolean;
}
export interface LocalizedNumberOptions {
  readonly locale?: string;
  readonly grouping?: boolean;
}
