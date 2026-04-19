import { useEffect, useMemo, useState } from "react";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { useToast } from "../components/common/ToastProvider";
import { UserAvatar } from "../components/common/UserAvatar";
import { useAuth } from "../modules/auth/AuthContext";
import { getRoleLabel } from "../modules/auth/roles";
import { getPreferredDisplayName } from "../utils/identity";

export function ProfilePage() {
  const { profile, session, isProfileLoading, profileError, refreshProfile, saveProfile } = useAuth();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const effectiveProfile = profile
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

  useEffect(() => {
    if (!effectiveProfile) {
      return;
    }

    setDisplayName(effectiveProfile.displayName);
    setAvatarUrl(effectiveProfile.avatarUrl ?? "");
  }, [effectiveProfile?.avatarUrl, effectiveProfile?.displayName, effectiveProfile?.subject]);

  const preview = useMemo(
    () => ({
      displayName: displayName.trim() || getPreferredDisplayName(effectiveProfile),
      avatarUrl: avatarUrl.trim(),
    }),
    [avatarUrl, displayName, effectiveProfile],
  );

  if (isProfileLoading && !effectiveProfile) {
    return <LoadingState label="Memuat informasi akun Anda..." lines={4} />;
  }

  if (!effectiveProfile) {
    return (
      <ErrorState
        title="Profil belum tersedia"
        message={profileError ?? "Informasi akun belum dapat dimuat saat ini."}
        onRetry={() => void refreshProfile()}
      />
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    setSubmitError(null);

    try {
      await saveProfile({
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      setFeedback("Profil berhasil diperbarui.");
      showToast({
        title: "Profil berhasil diperbarui",
        description: "Perubahan identitas akun sudah diterapkan di aplikasi.",
        tone: "success",
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Profil belum dapat diperbarui.");
      showToast({
        title: "Profil belum dapat diperbarui",
        description: error instanceof Error ? error.message : "Silakan coba kembali beberapa saat lagi.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="stack-lg page-shell page-shell--narrow">
      <div className="hero-card hero-card--compact hero-card--spotlight">
        <div>
          <p className="section-eyebrow">Akun</p>
          <h2>Kelola identitas akun</h2>
          <p>Perbarui nama tampilan dan avatar agar identitas akun tampil konsisten di seluruh aplikasi.</p>
        </div>
      </div>

      <div className="detail-grid">
        <article className="panel panel--section profile-summary profile-summary--dense">
          <div className="profile-summary__header">
            <UserAvatar avatarUrl={preview.avatarUrl} name={preview.displayName} size="lg" />
            <div className="stack-md">
              <div>
                <span className="role-pill">{getRoleLabel(effectiveProfile.role)}</span>
                <h3>{preview.displayName}</h3>
                <p>{effectiveProfile.email}</p>
                <small className="profile-summary__subtle">{effectiveProfile.subject}</small>
              </div>
              <div className="profile-summary__meta">
                <div>
                  <span>Sumber avatar</span>
                  <strong>{preview.avatarUrl || "Fallback inisial"}</strong>
                </div>
              </div>
            </div>
          </div>
        </article>

        <form className="panel panel--section stack-md form-panel form-panel--compact" onSubmit={handleSubmit}>
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Profil</p>
              <h3>Informasi akun</h3>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Nama tampilan</span>
              <input
                maxLength={80}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Masukkan nama profesional Anda"
                value={displayName}
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input readOnly type="email" value={effectiveProfile.email} />
            </label>

            <label className="field field--full">
              <span>URL avatar</span>
              <input
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://contoh.com/avatar.jpg"
                value={avatarUrl}
              />
              <small>Kosongkan jika ingin menggunakan fallback inisial secara otomatis.</small>
            </label>

            <label className="field">
              <span>Peran</span>
              <input readOnly value={getRoleLabel(effectiveProfile.role)} />
            </label>

            <label className="field">
              <span>ID Cognito</span>
              <input readOnly value={effectiveProfile.subject} />
            </label>
          </div>

          {profileError ? <p className="form-hint">Sinkronisasi profil terakhir: {profileError}</p> : null}
          {feedback ? <p className="form-success">{feedback}</p> : null}
          {submitError ? <p className="form-error">{submitError}</p> : null}

          <div className="form-actions">
            <button className="button button--primary" disabled={isSaving} type="submit">
              {isSaving ? "Menyimpan..." : "Simpan Profil"}
            </button>
            <button
              className="button button--secondary"
              onClick={() => {
                setDisplayName(effectiveProfile.displayName);
                setAvatarUrl(effectiveProfile.avatarUrl ?? "");
                setFeedback(null);
                setSubmitError(null);
              }}
              type="button"
            >
              Kembalikan Perubahan
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
