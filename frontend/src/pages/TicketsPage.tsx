import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ApiError } from "../api/client";
import { listTickets } from "../api/tickets";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { TicketTable } from "../components/tickets/TicketTable";
import { useAuth } from "../modules/auth/AuthContext";
import type { Ticket } from "../types/ticket";
import { getErrorMessage, getErrorReferenceId } from "../utils/errors";

type TicketViewPreset = {
  key: "all" | "mine" | "assigned";
  eyebrow: string;
  title: string;
  helperText: string;
  emptyTitle: string;
  emptyDescription: string;
  assigneeFilter: "all" | "me" | "unassigned";
  isSearchLocked?: boolean;
};

const allTicketsPreset: TicketViewPreset = {
  key: "all",
  eyebrow: "Antrean layanan",
  title: "Kelola tiket bantuan dan insiden",
  helperText: "Temukan tiket dengan cepat untuk verifikasi operasional",
  emptyTitle: "Belum ada tiket yang tercatat",
  emptyDescription: "Buat tiket pertama agar daftar operasional mulai terisi.",
  assigneeFilter: "all",
};

const mineTicketsPreset: TicketViewPreset = {
  key: "mine",
  eyebrow: "Akses personal",
  title: "Pantau tiket yang Anda ajukan",
  helperText: "Tampilan ini membantu Anda meninjau tiket yang berada dalam akses akun saat ini.",
  emptyTitle: "Belum ada tiket pada akun Anda",
  emptyDescription: "Tiket yang Anda buat akan muncul di halaman ini.",
  assigneeFilter: "all",
};

const assignedTicketsPreset: TicketViewPreset = {
  key: "assigned",
  eyebrow: "Antrian personal",
  title: "Fokus pada tiket yang ditugaskan ke Anda",
  helperText: "Preset ini mengunci daftar pada tiket yang sudah ditugaskan kepada akun Anda.",
  emptyTitle: "Belum ada tiket yang ditugaskan",
  emptyDescription: "Tiket yang Anda ambil alih akan muncul di halaman ini.",
  assigneeFilter: "me",
  isSearchLocked: true,
};

function resolvePreset(pathname: string): TicketViewPreset {
  if (pathname === "/tickets/mine") {
    return mineTicketsPreset;
  }

  if (pathname === "/tickets/assigned") {
    return assignedTicketsPreset;
  }

  return allTicketsPreset;
}

export function TicketsPage() {
  const { permissions, session } = useAuth();
  const location = useLocation();
  const preset = useMemo(() => resolvePreset(location.pathname), [location.pathname]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorReferenceId, setErrorReferenceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Ticket["status"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Ticket["priority"]>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | "me" | "unassigned">(preset.assigneeFilter);
  const [sortBy, setSortBy] = useState<"updated_at" | "created_at" | "priority" | "status">("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setSearchQuery("");
    setSubmittedQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setAssigneeFilter(preset.assigneeFilter);
    setSortBy("updated_at");
    setSortOrder("desc");
    setPage(1);
  }, [preset]);

  async function loadTickets() {
    if (loading) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    setErrorReferenceId(null);

    try {
      const data = await fetchTicketsWithFallback({
        assigneeFilter,
        canUseAssignedFallback: preset.key === "assigned" && assigneeFilter === "me",
        page,
        pageSize: pagination.pageSize,
        priorityFilter,
        searchQuery: submittedQuery,
        sessionSubject: session?.subject,
        sortBy,
        sortOrder,
        statusFilter,
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
      setError(getErrorMessage(error, "Daftar tiket belum bisa dimuat."));
      setErrorReferenceId(getErrorReferenceId(error) ?? null);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, [submittedQuery, statusFilter, priorityFilter, assigneeFilter, page, sortBy, sortOrder, preset.key, session?.subject]);

  const stats = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "open").length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
    }),
    [tickets],
  );

  if (loading) {
    return (
      <LoadingState
        eyebrow={preset.key === "assigned" ? "Penugasan" : "Daftar tiket"}
        label={preset.key === "assigned" ? "Menyiapkan tiket yang ditugaskan kepada Anda..." : "Memuat daftar tiket operasional..."}
        supportText={
          preset.key === "assigned"
            ? "Kami sedang mengambil tiket yang menjadi tanggung jawab aktif Anda."
            : "Kami sedang mengambil data tiket terbaru beserta filter yang sedang aktif."
        }
        lines={6}
      />
    );
  }

  if (error && tickets.length === 0) {
    return (
      <ErrorState
        title={preset.key === "assigned" ? "Daftar penugasan belum tersedia" : "Daftar tiket belum tersedia"}
        message={
          preset.key === "assigned"
            ? "Tiket yang ditugaskan ke Anda belum bisa ditampilkan untuk saat ini."
            : "Daftar tiket belum bisa ditampilkan untuk saat ini."
        }
        referenceId={errorReferenceId ?? undefined}
        supportText={
          preset.key === "assigned"
            ? "Coba muat ulang halaman ini. Jika perlu, Anda juga bisa membuka antrean utama untuk melihat tiket secara manual."
            : "Coba muat ulang halaman ini atau sesuaikan filter setelah data berhasil dimuat kembali."
        }
        onRetry={() => void loadTickets()}
      />
    );
  }

  return (
    <section className="stack-lg page-shell page-shell--wide page-flow tickets-page">
      <div className="hero-card hero-card--compact hero-card--spotlight">
        <div>
          <p className="section-eyebrow">{preset.eyebrow}</p>
          <h2>{preset.title}</h2>
          {preset.key === "assigned" ? (
            <p className="hero-card__supporting">Pantau beban kerja aktif Anda tanpa hasil kosong, blank, atau status yang membingungkan.</p>
          ) : null}
        </div>
        {permissions.canCreateTickets ? (
          <Link className="button button--primary" to="/tickets/new">
            Buat Tiket
          </Link>
        ) : null}
      </div>

      <div className="metrics-grid metrics-grid--compact">
        <article className="metric-card metric-card--premium">
          <p>Total tiket</p>
          <strong>{stats.total}</strong>
        </article>
        <article className="metric-card metric-card--premium">
          <p>Tiket terbuka</p>
          <strong>{stats.open}</strong>
        </article>
        <article className="metric-card metric-card--premium">
          <p>Tiket selesai</p>
          <strong>{stats.resolved}</strong>
        </article>
      </div>

      <div className="panel panel--section stack-md tickets-toolbar">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Pencarian cepat</p>
            <h3>{preset.helperText}</h3>
          </div>
          <p className="filter-summary">
            Menampilkan {tickets.length} dari {pagination.totalItems} tiket
          </p>
        </div>

        {isRefreshing ? <p className="filter-summary">Memperbarui daftar tiket...</p> : null}
        {error && tickets.length > 0 ? (
          <div className="inline-feedback inline-feedback--error">
            <strong>Daftar belum sepenuhnya diperbarui.</strong>
            <p>{error}</p>
            {errorReferenceId ? <small>Kode referensi: {errorReferenceId}</small> : null}
          </div>
        ) : null}

        <div className="filter-grid filter-grid--tickets">
          <label className="field field--search field--span-2">
            <span>Cari tiket</span>
            <input
              disabled={preset.isSearchLocked}
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
                disabled={preset.isSearchLocked}
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

        <div className="form-actions form-actions--compact">
          <button
            className="button button--secondary"
            disabled={preset.isSearchLocked}
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
              setAssigneeFilter(preset.assigneeFilter);
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
          eyebrow={preset.key === "assigned" ? "Penugasan" : preset.key === "mine" ? "Akun Saya" : "Daftar Tiket"}
          title={preset.emptyTitle}
          description={
            preset.key === "assigned"
              ? "Belum ada tiket yang sedang menjadi tanggung jawab Anda. Ambil tiket dari antrean utama saat siap menangani."
              : permissions.canCreateTickets
                ? preset.emptyDescription
                : "Belum ada tiket yang dapat Anda akses saat ini."
          }
          supportText={
            preset.key === "assigned"
              ? "Saat tiket baru ditugaskan atau Anda mengambil tiket dari antrean utama, daftarnya akan muncul di sini."
              : preset.key === "mine"
                ? "Gunakan halaman ini untuk memantau tiket yang Anda kirim begitu ada data yang tercatat."
                : "Daftar ini akan mulai terisi setelah tiket baru dibuat atau diimpor ke alur operasional."
          }
          action={permissions.canCreateTickets ? (
            <Link className="button button--primary" to="/tickets/new">
              Buat Tiket Sekarang
            </Link>
          ) : undefined}
        />
      ) : tickets.length === 0 ? (
        <EmptyState
          eyebrow="Pencarian"
          title="Tidak ada tiket yang cocok"
          description="Coba ubah kata kunci, filter, atau urutan agar hasil pencarian lebih relevan."
          supportText="Tidak ada tiket yang sesuai dengan kombinasi filter saat ini, tetapi data lain mungkin tetap tersedia di antrean utama."
          action={
            <button
              className="button button--secondary"
              onClick={() => {
                setSearchQuery("");
                setSubmittedQuery("");
                setStatusFilter("all");
                setPriorityFilter("all");
                setAssigneeFilter(preset.assigneeFilter);
                setSortBy("updated_at");
                setSortOrder("desc");
                setPage(1);
              }}
              type="button"
            >
              Reset Pencarian
            </button>
          }
        />
      ) : (
        <div className="stack-md">
          <TicketTable
            tickets={tickets}
            title="Daftar tiket"
            eyebrow="Operasional"
            helperText="Daftar ini memakai pencarian, filter, pengurutan, dan pagination dari server."
          />

          <div className="panel panel--section">
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

type TicketsFallbackOptions = {
  assigneeFilter: "all" | "me" | "unassigned";
  canUseAssignedFallback: boolean;
  page: number;
  pageSize: number;
  priorityFilter: "all" | Ticket["priority"];
  searchQuery: string;
  sessionSubject?: string;
  sortBy: "updated_at" | "created_at" | "priority" | "status";
  sortOrder: "asc" | "desc";
  statusFilter: "all" | Ticket["status"];
};

async function fetchTicketsWithFallback(options: TicketsFallbackOptions) {
  try {
    return await listTickets({
      q: options.searchQuery,
      status: options.statusFilter,
      priority: options.priorityFilter,
      assignee: options.assigneeFilter,
      page: options.page,
      pageSize: options.pageSize,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
    });
  } catch (error) {
    if (!shouldUseAssignedFallback(error, options)) {
      throw error;
    }

    const fallbackData = await listTickets({
      status: options.statusFilter,
      priority: options.priorityFilter,
      assignee: "all",
      page: 1,
      pageSize: 100,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
    });

    const assignedTickets = fallbackData.items.filter((ticket) => ticket.assigneeId === options.sessionSubject);
    const start = (options.page - 1) * options.pageSize;
    const totalItems = assignedTickets.length;

    return {
      items: assignedTickets.slice(start, start + options.pageSize),
      pagination: {
        page: options.page,
        page_size: options.pageSize,
        total_items: totalItems,
        total_pages: totalItems === 0 ? 0 : Math.ceil(totalItems / options.pageSize),
        has_next: start + options.pageSize < totalItems,
      },
    };
  }
}

function shouldUseAssignedFallback(error: unknown, options: TicketsFallbackOptions) {
  return (
    options.canUseAssignedFallback &&
    error instanceof ApiError &&
    error.status >= 500 &&
    Boolean(options.sessionSubject)
  );
}
