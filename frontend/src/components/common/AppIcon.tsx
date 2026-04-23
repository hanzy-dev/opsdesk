import type { ReactElement } from "react";

export type AppIconName =
  | "dashboard"
  | "tickets"
  | "plus"
  | "help"
  | "mine"
  | "assigned"
  | "profile"
  | "settings"
  | "logout"
  | "menu"
  | "close"
  | "panelOpen"
  | "panelClose"
  | "chevronDown"
  | "chevronRight"
  | "search"
  | "reset"
  | "api"
  | "notification"
  | "empty"
  | "error"
  | "open";

type AppIconProps = {
  name: AppIconName;
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
};

const iconPaths: Record<AppIconName, ReactElement> = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.5" />
      <rect x="13.5" y="10.5" width="7" height="10" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  tickets: (
    <>
      <path d="M6 5.5h12a2 2 0 0 1 2 2v2.5a1.5 1.5 0 0 0 0 3V15.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V13a1.5 1.5 0 0 0 0-3V7.5a2 2 0 0 1 2-2Z" />
      <path d="M9 8.5h6" />
      <path d="M9 12h5" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  help: (
    <>
      <path d="M6 5.5h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 2v-13a2 2 0 0 1 2-2Z" />
      <path d="M9 9h6" />
      <path d="M9 12.5h6" />
      <path d="M9 16h3.5" />
    </>
  ),
  mine: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19c1.8-3 4.2-4.5 7-4.5s5.2 1.5 7 4.5" />
    </>
  ),
  assigned: (
    <>
      <path d="M5 7.5h8" />
      <path d="M5 12h6" />
      <path d="M5 16.5h5" />
      <circle cx="17" cy="8.5" r="2.5" />
      <path d="M13.8 18c.8-2.1 2-3.2 3.2-3.2s2.4 1.1 3.2 3.2" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19c1.8-3 4.2-4.5 7-4.5s5.2 1.5 7 4.5" />
    </>
  ),
  settings: (
    <>
      <path d="M12 3.5v3" />
      <path d="M12 17.5v3" />
      <path d="M3.5 12h3" />
      <path d="M17.5 12h3" />
      <path d="M6.2 6.2l2.1 2.1" />
      <path d="M15.7 15.7l2.1 2.1" />
      <path d="M17.8 6.2l-2.1 2.1" />
      <path d="M8.3 15.7l-2.1 2.1" />
      <circle cx="12" cy="12" r="3.25" />
    </>
  ),
  logout: (
    <>
      <path d="M10 5H7.5A2.5 2.5 0 0 0 5 7.5v9A2.5 2.5 0 0 0 7.5 19H10" />
      <path d="M13 8.5 17 12l-4 3.5" />
      <path d="M9.5 12H17" />
    </>
  ),
  menu: (
    <>
      <path d="M4.5 7h15" />
      <path d="M4.5 12h15" />
      <path d="M4.5 17h15" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  panelOpen: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M10 4v16" />
      <path d="M13.5 12h3" />
      <path d="M15.5 10l2 2-2 2" />
    </>
  ),
  panelClose: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M10 4v16" />
      <path d="M16.5 12h-3" />
      <path d="M14.5 10l-2 2 2 2" />
    </>
  ),
  chevronDown: <path d="m7 10 5 5 5-5" />,
  chevronRight: <path d="m10 7 5 5-5 5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="5.5" />
      <path d="m16 16 3.5 3.5" />
    </>
  ),
  reset: (
    <>
      <path d="M20 11a8 8 0 1 1-2.3-5.6" />
      <path d="M20 5v6h-6" />
    </>
  ),
  api: (
    <>
      <path d="M8 7.5 5 12l3 4.5" />
      <path d="M16 7.5 19 12l-3 4.5" />
      <path d="m13.5 5-3 14" />
    </>
  ),
  notification: (
    <>
      <path d="M8.5 18h7" />
      <path d="M6.5 16.5h11l-1.2-1.8a4.5 4.5 0 0 1-.8-2.6V10a3.5 3.5 0 1 0-7 0v2.1c0 .9-.3 1.8-.8 2.6l-1.2 1.8Z" />
      <path d="M10.2 19.5a1.9 1.9 0 0 0 3.6 0" />
    </>
  ),
  empty: (
    <>
      <rect x="5" y="6" width="14" height="12" rx="2.5" />
      <path d="M8.5 10h7" />
      <path d="M8.5 13.5h4.5" />
    </>
  ),
  error: (
    <>
      <path d="M12 4.5 4.5 18h15L12 4.5Z" />
      <path d="M12 9v4" />
      <circle cx="12" cy="15.5" r=".8" fill="currentColor" stroke="none" />
    </>
  ),
  open: (
    <>
      <path d="M8 16 16 8" />
      <path d="M10 8h6v6" />
      <path d="M8 8H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-1" />
    </>
  ),
};

export function AppIcon({ name, size = "md", className, title }: AppIconProps) {
  const sizeClass = `app-icon--${size}`;

  return (
    <svg
      aria-hidden={title ? undefined : "true"}
      className={["app-icon", sizeClass, className].filter(Boolean).join(" ")}
      fill="none"
      role={title ? "img" : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      {iconPaths[name]}
    </svg>
  );
}

export function AppIconBadge({
  name,
  tone = "neutral",
  size = "md",
  className,
}: {
  name: AppIconName;
  tone?: "neutral" | "accent" | "cool";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span className={["app-icon-badge", `app-icon-badge--${tone}`, className].filter(Boolean).join(" ")}>
      <AppIcon name={name} size={size} />
    </span>
  );
}
