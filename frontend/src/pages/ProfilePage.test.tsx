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
      avatarUrl: "https://images.example.com/rina.jpg",
      role: "reporter" as const,
    });

    render(<ProfilePage />);

    expect(screen.getByDisplayValue("OpsDesk User")).toBeInTheDocument();
    expect(screen.getByDisplayValue("opsdesk.user@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("user-123")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nama tampilan"), { target: { value: "Rina Aulia" } });
    fireEvent.change(screen.getByPlaceholderText("https://contoh.com/avatar.jpg"), {
      target: { value: "https://images.example.com/rina.jpg" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Profil" }));

    await waitFor(() =>
      expect(saveProfileMock).toHaveBeenCalledWith({
        displayName: "Rina Aulia",
        avatarUrl: "https://images.example.com/rina.jpg",
      }),
    );

    expect(await screen.findByText("Profil berhasil diperbarui.")).toBeInTheDocument();
  });
});
