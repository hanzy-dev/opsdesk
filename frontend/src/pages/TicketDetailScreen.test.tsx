import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TicketDetailPage } from "./TicketDetailScreen";

const getTicketMock = vi.fn();
const getTicketActivitiesMock = vi.fn();
const listAssignableUsersMock = vi.fn();

vi.mock("../api/tickets", () => ({
  addComment: vi.fn(),
  assignTicket: vi.fn(),
  getAttachmentDownloadUrl: vi.fn(),
  getTicket: (ticketId: string) => getTicketMock(ticketId),
  getTicketActivities: (ticketId: string) => getTicketActivitiesMock(ticketId),
  requestAttachmentUploadUrl: vi.fn(),
  saveAttachment: vi.fn(),
  updateTicketStatus: vi.fn(),
  uploadAttachmentFile: vi.fn(),
}));

vi.mock("../api/profile", () => ({
  listAssignableUsers: () => listAssignableUsersMock(),
}));

vi.mock("../modules/auth/AuthContext", () => ({
  useAuth: () => ({
    session: {
      subject: "agent-123",
      email: "petugas@example.com",
      displayName: "Dina Petugas",
      role: "agent",
    },
    profile: {
      subject: "agent-123",
      email: "petugas@example.com",
      displayName: "Dina Petugas",
      role: "agent",
    },
    permissions: {
      canAssignTickets: true,
      canCreateTickets: false,
      canUpdateTicketStatus: true,
      canViewOperationalTickets: true,
    },
  }),
}));

describe("TicketDetailScreen", () => {
  afterEach(() => {
    getTicketMock.mockReset();
    getTicketActivitiesMock.mockReset();
    listAssignableUsersMock.mockReset();
  });

  it("renders operational metadata and auth-derived comment identity", async () => {
    getTicketMock.mockResolvedValue({
      id: "TCK-3001",
      title: "Sinkronisasi data gagal",
      description: "Pekerjaan sinkronisasi malam tidak memproses antrean baru.",
      status: "in_progress",
      priority: "high",
      createdBy: "admin-1",
      createdByName: "Admin OpsDesk",
      createdByEmail: "admin@example.com",
      reporterId: "reporter-22",
      reporterName: "Rina Pratama",
      reporterEmail: "rina@example.com",
      assigneeId: "agent-123",
      assigneeName: "Dina Petugas",
      assignedAt: "2026-04-17T10:30:00Z",
      comments: [
        {
          id: "c-1",
          ticketId: "TCK-3001",
          message: "Investigasi awal sedang berjalan.",
          authorName: "Dina Petugas",
          createdAt: "2026-04-17T11:00:00Z",
          updatedAt: "2026-04-17T11:00:00Z",
        },
      ],
      attachments: [
        {
          id: "a-1",
          ticketId: "TCK-3001",
          fileName: "log-error.txt",
          contentType: "text/plain",
          sizeBytes: 2048,
          uploadedById: "agent-123",
          uploadedByName: "Dina Petugas",
          uploadedByRole: "agent",
          createdAt: "2026-04-17T11:10:00Z",
        },
      ],
      createdAt: "2026-04-17T09:00:00Z",
      updatedAt: "2026-04-17T11:15:00Z",
    });
    getTicketActivitiesMock.mockResolvedValue([
      {
        id: "act-1",
        ticketId: "TCK-3001",
        actorId: "agent-123",
        actorName: "Dina Petugas",
        actorRole: "agent",
        action: "status_changed",
        summary: "Status tiket diperbarui",
        metadata: {
          beforeStatus: "open",
          afterStatus: "in_progress",
        },
        timestamp: "2026-04-17T10:45:00Z",
      },
    ]);
    listAssignableUsersMock.mockResolvedValue([
      {
        subject: "agent-123",
        displayName: "Dina Petugas",
        email: "petugas@example.com",
        role: "agent",
      },
      {
        subject: "agent-222",
        displayName: "Budi Operator",
        email: "budi@example.com",
        role: "agent",
      },
    ]);

    render(
      <MemoryRouter initialEntries={["/tickets/TCK-3001"]}>
        <Routes>
          <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Sinkronisasi data gagal")).toBeInTheDocument();
    expect(screen.getAllByText("Prioritas Tinggi")).toHaveLength(2);
    expect(screen.getByText("Tindakan yang tersedia")).toBeInTheDocument();
    expect(screen.getByText("Timeline aktivitas tiket")).toBeInTheDocument();
    expect(await screen.findByText("Ubah penanggung jawab")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ubah penanggung jawab" }));
    expect(screen.getByRole("option", { name: /Budi Operator/ })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Dina Petugas")).toHaveAttribute("readonly");
    expect(screen.getByText("Dikirim sebagai Dina Petugas (Petugas)")).toBeInTheDocument();

    await waitFor(() => {
      expect(getTicketMock).toHaveBeenCalledWith("TCK-3001");
      expect(getTicketActivitiesMock).toHaveBeenCalledWith("TCK-3001");
      expect(listAssignableUsersMock).toHaveBeenCalled();
    });
  });
});
