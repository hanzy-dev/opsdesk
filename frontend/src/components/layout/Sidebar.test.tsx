import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

const useAuthMock = vi.fn(() => ({
  permissions: {
    canAssignTickets: false,
    canCreateTickets: true,
    canUpdateTicketStatus: false,
    canViewOperationalTickets: false,
  },
  logout: vi.fn(),
  isSigningOut: false,
}));

vi.mock("../../modules/auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

describe("Sidebar", () => {
  afterEach(() => {
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({
      permissions: {
        canAssignTickets: false,
        canCreateTickets: true,
        canUpdateTicketStatus: false,
        canViewOperationalTickets: false,
      },
      logout: vi.fn(),
      isSigningOut: false,
    });
  });

  it("shows reporter-oriented navigation items", () => {
    render(
      <MemoryRouter>
        <Sidebar
          isCollapsed={false}
          isMobileOpen={false}
          onCloseMobile={() => undefined}
          onRequestLogout={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Tiket Saya/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ditugaskan ke Saya/i })).not.toBeInTheDocument();
  });

  it("shows operational assignment view for agent roles", () => {
    useAuthMock.mockReturnValue({
      permissions: {
        canAssignTickets: true,
        canCreateTickets: false,
        canUpdateTicketStatus: true,
        canViewOperationalTickets: true,
      },
      logout: vi.fn(),
      isSigningOut: false,
    });

    render(
      <MemoryRouter>
        <Sidebar
          isCollapsed={false}
          isMobileOpen={false}
          onCloseMobile={() => undefined}
          onRequestLogout={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Ditugaskan ke Saya/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Tiket Saya/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Buat Tiket/i })).not.toBeInTheDocument();
  });

  it("allows closing the mobile drawer from the close trigger", () => {
    const onCloseMobile = vi.fn();

    render(
      <MemoryRouter>
        <Sidebar
          isCollapsed={false}
          isMobileOpen={true}
          onCloseMobile={onCloseMobile}
          onRequestLogout={() => undefined}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Tutup navigasi/i })[1]);
    expect(onCloseMobile).toHaveBeenCalledTimes(1);
  });
});
