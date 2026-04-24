import { useEffect, useMemo, useRef, useState } from "react";
import { requestProfileAvatarUploadUrl } from "../api/profile";
import { uploadAttachmentFile } from "../api/tickets";
import { AppIcon } from "../components/common/AppIcon";
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
  const { profile, session, isProfileLoading, profileError, refreshProfile, saveProfile, permissions } = useAuth();
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
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
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
    setDisplayNameError(null);
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
  const normalizedDisplayName = displayName.trim();
  const previousDisplayName = effectiveProfile?.displayName?.trim() ?? "";
  const isDisplayNameChanged = normalizedDisplayName !== previousDisplayName;
  const isDirty =
    normalizedDisplayName !== previousDisplayName ||
    avatarUrl !== (effectiveProfile?.avatarUrl ?? "") ||
    avatarPreviewUrl !== (effectiveProfile?.avatarUrl ?? "") ||
    selectedAvatarFile !== null;
  const availableWorkspaces = [permissions.canCreateTickets, permissions.canViewOperationalTickets, permissions.canAssignTickets].filter(Boolean).length;
  const accessRows = useMemo(
    () =>
      [
        permissions.canCreateTickets
          ? {
              label: "Buat tiket baru",
              description: "Anda bisa membuat laporan atau permintaan baru langsung dari antrean utama.",
            }
          : null,
        permissions.canViewOperationalTickets
          ? {
              label: "Lihat antrean operasional",
              description: "Anda dapat membuka daftar tiket kerja untuk membaca status, prioritas, dan distribusi antrean.",
            }
          : null,
        permissions.canUpdateTicketStatus
          ? {
              label: "Perbarui progres tiket",
              description: "Anda dapat mengubah status kerja saat tindak lanjut berjalan atau sudah selesai.",
            }
          : null,
        permissions.canAssignTickets
          ? {
              label: "Atur penugasan",
              description: "Anda dapat membagi tiket ke petugas yang relevan saat antrean perlu ditata ulang.",
            }
          : null,
      ].filter((item): item is { label: string; description: string } => item !== null),
    [permissions.canAssignTickets, permissions.canCreateTickets, permissions.canUpdateTicketStatus, permissions.canViewOperationalTickets],
  );
  const completenessItems = useMemo(
    () => [
      {
        label: "Nama tampilan",
        value: currentProfileLabel(normalizedDisplayName || effectiveProfile?.displayName || ""),
        status: (normalizedDisplayName || effectiveProfile?.displayName || "").trim() ? "Siap dipakai" : "Masih kosong",
        ready: Boolean((normalizedDisplayName || effectiveProfile?.displayName || "").trim()),
      },
      {
        label: "Avatar",
        value: hasAvatar ? "Foto atau gambar aktif" : "Masih memakai inisial",
        status: hasAvatar ? "Siap dipakai" : "Bisa dilengkapi",
        ready: hasAvatar,
      },
      {
        label: "Email",
        value: effectiveProfile?.email || "Belum tersedia",
        status: effectiveProfile?.email ? "Tersedia" : "Belum tersedia",
        ready: Boolean(effectiveProfile?.email),
      },
      {
        label: "Peran aktif",
        value: getRoleLabel(effectiveProfile?.role ?? "reporter"),
        status: "Aktif",
        ready: true,
      },
    ],
    [effectiveProfile?.displayName, effectiveProfile?.email, effectiveProfile?.role, hasAvatar, normalizedDisplayName],
  );
  const completionReadyCount = completenessItems.filter((item) => item.ready).length;
  const accountSummaryItems = useMemo(
    () => [
      {
        label: "Sinkronisasi profil",
        value: profileError ? "Cadangan sesi aktif" : "Tersinkron",
        helper: profileError ? "Profil utama sedang fallback ke data sesi." : "Identitas memakai data profil terbaru yang tersedia.",
      },
      {
        label: "Perubahan lokal",
        value: isDirty ? "Belum disimpan" : "Tidak ada draft",
        helper: isDirty ? "Ada penyesuaian yang masih menunggu disimpan." : "Belum ada perubahan lokal pada nama atau avatar.",
      },
      {
        label: "Akses workspace",
        value: `${availableWorkspaces} area`,
        helper: "Menggambarkan area kerja yang saat ini bisa Anda buka dari navigasi utama.",
      },
    ],
    [availableWorkspaces, isDirty, profileError],
  );

  if (isProfileLoading && !effectiveProfile) {
    return (
      <LoadingState
        eyebrow="Profil"
        label="Memuat identitas akun Anda..."
        supportText="Kami sedang menyiapkan ringkasan profil, avatar, dan informasi akun terbaru."
        lines={4}
      />
    );
  }

  if (!effectiveProfile) {
    return (
      <ErrorState
        eyebrow="Profil"
        title="Profil belum siap ditampilkan"
        message="Informasi profil belum bisa ditampilkan sepenuhnya untuk saat ini."
        supportText="Coba muat ulang profil beberapa saat lagi. Setelah tersambung kembali, perubahan identitas dapat dikelola seperti biasa."
        onRetry={() => void refreshProfile()}
      />
    );
  }

  const currentProfile = effectiveProfile;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setSubmitError(null);
    setDisplayNameError(null);

    if (!normalizedDisplayName) {
      setDisplayNameError("Nama tampilan wajib diisi.");
      showToast({
        title: "Nama tampilan belum lengkap",
        description: "Isi nama tampilan yang ingin Anda gunakan di seluruh aplikasi.",
        tone: "error",
      });
      return;
    }

    setIsSaving(true);

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
        await uploadAttachmentFile(
          uploadTarget,
          selectedAvatarFile,
          setUploadProgress,
          "Upload avatar ke penyimpanan belum berhasil.",
        );
        nextAvatarValue = uploadTarget.objectKey;
      }

      const nextProfile = await saveProfile({
        displayName: normalizedDisplayName,
        avatarUrl: nextAvatarValue,
      });
      const displayNameChanged = normalizedDisplayName !== previousDisplayName;
      const avatarChanged = nextAvatarValue !== (currentProfile.avatarUrl ?? "");

      setDisplayName(nextProfile.displayName);
      setAvatarUrl(nextProfile.avatarUrl ?? "");
      setAvatarPreviewUrl(nextProfile.avatarUrl ?? "");
      setSelectedAvatarFile(null);
      setUploadStatus(null);
      setUploadProgress(0);
      const successSummary = displayNameChanged
        ? `Nama tampilan aktif sekarang: ${nextProfile.displayName}.`
        : avatarChanged
          ? "Avatar profil berhasil diperbarui."
          : "Identitas profil berhasil diperbarui.";
      setFeedback(successSummary);
      showToast({
        title: "Profil berhasil diperbarui",
        description: displayNameChanged
          ? `Nama tampilan baru ${nextProfile.displayName} sudah dipakai di aplikasi.`
          : "Perubahan identitas akun sudah diterapkan di aplikasi.",
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
    setDisplayNameError(null);
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
    setDisplayNameError(null);
    setUploadStatus("Avatar akan dikembalikan ke inisial setelah profil disimpan.");
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <>
      <section className="stack-lg page-shell page-shell--narrow page-flow profile-page">
        <div className="hero-card hero-card--compact hero-card--spotlight">
          <div>
            <p className="section-eyebrow">Profil</p>
            <h2>Pusat identitas akun Anda</h2>
            <p>Kelola nama tampilan, avatar, dan informasi akun utama agar identitas Anda terasa jelas, rapi, dan konsisten di seluruh OpsDesk.</p>
          </div>
        </div>

        <div className="profile-layout stack-md">
          <article className="panel panel--section profile-summary profile-summary--dense">
            <div className="profile-summary__header">
              <div className="profile-summary__identity">
                <UserAvatar avatarUrl={avatarPreviewUrl} name={preferredDisplayName} size="lg" />
                <div className="stack-md">
                  <div>
                    <p className="profile-summary__eyebrow">Identitas utama</p>
                    <h3>{preferredDisplayName}</h3>
                    <p>{currentProfile.email}</p>
                    <span className="role-pill">{getRoleLabel(currentProfile.role)}</span>
                  </div>
                  <p className="profile-summary__helper">
                    Nama tampilan dan avatar di kartu ini akan menjadi identitas utama Anda di area akun, profil, dan aktivitas utama aplikasi.
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
                aria-busy={isSaving}
                className="button button--secondary"
                disabled={isSaving}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <AppIcon name="plus" size="sm" />
                {isSaving ? "Menyiapkan perubahan..." : hasAvatar ? "Ganti Avatar" : "Unggah Avatar"}
              </button>
              {hasAvatar ? (
                <button
                  aria-busy={isSaving}
                  className="button button--ghost"
                  disabled={isSaving}
                  onClick={() => setIsRemoveDialogOpen(true)}
                  type="button"
                >
                  <AppIcon name="close" size="sm" />
                  Hapus Avatar
                </button>
              ) : null}
            </div>

            <p className="profile-summary__note">Format yang didukung: JPG, PNG, WEBP. Ukuran maksimum 5 MB.</p>

            <div className="profile-summary__system">
              <div className="profile-summary__system-item">
                <span>ID sistem</span>
                <strong>{currentProfile.subject}</strong>
              </div>
              <div className="profile-summary__system-item">
                <span>Status identitas</span>
                <strong>{normalizedDisplayName ? "Nama personal aktif" : "Menggunakan fallback sistem"}</strong>
              </div>
            </div>
          </article>

          <article className="panel panel--section surface surface--subtle profile-utility-panel">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Profil aktif</p>
                <h3>Peran, akses, dan kesiapan akun</h3>
              </div>
              <p className="filter-summary">Ringkasan ini membantu membaca identitas kerja Anda di OpsDesk tanpa meninggalkan halaman profil.</p>
            </div>

            <div className="profile-utility-group">
              <div className="profile-utility-group__header">
                <p className="section-eyebrow">Peran & akses saya</p>
                <h4>{getRoleLabel(currentProfile.role)} dengan akses yang sesuai untuk alur kerja saat ini</h4>
                <p>
                  {currentProfile.role === "admin"
                    ? "Akun admin dapat menjaga antrean, pembagian kerja, dan kualitas tindak lanjut dari satu workspace."
                    : currentProfile.role === "agent"
                      ? "Akun petugas difokuskan pada penanganan tiket, pembaruan status, dan pembacaan antrean operasional."
                      : "Akun pelapor difokuskan pada pelaporan kebutuhan, pemantauan progres, dan akses bantuan mandiri."}
                </p>
              </div>

              <div className="profile-role-access">
                <div className="profile-role-access__chips">
                  <span className="role-pill">{getRoleLabel(currentProfile.role)}</span>
                  <span className="status-pill">{availableWorkspaces} area kerja tersedia</span>
                </div>
                <div className="settings-row-panel">
                  {accessRows.map((item) => (
                    <div className="settings-row-panel__row" key={item.label}>
                      <div className="settings-row-panel__copy">
                        <strong>{item.label}</strong>
                        <p>{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="profile-utility-group">
              <div className="profile-utility-group__header">
                <p className="section-eyebrow">Status kelengkapan profil</p>
                <h4>{completionReadyCount} dari {completenessItems.length} elemen utama sudah siap</h4>
                <p>Pastikan identitas inti ini rapi agar profil tetap jelas di area akun, tiket, dan ringkasan aktivitas.</p>
              </div>

              <div className="stat-strip profile-completeness-strip">
                {completenessItems.map((item) => (
                  <article className="stat-strip__item surface surface--row profile-completeness-item" key={item.label}>
                    <p className="stat-strip__eyebrow">{item.label}</p>
                    <strong>{item.status}</strong>
                    <p className="stat-strip__label">{item.value}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="profile-utility-group">
              <div className="profile-utility-group__header">
                <p className="section-eyebrow">Ringkasan aktivitas akun</p>
                <h4>Keadaan akun Anda saat ini</h4>
                <p>Ringkas, personal, dan langsung menunjukkan apakah identitas profil sudah tersinkron dan siap dipakai.</p>
              </div>

              <div className="stat-strip profile-account-strip">
                {accountSummaryItems.map((item) => (
                  <article className="stat-strip__item surface surface--ghost profile-account-strip__item" key={item.label}>
                    <p className="stat-strip__eyebrow">{item.label}</p>
                    <strong>{item.value}</strong>
                    <p className="stat-strip__label">{item.helper}</p>
                  </article>
                ))}
              </div>
            </div>
          </article>

          <section className="profile-layout__body stack-md">
            <form className="panel panel--section stack-md form-panel form-panel--compact" onSubmit={handleSubmit}>
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">Edit identitas</p>
                  <h3>Ganti nama tampilan dan avatar</h3>
                </div>
                <p className="filter-summary">Perubahan di sini akan langsung dipakai sebagai identitas utama Anda.</p>
              </div>

              <div className="profile-edit-spotlight">
                <div className="profile-edit-spotlight__item">
                  <span>Nama yang tampil saat ini</span>
                  <strong>{currentProfile.displayName}</strong>
                </div>
                <div className="profile-edit-spotlight__item">
                  <span>Setelah disimpan akan tampil sebagai</span>
                  <strong>{normalizedDisplayName || "Nama tampilan wajib diisi"}</strong>
                </div>
              </div>

              <p className="settings-section__intro">
                Saat Anda mengganti nama tampilan di sini, perubahan itu akan muncul pada ringkasan akun, profil, dan
                identitas yang terlihat oleh tim di OpsDesk.
              </p>

              <label className={`field ${displayNameError ? "field--invalid" : ""}`}>
                <span>Nama tampilan baru</span>
                <input
                  aria-invalid={displayNameError ? "true" : "false"}
                  maxLength={80}
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    if (displayNameError) {
                      setDisplayNameError(null);
                    }
                  }}
                  placeholder="Masukkan nama yang ingin ditampilkan kepada tim"
                  value={displayName}
                />
                <small>
                  Nama ini akan muncul di area akun, ringkasan profil, dashboard, dan identitas utama tiket.
                </small>
                {displayNameError ? <small>{displayNameError}</small> : null}
              </label>

              {profileError ? (
                <p className="form-hint">
                  Sinkronisasi profil sementara tertunda. Data lokal akun masih digunakan sampai koneksi profil kembali normal.
                </p>
              ) : null}
              {isUploadingAvatar && uploadStatus ? <p className="form-hint">{uploadStatus}</p> : null}
              {isUploadingAvatar && uploadProgress > 0 ? (
                <div
                  aria-label={`Progres upload avatar ${uploadProgress}%`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={uploadProgress}
                  className="inline-progress"
                  role="progressbar"
                >
                  <div className="inline-progress__track">
                    <span className="inline-progress__bar" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="form-hint">Progres upload avatar: {uploadProgress}%</p>
                </div>
              ) : null}
              {!isUploadingAvatar && uploadStatus ? <p className="form-hint">{uploadStatus}</p> : null}
              {feedback ? <p className="form-success">{feedback}</p> : null}
              {submitError ? <p className="form-error">{submitError}</p> : null}

              <div className="form-actions">
                <button
                  aria-busy={isSaving}
                  className="button button--primary"
                  disabled={isSaving || !isDirty}
                  type="submit"
                >
                  <AppIcon name="profile" size="sm" />
                  {isSaving ? "Menyimpan..." : isDisplayNameChanged ? "Simpan Nama Tampilan" : "Simpan Perubahan Profil"}
                </button>
                <button
                  aria-busy={isSaving}
                  className="button button--secondary"
                  disabled={isSaving || !isDirty}
                  onClick={resetDraftChanges}
                  type="button"
                >
                  <AppIcon name="reset" size="sm" />
                  Kembalikan Perubahan
                </button>
              </div>
            </form>

            <article className="panel panel--section profile-readonly-panel profile-readonly-panel--stacked">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">Hanya baca</p>
                  <h3>Informasi sistem akun</h3>
                </div>
                <p className="filter-summary">Data ini mengikuti sistem login dan pengaturan akses.</p>
              </div>

              <div className="profile-readonly-grid">
                <div className="profile-readonly-item">
                  <span>Email akun</span>
                  <strong>{currentProfile.email}</strong>
                  <p>Dikelola oleh sistem autentikasi dan tetap tampil sebagai identitas kontak utama.</p>
                </div>
                <div className="profile-readonly-item">
                  <span>Peran akun</span>
                  <strong>{getRoleLabel(currentProfile.role)}</strong>
                  <p>Hak akses mengikuti peran yang diberikan admin dan tidak diubah dari halaman ini.</p>
                </div>
                <div className="profile-readonly-item">
                  <span>ID Cognito / sistem</span>
                  <strong>{currentProfile.subject}</strong>
                  <p>Disimpan untuk referensi audit, sinkronisasi backend, dan bantuan teknis saat diperlukan.</p>
                </div>
              </div>
            </article>
          </section>
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

function currentProfileLabel(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : "Belum diatur";
}
