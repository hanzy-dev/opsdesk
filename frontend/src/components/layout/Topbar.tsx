import { useNavigate } from "react-router-dom";
import { useAuth } from "../../modules/auth/AuthContext";

type TopbarProps = {
  title: string;
};

export function Topbar({ title }: TopbarProps) {
  const { session, logout } = useAuth();
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
            <p>Sesi placeholder</p>
          </div>
        </div>
        <button
          className="button button--secondary"
          onClick={() => {
            logout();
            navigate("/login");
          }}
          type="button"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
