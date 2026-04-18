import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { TicketsPage } from "./TicketsPage";

const listTicketsMock = vi.fn();

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
  useAuth: () => ({
    permissions: {
      canAssignTickets: true,
      canCreateTickets: false,
      canUpdateTicketStatus: true,
      canViewOperationalTickets: true,
    },
  }),
}));

describe("TicketsPage error handling", () => {
  afterEach(() => {
    listTicketsMock.mockReset();
  });

  it("renders backend reference code when listing tickets fails", async () => {
    listTicketsMock.mockRejectedValueOnce(
      new ApiError(
        "Layanan backend sedang mengalami kendala. Silakan coba beberapa saat lagi.",
        500,
        "internal_error",
        undefined,
        "req-list-123",
      ),
    );

    render(
      <MemoryRouter>
        <TicketsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Daftar tiket belum tersedia")).toBeInTheDocument();
    expect(
      screen.getByText("Layanan backend sedang mengalami kendala. Silakan coba beberapa saat lagi."),
    ).toBeInTheDocument();
    expect(screen.getByText("Kode referensi: req-list-123")).toBeInTheDocument();
  });

  it("shows assignee filter for operational roles", async () => {
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

    await waitFor(() => {
      expect(screen.getByText("Penugasan")).toBeInTheDocument();
    });
  });

  it("applies assigned preset when opened from assigned route", async () => {
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
      <MemoryRouter initialEntries={["/tickets/assigned"]}>
        <TicketsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(listTicketsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          assignee: "me",
        }),
      );
    });

    expect(screen.getByText("Fokus pada tiket yang ditugaskan ke Anda")).toBeInTheDocument();
  });
});
