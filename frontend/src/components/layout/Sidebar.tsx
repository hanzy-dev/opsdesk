import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/tickets", label: "Daftar Tiket" },
  { to: "/tickets/new", label: "Buat Tiket" },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">OD</div>
        <div>
          <p className="sidebar__brand-title">OpsDesk</p>
          <p className="sidebar__brand-subtitle">Cloud Helpdesk Internal</p>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Navigasi utama">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? "sidebar__link sidebar__link--active" : "sidebar__link")}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
