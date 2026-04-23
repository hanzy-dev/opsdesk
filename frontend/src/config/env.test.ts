import { describe, expect, it, vi } from "vitest";

describe("env config", () => {
  it("resolves non-empty values and normalizes api base url", async () => {
    vi.resetModules();

    const { env } = await import("./env");

    expect(env.apiBaseUrl).toBeTruthy();
    expect(env.apiBaseUrl.endsWith("/")).toBe(false);
    expect(env.cognitoRegion).toBeTruthy();
    expect(env.cognitoUserPoolId).toBeTruthy();
    expect(env.cognitoClientId).toBeTruthy();
  });
});
