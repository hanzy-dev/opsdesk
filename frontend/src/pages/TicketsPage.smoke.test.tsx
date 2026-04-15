import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TicketsPage } from "./TicketsPage";

const listTicketsMock = vi.fn();

vi.mock("../api/tickets", () => ({
  listTickets: () => listTicketsMock(),
}));

describe("TicketsPage smoke tests", () => {
  afterEach(() => {
    listTicketsMock.mockReset();
  });

  it("renders ticket data and supports search plus status filter", async () => {
    listTicketsMock.mockResolvedValue([
      {
        id: "TCK-1001",
        title: "Gangguan login SSO",
        description: "Mahasiswa tidak dapat masuk ke portal",
        status: "open",
        priority: "high",
        reporterName: "Rina",
        reporterEmail: "rina@example.com",
        comments: [],
        createdAt: "2026-04-15T12:00:00Z",
        updatedAt: "2026-04-15T12:00:00Z",
      },
      {
        id: "TCK-1002",
        title: "Reset akses printer lab",
        description: "Perlu akses ulang untuk printer lantai 2",
        status: "resolved",
        priority: "low",
        reporterName: "Bagus",
        reporterEmail: "bagus@example.com",
        comments: [],
        createdAt: "2026-04-14T08:00:00Z",
        updatedAt: "2026-04-15T08:30:00Z",
      },
    ]);

    render(
      <MemoryRouter>
        <TicketsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Gangguan login SSO")).toBeInTheDocument();
    expect(screen.getByText("Reset akses printer lab")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Cari ID tiket, judul, atau nama pelapor"), {
      target: { value: "Rina" },
    });

    await waitFor(() => {
      expect(screen.getByText("Gangguan login SSO")).toBeInTheDocument();
      expect(screen.queryByText("Reset akses printer lab")).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Cari ID tiket, judul, atau nama pelapor"), {
      target: { value: "" },
    });

    fireEvent.change(screen.getByDisplayValue("Semua status"), {
      target: { value: "resolved" },
    });

    await waitFor(() => {
      expect(screen.getByText("Reset akses printer lab")).toBeInTheDocument();
      expect(screen.queryByText("Gangguan login SSO")).not.toBeInTheDocument();
    });
  });
});
