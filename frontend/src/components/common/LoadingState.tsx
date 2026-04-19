type LoadingStateProps = {
  label?: string;
  lines?: number;
  compact?: boolean;
};

export function LoadingState({ label = "Memuat data...", lines = 3, compact = false }: LoadingStateProps) {
  return (
    <div className={`panel loading-state ${compact ? "loading-state--compact" : ""}`}>
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
      <div aria-hidden="true" className="loading-state__skeleton">
        {Array.from({ length: lines }).map((_, index) => (
          <span className="loading-state__line" key={index} />
        ))}
      </div>
    </div>
  );
}
