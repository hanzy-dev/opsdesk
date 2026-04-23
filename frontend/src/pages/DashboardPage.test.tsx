import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";

const listTicketsMock = vi.fn();
const getTicketActivitiesMock = vi.fn();

vi.mock("../api/tickets", () => ({
  listTickets: (options?: unknown) => listTicketsMock(options),
  getTicketActivities: (ticketId: string) => getTicketActivitiesMock(ticketId),
}));

vi.mock("../modules/auth/AuthContext", () => ({
  useAuth: () => ({
    session: {
      subject: "user-123",
    },
    permissions: {
      canAssignTickets: true,
      canCreateTickets: true,
      canUpdateTicketStatus: true,
      canViewOperationalTickets: true,
    },
  }),
}));

describe("DashboardPage", () => {
  afterEach(() => {
    listTicketsMock.mockReset();
    getTicketActivitiesMock.mockReset();
  });

  it("renders analytics, workload, and operational quick actions", async () => {
    const analyticsTickets = [
      {
        id: "TCK-1001",
        title: "API timeout",
        description: "Gangguan backend",
        status: "open",
        priority: "high",
        category: "application_bug",
        team: "applications",
        reporterName: "Rina",
        reporterEmail: "rina@example.com",
        comments: [],
        attachments: [],
        assigneeId: "user-123",
        assigneeName: "Dina Petugas",
        updatedAt: "2026-04-19T09:00:00Z",
        createdAt: "2026-04-19T08:00:00Z",
      },
      {
        id: "TCK-1002",
        title: "Akses VPN gagal",
        description: "Tidak bisa login VPN",
        status: "resolved",
        priority: "medium",
        category: "account_access",
        team: "helpdesk",
        reporterName: "Budi",
        reporterEmail: "budi@example.com",
        comments: [],
        attachments: [],
        assigneeId: "agent-456",
        assigneeName: "Rafi Helpdesk",
        updatedAt: "2026-04-18T09:00:00Z",
        createdAt: "2026-04-18T06:00:00Z",
      },
      {
        id: "TCK-1003",
        title: "Printer kantor bermasalah",
        description: "Printer tidak merespons",
        status: "in_progress",
        priority: "low",
        category: "hardware",
        team: "infrastructure",
        reporterName: "Sinta",
        reporterEmail: "sinta@example.com",
        comments: [],
        attachments: [],
        updatedAt: "2026-04-17T09:00:00Z",
        createdAt: "2026-04-17T07:30:00Z",
      },
    ];

    listTicketsMock.mockImplementation((options?: {
      status?: string;
      assignee?: string;
      pageSize?: number;
    }) => {
      if (options?.status === "open") {
        return Promise.resolve({ items: [], pagination: { total_items: 3 } });
      }

      if (options?.status === "in_progress") {
        return Promise.resolve({ items: [], pagination: { total_items: 2 } });
      }

      if (options?.status === "resolved") {
        return Promise.resolve({ items: [], pagination: { total_items: 3 } });
      }

      if (options?.assignee === "unassigned") {
        return Promise.resolve({ items: [], pagination: { total_items: 1 } });
      }

      if (options?.assignee === "me") {
        return Promise.resolve({ items: [], pagination: { total_items: 2 } });
      }

      return Promise.resolve({
        items: analyticsTickets,
        pagination: { total_items: 3 },
      });
    });

    getTicketActivitiesMock.mockImplementation((ticketId: string) => {
      if (ticketId === "TCK-1002") {
        return Promise.resolve([
          {
            id: "ACT-2",
            ticketId: "TCK-1002",
            action: "status_changed",
            summary: "Status diubah",
            timestamp: "2026-04-18T10:00:00Z",
            actorName: "Rafi Helpdesk",
            metadata: {
              beforeStatus: "in_progress",
              afterStatus: "resolved",
            },
          },
        ]);
      }

      return Promise.resolve([
        {
          id: `ACT-${ticketId}`,
          ticketId,
          action: "ticket_created",
          summary: "Tiket dibuat",
          timestamp: "2026-04-19T09:05:00Z",
          actorName: "Rina",
        },
      ]);
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Pantau kesehatan antrean, distribusi beban, dan ritme operasional")).toBeInTheDocument();
    expect(screen.getByText("Insight utama")).toBeInTheDocument();
    expect(screen.getByText("Pola kebutuhan yang paling sering masuk")).toBeInTheDocument();
    expect(screen.getByText("Sebaran tiket per tim operasional")).toBeInTheDocument();
    expect(screen.getByText("Sinyal atensi yang paling perlu dibaca cepat")).toBeInTheDocument();
    expect(screen.getByText("Distribusi kerja dan kapasitas yang paling terlihat")).toBeInTheDocument();
    expect(screen.getAllByText("Kecepatan penyelesaian").length).toBeGreaterThan(0);
    expect(screen.getAllByText("API timeout").length).toBeGreaterThan(0);
    expect(screen.getByText("Dina Petugas")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByRole("link", { name: /Buat tiket baru/i })).toHaveLength(2);
    });
  });
});
