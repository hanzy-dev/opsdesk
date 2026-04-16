function normalizeApiBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveApiBaseUrl(): string {
  const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredApiBaseUrl) {
    return normalizeApiBaseUrl(configuredApiBaseUrl);
  }

  throw new Error("Missing VITE_API_BASE_URL. Set it in the frontend environment configuration before running OpsDesk.");
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
};
