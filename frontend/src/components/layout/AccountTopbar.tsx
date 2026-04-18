import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserAvatar } from "../common/UserAvatar";
import { useAuth } from "../../modules/auth/AuthContext";
import { getRoleLabel } from "../../modules/auth/roles";

type AccountTopbarProps = {
  title: string;
};

export function AccountTopbar({ title }: AccountTopbarProps) {
  const { session, profile, logout, isLoading } = useAuth();
  const navigate = useNavigate();
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
      <div>
        <p className="section-eyebrow">Operasional</p>
        <h1>{title}</h1>
      </div>

      <div className="topbar__actions">
        <div className="topbar__account-wrap" ref={menuRef}>
          <button
            className="topbar__account-trigger"
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            <UserAvatar avatarUrl={identity?.avatarUrl} name={identity?.displayName ?? "Pengguna OpsDesk"} />
            <div className="topbar__identity">
              <strong>{identity?.displayName ?? "Pengguna OpsDesk"}</strong>
              <p>{identity?.email ?? "Sesi aktif"}</p>
              <small className="topbar__identity-subtle">{identity?.subject ?? "ID pengguna belum tersedia"}</small>
            </div>
            <span className="role-pill">{identity ? getRoleLabel(identity.role) : "Akun"}</span>
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
              <button
                className="topbar__menu-link topbar__menu-link--button"
                disabled={isLoading}
                onClick={async () => {
                  setIsOpen(false);
                  await logout();
                  navigate("/login");
                }}
                role="menuitem"
                type="button"
              >
                {isLoading ? "Memproses..." : "Keluar"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
