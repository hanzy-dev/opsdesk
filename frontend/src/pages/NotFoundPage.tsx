import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="login-page">
      <section className="login-card">
        <p className="section-eyebrow">404</p>
        <h1>Halaman tidak ditemukan</h1>
        <p>Alamat yang Anda buka belum tersedia di frontend OpsDesk saat ini.</p>
        <Link className="button button--primary" to="/dashboard">
          Kembali ke Dashboard
        </Link>
      </section>
    </main>
  );
}
