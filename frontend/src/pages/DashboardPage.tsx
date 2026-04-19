import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { getTicketActivities, listTickets } from "../api/tickets";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { StatusBadge } from "../components/tickets/StatusBadge";
import { useAuth } from "../modules/auth/AuthContext";
import type { Ticket, TicketActivity, TicketPriority } from "../types/ticket";
import { formatDateTime } from "../utils/date";
import { getErrorMessage } from "../utils/errors";

type DashboardStats = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  assignedToMe: number;
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

type DashboardData = {
  stats: DashboardStats;
  recentTickets: Ticket[];
  recentActivities: ActivityHighlight[];
  activityError: string | null;
};

export function DashboardPage() {
  const { permissions, session } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      const [allTickets, openTickets, inProgressTickets, resolvedTickets, recentTicketsResponse] =
        await Promise.all([
          listTickets({ page: 1, pageSize: 100, sortBy: "updated_at", sortOrder: "desc" }),
          listTickets({ page: 1, pageSize: 1, status: "open", sortBy: "updated_at", sortOrder: "desc" }),
          listTickets({ page: 1, pageSize: 1, status: "in_progress", sortBy: "updated_at", sortOrder: "desc" }),
          listTickets({ page: 1, pageSize: 1, status: "resolved", sortBy: "updated_at", sortOrder: "desc" }),
          listTickets({ page: 1, pageSize: 6, sortBy: "updated_at", sortOrder: "desc" }),
        ]);

      let assignedToMeCount = 0;
      if (permissions.canAssignTickets) {
        try {
          const assignedTickets = await listTickets({ page: 1, pageSize: 1, assignee: "me", sortBy: "updated_at", sortOrder: "desc" });
          assignedToMeCount = assignedTickets.pagination.total_items;
        } catch (error) {
          if (error instanceof ApiError && error.status >= 500 && session?.subject) {
            assignedToMeCount = allTickets.items.filter((ticket) => ticket.assigneeId === session.subject).length;
          } else {
            throw error;
          }
        }
      }

      const recentTickets = recentTicketsResponse.items;
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

      setData({
        stats: {
          total: allTickets.pagination.total_items,
          open: openTickets.pagination.total_items,
          inProgress: inProgressTickets.pagination.total_items,
          resolved: resolvedTickets.pagination.total_items,
          assignedToMe: assignedToMeCount,
        },
        recentTickets,
        recentActivities,
        activityError,
      });
    } catch (error) {
      setError(getErrorMessage(error, "Data dashboard belum bisa dimuat."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, [permissions.canAssignTickets, session?.subject]);

  const statusSegments = useMemo(() => {
    if (!data) {
      return [];
    }

    const total = Math.max(data.stats.total, 1);
    return [
      {
        label: "Terbuka",
        value: data.stats.open,
        className: "dashboard-distribution__segment--open",
        width: `${(data.stats.open / total) * 100}%`,
      },
      {
        label: "Sedang ditangani",
        value: data.stats.inProgress,
        className: "dashboard-distribution__segment--progress",
        width: `${(data.stats.inProgress / total) * 100}%`,
      },
      {
        label: "Selesai",
        value: data.stats.resolved,
        className: "dashboard-distribution__segment--resolved",
        width: `${(data.stats.resolved / total) * 100}%`,
      },
    ];
  }, [data]);

  const quickActions = useMemo(
    () =>
      [
        permissions.canCreateTickets
          ? {
              title: "Buat tiket baru",
              description: "Catat insiden atau permintaan baru tanpa meninggalkan alur kerja utama.",
              to: "/tickets/new",
            }
          : null,
        {
          title: "Lihat semua tiket",
          description: "Masuk ke antrean utama untuk triase, filter, dan tindak lanjut operasional.",
          to: "/tickets",
        },
        permissions.canAssignTickets
          ? {
              title: "Tiket yang ditugaskan",
              description: "Fokus pada beban kerja yang sedang menjadi tanggung jawab Anda.",
              to: "/tickets/assigned",
            }
          : {
              title: "Tiket saya",
              description: "Tinjau tiket yang Anda ajukan dan pantau progres penanganannya.",
              to: "/tickets/mine",
            },
        {
          title: "Buka dokumentasi API",
          description: "Akses referensi endpoint saat perlu validasi integrasi atau demo teknis.",
          to: "/api-docs",
        },
      ].filter((item): item is NonNullable<typeof item> => item !== null),
    [permissions.canAssignTickets, permissions.canCreateTickets],
  );

  if (loading) {
    return <LoadingState label="Menyiapkan command center operasional..." lines={6} />;
  }

  if (error) {
    return <ErrorState title="Dashboard belum siap ditampilkan" message={error} onRetry={() => void loadDashboard()} />;
  }

  if (!data) {
    return <ErrorState title="Dashboard belum siap ditampilkan" message="Data dashboard belum tersedia." onRetry={() => void loadDashboard()} />;
  }

  const statCards = [
    {
      label: "Total tiket terakses",
      value: data.stats.total,
      description: permissions.canViewOperationalTickets
        ? "Semua tiket yang berada dalam jangkauan operasional akun ini."
        : "Total tiket yang bisa Anda akses dari akun saat ini.",
      to: "/tickets",
      tone: "is-neutral",
    },
    {
      label: "Perlu triase",
      value: data.stats.open,
      description: "Tiket terbuka yang masih menunggu penanganan awal.",
      to: "/tickets?status=open",
      tone: "is-amber",
    },
    {
      label: "Sedang berjalan",
      value: data.stats.inProgress,
      description: "Tiket yang sudah aktif ditangani dan perlu dipantau progresnya.",
      to: "/tickets?status=in_progress",
      tone: "is-blue",
    },
    permissions.canAssignTickets
      ? {
          label: "Ditugaskan ke saya",
          value: data.stats.assignedToMe,
          description: "Pekerjaan aktif yang sedang menjadi tanggung jawab langsung Anda.",
          to: "/tickets/assigned",
          tone: "is-violet",
        }
      : {
          label: "Sudah selesai",
          value: data.stats.resolved,
          description: "Tiket yang telah ditutup atau ditandai selesai.",
          to: "/tickets?status=resolved",
          tone: "is-green",
        },
  ];

  return (
    <section className="stack-lg page-shell page-shell--wide dashboard-page">
      <div className="hero-card hero-card--spotlight dashboard-hero">
        <div className="dashboard-hero__copy">
          <div>
            <p className="section-eyebrow">Command center</p>
            <h2>Pantau kesehatan antrean dan tindak lanjut berikutnya</h2>
            <p>
              Dashboard ini merangkum kondisi tiket, pergerakan terbaru, dan jalur aksi yang paling sering dibutuhkan
              saat operasional berjalan.
            </p>
          </div>
          <div className="dashboard-hero__actions">
            {quickActions.slice(0, 2).map((action) => (
              <Link className={action.to === "/tickets/new" ? "button button--primary" : "button button--secondary"} key={action.to} to={action.to}>
                {action.title}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="metrics-grid metrics-grid--dashboard dashboard-metrics">
        {statCards.map((card) => (
          <Link className={`metric-card metric-card--premium dashboard-stat ${card.tone}`} key={card.label} to={card.to}>
            <div className="dashboard-stat__header">
              <p>{card.label}</p>
              <span className="dashboard-stat__link">Buka</span>
            </div>
            <strong>{card.value}</strong>
            <span className="dashboard-stat__meta">{card.description}</span>
          </Link>
        ))}
      </div>

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
                  <strong>{action.title}</strong>
                  <p>{action.description}</p>
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
                      <StatusBadge status={ticket.status} />
                    </div>
                    <div className="dashboard-ticket-card__meta">
                      <span className={`priority-pill priority-pill--${ticket.priority}`}>{formatPriority(ticket.priority)}</span>
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
            <section className="panel panel--section dashboard-panel dashboard-panel--distribution">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">Distribusi status</p>
                  <h3>Komposisi antrean saat ini</h3>
                </div>
              </div>

              <div className="dashboard-distribution">
                <div className="dashboard-distribution__bar" aria-hidden="true">
                  {statusSegments.map((segment) => (
                    <span className={`dashboard-distribution__segment ${segment.className}`} key={segment.label} style={{ width: segment.width }} />
                  ))}
                </div>

                <div className="dashboard-distribution__legend">
                  {statusSegments.map((segment) => (
                    <div className="dashboard-distribution__legend-item" key={segment.label}>
                      <span className={`dashboard-distribution__dot ${segment.className}`} />
                      <div>
                        <strong>{segment.value}</strong>
                        <p>{segment.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                    <strong>{action.title}</strong>
                    <p>{action.description}</p>
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
