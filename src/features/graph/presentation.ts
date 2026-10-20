import type { ParsedRow } from './model';
import { cachePaths, type CachedPath } from './renderer';
import type { SampleResponse } from './workerProtocol';

/** Parameter values are geometry, not the identity of a visible function. */
export function curveIdentity(row: ParsedRow): string | null {
  if (!row.curve || !row.row.visible) return null;
  return JSON.stringify([row.row.input, { ...row.curve, params: undefined }]);
}

/** Reveal lifetime and last accepted geometry are deliberately independent. */
export class CurvePresentation {
  paths = new Map<string, CachedPath>();
  private lifetimes = new Map<
    string,
    { identity: string; born: number | null }
  >();
  private key = '';

  configure(rows: readonly ParsedRow[]): boolean {
    const next = new Map<string, { identity: string; born: number | null }>();
    for (const row of rows) {
      const identity = curveIdentity(row);
      if (identity === null) continue;
      const old = this.lifetimes.get(row.row.id);
      next.set(
        row.row.id,
        old?.identity === identity ? old : { identity, born: null },
      );
    }
    const key = JSON.stringify(
      [...next].map(([id, life]) => [id, life.identity]),
    );
    const changed = key !== this.key;
    this.paths = new Map(
      [...this.paths].filter(([id]) => next.get(id) === this.lifetimes.get(id)),
    );
    this.lifetimes = next;
    this.key = key;
    return changed;
  }

  replace(result: SampleResponse, now: number): void {
    const births = new Map<string, number>();
    for (const curve of result.curves) {
      const life = this.lifetimes.get(curve.id);
      if (!life) continue;
      if (
        life.born === null &&
        !curve.error &&
        curve.segments.some((segment) => segment.length > 1)
      )
        life.born = now;
      if (life.born !== null) births.set(curve.id, life.born);
    }
    // Build the complete replacement before publishing any of its paths.
    this.paths = cachePaths(result, new Map(), now, births);
  }

  finishReveals(): void {
    for (const life of this.lifetimes.values())
      if (life.born !== null) life.born = -Number.MAX_VALUE;
    for (const path of this.paths.values()) path.born = -Number.MAX_VALUE;
  }
}
