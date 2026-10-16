import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { DialogTrigger, Dialog as AriaDialog } from 'react-aria-components';
import * as UI from './index';
import type { ReactNode } from 'react';
import { useSettingsStore } from '../shared/settingsStore';
import { defaultSettings } from '../shared/settings';
const options = [
  { id: 'one', label: 'One' },
  { id: 'two', label: 'Two' },
  { id: 'three', label: 'Three', isDisabled: true },
];
const queue = UI.createSnackbarQueue();
afterEach(() => {
  queue.clear();
  useSettingsStore.setState(defaultSettings());
});
const fixtures: Record<string, ReactNode> = {
  Button: <UI.Button>Save</UI.Button>,
  IconButton: <UI.IconButton icon="palette" aria-label="Palette" />,
  Icon: <UI.Icon name="palette" label="Palette" />,
  ButtonGroup: (
    <UI.ButtonGroup aria-label="Actions" connected>
      <UI.Button>One</UI.Button>
      <UI.Button>Two</UI.Button>
    </UI.ButtonGroup>
  ),
  SegmentedControl: (
    <UI.SegmentedControl aria-label="Mode" items={options} defaultValue="one" />
  ),
  Fab: <UI.Fab icon="palette" aria-label="Palette" />,
  ExtendedFab: <UI.ExtendedFab icon="palette">Palette</UI.ExtendedFab>,
  FabMenu: <UI.FabMenu icon="palette" aria-label="Palette" options={options} />,
  NavigationRail: (
    <UI.NavigationRail
      label="Modes"
      selectedId="one"
      items={options.map((item) => ({
        ...item,
        href: '#one',
        icon: 'palette',
      }))}
    />
  ),
  Switch: <UI.Switch>Sound</UI.Switch>,
  Checkbox: <UI.Checkbox>Remember</UI.Checkbox>,
  Slider: <UI.Slider label="Volume" defaultValue={50} />,
  Chip: (
    <UI.Chip kind="input" onRemove={() => {}} removeLabel="Remove">
      Item
    </UI.Chip>
  ),
  TextField: (
    <UI.TextField
      label="Name"
      description="Help"
      isInvalid
      validationBehavior="aria"
      errorMessage="Required"
    />
  ),
  Select: <UI.Select label="Choose" options={options} />,
  Menu: (
    <UI.Menu
      trigger={<UI.Button>Open</UI.Button>}
      label="Actions"
      options={options}
      searchable
      searchLabel="Search"
    />
  ),
  Dialog: (
    <UI.Dialog title="Dialog" closeLabel="Close" isOpen>
      <UI.TextField label="Name" />
    </UI.Dialog>
  ),
  SideSheet: (
    <UI.SideSheet mode="docked" title="Settings" closeLabel="Close">
      Contents
    </UI.SideSheet>
  ),
  Popover: (
    <DialogTrigger defaultOpen>
      <UI.Button>Open</UI.Button>
      <UI.Popover>
        <AriaDialog aria-label="Details">Details</AriaDialog>
      </UI.Popover>
    </DialogTrigger>
  ),
  Tooltip: (
    <UI.Tooltip trigger={<UI.Button>Help</UI.Button>} isOpen>
      Helpful description
    </UI.Tooltip>
  ),
  Snackbar: (
    <UI.Snackbar queue={queue} label="Notifications" closeLabel="Close" />
  ),
  Card: <UI.Card aria-label="Summary">Contents</UI.Card>,
  List: (
    <UI.List aria-label="Items" selectionMode="single">
      <UI.ListItem id="one" textValue="One">
        One
      </UI.ListItem>
    </UI.List>
  ),
  ListItem: (
    <UI.List aria-label="Items">
      <UI.ListItem id="one" textValue="One">
        One
      </UI.ListItem>
    </UI.List>
  ),
  Divider: <UI.Divider />,
  LoadingIndicator: <UI.LoadingIndicator label="Loading" />,
  FocusRing: (
    <UI.FocusRing>
      <UI.Button>Focus</UI.Button>
    </UI.FocusRing>
  ),
  VisuallyHidden: <UI.VisuallyHidden>Screen reader text</UI.VisuallyHidden>,
  StateLayer: (
    <UI.Button>
      <UI.StateLayer />
      State
    </UI.Button>
  ),
};
describe('component accessibility', () => {
  it.each(Object.keys(fixtures))('%s has no axe violations', async (name) => {
    useSettingsStore.setState({ motionLevel: 'off' });
    if (name === 'Snackbar')
      queue.add({ message: 'Saved', actionLabel: 'Undo', onAction: () => {} });
    const { baseElement } = render(<main>{fixtures[name]}</main>);
    const result = await axe.run(baseElement, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
it.each(['filled', 'tonal', 'elevated', 'outlined', 'text'] as const)(
  'activates %s buttons with Enter and Space, and blocks disabled presses',
  async (variant) => {
    const user = userEvent.setup();
    const press = vi.fn();
    render(
      <>
        <UI.Button variant={variant} onPress={press}>
          Save
        </UI.Button>
        <UI.Button isDisabled onPress={press}>
          Disabled
        </UI.Button>
      </>,
    );
    await user.tab();
    await user.keyboard('{Enter} ');
    expect(press).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(press).toHaveBeenCalledTimes(2);
  },
);
it.each(['IconButton', 'Fab', 'ExtendedFab'] as const)(
  '%s forwards keyboard presses',
  async (name) => {
    const user = userEvent.setup();
    const press = vi.fn();
    render(
      name === 'IconButton' ? (
        <UI.IconButton icon="palette" aria-label="Action" onPress={press} />
      ) : name === 'Fab' ? (
        <UI.Fab icon="palette" aria-label="Action" onPress={press} />
      ) : (
        <UI.ExtendedFab icon="palette" onPress={press}>
          Action
        </UI.ExtendedFab>
      ),
    );
    await user.tab();
    await user.keyboard('{Enter}');
    expect(press).toHaveBeenCalledOnce();
  },
);
it('toggles buttons, switches, checkboxes and filter chips with Space', async () => {
  const user = userEvent.setup();
  render(
    <>
      <UI.Button defaultSelected={false}>Toggle</UI.Button>
      <UI.Switch>Sound</UI.Switch>
      <UI.Checkbox>Remember</UI.Checkbox>
      <UI.Chip kind="filter">Filter</UI.Chip>
    </>,
  );
  for (const role of ['button', 'switch', 'checkbox', 'button']) {
    await user.tab();
    expect(
      document.activeElement?.getAttribute('role') ??
        document.activeElement?.tagName.toLowerCase(),
    ).toBe(role === 'checkbox' ? 'input' : role);
    await user.keyboard(' ');
  }
  expect(screen.getByRole('button', { name: 'Toggle' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByRole('switch')).toBeChecked();
  expect(screen.getByRole('checkbox')).toBeChecked();
  expect(screen.getByRole('button', { name: 'Filter' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
it('removes input chips without nested buttons', async () => {
  const user = userEvent.setup();
  const remove = vi.fn();
  render(
    <UI.Chip kind="input" onRemove={remove} removeLabel="Remove item">
      Item
    </UI.Chip>,
  );
  await user.tab();
  await user.tab();
  await user.keyboard('{Enter}');
  expect(remove).toHaveBeenCalledOnce();
});
it('uses radio arrow keys, skips disabled options, wraps, and supports Home/End', async () => {
  const user = userEvent.setup();
  render(
    <UI.SegmentedControl
      aria-label="Mode"
      items={options}
      defaultValue="one"
    />,
  );
  await user.tab();
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('radio', { name: 'Two' })).toBeChecked();
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('radio', { name: 'One' })).toBeChecked();
  await user.keyboard('{End}');
  expect(screen.getByRole('radio', { name: 'Two' })).toBeChecked();
  await user.keyboard('{Home}');
  expect(screen.getByRole('radio', { name: 'One' })).toBeChecked();
});
it('supports toolbar arrows and a single tab entry point', async () => {
  const user = userEvent.setup();
  render(fixtures.ButtonGroup);
  await user.tab();
  expect(screen.getByRole('button', { name: 'One' })).toHaveFocus();
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus();
});
it('changes slider values with arrows and Home/End', async () => {
  const user = userEvent.setup();
  render(fixtures.Slider);
  await user.tab();
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('slider')).toHaveValue('51');
  await user.keyboard('{End}');
  expect(screen.getByRole('slider')).toHaveValue('100');
  await user.keyboard('{Home}');
  expect(screen.getByRole('slider')).toHaveValue('0');
});
it('labels text fields, descriptions, prefix/suffix and validation errors', async () => {
  const user = userEvent.setup();
  render(
    <UI.TextField
      label="Name"
      description="Help"
      prefix="@"
      suffix="kg"
      isInvalid
      validationBehavior="aria"
      errorMessage="Required"
    />,
  );
  const input = screen.getByRole('textbox', { name: 'Name' });
  await user.tab();
  await user.type(input, 'Ada');
  expect(input).toHaveValue('Ada');
  expect(input).toHaveAccessibleDescription('Help Required');
  expect(input).toHaveAttribute('aria-invalid', 'true');
});
it.each([false, true])(
  'selects an option by keyboard (searchable: %s)',
  async (searchable) => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(
      <UI.Select
        label="Choose"
        options={options}
        searchable={searchable}
        onSelectionChange={change}
      />,
    );
    await user.tab();
    if (searchable) {
      await user.keyboard('Tw{ArrowDown}{Enter}');
    } else {
      await user.keyboard('{Enter}{ArrowDown}{Enter}');
    }
    expect(change).toHaveBeenCalledWith('two');
  },
);
it('filters menus and activates entries with the keyboard', async () => {
  const user = userEvent.setup();
  const action = vi.fn();
  render(
    <UI.Menu
      trigger={<UI.Button>Open</UI.Button>}
      label="Actions"
      options={options}
      searchable
      searchLabel="Search"
      onAction={action}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const search = screen.getByRole('searchbox', { name: 'Search' });
  await user.click(search);
  await user.type(search, 'Tw');
  expect(
    screen.queryByRole('menuitem', { name: 'One' }),
  ).not.toBeInTheDocument();
  await user.keyboard('{ArrowDown}{Enter}');
  expect(action).toHaveBeenCalledWith('two');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus(),
  );
});
it.each(['FabMenu', 'Dialog', 'SideSheet', 'Popover'] as const)(
  '%s opens by keyboard and restores focus on Escape',
  async (name) => {
    const user = userEvent.setup();
    const content =
      name === 'FabMenu' ? (
        fixtures.FabMenu
      ) : name === 'Popover' ? (
        <DialogTrigger>
          <UI.Button>Open</UI.Button>
          <UI.Popover>
            <AriaDialog aria-label="Details">
              <UI.Button>Inside</UI.Button>
            </AriaDialog>
          </UI.Popover>
        </DialogTrigger>
      ) : (
        <DialogTrigger>
          <UI.Button>Open</UI.Button>
          {name === 'Dialog' ? (
            <UI.Dialog title="Dialog" closeLabel="Close">
              Content
            </UI.Dialog>
          ) : (
            <UI.SideSheet title="Sheet" closeLabel="Close">
              Content
            </UI.SideSheet>
          )}
        </DialogTrigger>
      );
    render(content);
    await user.tab();
    const trigger = document.activeElement;
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole(name === 'FabMenu' ? 'menu' : 'dialog'),
    ).toBeVisible();
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(
        screen.queryByRole(name === 'FabMenu' ? 'menu' : 'dialog'),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  },
);
it('shows a tooltip on keyboard focus', async () => {
  const user = userEvent.setup();
  render(
    <UI.Tooltip trigger={<UI.Button>Help</UI.Button>} delay={0} rich>
      <strong>Details</strong>
    </UI.Tooltip>,
  );
  await user.tab();
  await waitFor(() =>
    expect(screen.getByRole('tooltip')).toHaveTextContent('Details'),
  );
});
it('selects list rows with arrows and Space', async () => {
  const user = userEvent.setup();
  render(
    <UI.List aria-label="Items" selectionMode="single">
      <UI.ListItem id="one" textValue="One">
        One
      </UI.ListItem>
      <UI.ListItem id="two" textValue="Two">
        Two
      </UI.ListItem>
    </UI.List>,
  );
  await user.tab();
  await user.keyboard('{ArrowDown} ');
  expect(screen.getByRole('row', { name: 'Two' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
it('queues snackbar messages, exposes Undo, and dismisses exactly once', async () => {
  const user = userEvent.setup();
  const undo = vi.fn();
  queue.add({ message: 'First', actionLabel: 'Undo', onAction: undo });
  queue.add({ message: 'Second' });
  render(
    <UI.Snackbar queue={queue} label="Notifications" closeLabel="Close" />,
  );
  expect(screen.getByText('First')).toBeVisible();
  expect(screen.queryByText('Second')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  expect(undo).toHaveBeenCalledOnce();
  await waitFor(() => expect(screen.getByText('Second')).toBeVisible());
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(queue.visibleToasts).toHaveLength(0);
});
it('exposes link destinations and navigation badges without extra tab stops', async () => {
  const user = userEvent.setup();
  render(fixtures.NavigationRail);
  await user.tab();
  expect(screen.getByRole('link', { name: 'One' })).toHaveFocus();
  expect(screen.getByRole('link', { name: 'One' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});
it('keeps loading static when motion is disabled', () => {
  useSettingsStore.setState({ motionLevel: 'off' });
  const interval = vi.spyOn(window, 'setInterval');
  const { unmount } = render(<UI.LoadingIndicator label="Loading" />);
  expect(interval).not.toHaveBeenCalled();
  unmount();
  interval.mockRestore();
});
it('pauses loading when motion settings change', () => {
  useSettingsStore.setState({ motionLevel: 'full' });
  const clear = vi.spyOn(window, 'clearInterval');
  const { unmount } = render(<UI.LoadingIndicator label="Loading" />);
  act(() => useSettingsStore.setState({ motionLevel: 'reduced' }));
  expect(clear).toHaveBeenCalled();
  unmount();
  clear.mockRestore();
});
it('gives focus rings a keyboard-operable child and hidden text an accessible name', async () => {
  const user = userEvent.setup();
  render(
    <UI.FocusRing>
      <UI.Button>
        <UI.VisuallyHidden>Hidden label</UI.VisuallyHidden>
        <UI.Icon name="check" />
      </UI.Button>
    </UI.FocusRing>,
  );
  await user.tab();
  expect(screen.getByRole('button', { name: 'Hidden label' })).toHaveFocus();
});
it('forwards StateLayer attributes without entering the accessibility tree', () => {
  const { container } = render(<UI.StateLayer data-testid="layer" />);
  expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  fireEvent.mouseOver(screen.getByTestId('layer'));
});

it('checkbox preserves native mixed/disabled/invalid semantics and changes once per activation', async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  const { rerender } = render(
    <UI.Checkbox onChange={change}>Remember</UI.Checkbox>,
  );
  const input = screen.getByRole('checkbox', { name: 'Remember' });
  await user.click(screen.getByText('Remember'));
  expect(input).toBeChecked();
  expect(change).toHaveBeenCalledExactlyOnceWith(true);
  await user.keyboard(' ');
  expect(input).not.toBeChecked();
  expect(change).toHaveBeenCalledTimes(2);
  expect(change).toHaveBeenLastCalledWith(false);
  expect(input).toHaveFocus();
  rerender(<UI.Checkbox isIndeterminate>Remember</UI.Checkbox>);
  expect(input).toBePartiallyChecked();
  rerender(
    <UI.Checkbox isDisabled isSelected isInvalid validationBehavior="aria" onChange={change}>
      Remember
    </UI.Checkbox>,
  );
  expect(input).toBeDisabled();
  expect(input).toBeChecked();
  expect(input).toHaveAttribute('aria-invalid', 'true');
  await user.click(screen.getByText('Remember'));
  expect(change).toHaveBeenCalledTimes(2);
});
