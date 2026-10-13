import type { HTMLAttributes } from 'react';
import './StateLayer.css';
import './FocusRing.css';
export type StateLayerProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'>;
export function StateLayer(props: StateLayerProps) {
  return (
    <span
      {...props}
      className={`ui-state-layer ${props.className ?? ''}`}
      aria-hidden="true"
    />
  );
}
