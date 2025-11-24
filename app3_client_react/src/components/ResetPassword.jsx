// src/components/ResetPassword.jsx
import { useState, useEffect } from "react";
import { resetearPassword } from "../api/client";

export function ResetPassword({ token: initialToken = "", onBack }) {
  const [token, setToken] = useState(initialToken || "");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const hasExternalToken = Boolean(initialToken && initialToken.trim());

  useEffect(() => {
    if (initialToken) {
      setToken(initialToken);
    }
  }, [initialToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!token.trim()) {
      setError("El token de recuperación es obligatorio.");
      return;
    }
    if (!password.trim()) {
      setError("La nueva contraseña es obligatoria.");
      return;
    }
    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      const resp = await resetearPassword(token.trim(), password.trim());
      setMensaje(resp.message || "Contraseña actualizada correctamente.");
    } catch (err) {
      console.error(err);
      setError(err.message || "No fue posible actualizar la contraseña.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="col-12 col-md-8 col-lg-5 col-xl-4">
      <div className="card shadow-sm border-0">
        <div className="card-body p-4 p-md-5">
          <h2 className="h4 text-center mb-3">Nueva contraseña</h2>
          <p
            className="text-muted text-center mb-4"
            style={{ fontSize: "0.9rem" }}
          >
            Define una nueva contraseña para tu cuenta del cliente HSRT.
          </p>

          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}

          {mensaje && (
            <div className="alert alert-success py-2" role="alert">
              {mensaje}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {hasExternalToken ? (
              <div className="mb-3">
                <label className="form-label">Token de recuperación</label>
                <div className="alert alert-secondary py-2 mb-0" role="alert">
                  <small className="text-muted d-block mb-1">
                    Token recibido automáticamente desde el enlace:
                  </small>
                  <code className="d-block text-break">{token}</code>
                </div>
              </div>
            ) : (
              <div className="mb-3">
                <label htmlFor="resetToken" className="form-label">
                  Token de recuperación
                </label>
                <input
                  id="resetToken"
                  type="text"
                  className="form-control"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Pega aquí el token recibido (modo pruebas)"
                />
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="newPassword" className="form-label">
                Nueva contraseña
              </label>
              <input
                id="newPassword"
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">
                Confirmar nueva contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="form-control"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={cargando}
            >
              {cargando ? "Actualizando..." : "Actualizar contraseña"}
            </button>

            <div className="text-center mt-3">
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none"
                onClick={onBack}
              >
                Volver al login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
