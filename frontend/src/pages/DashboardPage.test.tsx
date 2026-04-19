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

  it("renders operational sections and quick actions", async () => {
    listTicketsMock
      .mockResolvedValueOnce({ items: [], pagination: { total_items: 8 } })
      .mockResolvedValueOnce({ items: [], pagination: { total_items: 3 } })
      .mockResolvedValueOnce({ items: [], pagination: { total_items: 2 } })
      .mockResolvedValueOnce({ items: [], pagination: { total_items: 3 } })
      .mockResolvedValueOnce({ items: [], pagination: { total_items: 2 } })
      .mockResolvedValueOnce({
        items: [
          {
            id: "TCK-1001",
            title: "API timeout",
            description: "Gangguan backend",
            status: "open",
            priority: "high",
            reporterName: "Rina",
            reporterEmail: "rina@example.com",
            comments: [],
            attachments: [],
            updatedAt: "2026-04-19T09:00:00Z",
            createdAt: "2026-04-19T08:00:00Z",
          },
        ],
        pagination: { total_items: 8 },
      });

    getTicketActivitiesMock.mockResolvedValueOnce([
      {
        id: "ACT-1",
        ticketId: "TCK-1001",
        action: "ticket_created",
        summary: "Tiket dibuat",
        timestamp: "2026-04-19T09:05:00Z",
        actorName: "Rina",
      },
    ]);

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Pantau kesehatan antrean dan tindak lanjut berikutnya")).toBeInTheDocument();
    expect(screen.getByText("Tiket terbaru")).toBeInTheDocument();
    expect(screen.getByText("Aktivitas terbaru yang layak dipantau")).toBeInTheDocument();
    expect(screen.getByText("Jalur kerja yang paling sering dibutuhkan")).toBeInTheDocument();
    expect(screen.getAllByText("API timeout")).toHaveLength(2);
    expect(screen.getByText("Tiket dibuat")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByRole("link", { name: /Buat tiket baru/i })).toHaveLength(2);
    });
  });
});
