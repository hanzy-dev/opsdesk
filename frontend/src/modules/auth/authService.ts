import { clearStoredSession, getSessionSnapshot, readStoredSession, writeStoredSession } from "./sessionStore";
import {
  changePassword,
  confirmPasswordReset,
  ensureFreshSession,
  refreshAuthSession,
  requestPasswordReset,
  signInWithPassword,
  signOutFromCognito,
} from "./cognito";

export async function restoreAuthSession() {
  const session = readStoredSession();
  if (!session) {
    return null;
  }

  try {
    const nextSession = await ensureFreshSession(session);
    writeStoredSession(nextSession);
    return nextSession;
  } catch {
    clearStoredSession();
    return null;
  }
}

export async function loginWithCredentials(email: string, password: string) {
  const session = await signInWithPassword(email, password);
  writeStoredSession(session);
  return session;
}

export async function logoutCurrentSession() {
  const session = getSessionSnapshot();
  clearStoredSession();

  if (!session) {
    return;
  }

  try {
    await signOutFromCognito(session.accessToken);
  } catch {
    // Local session is already cleared; backend requests will require login again.
  }
}

export async function getValidIdToken() {
  const session = getSessionSnapshot();
  if (!session) {
    return null;
  }

  try {
    const nextSession =
      session.expiresAt - Date.now() > 60_000 ? session : await refreshAuthSession(session);
    writeStoredSession(nextSession);
    return nextSession.idToken;
  } catch {
    clearStoredSession();
    return null;
  }
}

export async function startForgotPassword(email: string) {
  await requestPasswordReset(email);
}

export async function completeForgotPassword(email: string, confirmationCode: string, nextPassword: string) {
  await confirmPasswordReset(email, confirmationCode, nextPassword);
}

export async function changeCurrentPassword(currentPassword: string, nextPassword: string) {
  const session = getSessionSnapshot();
  if (!session) {
    throw new Error("Sesi tidak tersedia. Silakan masuk kembali.");
  }

  await changePassword(session.accessToken, currentPassword, nextPassword);
}
