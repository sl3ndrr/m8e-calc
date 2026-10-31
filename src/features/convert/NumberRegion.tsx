import type { ReactNode } from 'react';

/** A complete number scrolls independently of the adjacent copy action. */
export function NumberRegion({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    // This named region is an interactive scroll viewport, not a copy button.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Home/End scroll this viewport only.
    <div
      className="convert-number-scroll"
      role="region"
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Scroll access is required in Firefox/WebKit too; upstream documents this exception.
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
          return;
        if (event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        event.currentTarget.scrollLeft =
          event.key === 'Home' ? 0 : event.currentTarget.scrollWidth;
      }}
    >
      {children}
    </div>
  );
}
