import { useState, type ReactNode } from 'react';
import { DialogTrigger, Dialog as AriaDialog } from 'react-aria-components';
import * as UI from '../ui';
import { t, type MessageKey } from '../shared/i18n/extended';
import { useAppStore } from '../shared/store';
import './ComponentGallery.css';
import { galleryEntries, type State } from './galleryEntries';
type Name = keyof typeof galleryEntries;
function Example({ name, state }: { name: Name; state: State }) {
  const locale = useAppStore((s) => s.locale);
  const text = (key: MessageKey) => t(key, locale);
  const [open, setOpen] = useState(false);
  const [removed, setRemoved] = useState(false);
  const disabled = state === 'disabled';
  const selected = state === 'selected';
  const className = `ui-state-${state}`;
  const button = { className, isDisabled: disabled };
  const options = [
    { id: 'one', label: text('ui.first') },
    { id: 'two', label: text('ui.second') },
    { id: 'three', label: text('ui.third'), isDisabled: true },
  ];
  const children = text('ui.action');
  const notify = () =>
    UI.snackbarQueue.add({
      message: text('ui.saved'),
      actionLabel: text('ui.undo'),
      onAction: () => {
        UI.snackbarQueue.add({ message: text('ui.undone') }, { timeout: 5000 });
      },
    });
  switch (name) {
    case 'Button':
      return (
        <UI.Button {...button} defaultSelected={selected ? true : undefined}>
          {children}
        </UI.Button>
      );
    case 'IconButton':
      return (
        <UI.IconButton
          {...button}
          icon="palette"
          aria-label={children}
          defaultSelected={selected ? true : undefined}
        />
      );
    case 'Icon':
      return (
        <UI.Icon
          name="palette"
          filled={selected}
          label={text('ui.component.Icon')}
        />
      );
    case 'ButtonGroup':
      return (
        <UI.ButtonGroup aria-label={text('ui.component.ButtonGroup')} connected>
          <UI.Button {...button} variant="tonal">
            1
          </UI.Button>
          <UI.Button {...button} variant="tonal">
            2
          </UI.Button>
          <UI.Button {...button} variant="tonal">
            3
          </UI.Button>
        </UI.ButtonGroup>
      );
    case 'SegmentedControl':
      return (
        <UI.SegmentedControl
          className={className}
          aria-label={text('ui.component.SegmentedControl')}
          items={options.slice(0, 2)}
          defaultValue={selected ? 'two' : 'one'}
          isDisabled={disabled}
        />
      );
    case 'Fab':
      return <UI.Fab {...button} icon="palette" aria-label={children} />;
    case 'ExtendedFab':
      return (
        <UI.ExtendedFab {...button} icon="palette">
          {children}
        </UI.ExtendedFab>
      );
    case 'FabMenu':
      return (
        <UI.FabMenu
          {...button}
          icon="palette"
          aria-label={children}
          options={options}
          onAction={notify}
        />
      );
    case 'NavigationRail':
      return (
        <div className={className}>
          <UI.NavigationRail
            label={`${text('ui.component.NavigationRail')} · ${text(`ui.${state}`)}`}
            expanded={selected}
            selectedId={selected ? 'two' : 'one'}
            items={options.slice(0, 2).map((item) => ({
              ...item,
              href: '#/design',
              icon: 'palette' as const,
              badge: item.id === 'two' ? '3' : undefined,
            }))}
          />
        </div>
      );
    case 'Switch':
      return (
        <UI.Switch {...button} defaultSelected={selected}>
          {text('ui.component.Switch')}
        </UI.Switch>
      );
    case 'Checkbox':
      return (
        <UI.Checkbox
          {...button}
          defaultSelected={selected}
          isInvalid={state === 'error'}
        >
          {text('ui.component.Checkbox')}
        </UI.Checkbox>
      );
    case 'Slider':
      return (
        <UI.Slider {...button} label={text('accent.hue')} defaultValue={50} />
      );
    case 'Chip':
      return removed ? (
        <UI.Button {...button} onPress={() => setRemoved(false)}>
          {children}
        </UI.Button>
      ) : (
        <UI.Chip {...button} kind="filter" defaultSelected={selected}>
          {children}
        </UI.Chip>
      );
    case 'TextField':
      return (
        <UI.TextField
          {...button}
          label={text('ui.name')}
          description={text('ui.help')}
          isInvalid={state === 'error'}
          validationBehavior="aria"
          errorMessage={text('ui.invalid')}
          prefix="@"
          suffix={<UI.Icon name="check" />}
        />
      );
    case 'Select':
      return (
        <UI.Select
          {...button}
          label={text('accent.variant')}
          options={options}
          defaultSelectedKey={selected ? 'two' : 'one'}
          isInvalid={state === 'error'}
          validationBehavior="aria"
          errorMessage={text('ui.invalid')}
          searchable
        />
      );
    case 'Menu':
      return (
        <UI.Menu
          label={text('ui.component.Menu')}
          trigger={
            <UI.Button {...button} variant="tonal">
              {children}
            </UI.Button>
          }
          searchable
          searchLabel={text('ui.search')}
          options={options}
          onAction={notify}
        />
      );
    case 'Dialog':
      return (
        <>
          <UI.Button
            {...button}
            variant="outlined"
            onPress={() => setOpen(true)}
          >
            {children}
          </UI.Button>
          <UI.Dialog
            title={text('ui.component.Dialog')}
            closeLabel={text('ui.close')}
            isOpen={open}
            onOpenChange={setOpen}
          >
            <p>{text('ui.help')}</p>
            <UI.TextField label={text('ui.name')} />
          </UI.Dialog>
        </>
      );
    case 'SideSheet':
      return (
        <>
          <UI.Button
            {...button}
            variant="outlined"
            onPress={() => setOpen(true)}
          >
            {children}
          </UI.Button>
          <UI.SideSheet
            title={text('ui.component.SideSheet')}
            closeLabel={text('ui.close')}
            isOpen={open}
            onOpenChange={setOpen}
          >
            <p>{text('ui.help')}</p>
          </UI.SideSheet>
        </>
      );
    case 'Popover':
      return (
        <DialogTrigger>
          <UI.Button {...button} variant="outlined">
            {children}
          </UI.Button>
          <UI.Popover>
            <AriaDialog aria-label={text('ui.component.Popover')}>
              <p>{text('ui.help')}</p>
              <UI.TextField label={text('ui.name')} />
            </AriaDialog>
          </UI.Popover>
        </DialogTrigger>
      );
    case 'Tooltip':
      return (
        <UI.Tooltip
          trigger={
            <UI.IconButton {...button} icon="palette" aria-label={children} />
          }

          rich={state === 'focus'}
        >
          {state === 'focus' ? (
            <>
              <strong>{text('ui.component.Tooltip')}</strong>
              <p>{text('ui.richTooltip')}</p>
            </>
          ) : (
            text('ui.help')
          )}
        </UI.Tooltip>
      );
    case 'Snackbar':
      return (
        <UI.Button {...button} onPress={notify}>
          {text('ui.notifications')}
        </UI.Button>
      );
    case 'Card':
      return (
        <UI.Card>
          <h4>{text('ui.component.Card')}</h4>
          <p>{text('ui.help')}</p>
          <UI.Button variant="text">{children}</UI.Button>
        </UI.Card>
      );
    case 'List':
    case 'ListItem':
      return (
        <UI.List
          aria-label={text('ui.component.List')}
          selectionMode="single"
          defaultSelectedKeys={selected ? ['one'] : []}
          disabledKeys={disabled ? ['one'] : []}
        >
          <UI.ListItem
            id="one"
            textValue={text('ui.first')}
            className={className}
            leading={<UI.Icon name="palette" />}
            description={text('ui.help')}
          >
            {text('ui.first')}
          </UI.ListItem>
        </UI.List>
      );
    case 'Divider':
      return <UI.Divider />;
    case 'LoadingIndicator':
      return <UI.LoadingIndicator label={text('ui.loading')} />;
    case 'FocusRing':
      return (
        <UI.FocusRing className={className}>
          <UI.Button variant="outlined">{children}</UI.Button>
        </UI.FocusRing>
      );
    case 'VisuallyHidden':
      return (
        <UI.Button variant="text">
          <UI.Icon name="check" />
          <UI.VisuallyHidden>{text('ui.hiddenSample')}</UI.VisuallyHidden>
        </UI.Button>
      );
    case 'StateLayer':
      return (
        <UI.Button {...button} variant="tonal">
          {children}
        </UI.Button>
      );
  }
}
export function ComponentGallery() {
  const locale = useAppStore((s) => s.locale);
  const text = (key: MessageKey) => t(key, locale);
  const [target, setTarget] = useState(0);
  const spring = UI.useSpring(target);
  const narrow = UI.useMediaQuery('(max-width: 640px)');
  const row = (label: string, children: ReactNode) => (
    <div className="gallery-variants">
      <h3>{label}</h3>
      <div>{children}</div>
    </div>
  );
  return (
    <section
      id="components"
      aria-labelledby="components-title"
      className="component-gallery"
    >
      <header>
        <p className="eyebrow">{text('design.eyebrow')}</p>
        <h2 id="components-title">{text('ui.gallery')}</h2>
        <p>{text('ui.galleryHint')}</p>
      </header>
      {row(
        text('ui.variants'),
        <>
          {(['filled', 'tonal', 'elevated', 'outlined', 'text'] as const).map(
            (variant) => (
              <UI.Button key={variant} variant={variant}>
                {variant}
              </UI.Button>
            ),
          )}
          {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <UI.Button key={size} size={size}>
              {size.toUpperCase()}
            </UI.Button>
          ))}
          <UI.Button shape="square" defaultSelected={false}>
            {text('ui.square')}
          </UI.Button>
          <UI.Button shape="round" defaultSelected={false}>
            {text('ui.round')}
          </UI.Button>
          <UI.ButtonGroup aria-label={text('ui.component.ButtonGroup')}>
            <UI.Button variant="tonal">1</UI.Button>
            <UI.Button variant="tonal">2</UI.Button>
          </UI.ButtonGroup>
          <UI.Chip kind="assist">Assist</UI.Chip>
          <UI.Chip
            kind="input"
            onRemove={() => UI.snackbarQueue.add({ message: text('ui.saved') })}
            removeLabel={text('ui.dismissChip')}
          >
            Input
          </UI.Chip>
          <UI.Checkbox isIndeterminate>{text('ui.selected')}</UI.Checkbox>
          <UI.TextField label={text('ui.name')} variant="filled" />
          <UI.Select
            label={text('accent.variant')}
            options={[
              { id: 'one', label: text('ui.first') },
              { id: 'two', label: text('ui.second') },
            ]}
          />
          <UI.SideSheet
            mode="docked"
            title={text('ui.docked')}
            closeLabel={text('ui.close')}
          >
            <p>{text('ui.help')}</p>
          </UI.SideSheet>
          <UI.Card variant="elevated">{text('ui.component.Card')}</UI.Card>
          <UI.Card variant="outlined">{text('ui.component.Card')}</UI.Card>
        </>,
      )}
      {(Object.keys(galleryEntries) as Name[]).map((name) => (
        <section
          key={name}
          aria-labelledby={`gallery-${name}`}
          data-component={name}
          className="gallery-component"
        >
          <h3 id={`gallery-${name}`}>{text(`ui.component.${name}`)}</h3>
          <div className="gallery-matrix">
            {galleryEntries[name].map((state) => (
              <div
                key={state}
                className={`gallery-cell gallery-state-${state}`}
                data-state={state}
              >
                <span className="gallery-state-label">
                  {text(`ui.${state}`)}
                </span>
                <div className="gallery-example">
                  <Example name={name} state={state} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      {row(
        text('ui.motionHelpers'),
        <>
          <UI.Button onPress={() => setTarget((p) => (p === 0 ? 100 : 0))}>
            {text('design.play')}
          </UI.Button>
          <output className="expression">{spring.toFixed(2)}</output>
          <code>{narrow ? '≤ 640px' : '＞ 640px'}</code>
        </>,
      )}
      <UI.Snackbar
        label={text('ui.notifications')}
        closeLabel={text('ui.close')}
      />
    </section>
  );
}
