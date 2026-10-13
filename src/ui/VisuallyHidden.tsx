import {
  VisuallyHidden as AriaVisuallyHidden,
  type VisuallyHiddenProps,
} from 'react-aria-components';
import './VisuallyHidden.css';
export type { VisuallyHiddenProps };
export function VisuallyHidden(props: VisuallyHiddenProps) {
  return <AriaVisuallyHidden {...props} />;
}
