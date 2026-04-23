import type { Ticket } from "../types/ticket";
import { getTicketCategoryLabel, getTicketTeamLabel } from "../utils/ticketMetadata";

export type OperatorMacroVisibility = "public" | "internal";

export type OperatorMacro = {
  id: string;
  title: string;
  summary: string;
  visibility: OperatorMacroVisibility;
  tone: "neutral" | "attention" | "progress" | "success";
  buildMessage: (ticket: Ticket) => string;
};

export const operatorMacros: OperatorMacro[] = [
  {
    id: "triase-awal",
    title: "Konfirmasi triase awal",
    summary: "Balasan publik untuk memberi tahu pelapor bahwa tiket sudah masuk antrean review.",
    visibility: "public",
    tone: "progress",
    buildMessage: (ticket) =>
      `Halo ${ticket.reporterName}, tiket Anda terkait ${getTicketCategoryLabel(ticket.category).toLowerCase()} sudah kami terima dan sedang masuk triase awal oleh tim ${getTicketTeamLabel(ticket.team)}. Jika ada detail tambahan yang relevan, silakan balas tiket ini agar penanganan lebih terarah.`,
  },
  {
    id: "minta-informasi",
    title: "Minta informasi tambahan",
    summary: "Balasan publik untuk meminta konteks tambahan tanpa menulis ulang dari nol.",
    visibility: "public",
    tone: "attention",
    buildMessage: (ticket) =>
      `Halo ${ticket.reporterName}, kami sedang meninjau tiket ${ticket.id}. Agar pengecekan ${getTicketCategoryLabel(ticket.category).toLowerCase()} lebih cepat, mohon tambahkan detail seperti waktu kejadian terakhir, dampak yang dirasakan, dan screenshot atau pesan error bila tersedia.`,
  },
  {
    id: "sedang-ditangani",
    title: "Sedang ditangani",
    summary: "Balasan publik singkat saat tiket sudah diproses oleh operator.",
    visibility: "public",
    tone: "progress",
    buildMessage: (ticket) =>
      `Halo ${ticket.reporterName}, tiket Anda sedang kami tindak lanjuti di tim ${getTicketTeamLabel(ticket.team)}. Kami akan memperbarui tiket ini lagi begitu ada hasil pengecekan berikutnya.`,
  },
  {
    id: "selesai-dengan-konfirmasi",
    title: "Penutupan dengan konfirmasi",
    summary: "Balasan publik saat operator ingin menutup tiket dengan ajakan konfirmasi dari pelapor.",
    visibility: "public",
    tone: "success",
    buildMessage: (ticket) =>
      `Halo ${ticket.reporterName}, tindak lanjut utama untuk tiket ${ticket.id} sudah kami selesaikan. Silakan cek kembali dari sisi Anda. Jika kendala masih muncul, balas tiket ini dengan kondisi terbaru agar kami buka tindak lanjut lanjutan.`,
  },
  {
    id: "catatan-handoff",
    title: "Catatan handoff",
    summary: "Catatan internal saat tiket perlu diteruskan atau dipindahkan konteksnya.",
    visibility: "internal",
    tone: "neutral",
    buildMessage: (ticket) =>
      `Handoff internal untuk tiket ${ticket.id}. Mohon lanjutkan review ${getTicketCategoryLabel(ticket.category).toLowerCase()} pada area ${getTicketTeamLabel(ticket.team)} dan cek riwayat komentar publik sebelum memberi pembaruan berikutnya.`,
  },
  {
    id: "follow-up-operator",
    title: "Tandai perlu follow-up",
    summary: "Catatan internal untuk menandai bahwa tiket butuh pantauan atau balasan berikutnya.",
    visibility: "internal",
    tone: "attention",
    buildMessage: (ticket) =>
      `Follow-up internal diperlukan untuk tiket ${ticket.id}. Pastikan ada pembaruan berikutnya ke pelapor setelah pengecekan lanjutan pada konteks ${getTicketCategoryLabel(ticket.category).toLowerCase()}.`,
  },
  {
    id: "indikasi-insiden",
    title: "Indikasi insiden serupa",
    summary: "Catatan internal ketika tiket tampak terkait gangguan yang lebih luas.",
    visibility: "internal",
    tone: "attention",
    buildMessage: (ticket) =>
      `Ada indikasi tiket ${ticket.id} terkait gangguan yang lebih luas. Bandingkan tiket ini dengan antrean lain pada kategori ${getTicketCategoryLabel(ticket.category).toLowerCase()} dan area ${getTicketTeamLabel(ticket.team)} sebelum memberi keputusan akhir.`,
  },
];
