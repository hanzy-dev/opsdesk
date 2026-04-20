import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TicketsPage } from "./TicketsPage";

const listTicketsMock = vi.fn();
const useAuthMock = vi.fn(() => ({
  permissions: {
    canAssignTickets: false,
    canCreateTickets: true,
    canUpdateTicketStatus: false,
    canViewOperationalTickets: false,
  },
}));

vi.mock("../config/env", () => ({
  env: {
    apiBaseUrl: "https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1",
    cognitoRegion: "ap-southeast-1",
    cognitoUserPoolId: "ap-southeast-1_example",
    cognitoClientId: "exampleclientid123456789",
  },
}));

vi.mock("../api/tickets", () => ({
  listTickets: (options?: unknown) => listTicketsMock(options),
}));

vi.mock("../modules/auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

describe("TicketsPage smoke tests", () => {
  afterEach(() => {
    listTicketsMock.mockReset();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({
      permissions: {
        canAssignTickets: false,
        canCreateTickets: true,
        canUpdateTicketStatus: false,
        canViewOperationalTickets: false,
      },
    });
  });

  it("renders ticket data and supports search plus status filter", async () => {
    listTicketsMock.mockResolvedValue({
      items: [
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
      ],
      pagination: {
        page: 1,
        page_size: 10,
        total_items: 2,
        total_pages: 1,
        has_next: false,
      },
    });

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
    fireEvent.click(screen.getByRole("button", { name: "Cari" }));

    await waitFor(() => {
      expect(listTicketsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          q: "Rina",
          page: 1,
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Filter status" }));
    fireEvent.click(await screen.findByRole("option", { name: "Selesai" }));

    await waitFor(() => {
      expect(listTicketsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: "resolved",
        }),
      );
    });
  });

  it("hides create ticket action for agent accounts", async () => {
    useAuthMock.mockReturnValue({
      permissions: {
        canAssignTickets: true,
        canCreateTickets: false,
        canUpdateTicketStatus: true,
        canViewOperationalTickets: true,
      },
    });
    listTicketsMock.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        page_size: 10,
        total_items: 0,
        total_pages: 0,
        has_next: false,
      },
    });

    render(
      <MemoryRouter>
        <TicketsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Belum ada tiket yang tercatat")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Buat Tiket" })).not.toBeInTheDocument();
  });

  it("shows reporter-focused copy on my tickets route", async () => {
    listTicketsMock.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        page_size: 10,
        total_items: 0,
        total_pages: 0,
        has_next: false,
      },
    });

    render(
      <MemoryRouter initialEntries={["/tickets/mine"]}>
        <TicketsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Pantau tiket yang Anda ajukan")).toBeInTheDocument();
    expect(screen.getByText("Belum ada tiket pada akun Anda")).toBeInTheDocument();
  });
});
