import { useState, type TransitionEventHandler } from 'react';

/** React Aria waits on native transition promises. A policy cancellation rejects
 * those promises, so discard only a closed, cancelled scope. Open scopes retain
 * their content and native focus state; ordinary reversals retain the same node. */
export function useOverlayTransition(): {
  key: number;
  onTransitionCancel: TransitionEventHandler<HTMLElement>;
} {
  const [key, setKey] = useState(0);
  return {
    key,
    onTransitionCancel(event) {
      if (
        event.target === event.currentTarget &&
        event.propertyName === 'opacity' &&
        event.currentTarget.hasAttribute('data-exiting') &&
        (document.documentElement.dataset.motion !== 'full' ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      )
        setKey((value) => value + 1);
    },
  };
}
