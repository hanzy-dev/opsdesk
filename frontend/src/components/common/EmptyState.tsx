import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  eyebrow?: string;
  supportText?: string;
};

export function EmptyState({ title, description, action, eyebrow, supportText }: EmptyStateProps) {
  return (
    <div className="panel empty-state state-card">
      <div className="empty-state__icon state-card__icon">O</div>
      {eyebrow ? <span className="empty-state__eyebrow">{eyebrow}</span> : null}
      <h3>{title}</h3>
      <p>{description}</p>
      {supportText ? <p className="state-card__support">{supportText}</p> : null}
      {action}
    </div>
  );
}
