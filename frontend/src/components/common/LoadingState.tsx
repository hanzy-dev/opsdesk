type LoadingStateProps = {
  label?: string;
  lines?: number;
  compact?: boolean;
  eyebrow?: string;
  supportText?: string;
};

export function LoadingState({
  label = "Memuat data...",
  lines = 3,
  compact = false,
  eyebrow = "Memuat",
  supportText,
}: LoadingStateProps) {
  return (
    <div className={`panel loading-state state-card ${compact ? "loading-state--compact" : ""}`}>
      <span className="spinner" aria-hidden="true" />
      <span className="empty-state__eyebrow">{eyebrow}</span>
      <p>{label}</p>
      {supportText ? <p className="state-card__support">{supportText}</p> : null}
      <div aria-hidden="true" className="loading-state__skeleton">
        {Array.from({ length: lines }).map((_, index) => (
          <span className="loading-state__line" key={index} />
        ))}
      </div>
    </div>
  );
}
