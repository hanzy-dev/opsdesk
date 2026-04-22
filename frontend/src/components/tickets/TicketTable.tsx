import { Link } from "react-router-dom";
import { AppIcon } from "../common/AppIcon";
import type { Ticket } from "../../types/ticket";
import { formatDateTime } from "../../utils/date";
import { formatSlaDueLabel, getSlaState, getSlaToneLabel } from "../../utils/sla";
import { getPriorityLabel, getTicketCategoryLabel, getTicketTeamLabel } from "../../utils/ticketMetadata";
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
    <div className="panel panel--section table-panel">
      <div className="table-panel__header">
        <div>
          <p className="section-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {helperText ? <p className="table-panel__helper">{helperText}</p> : null}
        </div>
        <p className="table-panel__count">
          <AppIcon name="tickets" size="sm" />
          <span>{tickets.length} tiket</span>
        </p>
      </div>

      <div className="ticket-table-wrap">
        <table className="ticket-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Judul</th>
              <th>Kategori</th>
              <th>Area</th>
              <th>Status</th>
              <th>Prioritas</th>
              <th>Target</th>
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
                    <span>{ticket.id}</span>
                    <AppIcon name="chevronRight" size="sm" />
                  </Link>
                </td>
                <td>
                  <div className="ticket-table__title-cell">
                    <strong>{ticket.title}</strong>
                  </div>
                </td>
                <td className="ticket-table__meta-cell">
                  <span className="table-tag">{getTicketCategoryLabel(ticket.category)}</span>
                </td>
                <td className="ticket-table__meta-cell">
                  <span className="table-tag table-tag--muted">{getTicketTeamLabel(ticket.team)}</span>
                </td>
                <td>
                  <StatusBadge status={ticket.status} />
                </td>
                <td>
                  <span className={`priority-pill priority-pill--${ticket.priority}`}>
                    <AppIcon name="dashboard" size="sm" />
                    <span>{getPriorityLabel(ticket.priority)}</span>
                  </span>
                </td>
                <td className="ticket-table__meta-cell">
                  <span className={`sla-pill sla-pill--${getSlaState(ticket)}`}>{getSlaToneLabel(getSlaState(ticket))}</span>
                  <small className="ticket-table__subtle">{formatSlaDueLabel(ticket)}</small>
                </td>
                <td className="ticket-table__meta-cell">{ticket.reporterName}</td>
                <td className="ticket-table__meta-cell">{ticket.assigneeName || "Belum ditugaskan"}</td>
                <td className="ticket-table__meta-cell">{formatDateTime(ticket.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
