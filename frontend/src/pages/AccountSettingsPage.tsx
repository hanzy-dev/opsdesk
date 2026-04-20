import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppIcon, AppIconBadge } from "../components/common/AppIcon";
import { UserAvatar } from "../components/common/UserAvatar";
import { useToast } from "../components/common/ToastProvider";
import { useAuth } from "../modules/auth/AuthContext";
import { changeCurrentPassword } from "../modules/auth/authService";
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
  const canSubmitPasswordChange =
    !isSubmitting && Boolean(currentPassword.trim() && nextPassword.trim() && confirmPassword.trim());

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
          <p>
            Pusat kontrol ringan untuk identitas akun, keamanan masuk, dan akses cepat ke profil maupun dokumentasi
            OpsDesk.
          </p>
        </div>
      </div>

      <div className="detail-grid">
        <article className="panel panel--section profile-summary profile-summary--dense">
          <div className="profile-summary__header">
            <div className="profile-summary__identity">
              <UserAvatar avatarUrl={identity?.avatarUrl} name={preferredDisplayName} size="lg" />
              <div className="stack-md">
                <div>
                  <p className="profile-summary__eyebrow">Identitas aktif</p>
                  <h3>{preferredDisplayName}</h3>
                  <p>{identity?.email ?? "Email tidak tersedia"}</p>
                  <span className="role-pill">{identity ? getRoleLabel(identity.role) : "Akun"}</span>
                </div>
                <p className="profile-summary__helper">
                  Ringkasan ini mengikuti profil aktif Anda. Nama tampilan dan avatar dapat diperbarui dari halaman
                  Profil.
                </p>
              </div>
            </div>
          </div>

          <div className="profile-summary__system">
            <div className="profile-summary__system-item">
              <span>ID sistem</span>
              <strong>{identity?.subject ?? "ID belum tersedia"}</strong>
            </div>
          </div>

          <div className="account-settings__links">
            <Link className="button button--secondary" to="/profile">
              <AppIcon name="profile" size="sm" />
              Buka Profil
            </Link>
            <Link className="button button--ghost" to="/api-docs">
              <AppIcon name="api" size="sm" />
              Dokumentasi API
            </Link>
          </div>
        </article>

        <div className="stack-md settings-page__sections">
          <article className="panel panel--section profile-readonly-panel settings-section">
            <div className="section-heading">
              <div className="settings-section__heading">
                <AppIconBadge name="profile" size="sm" tone="accent" />
                <div>
                  <p className="section-eyebrow">Identitas akun</p>
                  <h3>Ringkasan identitas</h3>
                </div>
              </div>
            </div>

            <p className="settings-section__intro">
              Halaman ini menampilkan identitas utama akun Anda. Ubah nama tampilan dan avatar dari Profil agar
              tampilan Anda konsisten di seluruh area kerja.
            </p>

            <div className="profile-readonly-grid">
              <div className="profile-readonly-item">
                <span>Nama tampilan aktif</span>
                <strong>{preferredDisplayName}</strong>
                <p>Nama ini diprioritaskan pada area akun, ringkasan profil, dan identitas pelapor.</p>
              </div>
              <div className="profile-readonly-item">
                <span>Email akun</span>
                <strong>{identity?.email ?? "Email tidak tersedia"}</strong>
                <p>Dikelola oleh sistem login dan tidak diubah dari halaman Pengaturan.</p>
              </div>
              <div className="profile-readonly-item">
                <span>Peran akses</span>
                <strong>{identity ? getRoleLabel(identity.role) : "Akun"}</strong>
                <p>Hak akses mengikuti peran yang diberikan admin pada akun ini.</p>
              </div>
            </div>

            <div className="settings-link-list">
              <Link className="settings-link-card" to="/profile">
                <div className="settings-link-card__content">
                  <span>Kelola profil pribadi</span>
                  <strong>Edit nama tampilan dan avatar</strong>
                  <p>Buka halaman Profil untuk memperbarui identitas yang terlihat oleh tim.</p>
                </div>
                <AppIcon name="chevronRight" size="sm" />
              </Link>
            </div>
          </article>

          <article className="panel panel--section settings-section">
            <div className="section-heading">
              <div className="settings-section__heading">
                <AppIconBadge name="settings" size="sm" tone="cool" />
                <div>
                  <p className="section-eyebrow">Keamanan akun</p>
                  <h3>Akses masuk dan proteksi akun</h3>
                </div>
              </div>
            </div>

            <div className="settings-note-list">
              <div className="settings-note">
                <span>Perubahan di sini</span>
                <strong>Kata sandi akun</strong>
                <p>Gunakan bagian ini untuk menjaga keamanan akses masuk akun Anda.</p>
              </div>
              <div className="settings-note">
                <span>Dikelola di Profil</span>
                <strong>Nama tampilan dan avatar</strong>
                <p>Pemisahan ini membantu menjaga informasi identitas dan pengaturan keamanan tetap jelas.</p>
              </div>
            </div>

            <form className="form-panel form-panel--compact stack-md" onSubmit={handleSubmit}>
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">Kata sandi</p>
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
                <button
                  aria-busy={isSubmitting}
                  className="button button--primary"
                  disabled={!canSubmitPasswordChange}
                  type="submit"
                >
                  <AppIcon name="settings" size="sm" />
                  {isSubmitting ? "Menyimpan..." : "Ubah Kata Sandi"}
                </button>
              </div>
            </form>
          </article>

          <article className="panel panel--section settings-section">
            <div className="section-heading">
              <div className="settings-section__heading">
                <AppIconBadge name="api" size="sm" tone="accent" />
                <div>
                  <p className="section-eyebrow">Bantuan dan dokumentasi</p>
                  <h3>Pusat referensi OpsDesk</h3>
                </div>
              </div>
            </div>

            <p className="settings-section__intro">
              Gunakan pintasan ini saat Anda perlu meninjau kontrak API, kembali ke profil, atau memastikan informasi
              akun tetap rapi dan terbaru.
            </p>

            <div className="settings-link-list">
              <Link className="settings-link-card" to="/api-docs">
                <div className="settings-link-card__content">
                  <span>Dokumentasi API</span>
                  <strong>Buka referensi endpoint dan payload</strong>
                  <p>Cocok untuk pengecekan request, response, dan integrasi frontend-backend yang aktif.</p>
                </div>
                <AppIcon name="open" size="sm" />
              </Link>

              <Link className="settings-link-card" to="/profile">
                <div className="settings-link-card__content">
                  <span>Profil pribadi</span>
                  <strong>Pastikan identitas akun tetap terbaru</strong>
                  <p>Perbarui nama tampilan dan avatar ketika identitas yang tampil perlu disesuaikan.</p>
                </div>
                <AppIcon name="chevronRight" size="sm" />
              </Link>
            </div>

            <div className="profile-summary__system">
              <div className="profile-summary__system-item">
                <span>ID sistem</span>
                <strong>{identity?.subject ?? "ID belum tersedia"}</strong>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
