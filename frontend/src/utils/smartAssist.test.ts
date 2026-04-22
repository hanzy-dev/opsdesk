import { describe, expect, it } from "vitest";
import { buildOperatorDraftAssist, buildTicketSummaryAssist, findRelatedTickets, getTicketAssistSuggestion } from "./smartAssist";

describe("smartAssist", () => {
  it("suggests account access and high priority from clear login failure signals", () => {
    const result = getTicketAssistSuggestion({
      title: "Login SSO gagal untuk semua dosen",
      description: "Pengguna tidak bisa masuk ke akun dan reset password belum membantu.",
    });

    expect(result.category.value).toBe("account_access");
    expect(result.priority.value).toBe("high");
    expect(result.team.value).toBe("helpdesk");
  });

  it("finds related tickets from overlapping keywords and context", () => {
    const hints = findRelatedTickets(
      {
        title: "Dashboard sinkronisasi gagal",
        description: "Error sinkronisasi data pada aplikasi dashboard.",
        category: "application_bug",
        team: "applications",
      },
      [
        {
          id: "TCK-1",
          title: "Sinkronisasi dashboard error",
          description: "Aplikasi gagal memproses data baru.",
          status: "open",
          priority: "high",
          category: "application_bug",
          team: "applications",
          reporterName: "Rina",
          reporterEmail: "rina@example.com",
          comments: [],
          attachments: [],
          createdAt: "2026-04-20T08:00:00Z",
          updatedAt: "2026-04-20T09:00:00Z",
        },
      ],
    );

    expect(hints).toHaveLength(1);
    expect(hints[0].ticket.id).toBe("TCK-1");
  });

  it("builds explainable summary and draft assist from ticket data", () => {
    const ticket = {
      id: "TCK-1",
      title: "API timeout",
      description: "Dashboard gagal memuat data tiket.",
      status: "in_progress" as const,
      priority: "high" as const,
      category: "application_bug" as const,
      team: "applications" as const,
      reporterName: "Rina",
      reporterEmail: "rina@example.com",
      assigneeId: "agent-1",
      assigneeName: "Dina Petugas",
      assignedAt: "2026-04-20T08:30:00Z",
      comments: [],
      attachments: [],
      createdAt: "2026-04-20T08:00:00Z",
      updatedAt: "2026-04-20T09:00:00Z",
    };
    const activities = [
      {
        id: "ACT-1",
        ticketId: "TCK-1",
        action: "status_changed" as const,
        summary: "Status diubah",
        timestamp: "2026-04-20T09:00:00Z",
        metadata: { afterStatus: "in_progress" },
      },
    ];

    const summary = buildTicketSummaryAssist(ticket, activities);
    const draft = buildOperatorDraftAssist(ticket, activities, []);

    expect(summary.headline).toContain("Bug aplikasi");
    expect(summary.bullets.length).toBeGreaterThan(1);
    expect(draft.publicReply).toContain("Halo Rina");
    expect(draft.internalNote).toContain("Aplikasi");
  });
});
