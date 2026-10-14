import { render,screen } from '@testing-library/react';
import { expect,it,vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ModeErrorBoundary } from './ModeErrorBoundary';
import { supportedEasing } from './browserMotion';
import { installGlobalErrorHandlers } from './globalErrors';
import { snackbarQueue } from '../ui/snackbarQueue';
it('contains render failures and provides a keyboard reset',async()=>{
  const consoleError=vi.spyOn(console,'error').mockImplementation(()=>{});
  function Broken():never{throw Error('sensitive expression');}
  const reset=vi.fn();
  render(<ModeErrorBoundary locale="de" onReset={reset}><Broken/></ModeErrorBoundary>);
  expect(screen.getByRole('alert')).toHaveTextContent('Dieser Modus konnte nicht geladen werden');
  expect(screen.queryByText('sensitive expression')).toBeNull();
  await userEvent.setup().keyboard('{Enter}');expect(reset).toHaveBeenCalledOnce();
  consoleError.mockRestore();
});
it('falls back for unsupported WAAPI easing',()=>{
  expect(supportedEasing('linear(0,1)',()=>false)).toBe('ease-out');
  expect(supportedEasing('linear(0,1)',()=>true)).toBe('linear(0,1)');
});
it('coalesces global failures, localizes them and removes both handlers',()=>{
  snackbarQueue.clear(); const stop=installGlobalErrorHandlers();
  window.dispatchEvent(new Event('error'));window.dispatchEvent(new Event('unhandledrejection'));
  expect(snackbarQueue.visibleToasts).toHaveLength(1);
  expect(snackbarQueue.visibleToasts[0]?.content.message).toBe('Etwas ist schiefgegangen. Bitte versuche die Aktion erneut.');
  stop();window.dispatchEvent(new Event('error'));expect(snackbarQueue.visibleToasts).toHaveLength(0);
});
