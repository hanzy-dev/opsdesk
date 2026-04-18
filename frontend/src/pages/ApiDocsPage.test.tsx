import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ApiDocsPage } from "./ApiDocsPage";

vi.mock("swagger-ui-react", () => ({
  default: ({ url }: { url: string }) => <div data-testid="swagger-ui-mock" data-url={url} />,
}));

describe("ApiDocsPage", () => {
  it("renders API documentation summary and Swagger viewer", () => {
    render(
      <MemoryRouter>
        <ApiDocsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /Referensi API OpsDesk/i })).toBeInTheDocument();
    expect(screen.getByText(/AWS API Gateway HTTP API/i)).toBeInTheDocument();
    expect(screen.getByText(/Bearer JWT Cognito/i)).toBeInTheDocument();
    expect(screen.getByTestId("swagger-ui-mock")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Buka YAML OpenAPI/i })).toHaveAttribute("href");
  });
});
