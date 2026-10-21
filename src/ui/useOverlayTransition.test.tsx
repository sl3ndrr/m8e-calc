import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useOverlayTransition } from './useOverlayTransition';

function Subject({ exiting = true }: { exiting?: boolean }) {
  const transition = useOverlayTransition();
  return (
    <div
      data-testid="scope"
      data-exiting={exiting || undefined}
      data-generation={transition.key}
      ref={transition.ref}
    >
      <span data-testid="child" />
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
