import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";

const loginMock = vi.fn();

vi.mock("../modules/auth/AuthContext", () => ({
  useAuth: () => ({
    login: loginMock,
    isAuthenticating: false,
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
  });

  it("submits credentials and redirects to the protected destination", async () => {
    loginMock.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter initialEntries={[{ pathname: "/login", state: { from: "/tickets" } }]}>
        <Routes>
          <Route element={<LoginPage />} path="/login" />
          <Route element={<div>Daftar tiket</div>} path="/tickets" />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "agent@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Kata sandi"), {
      target: { value: "Password#123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith("agent@example.com", "Password#123");
    });

    expect(await screen.findByText("Daftar tiket")).toBeInTheDocument();
  });
});
