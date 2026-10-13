import { useRef, useState, type ReactElement } from 'react';
import {
  MenuTrigger,
  Menu as AriaMenu,
  MenuItem,
  SearchField,
  Label,
  Input,
  type Key,
} from 'react-aria-components';
import { Popover } from './Popover';
import { StateLayer } from './StateLayer';
import './Menu.css';
export interface MenuOption {
  id: string;
  label: string;
  isDisabled?: boolean;
}
export interface MenuProps {
  trigger: ReactElement;
  label: string;
  options: readonly MenuOption[];
  onAction?: (key: Key) => void;
  searchable?: boolean;
  searchLabel?: string;
}
export function Menu({
  trigger,
  label,
  options,
  onAction,
  searchable = false,
  searchLabel = label,
}: MenuProps) {
  const [query, setQuery] = useState('');
  const menu = useRef<HTMLDivElement>(null);
  const items = options.filter((item) =>
    item.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  return (
    <MenuTrigger>
      {trigger}
      <Popover className="ui-menu-popover">
        {searchable && (
          <SearchField
            value={query}
            onChange={setQuery}
            className="ui-menu-search"
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                menu.current
                  ?.querySelector<HTMLElement>(
                    '[role="menuitem"]:not([aria-disabled="true"])',
                  )
                  ?.focus();
              }
            }}
          >
            <Label>{searchLabel}</Label>
            <Input />
          </SearchField>
        )}
        <AriaMenu
          ref={menu}
          aria-label={label}
          className="ui-menu"
          items={items}
          disabledKeys={options
            .filter((item) => item.isDisabled)
            .map((item) => item.id)}
          onAction={(key) => onAction?.(key)}
        >
          {(item) => (
            <MenuItem
              id={item.id}
              textValue={item.label}
              className="ui-menu-item"
            >
              <StateLayer />
              {item.label}
            </MenuItem>
          )}
        </AriaMenu>
      </Popover>
    </MenuTrigger>
  );
}
