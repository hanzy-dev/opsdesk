import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppIcon } from "../components/common/AppIcon";
import { startForgotPassword } from "../modules/auth/authService";

const recoveryChecklist = [
  "Pastikan email akun internal yang dipakai sudah benar.",
  "Kode verifikasi akan dikirim ke email yang terdaftar pada akun.",
  "Jika kode tidak masuk, cek spam lalu hubungi tim operasional bila perlu.",
];

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
      <section className="auth-shell">
        <section className="auth-layout">
          <section className="auth-form-surface surface surface--primary">
            <div className="login-card__intro auth-form-surface__intro">
              <p className="section-eyebrow">Pemulihan akun</p>
              <h1>Kirim kode verifikasi ke email akun</h1>
              <p>Masukkan email akun internal Anda untuk menerima kode verifikasi pengaturan ulang kata sandi melalui Cognito.</p>
            </div>

            <div className="inline-callout auth-callout">
              <div className="inline-callout__header">
                <span className="auth-callout__icon" aria-hidden="true">
                  <AppIcon name="reset" size="sm" />
                </span>
                <div className="inline-callout__header-copy">
                  <p className="inline-callout__eyebrow">Panduan singkat</p>
                  <strong>Gunakan email akun yang sama dengan saat masuk</strong>
                </div>
              </div>
              <p>Pulihkan akses tanpa keluar dari alur portal internal yang sama.</p>
            </div>

            <form className="login-form auth-form-surface__form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Email</span>
                <input
                  autoComplete="email"
                  disabled={isSubmitting}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nama@perusahaan.com"
                  type="email"
                  value={email}
                />
              </label>

              {successMessage ? <p className="form-success">{successMessage}</p> : null}
              {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

              <p className="form-hint">Gunakan email akun yang sama dengan yang dipakai saat masuk ke OpsDesk.</p>

              <button aria-busy={isSubmitting} className="button button--primary button--wide" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Mengirim kode..." : "Kirim Kode Verifikasi"}
              </button>
            </form>

            <div className="auth-links-row">
              <Link className="text-link" to="/login">
                Kembali ke halaman masuk
              </Link>
              <Link className="text-link" to="/help">
                Buka Pusat Bantuan
              </Link>
            </div>
          </section>

          <aside className="auth-rail">
            <section className="auth-story">
              <div className="auth-story__intro">
                <p className="section-eyebrow">Portal internal yang sama</p>
                <h2>Pulihkan akses dengan alur yang tenang dan tetap fokus pada tindakan utama.</h2>
                <p>Halaman ini tetap satu keluarga dengan portal OpsDesk, jadi panduan akses dan bantuan operasional tetap mudah ditemukan.</p>
              </div>

              <div className="settings-row-panel surface surface--ghost auth-story__list">
                {recoveryChecklist.map((item) => (
                  <article className="settings-row-panel__row" key={item}>
                    <div className="settings-row-panel__copy">
                      <strong>{item}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <article className="inline-callout surface surface--subtle auth-support-note">
              <div className="inline-callout__header">
                <span className="auth-callout__icon" aria-hidden="true">
                  <AppIcon name="help" size="sm" />
                </span>
                <div className="inline-callout__header-copy">
                  <p className="inline-callout__eyebrow">Butuh bantuan tambahan</p>
                  <strong>Belum punya akun atau akses sudah berubah?</strong>
                </div>
              </div>
              <p>Pembuatan akun tetap dilakukan oleh admin internal. Jika kebutuhan akses berubah, hubungi admin atau tim operasional.</p>
            </article>
          </aside>
        </section>
      </section>
    </main>
  );
}
