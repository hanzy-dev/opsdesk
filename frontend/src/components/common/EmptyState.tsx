import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  eyebrow?: string;
};

export function EmptyState({ title, description, action, eyebrow }: EmptyStateProps) {
  return (
    <div className="panel empty-state">
      <div className="empty-state__icon">O</div>
      {eyebrow ? <span className="empty-state__eyebrow">{eyebrow}</span> : null}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
