import type { TicketCategory, TicketPriority, TicketTeam } from "../types/ticket";

export type HelpArticle = {
  id: string;
  title: string;
  summary: string;
  category: TicketCategory | "general";
  readTimeMinutes: number;
  keywords: string[];
  symptoms: string[];
  steps: string[];
  whenToCreateTicket: string;
  relatedCategory?: TicketCategory;
  relatedTeam?: TicketTeam;
  suggestedPriority?: TicketPriority;
};

export const helpArticles: HelpArticle[] = [
  {
    id: "reset-password-sso",
    title: "Masalah login, sandi, atau akses SSO",
    summary: "Langkah cepat untuk mengecek akun terkunci, reset sandi, dan kendala akses masuk yang paling sering terjadi.",
    category: "account_access",
    readTimeMinutes: 4,
    keywords: ["login", "masuk", "akun", "password", "sandi", "otp", "sso", "akses"],
    symptoms: [
      "Tidak bisa masuk ke aplikasi atau portal",
      "Reset sandi tidak masuk ke email",
      "Akun terasa terkunci atau akses hilang",
    ],
    steps: [
      "Pastikan email akun yang dipakai sudah benar dan tidak tertukar dengan akun pribadi.",
      "Coba reset sandi sekali lagi lalu cek folder spam atau promosi pada email.",
      "Jika memakai SSO, logout penuh lalu login ulang setelah membersihkan sesi lama di browser.",
      "Catat pesan error, waktu kejadian, dan nama aplikasi sebelum membuat tiket.",
    ],
    whenToCreateTicket:
      "Buat tiket jika reset sandi tetap gagal, akun terkunci, OTP tidak terkirim, atau akses penting hilang.",
    relatedCategory: "account_access",
    relatedTeam: "helpdesk",
    suggestedPriority: "medium",
  },
  {
    id: "vpn-wifi-check",
    title: "VPN, Wi-Fi, atau koneksi jaringan bermasalah",
    summary: "Checklist singkat untuk membedakan gangguan perangkat lokal, Wi-Fi kantor, internet rumah, atau VPN perusahaan.",
    category: "network",
    readTimeMinutes: 5,
    keywords: ["vpn", "wifi", "wi-fi", "internet", "jaringan", "koneksi", "dns", "latency", "timeout"],
    symptoms: [
      "VPN gagal terhubung atau sering putus",
      "Aplikasi internal lambat hanya di jaringan tertentu",
      "Internet terasa putus-putus atau DNS gagal",
    ],
    steps: [
      "Coba pindah jaringan sebentar untuk memastikan gangguan bukan dari internet lokal.",
      "Restart koneksi VPN atau sambungkan ulang ke SSID yang benar jika memakai Wi-Fi kantor.",
      "Bandingkan apakah layanan publik normal tetapi aplikasi internal lambat.",
      "Saat membuat tiket, sertakan lokasi, jenis jaringan, dan perangkat yang dipakai.",
    ],
    whenToCreateTicket:
      "Buat tiket jika koneksi tetap gagal setelah pindah jaringan, VPN tidak bisa dipakai untuk bekerja, atau banyak pengguna ikut terdampak.",
    relatedCategory: "network",
    relatedTeam: "infrastructure",
    suggestedPriority: "high",
  },
  {
    id: "printer-device-basics",
    title: "Printer atau perangkat kerja tidak merespons",
    summary: "Panduan awal untuk printer, scanner, monitor, atau perangkat kerja yang berhenti merespons sebelum dilaporkan.",
    category: "hardware",
    readTimeMinutes: 4,
    keywords: ["printer", "scanner", "laptop", "komputer", "monitor", "keyboard", "mouse", "perangkat", "pc"],
    symptoms: [
      "Printer online tetapi dokumen tidak keluar",
      "Perangkat tidak menyala atau tidak terdeteksi",
      "Monitor atau periferal tidak merespons",
    ],
    steps: [
      "Cek kabel daya dan koneksi utama terlebih dahulu, lalu restart perangkat bila aman dilakukan.",
      "Pastikan perangkat muncul di sistem operasi atau terhubung ke jaringan yang benar.",
      "Uji dari perangkat lain jika memungkinkan untuk membedakan masalah endpoint dan perangkat.",
      "Lampirkan foto indikator atau pesan error saat membuat tiket.",
    ],
    whenToCreateTicket:
      "Buat tiket jika perangkat tetap gagal dipakai setelah pengecekan dasar atau menghambat aktivitas kerja utama.",
    relatedCategory: "hardware",
    relatedTeam: "infrastructure",
    suggestedPriority: "medium",
  },
  {
    id: "app-error-reporting",
    title: "Aplikasi error, timeout, atau data tidak sinkron",
    summary: "Cara menyiapkan laporan bug yang jelas agar tim aplikasi bisa mereproduksi dan menindaklanjuti lebih cepat.",
    category: "application_bug",
    readTimeMinutes: 5,
    keywords: ["bug", "error", "timeout", "api", "dashboard", "aplikasi", "sinkron", "500", "404", "crash"],
    symptoms: [
      "Halaman gagal dimuat atau timeout",
      "Data tidak sinkron antar layar",
      "Muncul kode error atau crash berulang",
    ],
    steps: [
      "Coba muat ulang sekali, lalu cek apakah masalah konsisten atau hanya sesaat.",
      "Catat langkah sebelum error terjadi agar alurnya bisa diulang oleh tim.",
      "Simpan screenshot, URL halaman, dan waktu kejadian jika tersedia.",
      "Jelaskan dampaknya: satu pengguna, satu tim, atau banyak pengguna sekaligus.",
    ],
    whenToCreateTicket:
      "Buat tiket jika error berulang, mengganggu pekerjaan utama, atau memengaruhi lebih dari satu pengguna.",
    relatedCategory: "application_bug",
    relatedTeam: "applications",
    suggestedPriority: "high",
  },
  {
    id: "service-request-prep",
    title: "Permintaan layanan baru atau perubahan akses",
    summary: "Panduan singkat agar permintaan instalasi, aktivasi, atau setup baru langsung berisi informasi yang dibutuhkan.",
    category: "service_request",
    readTimeMinutes: 3,
    keywords: ["permintaan", "request", "instal", "setup", "aktivasi", "provision", "tambahkan", "buatkan"],
    symptoms: [
      "Perlu akun atau akses baru",
      "Perlu instalasi software atau setup perangkat",
      "Perlu perubahan kecil pada layanan yang ada",
    ],
    steps: [
      "Jelaskan kebutuhan bisnis atau tujuan singkat dari permintaan.",
      "Tuliskan target pengguna, perangkat, atau akun yang perlu disiapkan.",
      "Sertakan tenggat jika ada kebutuhan waktu tertentu.",
      "Tambahkan lampiran daftar user atau detail perangkat bila relevan.",
    ],
    whenToCreateTicket:
      "Buat tiket setelah kebutuhan sudah cukup jelas agar tim tidak perlu meminta detail dasar berulang kali.",
    relatedCategory: "service_request",
    relatedTeam: "operations",
    suggestedPriority: "low",
  },
  {
    id: "cara-memantau-tiket",
    title: "Cara membaca status tiket dan menunggu tindak lanjut",
    summary: "Penjelasan jujur tentang arti status Terbuka, Sedang Ditangani, dan Selesai serta kapan Anda perlu menambahkan balasan.",
    category: "general",
    readTimeMinutes: 3,
    keywords: ["status", "tiket", "update", "progres", "menunggu", "ditinjau", "selesai", "balasan"],
    symptoms: [
      "Ingin tahu arti status tiket",
      "Tidak yakin kapan harus follow up",
      "Butuh memahami pembaruan dari tim",
    ],
    steps: [
      "Status Terbuka berarti tiket sudah masuk dan menunggu triase awal.",
      "Status Sedang Ditangani berarti tim sedang menindaklanjuti atau menunggu verifikasi lanjutan.",
      "Status Selesai berarti pekerjaan utama sudah dianggap tuntas, tetapi Anda masih bisa membalas jika kendala berlanjut.",
      "Balas tiket jika ada informasi baru, dampak meluas, atau solusi belum menyelesaikan masalah.",
    ],
    whenToCreateTicket:
      "Gunakan panduan ini untuk memahami progres. Buat tiket baru hanya jika masalahnya berbeda dari tiket yang sudah ada.",
  },
];
