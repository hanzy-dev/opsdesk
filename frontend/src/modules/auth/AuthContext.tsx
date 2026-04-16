import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginWithCredentials, logoutCurrentSession, restoreAuthSession } from "./authService";
import { canAssignTickets, canCreateTickets, canUpdateTicketStatus, canViewOperationalTickets, getRoleLabel } from "./roles";
import { subscribeToSession } from "./sessionStore";
import type { AuthSession } from "./sessionStore";

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: AuthSession | null;
  roleLabel: string | null;
  permissions: {
    canAssignTickets: boolean;
    canCreateTickets: boolean;
    canUpdateTicketStatus: boolean;
    canViewOperationalTickets: boolean;
  };
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToSession(setSession);

    void (async () => {
      const restoredSession = await restoreAuthSession();
      setSession(restoredSession);
      setIsLoading(false);
    })();

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: session !== null,
      isLoading,
      session,
      roleLabel: session ? getRoleLabel(session.role) : null,
      permissions: {
        canAssignTickets: session ? canAssignTickets(session.role) : false,
        canCreateTickets: session ? canCreateTickets(session.role) : false,
        canUpdateTicketStatus: session ? canUpdateTicketStatus(session.role) : false,
        canViewOperationalTickets: session ? canViewOperationalTickets(session.role) : false,
      },
      login: async (email: string, password: string) => {
        setIsLoading(true);
        try {
          await loginWithCredentials(email, password);
        } finally {
          setIsLoading(false);
        }
      },
      logout: async () => {
        setIsLoading(true);
        try {
          await logoutCurrentSession();
        } finally {
          setIsLoading(false);
        }
      },
    }),
    [isLoading, session],
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
