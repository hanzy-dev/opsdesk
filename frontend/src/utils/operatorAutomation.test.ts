import { describe, expect, it } from "vitest";
import {
  buildDashboardAutomationSnapshot,
  buildOperatorQuickActionPresets,
  buildTicketAutomationSignals,
  detectIncidentCluster,
  getTicketAutomationBadges,
} from "./operatorAutomation";

describe("operatorAutomation", () => {
  const baseTicket = {
    id: "TCK-1",
    title: "API timeout dashboard",
    description: "Timeout terjadi pada dashboard utama dan berdampak ke banyak pengguna.",
    status: "open" as const,
    priority: "high" as const,
    category: "application_bug" as const,
    team: "applications" as const,
    reporterName: "Rina",
    reporterEmail: "rina@example.com",
    comments: [],
    attachments: [],
    createdAt: "2026-04-20T08:00:00Z",
    updatedAt: "2026-04-20T08:00:00Z",
  };

  it("builds attention signals for urgent unassigned and stale tickets", () => {
    const signals = buildTicketAutomationSignals(
      baseTicket,
      [],
      [
        baseTicket,
        {
          ...baseTicket,
          id: "TCK-2",
          title: "API timeout dashboard cabang",
          reporterName: "Budi",
          reporterEmail: "budi@example.com",
        },
        {
          ...baseTicket,
          id: "TCK-3",
          title: "API timeout dashboard mobile",
          reporterName: "Sinta",
          reporterEmail: "sinta@example.com",
        },
      ],
    );

    expect(signals.some((signal) => signal.id === "urgent-unassigned")).toBe(true);
    expect(signals.some((signal) => signal.id === "incident-cluster")).toBe(true);
  });

  it("detects lightweight incident clusters from related tickets", () => {
    const cluster = detectIncidentCluster(baseTicket, [
      baseTicket,
      {
        ...baseTicket,
        id: "TCK-2",
        title: "Timeout dashboard utama",
        reporterName: "Budi",
        reporterEmail: "budi@example.com",
      },
      {
        ...baseTicket,
        id: "TCK-3",
        title: "Dashboard utama timeout lagi",
        reporterName: "Sinta",
        reporterEmail: "sinta@example.com",
      },
    ]);

    expect(cluster).not.toBeNull();
    expect(cluster?.relatedTickets.length).toBeGreaterThanOrEqual(2);
  });

  it("returns operator quick actions and inline badges", () => {
    const actions = buildOperatorQuickActionPresets(baseTicket, [baseTicket]);
    const badges = getTicketAutomationBadges(baseTicket);

    expect(actions.some((action) => action.kind === "take-ownership")).toBe(true);
    expect(badges.some((badge) => badge.label === "Perlu perhatian")).toBe(true);
  });

  it("summarizes dashboard automation counts", () => {
    const snapshot = buildDashboardAutomationSnapshot([
      baseTicket,
      {
        ...baseTicket,
        id: "TCK-2",
        status: "in_progress",
        assigneeId: "agent-1",
        assigneeName: "Dina",
      },
    ]);

    expect(snapshot.urgentUnassigned).toBeGreaterThanOrEqual(1);
    expect(snapshot.possibleIncidentGroups).toBeGreaterThanOrEqual(1);
  });
});
