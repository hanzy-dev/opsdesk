import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { startSession } = useAuth();
  const [displayName, setDisplayName] = useState("Operator OpsDesk");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSession(displayName.trim() || "Operator OpsDesk");
    navigate("/dashboard");
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-card__intro">
          <p className="section-eyebrow">OpsDesk</p>
          <h1>Masuk ke panel operasional</h1>
          <p>
            Akses masuk saat ini masih menggunakan placeholder sesi internal. Integrasi otentikasi nyata belum
            diimplementasikan pada batch ini.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Nama tampilan</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>

          <button className="button button--primary button--wide" type="submit">
            Masuk ke Aplikasi
          </button>
        </form>
      </section>
    </main>
  );
}
