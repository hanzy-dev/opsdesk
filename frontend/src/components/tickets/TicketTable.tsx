import { Link } from "react-router-dom";
import type { Ticket } from "../../types/ticket";
import { formatDateTime } from "../../utils/date";
import { StatusBadge } from "./StatusBadge";

type TicketTableProps = {
  tickets: Ticket[];
};

export function TicketTable({ tickets }: TicketTableProps) {
  return (
    <div className="panel table-panel">
      <div className="table-panel__header">
        <div>
          <p className="section-eyebrow">Ringkasan</p>
          <h2>Daftar tiket aktif</h2>
        </div>
        <p>{tickets.length} tiket</p>
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
                <td className="ticket-table__priority">{formatPriority(ticket.priority)}</td>
                <td>{ticket.reporterName}</td>
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
