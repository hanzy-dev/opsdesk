type LoadingStateProps = {
  label?: string;
  lines?: number;
};

export function LoadingState({ label = "Memuat data...", lines = 3 }: LoadingStateProps) {
  return (
    <div className="panel loading-state">
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
