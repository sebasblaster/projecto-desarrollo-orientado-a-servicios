// src/components/ForgotPassword.jsx
import { useState } from "react";
import { solicitarResetPassword } from "../api/client";

export function ForgotPassword({ onBack }) {
  const [identifier, setIdentifier] = useState(""); // username o email
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Datos para la "previsualización de correo"
  const [previewToken, setPreviewToken] = useState("");
  const [previewExpires, setPreviewExpires] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");
    setPreviewToken("");
    setPreviewExpires("");

    if (!identifier.trim()) {
      setError("Debes ingresar tu usuario o correo institucional.");
      return;
    }

    setCargando(true);
    try {
      const resp = await solicitarResetPassword(identifier.trim());
      // resp trae: { ok, message, token, expires_at }
      setMensaje(resp.message || "Se generó el enlace de recuperación.");
      setPreviewToken(resp.token || "");
      setPreviewExpires(resp.expires_at || "");
    } catch (err) {
      console.error(err);
      setError(
        err.message || "No fue posible generar el enlace de recuperación."
      );
    } finally {
      setCargando(false);
    }
  };

  // Enlace “simulado” como si viniera en el correo
  const baseUrl = window.location.origin;
  const previewLink = previewToken
    ? `${baseUrl}/reset-password/${previewToken}`
    : "";

  const handleUseLinkDemo = () => {
    if (previewLink) {
      // Simulamos que el usuario hace clic en el enlace del correo
      window.location.href = previewLink;
    }
  };

  return (
    <div className="col-12 col-md-8 col-lg-6 col-xl-5">
      <div className="card shadow-sm border-0">
        <div className="card-body p-4 p-md-5">
          <h2 className="h4 text-center mb-3">¿Olvidaste tu contraseña?</h2>
          <p
            className="text-muted text-center mb-4"
            style={{ fontSize: "0.9rem" }}
          >
            Ingresa tu <strong>usuario</strong> o{" "}
            <strong>correo institucional</strong>. Te mostraremos una
            previsualización del correo de recuperación (modo local).
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
            <div className="mb-3">
              <label htmlFor="identifier" className="form-label">
                Usuario o correo
              </label>
              <input
                id="identifier"
                type="text"
                className="form-control"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Ej: admin o admin@hsrt.test"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={cargando}
            >
              {cargando
                ? "Generando enlace..."
                : "Generar enlace de recuperación"}
            </button>
          </form>

          {/* PREVISUALIZACIÓN DEL CORREO (solo si ya hay token) */}
          {previewToken && (
            <div className="mt-4">
              <div className="card border-0">
                <div className="card-header py-2">
                  <strong>Previsualización de correo (modo local)</strong>
                </div>
                <div className="card-body" style={{ fontSize: "0.9rem" }}>
                  <p className="mb-1">
                    Esto simula el correo que recibiría el usuario{" "}
                    <strong>{identifier}</strong>.
                  </p>
                  <p className="mb-2">
                    Hola, has solicitado restablecer tu contraseña para el
                    cliente HSRT.
                  </p>
                  <p className="mb-1">
                    Haz clic en el siguiente enlace (o cópialo en tu navegador):
                  </p>
                  <p className="mb-2">
                    <a href={previewLink} className="text-break">
                      {previewLink}
                    </a>
                  </p>
                  <p className="mb-2">
                    Este enlace es válido hasta:{" "}
                    <span className="fw-semibold">
                      {previewExpires || "—"} (UTC).
                    </span>
                  </p>
                  <p className="mb-3">
                    Si tú no solicitaste este cambio, puedes ignorar este
                    mensaje.
                  </p>

                  <div className="d-flex justify-content-between align-items-center">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={handleUseLinkDemo}
                    >
                      Usar este enlace (demo)
                    </button>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-decoration-none"
                      onClick={onBack}
                    >
                      Ir al login
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Si aún no hay token, mostramos solo el enlace de volver */}
          {!previewToken && (
            <div className="text-center mt-3">
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none"
                onClick={onBack}
              >
                Volver al login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
