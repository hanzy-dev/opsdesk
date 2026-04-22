import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { CreateTicketPage } from "./CreateTicketPage";

const createTicketMock = vi.fn();
const requestAttachmentUploadUrlMock = vi.fn();
const saveAttachmentMock = vi.fn();
const uploadAttachmentFileMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("../config/env", () => ({
  env: {
    apiBaseUrl: "https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1",
    cognitoRegion: "ap-southeast-1",
    cognitoUserPoolId: "ap-southeast-1_example",
    cognitoClientId: "exampleclientid123456789",
  },
}));

vi.mock("../api/tickets", () => ({
  createTicket: (input: unknown) => createTicketMock(input),
  requestAttachmentUploadUrl: (ticketId: string, input: unknown) => requestAttachmentUploadUrlMock(ticketId, input),
  saveAttachment: (ticketId: string, input: unknown) => saveAttachmentMock(ticketId, input),
  uploadAttachmentFile: (...args: unknown[]) => uploadAttachmentFileMock(...args),
}));

vi.mock("../modules/auth/AuthContext", () => ({
  useAuth: () => ({
    session: {
      subject: "admin-123",
      email: "aulia@example.com",
      displayName: "Aulia Rahman",
      role: "admin",
    },
    profile: {
      subject: "admin-123",
      email: "aulia@example.com",
      displayName: "Aulia Rahman",
      role: "admin",
    },
    permissions: {
      canAssignTickets: true,
      canCreateTickets: true,
      canUpdateTicketStatus: true,
      canViewOperationalTickets: true,
    },
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("CreateTicketPage smoke tests", () => {
  const createObjectURLMock = vi.fn(() => "blob:preview-url");
  const revokeObjectURLMock = vi.fn();

  URL.createObjectURL = createObjectURLMock;
  URL.revokeObjectURL = revokeObjectURLMock;

  afterEach(() => {
    createTicketMock.mockReset();
    requestAttachmentUploadUrlMock.mockReset();
    saveAttachmentMock.mockReset();
    uploadAttachmentFileMock.mockReset();
    navigateMock.mockReset();
    createObjectURLMock.mockClear();
    revokeObjectURLMock.mockClear();
  });

  it("prevents submit while required fields are empty", async () => {
    render(<CreateTicketPage />);

    const submitButton = screen.getByRole("button", { name: "Simpan Tiket" });
    expect(submitButton).toBeDisabled();

    fireEvent.click(submitButton);

    expect(createTicketMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("Contoh: API timeout di layanan tiket"), {
      target: { value: "   " },
    });
    fireEvent.blur(screen.getByPlaceholderText("Contoh: API timeout di layanan tiket"));
    fireEvent.change(screen.getByPlaceholderText("Jelaskan gejala, dampak, dan konteks singkat."), {
      target: { value: "   " },
    });
    fireEvent.blur(screen.getByPlaceholderText("Jelaskan gejala, dampak, dan konteks singkat."));

    expect(await screen.findByText("Judul tiket wajib diisi.")).toBeInTheDocument();
    expect(screen.getByText("Deskripsi tiket wajib diisi.")).toBeInTheDocument();
  });

  it("submits the main ticket form, uploads selected attachments, and redirects to the detail page", async () => {
    createTicketMock.mockResolvedValueOnce({
      id: "TCK-2001",
    });
    requestAttachmentUploadUrlMock.mockResolvedValueOnce({
      attachmentId: "ATT-1001",
      objectKey: "tickets/TCK-2001/attachments/ATT-1001/dashboard-error.png",
      uploadUrl: "https://upload.example.com/att-1001",
      uploadMethod: "PUT",
      uploadHeaders: {
        "Content-Type": "image/png",
      },
      expiresAt: "2026-04-20T12:00:00Z",
    });
    uploadAttachmentFileMock.mockImplementation(async (_target, _file, onProgress?: (progress: number) => void) => {
      onProgress?.(100);
    });
    saveAttachmentMock.mockResolvedValueOnce({
      id: "ATT-1001",
      ticketId: "TCK-2001",
    });

    render(<CreateTicketPage />);

    fireEvent.change(screen.getByPlaceholderText("Contoh: API timeout di layanan tiket"), {
      target: { value: "API timeout pada dashboard" },
    });
    fireEvent.change(screen.getByPlaceholderText("Jelaskan gejala, dampak, dan konteks singkat."), {
      target: { value: "Dashboard gagal memuat data tiket selama jam sibuk." },
    });

    const file = new File(["mock image"], "dashboard-error.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Lampiran pendukung"), {
      target: { files: [file] },
    });

    expect(await screen.findByText("dashboard-error.png")).toBeInTheDocument();
    expect(screen.getByAltText("Pratinjau dashboard-error.png")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Simpan Tiket" }));

    await waitFor(() => {
      expect(createTicketMock).toHaveBeenCalledWith({
        title: "API timeout pada dashboard",
        description: "Dashboard gagal memuat data tiket selama jam sibuk.",
        priority: "medium",
        category: "account_access",
        team: "helpdesk",
        reporterName: "Aulia Rahman",
        reporterEmail: "aulia@example.com",
      });
    });

    await waitFor(() => {
      expect(requestAttachmentUploadUrlMock).toHaveBeenCalledWith("TCK-2001", {
        fileName: "dashboard-error.png",
        contentType: "image/png",
        sizeBytes: file.size,
      });
      expect(saveAttachmentMock).toHaveBeenCalledWith("TCK-2001", {
        attachmentId: "ATT-1001",
        objectKey: "tickets/TCK-2001/attachments/ATT-1001/dashboard-error.png",
        fileName: "dashboard-error.png",
      });
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/tickets/TCK-2001");
    });
  });

  it("allows removing a selected attachment before submit", async () => {
    render(<CreateTicketPage />);

    fireEvent.change(screen.getByPlaceholderText("Contoh: API timeout di layanan tiket"), {
      target: { value: "Screenshot error gateway" },
    });
    fireEvent.change(screen.getByPlaceholderText("Jelaskan gejala, dampak, dan konteks singkat."), {
      target: { value: "Lampiran akan dihapus sebelum tiket dikirim." },
    });

    const file = new File(["mock image"], "gateway-error.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Lampiran pendukung"), {
      target: { files: [file] },
    });

    expect(await screen.findByText("gateway-error.png")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hapus gateway-error.png" }));

    await waitFor(() => {
      expect(screen.queryByText("gateway-error.png")).not.toBeInTheDocument();
    });
  });

  it("shows reporter identity as derived read-only fields", () => {
    render(<CreateTicketPage />);

    expect(screen.getByText("Pelapor aktif")).toBeInTheDocument();
    expect(screen.getByText("Aulia Rahman")).toBeInTheDocument();
    expect(screen.getByText("aulia@example.com")).toBeInTheDocument();
    expect(screen.getByText("admin-123")).toBeInTheDocument();
    expect(
      screen.getByText("Identitas pelapor akan terpasang otomatis pada tiket agar audit trail tetap rapi dan konsisten."),
    ).toBeInTheDocument();
  });

  it("shows backend reference code when ticket creation fails", async () => {
    createTicketMock.mockRejectedValueOnce(
      new ApiError(
        "Permintaan belum valid. Periksa kembali data yang diisi.",
        400,
        "validation_failed",
        [{ field: "title", message: "Judul tiket wajib diisi." }],
        "req-create-123",
      ),
    );

    render(<CreateTicketPage />);

    fireEvent.change(screen.getByPlaceholderText("Contoh: API timeout di layanan tiket"), {
      target: { value: "API timeout pada dashboard" },
    });
    fireEvent.change(screen.getByPlaceholderText("Jelaskan gejala, dampak, dan konteks singkat."), {
      target: { value: "Dashboard gagal memuat data tiket selama jam sibuk." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Simpan Tiket" }));

    expect(await screen.findByText("Permintaan belum valid. Periksa kembali data yang diisi.")).toBeInTheDocument();
    expect(screen.getByText("Kode referensi: req-create-123")).toBeInTheDocument();
    expect(screen.getByText("Judul tiket wajib diisi.")).toBeInTheDocument();
  });
});
