import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { getTicketActivities, listTickets } from "../api/tickets";
import { AppIcon, AppIconBadge, type AppIconName } from "../components/common/AppIcon";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { StatusBadge } from "../components/tickets/StatusBadge";
import { useAuth } from "../modules/auth/AuthContext";
import type { Ticket, TicketActivity, TicketPriority } from "../types/ticket";
import { formatDateTime } from "../utils/date";
import { getErrorMessage } from "../utils/errors";
import { getSlaState } from "../utils/sla";
import { getTicketCategoryLabel, getTicketTeamLabel } from "../utils/ticketMetadata";

type DashboardStats = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  unassigned: number;
  assignedToMe: number;
  warning: number;
  breached: number;
};

type ActivityHighlight = {
  id: string;
  ticketId: string;
  ticketTitle: string;
  summary: string;
  actorLabel: string;
  timestamp: string;
  action: TicketActivity["action"];
};

type DistributionItem = {
  key: string;
  label: string;
  value: number;
  share: number;
  tone: "open" | "progress" | "resolved" | "accent" | "cool" | "neutral";
};

type TrendPoint = {
  dateKey: string;
  label: string;
  value: number;
};

type WorkloadItem = {
  key: string;
  label: string;
  sublabel: string;
  value: number;
};

type ResolutionInsight = {
  averageHours: number;
  sampleSize: number;
};

type DashboardData = {
  stats: DashboardStats;
  recentTickets: Ticket[];
  recentActivities: ActivityHighlight[];
  activityError: string | null;
  statusDistribution: DistributionItem[];
  categoryDistribution: DistributionItem[];
  teamDistribution: DistributionItem[];
  createdTrend: TrendPoint[];
  trendSummary: string;
  resolutionInsight: ResolutionInsight | null;
  workloadDistribution: WorkloadItem[];
  attentionTickets: Ticket[];
  dataScopeNote: string | null;
};

type DashboardStatCard = {
  label: string;
  value: number;
  description: string;
  to: string;
  tone: "is-neutral" | "is-amber" | "is-blue" | "is-green" | "is-violet";
  featured?: boolean;
};

const analyticsPageSize = 100;

export function DashboardPage() {
  const { permissions, session } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      const [allTicketsResponse, openTickets, inProgressTickets, resolvedTickets, unassignedTickets] =
        await Promise.all([
          listTickets({ page: 1, pageSize: analyticsPageSize, sortBy: "updated_at", sortOrder: "desc" }),
          listTickets({ page: 1, pageSize: 1, status: "open", sortBy: "updated_at", sortOrder: "desc" }),
          listTickets({ page: 1, pageSize: 1, status: "in_progress", sortBy: "updated_at", sortOrder: "desc" }),
          listTickets({ page: 1, pageSize: 1, status: "resolved", sortBy: "updated_at", sortOrder: "desc" }),
          listTickets({ page: 1, pageSize: 1, assignee: "unassigned", sortBy: "updated_at", sortOrder: "desc" }),
        ]);

      let assignedToMeCount = 0;
      if (permissions.canAssignTickets) {
        try {
          const assignedTickets = await listTickets({ page: 1, pageSize: 1, assignee: "me", sortBy: "updated_at", sortOrder: "desc" });
          assignedToMeCount = assignedTickets.pagination.total_items;
        } catch (requestError) {
          if (requestError instanceof ApiError && requestError.status >= 500 && session?.subject) {
            assignedToMeCount = allTicketsResponse.items.filter((ticket) => ticket.assigneeId === session.subject).length;
          } else {
            throw requestError;
          }
        }
      }

      const analyticsTickets = allTicketsResponse.items;
      const totalTickets = allTicketsResponse.pagination.total_items;
      const isCompleteAnalytics = totalTickets <= analyticsTickets.length;
      const recentTickets = analyticsTickets.slice(0, 6);

      const recentActivityResults = await Promise.allSettled(
        recentTickets.slice(0, 5).map(async (ticket) => ({
          ticket,
          activities: await getTicketActivities(ticket.id),
        })),
      );

      const recentActivities = recentActivityResults
        .filter((result): result is PromiseFulfilledResult<{ ticket: Ticket; activities: TicketActivity[] }> => result.status === "fulfilled")
        .flatMap((result) =>
          result.value.activities.map((activity) => ({
            id: activity.id,
            ticketId: activity.ticketId,
            ticketTitle: result.value.ticket.title,
            summary: activity.summary,
            actorLabel: formatActivityActor(activity),
            timestamp: activity.timestamp,
            action: activity.action,
          })),
        )
        .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
        .slice(0, 6);

      const activityError =
        recentTickets.length > 0 && recentActivities.length === 0 && recentActivityResults.some((result) => result.status === "rejected")
          ? "Sorotan aktivitas terbaru belum dapat dimuat penuh."
          : null;

      const resolutionInsight = isCompleteAnalytics
        ? await calculateResolutionInsight(analyticsTickets.filter((ticket) => ticket.status === "resolved"))
        : null;

      const activeTickets = analyticsTickets.filter((ticket) => ticket.status !== "resolved");
      const dataScopeNote = isCompleteAnalytics
        ? null
        : `Distribusi kategori, area, tren, dan beban kerja dihitung dari ${analyticsTickets.length} tiket terbaru yang berhasil dimuat.`;

      setData({
        stats: {
          total: totalTickets,
          open: openTickets.pagination.total_items,
          inProgress: inProgressTickets.pagination.total_items,
          resolved: resolvedTickets.pagination.total_items,
          unassigned: unassignedTickets.pagination.total_items,
          assignedToMe: assignedToMeCount,
          warning: activeTickets.filter((ticket) => getSlaState(ticket) === "warning").length,
          breached: activeTickets.filter((ticket) => getSlaState(ticket) === "breached").length,
        },
        recentTickets,
        recentActivities,
        activityError,
        statusDistribution: buildStatusDistribution(
          openTickets.pagination.total_items,
          inProgressTickets.pagination.total_items,
          resolvedTickets.pagination.total_items,
          totalTickets,
        ),
        categoryDistribution: buildDistribution(
          analyticsTickets,
          (ticket) => ticket.category,
          getTicketCategoryLabel,
          ["accent", "cool", "progress", "resolved", "open", "neutral"],
        ),
        teamDistribution: buildDistribution(
          analyticsTickets,
          (ticket) => ticket.team,
          getTicketTeamLabel,
          ["cool", "accent", "progress", "neutral"],
        ),
        createdTrend: buildCreatedTrend(analyticsTickets, 7),
        trendSummary: buildTrendSummary(analyticsTickets),
        resolutionInsight,
        workloadDistribution: buildWorkloadDistribution(activeTickets),
        attentionTickets: activeTickets
          .filter((ticket) => ticket.priority === "high")
          .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
          .slice(0, 4),
        dataScopeNote,
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Data dashboard belum bisa dimuat."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, [permissions.canAssignTickets, session?.subject]);

  const quickActions = useMemo(
    () =>
      [
        permissions.canCreateTickets
          ? {
              title: "Buat tiket baru",
              description: "Catat insiden atau permintaan baru tanpa meninggalkan alur kerja utama.",
              to: "/tickets/new",
              icon: "plus" as const,
            }
          : null,
        {
          title: "Lihat semua tiket",
          description: "Masuk ke antrean utama untuk triase, filter, dan tindak lanjut operasional.",
          to: "/tickets",
          icon: "tickets" as const,
        },
        permissions.canAssignTickets
          ? {
              title: "Tiket yang ditugaskan",
              description: "Fokus pada beban kerja yang sedang menjadi tanggung jawab Anda.",
              to: "/tickets/assigned",
              icon: "assigned" as const,
            }
          : {
              title: "Tiket saya",
              description: "Tinjau tiket yang Anda ajukan dan pantau progres penanganannya.",
              to: "/tickets/mine",
              icon: "mine" as const,
            },
        {
          title: "Buka dokumentasi API",
          description: "Akses referensi endpoint saat perlu validasi integrasi atau demo teknis.",
          to: "/api-docs",
          icon: "api" as const,
        },
      ].filter((item): item is NonNullable<typeof item> => item !== null),
    [permissions.canAssignTickets, permissions.canCreateTickets],
  );

  if (loading) {
    return (
      <LoadingState
        eyebrow="Dashboard"
        label="Menyiapkan ringkasan operasional..."
        supportText="Kami sedang merapikan KPI, distribusi tiket, dan beban kerja operasional untuk sesi Anda."
        lines={6}
        skeletonTitle="Menyusun cockpit operasional OpsDesk"
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        eyebrow="Dashboard"
        title="Dashboard belum siap ditampilkan"
        message="Ringkasan operasional belum bisa dimuat sepenuhnya untuk saat ini."
        supportText="Coba muat ulang beberapa saat lagi. Jika kendala berlanjut, Anda masih bisa melanjutkan pekerjaan dari halaman tiket."
        onRetry={() => void loadDashboard()}
      />
    );
  }

  if (!data) {
    return (
      <ErrorState
        eyebrow="Dashboard"
        title="Dashboard belum siap ditampilkan"
        message="Data dashboard belum tersedia untuk sesi ini."
        supportText="Muat ulang halaman untuk mencoba mengambil ringkasan terbaru."
        onRetry={() => void loadDashboard()}
      />
    );
  }

  const statCards: DashboardStatCard[] = [
    {
      label: "Perlu triase",
      value: data.stats.open,
      description: "Tiket terbuka yang masih menunggu tindak lanjut awal.",
      to: "/tickets?status=open",
      tone: "is-amber",
      featured: true,
    },
    {
      label: "Sedang berjalan",
      value: data.stats.inProgress,
      description: "Tiket aktif yang sedang berada dalam proses penanganan.",
      to: "/tickets?status=in_progress",
      tone: "is-blue",
    },
    {
      label: "Belum ditugaskan",
      value: data.stats.unassigned,
      description: "Tiket yang sudah masuk antrean tetapi belum punya penanggung jawab.",
      to: "/tickets?assignee=unassigned",
      tone: "is-violet",
    },
    {
      label: "Mendekati target",
      value: data.stats.warning,
      description: "Tiket aktif yang mulai mendekati batas target operasional berbasis prioritas.",
      to: "/tickets",
      tone: "is-amber",
    },
    permissions.canAssignTickets
      ? {
          label: "Ditugaskan ke saya",
          value: data.stats.assignedToMe,
          description: "Pekerjaan aktif yang saat ini menjadi tanggung jawab Anda.",
          to: "/tickets/assigned",
          tone: "is-green",
        }
      : {
          label: "Sudah selesai",
          value: data.stats.resolved,
          description: "Tiket yang telah diselesaikan dari akses akun saat ini.",
          to: "/tickets?status=resolved",
          tone: "is-green",
        },
    {
      label: "Total tiket terakses",
      value: data.stats.total,
      description: permissions.canViewOperationalTickets
        ? "Seluruh tiket yang berada dalam jangkauan operasional akun ini."
        : "Total tiket yang bisa Anda akses dari akun saat ini.",
      to: "/tickets",
      tone: "is-neutral",
    },
    {
      label: "Lewat target",
      value: data.stats.breached,
      description: "Tiket aktif yang sudah melewati target operasional ringan dan butuh perhatian cepat.",
      to: "/tickets",
      tone: "is-violet",
    },
  ];

  return (
    <section className="stack-lg page-shell page-shell--wide page-flow dashboard-page">
      <div className="hero-card hero-card--spotlight dashboard-hero">
        <div className="dashboard-hero__copy">
          <div>
            <p className="section-eyebrow">Command center</p>
            <h2>Pantau kesehatan antrean, distribusi beban, dan ritme operasional</h2>
            <p>
              Dashboard ini merangkum KPI utama, pola tiket yang masuk, dan sinyal kerja yang membantu agent atau admin
              mengambil langkah berikutnya lebih cepat.
            </p>
          </div>
          <div className="dashboard-hero__actions">
            {quickActions.slice(0, 2).map((action) => (
              <Link className={action.to === "/tickets/new" ? "button button--primary" : "button button--secondary"} key={action.to} to={action.to}>
                <AppIcon name={action.icon} size="sm" />
                {action.title}
              </Link>
            ))}
          </div>
        </div>
        <div className="dashboard-hero__summary" aria-label="Ringkasan status tiket">
          <div className="dashboard-hero__summary-item dashboard-hero__summary-item--open">
            <span>Terbuka</span>
            <strong>{data.stats.open}</strong>
          </div>
          <div className="dashboard-hero__summary-item dashboard-hero__summary-item--progress">
            <span>Sedang ditangani</span>
            <strong>{data.stats.inProgress}</strong>
          </div>
          <div className="dashboard-hero__summary-item dashboard-hero__summary-item--resolved">
            <span>Selesai</span>
            <strong>{data.stats.resolved}</strong>
          </div>
          <div className="dashboard-hero__summary-item dashboard-hero__summary-item--breached">
            <span>Lewat target</span>
            <strong>{data.stats.breached}</strong>
          </div>
        </div>
      </div>

      <div className="metrics-grid metrics-grid--dashboard dashboard-metrics">
        {statCards.map((card) => (
          <Link
            className={`metric-card metric-card--premium dashboard-stat ${card.tone} ${card.featured ? "dashboard-stat--featured" : ""}`}
            key={card.label}
            to={card.to}
          >
            <div className="dashboard-stat__header">
              <div className="dashboard-stat__title">
                <AppIconBadge name={getStatIcon(card.label)} size="sm" tone={card.tone === "is-blue" ? "cool" : "accent"} />
                <p>{card.label}</p>
              </div>
              <span className="dashboard-stat__link">
                <span>Buka</span>
                <AppIcon name="chevronRight" size="sm" />
              </span>
            </div>
            <strong>{card.value}</strong>
            <span className="dashboard-stat__meta">{card.description}</span>
          </Link>
        ))}
      </div>

      {data.dataScopeNote || data.resolutionInsight ? (
        <div className="dashboard-note-strip">
          {data.dataScopeNote ? (
            <article className="dashboard-note-card">
              <span>Cakupan analitik</span>
              <strong>{data.dataScopeNote}</strong>
            </article>
          ) : null}
          {data.resolutionInsight ? (
            <article className="dashboard-note-card dashboard-note-card--cool">
              <span>Rata-rata penyelesaian</span>
              <strong>
                {formatDurationHours(data.resolutionInsight.averageHours)} dari {data.resolutionInsight.sampleSize} tiket selesai
              </strong>
            </article>
          ) : null}
        </div>
      ) : null}

      {data.stats.total === 0 ? (
        <div className="stack-lg">
          <section className="panel panel--section dashboard-actions-panel">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Aksi cepat</p>
                <h3>Langkah awal yang paling sering dipakai</h3>
              </div>
            </div>

            <div className="dashboard-actions-grid">
              {quickActions.map((action) => (
                <Link className="dashboard-action-card" key={action.to} to={action.to}>
                  <div className="dashboard-action-card__header">
                    <AppIconBadge name={action.icon} size="sm" tone={action.icon === "api" ? "cool" : "neutral"} />
                    <strong>{action.title}</strong>
                  </div>
                  <p>{action.description}</p>
                  <span className="dashboard-action-card__cue">
                    <span>Buka</span>
                    <AppIcon name="chevronRight" size="sm" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <EmptyState
            eyebrow="Dashboard"
            title="Belum ada tiket untuk diringkas"
            description={
              permissions.canCreateTickets
                ? "Mulai dengan membuat tiket baru agar command center OpsDesk mulai menampilkan kondisi operasional."
                : "Belum ada tiket yang dapat Anda akses saat ini."
            }
            action={
              permissions.canCreateTickets ? (
                <Link className="button button--primary" to="/tickets/new">
                  Buat Tiket
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <div className="dashboard-analytics-grid">
            <section className="panel panel--section dashboard-panel">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">Distribusi status</p>
                  <h3>Komposisi antrean saat ini</h3>
                </div>
              </div>
              <DistributionPanel items={data.statusDistribution} />
            </section>

            <section className="panel panel--section dashboard-panel">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">Kategori</p>
                  <h3>Pola kebutuhan yang paling sering masuk</h3>
                </div>
              </div>
              <DistributionPanel items={data.categoryDistribution} emptyLabel="Belum ada kategori yang dapat diringkas." />
            </section>

            <section className="panel panel--section dashboard-panel">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">Area tujuan</p>
                  <h3>Sebaran tiket per tim operasional</h3>
                </div>
              </div>
              <DistributionPanel items={data.teamDistribution} emptyLabel="Belum ada area operasional yang dapat diringkas." />
            </section>
          </div>

          <div className="dashboard-support-grid">
            <section className="panel panel--section dashboard-panel">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">Ritme tiket</p>
                  <h3>Tiket masuk 7 hari terakhir</h3>
                </div>
              </div>
              <div className="dashboard-trend">
                <div className="dashboard-trend__bars" aria-label="Grafik tiket masuk per hari">
                  {data.createdTrend.map((point) => (
                    <div className="dashboard-trend__column" key={point.dateKey}>
                      <span className="dashboard-trend__value">{point.value}</span>
                      <div className="dashboard-trend__track" aria-hidden="true">
                        <span
                          className="dashboard-trend__bar"
                          style={{
                            height: `${Math.max((point.value / Math.max(...data.createdTrend.map((entry) => entry.value), 1)) * 100, point.value > 0 ? 18 : 6)}%`,
                          }}
                        />
                      </div>
                      <span className="dashboard-trend__label">{point.label}</span>
                    </div>
                  ))}
                </div>
                <p className="dashboard-panel__hint">{data.trendSummary}</p>
              </div>
            </section>

            <section className="panel panel--section dashboard-panel">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">Distribusi beban</p>
                  <h3>Antrean aktif per petugas</h3>
                </div>
              </div>
              {data.workloadDistribution.length === 0 ? (
                <EmptyState title="Belum ada beban aktif" description="Semua tiket aktif saat ini belum memiliki penugasan atau belum tersedia." />
              ) : (
                <div className="dashboard-workload-list">
                  {data.workloadDistribution.map((item) => (
                    <article className="dashboard-workload-item" key={item.key}>
                      <div>
                        <strong>{item.label}</strong>
                        <p>{item.sublabel}</p>
                      </div>
                      <span className="dashboard-workload-item__value">{item.value} tiket aktif</span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="dashboard-main-grid">
            <section className="panel panel--section dashboard-panel dashboard-panel--tickets">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">Tiket terbaru</p>
                  <h3>Antrian yang paling baru diperbarui</h3>
                </div>
                <Link className="button button--secondary" to="/tickets">
                  Lihat Semua
                </Link>
              </div>

              <div className="dashboard-ticket-list">
                {data.recentTickets.map((ticket) => (
                  <Link className="dashboard-ticket-card" key={ticket.id} to={`/tickets/${ticket.id}`}>
                    <div className="dashboard-ticket-card__top">
                      <div>
                        <strong>{ticket.title}</strong>
                        <p>
                          {ticket.id} - {ticket.reporterName}
                        </p>
                      </div>
                      <div className="dashboard-ticket-card__status">
                        <StatusBadge status={ticket.status} />
                        <AppIcon name="chevronRight" size="sm" />
                      </div>
                    </div>
                    <div className="dashboard-ticket-card__meta">
                      <span className={`priority-pill priority-pill--${ticket.priority}`}>{formatPriority(ticket.priority)}</span>
                      <span>{getTicketCategoryLabel(ticket.category)}</span>
                      <span>{getTicketTeamLabel(ticket.team)}</span>
                      <span>{ticket.assigneeName ? `Petugas: ${ticket.assigneeName}` : "Belum ditugaskan"}</span>
                      <span>Diperbarui {formatDateTime(ticket.updatedAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="panel panel--section dashboard-panel dashboard-panel--activity">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">Sorotan audit</p>
                  <h3>Aktivitas terbaru yang layak dipantau</h3>
                </div>
              </div>

              {data.activityError ? <p className="form-hint">{data.activityError}</p> : null}

              {data.recentActivities.length === 0 ? (
                <EmptyState
                  eyebrow="Aktivitas"
                  title="Belum ada sorotan aktivitas"
                  description="Aktivitas terbaru pada tiket akan muncul di sini untuk membantu pemantauan cepat."
                  supportText="Begitu ada perubahan status, komentar, penugasan, atau lampiran baru, sorotannya akan tampil otomatis."
                />
              ) : (
                <div className="dashboard-activity-list">
                  {data.recentActivities.map((activity) => (
                    <Link className="dashboard-activity-item" key={activity.id} to={`/tickets/${activity.ticketId}`}>
                      <div className={`dashboard-activity-item__marker dashboard-activity-item__marker--${activity.action}`} />
                      <div>
                        <strong>{activity.summary}</strong>
                        <p>{activity.ticketTitle}</p>
                        <span>
                          {activity.actorLabel} - {formatDateTime(activity.timestamp)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="dashboard-support-grid">
            <section className="panel panel--section dashboard-panel">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">Butuh perhatian</p>
                  <h3>Tiket prioritas tinggi yang belum selesai</h3>
                </div>
              </div>
              {data.attentionTickets.length === 0 ? (
                <EmptyState
                  title="Tidak ada tiket prioritas tinggi aktif"
                  description="Saat ini tidak ada tiket prioritas tinggi yang masih menunggu penanganan."
                />
              ) : (
                <div className="dashboard-ticket-list">
                  {data.attentionTickets.map((ticket) => (
                    <Link className="dashboard-ticket-card" key={ticket.id} to={`/tickets/${ticket.id}`}>
                      <div className="dashboard-ticket-card__top">
                        <div>
                          <strong>{ticket.title}</strong>
                          <p>
                            {ticket.id} - Dibuat {formatDateTime(ticket.createdAt)}
                          </p>
                        </div>
                        <div className="dashboard-ticket-card__status">
                          <StatusBadge status={ticket.status} />
                        </div>
                      </div>
                      <div className="dashboard-ticket-card__meta">
                        <span className={`priority-pill priority-pill--${ticket.priority}`}>{formatPriority(ticket.priority)}</span>
                        <span>{getTicketCategoryLabel(ticket.category)}</span>
                        <span>{ticket.assigneeName ? `Petugas: ${ticket.assigneeName}` : "Belum ditugaskan"}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="panel panel--section dashboard-actions-panel">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">Aksi cepat</p>
                  <h3>Jalur kerja yang paling sering dibutuhkan</h3>
                </div>
              </div>

              <div className="dashboard-actions-grid">
                {quickActions.map((action) => (
                  <Link className="dashboard-action-card" key={action.to} to={action.to}>
                    <div className="dashboard-action-card__header">
                      <AppIconBadge name={action.icon} size="sm" tone={action.icon === "api" ? "cool" : "neutral"} />
                      <strong>{action.title}</strong>
                    </div>
                    <p>{action.description}</p>
                    <span className="dashboard-action-card__cue">
                      <span>Buka</span>
                      <AppIcon name="chevronRight" size="sm" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}

function DistributionPanel({
  items,
  emptyLabel = "Belum ada data yang dapat diringkas.",
}: {
  items: DistributionItem[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <EmptyState title="Belum ada distribusi" description={emptyLabel} />;
  }

  return (
    <div className="dashboard-bars">
      {items.map((item) => (
        <div className="dashboard-bars__item" key={item.key}>
          <div className="dashboard-bars__meta">
            <div>
              <strong>{item.label}</strong>
              <p>{item.value} tiket</p>
            </div>
            <span>{Math.round(item.share)}%</span>
          </div>
          <div className="dashboard-bars__track" aria-hidden="true">
            <span className={`dashboard-bars__fill dashboard-bars__fill--${item.tone}`} style={{ width: `${item.share}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

async function calculateResolutionInsight(resolvedTickets: Ticket[]) {
  if (resolvedTickets.length === 0) {
    return null;
  }

  const activityResults = await Promise.allSettled(
    resolvedTickets.map(async (ticket) => ({
      ticket,
      activities: await getTicketActivities(ticket.id),
    })),
  );

  const resolutionDurations = activityResults
    .filter((result): result is PromiseFulfilledResult<{ ticket: Ticket; activities: TicketActivity[] }> => result.status === "fulfilled")
    .map((result) => {
      const resolvedAt = findResolvedTimestamp(result.value.activities);
      if (!resolvedAt) {
        return null;
      }

      const durationMs = resolvedAt.getTime() - new Date(result.value.ticket.createdAt).getTime();
      return durationMs > 0 ? durationMs / (1000 * 60 * 60) : null;
    })
    .filter((duration): duration is number => duration !== null);

  if (resolutionDurations.length === 0) {
    return null;
  }

  const averageHours = resolutionDurations.reduce((sum, duration) => sum + duration, 0) / resolutionDurations.length;
  return {
    averageHours,
    sampleSize: resolutionDurations.length,
  };
}

function findResolvedTimestamp(activities: TicketActivity[]) {
  const resolvedActivity = [...activities]
    .filter((activity) => activity.action === "status_changed" && activity.metadata?.afterStatus === "resolved")
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())[0];

  return resolvedActivity ? new Date(resolvedActivity.timestamp) : null;
}

function buildStatusDistribution(open: number, inProgress: number, resolved: number, total: number): DistributionItem[] {
  const safeTotal = Math.max(total, 1);
  return [
    { key: "open", label: "Terbuka", value: open, share: (open / safeTotal) * 100, tone: "open" },
    { key: "in_progress", label: "Sedang ditangani", value: inProgress, share: (inProgress / safeTotal) * 100, tone: "progress" },
    { key: "resolved", label: "Selesai", value: resolved, share: (resolved / safeTotal) * 100, tone: "resolved" },
  ];
}

function buildDistribution(
  tickets: Ticket[],
  getKey: (ticket: Ticket) => string | undefined,
  getLabel: (key?: string) => string,
  tones: DistributionItem["tone"][],
) {
  const counts = new Map<string, number>();

  tickets.forEach((ticket) => {
    const key = getKey(ticket);
    if (!key) {
      return;
    }

    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const total = Math.max(tickets.length, 1);
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([key, value], index) => ({
      key,
      label: getLabel(key),
      value,
      share: (value / total) * 100,
      tone: tones[index % tones.length],
    }));
}

function buildCreatedTrend(tickets: Ticket[], days: number) {
  const buckets = new Map<string, number>();
  const now = new Date();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    buckets.set(toDateKey(date), 0);
  }

  tickets.forEach((ticket) => {
    const createdAt = new Date(ticket.createdAt);
    const key = toDateKey(createdAt);
    if (!buckets.has(key)) {
      return;
    }

    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  });

  return [...buckets.entries()].map(([dateKey, value]) => ({
    dateKey,
    label: formatShortDate(dateKey),
    value,
  }));
}

function buildTrendSummary(tickets: Ticket[]) {
  const recentWindow = countCreatedWithinDays(tickets, 7);
  const previousWindow = countCreatedWithinDays(tickets, 14) - recentWindow;

  if (previousWindow === 0 && recentWindow === 0) {
    return "Belum ada tiket baru yang tercatat dalam dua minggu terakhir.";
  }

  if (previousWindow === 0) {
    return `${recentWindow} tiket baru tercatat dalam 7 hari terakhir. Belum ada pembanding dari 7 hari sebelumnya.`;
  }

  const delta = recentWindow - previousWindow;
  if (delta === 0) {
    return `Volume tiket 7 hari terakhir stabil di ${recentWindow} tiket, setara dengan 7 hari sebelumnya.`;
  }

  const direction = delta > 0 ? "naik" : "turun";
  return `Volume tiket 7 hari terakhir ${direction} ${Math.abs(delta)} dibanding 7 hari sebelumnya (${recentWindow} vs ${previousWindow}).`;
}

function countCreatedWithinDays(tickets: Ticket[], days: number) {
  const threshold = new Date();
  threshold.setHours(0, 0, 0, 0);
  threshold.setDate(threshold.getDate() - (days - 1));

  return tickets.filter((ticket) => new Date(ticket.createdAt).getTime() >= threshold.getTime()).length;
}

function buildWorkloadDistribution(tickets: Ticket[]) {
  const counts = new Map<string, WorkloadItem>();

  tickets.forEach((ticket) => {
    const key = ticket.assigneeId || "unassigned";
    const label = ticket.assigneeName || "Belum ditugaskan";
    const sublabel = ticket.assigneeId ? "Penanggung jawab aktif" : "Masih menunggu triase atau pengambilan";
    const current = counts.get(key);

    if (current) {
      current.value += 1;
      return;
    }

    counts.set(key, {
      key,
      label,
      sublabel,
      value: 1,
    });
  });

  return [...counts.values()].sort((left, right) => right.value - left.value).slice(0, 5);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatShortDate(dateKey: string) {
  const [, month, day] = dateKey.split("-");
  return `${day}/${month}`;
}

function formatDurationHours(hours: number) {
  if (hours < 24) {
    return `${hours.toFixed(1)} jam`;
  }

  return `${(hours / 24).toFixed(1)} hari`;
}

function getStatIcon(label: string): AppIconName {
  if (label.includes("triase")) {
    return "tickets";
  }

  if (label.includes("berjalan")) {
    return "assigned";
  }

  if (label.includes("Ditugaskan")) {
    return "mine";
  }

  if (label.includes("ditugaskan")) {
    return "mine";
  }

  if (label.includes("target")) {
    return "dashboard";
  }

  return "dashboard";
}

function formatActivityActor(activity: TicketActivity) {
  if (!activity.actorName) {
    return "Aktivitas sistem";
  }

  return activity.actorName;
}

function formatPriority(priority: TicketPriority) {
  switch (priority) {
    case "high":
      return "Prioritas tinggi";
    case "medium":
      return "Prioritas sedang";
    default:
      return "Prioritas rendah";
  }
}
