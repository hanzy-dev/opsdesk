import type { Ticket, TicketPriority, TicketStatus } from "../types/ticket";

type SlaDefinition = {
  targetHours: number;
  warningHours: number;
  label: string;
};

export type SlaState = "normal" | "warning" | "breached" | "resolved";

const slaByPriority: Record<TicketPriority, SlaDefinition> = {
  high: { targetHours: 4, warningHours: 1, label: "Prioritas tinggi" },
  medium: { targetHours: 8, warningHours: 2, label: "Prioritas sedang" },
  low: { targetHours: 24, warningHours: 6, label: "Prioritas rendah" },
};

export function getSlaDefinition(priority: TicketPriority) {
  return slaByPriority[priority];
}

export function getTicketDueAt(ticket: Pick<Ticket, "createdAt" | "priority">) {
  const createdAt = new Date(ticket.createdAt);
  const targetHours = getSlaDefinition(ticket.priority).targetHours;
  return new Date(createdAt.getTime() + targetHours * 60 * 60 * 1000);
}

export function getSlaState(ticket: Pick<Ticket, "createdAt" | "priority" | "status">, now = new Date()): SlaState {
  if (ticket.status === "resolved") {
    return "resolved";
  }

  const dueAt = getTicketDueAt(ticket);
  const remainingMs = dueAt.getTime() - now.getTime();
  if (remainingMs <= 0) {
    return "breached";
  }

  const warningMs = getSlaDefinition(ticket.priority).warningHours * 60 * 60 * 1000;
  if (remainingMs <= warningMs) {
    return "warning";
  }

  return "normal";
}

export function formatSlaTarget(ticket: Pick<Ticket, "priority">) {
  const definition = getSlaDefinition(ticket.priority);
  return `${definition.targetHours} jam`;
}

export function formatSlaDueLabel(ticket: Pick<Ticket, "createdAt" | "priority" | "status">, now = new Date()) {
  const dueAt = getTicketDueAt(ticket);

  if (ticket.status === "resolved") {
    return "Tiket sudah selesai";
  }

  const diffMs = dueAt.getTime() - now.getTime();
  if (diffMs <= 0) {
    return `Lewat target ${formatDuration(Math.abs(diffMs))}`;
  }

  return `Sisa ${formatDuration(diffMs)}`;
}

export function getSlaToneLabel(state: SlaState) {
  switch (state) {
    case "warning":
      return "Mendekati target";
    case "breached":
      return "Lewat target";
    case "resolved":
      return "Selesai";
    default:
      return "Masih aman";
  }
}

export function isActiveSlaStatus(status: TicketStatus) {
  return status !== "resolved";
}

function formatDuration(durationMs: number) {
  const totalMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));
  if (totalMinutes < 60) {
    return `${totalMinutes} menit`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) {
    return minutes === 0 ? `${hours} jam` : `${hours} jam ${minutes} menit`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours === 0 ? `${days} hari` : `${days} hari ${remainingHours} jam`;
}
