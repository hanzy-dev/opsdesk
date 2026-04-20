import { useState } from "react";
import { Link } from "react-router-dom";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import openApiSpecUrl from "../../../docs/openapi.yaml?url";
import { ErrorState } from "../components/common/ErrorState";
import { env } from "../config/env";

const cloudHighlights = [
  {
    title: "API Gateway + Lambda",
    description: "Seluruh endpoint HTTP berjalan melalui AWS API Gateway HTTP API dan backend Go pada AWS Lambda container image.",
  },
  {
    title: "Cognito + RBAC",
    description: "Endpoint privat memakai bearer token JWT Amazon Cognito dengan peran reporter, agent, dan admin.",
  },
  {
    title: "DynamoDB + S3",
    description: "Data tiket dan profil disimpan di DynamoDB, sedangkan lampiran memakai alur presigned URL ke bucket S3 privat.",
  },
];

const operationHighlights = [
  "GET untuk health check, identitas akun, profil, daftar tiket, detail tiket, aktivitas, dan URL unduhan lampiran",
  "POST untuk pembuatan tiket, komentar, URL unggah sementara, dan penyimpanan metadata lampiran",
  "PATCH untuk pembaruan profil, status tiket, dan penugasan tiket",
];

export function ApiDocsPage() {
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerKey, setViewerKey] = useState(0);

  return (
    <div className="api-docs-page">
      <section className="api-docs-page__hero panel panel--section stack-lg">
        <div className="api-docs-page__hero-copy">
          <div>
            <p className="section-eyebrow">Dokumentasi API</p>
            <h1>Referensi API OpsDesk</h1>
            <p>
              Halaman ini menampilkan kontrak OpenAPI backend OpsDesk yang aktif, lengkap dengan endpoint operasional,
              kebutuhan autentikasi Cognito, dan alur integrasi layanan AWS yang dipakai aplikasi.
            </p>
          </div>

          <div className="api-docs-page__actions">
            <Link className="button button--secondary" to="/login">
              Buka halaman masuk
            </Link>
            <a
              className="button button--ghost"
              href={openApiSpecUrl}
              rel="noreferrer"
              target="_blank"
            >
              Buka YAML OpenAPI
            </a>
          </div>
        </div>

        <div className="api-docs-page__meta">
          <article className="api-docs-page__meta-card">
            <span>URL dasar API</span>
            <strong>{env.apiBaseUrl}</strong>
          </article>
          <article className="api-docs-page__meta-card">
            <span>Frontend publik</span>
            <strong>https://opsdesk-teal.vercel.app/api-docs</strong>
          </article>
          <article className="api-docs-page__meta-card">
            <span>Autentikasi</span>
            <strong>Bearer JWT Cognito</strong>
          </article>
        </div>
      </section>

      <section className="api-docs-page__summary">
        <div className="api-docs-page__grid">
          {cloudHighlights.map((item) => (
            <article className="panel panel--section stack-sm" key={item.title}>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </article>
          ))}
        </div>

        <article className="panel panel--section stack-sm">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Cakupan operasi</p>
              <h2>Yang ditampilkan di halaman ini</h2>
            </div>
          </div>
          <ul className="api-docs-page__list">
            {operationHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="api-docs-page__hint">
            Endpoint ditampilkan dari source of truth `docs/openapi.yaml`, sehingga dokumentasi ini tetap sinkron
            dengan kontrak API repository.
          </p>
        </article>
      </section>

      <section className="api-docs-viewer panel panel--section stack-md" aria-label="Viewer dokumentasi API OpsDesk">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">OpenAPI 3.0.3</p>
            <h2>Viewer Swagger UI</h2>
          </div>
        </div>

        <div className="api-docs-viewer__frame">
          {viewerError ? (
            <div className="api-docs-viewer__fallback">
              <ErrorState
                eyebrow="Dokumentasi API"
                title="Dokumentasi API belum dapat ditampilkan"
                message={viewerError}
                supportText="File OpenAPI tetap bisa dibuka langsung untuk pemeriksaan manual sambil viewer dimuat ulang."
                actionLabel="Muat Ulang Viewer"
                onRetry={() => {
                  setViewerError(null);
                  setViewerKey((current) => current + 1);
                }}
              />
            </div>
          ) : (
            <SwaggerUI
              key={viewerKey}
              defaultModelsExpandDepth={-1}
              displayRequestDuration
              docExpansion="list"
              onComplete={() => setViewerError(null)}
              onFailure={(error) => setViewerError(getSwaggerViewerErrorMessage(error))}
              persistAuthorization
              url={openApiSpecUrl}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function getSwaggerViewerErrorMessage(error: unknown) {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Viewer Swagger UI tidak dapat memuat spesifikasi OpenAPI saat ini.";

  if (/fetch|network|load/i.test(rawMessage)) {
    return "Spesifikasi OpenAPI belum berhasil dimuat dari server.";
  }

  return "Spesifikasi OpenAPI belum valid untuk dirender oleh Swagger UI.";
}
