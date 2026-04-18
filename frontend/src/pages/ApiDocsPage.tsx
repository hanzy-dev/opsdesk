import { Link } from "react-router-dom";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import openApiSpecUrl from "../../../docs/openapi.yaml?url";
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
  "GET untuk health check, identitas akun, profil, daftar tiket, detail tiket, aktivitas, dan download URL lampiran",
  "POST untuk pembuatan tiket, komentar, presigned upload URL, dan penyimpanan metadata lampiran",
  "PATCH untuk pembaruan profil, status tiket, dan assignment tiket",
];

export function ApiDocsPage() {
  return (
    <div className="api-docs-page">
      <section className="api-docs-page__hero panel panel--section stack-lg">
        <div className="api-docs-page__hero-copy">
          <div>
            <p className="section-eyebrow">Dokumentasi API</p>
            <h1>OpsDesk API Reference</h1>
            <p>
              Viewer ini menampilkan kontrak OpenAPI backend OpsDesk yang aktif, lengkap dengan endpoint operasional,
              kebutuhan autentikasi Cognito, dan alur integrasi layanan AWS yang dipakai aplikasi.
            </p>
          </div>

          <div className="api-docs-page__actions">
            <Link className="button button--secondary" to="/login">
              Kembali ke aplikasi
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
            <span>Base URL API</span>
            <strong>{env.apiBaseUrl}</strong>
          </article>
          <article className="api-docs-page__meta-card">
            <span>Frontend publik</span>
            <strong>https://opsdesk-teal.vercel.app/api-docs</strong>
          </article>
          <article className="api-docs-page__meta-card">
            <span>Auth</span>
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
              <h2>Yang ditunjukkan viewer ini</h2>
            </div>
          </div>
          <ul className="api-docs-page__list">
            {operationHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="api-docs-page__hint">
            Endpoint ditampilkan dari source of truth `docs/openapi.yaml`, sehingga dokumen viewer tetap sinkron dengan
            kontrak API repository.
          </p>
        </article>
      </section>

      <section className="api-docs-viewer panel panel--section stack-md" aria-label="Viewer dokumentasi API OpsDesk">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">OpenAPI 3.0.3</p>
            <h2>Swagger UI</h2>
          </div>
        </div>

        <div className="api-docs-viewer__frame">
          <SwaggerUI
            defaultModelsExpandDepth={-1}
            displayRequestDuration
            docExpansion="list"
            persistAuthorization
            url={openApiSpecUrl}
          />
        </div>
      </section>
    </div>
  );
}
