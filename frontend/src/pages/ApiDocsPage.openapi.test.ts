import { describe, expect, it } from "vitest";
import { load } from "js-yaml";
import openApiSpecSource from "../../../docs/openapi.yaml?raw";

describe("OpenAPI spec", () => {
  it("parses docs/openapi.yaml and exposes the API docs routes used by the app", () => {
    const parsed = load(openApiSpecSource) as {
      openapi: string;
      paths: Record<string, unknown>;
    };

    expect(parsed.openapi).toBe("3.0.3");
    expect(parsed.paths).toHaveProperty("/profile/me");
    expect(parsed.paths).toHaveProperty("/tickets");
    expect(parsed.paths).toHaveProperty("/tickets/{id}/assignment");
  });
});
