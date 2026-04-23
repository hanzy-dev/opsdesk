import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { HelpCenterPage } from "./HelpCenterPage";

vi.mock("../modules/auth/AuthContext", () => ({
  useAuth: () => ({
    permissions: {
      canAssignTickets: false,
      canCreateTickets: true,
      canUpdateTicketStatus: false,
      canViewOperationalTickets: false,
    },
  }),
}));

describe("HelpCenterPage", () => {
  it("renders local help content and filters by query", () => {
    render(
      <MemoryRouter>
        <HelpCenterPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Cari panduan cepat sebelum membuat atau menindaklanjuti tiket")).toBeInTheDocument();
    expect(screen.getByText("Audit trail yang tetap utuh")).toBeInTheDocument();
    expect(screen.getByText("Dari panduan ke tindak lanjut tanpa pindah kanal")).toBeInTheDocument();
    expect(screen.getAllByText("Masalah login, sandi, atau akses SSO").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText("Contoh: login, VPN, printer, timeout, status tiket"), {
      target: { value: "printer" },
    });

    expect(screen.getAllByText("Printer atau perangkat kerja tidak merespons").length).toBeGreaterThan(0);
  });
});
