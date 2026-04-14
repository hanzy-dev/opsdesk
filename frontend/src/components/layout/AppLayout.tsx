import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/tickets": "Daftar Tiket",
  "/tickets/new": "Buat Tiket",
};

export function AppLayout() {
  const location = useLocation();
  const title =
    location.pathname.startsWith("/tickets/") && location.pathname !== "/tickets/new"
      ? "Detail Tiket"
      : (pageTitles[location.pathname] ?? "OpsDesk");

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <Topbar title={title} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
