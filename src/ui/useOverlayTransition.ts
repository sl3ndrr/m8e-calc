import {
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { OverlayTriggerStateContext } from 'react-aria-components';

/** Keep React Aria in charge of presence/focus. Only a motion-policy cancellation
 * needs a fresh closed scope: its rejected native promise cannot finish exit. */
export function useOverlayTransition(
  onAfterClose?: () => void,
): readonly [number, (node: HTMLElement | null) => void] {
  const afterClose = useRef(onAfterClose);
  const currentElement = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    afterClose.current = onAfterClose;
  });
  // Recheck before passive autofocus when a trigger reopens an exiting scope.
  useContext(OverlayTriggerStateContext);
  const synchronize = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    synchronize.current?.();
  });
  const [key, setKey] = useState(0);
  const cleanup = useRef<(() => void) | null>(null);
  const ref = useCallback((node: HTMLElement | null) => {
    const previous = currentElement.current;
    cleanup.current?.();
    cleanup.current = null;
    synchronize.current = null;
    currentElement.current = node;
    if (!node) {
      if (previous?.hasAttribute('data-exiting')) afterClose.current?.();
      return;
    }
    let wasExiting = false;
    let lastFocused: HTMLElement | null = null;
    const rememberFocus = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement) lastFocused = event.target;
    };
    node.addEventListener('focusin', rememberFocus);
    // Include React Aria's own dismiss buttons, not only the caller's content.
    const syncInert = () => {
      const exiting = node.hasAttribute('data-exiting');
      node.inert = exiting;
      // React Aria autofocus runs on mount. A reversed exit keeps that mount;
      // restore its last native target, while Aria still owns containment.
      if (
        !exiting &&
        wasExiting &&
        lastFocused?.isConnected &&
        !node.contains(document.activeElement)
      )
        lastFocused.focus({ preventScroll: true });
      wasExiting = exiting;
    };
    synchronize.current = syncInert;
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
      node.removeEventListener('focusin', rememberFocus);
      node.removeEventListener('transitioncancel', cancel);
    };
  }, []);
  return [key, ref] as const;
}
