import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TicketDetailPage } from "./TicketDetailScreen";

const getTicketMock = vi.fn();
const getTicketActivitiesMock = vi.fn();
const listTicketsMock = vi.fn();

vi.mock("../api/tickets", () => ({
  addComment: vi.fn(),
  assignTicket: vi.fn(),
  getAttachmentDownloadUrl: vi.fn(),
  getTicket: (ticketId: string) => getTicketMock(ticketId),
  getTicketActivities: (ticketId: string) => getTicketActivitiesMock(ticketId),
  listTickets: (...args: unknown[]) => listTicketsMock(...args),
  requestAttachmentUploadUrl: vi.fn(),
  saveAttachment: vi.fn(),
  updateTicketStatus: vi.fn(),
  uploadAttachmentFile: vi.fn(),
}));

vi.mock("../api/profile", () => ({
  listAssignableUsers: vi.fn(() => Promise.resolve([])),
}));

vi.mock("../modules/auth/AuthContext", () => ({
  useAuth: () => ({
    session: {
      subject: "reporter-123",
      email: "pelapor@example.com",
      displayName: "Sinta Pelapor",
      role: "reporter",
    },
    profile: {
      subject: "reporter-123",
      email: "pelapor@example.com",
      displayName: "Sinta Pelapor",
      role: "reporter",
    },
    permissions: {
      canAssignTickets: false,
      canCreateTickets: true,
      canUpdateTicketStatus: false,
      canViewOperationalTickets: false,
    },
  }),
}));

describe("TicketDetailScreen reporter portal", () => {
  afterEach(() => {
    getTicketMock.mockReset();
    getTicketActivitiesMock.mockReset();
    listTicketsMock.mockReset();
  });

  it("shows reporter guidance, progress, and related help without operational controls", async () => {
    getTicketMock.mockResolvedValue({
      id: "TCK-8101",
      title: "Login SSO gagal untuk portal",
      description: "Saya tidak bisa masuk dan reset password belum membantu.",
      status: "open",
      priority: "medium",
      category: "account_access",
      team: "helpdesk",
      reporterName: "Sinta Pelapor",
      reporterEmail: "pelapor@example.com",
      comments: [
        {
          id: "COM-1",
          ticketId: "TCK-8101",
          message: "Tiket sudah kami terima.",
          authorName: "Tim Helpdesk",
          authorRole: "agent",
          visibility: "public",
          createdAt: "2026-04-21T09:00:00Z",
          updatedAt: "2026-04-21T09:00:00Z",
        },
      ],
      attachments: [],
      createdAt: "2026-04-21T08:30:00Z",
      updatedAt: "2026-04-21T09:00:00Z",
    });
    getTicketActivitiesMock.mockResolvedValue([
      {
        id: "ACT-1",
        ticketId: "TCK-8101",
        action: "ticket_created",
        summary: "Tiket dibuat",
        timestamp: "2026-04-21T08:30:00Z",
      },
    ]);
    listTicketsMock.mockResolvedValue({
      items: [],
      pagination: { page: 1, page_size: 100, total_items: 0, total_pages: 0, has_next: false },
    });

    render(
      <MemoryRouter initialEntries={["/tickets/TCK-8101"]}>
        <Routes>
          <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Progres dan langkah berikutnya")).toBeInTheDocument();
    expect(screen.getByText("Apa yang sebaiknya dilakukan pelapor")).toBeInTheDocument();
    expect(screen.getByText("Bantuan mandiri yang relevan")).toBeInTheDocument();
    expect(screen.getByText("Lebih jelas daripada follow up lewat chat terpisah")).toBeInTheDocument();
    expect(screen.queryByText("Pilih penanggung jawab")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Perbarui Status" })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(getTicketMock).toHaveBeenCalledWith("TCK-8101");
      expect(getTicketActivitiesMock).toHaveBeenCalledWith("TCK-8101");
    });
  });
});
