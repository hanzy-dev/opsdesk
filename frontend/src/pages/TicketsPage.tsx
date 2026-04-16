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
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Ticket["status"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Ticket["priority"]>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | "me" | "unassigned">("all");
  const [sortBy, setSortBy] = useState<"updated_at" | "created_at" | "priority" | "status">("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  async function loadTickets() {
    setLoading(true);
    setError(null);

    try {
      const data = await listTickets({
        q: submittedQuery,
        status: statusFilter,
        priority: priorityFilter,
        assignee: assigneeFilter,
        page,
        pageSize: pagination.pageSize,
        sortBy,
        sortOrder,
      });
      setTickets(data.items);
      setPagination({
        page: data.pagination.page,
        pageSize: data.pagination.page_size,
        totalItems: data.pagination.total_items,
        totalPages: data.pagination.total_pages,
        hasNext: data.pagination.has_next,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Daftar tiket belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, [submittedQuery, statusFilter, priorityFilter, assigneeFilter, page, sortBy, sortOrder]);

  const stats = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "open").length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
    }),
    [tickets],
  );

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
            Menampilkan {tickets.length} dari {pagination.totalItems} tiket
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
              onChange={(event) => {
                setStatusFilter(event.target.value as "all" | Ticket["status"]);
                setPage(1);
              }}
            >
              <option value="all">Semua status</option>
              <option value="open">Terbuka</option>
              <option value="in_progress">Sedang ditangani</option>
              <option value="resolved">Selesai</option>
            </select>
          </label>

          <label className="field">
            <span>Filter prioritas</span>
            <select
              value={priorityFilter}
              onChange={(event) => {
                setPriorityFilter(event.target.value as "all" | Ticket["priority"]);
                setPage(1);
              }}
            >
              <option value="all">Semua prioritas</option>
              <option value="high">Tinggi</option>
              <option value="medium">Sedang</option>
              <option value="low">Rendah</option>
            </select>
          </label>

          {permissions.canAssignTickets ? (
            <label className="field">
              <span>Penugasan</span>
              <select
                value={assigneeFilter}
                onChange={(event) => {
                  setAssigneeFilter(event.target.value as "all" | "me" | "unassigned");
                  setPage(1);
                }}
              >
                <option value="all">Semua tiket</option>
                <option value="me">Ditugaskan kepada saya</option>
                <option value="unassigned">Belum ditugaskan</option>
              </select>
            </label>
          ) : null}

          <label className="field">
            <span>Urutkan berdasarkan</span>
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as "updated_at" | "created_at" | "priority" | "status");
                setPage(1);
              }}
            >
              <option value="updated_at">Terakhir diperbarui</option>
              <option value="created_at">Tanggal dibuat</option>
              <option value="priority">Prioritas</option>
              <option value="status">Status</option>
            </select>
          </label>

          <label className="field">
            <span>Arah urutan</span>
            <select
              value={sortOrder}
              onChange={(event) => {
                setSortOrder(event.target.value as "asc" | "desc");
                setPage(1);
              }}
            >
              <option value="desc">Menurun</option>
              <option value="asc">Menaik</option>
            </select>
          </label>
        </div>

        <div className="form-actions">
          <button
            className="button button--secondary"
            onClick={() => {
              setPage(1);
              setSubmittedQuery(searchQuery.trim());
            }}
            type="button"
          >
            Cari
          </button>
          <button
            className="button button--secondary"
            onClick={() => {
              setSearchQuery("");
              setSubmittedQuery("");
              setStatusFilter("all");
              setPriorityFilter("all");
              setAssigneeFilter("all");
              setSortBy("updated_at");
              setSortOrder("desc");
              setPage(1);
            }}
            type="button"
          >
            Reset Filter
          </button>
        </div>
      </div>

      {pagination.totalItems === 0 ? (
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
      ) : tickets.length === 0 ? (
        <EmptyState
          title="Tidak ada tiket yang cocok"
          description="Coba ubah kata kunci, filter, atau urutan agar hasil lebih luas."
        />
      ) : (
        <div className="stack-md">
          <TicketTable
            tickets={tickets}
            title="Daftar tiket"
            eyebrow="Operasional"
            helperText="Explorer tiket ini memakai pencarian, filter, urutan, dan pagination dari server."
          />

          <div className="panel">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Navigasi halaman</p>
                <h3>
                  Halaman {pagination.page} dari {Math.max(pagination.totalPages, 1)}
                </h3>
              </div>
              <p className="filter-summary">{pagination.totalItems} tiket ditemukan</p>
            </div>

            <div className="form-actions">
              <button
                className="button button--secondary"
                disabled={pagination.page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Sebelumnya
              </button>
              <button
                className="button button--secondary"
                disabled={!pagination.hasNext}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
