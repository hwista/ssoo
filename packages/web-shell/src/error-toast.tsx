'use client';

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { toast, Toaster, type ExternalToast } from 'sonner';
import { Button, Dialog, DialogContent, DialogFooter, DialogTitle } from '@ssoo/web-ui';
import { SsooErrorNotice } from './error-recovery';
import { getSsooErrorMessage } from './error-model';

type ToastMessage = Parameters<typeof toast.error>[0];

function resolveMessage(message: ToastMessage): ReactNode {
  const value = typeof message === 'function' ? message() : message;
  return typeof value === 'string' ? getSsooErrorMessage(value) : value;
}

export function SsooErrorToast({ message, description }: {
  message: ToastMessage;
  description?: ExternalToast['description'];
}) {
  return <SsooErrorNotice compact className="text-inherit">
    <span className="block font-medium">{resolveMessage(message)}</span>
    {description != null ? <span className="block">{resolveMessage(description)}</span> : null}
  </SsooErrorNotice>;
}

function notify(kind: 'error' | 'warning', message: ToastMessage, options?: ExternalToast) {
  // A JSX title selects Sonner's custom layout and hides its action/cancel buttons.
  return toast[kind](() => <SsooErrorToast message={message} description={options?.description} />, {
    ...options,
    description: undefined,
  });
}

const error: typeof toast.error = (message, options) => notify('error', message, options);
const warning: typeof toast.warning = (message, options) => notify('warning', message, options);
const promise: typeof toast.promise = (task, options) => {
  let failed = false;
  let failureNotice: ReactNode;
  return toast.promise(task, {
    ...options,
    error: async (failure: unknown) => {
      failed = true;
      const message = typeof options?.error === 'function'
        ? await options.error(failure)
        : options?.error ?? getSsooErrorMessage(failure);
      const description = typeof options?.description === 'function'
        ? await options.description(failure)
        : options?.description;
      failureNotice = <SsooErrorToast message={message} description={description} />;
      return '';
    },
    description: async (value) => failed ? failureNotice : typeof options?.description === 'function'
      ? options.description(value)
      : options?.description,
  });
};

/** Keep IDs, actions, dismissal and successful notifications; route every error through the template. */
export const ssooToast = Object.assign((...args: Parameters<typeof toast>) => toast(...args), toast, {
  error, warning, promise,
});

function ErrorAcknowledgement({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const [open, setOpen] = useState(true);
  const [returnFocus] = useState(() => typeof document === 'undefined' ? null : document.activeElement);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dismiss = () => {
    setOpen(false);
    onDismiss();
  };

  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) dismiss(); }}>
    <DialogContent
      aria-describedby={undefined}
      className="max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] overflow-y-auto"
      onPointerDownOutside={(event) => event.preventDefault()}
      onOpenAutoFocus={(event) => { event.preventDefault(); confirmRef.current?.focus(); }}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus();
      }}
    >
      <DialogTitle>오류 안내</DialogTitle>
      <SsooErrorNotice>{message}</SsooErrorNotice>
      <DialogFooter><Button ref={confirmRef} type="button" onClick={dismiss}>확인</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

/** Acknowledgements use the modal focus stack, so an open task dialog cannot block them. */
export function showSsooErrorAlert(error: unknown) {
  const message = getSsooErrorMessage(error);
  const id = toast.error(() => <ErrorAcknowledgement message={message} onDismiss={() => toast.dismiss(id)} />, {
    duration: Infinity,
    // Sonner owns the ID/dismissal lifecycle; the Dialog portal owns visible UI and focus.
    style: { display: 'none' },
  });
  return id;
}

/** React boundaries do not receive asynchronous or event-handler exceptions. */
export function SsooToaster(props: ComponentProps<typeof Toaster>) {
  useEffect(() => {
    const report = (error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      ssooToast.error(getSsooErrorMessage(error), { id: 'ssoo-unhandled-error' });
    };
    const onError = (event: ErrorEvent) => {
      if (event.error || event.message) report(event.error ?? event.message);
    };
    const onRejection = (event: PromiseRejectionEvent) => report(event.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return <Toaster {...props} />;
}
