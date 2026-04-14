import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="panel empty-state">
      <div className="empty-state__icon">◎</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
