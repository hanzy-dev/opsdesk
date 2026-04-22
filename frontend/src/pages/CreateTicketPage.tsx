import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { createTicket, requestAttachmentUploadUrl, saveAttachment, uploadAttachmentFile } from "../api/tickets";
import { AppIcon } from "../components/common/AppIcon";
import { ErrorState } from "../components/common/ErrorState";
import { SelectControl } from "../components/common/SelectControl";
import { UserAvatar } from "../components/common/UserAvatar";
import { useToast } from "../components/common/ToastProvider";
import { useAuth } from "../modules/auth/AuthContext";
import { getRoleLabel } from "../modules/auth/roles";
import type { CreateTicketInput } from "../types/ticket";
import { getErrorMessage, getErrorReferenceId } from "../utils/errors";
import { getPreferredDisplayName } from "../utils/identity";
import {
  getDefaultTeamForCategory,
  getTicketCategoryLabel,
  getTicketTeamLabel,
  ticketCategoryOptions,
  ticketTeamOptions,
} from "../utils/ticketMetadata";

const initialForm: CreateTicketInput = {
  title: "",
  description: "",
  priority: "medium",
  category: "account_access",
  team: getDefaultTeamForCategory("account_access"),
  reporterName: "",
  reporterEmail: "",
};

const priorityOptions: { value: CreateTicketInput["priority"]; label: string }[] = [
  { value: "low", label: "Rendah" },
  { value: "medium", label: "Sedang" },
  { value: "high", label: "Tinggi" },
];

const allowedAttachmentTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const maxAttachmentSizeBytes = 10 * 1024 * 1024;

type AttachmentDraft = {
  id: string;
  file: File;
  previewUrl?: string;
};

type TicketFormErrors = Partial<Record<"title" | "priority" | "category" | "team" | "description", string>>;

export function CreateTicketPage() {
  const { session, profile, permissions } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentDraftsRef = useRef<AttachmentDraft[]>([]);
  const [form, setForm] = useState(initialForm);
  const [attachmentDrafts, setAttachmentDrafts] = useState<AttachmentDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorReferenceId, setErrorReferenceId] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<TicketFormErrors>({});
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isTeamCustomized, setIsTeamCustomized] = useState(false);
  const effectiveIdentity = profile
    ? profile
    : session
      ? {
          subject: session.subject,
          displayName: session.displayName,
          email: session.email,
          role: session.role,
        }
      : null;
  const preferredDisplayName = getPreferredDisplayName(effectiveIdentity);
  const isFormValid = useMemo(() => Object.keys(validateTicketForm(form)).length === 0, [form]);
  const attachmentSummary =
    attachmentDrafts.length === 0
      ? "Belum ada lampiran dipilih."
      : `${attachmentDrafts.length} lampiran siap disertakan pada tiket ini.`;
  const isSubmitDisabled = isSubmitting || !isFormValid;

  useEffect(() => {
    attachmentDraftsRef.current = attachmentDrafts;
  }, [attachmentDrafts]);

  useEffect(() => {
    return () => {
      attachmentDraftsRef.current.forEach((draft) => {
        if (draft.previewUrl) {
          URL.revokeObjectURL(draft.previewUrl);
        }
      });
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFieldErrors = validateTicketForm(form);
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      setErrorMessage(null);
      setErrorReferenceId(null);
      setSubmitNotice(null);
      showToast({
        title: "Form tiket belum lengkap",
        description: "Lengkapi judul, kategori, tim tujuan, prioritas, dan deskripsi sebelum menyimpan tiket.",
        tone: "error",
      });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setErrorReferenceId(null);
    setAttachmentError(null);
    setUploadProgress(0);
    setSubmitNotice(
      attachmentDrafts.length > 0
        ? "Menyimpan tiket dan menyiapkan unggahan lampiran..."
        : "Menyimpan tiket dan menyiapkan halaman detail...",
    );

    try {
      const payload: CreateTicketInput = {
        ...form,
        reporterName: preferredDisplayName,
        reporterEmail: effectiveIdentity?.email ?? "",
      };

      const ticket = await createTicket(payload);
      const failedUploads =
        attachmentDrafts.length > 0
          ? await uploadAttachmentsForTicket(ticket.id, attachmentDrafts, setSubmitNotice, setUploadProgress)
          : [];

      clearAttachmentDrafts();

      if (failedUploads.length > 0) {
        showToast({
          title: "Tiket berhasil dibuat, tetapi ada lampiran yang belum tersimpan",
          description: `${failedUploads.join(", ")} belum berhasil diunggah. Anda dapat menambahkan ulang lampiran dari halaman detail tiket.`,
          tone: "error",
        });
      } else {
        showToast({
          title: "Tiket berhasil dibuat",
          description: `Tiket ${ticket.id} siap ditindaklanjuti di halaman detail.`,
          tone: "success",
        });
      }

      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        setErrorReferenceId(error.requestId ?? null);
        setFieldErrors(Object.fromEntries((error.details ?? []).map((detail) => [detail.field, detail.message])) as TicketFormErrors);
        showToast({
          title: "Tiket belum berhasil dibuat",
          description: error.message,
          tone: "error",
        });
      } else {
        const message = getErrorMessage(error, "Tiket belum berhasil dibuat. Silakan coba lagi.");
        setErrorMessage(message);
        setErrorReferenceId(getErrorReferenceId(error) ?? null);
        showToast({
          title: "Tiket belum berhasil dibuat",
          description: message,
          tone: "error",
        });
      }

      setSubmitNotice(null);
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFieldChange<Field extends keyof CreateTicketInput>(field: Field, value: CreateTicketInput[Field]) {
    if (field === "category") {
      const nextCategory = value as CreateTicketInput["category"];
      setForm((current) => ({
        ...current,
        category: nextCategory,
        team: isTeamCustomized ? current.team : getDefaultTeamForCategory(nextCategory),
      }));
      setFieldErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors.category;
        if (!isTeamCustomized) {
          delete nextErrors.team;
        }
        return nextErrors;
      });
      return;
    }

    if (field === "team") {
      setIsTeamCustomized(true);
    }

    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field as keyof TicketFormErrors]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field as keyof TicketFormErrors];
      return nextErrors;
    });
  }

  function handleAttachmentSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) {
      return;
    }

    const nextDrafts: AttachmentDraft[] = [];
    const rejectedFiles: string[] = [];

    selectedFiles.forEach((file) => {
      if (!allowedAttachmentTypes.includes(file.type)) {
        rejectedFiles.push(`${file.name} (format belum didukung)`);
        return;
      }

      if (file.size > maxAttachmentSizeBytes) {
        rejectedFiles.push(`${file.name} (melebihi 10 MB)`);
        return;
      }

      const isDuplicate = attachmentDrafts.some(
        (draft) =>
          draft.file.name === file.name &&
          draft.file.size === file.size &&
          draft.file.lastModified === file.lastModified,
      );
      if (isDuplicate) {
        rejectedFiles.push(`${file.name} (sudah dipilih)`);
        return;
      }

      nextDrafts.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        previewUrl: file.type.startsWith("image/") ? createPreviewUrl(file) : undefined,
      });
    });

    if (nextDrafts.length > 0) {
      setAttachmentDrafts((current) => [...current, ...nextDrafts]);
      setAttachmentError(null);
      setSubmitNotice(null);
    }

    if (rejectedFiles.length > 0) {
      const message = `Beberapa lampiran belum ditambahkan: ${rejectedFiles.join(", ")}.`;
      setAttachmentError(message);
      showToast({
        title: "Sebagian lampiran belum ditambahkan",
        description: message,
        tone: "error",
      });
    }

    event.target.value = "";
  }

  function removeAttachmentDraft(attachmentId: string) {
    setAttachmentDrafts((current) => {
      const draftToRemove = current.find((draft) => draft.id === attachmentId);
      if (draftToRemove?.previewUrl) {
        URL.revokeObjectURL(draftToRemove.previewUrl);
      }

      return current.filter((draft) => draft.id !== attachmentId);
    });
  }

  function clearAttachmentDrafts() {
    setAttachmentDrafts((current) => {
      current.forEach((draft) => {
        if (draft.previewUrl) {
          URL.revokeObjectURL(draft.previewUrl);
        }
      });
      return [];
    });
    setAttachmentError(null);
    setUploadProgress(0);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  }

  if (!permissions.canCreateTickets) {
    return (
      <ErrorState
        title="Aksi belum diizinkan"
        message="Akun ini belum dapat membuat tiket baru dari halaman ini."
        supportText="Gunakan akun pelapor untuk membuat tiket baru, atau lanjutkan penanganan dari tiket yang sudah ada."
      />
    );
  }

  return (
    <section className="stack-lg page-shell page-shell--narrow page-flow create-ticket-page">
      <div className="hero-card hero-card--spotlight">
        <p className="section-eyebrow">Input tiket</p>
        <h2>Buat tiket baru</h2>
        <p>Gunakan formulir ini untuk membuat tiket insiden atau permintaan bantuan baru tanpa mengisi ulang identitas akun.</p>
      </div>

      <article className="panel panel--section profile-summary profile-summary--compact">
        <div className="profile-summary__header">
          <div className="profile-summary__identity">
            <UserAvatar avatarUrl={profile?.avatarUrl ?? session?.avatarUrl} name={preferredDisplayName} size="lg" />
            <div className="profile-summary__meta">
              <div>
                <p className="profile-summary__eyebrow">Pelapor aktif</p>
                <strong>{preferredDisplayName}</strong>
                <p>{effectiveIdentity?.email ?? "Email belum tersedia"}</p>
              </div>
            </div>
          </div>
          <span className="role-pill">{effectiveIdentity ? getRoleLabel(effectiveIdentity.role) : "Akun"}</span>
        </div>
        <p className="profile-summary__note">Identitas pelapor akan terpasang otomatis pada tiket agar audit trail tetap rapi dan konsisten.</p>
        <div className="profile-summary__system">
          <div className="profile-summary__system-item">
            <span>ID sistem</span>
            <strong>{effectiveIdentity?.subject ?? "ID belum tersedia"}</strong>
          </div>
        </div>
      </article>

      <form className="panel panel--section form-panel form-panel--compact" onSubmit={handleSubmit}>
        <div className="form-intro">
          <p>
            Isi informasi inti tiket secara singkat dan jelas. Identitas pelapor diambil dari sesi masuk yang aktif agar
            pencatatan tetap konsisten.
          </p>
          <p className="form-hint">
            Tiket akan masuk ke antrean terlebih dahulu, lalu diproses oleh tim tujuan yang Anda pilih. Pembuatan tiket
            tidak otomatis menugaskan petugas tertentu.
          </p>
        </div>

        <div className="form-grid">
          <label className={`field ${fieldErrors.title ? "field--invalid" : ""}`}>
            <span>Judul tiket</span>
            <input
              aria-invalid={fieldErrors.title ? "true" : "false"}
              onBlur={() => setFieldErrors((current) => ({ ...current, ...validateTicketForm(form) }))}
              onChange={(event) => handleFieldChange("title", event.target.value)}
              placeholder="Contoh: API timeout di layanan tiket"
              value={form.title}
            />
            {fieldErrors.title ? <small>{fieldErrors.title}</small> : null}
          </label>

          <label className={`field ${fieldErrors.priority ? "field--invalid" : ""}`}>
            <span>Prioritas</span>
            <SelectControl
              ariaLabel="Prioritas tiket"
              onChange={(priority) => handleFieldChange("priority", priority)}
              options={priorityOptions}
              value={form.priority}
            />
            {fieldErrors.priority ? <small>{fieldErrors.priority}</small> : null}
          </label>

          <label className={`field ${fieldErrors.category ? "field--invalid" : ""}`}>
            <span>Kategori</span>
            <SelectControl
              ariaLabel="Kategori tiket"
              onChange={(category) => handleFieldChange("category", category)}
              options={ticketCategoryOptions}
              value={form.category}
            />
            {fieldErrors.category ? <small>{fieldErrors.category}</small> : <small>Pilih jenis kebutuhan utama tiket ini.</small>}
          </label>

          <label className={`field ${fieldErrors.team ? "field--invalid" : ""}`}>
            <span>Area tujuan</span>
            <SelectControl
              ariaLabel="Area tujuan tiket"
              onChange={(team) => handleFieldChange("team", team)}
              options={ticketTeamOptions}
              value={form.team}
            />
            {fieldErrors.team ? <small>{fieldErrors.team}</small> : <small>Tentukan area operasional yang paling relevan untuk triase awal.</small>}
          </label>

          <label className={`field field--full ${fieldErrors.description ? "field--invalid" : ""}`}>
            <span>Deskripsi</span>
            <textarea
              aria-invalid={fieldErrors.description ? "true" : "false"}
              onBlur={() => setFieldErrors((current) => ({ ...current, ...validateTicketForm(form) }))}
              onChange={(event) => handleFieldChange("description", event.target.value)}
              placeholder="Jelaskan gejala, dampak, dan konteks singkat."
              rows={6}
              value={form.description}
            />
            {fieldErrors.description ? <small>{fieldErrors.description}</small> : null}
          </label>

          <article className="field field--full workflow-hint-card">
            <span>Routing awal tiket</span>
            <strong>
              {getTicketCategoryLabel(form.category)} menuju {getTicketTeamLabel(form.team)}
            </strong>
            <p>
              Pilihan ini membantu petugas memahami area kerja tiket sejak awal. Penugasan ke petugas dilakukan pada tahap
              triase atau tindak lanjut operasional.
            </p>
          </article>
        </div>

        <section className="attachment-composer">
          <div className="attachment-composer__header">
            <div>
              <p className="section-eyebrow">Lampiran</p>
              <h3>Lampiran pendukung</h3>
              <p className="form-hint">Tambahkan screenshot atau dokumen pendukung agar tiket lebih cepat dipahami.</p>
            </div>
            <div className="attachment-composer__actions">
              <input
                accept=".jpg,.jpeg,.png,.pdf,.txt,.csv,.docx,image/jpeg,image/png,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                aria-label="Lampiran pendukung"
                className="attachment-composer__input"
                id="create-ticket-attachments"
                multiple
                onChange={handleAttachmentSelection}
                ref={attachmentInputRef}
                type="file"
              />
              <button className="button button--secondary" onClick={() => attachmentInputRef.current?.click()} type="button">
                <AppIcon name="plus" size="sm" />
                Tambah Lampiran
              </button>
              {attachmentDrafts.length > 0 ? (
                <button className="button button--ghost" onClick={clearAttachmentDrafts} type="button">
                  <AppIcon name="reset" size="sm" />
                  Bersihkan
                </button>
              ) : null}
            </div>
          </div>

          <div className="attachment-composer__summary">
            <p className="form-hint">{attachmentSummary}</p>
            <p className="form-hint">Format yang didukung: JPG, PNG, PDF, TXT, CSV, DOCX. Ukuran maksimum 10 MB per file.</p>
          </div>

          {attachmentDrafts.length > 0 ? (
            <div className="attachment-draft-list">
              {attachmentDrafts.map((draft) => (
                <article className="attachment-draft-card" key={draft.id}>
                  {draft.previewUrl ? (
                    <img alt={`Pratinjau ${draft.file.name}`} className="attachment-draft-card__preview" src={draft.previewUrl} />
                  ) : (
                    <div className="attachment-draft-card__placeholder">
                      <AppIcon name="open" size="sm" />
                    </div>
                  )}
                  <div className="attachment-draft-card__copy">
                    <strong>{draft.file.name}</strong>
                    <p>{formatFileSize(draft.file.size)}</p>
                  </div>
                  <button
                    aria-label={`Hapus ${draft.file.name}`}
                    className="button button--ghost attachment-draft-card__remove"
                    onClick={() => removeAttachmentDraft(draft.id)}
                    type="button"
                  >
                    <AppIcon name="close" size="sm" />
                    Hapus
                  </button>
                </article>
              ))}
            </div>
          ) : null}

          {attachmentError ? <p className="form-error">{attachmentError}</p> : null}
          {isSubmitting && attachmentDrafts.length > 0 && uploadProgress > 0 ? (
            <div
              aria-label={`Progres upload lampiran tiket ${uploadProgress}%`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={uploadProgress}
              className="inline-progress"
              role="progressbar"
            >
              <div className="inline-progress__track">
                <span className="inline-progress__bar" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="form-hint">Progres upload lampiran: {uploadProgress}%</p>
            </div>
          ) : null}
        </section>

        {errorMessage ? (
          <div>
            <p className="form-error">{errorMessage}</p>
            {errorReferenceId ? <p className="form-hint">Kode referensi: {errorReferenceId}</p> : null}
          </div>
        ) : null}
        {submitNotice ? <p className="form-hint">{submitNotice}</p> : null}

        <div className="form-actions">
          <button aria-busy={isSubmitting} className="button button--primary" disabled={isSubmitDisabled} type="submit">
            <AppIcon name="plus" size="sm" />
            {isSubmitting ? "Menyimpan tiket..." : "Simpan Tiket"}
          </button>
        </div>
      </form>
    </section>
  );
}

function validateTicketForm(form: CreateTicketInput): TicketFormErrors {
  const nextErrors: TicketFormErrors = {};

  if (!form.title.trim()) {
    nextErrors.title = "Judul tiket wajib diisi.";
  }

  if (!form.priority) {
    nextErrors.priority = "Prioritas tiket wajib dipilih.";
  }

  if (!form.category) {
    nextErrors.category = "Kategori tiket wajib dipilih.";
  }

  if (!form.team) {
    nextErrors.team = "Area tujuan tiket wajib dipilih.";
  }

  if (!form.description.trim()) {
    nextErrors.description = "Deskripsi tiket wajib diisi.";
  }

  return nextErrors;
}

async function uploadAttachmentsForTicket(
  ticketId: string,
  drafts: AttachmentDraft[],
  setSubmitNotice: (message: string | null) => void,
  setUploadProgress: (progress: number) => void,
) {
  const failedUploads: string[] = [];

  for (const [index, draft] of drafts.entries()) {
    try {
      setSubmitNotice(`Mengunggah lampiran ${index + 1} dari ${drafts.length}: ${draft.file.name}`);
      const uploadTarget = await requestAttachmentUploadUrl(ticketId, {
        fileName: draft.file.name,
        contentType: draft.file.type,
        sizeBytes: draft.file.size,
      });

      await uploadAttachmentFile(uploadTarget, draft.file, (fileProgress) => {
        const overallProgress = Math.round(((index + fileProgress / 100) / drafts.length) * 100);
        setUploadProgress(overallProgress);
      });

      await saveAttachment(ticketId, {
        attachmentId: uploadTarget.attachmentId,
        objectKey: uploadTarget.objectKey,
        fileName: draft.file.name,
      });
    } catch {
      failedUploads.push(draft.file.name);
    }
  }

  setUploadProgress(failedUploads.length === drafts.length && drafts.length > 0 ? 0 : 100);
  setSubmitNotice(failedUploads.length > 0 ? "Tiket berhasil dibuat. Sebagian lampiran perlu diunggah ulang dari halaman detail." : "Tiket dan lampiran berhasil disimpan.");

  return failedUploads;
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (sizeBytes >= 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }

  return `${sizeBytes} B`;
}

function createPreviewUrl(file: File) {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return undefined;
  }

  return URL.createObjectURL(file);
}
