import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useOverlayTransition } from './useOverlayTransition';

function Subject({
  exiting = true,
  onAfterClose,
}: {
  exiting?: boolean;
  onAfterClose?: () => void;
}) {
  const [overlayKey, overlayRef] = useOverlayTransition(onAfterClose);
  return (
    <div
      data-testid="scope"
      data-exiting={exiting || undefined}
      data-generation={overlayKey}
      ref={overlayRef}
    >
      <button type="button" data-testid="child">
        Child
      </button>
    </div>
  );
}
function cancel(node: Element, propertyName = 'opacity') {
  fireEvent(
    node,
    Object.assign(new Event('transitioncancel', { bubbles: true }), {
      propertyName,
    }),
  );
}
afterEach(() => {
  delete document.documentElement.dataset.motion;
});
it('retains ordinary reversals and ignores bubbling child cancellations', () => {
  document.documentElement.dataset.motion = 'full';
  render(<Subject />);
  const scope = screen.getByTestId('scope');
  cancel(scope);
  expect(scope).toHaveAttribute('data-generation', '0');
  document.documentElement.dataset.motion = 'off';
  cancel(screen.getByTestId('child'));
  cancel(scope, 'background-color');
  expect(scope).toHaveAttribute('data-generation', '0');
  cancel(scope);
  expect(scope).toHaveAttribute('data-generation', '1');
});
it('does not reset an open scope when the policy cancels its entrance', () => {
  document.documentElement.dataset.motion = 'reduced';
  render(<Subject exiting={false} />);
  const scope = screen.getByTestId('scope');
  cancel(scope);
  expect(scope).toHaveAttribute('data-generation', '0');
});

it('restores the retained native target only when an exit reverses', () => {
  const { rerender, unmount } = render(<Subject exiting={false} />);
  const child = screen.getByTestId('child');
  child.focus();
  rerender(<Subject />);
  const outside = document.createElement('button');
  document.body.append(outside);
  outside.focus();
  rerender(<Subject exiting={false} />);
  expect(child).toHaveFocus();
  unmount();
  outside.focus();
  cancel(child);
  expect(outside).toHaveFocus();
  outside.remove();
});

it('reports completed exit on scope removal, not merely an open unmount', () => {
  const closed = vi.fn();
  const first = render(<Subject exiting={false} onAfterClose={closed} />);
  first.unmount();
  expect(closed).not.toHaveBeenCalled();
  const second = render(<Subject onAfterClose={closed} />);
  expect(closed).not.toHaveBeenCalled();
  second.unmount();
  expect(closed).toHaveBeenCalledTimes(1);
});
