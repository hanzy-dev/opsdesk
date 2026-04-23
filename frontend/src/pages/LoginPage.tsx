import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AppIcon } from "../components/common/AppIcon";
import { useAuth } from "../modules/auth/AuthContext";

const opsDeskCapabilities = [
  "Pelaporan gangguan dengan konteks yang rapi",
  "Pelacakan status dan progres tindak lanjut",
  "Bantuan mandiri dari pusat bantuan internal",
  "Koordinasi operasional dengan riwayat yang tercatat",
];

const opsDeskAdvantages = [
  "Audit trail untuk setiap pembaruan dan komentar",
  "Kepemilikan tiket yang jelas antar tim",
  "Target SLA, lampiran, dan status dalam satu alur",
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
      <section className="login-portal">
        <article className="login-portal__panel login-portal__panel--story">
          <div className="login-card__intro">
            <p className="section-eyebrow">Portal internal OpsDesk</p>
            <h1>Masuk ke pusat koordinasi operasional yang lebih rapi dari chat ad-hoc</h1>
            <p>
              OpsDesk dipakai untuk pelaporan gangguan, pelacakan status, bantuan mandiri, dan koordinasi operasional
              dengan riwayat yang tetap tercatat.
            </p>
          </div>

          <div className="login-portal__capabilities">
            {opsDeskCapabilities.map((item) => (
              <article className="login-info-card motion-lift" key={item}>
                <AppIcon name="open" size="sm" />
                <p>{item}</p>
              </article>
            ))}
          </div>

          <div className="login-portal__support-grid">
            <article className="login-support-card">
              <span className="section-eyebrow">Akses akun</span>
              <strong>Akun dibuat oleh admin internal</strong>
              <p>Belum punya akun? Hubungi admin internal agar akses Anda dibuat sesuai peran kerja.</p>
            </article>
            <article className="login-support-card">
              <span className="section-eyebrow">Bantuan akses</span>
              <strong>Masalah masuk tidak perlu dijelaskan berulang</strong>
              <p>Gunakan OpsDesk agar error, status, lampiran, dan tindak lanjut tetap ada dalam satu jejak kerja.</p>
            </article>
          </div>

          <div className="login-value-strip" aria-label="Nilai OpsDesk">
            {opsDeskAdvantages.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>

        <section className="login-card login-card--portal">
          <div className="login-card__intro">
            <p className="section-eyebrow">Masuk</p>
            <h2>Akses workspace internal Anda</h2>
            <p>Masukkan email dan kata sandi akun internal untuk membuka dashboard, tiket, dan pusat bantuan OpsDesk.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
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

          <div className="login-card__context stack-md">
            <article className="login-inline-note">
              <strong>Belum punya akun?</strong>
              <p>Hubungi admin internal untuk pembuatan akun dan penyesuaian akses sesuai kebutuhan kerja.</p>
            </article>
            <article className="login-inline-note">
              <strong>Masalah akses?</strong>
              <p>Jika email benar tetapi tetap gagal masuk, hubungi tim operasional atau gunakan pusat bantuan untuk panduan awal.</p>
            </article>
          </div>

          <div className="login-card__footer">
            <Link className="text-link" to="/forgot-password">
              Lupa kata sandi?
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
