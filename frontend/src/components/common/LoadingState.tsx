type LoadingStateProps = {
  label?: string;
  lines?: number;
  compact?: boolean;
  eyebrow?: string;
  supportText?: string;
  skeletonTitle?: string;
  className?: string;
  surface?: "secondary" | "subtle" | "ghost";
};

export function LoadingState({
  label = "Memuat data...",
  lines = 3,
  compact = false,
  eyebrow = "Memuat",
  supportText,
  skeletonTitle,
  className,
  surface = "subtle",
}: LoadingStateProps) {
  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className={[
        "empty-shell",
        "empty-shell--centered",
        "empty-shell--default",
        `surface surface--${surface}`,
        "panel",
        "loading-state",
        "state-card",
        "motion-reveal",
        compact ? "loading-state--compact" : "loading-state--page",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
    >
      <div className="loading-state__header">
        <span className="spinner" aria-hidden="true" />
        <span className="empty-state__eyebrow">{eyebrow}</span>
      </div>
      <div className="loading-state__body">
        <p>{label}</p>
        {supportText ? <p className="state-card__support">{supportText}</p> : null}
      </div>
      <div aria-hidden="true" className="loading-state__skeleton">
        {skeletonTitle ? <span className="loading-state__block loading-state__block--title" /> : null}
        {Array.from({ length: lines }).map((_, index) => (
          <span className="loading-state__line" key={index} />
        ))}
      </div>
    </div>
  );
}
