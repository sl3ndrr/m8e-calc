import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useOverlayTransition } from './useOverlayTransition';

function Subject({
  exiting = true,
  onAfterClose,
  present = true,
}: {
  exiting?: boolean;
  onAfterClose?: () => void;
  present?: boolean;
}) {
  const [overlayKey, overlayRef] = useOverlayTransition(onAfterClose);
  return present ? (
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
  ) : null;
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
  vi.unstubAllGlobals();
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
  second.rerender(<Subject present={false} onAfterClose={closed} />);
  expect(closed).toHaveBeenCalledTimes(1);
  second.unmount();
  expect(closed).toHaveBeenCalledTimes(1);
});

it('releases owned focus before inert and preserves a newer native target', () => {
  const opener = document.createElement('button');
  const next = document.createElement('button');
  document.body.append(opener, next);
  opener.focus();
  const { rerender, unmount } = render(<Subject exiting={false} />);
  screen.getByTestId('child').focus();
  rerender(<Subject />);
  expect(opener).toHaveFocus();
  rerender(<Subject exiting={false} />);
  next.focus();
  rerender(<Subject />);
  expect(next).toHaveFocus();
  unmount();
  opener.remove();
  next.remove();
});

function nativeFrames() {
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  return {
    frames,
    flush: () => {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(0));
    },
  };
}

it('returns owned focus once after exit removal releases Aria isolation', () => {
  const { frames, flush } = nativeFrames();
  const opener = document.createElement('button');
  document.body.append(opener);
  opener.focus();
  const { rerender, unmount } = render(<Subject exiting={false} />);
  screen.getByTestId('child').focus();
  opener.setAttribute('inert', '');
  rerender(<Subject />);
  expect(frames.size).toBe(0);
  expect(opener).not.toHaveFocus();
  rerender(<Subject present={false} />);
  expect(frames.size).toBe(1);
  opener.removeAttribute('inert');
  flush();
  expect(opener).toHaveFocus();
  expect(frames.size).toBe(0);
  unmount();
  opener.remove();
});

it('cancels pending return on native input, reopen and component unmount', () => {
  const { frames, flush } = nativeFrames();
  const opener = document.createElement('button');
  const next = document.createElement('button');
  document.body.append(opener, next);
  opener.focus();
  const { rerender, unmount } = render(<Subject exiting={false} />);
  screen.getByTestId('child').focus();
  rerender(<Subject />);
  rerender(<Subject present={false} />);
  fireEvent.pointerDown(next);
  next.focus();
  flush();
  expect(next).toHaveFocus();
  expect(frames.size).toBe(0);
  rerender(<Subject exiting={false} />);
  screen.getByTestId('child').focus();
  rerender(<Subject />);
  rerender(<Subject present={false} />);
  expect(frames.size).toBe(1);
  rerender(<Subject exiting={false} />);
  expect(frames.size).toBe(0);
  screen.getByTestId('child').focus();
  rerender(<Subject />);
  unmount();
  expect(frames.size).toBe(0);
  opener.remove();
  next.remove();
});

it('returns focus after passive isolation cleanup before another Escape', () => {
  const opener = document.createElement('button');
  document.body.append(opener);
  opener.focus();
  const { rerender, unmount } = render(<Subject exiting={false} />);
  const child = screen.getByTestId('child');
  child.focus();
  opener.setAttribute('inert', '');
  rerender(<Subject />);
  expect(opener).not.toHaveFocus();
  child.blur();
  opener.removeAttribute('inert');
  rerender(<Subject />);
  expect(opener).toHaveFocus();
  unmount();
  opener.remove();
});
