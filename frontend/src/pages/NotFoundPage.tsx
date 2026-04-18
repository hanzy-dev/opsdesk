import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="login-page">
      <section className="login-card">
        <p className="section-eyebrow">404</p>
        <h1>Halaman tidak ditemukan</h1>
        <p>Alamat yang Anda buka tidak tersedia atau sudah tidak berlaku pada aplikasi OpsDesk.</p>
        <Link className="button button--primary" to="/dashboard">
          Kembali ke dashboard
        </Link>
      </section>
    </main>
  );
}
