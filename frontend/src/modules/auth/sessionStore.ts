export type AuthSession = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
  displayName: string;
  groups: string[];
  role: "reporter" | "agent" | "admin";
};

const storageKey = "opsdesk.auth.session";

let currentSession: AuthSession | null = null;
const listeners = new Set<(session: AuthSession | null) => void>();

export function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return currentSession;
  }

  if (currentSession) {
    return currentSession;
  }

  const rawValue = window.localStorage.getItem(storageKey);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as AuthSession;
    currentSession = parsed;
    return parsed;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export function writeStoredSession(session: AuthSession) {
  currentSession = session;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, JSON.stringify(session));
  }

  notifyListeners();
}

export function clearStoredSession() {
  currentSession = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(storageKey);
  }

  notifyListeners();
}

export function getSessionSnapshot() {
  return readStoredSession();
}

export function subscribeToSession(listener: (session: AuthSession | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  for (const listener of listeners) {
    listener(currentSession);
  }
}
