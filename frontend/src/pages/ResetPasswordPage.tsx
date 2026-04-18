import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { completeForgotPassword } from "../modules/auth/authService";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialEmail =
    (typeof location.state === "object" && location.state && "email" in location.state
      ? String(location.state.email ?? "")
      : "") || searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const helperMessage = useMemo(
    () => "Gunakan kode verifikasi dari email dan masukkan kata sandi baru yang memenuhi kebijakan Cognito.",
    [],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !confirmationCode.trim() || !nextPassword || !confirmPassword) {
      setErrorMessage("Semua field wajib diisi.");
      return;
    }

    if (nextPassword !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi baru belum sama.");
      return;
    }

    setIsSubmitting(true);

    try {
      await completeForgotPassword(email.trim(), confirmationCode.trim(), nextPassword);
      setSuccessMessage("Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru Anda.");
      navigate("/login", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reset kata sandi belum berhasil.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-card__intro">
          <p className="section-eyebrow">Pemulihan akun</p>
          <h1>Atur ulang kata sandi</h1>
          <p>{helperMessage}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@perusahaan.com"
              type="email"
              value={email}
            />
          </label>

          <label className="field">
            <span>Kode verifikasi</span>
            <input
              autoComplete="one-time-code"
              onChange={(event) => setConfirmationCode(event.target.value)}
              placeholder="Masukkan kode dari email"
              value={confirmationCode}
            />
          </label>

          <label className="field">
            <span>Kata sandi baru</span>
            <input
              autoComplete="new-password"
              onChange={(event) => setNextPassword(event.target.value)}
              placeholder="Masukkan kata sandi baru"
              type="password"
              value={nextPassword}
            />
          </label>

          <label className="field">
            <span>Konfirmasi kata sandi baru</span>
            <input
              autoComplete="new-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Ulangi kata sandi baru"
              type="password"
              value={confirmPassword}
            />
          </label>

          {successMessage ? <p className="form-success">{successMessage}</p> : null}
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <button className="button button--primary button--wide" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Memperbarui..." : "Perbarui Kata Sandi"}
          </button>
        </form>

        <div className="login-card__footer">
          <Link className="text-link" to="/forgot-password">
            Kirim ulang permintaan reset
          </Link>
        </div>
      </section>
    </main>
  );
}
