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
  /** Keep title and close action outside scrolling form content. */
  scrollable?: boolean;
}
export function Dialog({
  title,
  children,
  closeLabel,
  className = '',
  scrollable = false,
  ...props
}: DialogProps) {
  const [overlayKey, overlayRef] = useOverlayTransition();
  return (
    <ModalOverlay
      {...props}
      defaultOpen={
        overlayKey > 0 && props.defaultOpen != null ? false : props.defaultOpen
      }
      key={overlayKey}
      ref={overlayRef}
      isDismissable={props.isDismissable ?? true}
      className="ui-modal-overlay"
    >
      <Modal
        className={`ui-modal ${className}`}
        data-scrollable={scrollable || undefined}
      >
        <AriaDialog className="ui-dialog">
          {({ close }) =>
            scrollable ? (
              <>
                <div className="ui-dialog-header">
                  <Heading slot="title" className="type-headline-small">
                    {title}
                  </Heading>
                  <Button variant="text" onPress={close}>
                    {closeLabel}
                  </Button>
                </div>
                <div className="ui-dialog-content">{children}</div>
              </>
            ) : (
              <>
                <Heading slot="title">{title}</Heading>
                {children}
                <Button variant="text" onPress={close}>
                  {closeLabel}
                </Button>
              </>
            )
          }
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
