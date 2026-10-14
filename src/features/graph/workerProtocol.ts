import type { Bounds, Curve, PixelSize, Point } from '../../graph';
export interface SampleRequest {
  id: number;
  curves: { id: string; curve: Curve; signature: string }[];
  bounds: Bounds;
  size: PixelSize;
}
export interface SampleResponse {
  id: number;
  curves: {
    id: string;
    signature: string;
    segments: Point[][];
    truncated: boolean;
  }[];
  bounds: Bounds;
  size: PixelSize;
  milliseconds: number;
}
