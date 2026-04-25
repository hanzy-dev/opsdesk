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

  it("documents auth, forbidden, and not-found errors with matching error codes", () => {
    const parsed = load(openApiSpecSource) as {
      components: { examples: Record<string, { value: { error: { code: string } } }> };
      paths: Record<string, Record<string, { responses?: Record<string, OpenApiResponse> }>>;
    };

    const expectedCodesByStatus: Record<string, string[]> = {
      "401": ["unauthorized", "invalid_token"],
      "403": ["forbidden"],
      "404": ["ticket_not_found", "attachment_not_found", "resource_not_found"],
    };

    for (const pathItem of Object.values(parsed.paths)) {
      for (const operation of Object.values(pathItem)) {
        if (!operation.responses) {
          continue;
        }

        for (const [status, response] of Object.entries(operation.responses)) {
          const expectedCodes = expectedCodesByStatus[status];
          if (!expectedCodes) {
            continue;
          }

          const examples = response.content?.["application/json"]?.examples;
          expect(examples, `Expected ${status} response examples`).toBeDefined();

          for (const example of Object.values(examples ?? {})) {
            const code = resolveExampleErrorCode(example, parsed.components.examples);
            expect(expectedCodes).toContain(code);
          }
        }
      }
    }
  });
});

type OpenApiResponse = {
  content?: {
    "application/json"?: {
      examples?: Record<string, OpenApiExampleRef | OpenApiInlineExample>;
    };
  };
};

type OpenApiExampleRef = {
  $ref: string;
};

type OpenApiInlineExample = {
  value: {
    error: {
      code: string;
    };
  };
};

function resolveExampleErrorCode(example: OpenApiExampleRef | OpenApiInlineExample, examples: Record<string, OpenApiInlineExample>) {
  if ("$ref" in example) {
    const refParts = example.$ref.split("/");
    const exampleName = refParts[refParts.length - 1];
    if (!exampleName || !examples[exampleName]) {
      throw new Error(`Unknown OpenAPI example reference: ${example.$ref}`);
    }

    return examples[exampleName].value.error.code;
  }

  return example.value.error.code;
}
