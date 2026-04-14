import type { TicketStatus } from "../../types/ticket";

const statusMap: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: "Terbuka", className: "badge badge--open" },
  in_progress: { label: "Sedang Ditangani", className: "badge badge--progress" },
  resolved: { label: "Selesai", className: "badge badge--resolved" },
};

type StatusBadgeProps = {
  status: TicketStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusMap[status];
  return <span className={config.className}>{config.label}</span>;
}
