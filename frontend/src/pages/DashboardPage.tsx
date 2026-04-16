import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listTickets } from "../api/tickets";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { TicketTable } from "../components/tickets/TicketTable";
import { useAuth } from "../modules/auth/AuthContext";
import type { Ticket } from "../types/ticket";
import { formatDateTime } from "../utils/date";

export function DashboardPage() {
  const { permissions } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTickets() {
    setLoading(true);
    setError(null);

    try {
      const data = await listTickets({
        page: 1,
        pageSize: 5,
        sortBy: "updated_at",
        sortOrder: "desc",
      });
      setTickets(data.items);
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

  const recentlyUpdated = useMemo(
    () =>
      [...tickets]
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
        .slice(0, 3),
    [tickets],
  );

  if (loading) {
    return <LoadingState label="Menyiapkan ringkasan operasional tiket..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Dashboard belum siap ditampilkan"
        message={error}
        onRetry={() => void loadTickets()}
      />
    );
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
          description={
            permissions.canCreateTickets
              ? "Mulai dengan membuat tiket baru untuk melihat alur kerja OpsDesk."
              : "Belum ada tiket yang dapat Anda akses saat ini."
          }
          action={permissions.canCreateTickets ? (
            <Link className="button button--primary" to="/tickets/new">
              Buat Tiket
            </Link>
          ) : undefined}
        />
      ) : (
        <div className="stack-lg">
          <TicketTable
            tickets={tickets.slice(0, 5)}
            title="Tiket terbaru"
            eyebrow="Ringkasan cepat"
            helperText="Lima tiket dengan pembaruan terbaru untuk membantu triase awal."
          />

          <section className="panel stack-md">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Perlu perhatian</p>
                <h3>Aktivitas tiket terbaru</h3>
              </div>
              <Link className="button button--secondary" to="/tickets">
                Lihat Semua Tiket
              </Link>
            </div>

            <div className="activity-list">
              {recentlyUpdated.map((ticket) => (
                <Link className="activity-card" key={ticket.id} to={`/tickets/${ticket.id}`}>
                  <div>
                    <strong>{ticket.title}</strong>
                    <p>
                      {ticket.id} • {ticket.reporterName}
                    </p>
                  </div>
                  <span>{formatDateTime(ticket.updatedAt)}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
