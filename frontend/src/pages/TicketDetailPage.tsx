import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { addComment, assignTicket, getTicket, updateTicketStatus } from "../api/tickets";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { StatusBadge } from "../components/tickets/StatusBadge";
import { useAuth } from "../modules/auth/AuthContext";
import type { Ticket, TicketStatus } from "../types/ticket";
import { formatDateTime } from "../utils/date";

export function TicketDetailPage() {
  const { session, permissions } = useAuth();
  const { ticketId = "" } = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [commentMessage, setCommentMessage] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>("open");
  const [commentForm, setCommentForm] = useState({
    message: "",
    authorName: session?.displayName ?? "",
  });
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  async function loadTicket(options?: { preserveView?: boolean }) {
    if (!options?.preserveView) {
      setLoading(true);
    }

    setPageError(null);

    try {
      const data = await getTicket(ticketId);
      setTicket(data);
      setSelectedStatus(data.status);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Detail tiket belum bisa dimuat.");
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

    try {
      const updatedTicket = await updateTicketStatus(ticketId, selectedStatus);
      setTicket(updatedTicket);
      setStatusMessage("Status tiket berhasil diperbarui.");
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Status belum berhasil diperbarui.");
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingComment(true);
    setCommentMessage(null);
    setCommentError(null);

    try {
      await addComment(ticketId, commentForm);
      setCommentForm({ message: "", authorName: session?.displayName ?? "" });
      await loadTicket({ preserveView: true });
      setCommentMessage("Komentar baru berhasil ditambahkan ke tiket.");
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : "Komentar belum berhasil ditambahkan.");
    } finally {
      setIsSavingComment(false);
    }
  }

  async function handleAssignToMe() {
    setIsSavingAssignment(true);
    setAssignmentMessage(null);
    setAssignmentError(null);

    try {
      const updatedTicket = await assignTicket(ticketId);
      setTicket(updatedTicket);
      setAssignmentMessage("Tiket berhasil ditugaskan kepada Anda.");
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : "Penugasan tiket belum berhasil.");
    } finally {
      setIsSavingAssignment(false);
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
            {commentMessage ? <p className="form-success">{commentMessage}</p> : null}

            <button className="button button--primary" disabled={isSavingComment} type="submit">
              {isSavingComment ? "Mengirim komentar..." : "Tambah Komentar"}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
