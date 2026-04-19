import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
          {isMobileNavigation ? "Menu" : isSidebarCollapsed ? ">>" : "<<"}
        </button>
        <div>
          <p className="section-eyebrow">Operasional</p>
          <h1>{title}</h1>
        </div>
      </div>

      <div className="topbar__actions">
        <div className="topbar__account-wrap" ref={menuRef}>
          <button
            className="topbar__account-trigger"
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            <UserAvatar avatarUrl={identity?.avatarUrl} name={preferredDisplayName} />
            <div className="topbar__identity">
              <strong>{preferredDisplayName}</strong>
              <p>{identity?.email ?? "Email akun belum tersedia"}</p>
              <small className="topbar__identity-subtle">{identity?.subject ?? "ID akun belum tersedia"}</small>
            </div>
            <span className="role-pill">{identity ? getRoleLabel(identity.role) : "Akun"}</span>
            <span aria-hidden="true" className={`topbar__chevron ${isOpen ? "topbar__chevron--open" : ""}`}>
              v
            </span>
          </button>

          {isOpen ? (
            <div className="topbar__menu" role="menu">
              <Link
                className="topbar__menu-link"
                onClick={() => setIsOpen(false)}
                role="menuitem"
                to="/profile"
              >
                Profil
              </Link>
              <Link
                className="topbar__menu-link"
                onClick={() => setIsOpen(false)}
                role="menuitem"
                to="/settings"
              >
                Pengaturan
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
                {isSigningOut ? "Keluar dari sesi..." : "Keluar"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
