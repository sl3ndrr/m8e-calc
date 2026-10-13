import {
  Switch as AriaSwitch,
  type SwitchProps as AriaSwitchProps,
} from 'react-aria-components';
import { StateLayer } from './StateLayer';
import './Switch.css';
export interface SwitchProps extends Omit<AriaSwitchProps, 'className'> {
  className?: string;
}
export function Switch({ children, className = '', ...props }: SwitchProps) {
  return (
    <AriaSwitch {...props} className={`ui-switch ${className}`}>
      {(state) => (
        <>
          <span className="ui-switch-track">
            <span className="ui-switch-thumb">
              <StateLayer />
            </span>
          </span>
          {typeof children === 'function' ? children(state) : children}
        </>
      )}
    </AriaSwitch>
  );
}
