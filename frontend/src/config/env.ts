const fallbackApiBaseUrl = "http://localhost:8080/v1";

function normalizeApiBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveApiBaseUrl(): string {
  const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredApiBaseUrl) {
    return normalizeApiBaseUrl(configuredApiBaseUrl);
  }

  if (import.meta.env.DEV) {
    return fallbackApiBaseUrl;
  }

  throw new Error("Missing VITE_API_BASE_URL. Set it in the Vercel project environment variables.");
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
};
