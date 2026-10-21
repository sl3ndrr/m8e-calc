import {
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { OverlayTriggerStateContext } from 'react-aria-components';

/** Keep React Aria in charge of presence/focus. Only a motion-policy cancellation
 * needs a fresh closed scope: its rejected native promise cannot finish exit. */
export function useOverlayTransition(
  onAfterClose?: () => void,
  triggerRef?: RefObject<Element | null>,
): readonly [number, (node: HTMLElement | null) => void] {
  const afterClose = useRef(onAfterClose);
  const currentElement = useRef<HTMLElement | null>(null);
  const trigger = useRef(triggerRef);
  const mounted = useRef(true);
  const returnTarget = useRef<HTMLElement | null>(null);
  const returnFrame = useRef(0);
  const cancelReturn = useRef<(() => void) | null>(null);
  const stopReturn = useCallback(() => {
    cancelAnimationFrame(returnFrame.current);
    returnFrame.current = 0;
    cancelReturn.current?.();
    cancelReturn.current = null;
    returnTarget.current = null;
  }, []);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopReturn();
    };
  }, [stopReturn]);
  useLayoutEffect(() => {
    afterClose.current = onAfterClose;
    trigger.current = triggerRef;
  });
  // Recheck before passive autofocus when a trigger reopens an exiting scope.
  useContext(OverlayTriggerStateContext);
  const synchronize = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    synchronize.current?.();
  });
  const [key, setKey] = useState(0);
  const cleanup = useRef<(() => void) | null>(null);
  const ref = useCallback(
    (node: HTMLElement | null) => {
      const previous = currentElement.current;
      cleanup.current?.();
      cleanup.current = null;
      synchronize.current = null;
      currentElement.current = node;
      if (!node) {
        if (mounted.current && previous?.hasAttribute('data-exiting')) {
          const target = returnTarget.current;
          if (target)
            returnFrame.current = requestAnimationFrame(() => {
              returnFrame.current = 0;
              const active = document.activeElement;
              const restore =
                mounted.current &&
                returnTarget.current === target &&
                target.isConnected &&
                !target.closest('[inert]') &&
                (active === document.body ||
                  active === target ||
                  active === target.closest('[role="dialog"]'));
              stopReturn();
              if (restore) target.focus({ preventScroll: true });
            });
          afterClose.current?.();
        }
        return;
      }
      stopReturn();
      let wasExiting = false;
      let lastFocused: HTMLElement | null = null;
      const previousFocus = document.activeElement;
      const rememberFocus = (event: FocusEvent) => {
        if (event.target instanceof HTMLElement) lastFocused = event.target;
      };
      node.addEventListener('focusin', rememberFocus);
      // Include React Aria's own dismiss buttons, not only the caller's content.
      const syncInert = () => {
        const exiting = node.hasAttribute('data-exiting');
        // Capture ownership before inert blurs the active child. Aria's outside
        // isolation can still make its trigger inert here, so retry once after
        // actual scope removal, after Aria's own cleanup. New input owns focus.
        if (exiting && !wasExiting && node.contains(document.activeElement)) {
          const target = trigger.current?.current ?? previousFocus;
          if (
            target instanceof HTMLElement &&
            target.isConnected &&
            !node.contains(target)
          ) {
            returnTarget.current = target;
            window.addEventListener('pointerdown', stopReturn, true);
            window.addEventListener('keydown', stopReturn, true);
            cancelReturn.current = () => {
              window.removeEventListener('pointerdown', stopReturn, true);
              window.removeEventListener('keydown', stopReturn, true);
            };
            if (!target.closest('[inert]'))
              target.focus({ preventScroll: true });
          }
        }
        if (!exiting && wasExiting) stopReturn();
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
    },
    [stopReturn],
  );
  return [key, ref] as const;
}
