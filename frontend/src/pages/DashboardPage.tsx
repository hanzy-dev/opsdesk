import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listTickets } from "../api/tickets";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { TicketTable } from "../components/tickets/TicketTable";
import type { Ticket } from "../types/ticket";

export function DashboardPage() {
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
      setError(error instanceof Error ? error.message : "Data dashboard belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  const metrics = useMemo(() => {
    const open = tickets.filter((ticket) => ticket.status === "open").length;
    const inProgress = tickets.filter((ticket) => ticket.status === "in_progress").length;
    const resolved = tickets.filter((ticket) => ticket.status === "resolved").length;

    return [
      { label: "Tiket Terbuka", value: open, tone: "is-amber" },
      { label: "Sedang Ditangani", value: inProgress, tone: "is-blue" },
      { label: "Selesai", value: resolved, tone: "is-green" },
    ];
  }, [tickets]);

  if (loading) {
    return <LoadingState label="Memuat ringkasan dashboard..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void loadTickets()} />;
  }

  return (
    <section className="stack-lg">
      <div className="hero-card">
        <p className="section-eyebrow">Pusat kendali</p>
        <h2>Pantau antrean tiket secara cepat</h2>
        <p>
          Halaman ini menampilkan ringkasan operasional tiket agar proses triase dan tindak lanjut lebih mudah dipantau.
        </p>
      </div>

      <div className="metrics-grid">
        {metrics.map((metric) => (
          <article className={`metric-card ${metric.tone}`} key={metric.label}>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          title="Belum ada tiket"
          description="Mulai dengan membuat tiket baru untuk melihat alur kerja OpsDesk."
          action={
            <Link className="button button--primary" to="/tickets/new">
              Buat Tiket
            </Link>
          }
        />
      ) : (
        <TicketTable tickets={tickets.slice(0, 5)} />
      )}
    </section>
  );
}
