import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  addComment,
  assignTicket,
  getAttachmentDownloadUrl,
  getTicket,
  getTicketActivities,
  requestAttachmentUploadUrl,
  saveAttachment,
  updateTicketStatus,
  uploadAttachmentFile,
} from "../api/tickets";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { StatusBadge } from "../components/tickets/StatusBadge";
import { getRoleLabel } from "../modules/auth/roles";
import { useAuth } from "../modules/auth/AuthContext";
import type { Attachment, Ticket, TicketActivity, TicketStatus } from "../types/ticket";
import { formatDateTime } from "../utils/date";
import { getErrorMessage, getErrorReferenceId } from "../utils/errors";

const allowedAttachmentTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const maxAttachmentSizeBytes = 10 * 1024 * 1024;

export function TicketDetailPage() {
  const { session, permissions } = useAuth();
  const { ticketId = "" } = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [activities, setActivities] = useState<TicketActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageErrorReferenceId, setPageErrorReferenceId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusErrorReferenceId, setStatusErrorReferenceId] = useState<string | null>(null);
  const [commentMessage, setCommentMessage] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentErrorReferenceId, setCommentErrorReferenceId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>("open");
  const [commentForm, setCommentForm] = useState({
    message: "",
    authorName: session?.displayName ?? "",
  });
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentErrorReferenceId, setAssignmentErrorReferenceId] = useState<string | null>(null);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [attachmentMessage, setAttachmentMessage] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentErrorReferenceId, setAttachmentErrorReferenceId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);

  async function loadTicket(options?: { preserveView?: boolean }) {
    if (!options?.preserveView) {
      setLoading(true);
    }

    setPageError(null);
    setPageErrorReferenceId(null);

    try {
      const [ticketData, activityData] = await Promise.all([getTicket(ticketId), getTicketActivities(ticketId)]);
      setTicket(ticketData);
      setActivities(activityData);
      setSelectedStatus(ticketData.status);
    } catch (error) {
      setPageError(getErrorMessage(error, "Detail tiket belum bisa dimuat."));
      setPageErrorReferenceId(getErrorReferenceId(error) ?? null);
    } finally {
      if (!options?.preserveView) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadTicket();
  }, [ticketId]);

  useEffect(() => {
    setCommentForm((current) => ({
      ...current,
      authorName: session?.displayName ?? current.authorName,
    }));
  }, [session?.displayName]);

  async function handleStatusSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingStatus(true);
    setStatusMessage(null);
    setStatusError(null);
    setStatusErrorReferenceId(null);

    try {
      const updatedTicket = await updateTicketStatus(ticketId, selectedStatus);
      setTicket(updatedTicket);
      setStatusMessage("Status tiket berhasil diperbarui.");
    } catch (error) {
      setStatusError(getErrorMessage(error, "Status belum berhasil diperbarui."));
      setStatusErrorReferenceId(getErrorReferenceId(error) ?? null);
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingComment(true);
    setCommentMessage(null);
    setCommentError(null);
    setCommentErrorReferenceId(null);

    try {
      await addComment(ticketId, commentForm);
      setCommentForm({ message: "", authorName: session?.displayName ?? "" });
      await loadTicket({ preserveView: true });
      setCommentMessage("Komentar baru berhasil ditambahkan ke tiket.");
    } catch (error) {
      setCommentError(getErrorMessage(error, "Komentar belum berhasil ditambahkan."));
      setCommentErrorReferenceId(getErrorReferenceId(error) ?? null);
    } finally {
      setIsSavingComment(false);
    }
  }

  async function handleAssignToMe() {
    setIsSavingAssignment(true);
    setAssignmentMessage(null);
    setAssignmentError(null);
    setAssignmentErrorReferenceId(null);

    try {
      const updatedTicket = await assignTicket(ticketId);
      setTicket(updatedTicket);
      setAssignmentMessage("Tiket berhasil ditugaskan kepada Anda.");
    } catch (error) {
      setAssignmentError(getErrorMessage(error, "Penugasan tiket belum berhasil."));
      setAssignmentErrorReferenceId(getErrorReferenceId(error) ?? null);
    } finally {
      setIsSavingAssignment(false);
    }
  }

  async function handleAttachmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttachmentMessage(null);
    setAttachmentError(null);
    setAttachmentErrorReferenceId(null);

    if (!selectedFile) {
      setAttachmentError("Pilih file lampiran terlebih dahulu.");
      return;
    }

    if (!allowedAttachmentTypes.includes(selectedFile.type)) {
      setAttachmentError("Tipe file belum didukung. Gunakan PDF, JPG, PNG, TXT, CSV, atau DOCX.");
      return;
    }

    if (selectedFile.size > maxAttachmentSizeBytes) {
      setAttachmentError("Ukuran file melebihi batas 10 MB.");
      return;
    }

    setIsUploadingAttachment(true);
    setUploadProgress(0);

    try {
      const uploadTarget = await requestAttachmentUploadUrl(ticketId, {
        fileName: selectedFile.name,
        contentType: selectedFile.type,
        sizeBytes: selectedFile.size,
      });

      await uploadAttachmentFile(uploadTarget, selectedFile, setUploadProgress);

      await saveAttachment(ticketId, {
        attachmentId: uploadTarget.attachmentId,
        objectKey: uploadTarget.objectKey,
        fileName: selectedFile.name,
      });

      setSelectedFile(null);
      await loadTicket({ preserveView: true });
      setAttachmentMessage("Lampiran berhasil ditambahkan ke tiket.");
    } catch (error) {
      setAttachmentError(getErrorMessage(error, "Lampiran belum berhasil diunggah."));
      setAttachmentErrorReferenceId(getErrorReferenceId(error) ?? null);
    } finally {
      setIsUploadingAttachment(false);
    }
  }

  async function handleOpenAttachment(attachment: Attachment) {
    setDownloadingAttachmentId(attachment.id);
    setAttachmentError(null);
    setAttachmentErrorReferenceId(null);

    try {
      const downloadTarget = await getAttachmentDownloadUrl(ticketId, attachment.id);
      window.open(downloadTarget.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setAttachmentError(getErrorMessage(error, "Lampiran belum bisa dibuka."));
      setAttachmentErrorReferenceId(getErrorReferenceId(error) ?? null);
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  if (loading) {
    return <LoadingState label="Memuat detail tiket..." />;
  }

  if (pageError) {
    return (
      <ErrorState
        title="Detail tiket belum tersedia"
        message={pageError}
        referenceId={pageErrorReferenceId ?? undefined}
        onRetry={() => void loadTicket()}
      />
    );
  }

  if (!ticket) {
    return <EmptyState title="Tiket tidak ditemukan" description="Data tiket yang diminta tidak tersedia." />;
  }

  return (
    <section className="stack-lg">
      <div className="detail-grid">
        <article className="panel ticket-summary">
          <div className="ticket-summary__header">
            <div>
              <p className="section-eyebrow">{ticket.id}</p>
              <h2>{ticket.title}</h2>
            </div>
            <StatusBadge status={ticket.status} />
          </div>

          <p className="ticket-summary__description">{ticket.description}</p>

          <dl className="meta-grid">
            <div>
              <dt>Pelapor</dt>
              <dd>{ticket.reporterName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{ticket.reporterEmail}</dd>
            </div>
            <div>
              <dt>Dibuat</dt>
              <dd>{formatDateTime(ticket.createdAt)}</dd>
            </div>
            <div>
              <dt>Dibuat oleh</dt>
              <dd>{ticket.createdByName || ticket.createdByEmail || "Data belum tersedia"}</dd>
            </div>
            <div>
              <dt>Petugas</dt>
              <dd>{ticket.assigneeName || "Belum ditugaskan"}</dd>
            </div>
            <div>
              <dt>Waktu penugasan</dt>
              <dd>{ticket.assignedAt ? formatDateTime(ticket.assignedAt) : "Belum ditugaskan"}</dd>
            </div>
            <div>
              <dt>Diperbarui</dt>
              <dd>{formatDateTime(ticket.updatedAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <p className="section-eyebrow">Penugasan</p>
          <h3>Tanggung jawab tiket</h3>
          {permissions.canAssignTickets ? (
            <div className="stack-md">
              <p className="form-hint">
                {ticket.assigneeId === session?.subject
                  ? "Tiket ini sudah tercatat atas nama Anda."
                  : ticket.assigneeName
                    ? `Saat ini ditangani oleh ${ticket.assigneeName}.`
                    : "Tiket ini belum memiliki petugas yang bertanggung jawab."}
              </p>

              {assignmentError ? <p className="form-error">{assignmentError}</p> : null}
              {assignmentErrorReferenceId ? <p className="form-hint">Kode referensi: {assignmentErrorReferenceId}</p> : null}
              {assignmentMessage ? <p className="form-success">{assignmentMessage}</p> : null}

              <button
                className="button button--secondary"
                disabled={isSavingAssignment || ticket.assigneeId === session?.subject}
                onClick={() => void handleAssignToMe()}
                type="button"
              >
                {isSavingAssignment ? "Menyimpan penugasan..." : "Tugaskan ke Saya"}
              </button>
            </div>
          ) : (
            <p className="form-hint">Penugasan tiket hanya dapat dilakukan oleh petugas atau admin.</p>
          )}
        </article>

        <article className="panel">
          <p className="section-eyebrow">Tindak lanjut</p>
          <h3>Perbarui status</h3>
          {permissions.canUpdateTicketStatus ? (
            <form className="stack-md" onSubmit={handleStatusSubmit}>
              <label className="field">
                <span>Status tiket</span>
                <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as TicketStatus)}>
                  <option value="open">Terbuka</option>
                  <option value="in_progress">Sedang Ditangani</option>
                  <option value="resolved">Selesai</option>
                </select>
              </label>

              {statusError ? <p className="form-error">{statusError}</p> : null}
              {statusErrorReferenceId ? <p className="form-hint">Kode referensi: {statusErrorReferenceId}</p> : null}
              {statusMessage ? <p className="form-success">{statusMessage}</p> : null}

              <button className="button button--primary" disabled={isSavingStatus} type="submit">
                {isSavingStatus ? "Menyimpan status..." : "Perbarui Status"}
              </button>
            </form>
          ) : (
            <p className="form-hint">Status tiket hanya dapat diperbarui oleh petugas atau admin.</p>
          )}
        </article>
      </div>

      <div className="detail-grid">
        <article className="panel stack-md">
          <div>
            <p className="section-eyebrow">Lampiran</p>
            <h3>File tiket</h3>
            <p className="form-hint">Unggah PDF, JPG, PNG, TXT, CSV, atau DOCX dengan ukuran maksimal 10 MB.</p>
          </div>

          {ticket.attachments.length === 0 ? (
            <EmptyState
              title="Belum ada lampiran"
              description="Tambahkan file pendukung agar penanganan tiket lebih lengkap."
            />
          ) : (
            <div className="comment-list">
              {ticket.attachments.map((attachment) => (
                <article className="comment-card" key={attachment.id}>
                  <div className="comment-card__header">
                    <strong>{attachment.fileName}</strong>
                    <span>{formatDateTime(attachment.createdAt)}</span>
                  </div>
                  <p>
                    {formatFileSize(attachment.sizeBytes)} • {attachment.uploadedByName || "Pengguna OpsDesk"}
                  </p>
                  <button
                    className="button button--secondary"
                    disabled={downloadingAttachmentId === attachment.id}
                    onClick={() => void handleOpenAttachment(attachment)}
                    type="button"
                  >
                    {downloadingAttachmentId === attachment.id ? "Membuka lampiran..." : "Buka Lampiran"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <p className="section-eyebrow">Tambah lampiran</p>
          <h3>Unggah file pendukung</h3>
          <form className="stack-md" onSubmit={handleAttachmentSubmit}>
            <label className="field">
              <span>Pilih file</span>
              <input
                accept=".pdf,.jpg,.jpeg,.png,.txt,.csv,.docx"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>

            {selectedFile ? <p className="form-hint">{selectedFile.name} • {formatFileSize(selectedFile.size)}</p> : null}
            {isUploadingAttachment ? <p className="form-hint">Progres upload: {uploadProgress}%</p> : null}
            {attachmentError ? <p className="form-error">{attachmentError}</p> : null}
            {attachmentErrorReferenceId ? <p className="form-hint">Kode referensi: {attachmentErrorReferenceId}</p> : null}
            {attachmentMessage ? <p className="form-success">{attachmentMessage}</p> : null}

            <button className="button button--primary" disabled={isUploadingAttachment} type="submit">
              {isUploadingAttachment ? "Mengunggah lampiran..." : "Unggah Lampiran"}
            </button>
          </form>
        </article>

        <article className="panel stack-md">
          <div>
            <p className="section-eyebrow">Kolaborasi</p>
            <h3>Komentar tiket</h3>
          </div>

          {ticket.comments.length === 0 ? (
            <EmptyState
              title="Belum ada komentar"
              description="Tambahkan komentar pertama untuk mencatat progres penanganan."
            />
          ) : (
            <div className="comment-list">
              {ticket.comments.map((comment) => (
                <article className="comment-card" key={comment.id}>
                  <div className="comment-card__header">
                    <strong>{comment.authorName}</strong>
                    <span>{formatDateTime(comment.createdAt)}</span>
                  </div>
                  <p>{comment.message}</p>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <p className="section-eyebrow">Tambah catatan</p>
          <h3>Tulis komentar baru</h3>
          <form className="stack-md" onSubmit={handleCommentSubmit}>
            <label className="field">
              <span>Nama penulis</span>
              <input
                value={commentForm.authorName}
                onChange={(event) => setCommentForm((current) => ({ ...current, authorName: event.target.value }))}
                placeholder="Nama penulis komentar"
              />
            </label>

            <label className="field">
              <span>Isi komentar</span>
              <textarea
                value={commentForm.message}
                onChange={(event) => setCommentForm((current) => ({ ...current, message: event.target.value }))}
                placeholder="Tuliskan pembaruan penanganan."
                rows={5}
              />
            </label>

            {commentError ? <p className="form-error">{commentError}</p> : null}
            {commentErrorReferenceId ? <p className="form-hint">Kode referensi: {commentErrorReferenceId}</p> : null}
            {commentMessage ? <p className="form-success">{commentMessage}</p> : null}

            <button className="button button--primary" disabled={isSavingComment} type="submit">
              {isSavingComment ? "Mengirim komentar..." : "Tambah Komentar"}
            </button>
          </form>
        </article>
      </div>

      <article className="panel stack-md">
        <div>
          <p className="section-eyebrow">Riwayat</p>
          <h3>Aktivitas tiket</h3>
        </div>

        {activities.length === 0 ? (
          <EmptyState
            title="Belum ada aktivitas"
            description="Riwayat aktivitas tiket akan muncul setelah ada perubahan pada tiket ini."
          />
        ) : (
          <div className="comment-list">
            {activities.map((activity) => (
              <article className="comment-card" key={activity.id}>
                <div className="comment-card__header">
                  <strong>{activity.summary}</strong>
                  <span>{formatDateTime(activity.timestamp)}</span>
                </div>
                <p>{formatActivityActor(activity)}</p>
                {renderActivityMetadata(activity)}
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

function formatActivityActor(activity: TicketActivity) {
  if (!activity.actorName) {
    return "Sistem OpsDesk";
  }

  if (!activity.actorRole) {
    return activity.actorName;
  }

  return `${activity.actorName} (${getRoleLabel(activity.actorRole)})`;
}

function renderActivityMetadata(activity: TicketActivity) {
  if (!activity.metadata) {
    return null;
  }

  if (activity.action === "status_changed") {
    return (
      <p>
        {formatStatusLabel(activity.metadata.beforeStatus)} menjadi {formatStatusLabel(activity.metadata.afterStatus)}
      </p>
    );
  }

  if (activity.action === "assignment_changed") {
    return <p>{activity.metadata.afterAssigneeName || "Petugas belum ditentukan"}</p>;
  }

  if (activity.action === "attachment_added") {
    return <p>{activity.metadata.fileName || "Lampiran baru"}</p>;
  }

  return null;
}

function formatStatusLabel(status?: string) {
  switch (status) {
    case "open":
      return "Terbuka";
    case "in_progress":
      return "Sedang Ditangani";
    case "resolved":
      return "Selesai";
    default:
      return "Status tidak diketahui";
  }
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
