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
      <section className="login-portal login-portal--support">
        <article className="login-portal__panel login-portal__panel--story">
          <div className="login-card__intro">
            <p className="section-eyebrow">Pemulihan akun</p>
            <h1>Pulihkan akses tanpa keluar dari alur kerja OpsDesk</h1>
            <p>
              Halaman ini tetap bagian dari portal internal yang sama, jadi panduan akses, help center, dan tindak lanjut
              operasional tetap mudah ditemukan.
            </p>
          </div>

          <div className="login-portal__support-grid">
            {recoveryChecklist.map((item) => (
              <article className="login-info-card motion-lift" key={item}>
                <AppIcon name="reset" size="sm" />
                <p>{item}</p>
              </article>
            ))}
          </div>

          <article className="login-support-card">
            <span className="section-eyebrow">Butuh bantuan tambahan</span>
            <strong>Belum punya akun atau akses sudah berubah?</strong>
            <p>
              Pembuatan akun tetap dilakukan oleh admin internal. Jika kebutuhan akses Anda berubah, hubungi admin atau
              tim operasional agar penanganannya tercatat dengan jelas.
            </p>
          </article>
        </article>

        <section className="login-card login-card--portal">
          <div className="login-card__intro">
            <p className="section-eyebrow">Reset kata sandi</p>
            <h2>Kirim kode verifikasi ke email akun</h2>
            <p>Masukkan email akun internal Anda untuk menerima kode verifikasi pengaturan ulang kata sandi melalui Cognito.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
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

          <div className="login-card__context stack-md">
            <article className="login-inline-note">
              <strong>Masalah akses belum selesai?</strong>
              <p>Jika kode tidak terkirim atau akun tetap terkunci, hubungi tim operasional agar investigasi akses bisa diteruskan.</p>
            </article>
          </div>

          <div className="login-card__footer">
            <Link className="text-link" to="/login">
              Kembali ke halaman masuk
            </Link>
            <Link className="text-link" to="/help">
              Buka Pusat Bantuan
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
