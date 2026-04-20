import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { listAssignableUsers } from "../api/profile";
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
import { SelectControl } from "../components/common/SelectControl";
import { useToast } from "../components/common/ToastProvider";
import { UserAvatar } from "../components/common/UserAvatar";
import { StatusBadge } from "../components/tickets/StatusBadge";
import { useAuth } from "../modules/auth/AuthContext";
import { getRoleLabel } from "../modules/auth/roles";
import type { AssignableUser } from "../types/profile";
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

const ticketStatusOptions: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Terbuka" },
  { value: "in_progress", label: "Sedang Ditangani" },
  { value: "resolved", label: "Selesai" },
];

export function TicketDetailPage() {
  const { session, profile, permissions } = useAuth();
  const { showToast } = useToast();
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
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentErrorReferenceId, setAssignmentErrorReferenceId] = useState<string | null>(null);
  const [attachmentMessage, setAttachmentMessage] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentErrorReferenceId, setAttachmentErrorReferenceId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [isLoadingAssignableUsers, setIsLoadingAssignableUsers] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");

  const currentIdentity = profile
    ? profile
    : session
      ? {
          subject: session.subject,
          displayName: session.displayName,
          email: session.email,
          role: session.role,
        }
      : null;

  const [commentForm, setCommentForm] = useState({
    authorName: currentIdentity?.displayName ?? "",
    message: "",
  });

  useEffect(() => {
    setCommentForm((current) => ({
      ...current,
      authorName: currentIdentity?.displayName ?? current.authorName,
    }));
  }, [currentIdentity?.displayName]);

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
    setSelectedAssigneeId(ticket?.assigneeId ?? "");
  }, [ticket?.assigneeId]);

  useEffect(() => {
    if (!permissions.canAssignTickets) {
      setAssignableUsers([]);
      return;
    }

    let cancelled = false;
    setIsLoadingAssignableUsers(true);

    void (async () => {
      try {
        const users = await listAssignableUsers();
        if (cancelled) {
          return;
        }

        setAssignableUsers(users);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setAssignmentError(getErrorMessage(error, "Daftar petugas belum bisa dimuat."));
        setAssignmentErrorReferenceId(getErrorReferenceId(error) ?? null);
      } finally {
        if (!cancelled) {
          setIsLoadingAssignableUsers(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [permissions.canAssignTickets]);

  const actionItems = useMemo(
    () => [
      {
        title: "Penugasan",
        description: permissions.canAssignTickets
          ? ticket?.assigneeId === session?.subject
            ? "Tiket ini sudah berada dalam tanggung jawab Anda."
            : ticket?.assigneeName
              ? `Saat ini tiket ditangani oleh ${ticket.assigneeName}.`
              : "Tiket ini belum memiliki petugas yang bertanggung jawab."
          : "Penugasan tiket hanya tersedia untuk petugas atau admin.",
        canAct: permissions.canAssignTickets,
      },
      {
        title: "Perubahan status",
        description: permissions.canUpdateTicketStatus
          ? "Status tiket dapat diperbarui sesuai progres penanganan."
          : "Perubahan status hanya tersedia untuk petugas atau admin.",
        canAct: permissions.canUpdateTicketStatus,
      },
      {
        title: "Kolaborasi",
        description: "Komentar dan lampiran tetap tersedia untuk memperkaya konteks penanganan tiket.",
        canAct: true,
      },
    ],
    [permissions.canAssignTickets, permissions.canUpdateTicketStatus, session?.subject, ticket?.assigneeId, ticket?.assigneeName],
  );

  const assigneeOptions = useMemo(() => {
    const options = assignableUsers.map((user) => ({
      value: user.subject,
      label: user.displayName,
      description: user.email,
    }));

    if (session?.subject && !options.some((option) => option.value === session.subject)) {
      options.unshift({
        value: session.subject,
        label: currentIdentity?.displayName ?? "Saya",
        description: currentIdentity?.email ?? "",
      });
    }

    return options;
  }, [assignableUsers, currentIdentity?.displayName, currentIdentity?.email, session?.subject]);

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
      showToast({
        title: "Status tiket diperbarui",
        description: `Status terbaru: ${formatStatusLabel(selectedStatus)}.`,
        tone: "success",
      });
      await loadTicket({ preserveView: true });
    } catch (error) {
      const message = getErrorMessage(error, "Status belum berhasil diperbarui.");
      setStatusError(message);
      setStatusErrorReferenceId(getErrorReferenceId(error) ?? null);
      showToast({
        title: "Status belum berhasil diperbarui",
        description: message,
        tone: "error",
      });
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
      setCommentForm({ message: "", authorName: currentIdentity?.displayName ?? "" });
      await loadTicket({ preserveView: true });
      setCommentMessage("Komentar baru berhasil ditambahkan ke tiket.");
      showToast({
        title: "Komentar berhasil ditambahkan",
        description: "Catatan terbaru sudah masuk ke riwayat tiket.",
        tone: "success",
      });
    } catch (error) {
      const message = getErrorMessage(error, "Komentar belum berhasil ditambahkan.");
      setCommentError(message);
      setCommentErrorReferenceId(getErrorReferenceId(error) ?? null);
      showToast({
        title: "Komentar belum berhasil ditambahkan",
        description: message,
        tone: "error",
      });
    } finally {
      setIsSavingComment(false);
    }
  }

  async function handleAssignTicket() {
    setIsSavingAssignment(true);
    setAssignmentMessage(null);
    setAssignmentError(null);
    setAssignmentErrorReferenceId(null);

    try {
      const updatedTicket = await assignTicket(
        ticketId,
        selectedAssigneeId && selectedAssigneeId !== session?.subject ? { assigneeId: selectedAssigneeId } : {},
      );
      setTicket(updatedTicket);
      setSelectedAssigneeId(updatedTicket.assigneeId ?? "");
      setAssignmentMessage(
        updatedTicket.assigneeId === session?.subject
          ? "Tiket berhasil ditugaskan kepada Anda."
          : `Tiket berhasil ditugaskan kepada ${updatedTicket.assigneeName || "petugas terpilih"}.`,
      );
      showToast({
        title: "Penugasan berhasil diperbarui",
        description:
          updatedTicket.assigneeId === session?.subject
            ? "Tiket ini sekarang tercatat atas nama Anda."
            : `Penanggung jawab tiket kini adalah ${updatedTicket.assigneeName || "petugas terpilih"}.`,
        tone: "success",
      });
      await loadTicket({ preserveView: true });
    } catch (error) {
      const message = getErrorMessage(error, "Penugasan tiket belum berhasil.");
      setAssignmentError(message);
      setAssignmentErrorReferenceId(getErrorReferenceId(error) ?? null);
      showToast({
        title: "Penugasan tiket belum berhasil",
        description: message,
        tone: "error",
      });
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
      showToast({
        title: "Lampiran belum dipilih",
        description: "Pilih file terlebih dahulu sebelum mengunggah lampiran.",
        tone: "error",
      });
      return;
    }

    if (!allowedAttachmentTypes.includes(selectedFile.type)) {
      setAttachmentError("Tipe file belum didukung. Gunakan PDF, JPG, PNG, TXT, CSV, atau DOCX.");
      showToast({
        title: "Tipe file belum didukung",
        description: "Gunakan PDF, JPG, PNG, TXT, CSV, atau DOCX.",
        tone: "error",
      });
      return;
    }

    if (selectedFile.size > maxAttachmentSizeBytes) {
      setAttachmentError("Ukuran file melebihi batas 10 MB.");
      showToast({
        title: "Ukuran file terlalu besar",
        description: "Ukuran lampiran maksimal adalah 10 MB.",
        tone: "error",
      });
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
      showToast({
        title: "Lampiran berhasil diunggah",
        description: `${selectedFile.name} sudah ditambahkan ke tiket.`,
        tone: "success",
      });
    } catch (error) {
      const message = getErrorMessage(error, "Lampiran belum berhasil diunggah.");
      setAttachmentError(message);
      setAttachmentErrorReferenceId(getErrorReferenceId(error) ?? null);
      showToast({
        title: "Lampiran belum berhasil diunggah",
        description: message,
        tone: "error",
      });
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
      const message = getErrorMessage(error, "Lampiran belum bisa dibuka.");
      setAttachmentError(message);
      setAttachmentErrorReferenceId(getErrorReferenceId(error) ?? null);
      showToast({
        title: "Lampiran belum bisa dibuka",
        description: message,
        tone: "error",
      });
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  if (loading) {
    return (
      <LoadingState
        eyebrow="Detail tiket"
        label="Memuat detail tiket..."
        supportText="Kami sedang menyiapkan informasi inti, riwayat aktivitas, komentar, dan lampiran tiket ini."
        lines={6}
      />
    );
  }

  if (pageError) {
    return (
      <ErrorState
        eyebrow="Detail tiket"
        title="Detail tiket belum tersedia"
        message="Informasi tiket ini belum bisa ditampilkan sepenuhnya untuk saat ini."
        referenceId={pageErrorReferenceId ?? undefined}
        supportText="Coba muat ulang halaman ini. Jika kendala berlanjut, buka kembali daftar tiket lalu masuk ke detail tiket ini dari sana."
        onRetry={() => void loadTicket()}
      />
    );
  }

  if (!ticket) {
    return (
      <EmptyState
        eyebrow="Detail tiket"
        title="Tiket tidak ditemukan"
        description="Data tiket yang diminta belum tersedia atau sudah tidak dapat diakses."
        supportText="Kembali ke daftar tiket untuk memilih tiket lain atau muat ulang halaman jika Anda baru saja melakukan perubahan."
      />
    );
  }

  return (
    <section className="stack-lg page-shell page-shell--wide page-flow ticket-detail-page">
      <article className="panel panel--section ticket-summary ticket-summary--hero">
        <div className="ticket-summary__header">
          <div>
            <p className="section-eyebrow">{ticket.id}</p>
            <h2>{ticket.title}</h2>
          </div>
          <div className="ticket-summary__badges">
            <StatusBadge status={ticket.status} />
            <span className={`priority-pill priority-pill--${ticket.priority}`}>{formatPriorityLabel(ticket.priority)}</span>
          </div>
        </div>

        <p className="ticket-summary__description">{ticket.description}</p>

        <div className="ticket-overview-grid">
          <article className="ticket-overview-card">
            <span>Pelapor</span>
            <strong>{ticket.reporterName}</strong>
            <p>{ticket.reporterEmail}</p>
            {ticket.reporterId ? <small>{ticket.reporterId}</small> : null}
          </article>
          <article className="ticket-overview-card">
            <span>Penugasan</span>
            <strong>{ticket.assigneeName || "Belum ditugaskan"}</strong>
            <p>{ticket.assignedAt ? `Ditugaskan ${formatDateTime(ticket.assignedAt)}` : "Belum ada petugas yang mengambil tiket ini."}</p>
            {ticket.assigneeId ? <small>{ticket.assigneeId}</small> : null}
          </article>
          <article className="ticket-overview-card">
            <span>Dibuat oleh sistem</span>
            <strong>{ticket.createdByName || ticket.createdByEmail || "Data belum tersedia"}</strong>
            <p>Dibuat {formatDateTime(ticket.createdAt)}</p>
            {ticket.createdBy ? <small>{ticket.createdBy}</small> : null}
          </article>
          <article className="ticket-overview-card">
            <span>Pembaruan terakhir</span>
            <strong>{formatDateTime(ticket.updatedAt)}</strong>
            <p>{activities.length} aktivitas tercatat pada tiket ini.</p>
          </article>
        </div>
      </article>

      <div className="ticket-layout">
        <div className="stack-lg">
          <article className="panel panel--section stack-md">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Metadata</p>
                <h3>Informasi tiket</h3>
              </div>
              <p className="filter-summary">Ringkasan inti untuk verifikasi operasional</p>
            </div>

            <dl className="meta-grid meta-grid--detail">
              <div>
                <dt>Status</dt>
                <dd>{formatStatusLabel(ticket.status)}</dd>
              </div>
              <div>
                <dt>Prioritas</dt>
                <dd>{formatPriorityLabel(ticket.priority)}</dd>
              </div>
              <div>
                <dt>Pelapor</dt>
                <dd>{ticket.reporterName}</dd>
              </div>
              <div>
                <dt>Email pelapor</dt>
                <dd>{ticket.reporterEmail}</dd>
              </div>
              <div>
                <dt>ID pelapor</dt>
                <dd>{ticket.reporterId || "Belum tersedia"}</dd>
              </div>
              <div>
                <dt>Dibuat oleh</dt>
                <dd>{ticket.createdByName || ticket.createdByEmail || "Data belum tersedia"}</dd>
              </div>
              <div>
                <dt>ID pembuat</dt>
                <dd>{ticket.createdBy || "Belum tersedia"}</dd>
              </div>
              <div>
                <dt>Petugas</dt>
                <dd>{ticket.assigneeName || "Belum ditugaskan"}</dd>
              </div>
              <div>
                <dt>ID petugas</dt>
                <dd>{ticket.assigneeId || "Belum ditugaskan"}</dd>
              </div>
              <div>
                <dt>Waktu penugasan</dt>
                <dd>{ticket.assignedAt ? formatDateTime(ticket.assignedAt) : "Belum ditugaskan"}</dd>
              </div>
              <div>
                <dt>Dibuat pada</dt>
                <dd>{formatDateTime(ticket.createdAt)}</dd>
              </div>
              <div>
                <dt>Diperbarui pada</dt>
                <dd>{formatDateTime(ticket.updatedAt)}</dd>
              </div>
            </dl>
          </article>

          <article className="panel panel--section stack-md">
            <div>
              <p className="section-eyebrow">Lampiran</p>
              <h3>Dokumen dan file pendukung</h3>
              <p className="form-hint">Semua lampiran dibuka melalui URL aman dan tercatat pada tiket ini.</p>
            </div>

            {ticket.attachments.length === 0 ? (
              <EmptyState title="Belum ada lampiran" description="Tambahkan file pendukung agar penanganan tiket lebih lengkap." />
            ) : (
              <div className="stack-md">
                {ticket.attachments.map((attachment) => (
                  <article className="comment-card comment-card--rich" key={attachment.id}>
                    <div className="comment-card__header">
                      <strong>{attachment.fileName}</strong>
                      <span>{formatDateTime(attachment.createdAt)}</span>
                    </div>
                    <div className="meta-inline">
                      <span>{formatFileSize(attachment.sizeBytes)}</span>
                      <span>{attachment.uploadedByName || "Pengguna OpsDesk"}</span>
                      <span>{attachment.uploadedByRole ? getRoleLabel(attachment.uploadedByRole) : "Akun"}</span>
                    </div>
                    <button
                      aria-busy={downloadingAttachmentId === attachment.id}
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

          <article className="panel panel--section stack-md">
            <div>
              <p className="section-eyebrow">Kolaborasi</p>
              <h3>Komentar dan catatan kerja</h3>
            </div>

            {ticket.comments.length === 0 ? (
              <EmptyState title="Belum ada komentar" description="Tambahkan komentar pertama untuk mencatat progres penanganan." />
            ) : (
              <div className="stack-md">
                {ticket.comments.map((comment) => (
                  <article className="comment-card comment-card--rich" key={comment.id}>
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

          <article className="panel panel--section stack-md">
            <div>
              <p className="section-eyebrow">Riwayat</p>
              <h3>Timeline aktivitas tiket</h3>
              <p className="form-hint">Perubahan status, komentar, penugasan, dan lampiran akan muncul berurutan di sini.</p>
            </div>

            {activities.length === 0 ? (
              <EmptyState
                title="Belum ada aktivitas"
                description="Riwayat aktivitas tiket akan muncul setelah ada perubahan pada tiket ini."
              />
            ) : (
              <div className="timeline-list">
                {activities.map((activity) => (
                  <article className="timeline-item" key={activity.id}>
                    <div aria-hidden="true" className="timeline-item__dot" />
                    <div className="timeline-item__content">
                      <div className="comment-card__header">
                        <strong>{activity.summary}</strong>
                        <span>{formatDateTime(activity.timestamp)}</span>
                      </div>
                      <p>{formatActivityActor(activity)}</p>
                      {renderActivityMetadata(activity)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>
        </div>

        <aside className="stack-lg">
          <article className="panel panel--section stack-md">
            <div>
              <p className="section-eyebrow">Aksi cepat</p>
              <h3>Tindakan yang tersedia</h3>
            </div>
            <div className="action-overview">
              {actionItems.map((item) => (
                <article className="action-overview__item" key={item.title}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                  <span className={`action-state ${item.canAct ? "action-state--allowed" : "action-state--restricted"}`}>
                    {item.canAct ? "Tersedia" : "Terbatas"}
                  </span>
                </article>
              ))}
            </div>
          </article>

          <article className="panel panel--section">
            <p className="section-eyebrow">Penugasan</p>
            <h3>Tanggung jawab tiket</h3>
            {permissions.canAssignTickets ? (
              <div className="stack-md">
                <div className="assignment-card">
                  <div className="assignment-card__current">
                    <div>
                      <span className="field-label">Penanggung jawab saat ini</span>
                      <strong>{ticket.assigneeName || "Belum ditugaskan"}</strong>
                      <p>{ticket.assigneeId === session?.subject ? "Tiket ini sedang berada dalam antrean kerja Anda." : ticket.assigneeName ? "Petugas yang dipilih saat ini bertanggung jawab atas tindak lanjut tiket." : "Pilih petugas agar kepemilikan penanganan lebih jelas."}</p>
                      {ticket.assigneeId ? <small>{ticket.assigneeId}</small> : null}
                    </div>
                    <UserAvatar
                      avatarUrl={assignableUsers.find((user) => user.subject === ticket.assigneeId)?.avatarUrl}
                      name={ticket.assigneeName || "Belum ditugaskan"}
                      size="sm"
                    />
                  </div>

                  <label className="field" htmlFor="ticket-assignee-select">
                    <span>Ubah penanggung jawab</span>
                    <SelectControl
                      ariaLabel="Ubah penanggung jawab"
                      disabled={isSavingAssignment || isLoadingAssignableUsers}
                      id="ticket-assignee-select"
                      onChange={setSelectedAssigneeId}
                      options={assigneeOptions}
                      value={selectedAssigneeId}
                    />
                    <small>
                      {isLoadingAssignableUsers
                        ? "Memuat daftar petugas dan admin..."
                        : "Hanya petugas dan admin yang tersedia untuk penugasan."}
                    </small>
                  </label>
                </div>
                {assignmentError ? <p className="form-error">{assignmentError}</p> : null}
                {assignmentErrorReferenceId ? <p className="form-hint">Kode referensi: {assignmentErrorReferenceId}</p> : null}
                {assignmentMessage ? <p className="form-success">{assignmentMessage}</p> : null}
                <button
                  aria-busy={isSavingAssignment}
                  className="button button--secondary"
                  disabled={
                    isSavingAssignment ||
                    isLoadingAssignableUsers ||
                    !selectedAssigneeId ||
                    selectedAssigneeId === ticket.assigneeId
                  }
                  onClick={() => void handleAssignTicket()}
                  type="button"
                >
                  {isSavingAssignment
                    ? "Menyimpan penugasan..."
                    : selectedAssigneeId === session?.subject
                      ? "Tugaskan ke Saya"
                      : "Simpan Penugasan"}
                </button>
              </div>
            ) : (
              <p className="form-hint">Penugasan tiket hanya dapat dilakukan oleh petugas atau admin.</p>
            )}
          </article>

          <article className="panel panel--section">
            <p className="section-eyebrow">Status</p>
            <h3>Perbarui progres tiket</h3>
            {permissions.canUpdateTicketStatus ? (
              <form className="stack-md" onSubmit={handleStatusSubmit}>
                <label className="field">
                  <span>Status tiket</span>
                  <SelectControl
                    ariaLabel="Status tiket"
                    onChange={setSelectedStatus}
                    options={ticketStatusOptions}
                    value={selectedStatus}
                  />
                </label>
                {statusError ? <p className="form-error">{statusError}</p> : null}
                {statusErrorReferenceId ? <p className="form-hint">Kode referensi: {statusErrorReferenceId}</p> : null}
                {statusMessage ? <p className="form-success">{statusMessage}</p> : null}
                <button aria-busy={isSavingStatus} className="button button--primary" disabled={isSavingStatus} type="submit">
                  {isSavingStatus ? "Menyimpan status..." : "Perbarui Status"}
                </button>
              </form>
            ) : (
              <p className="form-hint">Status tiket hanya dapat diperbarui oleh petugas atau admin.</p>
            )}
          </article>

          <article className="panel panel--section">
            <p className="section-eyebrow">Tambah lampiran</p>
            <h3>Unggah file pendukung</h3>
            <p className="form-hint">Format yang didukung: PDF, JPG, PNG, TXT, CSV, dan DOCX dengan ukuran maksimal 10 MB.</p>
            <form className="stack-md" onSubmit={handleAttachmentSubmit}>
              <label className="field">
                <span>Pilih file</span>
                <input
                  accept=".pdf,.jpg,.jpeg,.png,.txt,.csv,.docx"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>
              {selectedFile ? <p className="form-hint">{selectedFile.name} | {formatFileSize(selectedFile.size)}</p> : null}
              {isUploadingAttachment && uploadProgress > 0 ? (
                <div aria-label={`Progres upload lampiran ${uploadProgress}%`} className="inline-progress" role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={uploadProgress}>
                  <div className="inline-progress__track">
                    <span className="inline-progress__bar" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="form-hint">Progres upload: {uploadProgress}%</p>
                </div>
              ) : null}
              {attachmentError ? <p className="form-error">{attachmentError}</p> : null}
              {attachmentErrorReferenceId ? <p className="form-hint">Kode referensi: {attachmentErrorReferenceId}</p> : null}
              {attachmentMessage ? <p className="form-success">{attachmentMessage}</p> : null}
              <button aria-busy={isUploadingAttachment} className="button button--primary" disabled={isUploadingAttachment} type="submit">
                {isUploadingAttachment ? "Mengunggah lampiran..." : "Unggah Lampiran"}
              </button>
            </form>
          </article>

          <article className="panel panel--section">
            <p className="section-eyebrow">Tambah catatan</p>
            <h3>Tulis komentar baru</h3>
            <form className="stack-md" onSubmit={handleCommentSubmit}>
              <label className="field">
                <span>Penulis komentar</span>
                <input readOnly value={commentForm.authorName} />
                <small>Nama penulis diambil dari identitas akun yang sedang masuk.</small>
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
              {currentIdentity ? (
                <p className="form-hint">
                  Dikirim sebagai {currentIdentity.displayName} ({getRoleLabel(currentIdentity.role)})
                </p>
              ) : null}
              {commentError ? <p className="form-error">{commentError}</p> : null}
              {commentErrorReferenceId ? <p className="form-hint">Kode referensi: {commentErrorReferenceId}</p> : null}
              {commentMessage ? <p className="form-success">{commentMessage}</p> : null}
              <button aria-busy={isSavingComment} className="button button--primary" disabled={isSavingComment} type="submit">
                {isSavingComment ? "Mengirim komentar..." : "Tambah Komentar"}
              </button>
            </form>
          </article>
        </aside>
      </div>
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

function formatPriorityLabel(priority?: string) {
  switch (priority) {
    case "high":
      return "Prioritas Tinggi";
    case "medium":
      return "Prioritas Sedang";
    case "low":
      return "Prioritas Rendah";
    default:
      return "Prioritas Tidak Diketahui";
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
