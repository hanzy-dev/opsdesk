import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listTickets } from "../api/tickets";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { TicketTable } from "../components/tickets/TicketTable";
import { useAuth } from "../modules/auth/AuthContext";
import type { Ticket } from "../types/ticket";

export function TicketsPage() {
  const { permissions } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Ticket["status"]>("all");
  const [showAssignedToMe, setShowAssignedToMe] = useState(false);

  async function loadTickets() {
    setLoading(true);
    setError(null);

    try {
      const data = await listTickets({ assignedToMe: showAssignedToMe });
      setTickets(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Daftar tiket belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, [showAssignedToMe]);

  const stats = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "open").length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
    }),
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === "all" ? true : ticket.status === statusFilter;
      const matchesQuery =
        normalizedQuery === ""
          ? true
          : [ticket.id, ticket.title, ticket.reporterName, ticket.reporterEmail, ticket.assigneeName, ticket.description]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [searchQuery, statusFilter, tickets]);

  if (loading) {
    return <LoadingState label="Memuat daftar tiket operasional..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Daftar tiket belum tersedia"
        message={error}
        onRetry={() => void loadTickets()}
      />
    );
  }

  return (
    <section className="stack-lg">
      <div className="hero-card hero-card--compact">
        <div>
          <p className="section-eyebrow">Antrian layanan</p>
          <h2>Kelola tiket bantuan dan insiden</h2>
        </div>
        {permissions.canCreateTickets ? (
          <Link className="button button--primary" to="/tickets/new">
            Buat Tiket
          </Link>
        ) : null}
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

      <div className="panel stack-md">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Pencarian cepat</p>
            <h3>Temukan tiket lebih cepat untuk verifikasi operasional</h3>
          </div>
          <p className="filter-summary">
            Menampilkan {filteredTickets.length} dari {tickets.length} tiket
          </p>
        </div>

        <div className="filter-grid">
          <label className="field field--search">
            <span>Cari tiket</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari ID tiket, judul, atau nama pelapor"
            />
          </label>

          <label className="field">
            <span>Filter status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | Ticket["status"])}
            >
              <option value="all">Semua status</option>
              <option value="open">Terbuka</option>
              <option value="in_progress">Sedang ditangani</option>
              <option value="resolved">Selesai</option>
            </select>
          </label>

          {permissions.canAssignTickets ? (
            <label className="field">
              <span>Penugasan</span>
              <select
                value={showAssignedToMe ? "assigned" : "all"}
                onChange={(event) => setShowAssignedToMe(event.target.value === "assigned")}
              >
                <option value="all">Semua tiket</option>
                <option value="assigned">Ditugaskan kepada saya</option>
              </select>
            </label>
          ) : null}
        </div>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          title="Belum ada tiket yang tercatat"
          description={
            permissions.canCreateTickets
              ? "Buat tiket pertama agar daftar operasional mulai terisi."
              : "Belum ada tiket yang dapat Anda akses saat ini."
          }
          action={permissions.canCreateTickets ? (
            <Link className="button button--primary" to="/tickets/new">
              Buat Tiket Sekarang
            </Link>
          ) : undefined}
        />
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          title="Tidak ada tiket yang cocok"
          description="Coba ubah kata kunci pencarian atau pilih status lain agar hasil lebih luas."
        />
      ) : (
        <TicketTable
          tickets={filteredTickets}
          title="Daftar tiket"
          eyebrow="Operasional"
          helperText="Gunakan pencarian dan filter status untuk memeriksa tiket aktif dengan lebih cepat."
        />
      )}
    </section>
  );
}
