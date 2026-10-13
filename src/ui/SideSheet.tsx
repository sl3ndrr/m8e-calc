import type { ReactNode } from 'react';
import { Dialog } from './Dialog';
import './SideSheet.css';
export interface SideSheetProps {
  title: string;
  children: ReactNode;
  closeLabel: string;
  mode?: 'docked' | 'modal';
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export function SideSheet({ mode = 'modal', ...props }: SideSheetProps) {
  if (mode === 'docked')
    return (
      <aside
        className="ui-side-sheet ui-side-sheet-docked"
        aria-label={props.title}
      >
        <h3>{props.title}</h3>
        {props.children}
      </aside>
    );
  return <Dialog {...props} className="ui-side-sheet" />;
}
