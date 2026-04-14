import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type DemoSession = {
  displayName: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  session: DemoSession | null;
  loginDemo: (displayName: string) => void;
  logout: () => void;
};

const storageKey = "opsdesk.demo.session";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(null);

  useEffect(() => {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return;
    }

    try {
      const parsed = JSON.parse(rawValue) as DemoSession;
      setSession(parsed);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: session !== null,
      session,
      loginDemo: (displayName: string) => {
        const nextSession = { displayName };
        setSession(nextSession);
        window.localStorage.setItem(storageKey, JSON.stringify(nextSession));
      },
      logout: () => {
        setSession(null);
        window.localStorage.removeItem(storageKey);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
