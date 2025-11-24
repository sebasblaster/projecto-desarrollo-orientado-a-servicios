// src/components/LoginForm.jsx
import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../api/client";

const RECAPTCHA_SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
  "6LcLzQ8sAAAAACfHZ-w5hJB80HW1nlgo1MJU46sy";

export function LoginForm({ onLogin, onForgot }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const recaptchaContainerRef = useRef(null);
  const recaptchaWidgetIdRef = useRef(null);

  // Render del reCAPTCHA v2
  useEffect(() => {
    let intervalId = null;

    function tryRenderRecaptcha() {
      const grecaptcha = window.grecaptcha;
      if (grecaptcha && grecaptcha.render && recaptchaContainerRef.current) {
        if (recaptchaWidgetIdRef.current == null) {
          const widgetId = grecaptcha.render(recaptchaContainerRef.current, {
            sitekey: RECAPTCHA_SITE_KEY,
          });
          recaptchaWidgetIdRef.current = widgetId;
        }

        if (intervalId) clearInterval(intervalId);
      }
    }

    intervalId = setInterval(tryRenderRecaptcha, 500);
    tryRenderRecaptcha();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Usuario y contraseña son obligatorios.");
      return;
    }

    const grecaptcha = window.grecaptcha;
    const widgetId = recaptchaWidgetIdRef.current;
    const token = grecaptcha?.getResponse(widgetId ?? undefined);

    if (!token) {
      setError("Por favor marca la casilla 'No soy un robot'.");
      return;
    }

    setCargando(true);
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      onLogin?.(data);
      setUsername("");
      setPassword("");

      if (widgetId != null) {
        grecaptcha?.reset(widgetId);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al iniciar sesión.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="col-12 col-md-8 col-lg-5 col-xl-4">
      <div className="card shadow-sm border-0">
        <div className="card-body px-4 py-4">

          {/* Icono principal */}
          <div className="d-flex justify-content-center mb-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: "48px",
                height: "48px",
                backgroundColor: "rgba(111,66,193,0.12)", // Morado suave para el fondo de icono
              }}
            >
              <i
                className="bi bi-shield-lock-fill"
                style={{ color: "#6f42c1", fontSize: "1.35rem" }}
              ></i>
            </div>
          </div>

          <h2 className="h5 text-center mb-1">Iniciar sesión</h2>
          <p
            className="text-muted text-center mb-3"
            style={{ fontSize: "0.9rem" }}
          >
            Acceso al cliente HSRT – Inventario &amp; Mantenimientos
          </p>

          {/* Wrapper */}
          <div className="mx-auto" style={{ maxWidth: "360px" }}>
            {error && (
              <div className="alert alert-danger py-2 mb-3" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>

              {/* Usuario */}
              <div className="mb-3">
                <label
                  htmlFor="loginUsername"
                  className="form-label mb-1"
                  style={{ fontSize: "0.85rem" }}
                >
                  Usuario
                </label>

                <div className="input-group input-group-sm">
                  <span
                    className="input-group-text bg-white"
                    style={{ borderColor: "#c9b6e9" }}
                  >
                    <i className="bi bi-person" style={{ color: "#6f42c1" }}></i>
                  </span>

                  <input
                    id="loginUsername"
                    type="text"
                    className="form-control form-control-sm"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="usuario institucional"
                    autoComplete="username"
                    style={{
                      fontSize: "0.9rem",
                      borderColor: "#c9b6e9",
                    }}
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="mb-3">
                <label
                  htmlFor="loginPassword"
                  className="form-label mb-1"
                  style={{ fontSize: "0.85rem" }}
                >
                  Contraseña
                </label>

                <div className="input-group input-group-sm">
                  <span
                    className="input-group-text bg-white"
                    style={{ borderColor: "#c9b6e9" }}
                  >
                    <i className="bi bi-lock-fill" style={{ color: "#6f42c1" }}></i>
                  </span>

                  <input
                    id="loginPassword"
                    type={showPassword ? "text" : "password"}
                    className="form-control form-control-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      fontSize: "0.9rem",
                      borderColor: "#c9b6e9",
                    }}
                  />

                  <span
                    className="input-group-text bg-white"
                    style={{
                      cursor: "pointer",
                      borderColor: "#c9b6e9",
                    }}
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    <i
                      className={
                        "bi " + (showPassword ? "bi-eye-slash" : "bi-eye")
                      }
                      style={{ color: "#6f42c1" }}
                    ></i>
                  </span>
                </div>
              </div>

              {/* reCAPTCHA */}
              <div className="mb-3 d-flex justify-content-center">
                <div
                  ref={recaptchaContainerRef}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                  }}
                />
              </div>

              {/* Botón de login morado */}
              <button
                type="submit"
                className="btn w-100 py-2"
                disabled={cargando}
                style={{
                  fontSize: "0.9rem",
                  backgroundColor: "#6f42c1",
                  borderColor: "#6f42c1",
                  color: "white",
                }}
              >
                {cargando ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Validando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right me-1"></i> Entrar
                  </>
                )}
              </button>

              <div className="text-center mt-3">
                <button
                  type="button"
                  className="btn btn-link btn-sm text-decoration-none p-0"
                  onClick={() => onForgot?.()}
                  style={{ fontSize: "0.8rem", color: "#6f42c1" }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <p
                className="text-muted text-center mt-2 mb-0"
                style={{ fontSize: "0.75rem" }}
              >
                This site is protected by reCAPTCHA and the Google{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noreferrer"
                >
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a
                  href="https://policies.google.com/terms"
                  target="_blank"
                  rel="noreferrer"
                >
                  Terms of Service
                </a>{" "}
                apply.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
