// src/App.jsx
import { useState } from "react";
import { LoginForm } from "./components/LoginForm";
import { EmpresasList } from "./components/EmpresasList";
import { UbicacionesList } from "./components/UbicacionesList";
import { ResponsablesList } from "./components/ResponsablesList";
import { EquiposList } from "./components/EquiposList";
import { UsuariosList } from "./components/UsuariosList";
import { Dashboard } from "./components/Dashboard";
import { setAuth, clearAuth } from "./api/client";
import { ForgotPassword } from "./components/ForgotPassword";
import { ResetPassword } from "./components/ResetPassword";

const STORAGE_KEY_USER = "hsrt_user";

function App() {
  // Usuario en sesión (persistido en localStorage)
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USER);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.username) return parsed;
      localStorage.removeItem(STORAGE_KEY_USER);
      return null;
    } catch (err) {
      console.error("Error leyendo usuario desde localStorage", err);
      localStorage.removeItem(STORAGE_KEY_USER);
      return null;
    }
  });

  // Detectar si la URL trae un token de reset (en el path o en query)
  const [routeInfo] = useState(() => {
    const { pathname, search } = window.location;
    let resetToken = "";

    // Opción 1: /reset-password/<token>
    if (pathname.startsWith("/reset-password/")) {
      const parts = pathname.split("/");
      const last = parts[parts.length - 1];
      if (last) resetToken = decodeURIComponent(last);
    } else {
      // Opción 2: ?reset_token=...
      const params = new URLSearchParams(search);
      const t = params.get("reset_token");
      if (t) resetToken = t;
    }

    return {
      initialResetToken: resetToken,
      initialViewNoUser: resetToken ? "reset" : "login",
    };
  });

  const [resetToken, setResetToken] = useState(routeInfo.initialResetToken);

  // vista:
  //  sin sesión: login | forgot | reset
  //  con sesión: dashboard | empresas | ubicaciones | responsables | equipos | usuarios
  const [view, setView] = useState(() => {
    if (user) return "dashboard";
    return routeInfo.initialViewNoUser;
  });

  const handleLogin = (userData) => {
    setUser(userData);
    setView("dashboard");
    // set auth headers for API calls from React client
    try {
      setAuth(userData, "react");
    } catch (err) {
      console.error("Error setting auth headers", err);
    }
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));
    } catch (err) {
      console.error("No se pudo guardar usuario en localStorage", err);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView("login");
    setResetToken("");

    try {
      clearAuth();
    } catch (err) {
      console.error("Error clearing auth headers", err);
    }

    // Limpiar posible URL de reset
    if (window.location.pathname.startsWith("/reset-password")) {
      window.history.replaceState({}, "", "/");
    }

    localStorage.removeItem(STORAGE_KEY_USER);
  };

  // =================================================
  // SIN SESIÓN -> LOGIN / FORGOT / RESET
  // =================================================
  if (!user) {
    return (
      <div className="bg-light min-vh-100 d-flex flex-column">
        {/* HEADER superior simple */}
        <header className="bg-white border-bottom py-2">
          <div className="container d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <img
                src="/logo.png"
                alt="USTA Tunja"
                style={{ height: "40px" }}
              />
              <div>
                <div className="fw-semibold">HSRT Cliente</div>
                <small className="text-muted">
                  Inventario &amp; Mantenimientos
                </small>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENIDO CENTRAL */}
        <main className="flex-grow-1 d-flex align-items-center">
          <div className="container d-flex justify-content-center">
            {view === "login" && (
              <LoginForm
                onLogin={handleLogin}
                onForgot={() => setView("forgot")}
              />
            )}

            {view === "forgot" && (
              <ForgotPassword
                onBack={() => {
                  setView("login");
                }}
              />
            )}

            {view === "reset" && (
              <ResetPassword
                token={resetToken}
                onBack={() => {
                  // Volver al login y limpiar token + URL
                  setView("login");
                  setResetToken("");
                  if (window.location.pathname.startsWith("/reset-password")) {
                    window.history.replaceState({}, "", "/");
                  }
                }}
              />
            )}
          </div>
        </main>

        <footer className="bg-white border-top py-2 mt-auto">
          <div
            className="container text-center text-muted"
            style={{ fontSize: "0.85rem" }}
          >
            Cliente React conectado a Flask (App1 – Servicios HSRT)
          </div>
        </footer>
      </div>
    );
  }

  // =================================================
  // CON SESIÓN -> NAV + VISTAS
  // =================================================
  return (
    <div className="bg-light min-vh-100 d-flex flex-column">
      {/* NAVBAR estilo morado, coherente con el login */}
      <nav
        className="navbar navbar-expand-lg navbar-dark border-bottom"
        style={{ backgroundColor: "#8869c1ff" }}
      >
        <div className="container-fluid">
          {/* Logo + título en el nav */}
          <a className="navbar-brand d-flex align-items-center gap-2" href="#">
            <img
              src="/logo.png"
              alt="USTA Tunja"
              style={{ height: "32px" }}
            />
            <div className="d-flex flex-column lh-1">
              <span className="fw-semibold">HSRT Cliente React</span>
              <small className="text-white-50">
                Inventario &amp; Mantenimientos
              </small>
            </div>
          </a>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNavbar"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="mainNavbar">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              {/* Dashboard */}
              <li className="nav-item">
                <button
                  type="button"
                  className={
                    "nav-link btn btn-link px-2 text-white" +
                    (view === "dashboard" ? " fw-semibold" : "")
                  }
                  onClick={() => setView("dashboard")}
                >
                  <i className="bi bi-speedometer2 me-1"></i>
                  Dashboard
                </button>
              </li>

              {/* Empresas */}
              <li className="nav-item">
                <button
                  type="button"
                  className={
                    "nav-link btn btn-link px-2 text-white" +
                    (view === "empresas" ? " fw-semibold" : "")
                  }
                  onClick={() => setView("empresas")}
                >
                  <i className="bi bi-buildings me-1"></i>
                  Empresas
                </button>
              </li>

              {/* Ubicaciones */}
              <li className="nav-item">
                <button
                  type="button"
                  className={
                    "nav-link btn btn-link px-2 text-white" +
                    (view === "ubicaciones" ? " fw-semibold" : "")
                  }
                  onClick={() => setView("ubicaciones")}
                >
                  <i className="bi bi-geo-alt me-1"></i>
                  Ubicaciones
                </button>
              </li>

              {/* Responsables */}
              <li className="nav-item">
                <button
                  type="button"
                  className={
                    "nav-link btn btn-link px-2 text-white" +
                    (view === "responsables" ? " fw-semibold" : "")
                  }
                  onClick={() => setView("responsables")}
                >
                  <i className="bi bi-person-badge me-1"></i>
                  Responsables
                </button>
              </li>

              {/* Equipos */}
              <li className="nav-item">
                <button
                  type="button"
                  className={
                    "nav-link btn btn-link px-2 text-white" +
                    (view === "equipos" ? " fw-semibold" : "")
                  }
                  onClick={() => setView("equipos")}
                >
                  <i className="bi bi-pc-display-horizontal me-1"></i>
                  Equipos
                </button>
              </li>

              {/* Usuarios */}
              <li className="nav-item">
                <button
                  type="button"
                  className={
                    "nav-link btn btn-link px-2 text-white" +
                    (view === "usuarios" ? " fw-semibold" : "")
                  }
                  onClick={() => setView("usuarios")}
                >
                  <i className="bi bi-people me-1"></i>
                  Usuarios
                </button>
              </li>
            </ul>

            {/* Usuario logueado */}
            <span className="navbar-text me-3 small">
              {user.nombre_completo}{" "}
              <span className="badge bg-light text-dark ms-1">{user.rol}</span>
            </span>
            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right me-1"></i>
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      {/* CONTENIDO */}
      <main className="container my-4 flex-grow-1">
        {view === "dashboard" && <Dashboard onNavigate={setView} />}
        {view === "empresas" && <EmpresasList />}
        {view === "ubicaciones" && <UbicacionesList />}
        {view === "responsables" && <ResponsablesList />}
        {view === "equipos" && <EquiposList />}
        {view === "usuarios" && <UsuariosList />}
      </main>

      <footer className="bg-white border-top py-2 mt-auto">
        <div
          className="container text-center text-muted"
          style={{ fontSize: "0.85rem" }}
        >
          Cliente React (conectado a la capa de servicios) HSRT - Sistema para
          Control de Ingreso de Equipos Tecnológicos y Biomédicos Externos
        </div>
      </footer>
    </div>
  );
}

export default App;
