import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { addComment, getTicket, updateTicketStatus } from "../api/tickets";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { StatusBadge } from "../components/tickets/StatusBadge";
import type { Ticket, TicketStatus } from "../types/ticket";
import { formatDateTime } from "../utils/date";

export function TicketDetailPage() {
  const { ticketId = "" } = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>("open");
  const [commentForm, setCommentForm] = useState({ message: "", authorName: "" });
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingComment, setIsSavingComment] = useState(false);

  async function loadTicket() {
    setLoading(true);
    setError(null);

    try {
      const data = await getTicket(ticketId);
      setTicket(data);
      setSelectedStatus(data.status);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Detail tiket belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTicket();
  }, [ticketId]);

  async function handleStatusSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingStatus(true);

    try {
      const updatedTicket = await updateTicketStatus(ticketId, selectedStatus);
      setTicket(updatedTicket);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Status belum berhasil diperbarui.");
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingComment(true);

    try {
      await addComment(ticketId, commentForm);
      setCommentForm({ message: "", authorName: "" });
      await loadTicket();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Komentar belum berhasil ditambahkan.");
    } finally {
      setIsSavingComment(false);
    }
  }

  if (loading) {
    return <LoadingState label="Memuat detail tiket..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void loadTicket()} />;
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
              <dt>Diperbarui</dt>
              <dd>{formatDateTime(ticket.updatedAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <p className="section-eyebrow">Tindak lanjut</p>
          <h3>Perbarui status</h3>
          <form className="stack-md" onSubmit={handleStatusSubmit}>
            <label className="field">
              <span>Status tiket</span>
              <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as TicketStatus)}>
                <option value="open">Terbuka</option>
                <option value="in_progress">Sedang Ditangani</option>
                <option value="resolved">Selesai</option>
              </select>
            </label>

            <button className="button button--primary" disabled={isSavingStatus} type="submit">
              {isSavingStatus ? "Menyimpan..." : "Perbarui Status"}
            </button>
          </form>
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
                placeholder="Nama operator"
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

            <button className="button button--primary" disabled={isSavingComment} type="submit">
              {isSavingComment ? "Mengirim..." : "Tambah Komentar"}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
