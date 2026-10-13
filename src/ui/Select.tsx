import {
  ComboBox,
  Select as AriaSelect,
  SelectValue,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  type ComboBoxProps,
  type Key,
} from 'react-aria-components';
import { Button } from './Button';
import { Popover } from './Popover';
import { StateLayer } from './StateLayer';
import { Text, FieldError } from 'react-aria-components';
import './Select.css';
export interface SelectOption {
  id: string;
  label: string;
  isDisabled?: boolean;
}
export interface SelectProps extends Omit<
  ComboBoxProps<SelectOption>,
  'children' | 'className' | 'items' | 'defaultItems'
> {
  label: string;
  options: readonly SelectOption[];
  searchable?: boolean;
  className?: string;
  description?: string;
  errorMessage?: string;
}
export function Select({
  label,
  options,
  searchable = false,
  className = '',
  description,
  errorMessage,
  ...props
}: SelectProps) {
  const items = options.map((option) => ({ ...option }));
  const content = (
    <>
      <Label>{label}</Label>
      {searchable ? (
        <div className="ui-select-control">
          <StateLayer />
          <Input />
          <Button variant="text" aria-label={label}>
            ▾
          </Button>
        </div>
      ) : (
        <Button variant="outlined">
          <SelectValue />▾
        </Button>
      )}
      <Popover>
        <ListBox
          items={items}
          disabledKeys={items
            .filter((item) => item.isDisabled)
            .map((item) => item.id)}
        >
          {(item) => (
            <ListBoxItem
              id={item.id}
              textValue={item.label}
              className="ui-select-item"
            >
              <StateLayer />
              {item.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </>
  );
  if (searchable)
    return (
      <ComboBox
        {...props}
        defaultItems={items}
        className={`ui-select ${className}`}
      >
        {content}
      </ComboBox>
    );
  const {
    selectedKey,
    defaultSelectedKey,
    onSelectionChange,
    isDisabled,
    isRequired,
    isInvalid,
    name,
    validationBehavior,
  } = props;
  return (
    <AriaSelect
      selectedKey={selectedKey}
      defaultSelectedKey={defaultSelectedKey}
      onSelectionChange={
        onSelectionChange as ((key: Key | null) => void) | undefined
      }
      isDisabled={isDisabled}
      isRequired={isRequired}
      isInvalid={isInvalid}
      name={name}
      validationBehavior={validationBehavior}
      className={`ui-select ${className}`}
    >
      {content}
    </AriaSelect>
  );
}
