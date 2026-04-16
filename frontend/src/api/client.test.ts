import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest } from "./client";

const getValidIdTokenMock = vi.fn();
const clearStoredSessionMock = vi.fn();

vi.mock("../config/env", () => ({
  env: {
    apiBaseUrl: "https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1",
  },
}));

vi.mock("../modules/auth/authService", () => ({
  getValidIdToken: () => getValidIdTokenMock(),
}));

vi.mock("../modules/auth/sessionStore", () => ({
  clearStoredSession: () => clearStoredSessionMock(),
}));

describe("apiRequest", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    getValidIdTokenMock.mockResolvedValue("token-123");
  });

  afterEach(() => {
    fetchMock.mockReset();
    getValidIdTokenMock.mockReset();
    clearStoredSessionMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("returns requestId from backend errors", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        error: {
          code: "internal_error",
          message: "Layanan backend sedang mengalami kendala. Silakan coba beberapa saat lagi.",
          requestId: "req-opsdesk-123",
        },
      }),
    });

    await expect(apiRequest("/tickets")).rejects.toMatchObject({
      code: "internal_error",
      requestId: "req-opsdesk-123",
    });
  });

  it("clears stored session on 401 responses", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          code: "invalid_token",
          message: "authentication token is invalid or expired",
          requestId: "req-auth-401",
        },
      }),
    });

    await expect(apiRequest("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(clearStoredSessionMock).toHaveBeenCalledTimes(1);
  });
});
