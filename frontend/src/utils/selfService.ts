import { helpArticles, type HelpArticle } from "../content/helpArticles";
import type { Ticket, TicketActivity, TicketCategory } from "../types/ticket";
import { formatDateTime } from "./date";
import { getTicketCategoryLabel } from "./ticketMetadata";

export type HelpArticleMatch = {
  article: HelpArticle;
  score: number;
  matchedTerms: string[];
  reason: string;
};

export type ReporterTicketGuidance = {
  headline: string;
  expectation: string;
  nextStep: string;
  lastUpdate: string;
  statusLabel: "baru" | "berjalan" | "selesai";
};

const stopWords = new Set([
  "yang",
  "dan",
  "atau",
  "untuk",
  "dengan",
  "dari",
  "ke",
  "di",
  "ini",
  "itu",
  "agar",
  "sudah",
  "belum",
  "masih",
  "bisa",
  "tidak",
  "pada",
  "akan",
  "saya",
  "kami",
  "tiket",
]);

export function findHelpArticleMatches(input: {
  query?: string;
  title?: string;
  description?: string;
  category?: TicketCategory;
  limit?: number;
}) {
  const combinedSource = [input.query, input.title, input.description].filter(Boolean).join(" ").trim();
  const normalizedQuery = normalizeText(combinedSource);
  const tokens = extractTokens(combinedSource);
  const limit = input.limit ?? 3;

  if (normalizedQuery.length < 6 && !input.category) {
    return [] as HelpArticleMatch[];
  }

  return helpArticles
    .map((article) => {
      const matchedTerms = new Set<string>();
      let score = 0;

      article.keywords.forEach((keyword) => {
        if (normalizedQuery.includes(keyword)) {
          matchedTerms.add(keyword);
          score += keyword.includes(" ") ? 2.4 : 1.8;
        }
      });

      article.symptoms.forEach((symptom) => {
        const normalizedSymptom = normalizeText(symptom);
        if (normalizedQuery && normalizedSymptom.includes(normalizedQuery)) {
          matchedTerms.add(symptom);
          score += 2;
        }
      });

      tokens.forEach((token) => {
        if (article.keywords.some((keyword) => keyword.includes(token))) {
          matchedTerms.add(token);
          score += 0.7;
        }
      });

      if (input.category && article.relatedCategory === input.category) {
        score += 1.2;
      }

      if (article.category === "general") {
        score += 0.2;
      }

      return {
        article,
        score,
        matchedTerms: [...matchedTerms].slice(0, 4),
      };
    })
    .filter((match) => match.score >= 1.3)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((match) => ({
      ...match,
      reason:
        match.matchedTerms.length > 0
          ? `Relevan dengan kata kunci ${formatMatchedTerms(match.matchedTerms)}.`
          : `Cocok dengan pola kebutuhan ${match.article.category === "general" ? "umum" : getTicketCategoryLabel(match.article.category)}.`,
    }));
}

export function getFeaturedHelpArticles(limit = 3) {
  return helpArticles.slice(0, limit);
}

export function buildReporterTicketGuidance(ticket: Ticket, activities: TicketActivity[]): ReporterTicketGuidance {
  const latestActivity = [...activities].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())[0];
  const latestPublicComment = [...ticket.comments]
    .filter((comment) => comment.visibility !== "internal")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];

  if (ticket.status === "resolved") {
    return {
      headline: "Tiket ini sudah ditandai selesai oleh tim OpsDesk.",
      expectation: "Periksa kembali solusi atau pembaruan terakhir. Jika kendala masih muncul, balas tiket ini dengan detail terbaru.",
      nextStep: "Gunakan balasan tiket yang sama bila masalahnya belum tuntas agar riwayat tetap utuh.",
      lastUpdate: latestPublicComment
        ? `Pembaruan publik terakhir dari ${latestPublicComment.authorName} pada ${formatDateTime(latestPublicComment.createdAt)}.`
        : latestActivity
          ? `Aktivitas terakhir tercatat pada ${formatDateTime(latestActivity.timestamp)}.`
          : "Belum ada pembaruan publik tambahan setelah tiket selesai.",
      statusLabel: "selesai",
    };
  }

  if (ticket.status === "in_progress") {
    return {
      headline: "Tiket Anda sedang diproses oleh tim terkait.",
      expectation: "Tim sedang meninjau, mengerjakan, atau menunggu verifikasi lanjutan dari konteks tiket ini.",
      nextStep:
        ticket.attachments.length === 0
          ? "Jika ada screenshot, pesan error, atau detail tambahan, Anda bisa menambahkannya agar tindak lanjut lebih cepat."
          : "Pantau komentar publik terbaru. Balas tiket jika ada dampak baru atau konteks tambahan.",
      lastUpdate: latestPublicComment
        ? `Komentar publik terbaru dikirim ${latestPublicComment.authorName} pada ${formatDateTime(latestPublicComment.createdAt)}.`
        : latestActivity
          ? `Aktivitas terakhir tercatat pada ${formatDateTime(latestActivity.timestamp)}.`
          : "Belum ada pembaruan baru setelah tiket diproses.",
      statusLabel: "berjalan",
    };
  }

  return {
    headline: "Tiket Anda sudah diterima dan menunggu triase awal.",
    expectation: "Tim akan meninjau kategori, dampak, dan kelengkapan informasi sebelum tindak lanjut berikutnya.",
    nextStep:
      ticket.attachments.length === 0
        ? "Tambahkan lampiran atau balasan jika Anda punya bukti tambahan seperti screenshot, lokasi kejadian, atau akun terdampak."
        : "Saat ini Anda cukup memantau status dan komentar publik. Tambah balasan hanya bila ada info baru yang penting.",
    lastUpdate: latestActivity
      ? `Aktivitas terakhir tercatat pada ${formatDateTime(latestActivity.timestamp)}.`
      : `Tiket dibuat pada ${formatDateTime(ticket.createdAt)} dan belum memiliki aktivitas lanjutan.`,
    statusLabel: "baru",
  };
}

export function getReporterProgressSteps(status: Ticket["status"]) {
  return [
    { key: "open", label: "Diterima", isComplete: true, isCurrent: status === "open" },
    { key: "in_progress", label: "Diproses", isComplete: status !== "open", isCurrent: status === "in_progress" },
    { key: "resolved", label: "Selesai", isComplete: status === "resolved", isCurrent: status === "resolved" },
  ];
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTokens(value: string) {
  return new Set(
    normalizeText(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !stopWords.has(token)),
  );
}

function formatMatchedTerms(terms: string[]) {
  return terms.map((term) => `"${term}"`).join(", ");
}
