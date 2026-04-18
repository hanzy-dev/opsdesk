import { NavLink } from "react-router-dom";
import { useAuth } from "../../modules/auth/AuthContext";

type SidebarProps = {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
};

type NavItem = {
  to: string;
  label: string;
  shortLabel: string;
  isVisible: (permissions: ReturnType<typeof useAuth>["permissions"]) => boolean;
};

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", shortLabel: "DS", isVisible: () => true },
  { to: "/tickets", label: "Daftar Tiket", shortLabel: "DT", isVisible: () => true },
  {
    to: "/tickets/new",
    label: "Buat Tiket",
    shortLabel: "BT",
    isVisible: (permissions) => permissions.canCreateTickets,
  },
  {
    to: "/tickets/mine",
    label: "Tiket Saya",
    shortLabel: "TS",
    isVisible: (permissions) => !permissions.canViewOperationalTickets,
  },
  {
    to: "/tickets/assigned",
    label: "Ditugaskan ke Saya",
    shortLabel: "DM",
    isVisible: (permissions) => permissions.canAssignTickets,
  },
  { to: "/profile", label: "Profil", shortLabel: "PR", isVisible: () => true },
  { to: "/settings", label: "Pengaturan", shortLabel: "PG", isVisible: () => true },
];

export function Sidebar({ isCollapsed, isMobileOpen, onCloseMobile, onToggleCollapsed }: SidebarProps) {
  const { permissions } = useAuth();
  const visibleItems = navItems.filter((item) => item.isVisible(permissions));

  return (
    <>
      <button
        aria-hidden={!isMobileOpen}
        className={`sidebar-backdrop ${isMobileOpen ? "sidebar-backdrop--visible" : ""}`}
        onClick={onCloseMobile}
        tabIndex={isMobileOpen ? 0 : -1}
        type="button"
      />
      <aside
        className={`sidebar ${isCollapsed ? "sidebar--collapsed" : ""} ${isMobileOpen ? "sidebar--mobile-open" : ""}`}
      >
        <div className="sidebar__header">
          <div className="sidebar__brand">
            <div className="sidebar__brand-mark">OD</div>
            <div className="sidebar__brand-copy">
              <p className="sidebar__brand-title">OpsDesk</p>
              <p className="sidebar__brand-subtitle">Cloud Helpdesk Internal</p>
            </div>
          </div>
          <div className="sidebar__controls">
            <button
              aria-label={isCollapsed ? "Perluas navigasi" : "Ciutkan navigasi"}
              className="sidebar__icon-button sidebar__icon-button--desktop"
              onClick={onToggleCollapsed}
              type="button"
            >
              {isCollapsed ? ">>" : "<<"}
            </button>
            <button
              aria-label="Tutup navigasi"
              className="sidebar__icon-button sidebar__icon-button--mobile"
              onClick={onCloseMobile}
              type="button"
            >
              Tutup
            </button>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Navigasi utama">
          {visibleItems.map((item) => (
            <NavLink
              end={item.to === "/tickets"}
              key={item.to}
              onClick={onCloseMobile}
              to={item.to}
              className={({ isActive }) => (isActive ? "sidebar__link sidebar__link--active" : "sidebar__link")}
            >
              <span aria-hidden="true" className="sidebar__link-icon">
                {item.shortLabel}
              </span>
              <span className="sidebar__link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
