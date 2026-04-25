import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AppIcon } from "../common/AppIcon";
import { EmptyState } from "../common/EmptyState";
import { UserAvatar } from "../common/UserAvatar";
import { useAuth } from "../../modules/auth/AuthContext";
import { useNotifications } from "../../modules/notifications/NotificationContext";
import { getRoleLabel } from "../../modules/auth/roles";
import { getPreferredDisplayName } from "../../utils/identity";
import { usePrefersReducedMotion } from "../../utils/usePrefersReducedMotion";

type AccountTopbarProps = {
  title: string;
  isMobileNavigation: boolean;
  isSidebarCollapsed: boolean;
  onNavigationToggle: () => void;
  onRequestLogout: () => void;
};

export function AccountTopbar({
  title,
  isMobileNavigation,
  isSidebarCollapsed,
  onNavigationToggle,
  onRequestLogout,
}: AccountTopbarProps) {
  const { session, profile, isSigningOut } = useAuth();
  const { notifications, unreadCount, isLoading, markAllRead } = useNotifications();
  const prefersReducedMotion = usePrefersReducedMotion();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const notificationId = useId();
  const menuPresence = useAnimatedPresence(isOpen, prefersReducedMotion);
  const notificationPresence = useAnimatedPresence(isNotificationsOpen, prefersReducedMotion);

  const identity = profile
    ? profile
    : session
      ? {
          subject: session.subject,
          displayName: session.displayName,
          email: session.email,
          avatarUrl: session.avatarUrl,
          role: session.role,
        }
      : null;
  const preferredDisplayName = getPreferredDisplayName(identity);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current || menuRef.current.contains(event.target as Node)) {
      } else {
        setIsOpen(false);
      }

      if (!notificationRef.current || notificationRef.current.contains(event.target as Node)) {
        return;
      }

      setIsNotificationsOpen(false);
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setIsNotificationsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen && !isNotificationsOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsNotificationsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNotificationsOpen, isOpen]);

  return (
    <header className="topbar">
      <div className="topbar__leading">
        <button
          aria-label={
            isMobileNavigation
              ? "Buka navigasi"
              : isSidebarCollapsed
                ? "Perluas sidebar"
                : "Ciutkan sidebar"
          }
          className="topbar__nav-trigger"
          onClick={onNavigationToggle}
          type="button"
        >
          <AppIcon name={isMobileNavigation ? "menu" : isSidebarCollapsed ? "panelOpen" : "panelClose"} size="sm" />
          <span>{isMobileNavigation ? "Menu" : isSidebarCollapsed ? "Buka" : "Ciutkan"}</span>
        </button>
        <div>
          <p className="section-eyebrow">Operasional</p>
          <h1>{title}</h1>
        </div>
      </div>

      <div className="topbar__actions">
        <div className="topbar__notification-wrap" ref={notificationRef}>
          <button
            aria-controls={notificationId}
            aria-expanded={isNotificationsOpen}
            aria-haspopup="menu"
            className="topbar__notification-trigger"
            onClick={() => {
              setIsNotificationsOpen((current) => {
                const nextOpen = !current;
                if (nextOpen) {
                  markAllRead();
                  setIsOpen(false);
                }
                return nextOpen;
              });
            }}
            type="button"
          >
            <span className="topbar__notification-icon">
              <AppIcon name="notification" size="sm" />
            </span>
            {unreadCount > 0 ? <span className="topbar__notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
            <span className="topbar__notification-copy">
              <strong>Notifikasi</strong>
              <small>{unreadCount > 0 ? `${unreadCount} baru` : "Semua sudah terbaca"}</small>
            </span>
          </button>

          {notificationPresence.isMounted ? (
            <div
              className={`topbar__menu topbar__notification-menu ${
                notificationPresence.isVisible ? "topbar__menu--open" : "topbar__menu--closing"
              }`}
              id={notificationId}
              role="menu"
            >
              <div className="topbar__menu-header">
                <div className="topbar__menu-header-copy">
                  <span>Notifikasi</span>
                  <strong>Pembaruan operasional</strong>
                  <p>Tray ini diperbarui berkala dan tidak bersifat realtime penuh.</p>
                </div>
                {unreadCount > 0 ? <span className="role-pill">{unreadCount} baru</span> : null}
              </div>
              <div className="topbar__notification-list">
                {isLoading && notifications.length === 0 ? <p className="topbar__menu-meta">Memuat notifikasi...</p> : null}
                {!isLoading && notifications.length === 0 ? (
                  <div className="topbar__notification-empty">
                    <EmptyState
                      eyebrow="Notifikasi"
                      title="Semua sudah terbaca"
                      description="Tray ini akan menampilkan perubahan tiket, komentar, dan aktivitas penting yang perlu Anda lihat."
                      supportText="Untuk saat ini tidak ada notifikasi baru yang perlu ditinjau dari akun ini."
                    />
                  </div>
                ) : null}
                {notifications.map((notification) => (
                  <Link
                    className="topbar__notification-item"
                    key={notification.id}
                    onClick={() => setIsNotificationsOpen(false)}
                    role="menuitem"
                    to={notification.link}
                  >
                    <div className="topbar__notification-item-copy">
                      <strong>{notification.title}</strong>
                      <p>{notification.message}</p>
                      <small>{notification.actorName ? `${notification.actorName} • ` : ""}{new Date(notification.timestamp).toLocaleString("id-ID")}</small>
                    </div>
                    <AppIcon name="chevronRight" size="sm" />
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="topbar__account-wrap" ref={menuRef}>
          <button
            aria-controls={menuId}
            aria-expanded={isOpen}
            aria-haspopup="menu"
            className="topbar__account-trigger"
            onClick={() => {
              setIsNotificationsOpen(false);
              setIsOpen((current) => !current);
            }}
            type="button"
          >
            <div className="topbar__account-main">
              <UserAvatar avatarUrl={identity?.avatarUrl} name={preferredDisplayName} />
              <div className="topbar__identity">
                <span className="topbar__identity-label">Akun aktif</span>
                <strong>{preferredDisplayName}</strong>
                <p>{identity?.email ?? "Email akun belum tersedia"}</p>
                <small className="topbar__identity-subtle">Profil pribadi aktif</small>
              </div>
            </div>
            <div className="topbar__account-side">
              <span className="role-pill">{identity ? getRoleLabel(identity.role) : "Akun"}</span>
              <span className="topbar__account-cue">
                <span className="topbar__account-cue-text">{isOpen ? "Tutup menu" : "Buka menu"}</span>
                <span aria-hidden="true" className={`topbar__chevron ${isOpen ? "topbar__chevron--open" : ""}`}>
                  <AppIcon name="chevronDown" size="sm" />
                </span>
              </span>
            </div>
          </button>

          {menuPresence.isMounted ? (
            <div className={`topbar__menu ${menuPresence.isVisible ? "topbar__menu--open" : "topbar__menu--closing"}`} id={menuId} role="menu">
              <div className="topbar__menu-header">
                <div className="topbar__menu-header-copy">
                  <span>Akun aktif</span>
                  <strong>{preferredDisplayName}</strong>
                  <p>{identity?.email ?? "Email akun belum tersedia"}</p>
                </div>
                <span className="role-pill">{identity ? getRoleLabel(identity.role) : "Akun"}</span>
              </div>
              <Link className="topbar__menu-link" onClick={() => setIsOpen(false)} role="menuitem" to="/profile">
                <span className="topbar__menu-item">
                  <AppIcon name="profile" size="sm" />
                  <span>Profil</span>
                </span>
                <AppIcon name="chevronRight" size="sm" />
              </Link>
              <Link className="topbar__menu-link" onClick={() => setIsOpen(false)} role="menuitem" to="/settings">
                <span className="topbar__menu-item">
                  <AppIcon name="settings" size="sm" />
                  <span>Pengaturan</span>
                </span>
                <AppIcon name="chevronRight" size="sm" />
              </Link>
              <button
                className="topbar__menu-link topbar__menu-link--button"
                disabled={isSigningOut}
                onClick={() => {
                  setIsOpen(false);
                  onRequestLogout();
                }}
                role="menuitem"
                type="button"
              >
                <span className="topbar__menu-item">
                  <AppIcon name="logout" size="sm" />
                  <span>{isSigningOut ? "Keluar dari sesi..." : "Keluar"}</span>
                </span>
                <AppIcon name="chevronRight" size="sm" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function useAnimatedPresence(isOpen: boolean, prefersReducedMotion: boolean) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsMounted(isOpen);
      setIsVisible(isOpen);
      return;
    }

    if (isOpen) {
      setIsMounted(true);
      const frame = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => {
      setIsMounted(false);
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen, prefersReducedMotion]);

  return { isMounted, isVisible };
}
