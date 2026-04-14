import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { loginDemo } = useAuth();
  const [displayName, setDisplayName] = useState("Operator Demo");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginDemo(displayName.trim() || "Operator Demo");
    navigate("/dashboard");
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-card__intro">
          <p className="section-eyebrow">OpsDesk</p>
          <h1>Masuk ke panel operasional</h1>
          <p>
            Halaman ini adalah simulasi login untuk kebutuhan demo frontend. Otentikasi asli akan ditambahkan pada batch
            berikutnya.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Nama tampilan</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>

          <button className="button button--primary button--wide" type="submit">
            Masuk sebagai Demo
          </button>
        </form>
      </section>
    </main>
  );
}
