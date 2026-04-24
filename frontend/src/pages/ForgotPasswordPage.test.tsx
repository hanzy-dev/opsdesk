import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordPage } from "./ForgotPasswordPage";

const startForgotPasswordMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("../modules/auth/authService", () => ({
  startForgotPassword: (...args: unknown[]) => startForgotPasswordMock(...args),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    startForgotPasswordMock.mockReset();
    navigateMock.mockReset();
  });

  it("requests reset code and redirects to reset page", async () => {
    startForgotPasswordMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Kirim kode verifikasi ke email akun")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buka Pusat Bantuan" })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("nama@perusahaan.com"), {
      target: { value: "opsdesk.user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kirim Kode Verifikasi" }));

    await waitFor(() => expect(startForgotPasswordMock).toHaveBeenCalledWith("opsdesk.user@example.com"));

    expect(navigateMock).toHaveBeenCalledWith("/reset-password?email=opsdesk.user%40example.com", {
      replace: true,
      state: { email: "opsdesk.user@example.com" },
    });
  });
});
