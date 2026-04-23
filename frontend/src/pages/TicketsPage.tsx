import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ApiError } from "../api/client";
import { listTickets } from "../api/tickets";
import { AppIcon, AppIconBadge } from "../components/common/AppIcon";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { SelectControl } from "../components/common/SelectControl";
import { TicketTable } from "../components/tickets/TicketTable";
import { getFeaturedHelpArticles } from "../utils/selfService";
import { useAuth } from "../modules/auth/AuthContext";
import type { Ticket } from "../types/ticket";
import { useDebouncedValue } from "../utils/useDebouncedValue";
import { getErrorMessage, getErrorReferenceId } from "../utils/errors";
import { ticketCategoryOptions, ticketTeamOptions } from "../utils/ticketMetadata";

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

const statusOptions: { value: "all" | Ticket["status"]; label: string }[] = [
  { value: "all", label: "Semua status" },
  { value: "open", label: "Terbuka" },
  { value: "in_progress", label: "Sedang ditangani" },
  { value: "resolved", label: "Selesai" },
];

const priorityOptions: { value: "all" | Ticket["priority"]; label: string }[] = [
  { value: "all", label: "Semua prioritas" },
  { value: "high", label: "Tinggi" },
  { value: "medium", label: "Sedang" },
  { value: "low", label: "Rendah" },
];

const categoryOptions = [{ value: "all", label: "Semua kategori" }, ...ticketCategoryOptions];
const teamOptions = [{ value: "all", label: "Semua area" }, ...ticketTeamOptions];

const assigneeOptions: { value: "all" | "me" | "unassigned"; label: string }[] = [
  { value: "all", label: "Semua tiket" },
  { value: "me", label: "Ditugaskan kepada saya" },
  { value: "unassigned", label: "Belum ditugaskan" },
];

const sortByOptions: { value: "updated_at" | "created_at" | "priority" | "status"; label: string }[] = [
  { value: "updated_at", label: "Terakhir diperbarui" },
  { value: "created_at", label: "Tanggal dibuat" },
  { value: "priority", label: "Prioritas" },
  { value: "status", label: "Status" },
];

const sortOrderOptions: { value: "asc" | "desc"; label: string }[] = [
  { value: "desc", label: "Menurun" },
  { value: "asc", label: "Menaik" },
];

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
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Ticket["status"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Ticket["priority"]>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | Ticket["category"]>("all");
  const [teamFilter, setTeamFilter] = useState<"all" | Ticket["team"]>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | "me" | "unassigned">(preset.assigneeFilter);
  const [sortBy, setSortBy] = useState<"updated_at" | "created_at" | "priority" | "status">("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim(), preset.isSearchLocked ? 0 : 280);
  const isReporterPortal = !permissions.canViewOperationalTickets;
  const featuredHelpArticles = useMemo(() => getFeaturedHelpArticles(2), []);

  useEffect(() => {
    setSearchQuery("");
    setActiveSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setTeamFilter("all");
    setAssigneeFilter(preset.assigneeFilter);
    setSortBy("updated_at");
    setSortOrder("desc");
    setPage(1);
  }, [preset]);

  useEffect(() => {
    if (preset.isSearchLocked) {
      return;
    }

    setPage(1);
    setActiveSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, preset.isSearchLocked]);

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
        categoryFilter,
        page,
        pageSize: pagination.pageSize,
        priorityFilter,
        searchQuery: activeSearchQuery,
        sessionSubject: session?.subject,
        sortBy,
        sortOrder,
        statusFilter,
        teamFilter,
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
  }, [activeSearchQuery, statusFilter, priorityFilter, categoryFilter, teamFilter, assigneeFilter, page, sortBy, sortOrder, preset.key, session?.subject]);

  const stats = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "open").length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
    }),
    [tickets],
  );
  const hasActiveFilters =
    Boolean(activeSearchQuery) ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    categoryFilter !== "all" ||
    teamFilter !== "all" ||
    assigneeFilter !== preset.assigneeFilter ||
    sortBy !== "updated_at" ||
    sortOrder !== "desc";

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
        skeletonTitle={preset.key === "assigned" ? "Menyusun antrean penugasan personal" : "Menyusun tabel tiket dan filter operasional"}
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
          ) : isReporterPortal ? (
            <p className="hero-card__supporting">
              Gunakan portal ini untuk melacak progres tiket, membaca pembaruan publik, dan berpindah ke panduan bantuan bila masalahnya masih bisa diselesaikan sendiri.
            </p>
          ) : null}
        </div>
        <div className="dashboard-hero__actions">
          {permissions.canCreateTickets ? (
            <Link className="button button--primary" to="/tickets/new">
              <AppIcon name="plus" size="sm" />
              Buat Tiket
            </Link>
          ) : null}
          {isReporterPortal ? (
            <Link className="button button--secondary" to="/help">
              <AppIcon name="help" size="sm" />
              Pusat Bantuan
            </Link>
          ) : null}
        </div>
      </div>

      <div className="metrics-grid metrics-grid--compact">
        <article className="metric-card metric-card--premium">
          <p className="metric-card__label">
            <AppIconBadge name="tickets" size="sm" />
            <span>Total tiket</span>
          </p>
          <strong>{stats.total}</strong>
        </article>
        <article className="metric-card metric-card--premium">
          <p className="metric-card__label">
            <AppIconBadge name="search" size="sm" tone="accent" />
            <span>Tiket terbuka</span>
          </p>
          <strong>{stats.open}</strong>
        </article>
        <article className="metric-card metric-card--premium">
          <p className="metric-card__label">
            <AppIconBadge name="dashboard" size="sm" tone="cool" />
            <span>Tiket selesai</span>
          </p>
          <strong>{stats.resolved}</strong>
        </article>
      </div>

      <div className="tickets-shell">
        <div className="tickets-shell__main stack-md">
          <div className="tickets-toolbar tickets-toolbar--surface stack-md motion-reveal">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Pencarian cepat</p>
                <h3>{preset.helperText}</h3>
              </div>
              <p className="filter-summary">
                Menampilkan {tickets.length} dari {pagination.totalItems} tiket
              </p>
            </div>

            {isRefreshing || (!preset.isSearchLocked && searchQuery.trim() !== activeSearchQuery) ? (
              <p className="filter-summary">
                {searchQuery.trim() !== activeSearchQuery ? "Menyaring daftar tiket..." : "Memperbarui daftar tiket..."}
              </p>
            ) : null}
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
                {!preset.isSearchLocked ? <small>Pencarian diterapkan otomatis setelah Anda berhenti mengetik sejenak.</small> : null}
              </label>

              <label className="field">
                <span>Filter status</span>
                <SelectControl
                  ariaLabel="Filter status"
                  value={statusFilter}
                  onChange={(nextStatus) => {
                    setStatusFilter(nextStatus);
                    setPage(1);
                  }}
                  options={statusOptions}
                />
              </label>

              <label className="field">
                <span>Filter prioritas</span>
                <SelectControl
                  ariaLabel="Filter prioritas"
                  value={priorityFilter}
                  onChange={(nextPriority) => {
                    setPriorityFilter(nextPriority);
                    setPage(1);
                  }}
                  options={priorityOptions}
                />
              </label>

              <label className="field">
                <span>Kategori</span>
                <SelectControl
                  ariaLabel="Filter kategori"
                  value={categoryFilter}
                  onChange={(nextCategory) => {
                    setCategoryFilter(nextCategory as "all" | Ticket["category"]);
                    setPage(1);
                  }}
                  options={categoryOptions}
                />
              </label>

              <label className="field">
                <span>Area tujuan</span>
                <SelectControl
                  ariaLabel="Filter area tujuan"
                  value={teamFilter}
                  onChange={(nextTeam) => {
                    setTeamFilter(nextTeam as "all" | Ticket["team"]);
                    setPage(1);
                  }}
                  options={teamOptions}
                />
              </label>

              {permissions.canAssignTickets ? (
                <label className="field">
                  <span>Penugasan</span>
                  <SelectControl
                    ariaLabel="Filter penugasan"
                    disabled={preset.isSearchLocked}
                    value={assigneeFilter}
                    onChange={(nextAssignee) => {
                      setAssigneeFilter(nextAssignee);
                      setPage(1);
                    }}
                    options={assigneeOptions}
                  />
                </label>
              ) : null}

              <label className="field">
                <span>Urutkan berdasarkan</span>
                <SelectControl
                  ariaLabel="Urutkan berdasarkan"
                  value={sortBy}
                  onChange={(nextSortBy) => {
                    setSortBy(nextSortBy);
                    setPage(1);
                  }}
                  options={sortByOptions}
                />
              </label>

              <label className="field">
                <span>Arah urutan</span>
                <SelectControl
                  ariaLabel="Arah urutan"
                  value={sortOrder}
                  onChange={(nextSortOrder) => {
                    setSortOrder(nextSortOrder);
                    setPage(1);
                  }}
                  options={sortOrderOptions}
                />
              </label>
            </div>

            <div className="form-actions form-actions--compact">
              <button
                className="button button--secondary"
                disabled={preset.isSearchLocked}
                onClick={() => {
                  setPage(1);
                  setActiveSearchQuery(searchQuery.trim());
                }}
                type="button"
              >
                <AppIcon name="search" size="sm" />
                Cari
              </button>
              <button
                className="button button--secondary"
                onClick={() => {
                  setSearchQuery("");
                  setActiveSearchQuery("");
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setCategoryFilter("all");
                  setTeamFilter("all");
                  setAssigneeFilter(preset.assigneeFilter);
                  setSortBy("updated_at");
                  setSortOrder("desc");
                  setPage(1);
                }}
                type="button"
              >
                <AppIcon name="reset" size="sm" />
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
                    setActiveSearchQuery("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setCategoryFilter("all");
                    setTeamFilter("all");
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
            <>
              <TicketTable
                tickets={tickets}
                title={isReporterPortal ? "Portal tiket saya" : "Daftar tiket"}
                eyebrow={isReporterPortal ? "Pelapor" : "Operasional"}
                showOperatorSignals={!isReporterPortal}
                helperText={
                  isReporterPortal
                    ? "Gunakan daftar ini untuk membuka detail tiket, memantau progres, dan melihat pembaruan terbaru."
                    : "Daftar ini memakai pencarian, filter, pengurutan, dan pagination dari server."
                }
              />

              <div className="tickets-pager motion-reveal motion-reveal--delay-2">
                <div>
                  <p className="section-eyebrow">Navigasi halaman</p>
                  <h3>
                    Halaman {pagination.page} dari {Math.max(pagination.totalPages, 1)}
                  </h3>
                  <p className="filter-summary">{pagination.totalItems} tiket ditemukan</p>
                </div>

                <div className="form-actions">
                  <button
                    className="button button--secondary"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    type="button"
                  >
                    <AppIcon name="panelClose" size="sm" />
                    Sebelumnya
                  </button>
                  <button
                    className="button button--secondary"
                    disabled={!pagination.hasNext}
                    onClick={() => setPage((current) => current + 1)}
                    type="button"
                  >
                    Berikutnya
                    <AppIcon name="panelOpen" size="sm" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <aside className="tickets-shell__rail stack-md">
          <section className="rail-section rail-section--emphasis motion-reveal motion-reveal--delay-2">
            <div>
              <p className="section-eyebrow">{isReporterPortal ? "Nilai portal" : "Konteks tampilan"}</p>
              <h3>{isReporterPortal ? "Bukan hanya kirim tiket" : "Filter aktif dan fokus kerja"}</h3>
            </div>
            <div className="compact-list">
              {isReporterPortal ? (
                <>
                  <article className="compact-list__item">
                    <strong>Lacak progres dengan jelas</strong>
                    <p>Lihat status tiket Anda, kapan terakhir diperbarui, dan tiket mana yang masih perlu dipantau.</p>
                  </article>
                  <article className="compact-list__item">
                    <strong>Pahami pembaruan tiket</strong>
                    <p>Masuk ke detail tiket untuk membaca komentar publik, riwayat, dan langkah berikutnya.</p>
                  </article>
                  <article className="compact-list__item">
                    <strong>Cari panduan saat perlu</strong>
                    <p>Pusat bantuan lokal memberi panduan ringkas untuk login, jaringan, perangkat, dan status tiket.</p>
                  </article>
                </>
              ) : (
                <>
                  <article className="compact-list__item">
                    <strong>Preset aktif</strong>
                    <p>{preset.helperText}</p>
                  </article>
                  <article className="compact-list__item">
                    <strong>Filter sedang aktif</strong>
                    <p>{hasActiveFilters ? "Daftar sedang dipersempit oleh filter atau urutan khusus." : "Belum ada filter tambahan selain preset tampilan."}</p>
                  </article>
                  <article className="compact-list__item">
                    <strong>Mode pencarian</strong>
                    <p>{preset.isSearchLocked ? "Pencarian terkunci agar fokus tetap pada penugasan Anda." : "Pencarian terbuka untuk eksplorasi antrean secara bebas."}</p>
                  </article>
                </>
              )}
            </div>
          </section>

          <section className="rail-section motion-reveal motion-reveal--delay-3">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">{isReporterPortal ? "Panduan cepat" : "Preset tampilan"}</p>
                <h3>{isReporterPortal ? "Artikel yang sering dibuka" : "Pindah fokus tanpa mengulang filter"}</h3>
              </div>
              {isReporterPortal ? (
                <Link className="button button--secondary" to="/help">
                  Lihat Semua
                </Link>
              ) : null}
            </div>
            <div className="compact-link-list">
              {isReporterPortal
                ? featuredHelpArticles.map((article) => (
                    <article className="compact-link-list__item motion-lift" key={article.id}>
                      <strong>{article.title}</strong>
                      <p>{article.summary}</p>
                      <small>{article.readTimeMinutes} menit baca</small>
                    </article>
                  ))
                : [
                    { to: "/tickets", title: "Antrean utama", description: "Lihat semua tiket yang ada dalam jangkauan operasional." },
                    { to: "/tickets/assigned", title: "Ditugaskan ke saya", description: "Fokus pada tiket yang menjadi tanggung jawab aktif Anda." },
                    { to: "/tickets/mine", title: "Akses personal", description: "Lihat tiket dari sudut pandang pelapor bila perlu validasi pengalaman akhir." },
                  ].map((item) => (
                    <Link className="compact-link-list__item compact-link-list__item--interactive" key={item.to} to={item.to}>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </Link>
                  ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

type TicketsFallbackOptions = {
  assigneeFilter: "all" | "me" | "unassigned";
  canUseAssignedFallback: boolean;
  categoryFilter: "all" | Ticket["category"];
  page: number;
  pageSize: number;
  priorityFilter: "all" | Ticket["priority"];
  searchQuery: string;
  sessionSubject?: string;
  sortBy: "updated_at" | "created_at" | "priority" | "status";
  sortOrder: "asc" | "desc";
  statusFilter: "all" | Ticket["status"];
  teamFilter: "all" | Ticket["team"];
};

async function fetchTicketsWithFallback(options: TicketsFallbackOptions) {
  try {
    return await listTickets({
      q: options.searchQuery,
      status: options.statusFilter,
      priority: options.priorityFilter,
      category: options.categoryFilter,
      team: options.teamFilter,
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
      category: options.categoryFilter,
      team: options.teamFilter,
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
