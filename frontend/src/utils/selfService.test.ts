import { describe, expect, it } from "vitest";
import { buildReporterTicketGuidance, findHelpArticleMatches, getReporterProgressSteps } from "./selfService";

describe("selfService", () => {
  it("finds relevant help articles for login issues", () => {
    const matches = findHelpArticleMatches({
      title: "Login SSO gagal",
      description: "Pengguna tidak bisa masuk dan reset password belum membantu.",
      category: "account_access",
    });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].article.id).toBe("reset-password-sso");
  });

  it("builds reporter guidance from ticket status and visible updates", () => {
    const guidance = buildReporterTicketGuidance(
      {
        id: "TCK-8",
        title: "VPN tidak bisa dipakai",
        description: "Akses kantor gagal dari rumah.",
        status: "in_progress",
        priority: "high",
        category: "network",
        team: "infrastructure",
        reporterName: "Rina",
        reporterEmail: "rina@example.com",
        comments: [
          {
            id: "COM-1",
            ticketId: "TCK-8",
            message: "Kami sedang cek gateway VPN.",
            authorName: "Dina",
            authorRole: "agent",
            visibility: "public",
            createdAt: "2026-04-20T10:00:00Z",
            updatedAt: "2026-04-20T10:00:00Z",
          },
        ],
        attachments: [],
        createdAt: "2026-04-20T09:00:00Z",
        updatedAt: "2026-04-20T10:00:00Z",
      },
      [
        {
          id: "ACT-1",
          ticketId: "TCK-8",
          action: "status_changed",
          summary: "Status diperbarui",
          timestamp: "2026-04-20T10:00:00Z",
          metadata: { afterStatus: "in_progress" },
        },
      ],
    );

    expect(guidance.statusLabel).toBe("berjalan");
    expect(guidance.headline).toContain("sedang diproses");
    expect(guidance.lastUpdate).toContain("Komentar publik terbaru");
  });

  it("returns simple progress steps for reporter portal", () => {
    const steps = getReporterProgressSteps("in_progress");

    expect(steps).toHaveLength(3);
    expect(steps[1].isCurrent).toBe(true);
    expect(steps[0].isComplete).toBe(true);
  });
});
