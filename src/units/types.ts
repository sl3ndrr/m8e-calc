import type Decimal from 'decimal.js';
import type { FormatOptions } from '../engine/types.ts';

export type UnitLocale = 'de' | 'en';
export type UnitSystem = 'si' | 'imperial' | 'us' | 'other';
export interface DynamicRateProvider {
  /** Future AP17 adapter: supply an already acquired rate; no IO in this domain. */
  readonly id: string;
  readonly rateToBase: (unitId: string) => Decimal;
}
export type Conversion =
  | {
      readonly kind: 'linear';
      readonly factor: string;
      readonly divisor?: string;
    }
  | {
      readonly kind: 'affine';
      readonly factor: string;
      readonly divisor?: string;
      readonly offset: string;
    }
  | {
      readonly kind: 'function';
      readonly toBase: (value: Decimal) => Decimal;
      readonly fromBase: (value: Decimal) => Decimal;
    }
  | { readonly kind: 'dynamicRate'; readonly providerId: string };
export interface Unit {
  readonly id: string;
  readonly symbol: string;
  readonly names: Readonly<Record<UnitLocale, string>>;
  readonly aliases: readonly string[];
  readonly system: UnitSystem;
  readonly conversion: Conversion;
  readonly source: string;
  readonly exact: boolean;
  readonly note?: string;
}
export interface Category {
  readonly id: string;
  readonly names: Readonly<Record<UnitLocale, string>>;
  readonly baseUnitId: string;
  readonly units: readonly Unit[];
  readonly minimumBase?: string;
  readonly positiveOnly?: boolean;
  readonly smallCategoryReason?: string;
}
export interface ParsedQuery {
  readonly value: Decimal;
  readonly fromId: string;
  readonly toId?: string;
}
export type QuantityFormatOptions = FormatOptions;
export interface CompoundOptions {
  readonly digits?: number;
  readonly locale?: string;
  readonly separator?: string;
  readonly style?: 'units' | 'clock';
}
export type UnitErrorCode =
  | 'E_UNIT_UNKNOWN'
  | 'E_UNIT_AMBIGUOUS'
  | 'E_UNIT_CATEGORY'
  | 'E_UNIT_DOMAIN'
  | 'E_UNIT_QUERY'
  | 'E_UNIT_COMPOUND'
  | 'E_UNIT_DYNAMIC_RATE';
export class UnitError extends Error {
  constructor(
    readonly code: UnitErrorCode,
    detail: string,
  ) {
    super(detail);
    this.name = 'UnitError';
  }
}
