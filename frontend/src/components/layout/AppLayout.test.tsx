import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "./AppLayout";

const logoutMock = vi.fn();
const showToastMock = vi.fn();

vi.mock("../../modules/auth/AuthContext", () => ({
  useAuth: () => ({
    logout: logoutMock,
    isSigningOut: false,
    permissions: {
      canAssignTickets: true,
      canCreateTickets: true,
      canUpdateTicketStatus: true,
      canViewOperationalTickets: true,
    },
    session: {
      subject: "user-123",
      displayName: "OpsDesk User",
      email: "opsdesk.user@example.com",
      avatarUrl: "",
      role: "agent",
    },
    profile: {
      subject: "user-123",
      displayName: "OpsDesk User",
      email: "opsdesk.user@example.com",
      avatarUrl: "",
      role: "agent",
    },
  }),
}));

vi.mock("../common/ToastProvider", () => ({
  useToast: () => ({
    showToast: showToastMock,
  }),
}));

describe("AppLayout", () => {
  beforeEach(() => {
    logoutMock.mockReset();
    showToastMock.mockReset();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("shows toast feedback when logout confirmation fails", async () => {
    logoutMock.mockRejectedValueOnce(new Error("Sesi belum bisa ditutup dari server autentikasi."));

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<AppLayout />} path="/">
            <Route element={<div>Isi dashboard</div>} path="dashboard" />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /OpsDesk User/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Keluar/i }));

    const dialog = await screen.findByRole("dialog", { name: "Keluar dari OpsDesk" });
    fireEvent.click(screen.getByRole("button", { name: "Keluar" }));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith({
        title: "Sesi belum berhasil ditutup",
        description: "Sesi belum bisa ditutup dari server autentikasi.",
        tone: "error",
      });
    });

    expect(dialog).toBeInTheDocument();
  });
});
