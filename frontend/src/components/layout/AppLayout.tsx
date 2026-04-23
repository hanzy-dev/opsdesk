import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ConfirmationDialog } from "../common/ConfirmationDialog";
import { useToast } from "../common/ToastProvider";
import { useAuth } from "../../modules/auth/AuthContext";
import { NotificationProvider } from "../../modules/notifications/NotificationContext";
import { Sidebar } from "./Sidebar";
import { AccountTopbar } from "./AccountTopbar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/tickets": "Daftar Tiket",
  "/tickets/mine": "Tiket Saya",
  "/tickets/assigned": "Ditugaskan ke Saya",
  "/tickets/new": "Buat Tiket",
  "/help": "Pusat Bantuan",
  "/profile": "Profil",
  "/settings": "Pengaturan Akun",
};

const sidebarPreferenceKey = "opsdesk.sidebar.collapsed";

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { logout, isSigningOut } = useAuth();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(sidebarPreferenceKey) === "true";
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

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

  useEffect(() => {
    setIsRouteTransitioning(true);
    const timer = window.setTimeout(() => {
      setIsRouteTransitioning(false);
    }, 280);

    return () => {
      window.clearTimeout(timer);
    };
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
        onRequestLogout={() => setIsLogoutDialogOpen(true)}
      />
      <div className="app-shell__main">
        <div
          aria-hidden="true"
          className={`page-progress ${isRouteTransitioning ? "page-progress--active" : ""}`}
        />
        <NotificationProvider>
          <AccountTopbar
            isMobileNavigation={isMobileViewport}
            isSidebarCollapsed={isSidebarCollapsed && !isMobileViewport}
            onNavigationToggle={handleNavigationToggle}
            onRequestLogout={() => setIsLogoutDialogOpen(true)}
            title={title}
          />
          <main className="page-content">
            <Outlet />
          </main>
        </NotificationProvider>
      </div>
      <ConfirmationDialog
        cancelLabel="Batal"
        confirmLabel="Keluar"
        isOpen={isLogoutDialogOpen}
        isSubmitting={isSigningOut}
        message="Anda yakin ingin keluar dari sesi OpsDesk saat ini?"
        onCancel={() => setIsLogoutDialogOpen(false)}
        onConfirm={async () => {
          try {
            await logout();
            setIsLogoutDialogOpen(false);
            navigate("/login");
          } catch (error) {
            showToast({
              title: "Sesi belum berhasil ditutup",
              description:
                error instanceof Error
                  ? error.message
                  : "Keluar dari sesi belum berhasil. Silakan coba beberapa saat lagi.",
              tone: "error",
            });
          }
        }}
        title="Keluar dari OpsDesk"
      />
    </div>
  );
}
