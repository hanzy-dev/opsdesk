import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppIcon } from "../components/common/AppIcon";
import { EmptyState } from "../components/common/EmptyState";
import { helpArticles } from "../content/helpArticles";
import { useAuth } from "../modules/auth/AuthContext";
import { findHelpArticleMatches } from "../utils/selfService";
import { getTicketCategoryLabel, getTicketTeamLabel, getPriorityLabel } from "../utils/ticketMetadata";

const categoryLabels = [
  { value: "all", label: "Semua topik" },
  { value: "general", label: "Umum" },
  { value: "account_access", label: "Akses akun" },
  { value: "network", label: "Jaringan" },
  { value: "hardware", label: "Perangkat" },
  { value: "application_bug", label: "Bug aplikasi" },
  { value: "service_request", label: "Permintaan layanan" },
] as const;

const valueSignals = [
  {
    title: "Audit trail yang tetap utuh",
    description: "Pembaruan, komentar, dan lampiran tidak tercecer di chat yang berbeda-beda.",
  },
  {
    title: "Status dan ownership jelas",
    description: "Pelapor bisa melihat progres, sedangkan tim operasional tetap punya penanggung jawab yang tegas.",
  },
  {
    title: "Bantuan mandiri sebelum eskalasi",
    description: "Panduan lokal membantu Anda mengecek langkah dasar sebelum membuat tiket baru.",
  },
];

const reporterFlow = [
  "Cari langkah awal atau FAQ yang relevan.",
  "Buat tiket bila masalah tetap perlu tindak lanjut.",
  "Pantau status, komentar publik, SLA target, dan lampiran dari portal yang sama.",
];

export function HelpCenterPage() {
  const { permissions } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<(typeof categoryLabels)[number]["value"]>("all");

  const articleMatches = useMemo(() => {
    if (!searchQuery.trim()) {
      return helpArticles
        .filter((article) => categoryFilter === "all" || article.category === categoryFilter)
        .map((article) => ({ article, score: 0, matchedTerms: [], reason: "Panduan dasar yang sering dipakai reporter." }));
    }

    return findHelpArticleMatches({
      query: searchQuery,
      limit: helpArticles.length,
    }).filter((match) => categoryFilter === "all" || match.article.category === categoryFilter);
  }, [categoryFilter, searchQuery]);

  const highlightedArticle = articleMatches[0]?.article ?? helpArticles[0];

  return (
    <section className="stack-lg page-shell page-shell--wide page-flow help-center-page">
      <div className="hero-card hero-card--spotlight help-center-hero">
        <div className="help-center-hero__copy">
          <div>
            <p className="section-eyebrow">Self-service ringan</p>
            <h2>Cari panduan cepat sebelum membuat atau menindaklanjuti tiket</h2>
            <p>
              Pusat bantuan ini memakai konten lokal OpsDesk yang ringan dan jujur. Fokusnya membantu Anda menemukan
              langkah awal, memahami status tiket, menyiapkan laporan yang lebih jelas, dan tahu apa yang akan terjadi
              setelah tiket dibuat.
            </p>
          </div>
          <div className="dashboard-hero__actions">
            {permissions.canCreateTickets ? (
              <Link className="button button--primary" to="/tickets/new">
                <AppIcon name="plus" size="sm" />
                Buat Tiket Baru
              </Link>
            ) : null}
            <Link className="button button--secondary" to="/tickets/mine">
              <AppIcon name="mine" size="sm" />
              Lacak Tiket Saya
            </Link>
          </div>
        </div>
        <article className="help-center-highlight">
          <span>Paling relevan saat ini</span>
          <strong>{highlightedArticle.title}</strong>
          <p>{highlightedArticle.summary}</p>
          <small>{highlightedArticle.readTimeMinutes} menit baca</small>
        </article>
      </div>

      <section className="help-value-grid" aria-label="Nilai produk OpsDesk">
        {valueSignals.map((signal, index) => (
          <article className={`help-value-card motion-reveal ${index < 2 ? `motion-reveal--delay-${index + 1}` : ""}`} key={signal.title}>
            <span className="section-eyebrow">Kenapa OpsDesk</span>
            <strong>{signal.title}</strong>
            <p>{signal.description}</p>
          </article>
        ))}
      </section>

      <div className="help-center-layout help-center-layout--reading">
        <section className="help-reading-surface stack-md">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Temukan jawaban</p>
              <h3>Panduan dan FAQ singkat</h3>
            </div>
            <p className="filter-summary">{articleMatches.length} panduan tersedia</p>
          </div>

          <div className="filter-grid filter-grid--tickets">
            <label className="field field--search field--span-2">
              <span>Cari topik bantuan</span>
              <input
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Contoh: login, VPN, printer, timeout, status tiket"
                value={searchQuery}
              />
              <small>Pencarian ini ringan dan berbasis kata kunci dari artikel lokal OpsDesk.</small>
            </label>

            <label className="field">
              <span>Topik</span>
              <select onChange={(event) => setCategoryFilter(event.target.value as (typeof categoryLabels)[number]["value"])} value={categoryFilter}>
                {categoryLabels.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {articleMatches.length === 0 ? (
            <EmptyState
              eyebrow="Pusat Bantuan"
              title="Belum ada panduan yang cocok"
              description="Coba kata kunci lain, pilih topik berbeda, atau lanjutkan dengan membuat tiket jika masalahnya cukup spesifik."
            />
          ) : (
            <div className="help-article-list help-article-list--reading">
              {articleMatches.map((match, index) => (
                <article
                  className={`help-article-card help-article-card--reading motion-reveal ${
                    match.article.id === highlightedArticle.id ? "help-article-card--featured" : ""
                  } ${index < 2 ? `motion-reveal--delay-${index + 1}` : ""}`}
                  key={match.article.id}
                >
                  <div className="help-article-card__header">
                    <div>
                      <span className="section-eyebrow">{match.article.category === "general" ? "Umum" : getTicketCategoryLabel(match.article.category)}</span>
                      <h4>{match.article.title}</h4>
                    </div>
                    <span className="table-tag">{match.article.readTimeMinutes} menit</span>
                  </div>
                  <p>{match.article.summary}</p>
                  <div className="help-article-card__section">
                    <strong>Gejala umum</strong>
                    <ul className="help-article-card__list">
                      {match.article.symptoms.map((symptom) => (
                        <li key={symptom}>{symptom}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="help-article-card__section">
                    <strong>Langkah awal</strong>
                    <ol className="help-article-card__list help-article-card__list--ordered">
                      {match.article.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <div className="help-article-card__footer">
                    <div>
                      <strong>Kapan perlu buat tiket</strong>
                      <p>{match.article.whenToCreateTicket}</p>
                    </div>
                    {match.article.relatedCategory && match.article.relatedTeam ? (
                      <div className="meta-inline">
                        <span>{getTicketCategoryLabel(match.article.relatedCategory)}</span>
                        <span>{getTicketTeamLabel(match.article.relatedTeam)}</span>
                        {match.article.suggestedPriority ? <span>{getPriorityLabel(match.article.suggestedPriority)}</span> : null}
                      </div>
                    ) : null}
                    <small>{match.reason}</small>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="help-center-layout__rail stack-md">
          <section className="rail-section rail-section--emphasis">
            <div>
              <p className="section-eyebrow">Nilai produk</p>
              <h3>OpsDesk juga membantu Anda sebelum dan sesudah submit tiket</h3>
            </div>
            <div className="action-overview">
              <article className="action-overview__item">
                <div>
                  <strong>Cari panduan lebih dulu</strong>
                  <p>Gunakan artikel singkat untuk masalah umum seperti login, VPN, perangkat, dan status tiket.</p>
                </div>
                <span className="action-state action-state--allowed">Aktif</span>
              </article>
              <article className="action-overview__item">
                <div>
                  <strong>Lacak progres tiket</strong>
                  <p>Pantau status, komentar publik, lampiran, dan pembaruan terakhir dari satu portal yang sama.</p>
                </div>
                <span className="action-state action-state--allowed">Aktif</span>
              </article>
              <article className="action-overview__item">
                <div>
                  <strong>Pahami langkah berikutnya</strong>
                  <p>Detail tiket menjelaskan apa yang sedang terjadi, siapa yang menindaklanjuti, dan kapan Anda perlu menambah informasi.</p>
                </div>
                <span className="action-state action-state--allowed">Aktif</span>
              </article>
            </div>
          </section>

          <section className="rail-section">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Alur pelapor</p>
                <h3>Dari panduan ke tindak lanjut tanpa pindah kanal</h3>
              </div>
            </div>
            <div className="help-flow-list">
              {reporterFlow.map((item, index) => (
                <article className="help-flow-step motion-lift" key={item}>
                  <span>{index + 1}</span>
                  <p>{item}</p>
                </article>
              ))}
            </div>
            <p className="form-hint">
              Ini membuat penanganan lebih rapi daripada chat biasa karena progres, bukti, target SLA, dan konteks
              tetap berada pada tiket yang sama.
            </p>
          </section>

          <section className="rail-section">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Topik populer</p>
                <h3>Mulai dari panduan yang paling sering dicari</h3>
              </div>
            </div>
            <div className="compact-link-list">
              {helpArticles.slice(0, 3).map((article) => (
                <article className="compact-link-list__item motion-lift" key={article.id}>
                  <strong>{article.title}</strong>
                  <p>{article.summary}</p>
                  <small>{article.readTimeMinutes} menit baca</small>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
