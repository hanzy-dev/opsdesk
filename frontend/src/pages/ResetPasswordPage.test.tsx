import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordPage } from "./ResetPasswordPage";

const { completeForgotPasswordMock } = vi.hoisted(() => ({
  completeForgotPasswordMock: vi.fn(),
}));

vi.mock("../modules/auth/authService", () => ({
  completeForgotPassword: completeForgotPasswordMock,
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    completeForgotPasswordMock.mockReset();
  });

  it("uses the carried email context and returns to login after a successful reset", async () => {
    completeForgotPasswordMock.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter initialEntries={["/reset-password?email=agent%40example.com"]}>
        <Routes>
          <Route element={<ResetPasswordPage />} path="/reset-password" />
          <Route element={<div>Halaman masuk</div>} path="/login" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Email")).toHaveValue("agent@example.com");

    fireEvent.change(screen.getByLabelText("Kode verifikasi"), {
      target: { value: "123456" },
    });
    fireEvent.change(screen.getByLabelText("Kata sandi baru"), {
      target: { value: "PasswordBaru#123" },
    });
    fireEvent.change(screen.getByLabelText("Konfirmasi kata sandi baru"), {
      target: { value: "PasswordBaru#123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Perbarui kata sandi" }));

    await waitFor(() => {
      expect(completeForgotPasswordMock).toHaveBeenCalledWith(
        "agent@example.com",
        "123456",
        "PasswordBaru#123",
      );
    });

    expect(await screen.findByText("Halaman masuk")).toBeInTheDocument();
  });
});
