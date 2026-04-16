function normalizeApiBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function requireEnv(name: string, value: string | undefined): string {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    throw new Error(`Missing ${name}. Set it in the frontend environment configuration before running OpsDesk.`);
  }

  return trimmedValue;
}

function resolveApiBaseUrl(): string {
  return normalizeApiBaseUrl(requireEnv("VITE_API_BASE_URL", import.meta.env.VITE_API_BASE_URL));
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  cognitoRegion: requireEnv("VITE_COGNITO_REGION", import.meta.env.VITE_COGNITO_REGION),
  cognitoUserPoolId: requireEnv("VITE_COGNITO_USER_POOL_ID", import.meta.env.VITE_COGNITO_USER_POOL_ID),
  cognitoClientId: requireEnv("VITE_COGNITO_CLIENT_ID", import.meta.env.VITE_COGNITO_CLIENT_ID),
};
