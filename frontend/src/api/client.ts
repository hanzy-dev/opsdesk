import { env } from "../config/env";
import { getValidIdToken } from "../modules/auth/authService";
import { clearStoredSession } from "../modules/auth/sessionStore";
import type { ApiErrorResponse, ApiSuccessResponse } from "../types/api";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: { field: string; message: string }[];

  constructor(message: string, status: number, code = "api_error", details?: { field: string; message: string }[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const idToken = await getValidIdToken();

  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      "OpsDesk belum dapat terhubung ke layanan backend. Periksa koneksi atau konfigurasi API lalu coba lagi.",
      0,
      "network_error",
    );
  }

  const payload = (await response.json().catch(() => null)) as ApiSuccessResponse<T> | ApiErrorResponse | null;

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredSession();
    }

    const message =
      response.status === 401
        ? getHttpErrorMessage(response.status)
        : payload && "error" in payload
          ? payload.error.message
          : getHttpErrorMessage(response.status);

    throw new ApiError(
      message,
      response.status,
      payload && "error" in payload ? payload.error.code : "api_error",
      payload && "error" in payload ? payload.error.details : undefined,
    );
  }

  if (!payload || !("data" in payload)) {
    throw new ApiError("Respons API tidak valid.", response.status, "invalid_response");
  }

  return payload.data;
}

function getHttpErrorMessage(status: number) {
  switch (status) {
    case 400:
      return "Permintaan belum valid. Periksa kembali data yang diisi.";
    case 404:
      return "Data yang diminta tidak ditemukan atau sudah tidak tersedia.";
    case 405:
      return "Permintaan belum didukung untuk halaman ini.";
    case 401:
      return "Sesi Anda tidak valid atau sudah berakhir. Silakan masuk kembali.";
    case 403:
      return "Anda tidak memiliki izin untuk melakukan aksi ini.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "Layanan backend sedang mengalami kendala. Silakan coba beberapa saat lagi.";
    default:
      return "Terjadi kendala saat memuat data dari server.";
  }
}
