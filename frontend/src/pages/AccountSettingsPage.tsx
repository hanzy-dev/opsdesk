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
      <div className="compact-toolbar surface surface--ghost settings-page__heading">
        <div className="compact-toolbar__copy">
          <p className="section-eyebrow">Pengaturan</p>
          <h2>Panel kontrol akun</h2>
          <p>Kelola keamanan masuk, cek ringkasan akun, dan buka akses cepat tanpa mengulang penjelasan profil pribadi.</p>
        </div>
      </div>

      <div className="settings-control-layout">
        <article className="panel panel--section settings-security-panel surface surface--primary">
          <div className="section-heading settings-security-panel__heading">
            <div className="settings-section__heading">
              <AppIconBadge name="settings" size="sm" tone="cool" />
              <div>
                <p className="section-eyebrow">Keamanan akun</p>
                <h3>Akses masuk dan proteksi akun</h3>
              </div>
            </div>
          </div>

          <div className="inline-callout surface surface--subtle settings-security-panel__callout">
            <div className="inline-callout__header">
              <span className="settings-inline-icon" aria-hidden="true">
                <AppIcon name="settings" size="sm" />
              </span>
              <div className="inline-callout__header-copy">
                <p className="inline-callout__eyebrow">Fokus utama</p>
                <strong>Gunakan panel ini untuk menjaga keamanan akses akun Anda.</strong>
              </div>
            </div>
            <p>{policyHint}</p>
          </div>

          <form className="form-panel form-panel--compact stack-md settings-security-form" onSubmit={handleSubmit}>
            <div className="compact-toolbar surface surface--ghost settings-security-form__header">
              <div className="compact-toolbar__copy">
                <p className="compact-toolbar__eyebrow">Kata sandi</p>
                <strong>Ubah kata sandi</strong>
                <p>Perubahan di sini hanya memengaruhi akses masuk akun, bukan identitas profil.</p>
              </div>
            </div>

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

        <aside className="settings-control-rail stack-md">
          <section className="rail-section surface surface--subtle settings-control-rail__section">
            <div className="compact-toolbar settings-control-rail__header">
              <div className="compact-toolbar__copy">
                <p className="compact-toolbar__eyebrow">Informasi akun ringkas</p>
                <strong>Ringkasan akun aktif</strong>
              </div>
            </div>

            <div className="settings-account-identity">
              <UserAvatar avatarUrl={identity?.avatarUrl} name={preferredDisplayName} size="lg" />
              <div className="settings-account-identity__copy">
                <strong>{preferredDisplayName}</strong>
                <p>{identity?.email ?? "Email tidak tersedia"}</p>
                <span className="role-pill">{identity ? getRoleLabel(identity.role) : "Akun"}</span>
              </div>
            </div>

            <div className="settings-row-panel">
              <div className="settings-row-panel__row">
                <div className="settings-row-panel__copy">
                  <p className="settings-row-panel__eyebrow">Email akun</p>
                  <strong>{identity?.email ?? "Email tidak tersedia"}</strong>
                </div>
              </div>
              <div className="settings-row-panel__row">
                <div className="settings-row-panel__copy">
                  <p className="settings-row-panel__eyebrow">Peran akses</p>
                  <strong>{identity ? getRoleLabel(identity.role) : "Akun"}</strong>
                </div>
              </div>
              <div className="settings-row-panel__row">
                <div className="settings-row-panel__copy">
                  <p className="settings-row-panel__eyebrow">ID sistem</p>
                  <strong>{identity?.subject ?? "ID belum tersedia"}</strong>
                </div>
              </div>
            </div>

            <p className="settings-control-rail__helper">Nama tampilan dan avatar dikelola dari halaman Profil agar pusat identitas tetap terpisah dari pengaturan keamanan.</p>
          </section>

          <section className="rail-section surface surface--ghost settings-control-rail__section">
            <div className="compact-toolbar settings-control-rail__header">
              <div className="compact-toolbar__copy">
                <p className="compact-toolbar__eyebrow">Akses cepat</p>
                <strong>Buka area yang sering dipakai</strong>
              </div>
            </div>

            <div className="preset-group settings-quick-links">
              <Link className="preset-chip preset-chip--active" to="/profile">
                <AppIcon name="profile" size="sm" />
                Profil
              </Link>
              <Link className="preset-chip" to="/help">
                <AppIcon name="help" size="sm" />
                Pusat Bantuan
              </Link>
              <Link className="preset-chip" to="/api-docs">
                <AppIcon name="api" size="sm" />
                Dokumentasi API
              </Link>
            </div>

            <div className="settings-row-panel">
              <div className="settings-row-panel__row">
                <div className="settings-row-panel__copy">
                  <p className="settings-row-panel__eyebrow">Profil</p>
                  <strong>Edit nama tampilan dan avatar</strong>
                  <p>Gunakan Profil untuk perubahan identitas yang terlihat oleh tim.</p>
                </div>
                <Link className="button button--secondary settings-row-panel__action" to="/profile">
                  <AppIcon name="profile" size="sm" />
                  Buka Profil
                </Link>
              </div>
              <div className="settings-row-panel__row">
                <div className="settings-row-panel__copy">
                  <p className="settings-row-panel__eyebrow">Bantuan</p>
                  <strong>Panduan penggunaan dan referensi teknis</strong>
                  <p>Buka pusat bantuan atau dokumentasi API dari panel yang sama.</p>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
