import {
  Slider as AriaSlider,
  SliderTrack,
  SliderThumb,
  SliderOutput,
  Label,
  type SliderProps as AriaSliderProps,
} from 'react-aria-components';
import { StateLayer } from './StateLayer';
import './Slider.css';
export interface SliderProps extends Omit<
  AriaSliderProps<number>,
  'children' | 'className'
> {
  label: string;
  className?: string;
  showValue?: boolean;
}
export function Slider({
  label,
  className = '',
  showValue = true,
  ...props
}: SliderProps) {
  return (
    <AriaSlider {...props} className={`ui-slider ${className}`}>
      <div className="ui-slider-heading">
        <Label>{label}</Label>
        {showValue && <SliderOutput />}
      </div>
      <SliderTrack className="ui-slider-track">
        {({ state }) => (
          <>
            <span
              className="ui-slider-fill"
              style={{ width: `${state.getThumbPercent(0) * 100}%` }}
            />
            <SliderThumb className="ui-slider-thumb">
              <StateLayer />
              {showValue && (
                <span className="ui-slider-bubble" aria-hidden="true">
                  {state.getThumbValueLabel(0)}
                </span>
              )}
            </SliderThumb>
          </>
        )}
      </SliderTrack>
    </AriaSlider>
  );
}
