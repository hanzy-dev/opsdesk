import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../components/common/ToastProvider";
import { changeCurrentPassword } from "../modules/auth/authService";
import { useAuth } from "../modules/auth/AuthContext";
import { UserAvatar } from "../components/common/UserAvatar";
import { getRoleLabel } from "../modules/auth/roles";
import { getPreferredDisplayName } from "../utils/identity";

export function AccountSettingsPage() {
  const { profile, session } = useAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const identity = profile
    ? profile
    : session
      ? {
          subject: session.subject,
          displayName: session.displayName,
          email: session.email,
          avatarUrl: session.avatarUrl,
          role: session.role,
        }
      : null;

  const policyHint = useMemo(
    () => "Gunakan kata sandi baru yang kuat dan tidak sama dengan kata sandi sebelumnya.",
    [],
  );
  const preferredDisplayName = getPreferredDisplayName(identity);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentPassword || !nextPassword || !confirmPassword) {
      setErrorMessage("Semua field kata sandi wajib diisi.");
      showToast({
        title: "Data belum lengkap",
        description: "Semua field kata sandi wajib diisi.",
        tone: "error",
      });
      return;
    }

    if (nextPassword !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi baru belum sama.");
      showToast({
        title: "Konfirmasi kata sandi belum sesuai",
        description: "Pastikan kata sandi baru dan konfirmasinya sama.",
        tone: "error",
      });
      return;
    }

    if (currentPassword === nextPassword) {
      setErrorMessage("Kata sandi baru harus berbeda dari kata sandi saat ini.");
      showToast({
        title: "Kata sandi baru belum valid",
        description: "Gunakan kata sandi baru yang berbeda dari kata sandi saat ini.",
        tone: "error",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await changeCurrentPassword(currentPassword, nextPassword);
      setSuccessMessage("Kata sandi berhasil diubah.");
      showToast({
        title: "Kata sandi berhasil diubah",
        description: "Gunakan kata sandi baru saat masuk pada sesi berikutnya.",
        tone: "success",
      });
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Perubahan kata sandi belum berhasil.");
      showToast({
        title: "Kata sandi belum berhasil diubah",
        description: error instanceof Error ? error.message : "Periksa kembali input Anda dan coba lagi.",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="stack-lg page-shell page-shell--narrow page-flow settings-page">
      <div className="hero-card hero-card--compact hero-card--spotlight">
        <div>
          <p className="section-eyebrow">Akun</p>
          <h2>Pengaturan akun</h2>
          <p>Kelola pengaturan penting akun, termasuk perubahan kata sandi, profil, dan akses ke dokumentasi API.</p>
        </div>
      </div>

      <div className="detail-grid">
        <article className="panel panel--section profile-summary profile-summary--dense">
          <div className="profile-summary__header">
            <UserAvatar avatarUrl={identity?.avatarUrl} name={preferredDisplayName} size="lg" />
            <div className="stack-md">
              <div>
                <span className="role-pill">{identity ? getRoleLabel(identity.role) : "Akun"}</span>
                <h3>{preferredDisplayName}</h3>
                <p>{identity?.email ?? "Email tidak tersedia"}</p>
                <small className="profile-summary__subtle">{identity?.subject ?? "ID belum tersedia"}</small>
              </div>
              <p className="profile-summary__helper">
                Ringkasan ini mengikuti identitas profil aktif Anda. Pengelolaan nama tampilan dan avatar tersedia di halaman Profil.
              </p>
              <div className="account-settings__links">
                <Link className="button button--secondary" to="/profile">
                  Buka Profil
                </Link>
                <Link className="button button--ghost" to="/api-docs">
                  Dokumentasi API
                </Link>
              </div>
            </div>
          </div>
        </article>

        <form className="panel panel--section stack-md form-panel form-panel--compact" onSubmit={handleSubmit}>
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Keamanan</p>
              <h3>Ubah kata sandi</h3>
            </div>
          </div>

          <p className="form-hint">{policyHint}</p>

          <div className="form-grid">
            <label className="field field--full">
              <span>Kata sandi saat ini</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Masukkan kata sandi saat ini"
                type="password"
                value={currentPassword}
              />
            </label>

            <label className="field">
              <span>Kata sandi baru</span>
              <input
                autoComplete="new-password"
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
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Ulangi kata sandi baru"
                type="password"
                value={confirmPassword}
              />
            </label>
          </div>

          {successMessage ? <p className="form-success">{successMessage}</p> : null}
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <div className="form-actions">
            <button className="button button--primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Menyimpan..." : "Ubah Kata Sandi"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
