import { Link } from "react-router-dom";
import type { Ticket } from "../../types/ticket";
import { formatDateTime } from "../../utils/date";
import { StatusBadge } from "./StatusBadge";

type TicketTableProps = {
  tickets: Ticket[];
  title?: string;
  eyebrow?: string;
  helperText?: string;
};

export function TicketTable({
  tickets,
  title = "Daftar tiket aktif",
  eyebrow = "Ringkasan",
  helperText,
}: TicketTableProps) {
  return (
    <div className="panel table-panel">
      <div className="table-panel__header">
        <div>
          <p className="section-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {helperText ? <p className="table-panel__helper">{helperText}</p> : null}
        </div>
        <p className="table-panel__count">{tickets.length} tiket</p>
      </div>

      <div className="ticket-table-wrap">
        <table className="ticket-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Judul</th>
              <th>Status</th>
              <th>Prioritas</th>
              <th>Pelapor</th>
              <th>Petugas</th>
              <th>Diperbarui</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>
                  <Link to={`/tickets/${ticket.id}`} className="table-link">
                    {ticket.id}
                  </Link>
                </td>
                <td>{ticket.title}</td>
                <td>
                  <StatusBadge status={ticket.status} />
                </td>
                <td>
                  <span className={`priority-pill priority-pill--${ticket.priority}`}>{formatPriority(ticket.priority)}</span>
                </td>
                <td>{ticket.reporterName}</td>
                <td>{ticket.assigneeName || "Belum ditugaskan"}</td>
                <td>{formatDateTime(ticket.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatPriority(priority: Ticket["priority"]) {
  switch (priority) {
    case "high":
      return "Tinggi";
    case "medium":
      return "Sedang";
    default:
      return "Rendah";
  }
}
