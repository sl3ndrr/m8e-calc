import type Decimal from 'decimal.js';
import type { WordOptions } from './programmer/index.ts';

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
  | 'E_CONVERGENCE'
  | 'E_CYCLE'
  | 'E_RESERVED_NAME'
  | 'E_ENVIRONMENT'
  | 'E_INTERNAL';
export interface ParseError {
  readonly code: ParseErrorCode;
  readonly range: SourceRange;
}
export interface EvalError {
  readonly code: EvalErrorCode;
  readonly range: SourceRange;
  readonly details?: {
    readonly errorEstimate: string;
    readonly evaluations: number;
    readonly intervals: number;
  };
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
  readonly operator: '+' | '-' | '~';
  readonly operand: Ast;
  readonly operatorRange: SourceRange;
}
export interface BinaryAst extends AstBase {
  readonly kind: 'binary';
  readonly operator: '+' | '-' | '*' | '/' | '^' | '&' | '|' | '<<' | '>>';
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
export interface AssignmentAst extends AstBase {
  readonly kind: 'assignment';
  readonly name: string;
  readonly nameRange: SourceRange;
  readonly expression: Ast;
}
export interface DefinitionAst extends AstBase {
  readonly kind: 'definition';
  readonly name: string;
  readonly nameRange: SourceRange;
  readonly parameters: readonly string[];
  readonly expression: Ast;
}
export type Ast =
  | AssignmentAst
  | DefinitionAst
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
export interface ComplexValue {
  readonly kind: 'complex';
  readonly re: Decimal;
  readonly im: Decimal;
}
export interface ListValue {
  readonly kind: 'list';
  readonly values: readonly Value[];
}
export interface ValueKinds {
  readonly complex: ComplexValue;
  readonly list: ListValue;
  readonly number: NumberValue;
}
export type Value = ValueKinds[keyof ValueKinds];
export type AngleMode = 'deg' | 'rad' | 'grad';
export type PercentMode = 'strict' | 'calculator';
export type Arity = number | { readonly min: number; readonly max?: number };
export interface FunctionContext {
  readonly angleMode: AngleMode;
  readonly range: SourceRange;
  readonly complex?: ComplexMode;
  readonly numerical?: NumericalOptions;
  readonly evaluate?: (
    ast: Ast,
    bindings?: Readonly<Record<string, Value>>,
  ) => Result<Value, EvalError>;
  readonly isReserved?: (name: string) => boolean;
}
export interface FunctionDefinition {
  readonly name: string;
  readonly arity: Arity;
  /** Optional real Float64 implementation for graph compilation. */
  readonly floatImpl?: (
    args: readonly number[],
    context: { readonly angleMode: AngleMode },
  ) => number;
  readonly impl: (
    args: readonly Value[],
    context: FunctionContext,
  ) => Result<Value, EvalError>;
  readonly astImpl?: (
    args: readonly Ast[],
    context: FunctionContext,
  ) => Result<Value, EvalError>;
  readonly doc: { readonly de: string; readonly en: string };
  readonly category: string;
}
export type FunctionRegistry = Readonly<Record<string, FunctionDefinition>>;
export type ComplexMode = 'off' | 'on';
export interface NumericalOptions {
  readonly absoluteTolerance?: string;
  readonly relativeTolerance?: string;
  readonly maxIntervals?: number;
  readonly maxEvaluations?: number;
}
export type SerializedValue =
  | { readonly kind: 'number'; readonly value: string }
  | { readonly kind: 'complex'; readonly re: string; readonly im: string }
  | { readonly kind: 'list'; readonly values: readonly SerializedValue[] };
export interface UserFunction {
  readonly parameters: readonly string[];
  readonly expression: Ast;
}
export interface Environment {
  readonly version: 1;
  readonly variables: Readonly<Record<string, SerializedValue>>;
  readonly functions: Readonly<Record<string, UserFunction>>;
  readonly history: readonly SerializedValue[];
}
export interface Execution {
  readonly value: Value | null;
  readonly environment: Environment;
}
export interface ParseOptions {
  readonly bitwise?: boolean;
}
export interface EvaluationContext extends ParseOptions {
  readonly programmer?: WordOptions;
  readonly complex?: ComplexMode;
  readonly numerical?: NumericalOptions;
  readonly environment?: Environment;
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
export interface ValueFormatOptions extends FormatOptions {
  readonly complexForm?: 'rectangular' | 'polar';
  readonly angleMode?: AngleMode;
}
export interface Fraction {
  readonly numerator: string;
  readonly denominator: string;
}
export interface LocalizedNumberOptions {
  readonly locale?: string;
  readonly grouping?: boolean;
}
