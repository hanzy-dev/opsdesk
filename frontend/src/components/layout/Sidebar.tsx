import { NavLink } from "react-router-dom";
import { AppIcon } from "../common/AppIcon";
import { useAuth } from "../../modules/auth/AuthContext";

type SidebarProps = {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onRequestLogout: () => void;
};

type NavItem = {
  to: string;
  label: string;
  icon: "dashboard" | "tickets" | "plus" | "help" | "mine" | "assigned" | "profile" | "settings";
  isVisible: (permissions: ReturnType<typeof useAuth>["permissions"]) => boolean;
};

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard", isVisible: () => true },
  { to: "/tickets", label: "Daftar Tiket", icon: "tickets", isVisible: () => true },
  {
    to: "/tickets/new",
    label: "Buat Tiket",
    icon: "plus",
    isVisible: (permissions) => permissions.canCreateTickets,
  },
  { to: "/help", label: "Pusat Bantuan", icon: "help", isVisible: () => true },
  {
    to: "/tickets/mine",
    label: "Tiket Saya",
    icon: "mine",
    isVisible: (permissions) => !permissions.canViewOperationalTickets,
  },
  {
    to: "/tickets/assigned",
    label: "Ditugaskan ke Saya",
    icon: "assigned",
    isVisible: (permissions) => permissions.canAssignTickets,
  },
  { to: "/profile", label: "Profil", icon: "profile", isVisible: () => true },
  { to: "/settings", label: "Pengaturan", icon: "settings", isVisible: () => true },
];

export function Sidebar({ isCollapsed, isMobileOpen, onCloseMobile, onRequestLogout }: SidebarProps) {
  const { permissions, isSigningOut } = useAuth();
  const visibleItems = navItems.filter((item) => item.isVisible(permissions));
  const logoutLabel = isSigningOut ? "Keluar dari sesi..." : "Keluar dari OpsDesk";

  return (
    <>
      <button
        aria-hidden={!isMobileOpen}
        aria-label="Tutup navigasi"
        className={`sidebar-backdrop ${isMobileOpen ? "sidebar-backdrop--visible" : ""}`}
        onClick={onCloseMobile}
        tabIndex={isMobileOpen ? 0 : -1}
        type="button"
      />
      <aside
        className={`sidebar side-rail side-rail--app ${isCollapsed ? "sidebar--collapsed" : ""} ${isMobileOpen ? "sidebar--mobile-open" : ""}`}
      >
        <div className="sidebar__header side-rail__header">
          <div className="sidebar__brand">
            <div className="sidebar__brand-mark">OD</div>
            <div className="sidebar__brand-copy">
              <p className="sidebar__brand-title">OpsDesk</p>
              <p className="sidebar__brand-subtitle">Helpdesk Internal Berbasis Cloud</p>
            </div>
          </div>
          <div className="sidebar__controls">
            <button
              aria-label="Tutup navigasi"
              className="sidebar__icon-button sidebar__icon-button--mobile"
              onClick={onCloseMobile}
              type="button"
            >
              <AppIcon name="close" size="sm" />
              Tutup
            </button>
          </div>
        </div>

        <div className="sidebar__body side-rail__body">
          <nav className="sidebar__nav side-rail__nav" aria-label="Navigasi utama">
            {visibleItems.map((item) => (
              <NavLink
                end={item.to === "/tickets"}
                key={item.to}
                onClick={onCloseMobile}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? "sidebar__link side-rail__link sidebar__link--active" : "sidebar__link side-rail__link"
                }
              >
                <span aria-hidden="true" className="sidebar__link-icon">
                  <AppIcon name={item.icon} />
                </span>
                <span className="sidebar__link-label">{item.label}</span>
                <span aria-hidden="true" className="sidebar__link-cue">
                  <AppIcon name="chevronRight" size="sm" />
                </span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar__footer side-rail__footer">
          {!isCollapsed ? (
            <div className="sidebar__footer-copy">
              <span>Akses akun</span>
              <p>Keluar tetap tersedia di sini dan di menu akun kanan atas.</p>
            </div>
          ) : null}
          <button
            aria-label={logoutLabel}
            className="button button--secondary sidebar__logout"
            disabled={isSigningOut}
            onClick={() => {
              onCloseMobile();
              onRequestLogout();
            }}
            type="button"
          >
            <AppIcon name="logout" size="sm" />
            <span className="sidebar__logout-label">{logoutLabel}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
