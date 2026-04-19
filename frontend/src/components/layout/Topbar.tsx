import { useNavigate } from "react-router-dom";
import { useAuth } from "../../modules/auth/AuthContext";

type TopbarProps = {
  title: string;
};

export function Topbar({ title }: TopbarProps) {
  const { session, roleLabel, logout, isSigningOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div>
        <p className="section-eyebrow">Operasional</p>
        <h1>{title}</h1>
      </div>

      <div className="topbar__actions">
        <div className="topbar__identity">
          <span className="topbar__avatar">{session?.displayName.slice(0, 1) ?? "D"}</span>
          <div>
            <strong>{session?.displayName ?? "Pengguna OpsDesk"}</strong>
            <p>{roleLabel ? `${roleLabel} • ${session?.email ?? ""}` : session?.email ?? "Sesi aktif"}</p>
          </div>
        </div>
        <button
          className="button button--secondary"
          disabled={isSigningOut}
          onClick={async () => {
            await logout();
            navigate("/login");
          }}
          type="button"
        >
          {isSigningOut ? "Keluar dari sesi..." : "Keluar"}
        </button>
      </div>
    </header>
  );
}
