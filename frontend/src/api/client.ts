import { env } from "../config/env";
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
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as ApiSuccessResponse<T> | ApiErrorResponse | null;

  if (!response.ok) {
    throw new ApiError(
      payload && "error" in payload ? payload.error.message : "Terjadi kesalahan saat memuat data.",
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
