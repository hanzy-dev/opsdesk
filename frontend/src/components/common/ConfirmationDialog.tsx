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
  if (!isOpen) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        aria-describedby="confirmation-dialog-description"
        aria-labelledby="confirmation-dialog-title"
        aria-modal="true"
        className="dialog"
        role="dialog"
      >
        <div className="dialog__content">
          <p className="section-eyebrow">Konfirmasi</p>
          <h2 id="confirmation-dialog-title">{title}</h2>
          <p id="confirmation-dialog-description">{message}</p>
        </div>
        <div className="dialog__actions">
          <button className="button button--secondary" disabled={isSubmitting} onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button className="button button--primary" disabled={isSubmitting} onClick={() => void onConfirm()} type="button">
            {isSubmitting ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
