import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AppIcon } from "../components/common/AppIcon";
import { completeForgotPassword } from "../modules/auth/authService";

const resetGuidance = [
  "Gunakan kode verifikasi terbaru yang dikirim ke email akun.",
  "Setelah berhasil, masuk kembali dari halaman portal utama.",
  "Jika masih gagal, lanjutkan ke tim operasional agar akses diperiksa lebih lanjut.",
];

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
    () => "Gunakan kode verifikasi dari email, lalu masukkan kata sandi baru yang memenuhi kebijakan Cognito.",
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
      <section className="auth-shell">
        <section className="auth-layout">
          <section className="auth-form-surface surface surface--primary">
            <div className="login-card__intro auth-form-surface__intro">
              <p className="section-eyebrow">Verifikasi akses</p>
              <h1>Masukkan kode dan kata sandi baru</h1>
              <p>Selesaikan pemulihan akses dengan kode verifikasi dari email akun internal Anda.</p>
            </div>

            <div className="inline-callout auth-callout">
              <div className="inline-callout__header">
                <span className="auth-callout__icon" aria-hidden="true">
                  <AppIcon name="reset" size="sm" />
                </span>
                <div className="inline-callout__header-copy">
                  <p className="inline-callout__eyebrow">Panduan verifikasi</p>
                  <strong>Gunakan kode terbaru dari email akun</strong>
                </div>
              </div>
              <p>{helperMessage}</p>
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

              <label className="field">
                <span>Kode verifikasi</span>
                <input
                  autoComplete="one-time-code"
                  disabled={isSubmitting}
                  onChange={(event) => setConfirmationCode(event.target.value)}
                  placeholder="Masukkan kode dari email"
                  value={confirmationCode}
                />
              </label>

              <label className="field">
                <span>Kata sandi baru</span>
                <input
                  autoComplete="new-password"
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  type="password"
                  value={confirmPassword}
                />
              </label>

              {successMessage ? <p className="form-success">{successMessage}</p> : null}
              {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

              <p className="form-hint">Simpan detail error atau pesan verifikasi jika Anda masih perlu bantuan dari tim operasional.</p>

              <button aria-busy={isSubmitting} className="button button--primary button--wide" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Memperbarui..." : "Perbarui kata sandi"}
              </button>
            </form>

            <div className="auth-links-row">
              <Link className="text-link" to="/forgot-password">
                Kirim ulang permintaan pengaturan ulang
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
                <h2>Selesaikan pemulihan lalu kembali ke workspace tanpa rasa terputus dari alur portal.</h2>
                <p>OpsDesk tetap memusatkan tiket, panduan, dan tindak lanjut operasional setelah Anda berhasil masuk kembali.</p>
              </div>

              <div className="settings-row-panel surface surface--ghost auth-story__list">
                {resetGuidance.map((item) => (
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
                  <p className="inline-callout__eyebrow">Masih terkendala?</p>
                  <strong>Lanjutkan ke tim operasional bila perlu</strong>
                </div>
              </div>
              <p>Jika kode belum cocok atau email sebelumnya sudah kedaluwarsa, kirim ulang permintaan reset lalu teruskan ke tim operasional bila masalah berlanjut.</p>
            </article>
          </aside>
        </section>
      </section>
    </main>
  );
}
