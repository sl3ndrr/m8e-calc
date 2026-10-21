import { useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';
import { OverlayTriggerStateContext } from 'react-aria-components';

/** Keep React Aria in charge of presence/focus. Only a motion-policy cancellation
 * needs a fresh closed scope: its rejected native promise cannot finish exit. */
export function useOverlayTransition() {
  // Recheck before passive autofocus when a trigger reopens an exiting scope.
  useContext(OverlayTriggerStateContext);
  const element = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (element.current)
      element.current.inert = element.current.hasAttribute('data-exiting');
  });
  const [key, setKey] = useState(0);
  const cleanup = useRef<(() => void) | null>(null);
  const ref = useCallback((node: HTMLElement | null) => {
    cleanup.current?.();
    cleanup.current = null;
    element.current = node;
    if (!node) return;
    // Include React Aria's own dismiss buttons, not only the caller's content.
    const syncInert = () => {
      node.inert = node.hasAttribute('data-exiting');
    };
    syncInert();
    const observer = new MutationObserver(syncInert);
    observer.observe(node, {
      attributes: true,
      attributeFilter: ['data-exiting'],
    });
    const cancel = (event: TransitionEvent) => {
      if (
        event.target === node &&
        event.propertyName === 'opacity' &&
        node.hasAttribute('data-exiting') &&
        (document.documentElement.dataset.motion !== 'full' ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      )
        setKey((value) => value + 1);
    };
    node.addEventListener('transitioncancel', cancel);
    cleanup.current = () => {
      observer.disconnect();
      node.removeEventListener('transitioncancel', cancel);
    };
  }, []);
  return { key, ref };
}
