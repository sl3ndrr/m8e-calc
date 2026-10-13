import type { ReactNode } from 'react';
import {
  Dialog as AriaDialog,
  Heading,
  Modal,
  ModalOverlay,
  type ModalOverlayProps,
} from 'react-aria-components';
import { Button } from './Button';
import './Dialog.css';
export interface DialogProps extends Omit<
  ModalOverlayProps,
  'children' | 'className'
> {
  title: string;
  children: ReactNode;
  closeLabel: string;
  className?: string;
}
export function Dialog({
  title,
  children,
  closeLabel,
  className = '',
  ...props
}: DialogProps) {
  return (
    <ModalOverlay
      {...props}
      isDismissable={props.isDismissable ?? true}
      className="ui-modal-overlay"
    >
      <Modal className={`ui-modal ${className}`}>
        <AriaDialog className="ui-dialog">
          {({ close }) => (
            <>
              <Heading slot="title">{title}</Heading>
              {children}
              <Button variant="text" onPress={close}>
                {closeLabel}
              </Button>
            </>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
