import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { AccountTopbar } from "./AccountTopbar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/tickets": "Daftar Tiket",
  "/tickets/mine": "Tiket Saya",
  "/tickets/assigned": "Ditugaskan ke Saya",
  "/tickets/new": "Buat Tiket",
  "/profile": "Profil",
  "/settings": "Pengaturan Akun",
};

const sidebarPreferenceKey = "opsdesk.sidebar.collapsed";

export function AppLayout() {
  const location = useLocation();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(sidebarPreferenceKey) === "true";
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 1080px)");
    const updateViewport = () => {
      setIsMobileViewport(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setIsMobileSidebarOpen(false);
      }
    };

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(sidebarPreferenceKey, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const title =
    location.pathname.startsWith("/tickets/") && location.pathname !== "/tickets/new"
      ? (pageTitles[location.pathname] ?? "Detail Tiket")
      : (pageTitles[location.pathname] ?? "OpsDesk");

  function handleNavigationToggle() {
    if (isMobileViewport) {
      setIsMobileSidebarOpen((current) => !current);
      return;
    }

    setIsSidebarCollapsed((current) => !current);
  }

  return (
    <div className={`app-shell ${isSidebarCollapsed && !isMobileViewport ? "app-shell--collapsed" : ""}`}>
      <Sidebar
        isCollapsed={isSidebarCollapsed && !isMobileViewport}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
      />
      <div className="app-shell__main">
        <AccountTopbar
          isMobileNavigation={isMobileViewport}
          isSidebarCollapsed={isSidebarCollapsed && !isMobileViewport}
          onNavigationToggle={handleNavigationToggle}
          title={title}
        />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
