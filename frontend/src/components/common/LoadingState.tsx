type LoadingStateProps = {
  label?: string;
  lines?: number;
  compact?: boolean;
  eyebrow?: string;
  supportText?: string;
  skeletonTitle?: string;
};

export function LoadingState({
  label = "Memuat data...",
  lines = 3,
  compact = false,
  eyebrow = "Memuat",
  supportText,
  skeletonTitle,
}: LoadingStateProps) {
  return (
    <div
      aria-live="polite"
      className={`panel loading-state state-card motion-reveal ${compact ? "loading-state--compact" : "loading-state--page"}`}
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
