import { useRef, type CSSProperties } from 'react';
import { Link } from 'react-aria-components';
import { Icon, type IconName } from './Icon';
import { StateLayer } from './StateLayer';
import { useSpring } from './useSpring';
import './NavigationRail.css';
export interface NavigationDestination {
  id: string;
  href: string;
  label: string;
  icon: IconName;
  badge?: string;
}
export interface NavigationRailProps {
  label: string;
  items: readonly NavigationDestination[];
  selectedId: string;
  expanded?: boolean;
  scaled?: boolean;
}
export function NavigationRail({
  label,
  items,
  selectedId,
  expanded = false,
  scaled = false,
}: NavigationRailProps) {
  const selected = Math.max(
    0,
    items.findIndex((item) => item.id === selectedId),
  );
  const y = useSpring(selected);
  const rail = useRef<HTMLElement>(null);
  return (
    <nav
      ref={rail}
      aria-label={label}
      className="ui-navigation-rail"
      data-expanded={expanded || undefined}
    >
      <span
        className="ui-rail-pill"
        style={
          {
            transform: `translateY(${y * (scaled ? 4.5 : 72)}${scaled ? 'rem' : 'px'})`,
          } as CSSProperties
        }
        aria-hidden="true"
      />
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          aria-current={item.id === selectedId ? 'page' : undefined}
          className="ui-rail-link"
        >
          <StateLayer />
          <span className="ui-rail-icon">
            <Icon name={item.icon} filled={item.id === selectedId} />
            {item.badge && <span className="ui-rail-badge">{item.badge}</span>}
          </span>
          {' '}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
