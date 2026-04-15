import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { createTicket } from "../api/tickets";
import type { CreateTicketInput } from "../types/ticket";

const initialForm: CreateTicketInput = {
  title: "",
  description: "",
  priority: "medium",
  reporterName: "",
  reporterEmail: "",
};

export function CreateTicketPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSubmitNotice("Menyimpan tiket dan menyiapkan halaman detail...");
    setFieldErrors({});

    try {
      const ticket = await createTicket(form);
      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        setFieldErrors(Object.fromEntries((error.details ?? []).map((detail) => [detail.field, detail.message])));
      } else {
        setErrorMessage("Tiket belum berhasil dibuat. Silakan coba lagi.");
      }
      setSubmitNotice(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="stack-lg">
      <div className="hero-card">
        <p className="section-eyebrow">Input tiket</p>
        <h2>Buat tiket baru</h2>
        <p>Gunakan formulir ini untuk membuat tiket insiden atau permintaan bantuan baru.</p>
      </div>

      <form className="panel form-panel" onSubmit={handleSubmit}>
        <div className="form-intro">
          <p>
            Isi informasi inti tiket secara singkat dan jelas. Setelah tersimpan, Anda akan langsung diarahkan ke detail
            tiket untuk melanjutkan tindak lanjut.
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
            <input
              value={form.reporterName}
              onChange={(event) => setForm((current) => ({ ...current, reporterName: event.target.value }))}
              placeholder="Nama lengkap"
            />
            {fieldErrors.reporterName ? <small>{fieldErrors.reporterName}</small> : null}
          </label>

          <label className="field">
            <span>Email pelapor</span>
            <input
              value={form.reporterEmail}
              onChange={(event) => setForm((current) => ({ ...current, reporterEmail: event.target.value }))}
              placeholder="nama@kampus.ac.id"
              type="email"
            />
            {fieldErrors.reporterEmail ? <small>{fieldErrors.reporterEmail}</small> : null}
          </label>
        </div>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
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
