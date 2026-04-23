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
      <section className="login-portal login-portal--support">
        <article className="login-portal__panel login-portal__panel--story">
          <div className="login-card__intro">
            <p className="section-eyebrow">Verifikasi akses</p>
            <h1>Selesaikan pemulihan lalu kembali ke portal internal yang sama</h1>
            <p>{helperMessage}</p>
          </div>

          <div className="login-portal__support-grid">
            {resetGuidance.map((item) => (
              <article className="login-info-card motion-lift" key={item}>
                <AppIcon name="help" size="sm" />
                <p>{item}</p>
              </article>
            ))}
          </div>

          <article className="login-support-card">
            <span className="section-eyebrow">Akses internal</span>
            <strong>Panduan akses, reset, dan bantuan tetap terhubung</strong>
            <p>
              OpsDesk tidak berhenti di halaman reset. Setelah masuk kembali, Anda tetap bisa melacak tiket, membaca
              panduan, dan menambahkan konteks bila ada kendala lanjutan.
            </p>
          </article>
        </article>

        <section className="login-card login-card--portal">
          <div className="login-card__intro">
            <p className="section-eyebrow">Atur ulang kata sandi</p>
            <h2>Masukkan kode dan kata sandi baru</h2>
            <p>Selesaikan pemulihan akses dengan kode verifikasi dari email akun internal Anda.</p>
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

          <div className="login-card__context stack-md">
            <article className="login-inline-note">
              <strong>Kode belum cocok?</strong>
              <p>Kirim ulang permintaan reset jika Anda menerima kode baru atau email sebelumnya sudah kedaluwarsa.</p>
            </article>
          </div>

          <div className="login-card__footer">
            <Link className="text-link" to="/forgot-password">
              Kirim ulang permintaan pengaturan ulang
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
