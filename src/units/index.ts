export { categories } from './catalog.ts';
export {
  createUnitsEngine,
  convert,
  convertAll,
  searchUnits,
  parseQuery,
  formatQuantity,
  formatCompound,
  normalizeUnitText,
} from './engine.ts';
export { UnitError } from './types.ts';
export type {
  Category,
  Unit,
  UnitLocale,
  UnitSystem,
  Conversion,
  DynamicRateProvider,
  ParsedQuery,
  QuantityFormatOptions,
  CompoundOptions,
  UnitErrorCode,
} from './types.ts';
