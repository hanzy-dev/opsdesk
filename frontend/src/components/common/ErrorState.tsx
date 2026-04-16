type ErrorStateProps = {
  title?: string;
  message: string;
  referenceId?: string;
  onRetry?: () => void;
};

export function ErrorState({ title = "Terjadi kendala", message, referenceId, onRetry }: ErrorStateProps) {
  return (
    <div className="panel error-state">
      <div>
        <p className="section-eyebrow">Status</p>
        <h3>{title}</h3>
        <p>{message}</p>
        {referenceId ? <p className="form-hint">Kode referensi: {referenceId}</p> : null}
      </div>
      {onRetry ? (
        <button className="button button--secondary" onClick={onRetry} type="button">
          Coba Lagi
        </button>
      ) : null}
    </div>
  );
}
