import { env } from "../../config/env";
import { resolveRole } from "./roles";
import type { AuthSession } from "./sessionStore";

type CognitoAuthenticationResult = {
  AccessToken?: string;
  IdToken?: string;
  RefreshToken?: string;
  ExpiresIn?: number;
  TokenType?: string;
};

type InitiateAuthResponse = {
  AuthenticationResult?: CognitoAuthenticationResult;
};

type JwtPayload = Record<string, unknown>;

const cognitoEndpoint = `https://cognito-idp.${env.cognitoRegion}.amazonaws.com/`;
const refreshLeewayMs = 60_000;

class CognitoAuthError extends Error {
  code: string;
  status: number;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "CognitoAuthError";
    this.status = status;
    this.code = code;
  }
}

export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  const response = await cognitoRequest<InitiateAuthResponse>("AWSCognitoIdentityProviderService.InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: env.cognitoClientId,
    AuthParameters: {
      USERNAME: email.trim(),
      PASSWORD: password,
    },
  });

  return buildAuthSession(response.AuthenticationResult, undefined);
}

export async function refreshAuthSession(existingSession: AuthSession): Promise<AuthSession> {
  const response = await cognitoRequest<InitiateAuthResponse>("AWSCognitoIdentityProviderService.InitiateAuth", {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: env.cognitoClientId,
    AuthParameters: {
      REFRESH_TOKEN: existingSession.refreshToken,
    },
  });

  return buildAuthSession(response.AuthenticationResult, existingSession.refreshToken);
}

export async function signOutFromCognito(accessToken: string) {
  await cognitoRequest("AWSCognitoIdentityProviderService.GlobalSignOut", {
    AccessToken: accessToken,
  });
}

export async function ensureFreshSession(session: AuthSession) {
  if (session.expiresAt - Date.now() > refreshLeewayMs) {
    return session;
  }

  return refreshAuthSession(session);
}

function buildAuthSession(result: CognitoAuthenticationResult | undefined, fallbackRefreshToken: string | undefined): AuthSession {
  if (!result?.AccessToken || !result.IdToken || !result.ExpiresIn) {
    throw new CognitoAuthError("Respons autentikasi dari Cognito tidak lengkap.", 500, "invalid_auth_response");
  }

  const refreshToken = result.RefreshToken ?? fallbackRefreshToken;
  if (!refreshToken) {
    throw new CognitoAuthError("Sesi autentikasi tidak memiliki refresh token yang valid.", 500, "missing_refresh_token");
  }

  const idTokenClaims = parseJwtPayload(result.IdToken);
  const email = getStringClaim(idTokenClaims, "email");

  const groups = getStringArrayClaim(idTokenClaims, "cognito:groups");

  return {
    accessToken: result.AccessToken,
    idToken: result.IdToken,
    refreshToken,
    expiresAt: Date.now() + result.ExpiresIn * 1000,
    email,
    displayName: getDisplayName(idTokenClaims, email),
    groups,
    role: resolveRole(groups),
  };
}

function getDisplayName(claims: JwtPayload, fallbackEmail: string) {
  return (
    getOptionalStringClaim(claims, "name") ??
    getOptionalStringClaim(claims, "cognito:username") ??
    fallbackEmail
  );
}

function getStringClaim(claims: JwtPayload, name: string) {
  const value = getOptionalStringClaim(claims, name);
  if (!value) {
    throw new CognitoAuthError(`Token autentikasi tidak memiliki klaim ${name} yang diperlukan.`, 500, "invalid_token_claims");
  }

  return value;
}

function getOptionalStringClaim(claims: JwtPayload, name: string) {
  const value = claims[name];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function getStringArrayClaim(claims: JwtPayload, name: string) {
  const value = claims[name];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function parseJwtPayload(token: string): JwtPayload {
  const segments = token.split(".");
  if (segments.length !== 3) {
    throw new CognitoAuthError("Token autentikasi tidak valid.", 500, "invalid_token");
  }

  const payload = segments[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  try {
    const decoded = window.atob(padded);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    throw new CognitoAuthError("Token autentikasi tidak dapat dibaca.", 500, "invalid_token_payload");
  }
}

async function cognitoRequest<T>(target: string, body: Record<string, unknown>): Promise<T> {
  let response: Response;

  try {
    response = await fetch(cognitoEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": target,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new CognitoAuthError("Layanan autentikasi belum dapat dihubungi. Periksa koneksi lalu coba lagi.", 0, "auth_network_error");
  }

  const payload = (await response.json().catch(() => null)) as
    | (T & { __type?: string; message?: string })
    | { __type?: string; message?: string }
    | null;

  if (!response.ok) {
    throw new CognitoAuthError(resolveCognitoErrorMessage(payload?.__type, payload?.message), response.status, payload?.__type ?? "auth_error");
  }

  return payload as T;
}

function resolveCognitoErrorMessage(errorType?: string, message?: string) {
  switch (errorType) {
    case "NotAuthorizedException":
      return "Email atau kata sandi tidak sesuai.";
    case "UserNotFoundException":
      return "Akun tidak ditemukan.";
    case "UserNotConfirmedException":
      return "Akun belum dikonfirmasi. Hubungi administrator.";
    case "PasswordResetRequiredException":
      return "Akun memerlukan reset kata sandi sebelum dapat digunakan.";
    case "TooManyRequestsException":
      return "Terlalu banyak percobaan masuk. Coba lagi beberapa saat.";
    default:
      return message?.trim() || "Autentikasi belum dapat diproses saat ini.";
  }
}
