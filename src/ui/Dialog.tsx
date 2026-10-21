import type { ReactNode } from 'react';
import {
  Dialog as AriaDialog,
  Heading,
  Modal,
  ModalOverlay,
  type ModalOverlayProps,
} from 'react-aria-components';
import { Button } from './Button';
import { useOverlayTransition } from './useOverlayTransition';
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
  const transition = useOverlayTransition();
  return (
    <ModalOverlay
      {...props}
      key={transition.key}
      onTransitionCancel={transition.onTransitionCancel}
      isDismissable={props.isDismissable ?? true}
      className="ui-modal-overlay"
    >
      <Modal className={`ui-modal ${className}`}>
        {({ isExiting }) => (
        <AriaDialog className="ui-dialog" inert={isExiting}>
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
        )}
      </Modal>
    </ModalOverlay>
  );
}
