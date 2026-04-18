import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { createTicket } from "../api/tickets";
import { ErrorState } from "../components/common/ErrorState";
import { useAuth } from "../modules/auth/AuthContext";
import { getRoleLabel } from "../modules/auth/roles";
import type { CreateTicketInput } from "../types/ticket";
import { getErrorMessage, getErrorReferenceId } from "../utils/errors";

const initialForm: CreateTicketInput = {
  title: "",
  description: "",
  priority: "medium",
  reporterName: "",
  reporterEmail: "",
};

export function CreateTicketPage() {
  const { session, profile, permissions } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorReferenceId, setErrorReferenceId] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setErrorReferenceId(null);
    setSubmitNotice("Menyimpan tiket dan menyiapkan halaman detail...");
    setFieldErrors({});

    try {
      const payload: CreateTicketInput = {
        ...form,
        reporterName: effectiveIdentity?.displayName ?? "",
        reporterEmail: effectiveIdentity?.email ?? "",
      };

      const ticket = await createTicket(payload);
      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        setErrorReferenceId(error.requestId ?? null);
        setFieldErrors(Object.fromEntries((error.details ?? []).map((detail) => [detail.field, detail.message])));
      } else {
        setErrorMessage(getErrorMessage(error, "Tiket belum berhasil dibuat. Silakan coba lagi."));
        setErrorReferenceId(getErrorReferenceId(error) ?? null);
      }
      setSubmitNotice(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!permissions.canCreateTickets) {
    return (
      <ErrorState
        title="Aksi belum diizinkan"
        message="Akun petugas tidak dapat membuat tiket baru pada tahap ini."
      />
    );
  }

  return (
    <section className="stack-lg">
      <div className="hero-card">
        <p className="section-eyebrow">Input tiket</p>
        <h2>Buat tiket baru</h2>
        <p>Gunakan formulir ini untuk membuat tiket insiden atau permintaan bantuan baru tanpa mengisi ulang identitas akun.</p>
      </div>

      <article className="panel profile-summary profile-summary--compact">
        <div className="profile-summary__header">
          <div className="profile-summary__meta">
            <div>
              <span>Pelapor terautentikasi</span>
              <strong>{effectiveIdentity?.displayName ?? "Pengguna OpsDesk"}</strong>
            </div>
            <div>
              <span>Email akun</span>
              <strong>{effectiveIdentity?.email ?? "Email belum tersedia"}</strong>
            </div>
            <div>
              <span>ID akun</span>
              <strong className="profile-summary__subtle">{effectiveIdentity?.subject ?? "ID belum tersedia"}</strong>
            </div>
          </div>
          <span className="role-pill">{effectiveIdentity ? getRoleLabel(effectiveIdentity.role) : "Akun"}</span>
        </div>
      </article>

      <form className="panel form-panel" onSubmit={handleSubmit}>
        <div className="form-intro">
          <p>
            Isi informasi inti tiket secara singkat dan jelas. Identitas pelapor diambil dari sesi masuk yang aktif agar
            pencatatan tetap konsisten.
          </p>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Judul tiket</span>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Contoh: API timeout di layanan tiket"
            />
            {fieldErrors.title ? <small>{fieldErrors.title}</small> : null}
          </label>

          <label className="field">
            <span>Prioritas</span>
            <select
              value={form.priority}
              onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as CreateTicketInput["priority"] }))}
            >
              <option value="low">Rendah</option>
              <option value="medium">Sedang</option>
              <option value="high">Tinggi</option>
            </select>
            {fieldErrors.priority ? <small>{fieldErrors.priority}</small> : null}
          </label>

          <label className="field field--full">
            <span>Deskripsi</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Jelaskan gejala, dampak, dan konteks singkat."
              rows={6}
            />
            {fieldErrors.description ? <small>{fieldErrors.description}</small> : null}
          </label>

          <label className="field">
            <span>Nama pelapor</span>
            <input readOnly value={effectiveIdentity?.displayName ?? ""} />
            <small>Diambil langsung dari identitas akun yang sedang masuk.</small>
            {fieldErrors.reporterName ? <small>{fieldErrors.reporterName}</small> : null}
          </label>

          <label className="field">
            <span>Email pelapor</span>
            <input readOnly type="email" value={effectiveIdentity?.email ?? ""} />
            <small>Email ini akan digunakan pada metadata tiket.</small>
            {fieldErrors.reporterEmail ? <small>{fieldErrors.reporterEmail}</small> : null}
          </label>
        </div>

        {errorMessage ? (
          <div>
            <p className="form-error">{errorMessage}</p>
            {errorReferenceId ? <p className="form-hint">Kode referensi: {errorReferenceId}</p> : null}
          </div>
        ) : null}
        {submitNotice ? <p className="form-hint">{submitNotice}</p> : null}

        <div className="form-actions">
          <button className="button button--primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Menyimpan tiket..." : "Simpan Tiket"}
          </button>
        </div>
      </form>
    </section>
  );
}
