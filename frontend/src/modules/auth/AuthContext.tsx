import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getMyProfile, updateMyProfile } from "../../api/profile";
import { loginWithCredentials, logoutCurrentSession, restoreAuthSession } from "./authService";
import { canAssignTickets, canCreateTickets, canUpdateTicketStatus, canViewOperationalTickets, getRoleLabel } from "./roles";
import { subscribeToSession, updateStoredSessionProfile } from "./sessionStore";
import type { AuthSession } from "./sessionStore";
import type { UpdateProfileInput, UserProfile } from "../../types/profile";

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: AuthSession | null;
  profile: UserProfile | null;
  isProfileLoading: boolean;
  profileError: string | null;
  roleLabel: string | null;
  permissions: {
    canAssignTickets: boolean;
    canCreateTickets: boolean;
    canUpdateTicketStatus: boolean;
    canViewOperationalTickets: boolean;
  };
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  saveProfile: (input: UpdateProfileInput) => Promise<UserProfile>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToSession(setSession);

    void (async () => {
      const restoredSession = await restoreAuthSession();
      setSession(restoredSession);
      setIsLoading(false);
    })();

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setProfileError(null);
      setIsProfileLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsProfileLoading(true);
      setProfileError(null);

      try {
        const nextProfile = await getMyProfile();
        if (cancelled) {
          return;
        }

        setProfile(nextProfile);
        updateStoredSessionProfile({
          displayName: nextProfile.displayName,
          avatarUrl: nextProfile.avatarUrl,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setProfile({
          subject: session.subject,
          displayName: session.displayName,
          email: session.email,
          avatarUrl: session.avatarUrl,
          role: session.role,
        });
        setProfileError(error instanceof Error ? error.message : "Profil belum dapat dimuat.");
      } finally {
        if (!cancelled) {
          setIsProfileLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.subject]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: session !== null,
      isLoading,
      session,
      profile,
      isProfileLoading,
      profileError,
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
          setProfile(null);
          setProfileError(null);
        } finally {
          setIsLoading(false);
        }
      },
      refreshProfile: async () => {
        if (!session) {
          setProfile(null);
          return;
        }

        setIsProfileLoading(true);
        setProfileError(null);

        try {
          const nextProfile = await getMyProfile();
          setProfile(nextProfile);
          updateStoredSessionProfile({
            displayName: nextProfile.displayName,
            avatarUrl: nextProfile.avatarUrl,
          });
        } catch (error) {
          setProfileError(error instanceof Error ? error.message : "Profil belum dapat dimuat.");
          throw error;
        } finally {
          setIsProfileLoading(false);
        }
      },
      saveProfile: async (input: UpdateProfileInput) => {
        const nextProfile = await updateMyProfile(input);
        setProfile(nextProfile);
        setProfileError(null);
        updateStoredSessionProfile({
          displayName: nextProfile.displayName,
          avatarUrl: nextProfile.avatarUrl,
        });
        return nextProfile;
      },
    }),
    [isLoading, isProfileLoading, profile, profileError, session],
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
