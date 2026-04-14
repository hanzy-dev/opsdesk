type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Memuat data..." }: LoadingStateProps) {
  return (
    <div className="panel loading-state">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
