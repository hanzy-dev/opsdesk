import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { startForgotPassword } from "../modules/auth/authService";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage("Email wajib diisi.");
      return;
    }

    setIsSubmitting(true);

    try {
      await startForgotPassword(email.trim());
      setSuccessMessage("Kode verifikasi telah dikirim ke email Anda.");
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`, {
        replace: true,
        state: { email: email.trim() },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Permintaan reset kata sandi belum berhasil.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-card__intro">
          <p className="section-eyebrow">Pemulihan akun</p>
          <h1>Lupa kata sandi</h1>
          <p>Masukkan email akun Anda untuk menerima kode verifikasi reset kata sandi melalui Cognito.</p>
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

          {successMessage ? <p className="form-success">{successMessage}</p> : null}
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <button className="button button--primary button--wide" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Mengirim Kode..." : "Kirim Kode Verifikasi"}
          </button>
        </form>

        <div className="login-card__footer">
          <Link className="text-link" to="/login">
            Kembali ke halaman masuk
          </Link>
        </div>
      </section>
    </main>
  );
}
