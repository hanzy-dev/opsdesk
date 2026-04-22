import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { listNotifications } from "../../api/notifications";
import { useAuth } from "../auth/AuthContext";
import type { NotificationItem } from "../../types/notification";

type NotificationContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  markAllRead: () => void;
  refreshNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, session } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const storageKey = session ? `opsdesk.notifications.lastReadAt.${session.subject}` : null;
  const [lastReadAt, setLastReadAt] = useState<string>(() => {
    if (typeof window === "undefined" || !storageKey) {
      return "";
    }

    return window.localStorage.getItem(storageKey) ?? "";
  });

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      setLastReadAt("");
      return;
    }

    setLastReadAt(window.localStorage.getItem(storageKey) ?? "");
  }, [storageKey]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const nextNotifications = await listNotifications();
        if (!cancelled) {
          setNotifications(nextNotifications);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isAuthenticated, session?.subject]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((notification) => !lastReadAt || notification.timestamp > lastReadAt).length,
      isLoading,
      markAllRead: () => {
        const nextValue = new Date().toISOString();
        setLastReadAt(nextValue);
        if (storageKey && typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, nextValue);
        }
      },
      refreshNotifications: async () => {
        const nextNotifications = await listNotifications();
        setNotifications(nextNotifications);
      },
    }),
    [isLoading, lastReadAt, notifications, storageKey],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }

  return context;
}
