import { AppIconBadge } from "./AppIcon";

type ErrorStateProps = {
  title?: string;
  message: string;
  referenceId?: string;
  onRetry?: () => void;
  eyebrow?: string;
  actionLabel?: string;
  supportText?: string;
  className?: string;
  surface?: "secondary" | "subtle" | "ghost";
};

export function ErrorState({
  title = "Terjadi kendala",
  message,
  referenceId,
  onRetry,
  eyebrow = "Status",
  actionLabel = "Coba Lagi",
  supportText,
  className,
  surface = "secondary",
}: ErrorStateProps) {
  return (
    <div
      aria-live="assertive"
      className={[
        "empty-shell",
        "empty-shell--centered",
        "empty-shell--default",
        `surface surface--${surface}`,
        "panel",
        "error-state",
        "state-card",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="alert"
    >
      <div className="state-card__body">
        <AppIconBadge className="state-card__icon" name="error" tone="accent" />
        <p className="section-eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        <p>{message}</p>
        {supportText ? <p className="state-card__support">{supportText}</p> : null}
        {referenceId ? <p className="state-card__reference">Kode referensi: {referenceId}</p> : null}
      </div>
      {onRetry ? (
        <div className="state-card__actions">
          <button className="button button--secondary" onClick={onRetry} type="button">
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
