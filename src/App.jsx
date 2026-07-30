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
import ThemeToggle from "./components/ThemeToggle";
import { useTheme } from "./hooks/useTheme";
import { getMe, logout } from "./lib/api";

export default function App() {
  const { theme, toggleTheme } = useTheme();
  // undefined = todavía no se sabe, null = no autenticado, objeto = sesión activa
  const [usuario, setUsuario] = useState(undefined);

  useEffect(() => {
    getMe()
      .then(setUsuario)
      .catch(() => setUsuario(null));
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setUsuario(null);
    }
  };

  if (usuario === undefined) {
    return <div className="loading-state">Cargando…</div>;
  }

  if (usuario === null) {
    return <Login onAutenticado={setUsuario} />;
  }

  return (
    <>
      <header className="dash-topbar">
        <div>
          <h1>Dashboard RRHH</h1>
          <p className="subtitle">Entrevistas y vacantes del agente de voz</p>
        </div>
        <div className="dash-topbar-right">
          <nav className="dash-nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
              Entrevistas
            </NavLink>
            <NavLink to="/pipeline" className={({ isActive }) => (isActive ? "active" : "")}>
              Pipeline
            </NavLink>
            <NavLink to="/vacantes" className={({ isActive }) => (isActive ? "active" : "")}>
              Vacantes
            </NavLink>
            <NavLink to="/usuarios" className={({ isActive }) => (isActive ? "active" : "")}>
              Usuarios
            </NavLink>
          </nav>
          <span className="usuario-actual">{usuario.nombre}</span>
          <button className="secondary" onClick={handleLogout}>
            Cerrar sesión
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <div className="dash-shell">
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/entrevistas/:id" element={<InterviewDetail />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/vacantes" element={<VacantesList />} />
          <Route path="/vacantes/nueva" element={<VacanteNueva />} />
          <Route path="/vacantes/:id" element={<VacanteDetail />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Routes>
      </div>
    </>
  );
}
