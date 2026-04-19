import { useEffect, useMemo, useRef, useState } from "react";
import { requestProfileAvatarUploadUrl } from "../api/profile";
import { uploadAttachmentFile } from "../api/tickets";
import { ConfirmationDialog } from "../components/common/ConfirmationDialog";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { useToast } from "../components/common/ToastProvider";
import { UserAvatar } from "../components/common/UserAvatar";
import { useAuth } from "../modules/auth/AuthContext";
import { getRoleLabel } from "../modules/auth/roles";
import { getPreferredDisplayName } from "../utils/identity";

const allowedAvatarTypes = ["image/jpeg", "image/png", "image/webp"];
const maxAvatarSizeBytes = 5 * 1024 * 1024;

export function ProfilePage() {
  const { profile, session, isProfileLoading, profileError, refreshProfile, saveProfile } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

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
    setAvatarPreviewUrl(effectiveProfile.avatarUrl ?? "");
    setSelectedAvatarFile(null);
    setUploadStatus(null);
    setUploadProgress(0);
  }, [effectiveProfile?.avatarUrl, effectiveProfile?.displayName, effectiveProfile?.subject]);

  useEffect(() => {
    if (!selectedAvatarFile || !avatarPreviewUrl.startsWith("blob:")) {
      return;
    }

    return () => {
      URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl, selectedAvatarFile]);

  const preferredDisplayName = useMemo(
    () =>
      displayName.trim() || getPreferredDisplayName({
        displayName: effectiveProfile?.displayName,
        email: effectiveProfile?.email,
        subject: effectiveProfile?.subject,
      }),
    [displayName, effectiveProfile?.displayName, effectiveProfile?.email, effectiveProfile?.subject],
  );
  const hasAvatar = Boolean(avatarPreviewUrl);
  const isUploadingAvatar = selectedAvatarFile !== null;

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

  const currentProfile = effectiveProfile;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    setSubmitError(null);

    try {
      let nextAvatarValue = avatarUrl;

      if (selectedAvatarFile) {
        setUploadStatus("Menyiapkan upload avatar...");
        setUploadProgress(0);

        const uploadTarget = await requestProfileAvatarUploadUrl({
          fileName: selectedAvatarFile.name,
          contentType: selectedAvatarFile.type,
          sizeBytes: selectedAvatarFile.size,
        });

        setUploadStatus("Mengunggah avatar ke penyimpanan aman...");
        await uploadAttachmentFile(uploadTarget, selectedAvatarFile, setUploadProgress, "Upload avatar ke penyimpanan belum berhasil.");
        nextAvatarValue = uploadTarget.objectKey;
      }

      const nextProfile = await saveProfile({
        displayName: displayName.trim(),
        avatarUrl: nextAvatarValue,
      });

      setAvatarUrl(nextProfile.avatarUrl ?? "");
      setAvatarPreviewUrl(nextProfile.avatarUrl ?? "");
      setSelectedAvatarFile(null);
      setUploadStatus(null);
      setUploadProgress(0);
      setFeedback("Profil berhasil diperbarui.");
      showToast({
        title: "Profil berhasil diperbarui",
        description: "Perubahan identitas akun sudah diterapkan di aplikasi.",
        tone: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Profil belum dapat diperbarui.";
      setSubmitError(message);
      setUploadStatus(null);
      showToast({
        title: "Profil belum dapat diperbarui",
        description: message,
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleAvatarSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (!allowedAvatarTypes.includes(selectedFile.type)) {
      setSubmitError("Format avatar belum didukung. Gunakan JPG, PNG, atau WEBP.");
      showToast({
        title: "Format avatar belum didukung",
        description: "Gunakan file JPG, PNG, atau WEBP agar avatar bisa dipakai.",
        tone: "error",
      });
      event.target.value = "";
      return;
    }

    if (selectedFile.size > maxAvatarSizeBytes) {
      setSubmitError("Ukuran avatar terlalu besar. Maksimal 5 MB.");
      showToast({
        title: "Ukuran avatar terlalu besar",
        description: "Gunakan file avatar dengan ukuran maksimal 5 MB.",
        tone: "error",
      });
      event.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(selectedFile);
    setSelectedAvatarFile(selectedFile);
    setAvatarPreviewUrl(previewUrl);
    setSubmitError(null);
    setFeedback(null);
    setUploadStatus("Avatar baru siap disimpan.");
    setUploadProgress(0);
  }

  function resetDraftChanges() {
    setDisplayName(currentProfile.displayName);
    setAvatarUrl(currentProfile.avatarUrl ?? "");
    setAvatarPreviewUrl(currentProfile.avatarUrl ?? "");
    setSelectedAvatarFile(null);
    setFeedback(null);
    setSubmitError(null);
    setUploadStatus(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleConfirmAvatarRemoval() {
    setIsRemoveDialogOpen(false);
    setAvatarUrl("");
    setAvatarPreviewUrl("");
    setSelectedAvatarFile(null);
    setFeedback(null);
    setSubmitError(null);
    setUploadStatus("Avatar akan dikembalikan ke inisial setelah profil disimpan.");
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <>
      <section className="stack-lg page-shell page-shell--narrow">
        <div className="hero-card hero-card--compact hero-card--spotlight">
          <div>
            <p className="section-eyebrow">Akun</p>
            <h2>Kelola identitas akun</h2>
            <p>Perbarui nama tampilan dan avatar agar akun Anda terasa lebih personal, rapi, dan konsisten di seluruh aplikasi.</p>
          </div>
        </div>

        <div className="detail-grid">
          <article className="panel panel--section profile-summary profile-summary--dense">
            <div className="profile-summary__header">
              <div className="profile-summary__identity">
                <UserAvatar avatarUrl={avatarPreviewUrl} name={preferredDisplayName} size="lg" />
                <div className="stack-md">
                  <div>
                    <span className="role-pill">{getRoleLabel(currentProfile.role)}</span>
                    <h3>{preferredDisplayName}</h3>
                    <p>{currentProfile.email}</p>
                    <small className="profile-summary__subtle">{currentProfile.subject}</small>
                  </div>
                  <p className="profile-summary__helper">
                    Foto profil akan tampil di area akun dan ringkasan identitas agar akun terasa lebih personal dan mudah dikenali.
                  </p>
                </div>
              </div>
            </div>

            <div className="profile-summary__actions">
              <input
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="avatar-upload__input"
                onChange={handleAvatarSelection}
                ref={fileInputRef}
                type="file"
              />
              <button
                className="button button--secondary"
                disabled={isSaving}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                {hasAvatar ? "Ganti Avatar" : "Unggah Avatar"}
              </button>
              {hasAvatar ? (
                <button
                  className="button button--ghost"
                  disabled={isSaving}
                  onClick={() => setIsRemoveDialogOpen(true)}
                  type="button"
                >
                  Hapus Avatar
                </button>
              ) : null}
            </div>

            <p className="profile-summary__note">
              Format yang didukung: JPG, PNG, WEBP. Ukuran maksimum 5 MB.
            </p>
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
                <input readOnly type="email" value={currentProfile.email} />
              </label>

              <label className="field">
                <span>Peran</span>
                <input readOnly value={getRoleLabel(currentProfile.role)} />
              </label>

              <label className="field">
                <span>ID Cognito</span>
                <input readOnly value={currentProfile.subject} />
              </label>
            </div>

            {profileError ? <p className="form-hint">Sinkronisasi profil terakhir: {profileError}</p> : null}
            {isUploadingAvatar && uploadStatus ? <p className="form-hint">{uploadStatus}</p> : null}
            {isUploadingAvatar && uploadProgress > 0 ? <p className="form-hint">Progres upload avatar: {uploadProgress}%</p> : null}
            {!isUploadingAvatar && uploadStatus ? <p className="form-hint">{uploadStatus}</p> : null}
            {feedback ? <p className="form-success">{feedback}</p> : null}
            {submitError ? <p className="form-error">{submitError}</p> : null}

            <div className="form-actions">
              <button className="button button--primary" disabled={isSaving} type="submit">
                {isSaving ? "Menyimpan..." : "Simpan Profil"}
              </button>
              <button className="button button--secondary" onClick={resetDraftChanges} type="button">
                Kembalikan Perubahan
              </button>
            </div>
          </form>
        </div>
      </section>

      <ConfirmationDialog
        cancelLabel="Batal"
        confirmLabel="Hapus Avatar"
        isOpen={isRemoveDialogOpen}
        message="Avatar akan dikembalikan ke tampilan inisial default. Lanjutkan?"
        onCancel={() => setIsRemoveDialogOpen(false)}
        onConfirm={handleConfirmAvatarRemoval}
        title="Hapus avatar profil"
      />
    </>
  );
}
