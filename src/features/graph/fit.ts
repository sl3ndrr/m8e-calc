import { Viewport } from '../../graph';
import { isOneDimensional, type ParsedRow } from './model';
import { tryViewport } from './viewportTransition';

/** A zero set has no general global extent. Retain the user's stable AP21
 * search rectangle, unioned with the existing 1D fit, without 2D work on UI. */
export function fitPlot(view: Viewport, rows: readonly ParsedRow[]): Viewport {
  const visible = rows.filter((r) => r.row.visible && r.curve);
  const curves = visible.flatMap((r) =>
    r.curve && isOneDimensional(r.curve) ? [r.curve] : [],
  );
  const fitted = curves.length ? view.fitToCurves(curves) : view;
  if (!visible.some((r) => r.curve?.kind === 'implicit')) return fitted;
  const b = view.fitBasis;
  const f = curves.length ? fitted.bounds : b;
  return (
    tryViewport(
      () =>
        new Viewport(
          {
            xMin: Math.min(b.xMin, f.xMin),
            xMax: Math.max(b.xMax, f.xMax),
            yMin: Math.min(b.yMin, f.yMin),
            yMax: Math.max(b.yMax, f.yMax),
          },
          view.pixelSize,
          { lockAspect: view.lockAspect, fitBasis: b },
        ),
    ) ?? view
  );
}
