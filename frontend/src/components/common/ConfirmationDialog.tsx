import { useEffect, useId, useRef } from "react";

type ConfirmationDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  isOpen: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmationDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  isOpen,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onCancel]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    cancelButtonRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="dialog-backdrop dialog-backdrop--open"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onCancel();
        }
      }}
      role="presentation"
    >
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="dialog dialog--open"
        role="dialog"
      >
        <div className="dialog__content">
          <p className="section-eyebrow">Konfirmasi</p>
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId}>{message}</p>
        </div>
        <div className="dialog__actions">
          <button className="button button--secondary" disabled={isSubmitting} onClick={onCancel} ref={cancelButtonRef} type="button">
            {cancelLabel}
          </button>
          <button
            aria-busy={isSubmitting}
            className="button button--primary"
            disabled={isSubmitting}
            onClick={() => void onConfirm()}
            type="button"
          >
            {isSubmitting ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
