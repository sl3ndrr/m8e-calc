import { expect, it, vi } from 'vitest';
import { cachePaths } from './renderer';
import type { SampleResponse } from './workerProtocol';
it('starts a separate canvas subpath for every AP26 component and crossing arm', () => {
  const moves: number[][] = [],
    lines: number[][] = [];
  vi.stubGlobal(
    'Path2D',
    class {
      moveTo(x: number, y: number) {
        moves.push([x, y]);
      }
      lineTo(x: number, y: number) {
        lines.push([x, y]);
      }
    },
  );
  try {
    const response: SampleResponse = {
      version: 2,
      id: 1,
      bounds: { xMin: -2, xMax: 2, yMin: -2, yMax: 2 },
      size: { width: 400, height: 400 },
      milliseconds: 0,
      curves: [
        {
          id: 'implicit',
          signature: 'actual',
          evaluations: 10,
          truncated: false,
          segments: [
            [
              { x: -1, y: -1 },
              { x: -1, y: 1 },
            ],
            [
              { x: 1, y: -1 },
              { x: 1, y: 1 },
            ],
          ],
        },
      ],
    };
    const paths = cachePaths(response, new Map(), 0);
    expect(paths.size).toBe(1);
    expect(moves).toEqual([
      [100, 300],
      [300, 300],
    ]);
    expect(lines).toEqual([
      [100, 100],
      [300, 100],
    ]);
  } finally {
    vi.unstubAllGlobals();
  }
});
