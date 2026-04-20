import { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ApiDocsPage } from "./ApiDocsPage";

const swaggerUIMock = vi.fn((props: { url?: string; onFailure?: (error: unknown) => void }) => (
  <div data-testid="swagger-ui-mock" data-url={props.url} />
));

vi.mock("swagger-ui-react", () => ({
  default: (props: { url?: string; onFailure?: (error: unknown) => void }) => swaggerUIMock(props),
}));

describe("ApiDocsPage", () => {
  it("renders API documentation summary and Swagger viewer", () => {
    swaggerUIMock.mockImplementation(({ url }: { url?: string }) => <div data-testid="swagger-ui-mock" data-url={url} />);

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

  it("shows a controlled fallback when Swagger UI reports a parse failure", () => {
    swaggerUIMock.mockImplementation(({ onFailure }: { url?: string; onFailure?: (error: unknown) => void }) => {
      useEffect(() => {
        onFailure?.(new Error("parser error"));
      }, [onFailure]);
      return <div data-testid="swagger-ui-mock" />;
    });

    render(
      <MemoryRouter>
        <ApiDocsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Dokumentasi API belum dapat ditampilkan/i)).toBeInTheDocument();
    expect(screen.getByText(/Spesifikasi OpenAPI belum valid untuk dirender oleh Swagger UI/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Muat Ulang Viewer/i })).toBeInTheDocument();
  });
});
