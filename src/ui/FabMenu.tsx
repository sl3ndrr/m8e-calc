import { Fab, type FabProps } from './Fab';
import { Menu, type MenuOption } from './Menu';
import type { Key } from 'react-aria-components';
import './FabMenu.css';
export interface FabMenuProps extends FabProps {
  options: readonly MenuOption[];
  onAction?: (key: Key) => void;
}
export function FabMenu({ options, onAction, ...props }: FabMenuProps) {
  return (
    <Menu
      trigger={
        <Fab {...props} className={`ui-fab-menu ${props.className ?? ''}`} />
      }
      label={props['aria-label']}
      options={options}
      onAction={onAction}
    />
  );
}
