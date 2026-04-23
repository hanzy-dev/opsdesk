import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppIcon, AppIconBadge } from "../components/common/AppIcon";
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
              langkah awal, memahami status tiket, dan menyiapkan laporan yang lebih jelas.
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

      <div className="help-center-layout">
        <section className="panel panel--section stack-md">
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
            <div className="help-article-list">
              {articleMatches.map((match) => (
                <article className="help-article-card" key={match.article.id}>
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

        <aside className="stack-lg">
          <section className="panel panel--section stack-md">
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
                  <p>Detail tiket menjelaskan apa yang sedang terjadi dan kapan Anda perlu menambah informasi.</p>
                </div>
                <span className="action-state action-state--allowed">Aktif</span>
              </article>
            </div>
          </section>

          <section className="panel panel--section stack-md">
            <div>
              <p className="section-eyebrow">Topik populer</p>
              <h3>Mulai dari panduan yang paling sering dicari</h3>
            </div>
            <div className="dashboard-actions-grid">
              {helpArticles.slice(0, 3).map((article) => (
                <article className="dashboard-action-card" key={article.id}>
                  <div className="dashboard-action-card__header">
                    <AppIconBadge name="help" size="sm" tone="accent" />
                    <strong>{article.title}</strong>
                  </div>
                  <p>{article.summary}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
