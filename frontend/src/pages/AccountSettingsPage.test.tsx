import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSettingsPage } from "./AccountSettingsPage";

const changeCurrentPasswordMock = vi.fn();
const useAuthMock = vi.fn(() => ({
  profile: {
    subject: "user-123",
    displayName: "OpsDesk User",
    email: "opsdesk.user@example.com",
    avatarUrl: "",
    role: "reporter" as const,
  },
  session: null,
}));

vi.mock("../modules/auth/authService", () => ({
  changeCurrentPassword: (...args: unknown[]) => changeCurrentPasswordMock(...args),
}));

vi.mock("../modules/auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

describe("AccountSettingsPage", () => {
  beforeEach(() => {
    changeCurrentPasswordMock.mockReset();
  });

  it("submits change password form with current and new password", async () => {
    changeCurrentPasswordMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <AccountSettingsPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Masukkan kata sandi saat ini"), {
      target: { value: "PasswordSaatIni123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Masukkan kata sandi baru"), {
      target: { value: "PasswordBaru123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ulangi kata sandi baru"), {
      target: { value: "PasswordBaru123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ubah Kata Sandi" }));

    await waitFor(() =>
      expect(changeCurrentPasswordMock).toHaveBeenCalledWith("PasswordSaatIni123", "PasswordBaru123"),
    );

    expect(await screen.findByText("Kata sandi berhasil diubah.")).toBeInTheDocument();
  });

  it("shows a direct link to the API documentation viewer", () => {
    render(
      <MemoryRouter>
        <AccountSettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Ringkasan identitas")).toBeInTheDocument();
    expect(screen.getByText("Akses masuk dan proteksi akun")).toBeInTheDocument();
    expect(screen.getByText("Pusat referensi OpsDesk")).toBeInTheDocument();
    expect(screen.getAllByText("ID sistem")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Ubah Kata Sandi" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Dokumentasi API" })).toHaveAttribute("href", "/api-docs");
    expect(screen.getByRole("link", { name: /Edit nama tampilan dan avatar/i })).toHaveAttribute("href", "/profile");
  });
});
