import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { CreateTicketPage } from "./CreateTicketPage";

const createTicketMock = vi.fn();
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
  it("submits the main ticket form and redirects to the detail page", async () => {
    createTicketMock.mockResolvedValueOnce({
      id: "TCK-2001",
    });

    render(<CreateTicketPage />);

    fireEvent.change(screen.getByPlaceholderText("Contoh: API timeout di layanan tiket"), {
      target: { value: "API timeout pada dashboard" },
    });
    fireEvent.change(screen.getByPlaceholderText("Jelaskan gejala, dampak, dan konteks singkat."), {
      target: { value: "Dashboard gagal memuat data tiket selama jam sibuk." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Simpan Tiket" }));

    await waitFor(() => {
      expect(createTicketMock).toHaveBeenCalledWith({
        title: "API timeout pada dashboard",
        description: "Dashboard gagal memuat data tiket selama jam sibuk.",
        priority: "medium",
        reporterName: "Aulia Rahman",
        reporterEmail: "aulia@example.com",
      });
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/tickets/TCK-2001");
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

    fireEvent.click(screen.getByRole("button", { name: "Simpan Tiket" }));

    expect(await screen.findByText("Permintaan belum valid. Periksa kembali data yang diisi.")).toBeInTheDocument();
    expect(screen.getByText("Kode referensi: req-create-123")).toBeInTheDocument();
    expect(screen.getByText("Judul tiket wajib diisi.")).toBeInTheDocument();
  });
});
