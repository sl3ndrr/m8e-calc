import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ProgrammerPanel } from './ProgrammerPanel';
import { BitGrid } from './BitGrid';
const options = { width: 8, signed: false, overflow: 'wrap' } as const;
it('keyboard bit toggle and nibble labels', () => {
  const change = vi.fn(),
    commit = vi.fn();
  render(
    <BitGrid
      bits={0n}
      width={8}
      locale="de"
      onChange={change}
      onCommit={commit}
    />,
  );
  expect(screen.getAllByRole('switch')).toHaveLength(8);
  fireEvent.click(screen.getByRole('switch', { name: 'Bit 7' }));
  expect(change).toHaveBeenCalledWith(128n);
  expect(commit).toHaveBeenCalledWith(128n);
});
it('four editable bases, width controls and operation', () => {
  const run = vi.fn(),
    configure = vi.fn();
  const { container } = render(
    <ProgrammerPanel
      value={10n}
      options={options}
      locale="de"
      onRun={run}
      onConfigure={configure}
      copy={vi.fn()}
    />,
  );
  expect(screen.getByRole('textbox', { name: 'Hexadezimal' })).toHaveValue(
    '0A',
  );
  expect(
    container.querySelectorAll('.programmer-word-grid [role="switch"]'),
  ).toHaveLength(8);
  fireEvent.change(screen.getByRole('textbox', { name: 'Hexadezimal' }), {
    target: { value: 'FF' },
  });
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Hexadezimal' }), {
    key: 'Enter',
  });
  expect(run).toHaveBeenCalledWith('255');
  fireEvent.click(screen.getByRole('button', { name: 'NOT' }));
  expect(run).toHaveBeenCalledWith('~(10)');
  fireEvent.click(screen.getByRole('radio', { name: '16' }));
  expect(configure).toHaveBeenCalledWith({ ...options, width: 16 });
});
it('64-bit IEEE grid and exact value', () => {
  render(
    <ProgrammerPanel
      value={0n}
      options={options}
      locale="de"
      onRun={vi.fn()}
      onConfigure={vi.fn()}
      copy={vi.fn()}
    />,
  );
  expect(screen.getByText('IEEE 754')).toBeInTheDocument();
  expect(screen.getAllByRole('switch')).toHaveLength(40);
});
