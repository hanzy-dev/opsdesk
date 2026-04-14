import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listTickets } from "../api/tickets";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { TicketTable } from "../components/tickets/TicketTable";
import type { Ticket } from "../types/ticket";

export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTickets() {
    setLoading(true);
    setError(null);

    try {
      const data = await listTickets();
      setTickets(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Daftar tiket belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  const stats = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "open").length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
    }),
    [tickets],
  );

  if (loading) {
    return <LoadingState label="Memuat daftar tiket..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void loadTickets()} />;
  }

  return (
    <section className="stack-lg">
      <div className="hero-card hero-card--compact">
        <div>
          <p className="section-eyebrow">Antrian layanan</p>
          <h2>Kelola tiket bantuan dan insiden</h2>
        </div>
        <Link className="button button--primary" to="/tickets/new">
          Buat Tiket
        </Link>
      </div>

      <div className="metrics-grid metrics-grid--compact">
        <article className="metric-card">
          <p>Total tiket</p>
          <strong>{stats.total}</strong>
        </article>
        <article className="metric-card">
          <p>Tiket terbuka</p>
          <strong>{stats.open}</strong>
        </article>
        <article className="metric-card">
          <p>Tiket selesai</p>
          <strong>{stats.resolved}</strong>
        </article>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          title="Belum ada tiket yang tercatat"
          description="Buat tiket pertama agar daftar operasional mulai terisi."
          action={
            <Link className="button button--primary" to="/tickets/new">
              Buat Tiket Sekarang
            </Link>
          }
        />
      ) : (
        <TicketTable tickets={tickets} />
      )}
    </section>
  );
}
