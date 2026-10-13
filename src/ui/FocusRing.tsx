import type { HTMLAttributes } from 'react';
import './FocusRing.css';
export type FocusRingProps = HTMLAttributes<HTMLSpanElement>;
/** A compositional ring for custom surfaces; RAC controls expose data-focus-visible. */
export function FocusRing({ className = '', ...props }: FocusRingProps) {
  return <span {...props} className={`ui-focus-ring ${className}`} />;
}
