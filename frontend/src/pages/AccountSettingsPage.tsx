import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { changeCurrentPassword } from "../modules/auth/authService";
import { useAuth } from "../modules/auth/AuthContext";
import { UserAvatar } from "../components/common/UserAvatar";
import { getRoleLabel } from "../modules/auth/roles";

export function AccountSettingsPage() {
  const { profile, session } = useAuth();
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentPassword || !nextPassword || !confirmPassword) {
      setErrorMessage("Semua field kata sandi wajib diisi.");
      return;
    }

    if (nextPassword !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi baru belum sama.");
      return;
    }

    if (currentPassword === nextPassword) {
      setErrorMessage("Kata sandi baru harus berbeda dari kata sandi saat ini.");
      return;
    }

    setIsSubmitting(true);

    try {
      await changeCurrentPassword(currentPassword, nextPassword);
      setSuccessMessage("Kata sandi berhasil diubah.");
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Perubahan kata sandi belum berhasil.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="stack-lg">
      <div className="hero-card hero-card--compact">
        <div>
          <p className="section-eyebrow">Akun</p>
          <h2>Pengaturan akun</h2>
          <p>Kelola pengaturan penting akun, termasuk perubahan kata sandi dan akses cepat ke profil Anda.</p>
        </div>
      </div>

      <div className="detail-grid">
        <article className="panel profile-summary">
          <div className="profile-summary__header">
            <UserAvatar avatarUrl={identity?.avatarUrl} name={identity?.displayName ?? "Pengguna OpsDesk"} size="lg" />
            <div className="stack-md">
              <div>
                <span className="role-pill">{identity ? getRoleLabel(identity.role) : "Akun"}</span>
                <h3>{identity?.displayName ?? "Pengguna OpsDesk"}</h3>
                <p>{identity?.email ?? "Email tidak tersedia"}</p>
              </div>
              <div className="profile-summary__meta">
                <div>
                  <span>UUID Cognito</span>
                  <strong>{identity?.subject ?? "Belum tersedia"}</strong>
                </div>
              </div>
              <div className="account-settings__links">
                <Link className="button button--secondary" to="/profile">
                  Buka Profil
                </Link>
              </div>
            </div>
          </div>
        </article>

        <form className="panel stack-md" onSubmit={handleSubmit}>
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
