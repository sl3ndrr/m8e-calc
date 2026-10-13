import {
  useCallback,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Button as AriaButton,
  ToggleButton,
  type ButtonProps as AriaButtonProps,
} from 'react-aria-components';
import { StateLayer } from './StateLayer';
import './FocusRing.css';
import './Button.css';
export type ButtonVariant =
  'filled' | 'tonal' | 'elevated' | 'outlined' | 'text';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type SharedButtonProps = Pick<
  AriaButtonProps,
  | 'id'
  | 'slot'
  | 'type'
  | 'name'
  | 'value'
  | 'form'
  | 'autoFocus'
  | 'isDisabled'
  | 'onPress'
  | 'onPressStart'
  | 'onPressEnd'
  | 'onPressChange'
  | 'onHoverStart'
  | 'onHoverEnd'
  | 'onHoverChange'
  | 'onFocus'
  | 'onBlur'
  | 'onFocusChange'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'aria-controls'
  | 'aria-expanded'
  | 'aria-haspopup'
>;
export interface ButtonProps extends SharedButtonProps {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: 'round' | 'square';
  isSelected?: boolean;
  defaultSelected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  ref?: Ref<HTMLButtonElement>;
  title?: string;
  popoverTarget?: string;
  popoverTargetAction?: 'toggle' | 'show' | 'hide';
}
export function Button({
  variant = 'filled',
  size = 'md',
  shape = 'round',
  className = '',
  children,
  isSelected,
  defaultSelected,
  onSelectedChange,
  ref,
  title,
  popoverTarget,
  popoverTargetAction,
  ...props
}: ButtonProps) {
  const nativeRef = useCallback(
    (node: HTMLButtonElement | null) => {
      if (node) {
        if (title) node.title = title;
        if (popoverTarget) node.setAttribute('popovertarget', popoverTarget);
        if (popoverTargetAction)
          node.setAttribute('popovertargetaction', popoverTargetAction);
      }
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [title, popoverTarget, popoverTargetAction, ref],
  );
  const shared = {
    ...props,
    ref: nativeRef,
    className: `ui-button ${className}`,
    'data-variant': variant,
    'data-size': size,
    'data-shape': shape,
  };
  const content = (
    <>
      <StateLayer />
      <span className="ui-button-content">{children}</span>
    </>
  );
  return isSelected !== undefined ||
    defaultSelected !== undefined ||
    onSelectedChange ? (
    <ToggleButton
      {...shared}
      isSelected={isSelected}
      defaultSelected={defaultSelected}
      onChange={onSelectedChange}
    >
      {content}
    </ToggleButton>
  ) : (
    <AriaButton {...shared}>{content}</AriaButton>
  );
}
