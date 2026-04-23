import { operatorMacros } from "../content/operatorMacros";
import type { Ticket, TicketActivity } from "../types/ticket";
import { getSlaState } from "./sla";
import { findRelatedTickets, getTicketAssistSuggestion } from "./smartAssist";
import { getTicketCategoryLabel, getTicketTeamLabel } from "./ticketMetadata";

export type AutomationSignalTone = "attention" | "warning" | "info" | "success";

export type AutomationSignal = {
  id: string;
  title: string;
  description: string;
  tone: AutomationSignalTone;
};

export type OperatorQuickActionPreset = {
  id: string;
  title: string;
  description: string;
  kind: "draft-macro" | "take-ownership" | "request-info" | "resolve-with-note" | "mark-follow-up";
  macroId?: string;
  visibility?: "public" | "internal";
};

export type IncidentClusterSummary = {
  anchorTicket: Ticket;
  relatedTickets: Ticket[];
  summary: string;
  label: string;
};

export type TicketAutomationBadge = {
  id: string;
  label: string;
  tone: AutomationSignalTone;
};

export type DashboardAutomationSnapshot = {
  urgentUnassigned: number;
  staleActive: number;
  routingReview: number;
  possibleIncidentGroups: number;
};

const recentTicketWindowHours = 6;
const staleOpenHours = 12;
const staleInProgressHours = 24;

export function buildTicketAutomationSignals(ticket: Ticket, activities: TicketActivity[], workloadTickets: Ticket[]) {
  const signals: AutomationSignal[] = [];
  const now = Date.now();
  const createdAtAgeHours = diffHours(now, ticket.createdAt);
  const updatedAtAgeHours = diffHours(now, ticket.updatedAt);
  const latestActivity = [...activities].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())[0];
  const incidentCluster = detectIncidentCluster(ticket, workloadTickets);
  const assistSuggestion = getTicketAssistSuggestion({ title: ticket.title, description: ticket.description });

  if (ticket.status === "open" && !ticket.assigneeId && createdAtAgeHours <= recentTicketWindowHours) {
    signals.push({
      id: "new-unassigned",
      title: "Tiket baru belum ditugaskan",
      description: "Tiket ini masih baru, terbuka, dan belum diambil operator. Cocok untuk triase awal cepat.",
      tone: "info",
    });
  }

  if (ticket.status === "open" && !ticket.assigneeId && ticket.priority === "high") {
    signals.push({
      id: "urgent-unassigned",
      title: "Prioritas tinggi tanpa penanggung jawab",
      description: "Tiket prioritas tinggi ini belum ditugaskan. Operator sebaiknya mengambil alih atau meneruskan cepat.",
      tone: "attention",
    });
  }

  if (ticket.status === "open" && updatedAtAgeHours >= staleOpenHours) {
    signals.push({
      id: "stale-open",
      title: "Belum ada tindak lanjut terbaru",
      description: `Tiket masih terbuka dan tidak menunjukkan pembaruan berarti dalam sekitar ${Math.floor(updatedAtAgeHours)} jam.`,
      tone: "warning",
    });
  }

  if (ticket.status === "in_progress" && updatedAtAgeHours >= staleInProgressHours) {
    signals.push({
      id: "stale-progress",
      title: "Butuh follow-up operator",
      description: `Tiket sedang ditangani tetapi pembaruan terakhir sudah lewat sekitar ${Math.floor(updatedAtAgeHours)} jam.`,
      tone: "warning",
    });
  }

  if (getSlaState(ticket) === "warning" || getSlaState(ticket) === "breached") {
    signals.push({
      id: "sla-attention",
      title: getSlaState(ticket) === "breached" ? "Target operasional terlewati" : "Mendekati target operasional",
      description: "Gunakan sinyal ini sebagai pengingat follow-up ringan, bukan engine eskalasi enterprise.",
      tone: getSlaState(ticket) === "breached" ? "attention" : "warning",
    });
  }

  if (assistSuggestion.category.value !== ticket.category || assistSuggestion.team.value !== ticket.team) {
    signals.push({
      id: "routing-check",
      title: "Perlu cek ulang routing",
      description: `Isi tiket terlihat lebih dekat ke ${getTicketCategoryLabel(assistSuggestion.category.value)} dan area ${getTicketTeamLabel(assistSuggestion.team.value)} dibanding routing saat ini.`,
      tone: "info",
    });
  }

  if (incidentCluster) {
    signals.push({
      id: "incident-cluster",
      title: "Terhubung ke kelompok gangguan serupa",
      description: incidentCluster.summary,
      tone: "attention",
    });
  }

  if (latestActivity && latestActivity.action === "comment_added" && ticket.status !== "resolved") {
    signals.push({
      id: "recent-comment",
      title: "Ada konteks baru pada komentar",
      description: "Tiket ini punya aktivitas komentar terbaru dan masih aktif, jadi layak dibaca sebelum aksi berikutnya.",
      tone: "success",
    });
  }

  return signals;
}

export function buildOperatorQuickActionPresets(ticket: Ticket, workloadTickets: Ticket[]) {
  const incidentCluster = detectIncidentCluster(ticket, workloadTickets);
  const actions: OperatorQuickActionPreset[] = [
    {
      id: "macro-triase",
      title: "Balas triase awal",
      description: "Isi komentar publik dengan template konfirmasi triase awal.",
      kind: "draft-macro",
      macroId: "triase-awal",
      visibility: "public",
    },
    {
      id: "request-info",
      title: "Minta info tambahan",
      description: "Isi komentar publik untuk meminta data tambahan dari pelapor.",
      kind: "request-info",
      macroId: "minta-informasi",
      visibility: "public",
    },
    {
      id: "follow-up",
      title: "Tandai follow-up",
      description: "Isi catatan internal follow-up dan siapkan tiket untuk pantauan operator.",
      kind: "mark-follow-up",
      macroId: incidentCluster ? "indikasi-insiden" : "follow-up-operator",
      visibility: "internal",
    },
  ];

  if (!ticket.assigneeId) {
    actions.unshift({
      id: "take-ownership",
      title: "Ambil + balas awal",
      description: "Tugaskan tiket ke saya, ubah ke sedang ditangani, lalu kirim balasan awal.",
      kind: "take-ownership",
      macroId: "triase-awal",
      visibility: "public",
    });
  }

  if (ticket.status !== "resolved") {
    actions.push({
      id: "resolve-note",
      title: "Selesaikan + balasan",
      description: "Tandai selesai dan kirim balasan penutupan yang sudah dirapikan.",
      kind: "resolve-with-note",
      macroId: "selesai-dengan-konfirmasi",
      visibility: "public",
    });
  }

  return actions;
}

export function getOperatorMacroById(macroId?: string) {
  return operatorMacros.find((macro) => macro.id === macroId) ?? null;
}

export function detectIncidentCluster(ticket: Ticket, workloadTickets: Ticket[]): IncidentClusterSummary | null {
  const related = findRelatedTickets(
    {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      team: ticket.team,
    },
    workloadTickets.filter((workloadTicket) => workloadTicket.status !== "resolved"),
    5,
  );

  if (related.length < 2) {
    return null;
  }

  const relatedTickets = related.map((hint) => hint.ticket);
  const anchorTicket = [ticket, ...relatedTickets].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  )[0];

  return {
    anchorTicket,
    relatedTickets,
    label: `Kelompok ${getTicketCategoryLabel(ticket.category)}`,
    summary: `${relatedTickets.length + 1} tiket aktif tampak berkaitan pada kategori ${getTicketCategoryLabel(ticket.category)} di area ${getTicketTeamLabel(ticket.team)}. Jadikan ${anchorTicket.id} sebagai acuan ringan bila perlu.`,
  };
}

export function getTicketAutomationBadges(ticket: Ticket) {
  const badges: TicketAutomationBadge[] = [];
  const now = Date.now();
  const createdAtAgeHours = diffHours(now, ticket.createdAt);
  const updatedAtAgeHours = diffHours(now, ticket.updatedAt);

  if (ticket.status === "open" && !ticket.assigneeId && createdAtAgeHours <= recentTicketWindowHours) {
    badges.push({ id: "baru", label: "Baru", tone: "info" });
  }

  if (ticket.status === "open" && !ticket.assigneeId && ticket.priority === "high") {
    badges.push({ id: "perhatian", label: "Perlu perhatian", tone: "attention" });
  }

  if (
    (ticket.status === "open" && updatedAtAgeHours >= staleOpenHours) ||
    (ticket.status === "in_progress" && updatedAtAgeHours >= staleInProgressHours)
  ) {
    badges.push({ id: "follow-up", label: "Follow-up", tone: "warning" });
  }

  return badges;
}

export function buildDashboardAutomationSnapshot(tickets: Ticket[]) {
  const activeTickets = tickets.filter((ticket) => ticket.status !== "resolved");
  const routingReview = activeTickets.filter((ticket) => {
    const suggestion = getTicketAssistSuggestion({ title: ticket.title, description: ticket.description });
    return suggestion.category.value !== ticket.category || suggestion.team.value !== ticket.team;
  }).length;

  const incidentKeys = new Set(
    activeTickets
      .filter((ticket) => ticket.priority === "high")
      .map((ticket) => `${ticket.category}:${ticket.team}`)
      .filter((key, index, all) => all.indexOf(key) !== index),
  );

  return {
    urgentUnassigned: activeTickets.filter((ticket) => ticket.status === "open" && !ticket.assigneeId && ticket.priority === "high").length,
    staleActive: activeTickets.filter(
      (ticket) =>
        (ticket.status === "open" && diffHours(Date.now(), ticket.updatedAt) >= staleOpenHours) ||
        (ticket.status === "in_progress" && diffHours(Date.now(), ticket.updatedAt) >= staleInProgressHours),
    ).length,
    routingReview,
    possibleIncidentGroups: incidentKeys.size,
  } satisfies DashboardAutomationSnapshot;
}

function diffHours(now: number, value: string) {
  return Math.max((now - new Date(value).getTime()) / (1000 * 60 * 60), 0);
}
