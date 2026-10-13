import { GridList, type GridListProps } from 'react-aria-components';
import './List.css';
export interface ListProps<T extends object> extends Omit<
  GridListProps<T>,
  'className'
> {
  className?: string;
}
export function List<T extends object>({
  className = '',
  ...props
}: ListProps<T>) {
  return <GridList {...props} className={`ui-list ${className}`} />;
}
