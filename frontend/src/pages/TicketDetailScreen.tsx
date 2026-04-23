import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listAssignableUsers } from "../api/profile";
import {
  addComment,
  assignTicket,
  getAttachmentDownloadUrl,
  getTicket,
  getTicketActivities,
  listTickets,
  requestAttachmentUploadUrl,
  saveAttachment,
  updateTicketStatus,
  uploadAttachmentFile,
} from "../api/tickets";
import { AppIcon } from "../components/common/AppIcon";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { SelectControl } from "../components/common/SelectControl";
import { useToast } from "../components/common/ToastProvider";
import { UserAvatar } from "../components/common/UserAvatar";
import { StatusBadge } from "../components/tickets/StatusBadge";
import { operatorMacros } from "../content/operatorMacros";
import { useAuth } from "../modules/auth/AuthContext";
import { getRoleLabel } from "../modules/auth/roles";
import type { AssignableUser } from "../types/profile";
import type { Attachment, Comment, Ticket, TicketActivity, TicketStatus } from "../types/ticket";
import { formatDateTime } from "../utils/date";
import { getErrorMessage, getErrorReferenceId } from "../utils/errors";
import {
  buildOperatorQuickActionPresets,
  buildTicketAutomationSignals,
  detectIncidentCluster,
  getOperatorMacroById,
} from "../utils/operatorAutomation";
import { buildReporterTicketGuidance, findHelpArticleMatches, getReporterProgressSteps } from "../utils/selfService";
import { formatSlaDueLabel, formatSlaTarget, getSlaState, getSlaToneLabel, getTicketDueAt } from "../utils/sla";
import { buildOperatorDraftAssist, buildTicketSummaryAssist, findRelatedTickets, getTicketAssistSuggestion } from "../utils/smartAssist";
import {
  commentVisibilityOptions,
  getCommentVisibilityLabel,
  getPriorityLabel,
  getTicketCategoryLabel,
  getTicketTeamLabel,
} from "../utils/ticketMetadata";

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
  const [quickActionMessage, setQuickActionMessage] = useState<string | null>(null);
  const [quickActionError, setQuickActionError] = useState<string | null>(null);
  const [isRunningQuickActionId, setIsRunningQuickActionId] = useState<string | null>(null);
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
  const [workloadTickets, setWorkloadTickets] = useState<Ticket[]>([]);
  const [isLoadingWorkload, setIsLoadingWorkload] = useState(false);
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

  const [commentForm, setCommentForm] = useState<{ authorName: string; message: string; visibility: "public" | "internal" }>({
    authorName: currentIdentity?.displayName ?? "",
    message: "",
    visibility: "public",
  });

  useEffect(() => {
    setCommentForm((current) => ({
      ...current,
      authorName: currentIdentity?.displayName ?? current.authorName,
    }));
  }, [currentIdentity?.displayName]);

  async function loadWorkloadSnapshot() {
    if (!permissions.canAssignTickets) {
      return;
    }

    setIsLoadingWorkload(true);
    try {
      const data = await listTickets({
        page: 1,
        pageSize: 100,
        sortBy: "updated_at",
        sortOrder: "desc",
      });
      setWorkloadTickets(data.items);
    } catch {
      setWorkloadTickets([]);
    } finally {
      setIsLoadingWorkload(false);
    }
  }

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

  useEffect(() => {
    if (!permissions.canAssignTickets) {
      setWorkloadTickets([]);
      return;
    }

    void loadWorkloadSnapshot();
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
              : "Tiket ini sudah masuk antrean, tetapi belum memiliki petugas yang bertanggung jawab."
          : ticket?.assigneeName
            ? `Saat ini tiket ditangani oleh ${ticket.assigneeName}.`
            : "Tiket ini sudah masuk antrean dan menunggu petugas yang relevan mengambil tindak lanjut.",
        canAct: permissions.canAssignTickets || !permissions.canViewOperationalTickets,
      },
      {
        title: "Perubahan status",
        description: permissions.canUpdateTicketStatus
          ? "Status tiket dapat diperbarui sesuai progres penanganan."
          : "Anda tetap bisa memantau status terbaru dari tiket ini tanpa mengubahnya sendiri.",
        canAct: permissions.canUpdateTicketStatus || !permissions.canViewOperationalTickets,
      },
      {
        title: "Kolaborasi",
        description: permissions.canViewOperationalTickets
          ? "Komentar dan lampiran tetap tersedia untuk memperkaya konteks penanganan tiket."
          : "Komentar publik dan lampiran bisa dipakai untuk menambahkan konteks baru yang relevan.",
        canAct: true,
      },
    ],
    [permissions.canAssignTickets, permissions.canUpdateTicketStatus, session?.subject, ticket?.assigneeId, ticket?.assigneeName],
  );

  const publicComments = useMemo(
    () => ticket?.comments.filter((comment) => comment.visibility !== "internal") ?? [],
    [ticket?.comments],
  );

  const internalComments = useMemo(
    () => ticket?.comments.filter((comment) => comment.visibility === "internal") ?? [],
    [ticket?.comments],
  );

  const activeWorkloadTickets = useMemo(
    () => workloadTickets.filter((workloadTicket) => workloadTicket.status !== "resolved"),
    [workloadTickets],
  );

  const currentAssigneeLoad = useMemo(
    () => activeWorkloadTickets.filter((workloadTicket) => workloadTicket.assigneeId === ticket?.assigneeId).length,
    [activeWorkloadTickets, ticket?.assigneeId],
  );

  const selectedAssigneeLoad = useMemo(
    () => activeWorkloadTickets.filter((workloadTicket) => workloadTicket.assigneeId === selectedAssigneeId).length,
    [activeWorkloadTickets, selectedAssigneeId],
  );

  const teamActiveLoad = useMemo(
    () => activeWorkloadTickets.filter((workloadTicket) => workloadTicket.team === ticket?.team).length,
    [activeWorkloadTickets, ticket?.team],
  );
  const slaState = useMemo(() => (ticket ? getSlaState(ticket) : "normal"), [ticket]);
  const slaDueAt = useMemo(() => (ticket ? getTicketDueAt(ticket) : null), [ticket]);
  const assistSuggestion = useMemo(
    () =>
      ticket
        ? getTicketAssistSuggestion({
            title: ticket.title,
            description: ticket.description,
          })
        : null,
    [ticket],
  );
  const relatedTicketHints = useMemo(
    () =>
      ticket
        ? findRelatedTickets(
            {
              id: ticket.id,
              title: ticket.title,
              description: ticket.description,
              category: ticket.category,
              team: ticket.team,
            },
            workloadTickets,
            3,
          )
        : [],
    [ticket, workloadTickets],
  );
  const summaryAssist = useMemo(() => (ticket ? buildTicketSummaryAssist(ticket, activities) : null), [activities, ticket]);
  const operatorDraftAssist = useMemo(
    () => (ticket ? buildOperatorDraftAssist(ticket, activities, relatedTicketHints) : null),
    [activities, relatedTicketHints, ticket],
  );
  const operatorMacrosForTicket = useMemo(() => (ticket ? operatorMacros.map((macro) => ({ ...macro, message: macro.buildMessage(ticket) })) : []), [ticket]);
  const automationSignals = useMemo(
    () => (ticket ? buildTicketAutomationSignals(ticket, activities, workloadTickets) : []),
    [activities, ticket, workloadTickets],
  );
  const incidentCluster = useMemo(() => (ticket ? detectIncidentCluster(ticket, workloadTickets) : null), [ticket, workloadTickets]);
  const quickActionPresets = useMemo(
    () => (ticket ? buildOperatorQuickActionPresets(ticket, workloadTickets) : []),
    [ticket, workloadTickets],
  );
  const isReporterPortal = !permissions.canViewOperationalTickets;
  const reporterGuidance = useMemo(() => (ticket ? buildReporterTicketGuidance(ticket, activities) : null), [activities, ticket]);
  const reporterProgressSteps = useMemo(() => (ticket ? getReporterProgressSteps(ticket.status) : []), [ticket]);
  const reporterHelpMatches = useMemo(
    () =>
      ticket
        ? findHelpArticleMatches({
            title: ticket.title,
            description: ticket.description,
            category: ticket.category,
            limit: 2,
          })
        : [],
    [ticket],
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

  function applyMacroDraft(macroId: string) {
    if (!ticket) {
      return;
    }

    const macro = getOperatorMacroById(macroId);
    if (!macro) {
      return;
    }

    setCommentForm((current) => ({
      ...current,
      visibility: macro.visibility,
      message: macro.buildMessage(ticket),
    }));
    setQuickActionMessage(`Macro "${macro.title}" siap ditinjau pada editor komentar.`);
    setQuickActionError(null);
  }

  async function handleRunQuickAction(actionId: string) {
    if (!ticket || !currentIdentity) {
      return;
    }

    const action = quickActionPresets.find((preset) => preset.id === actionId);
    if (!action) {
      return;
    }

    const macro = getOperatorMacroById(action.macroId);
    const macroMessage = macro ? macro.buildMessage(ticket) : "";

    setIsRunningQuickActionId(action.id);
    setQuickActionMessage(null);
    setQuickActionError(null);

    try {
      if (action.kind === "draft-macro") {
        applyMacroDraft(action.macroId ?? "");
        return;
      }

      if (action.kind === "request-info" && macro) {
        await addComment(ticket.id, {
          authorName: currentIdentity.displayName,
          visibility: "public",
          message: macroMessage,
        });
        setQuickActionMessage("Permintaan informasi tambahan berhasil dikirim.");
      }

      if (action.kind === "mark-follow-up" && macro) {
        if (ticket.status === "open") {
          await updateTicketStatus(ticket.id, "in_progress");
          setSelectedStatus("in_progress");
        }

        await addComment(ticket.id, {
          authorName: currentIdentity.displayName,
          visibility: "internal",
          message: macroMessage,
        });
        setQuickActionMessage("Catatan follow-up internal berhasil ditambahkan.");
      }

      if (action.kind === "take-ownership") {
        const assignedTicket = await assignTicket(ticket.id, {});
        setTicket(assignedTicket);
        setSelectedAssigneeId(assignedTicket.assigneeId ?? session?.subject ?? "");

        if (assignedTicket.status === "open") {
          await updateTicketStatus(ticket.id, "in_progress");
          setSelectedStatus("in_progress");
        }

        if (macro) {
          await addComment(ticket.id, {
            authorName: currentIdentity.displayName,
            visibility: "public",
            message: macro.buildMessage(assignedTicket),
          });
        }

        setQuickActionMessage("Tiket berhasil diambil ke antrean Anda dan balasan awal sudah dikirim.");
      }

      if (action.kind === "resolve-with-note" && macro) {
        await updateTicketStatus(ticket.id, "resolved");
        setSelectedStatus("resolved");
        await addComment(ticket.id, {
          authorName: currentIdentity.displayName,
          visibility: "public",
          message: macroMessage,
        });
        setQuickActionMessage("Tiket ditandai selesai dan balasan penutupan berhasil dikirim.");
      }

      await loadTicket({ preserveView: true });
      await loadWorkloadSnapshot();
      showToast({
        title: "Aksi cepat berhasil dijalankan",
        description: action.description,
        tone: "success",
      });
    } catch (error) {
      const message = getErrorMessage(error, "Aksi cepat belum berhasil dijalankan.");
      setQuickActionError(message);
      showToast({
        title: "Aksi cepat belum berhasil",
        description: message,
        tone: "error",
      });
    } finally {
      setIsRunningQuickActionId(null);
    }
  }

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
      await loadWorkloadSnapshot();
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
    const normalizedCommentMessage = commentForm.message.trim();

    if (!normalizedCommentMessage) {
      const message = "Isi komentar wajib diisi sebelum dikirim.";
      setCommentMessage(null);
      setCommentError(message);
      setCommentErrorReferenceId(null);
      showToast({
        title: "Komentar belum lengkap",
        description: message,
        tone: "error",
      });
      return;
    }

    setIsSavingComment(true);
    setCommentMessage(null);
    setCommentError(null);
    setCommentErrorReferenceId(null);

    try {
      await addComment(ticketId, {
        ...commentForm,
        message: normalizedCommentMessage,
      });
      setCommentForm({
        message: "",
        authorName: currentIdentity?.displayName ?? "",
        visibility: "public",
      });
      await loadTicket({ preserveView: true });
      setCommentMessage(
        commentForm.visibility === "internal"
          ? "Catatan internal berhasil ditambahkan ke tiket."
          : "Komentar baru berhasil ditambahkan ke tiket.",
      );
      showToast({
        title: commentForm.visibility === "internal" ? "Catatan internal berhasil ditambahkan" : "Komentar berhasil ditambahkan",
        description:
          commentForm.visibility === "internal"
            ? "Catatan internal terbaru sudah masuk ke riwayat tiket operasional."
            : "Catatan terbaru sudah masuk ke riwayat tiket.",
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
      await loadWorkloadSnapshot();
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
            <span className={`priority-pill priority-pill--${ticket.priority}`}>{getPriorityLabel(ticket.priority)}</span>
            <span className="table-tag">{getTicketCategoryLabel(ticket.category)}</span>
            <span className="table-tag table-tag--muted">{getTicketTeamLabel(ticket.team)}</span>
            <span className={`sla-pill sla-pill--${slaState}`}>{getSlaToneLabel(slaState)}</span>
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
            <span>Kategori & area</span>
            <strong>{getTicketCategoryLabel(ticket.category)}</strong>
            <p>{getTicketTeamLabel(ticket.team)}</p>
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
                <p className="section-eyebrow">{isReporterPortal ? "Ringkasan tiket" : "Metadata"}</p>
                <h3>{isReporterPortal ? "Informasi yang terlihat oleh pelapor" : "Informasi tiket"}</h3>
              </div>
              <p className="filter-summary">
                {isReporterPortal ? "Ringkasan inti untuk memahami progres dan konteks tiket Anda" : "Ringkasan inti untuk verifikasi operasional"}
              </p>
            </div>

            <dl className="meta-grid meta-grid--detail">
              <div>
                <dt>Status</dt>
                <dd>{formatStatusLabel(ticket.status)}</dd>
              </div>
              <div>
                <dt>Prioritas</dt>
                <dd>{getPriorityLabel(ticket.priority)}</dd>
              </div>
              <div>
                <dt>Kategori</dt>
                <dd>{getTicketCategoryLabel(ticket.category)}</dd>
              </div>
              <div>
                <dt>Area tujuan</dt>
                <dd>{getTicketTeamLabel(ticket.team)}</dd>
              </div>
              <div>
                <dt>Target operasional</dt>
                <dd>{formatSlaTarget(ticket)}</dd>
              </div>
              <div>
                <dt>Batas target</dt>
                <dd>{slaDueAt ? formatDateTime(slaDueAt.toISOString()) : "Belum tersedia"}</dd>
              </div>
              <div>
                <dt>Status target</dt>
                <dd>{formatSlaDueLabel(ticket)}</dd>
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
              {permissions.canViewOperationalTickets ? (
                <div>
                  <dt>ID petugas</dt>
                  <dd>{ticket.assigneeId || "Belum ditugaskan"}</dd>
                </div>
              ) : null}
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
              <h3>Komunikasi tiket</h3>
              <p className="form-hint">
                {permissions.canViewOperationalTickets
                  ? "Komentar publik dapat dilihat pelapor, sedangkan catatan internal hanya untuk petugas dan admin."
                  : "Baca pembaruan publik dari tim atau tambahkan informasi baru bila ada konteks tambahan yang penting."}
              </p>
            </div>

            {ticket.comments.length === 0 ? <EmptyState title="Belum ada komentar" description="Tambahkan komentar pertama untuk mencatat progres penanganan." /> : null}

            <div className="stack-md">
              <div className="comment-section-heading">
                <div>
                  <h4>Komentar publik</h4>
                  <p>Terlihat oleh pelapor dan tim operasional.</p>
                </div>
                <span className="table-tag">{publicComments.length} entri</span>
              </div>
              {publicComments.length === 0 ? (
                <EmptyState title="Belum ada komentar publik" description="Gunakan komentar publik untuk menyampaikan progres yang perlu dilihat pelapor." />
              ) : (
                <div className="stack-md">
                  {publicComments.map((comment) => (
                    <CommentCard comment={comment} key={comment.id} />
                  ))}
                </div>
              )}
            </div>

            {permissions.canViewOperationalTickets ? (
              <div className="stack-md">
                <div className="comment-section-heading">
                  <div>
                    <h4>Catatan internal</h4>
                    <p>Hanya terlihat oleh petugas dan admin untuk koordinasi penanganan.</p>
                  </div>
                  <span className="table-tag table-tag--muted">{internalComments.length} entri</span>
                </div>
                {internalComments.length === 0 ? (
                  <EmptyState title="Belum ada catatan internal" description="Gunakan catatan internal untuk konteks investigasi yang tidak perlu tampil ke pelapor." />
                ) : (
                  <div className="stack-md">
                    {internalComments.map((comment) => (
                      <CommentCard comment={comment} key={comment.id} tone="internal" />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
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
          {!isReporterPortal && automationSignals.length > 0 ? (
            <article className="panel panel--section stack-md">
              <div>
                <p className="section-eyebrow">Sinyal automasi ringan</p>
                <h3>Trigger dan perhatian operator</h3>
                <p className="form-hint">Sinyal ini memakai aturan ringan dari status, prioritas, penugasan, SLA, dan pola tiket yang sudah ada.</p>
              </div>
              <div className="automation-signal-list">
                {automationSignals.map((signal) => (
                  <article className={`automation-signal automation-signal--${signal.tone}`} key={signal.id}>
                    <strong>{signal.title}</strong>
                    <p>{signal.description}</p>
                  </article>
                ))}
              </div>
            </article>
          ) : null}

          {isReporterPortal && reporterGuidance ? (
            <article className="panel panel--section stack-md">
              <div>
                <p className="section-eyebrow">Portal pelapor</p>
                <h3>Progres dan langkah berikutnya</h3>
                <p className="form-hint">Diringkas dari status, komentar publik, dan aktivitas tiket yang sudah tersimpan.</p>
              </div>

              <div className="reporter-guidance-card">
                <span className={`reporter-guidance-card__status reporter-guidance-card__status--${reporterGuidance.statusLabel}`}>
                  {reporterGuidance.statusLabel === "baru"
                    ? "Menunggu triase"
                    : reporterGuidance.statusLabel === "berjalan"
                      ? "Sedang diproses"
                      : "Sudah selesai"}
                </span>
                <strong>{reporterGuidance.headline}</strong>
                <p>{reporterGuidance.expectation}</p>
                <small>{reporterGuidance.lastUpdate}</small>
              </div>

              <div className="reporter-progress">
                {reporterProgressSteps.map((step) => (
                  <article
                    className={`reporter-progress__step ${step.isComplete ? "reporter-progress__step--complete" : ""} ${step.isCurrent ? "reporter-progress__step--current" : ""}`}
                    key={step.key}
                  >
                    <span>{step.label}</span>
                  </article>
                ))}
              </div>

              <article className="smart-assist-card smart-assist-card--subtle">
                <div className="smart-assist-card__header">
                  <div>
                    <span>Langkah berikutnya</span>
                    <strong>Apa yang sebaiknya dilakukan pelapor</strong>
                  </div>
                </div>
                <p>{reporterGuidance.nextStep}</p>
              </article>
            </article>
          ) : null}

          <article className="panel panel--section stack-md">
            <div>
              <p className="section-eyebrow">{isReporterPortal ? "Pembaruan ringkas" : "Smart assist"}</p>
              <h3>{isReporterPortal ? "Ringkasan yang membantu dibaca cepat" : "Ringkasan dan sinyal cepat"}</h3>
              <p className="form-hint">
                {isReporterPortal
                  ? "Ringkasan ini membantu pelapor memahami tiket tanpa harus membaca seluruh riwayat sekaligus."
                  : "Asistensi ini disusun dari data tiket yang sudah ada, bukan jawaban AI generatif penuh."}
              </p>
            </div>
            {summaryAssist ? (
              <div className="smart-assist-card smart-assist-card--subtle">
                <div className="smart-assist-card__header">
                  <div>
                    <span>Ringkasan otomatis</span>
                    <strong>{summaryAssist.headline}</strong>
                  </div>
                  <small>{summaryAssist.support}</small>
                </div>
                <div className="smart-summary-list">
                  {summaryAssist.bullets.map((bullet) => (
                    <article className="smart-summary-item" key={bullet}>
                      <AppIcon name="dashboard" size="sm" />
                      <p>{bullet}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {!isReporterPortal && assistSuggestion ? (
              <div className="smart-assist-card">
                <div className="smart-assist-card__header">
                  <div>
                    <span>Saran klasifikasi</span>
                    <strong>Pola yang terbaca dari isi tiket</strong>
                  </div>
                  <small>Dipakai sebagai petunjuk review, bukan perubahan otomatis.</small>
                </div>
                <div className="smart-assist-grid">
                  <div className="smart-assist-item">
                    <span>Kategori saat ini</span>
                    <strong>{getTicketCategoryLabel(ticket.category)}</strong>
                    <p>
                      Saran sistem: {getTicketCategoryLabel(assistSuggestion.category.value)}. {assistSuggestion.category.reason}
                    </p>
                  </div>
                  <div className="smart-assist-item">
                    <span>Prioritas saat ini</span>
                    <strong>{getPriorityLabel(ticket.priority)}</strong>
                    <p>
                      Saran sistem: {getPriorityLabel(assistSuggestion.priority.value)}. {assistSuggestion.priority.reason}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

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

          {!isReporterPortal && incidentCluster ? (
            <article className="panel panel--section stack-md">
              <div>
                <p className="section-eyebrow">Kelompok gangguan</p>
                <h3>Indikasi parent issue ringan</h3>
                <p className="form-hint">OpsDesk belum memakai incident command center penuh. Panel ini hanya membantu operator menyatukan konteks serupa.</p>
              </div>
              <article className="incident-cluster-card">
                <div>
                  <span>Tiket jangkar ringan</span>
                  <strong>{incidentCluster.anchorTicket.id}</strong>
                  <p>{incidentCluster.summary}</p>
                </div>
                <Link className="button button--secondary" to={`/tickets/${incidentCluster.anchorTicket.id}`}>
                  <AppIcon name="open" size="sm" />
                  Buka Tiket Jangkar
                </Link>
              </article>
              <div className="smart-related-list">
                {incidentCluster.relatedTickets.map((relatedTicket) => (
                  <Link className="smart-related-item" key={relatedTicket.id} to={`/tickets/${relatedTicket.id}`}>
                    <div>
                      <strong>{relatedTicket.title}</strong>
                      <p>
                        {relatedTicket.id} · {getTicketCategoryLabel(relatedTicket.category)} · {getTicketTeamLabel(relatedTicket.team)}
                      </p>
                    </div>
                    <div className="smart-related-item__meta">
                      <StatusBadge status={relatedTicket.status} />
                    </div>
                  </Link>
                ))}
              </div>
            </article>
          ) : null}

          <article className="panel panel--section stack-md">
            <div>
              <p className="section-eyebrow">{isReporterPortal ? "Ekspektasi waktu" : "SLA ringan"}</p>
              <h3>{isReporterPortal ? "Target tindak lanjut tiket" : "Target operasional tiket"}</h3>
              <p className="form-hint">
                {isReporterPortal
                  ? "Ini adalah target operasional ringan berbasis prioritas. Gunakan sebagai gambaran umum, bukan janji SLA kompleks."
                  : "Timer ini adalah target operasional berbasis prioritas, bukan SLA bisnis kompleks berbasis jam kerja."}
              </p>
            </div>
            <div className="sla-card">
              <div className="sla-card__header">
                <span className={`sla-pill sla-pill--${slaState}`}>{getSlaToneLabel(slaState)}</span>
                <strong>{formatSlaTarget(ticket)}</strong>
              </div>
              <p>{formatSlaDueLabel(ticket)}</p>
              <small>{slaDueAt ? `Target hingga ${formatDateTime(slaDueAt.toISOString())}` : "Target belum tersedia."}</small>
            </div>
          </article>

          {isReporterPortal && reporterHelpMatches.length > 0 ? (
            <article className="panel panel--section stack-md">
              <div>
                <p className="section-eyebrow">Panduan terkait</p>
                <h3>Bantuan mandiri yang relevan</h3>
                <p className="form-hint">Panduan ini bisa membantu Anda menambah konteks atau mengecek langkah dasar lebih dulu.</p>
              </div>
              <div className="help-inline-list">
                {reporterHelpMatches.map((match) => (
                  <article className="help-inline-card" key={match.article.id}>
                    <div>
                      <strong>{match.article.title}</strong>
                      <p>{match.article.summary}</p>
                      <small>{match.reason}</small>
                    </div>
                    <ul className="help-inline-card__steps">
                      {match.article.steps.slice(0, 2).map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
              <Link className="button button--secondary" to="/help">
                <AppIcon name="help" size="sm" />
                Buka Pusat Bantuan
              </Link>
            </article>
          ) : null}

          {relatedTicketHints.length > 0 ? (
            <article className="panel panel--section stack-md">
              <div>
                <p className="section-eyebrow">Tiket terkait</p>
                <h3>Hint tiket yang mirip</h3>
                <p className="form-hint">Gunakan ini untuk cek konteks serupa atau potensi duplikasi sebelum memberi tindak lanjut.</p>
              </div>
              <div className="smart-related-list">
                {relatedTicketHints.map((hint) => (
                  <Link className="smart-related-item" key={hint.ticket.id} to={`/tickets/${hint.ticket.id}`}>
                    <div>
                      <strong>{hint.ticket.title}</strong>
                      <p>
                        {hint.ticket.id} · {getTicketCategoryLabel(hint.ticket.category)} · {getTicketTeamLabel(hint.ticket.team)}
                      </p>
                      <small>{hint.reason}</small>
                    </div>
                    <div className="smart-related-item__meta">
                      <StatusBadge status={hint.ticket.status} />
                      <span className="table-tag table-tag--muted">{Math.round(hint.score * 100)}% mirip</span>
                    </div>
                  </Link>
                ))}
              </div>
            </article>
          ) : null}

          <article className="panel panel--section">
            <p className="section-eyebrow">Routing & penugasan</p>
            <h3>Tanggung jawab operasional</h3>
            {permissions.canAssignTickets ? (
              <div className="stack-md">
                <div className="assignment-card">
                  <div className="assignment-card__current">
                    <div>
                      <span className="field-label">Penanggung jawab saat ini</span>
                      <strong>{ticket.assigneeName || "Belum ditugaskan"}</strong>
                      <p>{ticket.assigneeId === session?.subject ? "Tiket ini sedang berada dalam antrean kerja Anda." : ticket.assigneeName ? "Petugas yang dipilih saat ini bertanggung jawab atas tindak lanjut tiket." : "Tiket sudah masuk ke area tujuan dan menunggu triase atau pengambilan oleh petugas."}</p>
                      {ticket.assigneeId ? <small>{ticket.assigneeId}</small> : null}
                    </div>
                    <UserAvatar
                      avatarUrl={assignableUsers.find((user) => user.subject === ticket.assigneeId)?.avatarUrl}
                      name={ticket.assigneeName || "Belum ditugaskan"}
                      size="sm"
                    />
                  </div>

                  <label className="field" htmlFor="ticket-assignee-select">
                    <span>Pilih penanggung jawab</span>
                    <SelectControl
                      ariaLabel="Pilih penanggung jawab"
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
                <div className="workload-strip">
                  <article className="workload-strip__item">
                    <span>Area tujuan</span>
                    <strong>{getTicketTeamLabel(ticket.team)}</strong>
                    <p>
                      {isLoadingWorkload ? "Memuat beban area..." : `${teamActiveLoad} tiket aktif saat ini di area ini.`}
                    </p>
                  </article>
                  <article className="workload-strip__item">
                    <span>Petugas saat ini</span>
                    <strong>{ticket.assigneeName || "Belum ditugaskan"}</strong>
                    <p>
                      {ticket.assigneeId
                        ? `${currentAssigneeLoad} tiket aktif saat ini pada antrean petugas ini.`
                        : "Belum ada antrean personal karena tiket belum ditugaskan."}
                    </p>
                  </article>
                  <article className="workload-strip__item">
                    <span>Pilihan penugasan</span>
                    <strong>
                      {assigneeOptions.find((option) => option.value === selectedAssigneeId)?.label || "Belum dipilih"}
                    </strong>
                    <p>
                      {selectedAssigneeId
                        ? `${selectedAssigneeLoad} tiket aktif pada antrean petugas terpilih.`
                        : "Pilih petugas untuk melihat gambaran beban kerjanya."}
                    </p>
                  </article>
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
                      ? "Ambil ke Antrean Saya"
                      : "Simpan Penanggung Jawab"}
                </button>
              </div>
            ) : (
              <p className="form-hint">Penugasan tiket hanya dapat dilakukan oleh petugas atau admin.</p>
            )}
          </article>

          {!isReporterPortal ? (
            <article className="panel panel--section stack-md">
              <div>
                <p className="section-eyebrow">Macro operator</p>
                <h3>Respons cepat yang bisa dipakai ulang</h3>
                <p className="form-hint">Gunakan template ini untuk komentar publik atau catatan internal tanpa menulis dari nol.</p>
              </div>
              <div className="macro-grid">
                {operatorMacrosForTicket.map((macro) => (
                  <article className={`macro-card macro-card--${macro.visibility}`} key={macro.id}>
                    <div className="macro-card__header">
                      <div>
                        <span>{macro.visibility === "internal" ? "Internal" : "Publik"}</span>
                        <strong>{macro.title}</strong>
                      </div>
                      <span className={`table-tag ${macro.visibility === "internal" ? "table-tag--muted" : ""}`}>{macro.visibility === "internal" ? "Catatan" : "Balasan"}</span>
                    </div>
                    <p>{macro.summary}</p>
                    <small>{macro.message}</small>
                    <button className="button button--ghost" onClick={() => applyMacroDraft(macro.id)} type="button">
                      Gunakan macro ini
                    </button>
                  </article>
                ))}
              </div>
            </article>
          ) : null}

          {!isReporterPortal ? (
            <article className="panel panel--section stack-md">
              <div>
                <p className="section-eyebrow">Aksi operator</p>
                <h3>Quick actions untuk pekerjaan repetitif</h3>
                <p className="form-hint">Aksi ini menjalankan langkah ringan yang tetap bisa dijelaskan dan ditinjau dari riwayat tiket.</p>
              </div>
              <div className="quick-action-grid">
                {quickActionPresets.map((action) => (
                  <article className="quick-action-card" key={action.id}>
                    <div>
                      <strong>{action.title}</strong>
                      <p>{action.description}</p>
                    </div>
                    <button
                      aria-label={`Jalankan ${action.title}`}
                      aria-busy={isRunningQuickActionId === action.id}
                      className="button button--secondary"
                      disabled={isRunningQuickActionId !== null}
                      onClick={() => void handleRunQuickAction(action.id)}
                      type="button"
                    >
                      {isRunningQuickActionId === action.id ? "Menjalankan..." : "Jalankan"}
                    </button>
                  </article>
                ))}
              </div>
              {quickActionError ? <p className="form-error">{quickActionError}</p> : null}
              {quickActionMessage ? <p className="form-success">{quickActionMessage}</p> : null}
            </article>
          ) : null}

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
            <p className="section-eyebrow">{isReporterPortal ? "Balas tiket" : "Tambah catatan"}</p>
            <h3>{isReporterPortal ? "Tambahkan informasi baru bila diperlukan" : "Tulis pembaruan tiket"}</h3>
            {permissions.canViewOperationalTickets && operatorDraftAssist ? (
              <div className="smart-assist-card smart-assist-card--subtle">
                <div className="smart-assist-card__header">
                  <div>
                    <span>Draf respon</span>
                    <strong>Mulai dari respons yang sudah dirapikan sistem</strong>
                  </div>
                  <small>{operatorDraftAssist.explanation}</small>
                </div>
                <div className="smart-assist-grid">
                  <div className="smart-assist-item">
                    <span>Draf komentar publik</span>
                    <p>{operatorDraftAssist.publicReply}</p>
                    <button
                      className="button button--ghost"
                      onClick={() =>
                        setCommentForm((current) => ({
                          ...current,
                          visibility: "public",
                          message: operatorDraftAssist.publicReply,
                        }))
                      }
                      type="button"
                    >
                      Gunakan sebagai draf publik
                    </button>
                  </div>
                  <div className="smart-assist-item">
                    <span>Draf catatan internal</span>
                    <p>{operatorDraftAssist.internalNote}</p>
                    <button
                      className="button button--ghost"
                      onClick={() =>
                        setCommentForm((current) => ({
                          ...current,
                          visibility: "internal",
                          message: operatorDraftAssist.internalNote,
                        }))
                      }
                      type="button"
                    >
                      Gunakan sebagai catatan internal
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            <form className="stack-md" onSubmit={handleCommentSubmit}>
              <label className="field">
                <span>Penulis komentar</span>
                <input readOnly value={commentForm.authorName} />
                <small>Nama penulis diambil dari identitas akun yang sedang masuk.</small>
              </label>
              {permissions.canViewOperationalTickets ? (
                <label className="field">
                  <span>Jenis catatan</span>
                  <SelectControl
                    ariaLabel="Jenis catatan"
                    onChange={(visibility) => setCommentForm((current) => ({ ...current, visibility }))}
                    options={commentVisibilityOptions}
                    value={commentForm.visibility}
                  />
                  <small>
                    {commentForm.visibility === "internal"
                      ? "Catatan ini hanya terlihat oleh petugas dan admin."
                      : "Komentar ini akan terlihat oleh pelapor dan tim operasional."}
                  </small>
                </label>
              ) : null}
              <label className="field">
                <span>Isi komentar</span>
                <textarea
                  value={commentForm.message}
                  onChange={(event) => setCommentForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder={
                    commentForm.visibility === "internal"
                      ? "Tuliskan catatan internal untuk koordinasi petugas."
                      : isReporterPortal
                        ? "Tuliskan informasi tambahan, dampak terbaru, atau konfirmasi hasil pengecekan Anda."
                        : "Tuliskan pembaruan penanganan yang relevan untuk pelapor."
                  }
                  rows={5}
                />
              </label>
              {currentIdentity ? (
                <p className="form-hint">
                  Dikirim sebagai {currentIdentity.displayName} ({getRoleLabel(currentIdentity.role)}) • {getCommentVisibilityLabel(commentForm.visibility)}
                </p>
              ) : null}
              {commentError ? <p className="form-error">{commentError}</p> : null}
              {commentErrorReferenceId ? <p className="form-hint">Kode referensi: {commentErrorReferenceId}</p> : null}
              {commentMessage ? <p className="form-success">{commentMessage}</p> : null}
              <button aria-busy={isSavingComment} className="button button--primary" disabled={isSavingComment} type="submit">
                {isSavingComment
                  ? commentForm.visibility === "internal"
                    ? "Menyimpan catatan internal..."
                    : "Mengirim komentar..."
                  : commentForm.visibility === "internal"
                    ? "Simpan Catatan Internal"
                    : "Tambah Komentar Publik"}
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

  if (activity.action === "comment_added") {
    return <p>{getCommentVisibilityLabel(activity.metadata.commentVisibility)}</p>;
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

function CommentCard({ comment, tone = "public" }: { comment: Comment; tone?: "public" | "internal" }) {
  return (
    <article className={`comment-card comment-card--rich ${tone === "internal" ? "comment-card--internal" : ""}`}>
      <div className="comment-card__header">
        <strong>{comment.authorName}</strong>
        <span>{formatDateTime(comment.createdAt)}</span>
      </div>
      <div className="meta-inline">
        <span>{getCommentVisibilityLabel(comment.visibility)}</span>
        {comment.authorRole ? <span>{getRoleLabel(comment.authorRole)}</span> : null}
      </div>
      <p>{comment.message}</p>
    </article>
  );
}
