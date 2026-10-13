import type { ReactNode } from 'react';
import { GridListItem, type GridListItemProps } from 'react-aria-components';
import { StateLayer } from './StateLayer';
import './ListItem.css';
export interface ListItemProps extends Omit<
  GridListItemProps,
  'className' | 'children'
> {
  className?: string;
  children: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  description?: string;
}
export function ListItem({
  children,
  leading,
  trailing,
  description,
  className = '',
  ...props
}: ListItemProps) {
  return (
    <GridListItem {...props} className={`ui-list-item ${className}`}>
      <StateLayer />
      {leading}
      <div>
        {children}
        {description && <p>{description}</p>}
      </div>
      {trailing}
    </GridListItem>
  );
}
