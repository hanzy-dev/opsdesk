import type { ReactNode } from "react";
import { AppIconBadge } from "./AppIcon";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  eyebrow?: string;
  supportText?: string;
  className?: string;
  surface?: "secondary" | "subtle" | "ghost";
  width?: "narrow" | "default" | "wide";
};

export function EmptyState({
  title,
  description,
  action,
  eyebrow,
  supportText,
  className,
  surface = "secondary",
  width = "default",
}: EmptyStateProps) {
  return (
    <div
      aria-live="polite"
      className={[
        "empty-shell",
        "empty-shell--centered",
        `empty-shell--${width}`,
        `surface surface--${surface}`,
        "panel",
        "empty-state",
        "state-card",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
    >
      <AppIconBadge className="state-card__icon" name="empty" tone="cool" />
      {eyebrow ? <span className="empty-state__eyebrow">{eyebrow}</span> : null}
      <div className="empty-state__content">
        <h3>{title}</h3>
        <p>{description}</p>
        {supportText ? <p className="state-card__support">{supportText}</p> : null}
      </div>
      {action ? <div className="empty-state__actions">{action}</div> : null}
    </div>
  );
}
