import type { CommentVisibility, TicketCategory, TicketPriority, TicketTeam } from "../types/ticket";

export const ticketCategoryOptions: { value: TicketCategory; label: string; description: string }[] = [
  { value: "account_access", label: "Akses akun", description: "Masalah login, reset sandi, atau hak akses akun." },
  { value: "network", label: "Jaringan", description: "Gangguan internet, VPN, koneksi kantor, atau akses jaringan." },
  { value: "hardware", label: "Perangkat", description: "Kendala laptop, printer, monitor, atau perangkat kerja." },
  { value: "application_bug", label: "Bug aplikasi", description: "Error, timeout, atau perilaku aplikasi yang tidak sesuai." },
  { value: "service_request", label: "Permintaan layanan", description: "Permintaan setup, instalasi, atau bantuan operasional." },
  { value: "other", label: "Lainnya", description: "Kebutuhan yang belum pas dengan kategori utama." },
];

export const ticketTeamOptions: { value: TicketTeam; label: string; description: string }[] = [
  { value: "helpdesk", label: "Helpdesk", description: "Triage awal, akses dasar, dan koordinasi tiket masuk." },
  { value: "infrastructure", label: "Infrastruktur", description: "Jaringan, perangkat, dan lingkungan teknis dasar." },
  { value: "applications", label: "Aplikasi", description: "Sistem internal, bug aplikasi, dan kendala integrasi." },
  { value: "operations", label: "Operasional", description: "Permintaan layanan umum dan tindak lanjut lintas fungsi." },
];

export const commentVisibilityOptions: { value: CommentVisibility; label: string; description: string }[] = [
  { value: "public", label: "Komentar publik", description: "Terlihat oleh pelapor dan petugas." },
  { value: "internal", label: "Catatan internal", description: "Hanya terlihat oleh petugas dan admin." },
];

export function getTicketCategoryLabel(category?: string) {
  return ticketCategoryOptions.find((option) => option.value === category)?.label ?? "Kategori tidak diketahui";
}

export function getTicketTeamLabel(team?: string) {
  return ticketTeamOptions.find((option) => option.value === team)?.label ?? "Tim tidak diketahui";
}

export function getCommentVisibilityLabel(visibility?: string) {
  return commentVisibilityOptions.find((option) => option.value === visibility)?.label ?? "Komentar publik";
}

export function getPriorityLabel(priority?: TicketPriority) {
  switch (priority) {
    case "high":
      return "Prioritas Tinggi";
    case "medium":
      return "Prioritas Sedang";
    case "low":
      return "Prioritas Rendah";
    default:
      return "Prioritas Tidak Diketahui";
  }
}

export function getDefaultTeamForCategory(category: TicketCategory): TicketTeam {
  switch (category) {
    case "account_access":
      return "helpdesk";
    case "network":
    case "hardware":
      return "infrastructure";
    case "application_bug":
      return "applications";
    case "service_request":
    case "other":
    default:
      return "operations";
  }
}
