import { Separator, type SeparatorProps } from 'react-aria-components';
import './Divider.css';
export type DividerProps = SeparatorProps;
export function Divider(props: DividerProps) {
  return <Separator {...props} className="ui-divider" />;
}
