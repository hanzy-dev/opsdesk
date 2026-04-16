import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuth();
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
      <section className="login-card">
        <div className="login-card__intro">
          <p className="section-eyebrow">OpsDesk</p>
          <h1>Masuk ke panel operasional</h1>
          <p>Masukkan email dan kata sandi akun internal Anda untuk mengakses aplikasi.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
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
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Masukkan kata sandi"
            />
          </label>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <button className="button button--primary button--wide" disabled={isLoading} type="submit">
            {isLoading ? "Memproses Masuk..." : "Masuk"}
          </button>
        </form>
      </section>
    </main>
  );
}
