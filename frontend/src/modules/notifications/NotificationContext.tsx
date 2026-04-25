import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/client";
import { listNotifications } from "../../api/notifications";
import { useAuth } from "../auth/AuthContext";
import type { NotificationItem } from "../../types/notification";

const notificationPollIntervalMs = 60000;
const maxConsecutiveTransientFailures = 3;
const terminalNotificationStatuses = new Set([401, 403, 404]);

type NotificationContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  markAllRead: () => void;
  refreshNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading, session } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPollingPaused, setIsPollingPaused] = useState(false);
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
    setIsPollingPaused(false);
  }, [session?.subject]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated || !session) {
      setNotifications([]);
      setIsLoading(false);
      setIsPollingPaused(false);
      return;
    }

    if (isPollingPaused) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let consecutiveFailures = 0;

    const load = async () => {
      setIsLoading(true);
      try {
        const nextNotifications = await listNotifications();
        if (!cancelled) {
          setNotifications(nextNotifications);
          consecutiveFailures = 0;
        }
      } catch (error) {
        if (!cancelled) {
          setNotifications([]);
          consecutiveFailures += 1;

          if (shouldPauseNotificationPolling(error, consecutiveFailures)) {
            setIsPollingPaused(true);
          }
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
    }, notificationPollIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isAuthLoading, isAuthenticated, isPollingPaused, session?.subject]);

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
        if (!isAuthenticated || !session) {
          setNotifications([]);
          return;
        }

        try {
          setIsPollingPaused(false);
          const nextNotifications = await listNotifications();
          setNotifications(nextNotifications);
        } catch (error) {
          setNotifications([]);
          if (shouldPauseNotificationPolling(error, 1)) {
            setIsPollingPaused(true);
          }
        }
      },
    }),
    [isAuthenticated, isLoading, lastReadAt, notifications, session, storageKey],
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

function shouldPauseNotificationPolling(error: unknown, consecutiveFailures: number) {
  if (error instanceof ApiError && terminalNotificationStatuses.has(error.status)) {
    return true;
  }

  return consecutiveFailures >= maxConsecutiveTransientFailures;
}
