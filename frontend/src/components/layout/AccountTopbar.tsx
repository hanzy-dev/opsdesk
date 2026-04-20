import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AppIcon } from "../common/AppIcon";
import { UserAvatar } from "../common/UserAvatar";
import { useAuth } from "../../modules/auth/AuthContext";
import { getRoleLabel } from "../../modules/auth/roles";
import { getPreferredDisplayName } from "../../utils/identity";

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
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

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
        return;
      }

      setIsOpen(false);
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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
        <div className="topbar__account-wrap" ref={menuRef}>
          <button
            aria-controls={menuId}
            aria-expanded={isOpen}
            aria-haspopup="menu"
            className="topbar__account-trigger"
            onClick={() => setIsOpen((current) => !current)}
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

          {isOpen ? (
            <div className="topbar__menu topbar__menu--open" id={menuId} role="menu">
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
              {identity?.subject ? <div className="topbar__menu-meta">ID sistem: {identity.subject}</div> : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
