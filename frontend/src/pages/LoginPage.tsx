import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AppIcon } from "../components/common/AppIcon";
import { useAuth } from "../modules/auth/AuthContext";

const loginHighlights = [
  "Pelaporan gangguan dan tindak lanjut tetap tercatat rapi.",
  "Status, lampiran, dan riwayat tiket tidak tercecer di chat ad-hoc.",
  "Panduan awal tetap bisa diakses dari pusat bantuan internal.",
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticating } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await login(email, password);
      const redirectTo = typeof location.state === "object" && location.state && "from" in location.state ? location.state.from : "/dashboard";
      navigate(typeof redirectTo === "string" ? redirectTo : "/dashboard", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Masuk ke aplikasi belum berhasil. Silakan coba lagi.");
    }
  }

  return (
    <main className="login-page">
      <section className="auth-shell auth-shell--login">
        <section className="auth-layout">
          <section className="auth-form-surface surface surface--primary">
            <div className="login-card__intro auth-form-surface__intro">
              <p className="section-eyebrow">Portal internal OpsDesk</p>
              <h1>Masuk ke workspace operasional Anda</h1>
              <p>Gunakan email dan kata sandi akun internal untuk membuka tiket, status tindak lanjut, dan pusat bantuan OpsDesk.</p>
            </div>

            <div className="inline-callout auth-callout">
              <div className="inline-callout__header">
                <span className="auth-callout__icon" aria-hidden="true">
                  <AppIcon name="open" size="sm" />
                </span>
                <div className="inline-callout__header-copy">
                  <p className="inline-callout__eyebrow">Akses akun</p>
                  <strong>Akun dibuat oleh admin internal</strong>
                </div>
              </div>
              <p>Belum punya akun? Hubungi admin internal agar akses dibuat sesuai peran kerja Anda.</p>
            </div>

            <form className="login-form auth-form-surface__form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Email</span>
                <input
                  autoComplete="email"
                  disabled={isAuthenticating}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nama@perusahaan.com"
                />
              </label>
              <label className="field">
                <span>Kata sandi</span>
                <input
                  autoComplete="current-password"
                  disabled={isAuthenticating}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Masukkan kata sandi"
                />
              </label>

              {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

              {isAuthenticating ? <p className="form-hint">Memverifikasi kredensial dan menyiapkan sesi aman...</p> : null}

              <button aria-busy={isAuthenticating} className="button button--primary button--wide" disabled={isAuthenticating} type="submit">
                {isAuthenticating ? "Masuk ke OpsDesk..." : "Masuk"}
              </button>
            </form>

            <div className="auth-links-row">
              <Link className="text-link" to="/forgot-password">
                Lupa kata sandi?
              </Link>
              <Link className="text-link" to="/help">
                Buka Pusat Bantuan
              </Link>
            </div>
          </section>

          <aside className="auth-rail">
            <section className="auth-story">
              <div className="auth-story__intro">
                <p className="section-eyebrow">Portal internal</p>
                <h2>Masuk dengan fokus yang jelas, tanpa layout yang terasa seperti mini dashboard.</h2>
                <p>
                  OpsDesk dipakai untuk pelaporan gangguan, pelacakan status, dan koordinasi operasional dengan jejak kerja yang tetap mudah dibaca ulang.
                </p>
              </div>

              <div className="settings-row-panel surface surface--ghost auth-story__list">
                {loginHighlights.map((item) => (
                  <article className="settings-row-panel__row" key={item}>
                    <div className="settings-row-panel__copy">
                      <strong>{item}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <div className="auth-support-cluster">
              <article className="inline-callout surface surface--subtle auth-support-note">
                <div className="inline-callout__header">
                  <span className="auth-callout__icon" aria-hidden="true">
                    <AppIcon name="profile" size="sm" />
                  </span>
                  <div className="inline-callout__header-copy">
                    <p className="inline-callout__eyebrow">Belum punya akun?</p>
                    <strong>Hubungi admin internal</strong>
                  </div>
                </div>
                <p>Pembuatan akun dan pengaturan peran tetap ditangani oleh admin internal.</p>
              </article>

              <article className="inline-callout surface surface--subtle auth-support-note">
                <div className="inline-callout__header">
                  <span className="auth-callout__icon" aria-hidden="true">
                    <AppIcon name="help" size="sm" />
                  </span>
                  <div className="inline-callout__header-copy">
                    <p className="inline-callout__eyebrow">Masalah akses?</p>
                    <strong>Hubungi tim operasional</strong>
                  </div>
                </div>
                <p>Jika email sudah benar tetapi tetap gagal masuk, lanjutkan ke tim operasional atau buka pusat bantuan untuk panduan awal.</p>
              </article>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
