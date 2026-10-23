import { useEffect, useState } from "react";
import { Routes, Route, NavLink } from "react-router";
import DashboardHome from "./pages/DashboardHome";
import InterviewDetail from "./pages/InterviewDetail";
import VacantesList from "./pages/VacantesList";
import VacanteNueva from "./pages/VacanteNueva";
import VacanteDetail from "./pages/VacanteDetail";
import Pipeline from "./pages/Pipeline";
import Usuarios from "./pages/Usuarios";
import Login from "./pages/Login";
import CambiarPasswordForzado from "./pages/CambiarPasswordForzado";
import Superadmin from "./pages/Superadmin";
import ThemeToggle from "./components/ThemeToggle";
import { useTheme } from "./hooks/useTheme";
import { getMe, logout } from "./lib/api";

export default function App() {
  const { theme, toggleTheme } = useTheme();
  // undefined = todavía no se sabe, null = no autenticado, objeto = sesión activa
  const [usuario, setUsuario] = useState(undefined);
  const [menuAbierto, setMenuAbierto] = useState(false);
  // /superadmin vive completamente fuera del flujo de sesión de una
  // organización (otra cookie, ver api/_lib/auth.js) — se resuelve antes que
  // nada, sin tocar getMe() ni el resto del estado de abajo.
  const esSuperadmin = window.location.pathname.startsWith("/superadmin");
  const cerrarMenu = () => setMenuAbierto(false);

  useEffect(() => {
    if (esSuperadmin) return;
    getMe()
      .then(setUsuario)
      .catch(() => setUsuario(null));
  }, [esSuperadmin]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setUsuario(null);
    }
  };

  if (esSuperadmin) {
    return <Superadmin />;
  }

  if (usuario === undefined) {
    return <div className="loading-state">Cargando…</div>;
  }

  if (usuario === null) {
    return <Login onAutenticado={setUsuario} />;
  }

  if (usuario.debeCambiarPassword) {
    return (
      <CambiarPasswordForzado
        onCambiada={() => setUsuario((u) => ({ ...u, debeCambiarPassword: false }))}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <>
      <header className="dash-topbar">
        <div className="dash-topbar-title">
          <div className="dash-topbar-brand">
            {usuario.organizacion?.logoUrl && (
              <img className="dash-topbar-logo" src={usuario.organizacion.logoUrl} alt="" />
            )}
            <h1>{usuario.organizacion?.nombre || "Dashboard RRHH"}</h1>
          </div>
          <p className="subtitle">Entrevistas y vacantes del agente de voz</p>
        </div>

        <div className="dash-topbar-right">
          <div className={`dash-nav-panel ${menuAbierto ? "open" : ""}`}>
            <nav className="dash-nav">
              <NavLink to="/" end onClick={cerrarMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                Entrevistas
              </NavLink>
              <NavLink to="/pipeline" onClick={cerrarMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                Pipeline
              </NavLink>
              <NavLink to="/vacantes" onClick={cerrarMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                Vacantes
              </NavLink>
              <NavLink to="/usuarios" onClick={cerrarMenu} className={({ isActive }) => (isActive ? "active" : "")}>
                Usuarios
              </NavLink>
            </nav>
            <span className="usuario-actual">{usuario.nombre}</span>
            <button
              className="secondary"
              onClick={() => {
                cerrarMenu();
                handleLogout();
              }}
            >
              Cerrar sesión
            </button>
          </div>

          <ThemeToggle theme={theme} onToggle={toggleTheme} />

          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              {menuAbierto ? (
                <path
                  d="M4 4l10 10M14 4L4 14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 5h12M3 9h12M3 13h12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </header>

      <div className="dash-shell">
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/entrevistas/:id" element={<InterviewDetail usuarioActual={usuario} />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/vacantes" element={<VacantesList />} />
          <Route path="/vacantes/nueva" element={<VacanteNueva />} />
          <Route path="/vacantes/:id" element={<VacanteDetail usuarioActual={usuario} />} />
          <Route path="/usuarios" element={<Usuarios usuarioActual={usuario} />} />
        </Routes>
      </div>
    </>
  );
}
