import type { Ticket, TicketActivity, TicketCategory, TicketPriority, TicketTeam } from "../types/ticket";
import { formatDateTime } from "./date";
import { getDefaultTeamForCategory, getPriorityLabel, getTicketCategoryLabel, getTicketTeamLabel } from "./ticketMetadata";

type SuggestionConfidence = "tinggi" | "sedang";

export type TicketSuggestion<T> = {
  value: T;
  confidence: SuggestionConfidence;
  reason: string;
  matchedTerms: string[];
};

export type TicketAssistSuggestion = {
  category: TicketSuggestion<TicketCategory>;
  priority: TicketSuggestion<TicketPriority>;
  team: TicketSuggestion<TicketTeam>;
};

export type RelatedTicketHint = {
  ticket: Ticket;
  score: number;
  matchedTerms: string[];
  reason: string;
};

export type TicketSummaryAssist = {
  headline: string;
  bullets: string[];
  support: string;
};

export type OperatorDraftAssist = {
  publicReply: string;
  internalNote: string;
  explanation: string;
};

const stopWords = new Set([
  "yang",
  "dan",
  "atau",
  "untuk",
  "dengan",
  "pada",
  "dari",
  "ke",
  "di",
  "ini",
  "itu",
  "agar",
  "sudah",
  "belum",
  "saat",
  "seperti",
  "lebih",
  "masih",
  "bisa",
  "tidak",
  "gagal",
  "ticket",
  "tiket",
  "the",
  "and",
  "for",
  "from",
  "with",
  "into",
  "pada",
  "oleh",
]);

const categoryKeywordMap: Record<TicketCategory, string[]> = {
  account_access: ["akun", "login", "masuk", "password", "sandi", "akses", "otp", "izin", "role", "sso"],
  network: ["jaringan", "wifi", "internet", "vpn", "koneksi", "dns", "latency", "router", "bandwidth"],
  hardware: ["printer", "laptop", "komputer", "monitor", "scanner", "keyboard", "mouse", "perangkat", "pc"],
  application_bug: ["bug", "error", "timeout", "api", "dashboard", "crash", "sinkron", "aplikasi", "500", "404"],
  service_request: ["permintaan", "request", "instal", "setup", "buatkan", "tambahkan", "aktivasi", "provision"],
  other: ["lainnya", "umum"],
};

const lowPriorityKeywords = ["permintaan", "jadwal", "minor", "informasi", "klarifikasi", "perubahan kecil"];
const highPriorityKeywords = [
  "mendesak",
  "urgent",
  "kritikal",
  "critical",
  "down",
  "semua pengguna",
  "seluruh",
  "tidak bisa",
  "terhenti",
  "produksi",
  "segera",
  "blocking",
];
const mediumPriorityKeywords = ["gangguan", "lambat", "tidak stabil", "error", "timeout", "bermasalah"];

export function getTicketAssistSuggestion(input: { title: string; description: string }) {
  const combined = `${input.title} ${input.description}`.trim();
  const normalized = normalizeText(combined);
  const tokens = extractTokens(combined);

  const categoryScores = (Object.keys(categoryKeywordMap) as TicketCategory[]).map((category) => {
    const matchedTerms = categoryKeywordMap[category].filter((keyword) => normalized.includes(keyword));
    return {
      category,
      score: matchedTerms.length,
      matchedTerms,
    };
  });

  const topCategory = [...categoryScores].sort((left, right) => right.score - left.score)[0];
  const category = topCategory && topCategory.score > 0 ? topCategory.category : "other";
  const categoryTerms = topCategory?.matchedTerms ?? [];
  const priority = suggestPriority(normalized, category, tokens);

  return {
    category: {
      value: category,
      confidence: categoryTerms.length >= 2 ? "tinggi" : "sedang",
      reason:
        categoryTerms.length > 0
          ? `Terdeteksi kata kunci seperti ${formatMatchedTerms(categoryTerms)}.`
          : "Belum ada sinyal kuat dari kata kunci, jadi saran diarahkan ke kategori umum.",
      matchedTerms: categoryTerms,
    },
    priority,
    team: {
      value: getDefaultTeamForCategory(category),
      confidence: category === "other" ? "sedang" : "tinggi",
      reason: `Area tujuan mengikuti kategori ${getTicketCategoryLabel(category)} untuk triase awal.`,
      matchedTerms: categoryTerms,
    },
  } satisfies TicketAssistSuggestion;
}

export function findRelatedTickets(source: { id?: string; title: string; description: string; category?: TicketCategory; team?: TicketTeam }, tickets: Ticket[], limit = 3) {
  const sourceTokens = extractTokens(`${source.title} ${source.description}`);
  if (sourceTokens.size === 0) {
    return [] as RelatedTicketHint[];
  }

  return tickets
    .filter((ticket) => ticket.id !== source.id)
    .map((ticket) => {
      const comparedTokens = extractTokens(`${ticket.title} ${ticket.description}`);
      const overlap = [...sourceTokens].filter((token) => comparedTokens.has(token));
      const unionSize = new Set([...sourceTokens, ...comparedTokens]).size || 1;
      let score = overlap.length / unionSize;

      if (source.category && ticket.category === source.category) {
        score += 0.12;
      }

      if (source.team && ticket.team === source.team) {
        score += 0.08;
      }

      if (ticket.status !== "resolved") {
        score += 0.05;
      }

      return {
        ticket,
        score,
        matchedTerms: overlap.slice(0, 4),
      };
    })
    .filter((hint) => hint.score >= 0.18 || hint.matchedTerms.length >= 2)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((hint) => ({
      ...hint,
      reason:
        hint.matchedTerms.length > 0
          ? `Mirip pada kata ${formatMatchedTerms(hint.matchedTerms)}.`
          : "Memiliki pola kategori atau area tujuan yang serupa.",
    }));
}

export function buildTicketSummaryAssist(ticket: Ticket, activities: TicketActivity[]): TicketSummaryAssist {
  const latestActivity = [...activities].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())[0];
  const publicComments = ticket.comments.filter((comment) => comment.visibility !== "internal").length;
  const internalComments = ticket.comments.filter((comment) => comment.visibility === "internal").length;

  const headline = `Tiket ${getTicketCategoryLabel(ticket.category)} ini saat ini ${formatStatus(ticket.status).toLowerCase()} dengan ${getPriorityLabel(ticket.priority).toLowerCase()}.`;
  const bullets = [
    `Masuk ke area ${getTicketTeamLabel(ticket.team)} dan dibuat oleh ${ticket.reporterName} pada ${formatDateTime(ticket.createdAt)}.`,
    ticket.assigneeName
      ? `Saat ini berada pada antrean ${ticket.assigneeName}${ticket.assignedAt ? ` sejak ${formatDateTime(ticket.assignedAt)}` : ""}.`
      : "Belum ada penanggung jawab yang ditetapkan pada tiket ini.",
    latestActivity
      ? `Aktivitas terbaru: ${latestActivity.summary.toLowerCase()} pada ${formatDateTime(latestActivity.timestamp)}.`
      : "Belum ada aktivitas lanjutan setelah tiket dibuat.",
    `Percakapan berisi ${publicComments} komentar publik, ${internalComments} catatan internal, dan ${ticket.attachments.length} lampiran.`,
  ];

  return {
    headline,
    bullets,
    support:
      activities.length + ticket.comments.length >= 4
        ? "Ringkasan ini dirangkum dari data tiket, komentar, dan aktivitas terbaru untuk mempercepat pembacaan."
        : "Ringkasan ini memakai data tiket yang sudah tersimpan, jadi sifatnya membantu orientasi awal.",
  };
}

export function buildOperatorDraftAssist(ticket: Ticket, activities: TicketActivity[], relatedTickets: RelatedTicketHint[]) {
  const latestActivity = [...activities].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())[0];
  const followUpHint = getFollowUpHint(ticket.category);
  const relatedHint =
    relatedTickets.length > 0
      ? ` Kami juga melihat ada tiket lain yang mirip sehingga penanganan akan kami cek agar tidak duplikatif.`
      : "";

  const publicReply =
    ticket.status === "resolved"
      ? `Halo ${ticket.reporterName}, tiket Anda terkait ${getTicketCategoryLabel(ticket.category).toLowerCase()} sudah kami tandai selesai. Jika kendala masih muncul, silakan balas tiket ini dengan detail terbaru agar kami tindak lanjuti kembali.`
      : `Halo ${ticket.reporterName}, tiket Anda terkait ${getTicketCategoryLabel(ticket.category).toLowerCase()} sudah kami terima dan saat ini ${statusProgressPhrase(ticket.status)} oleh tim ${getTicketTeamLabel(ticket.team)}.${relatedHint} ${followUpHint}`.trim();

  const internalNote = [
    `Cek konteks ${getTicketCategoryLabel(ticket.category).toLowerCase()} pada area ${getTicketTeamLabel(ticket.team)}.`,
    latestActivity ? `Aktivitas terakhir: ${latestActivity.summary.toLowerCase()} (${formatDateTime(latestActivity.timestamp)}).` : "Belum ada aktivitas lanjutan yang tercatat.",
    relatedTickets.length > 0 ? `Bandingkan dengan tiket mirip: ${relatedTickets.map((hint) => hint.ticket.id).join(", ")}.` : "Belum ada tiket mirip yang cukup kuat untuk dijadikan referensi cepat.",
  ].join(" ");

  return {
    publicReply,
    internalNote,
    explanation: "Draf ini dibuat dari status tiket, kategori, area tujuan, dan pola aktivitas yang sudah ada. Tetap tinjau sebelum dikirim.",
  } satisfies OperatorDraftAssist;
}

function suggestPriority(normalized: string, category: TicketCategory, tokens: Set<string>) {
  const highMatches = highPriorityKeywords.filter((keyword) => normalized.includes(keyword));
  const mediumMatches = mediumPriorityKeywords.filter((keyword) => normalized.includes(keyword));
  const lowMatches = lowPriorityKeywords.filter((keyword) => normalized.includes(keyword));

  let value: TicketPriority = "medium";
  let matchedTerms = mediumMatches;
  let reason = "Belum ada sinyal ekstrem, sehingga prioritas sedang paling aman untuk triase awal.";

  if (highMatches.length > 0 || (category === "network" && tokens.has("vpn")) || (category === "application_bug" && tokens.has("api"))) {
    value = "high";
    matchedTerms = highMatches.length > 0 ? highMatches : ["dampak operasional"];
    reason = `Ada sinyal dampak tinggi seperti ${formatMatchedTerms(matchedTerms)}.`;
  } else if (lowMatches.length > 0 || (category === "service_request" && mediumMatches.length === 0)) {
    value = "low";
    matchedTerms = lowMatches.length > 0 ? lowMatches : ["permintaan layanan"];
    reason = `Isi tiket lebih dekat ke pola ${formatMatchedTerms(matchedTerms)}.`;
  }

  return {
    value,
    confidence: matchedTerms.length >= 2 ? "tinggi" : "sedang",
    reason,
    matchedTerms,
  } satisfies TicketSuggestion<TicketPriority>;
}

function getFollowUpHint(category: TicketCategory) {
  switch (category) {
    case "account_access":
      return "Jika memungkinkan, mohon sertakan akun yang terdampak, pesan error, dan waktu kejadian terakhir.";
    case "network":
      return "Mohon bantu tambahkan lokasi, jaringan yang dipakai, dan perangkat yang terdampak bila belum sempat dicantumkan.";
    case "hardware":
      return "Bila ada, tambahkan tipe perangkat atau foto gejala agar pengecekan lebih cepat.";
    case "application_bug":
      return "Jika tersedia, sertakan langkah reproduksi singkat atau screenshot error untuk mempercepat analisis.";
    case "service_request":
      return "Mohon jelaskan target kebutuhan, tenggat, dan akun atau perangkat yang perlu disiapkan.";
    default:
      return "Jika ada detail tambahan yang relevan, silakan balas tiket ini agar tindak lanjut lebih terarah.";
  }
}

function statusProgressPhrase(status: Ticket["status"]) {
  switch (status) {
    case "in_progress":
      return "sedang ditinjau";
    case "resolved":
      return "sudah selesai";
    case "open":
    default:
      return "masuk antrean untuk triase awal";
  }
}

function formatStatus(status: Ticket["status"]) {
  switch (status) {
    case "in_progress":
      return "Sedang Ditangani";
    case "resolved":
      return "Selesai";
    case "open":
    default:
      return "Terbuka";
  }
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
  return terms.slice(0, 3).map((term) => `"${term}"`).join(", ");
}
