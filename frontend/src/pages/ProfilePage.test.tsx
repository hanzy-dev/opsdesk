import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilePage } from "./ProfilePage";

const saveProfileMock = vi.fn();
const refreshProfileMock = vi.fn();
const useAuthMock = vi.fn(() => ({
  profile: {
    subject: "user-123",
    displayName: "OpsDesk User",
    email: "opsdesk.user@example.com",
    avatarUrl: "",
    role: "reporter" as const,
  },
  session: null,
  isProfileLoading: false,
  profileError: null,
  refreshProfile: refreshProfileMock,
  saveProfile: saveProfileMock,
}));

vi.mock("../modules/auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    saveProfileMock.mockReset();
    refreshProfileMock.mockReset();
    useAuthMock.mockClear();
    useAuthMock.mockReturnValue({
      profile: {
        subject: "user-123",
        displayName: "OpsDesk User",
        email: "opsdesk.user@example.com",
        avatarUrl: "",
        role: "reporter" as const,
      },
      session: null,
      isProfileLoading: false,
      profileError: null,
      refreshProfile: refreshProfileMock,
      saveProfile: saveProfileMock,
    });
  });

  it("renders profile identity and submits updated display name", async () => {
    saveProfileMock.mockResolvedValue({
      subject: "user-123",
      displayName: "Rina Aulia",
      email: "opsdesk.user@example.com",
      avatarUrl: "",
      role: "reporter" as const,
    });

    render(<ProfilePage />);

    expect(screen.getByDisplayValue("OpsDesk User")).toBeInTheDocument();
    expect(screen.getByText("Informasi sistem akun")).toBeInTheDocument();
    expect(screen.getByText("Ganti nama tampilan dan avatar")).toBeInTheDocument();
    expect(screen.getByText("Nama yang tampil saat ini")).toBeInTheDocument();
    expect(screen.getByText("Setelah disimpan akan tampil sebagai")).toBeInTheDocument();
    expect(screen.getAllByText("opsdesk.user@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("user-123").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Simpan Perubahan Profil" })).toBeDisabled();

    fireEvent.change(screen.getByDisplayValue("OpsDesk User"), { target: { value: "Rina Aulia" } });
    expect(screen.getByRole("button", { name: "Simpan Nama Tampilan" })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Simpan Nama Tampilan" }));

    await waitFor(() =>
      expect(saveProfileMock).toHaveBeenCalledWith({
        displayName: "Rina Aulia",
        avatarUrl: "",
      }),
    );

    expect(await screen.findByText("Nama tampilan aktif sekarang: Rina Aulia.")).toBeInTheDocument();
  });
});
