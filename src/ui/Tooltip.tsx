import { useState, type ReactElement, type ReactNode } from 'react';
import {
  TooltipTrigger,
  Tooltip as AriaTooltip,
  type TooltipProps as AriaTooltipProps,
} from 'react-aria-components';
import './Tooltip.css';
export interface TooltipProps extends Omit<
  AriaTooltipProps,
  'children' | 'className'
> {
  trigger: ReactElement;
  children: ReactNode;
  rich?: boolean;
  delay?: number;
}
export function Tooltip({
  trigger,
  rich = false,
  delay = 500,
  children,
  ...props
}: TooltipProps) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setHost} className="ui-tooltip-anchor">
      <TooltipTrigger delay={delay}>
        {trigger}
        <AriaTooltip
          {...props}
          UNSTABLE_portalContainer={
            props.UNSTABLE_portalContainer ?? host ?? undefined
          }
          className="ui-tooltip"
          data-rich={rich || undefined}
        >
          {children}
        </AriaTooltip>
      </TooltipTrigger>
    </div>
  );
}
