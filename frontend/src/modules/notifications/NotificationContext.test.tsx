import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import { listNotifications } from "../../api/notifications";
import { useAuth } from "../auth/AuthContext";
import { NotificationProvider, useNotifications } from "./NotificationContext";

vi.mock("../../api/notifications", () => ({
  listNotifications: vi.fn(),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const listNotificationsMock = vi.mocked(listNotifications);
const useAuthMock = vi.mocked(useAuth);

const authenticatedSession = {
  subject: "user-123",
  accessToken: "access-token",
  idToken: "id-token",
  refreshToken: "refresh-token",
  expiresAt: Date.now() + 3600000,
  displayName: "OpsDesk User",
  email: "opsdesk.user@example.com",
  avatarUrl: "",
  groups: ["agent"],
  role: "agent" as const,
};

describe("NotificationProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    listNotificationsMock.mockReset();
    useAuthMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not fetch or poll notifications while unauthenticated", () => {
    mockAuth({ isAuthenticated: false, session: null });

    renderWithProvider();

    act(() => {
      vi.advanceTimersByTime(180000);
    });

    expect(listNotificationsMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("notification-count")).toHaveTextContent("0");
  });

  it("keeps an empty notification list when the API returns no items", async () => {
    mockAuth({ isAuthenticated: true, session: authenticatedSession });
    listNotificationsMock.mockResolvedValueOnce([]);

    renderWithProvider();

    await act(async () => {
      await Promise.resolve();
    });

    expect(listNotificationsMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("notification-count")).toHaveTextContent("0");
  });

  it("pauses notification polling after a terminal authorization error", async () => {
    mockAuth({ isAuthenticated: true, session: authenticatedSession });
    listNotificationsMock.mockRejectedValue(new ApiError("Sesi tidak valid.", 401, "unauthorized"));

    renderWithProvider();

    await act(async () => {
      await Promise.resolve();
    });

    expect(listNotificationsMock).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(180000);
    });

    expect(listNotificationsMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("notification-count")).toHaveTextContent("0");
  });
});

function renderWithProvider() {
  render(
    <NotificationProvider>
      <NotificationProbe />
    </NotificationProvider>,
  );
}

function NotificationProbe() {
  const { notifications } = useNotifications();

  return <span data-testid="notification-count">{notifications.length}</span>;
}

function mockAuth({
  isAuthenticated,
  session,
}: {
  isAuthenticated: boolean;
  session: typeof authenticatedSession | null;
}) {
  useAuthMock.mockReturnValue({
    isAuthenticated,
    isLoading: false,
    isAuthenticating: false,
    isSigningOut: false,
    session,
    profile: null,
    isProfileLoading: false,
    profileError: null,
    roleLabel: session ? "Agent" : null,
    permissions: {
      canAssignTickets: Boolean(session),
      canCreateTickets: Boolean(session),
      canUpdateTicketStatus: Boolean(session),
      canViewOperationalTickets: Boolean(session),
    },
    login: vi.fn(),
    logout: vi.fn(),
    refreshProfile: vi.fn(),
    saveProfile: vi.fn(),
  });
}
