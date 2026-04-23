function normalizeApiBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

const testEnvFallbacks: Record<string, string> = {
  VITE_API_BASE_URL: "https://example.invalid/v1",
  VITE_COGNITO_REGION: "ap-southeast-1",
  VITE_COGNITO_USER_POOL_ID: "ap-southeast-1_ci",
  VITE_COGNITO_CLIENT_ID: "ci-client-id",
};

function isTestMode(): boolean {
  return import.meta.env.MODE === "test";
}

function requireEnv(name: string, value: string | undefined): string {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    if (isTestMode()) {
      const fallbackValue = testEnvFallbacks[name];
      if (fallbackValue) {
        return fallbackValue;
      }
    }

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
