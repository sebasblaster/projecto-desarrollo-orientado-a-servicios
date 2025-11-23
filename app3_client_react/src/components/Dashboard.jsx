// src/components/Dashboard.jsx
import { useEffect, useState } from "react";
import {
  listarEmpresas,
  listarUbicaciones,
  listarResponsables,
  listarEquipos,
  listarUsuarios,
} from "../api/client";

/**
 * Dashboard HSRT
 * - Métricas rápidas
 * - Accesos rápidos
 * - Resumen de documentos
 * - Últimos equipos registrados
 *
 * Props:
 *  - onNavigate?: (viewKey: string) => void
 */
export function Dashboard({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    empresas: 0,
    ubicaciones: 0,
    responsables: 0,
    equipos: 0,
    usuarios: 0,
  });

  const [empresasList, setEmpresasList] = useState([]);

  const [resumenEquipos, setResumenEquipos] = useState({
    conDocumento: 0,
    sinDocumento: 0,
    ultimos: [],
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [empresas, ubicaciones, responsables, equipos, usuarios] =
          await Promise.all([
            listarEmpresas(),
            listarUbicaciones(),
            listarResponsables(),
            listarEquipos(),
            listarUsuarios(),
          ]);

        setStats({
          empresas: empresas.length,
          ubicaciones: ubicaciones.length,
          responsables: responsables.length,
          equipos: equipos.length,
          usuarios: usuarios.length,
        });

        setEmpresasList(empresas);

        const conDoc = equipos.filter(
          (e) => e.doc_ingreso && e.doc_ingreso.trim() !== ""
        );
        const sinDoc = equipos.length - conDoc.length;

        const ultimos = [...equipos]
          .sort((a, b) => b.id - a.id)
          .slice(0, 5);

        setResumenEquipos({
          conDocumento: conDoc.length,
          sinDocumento: sinDoc,
          ultimos,
        });
      } catch (err) {
        console.error(err);
        setError(err.message || "Error al cargar dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const goTo = (viewKey) => {
    if (typeof onNavigate === "function") {
      onNavigate(viewKey);
    }
  };

  const nombreEmpresa = (id) =>
    empresasList.find((e) => e.id === id)?.nombre || "—";

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body">
        {/* ENCABEZADO */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h2 className="h5 mb-0">Dashboard HSRT</h2>
            <small className="text-muted">
              Resumen rápido de inventario &amp; mantenimientos
            </small>
          </div>
        </div>

        {loading && <p className="text-muted mb-0">Cargando datos…</p>}
        {error && (
          <div className="alert alert-danger py-2" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* MÉTRICAS PRINCIPALES */}
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-4 col-lg-3">
                <div className="border rounded-3 p-3 bg-white h-100">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-buildings text-primary"></i>
                    <span className="small text-muted">Empresas externas</span>
                  </div>
                  <div className="fs-4 fw-semibold">{stats.empresas}</div>
                </div>
              </div>

              <div className="col-12 col-md-4 col-lg-3">
                <div className="border rounded-3 p-3 bg-white h-100">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-geo-alt text-success"></i>
                    <span className="small text-muted">Ubicaciones</span>
                  </div>
                  <div className="fs-4 fw-semibold">{stats.ubicaciones}</div>
                </div>
              </div>

              <div className="col-12 col-md-4 col-lg-3">
                <div className="border rounded-3 p-3 bg-white h-100">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-person-badge text-info"></i>
                    <span className="small text-muted">
                      Responsables entrega
                    </span>
                  </div>
                  <div className="fs-4 fw-semibold">{stats.responsables}</div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <div className="border rounded-3 p-3 bg-white h-100">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-pc-display-horizontal text-warning"></i>
                    <span className="small text-muted">Equipos registrados</span>
                  </div>
                  <div className="fs-4 fw-semibold">{stats.equipos}</div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <div className="border rounded-3 p-3 bg-white h-100">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-people text-secondary"></i>
                    <span className="small text-muted">Usuarios sistema</span>
                  </div>
                  <div className="fs-4 fw-semibold">{stats.usuarios}</div>
                </div>
              </div>
            </div>
            {/* LÍNEA DIVISORA 1 */}
            <hr className="my-3" style={{ opacity: 0.1 }} />

            {/* ACCESOS RÁPIDOS */}
            <div className="mt-1 mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h3 className="h6 mb-0">Accesos rápidos</h3>
                <small className="text-muted">
                  Navega rápidamente a las pantallas clave del HSRT
                </small>
              </div>

              <div className="row g-2">
                <div className="col-6 col-md-3 col-lg-2">
                  <button
                    type="button"
                    className="btn btn-sm w-100 text-start border-0 rounded-3 py-2"
                    style={{ backgroundColor: "#f3ecff" }}
                    onClick={() => goTo("equipos")}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-pc-display-horizontal"></i>
                      <span className="small">Ver equipos</span>
                    </div>
                    <div className="small text-muted ms-4">
                      Gestionar inventario
                    </div>
                  </button>
                </div>

                <div className="col-6 col-md-3 col-lg-2">
                  <button
                    type="button"
                    className="btn btn-sm w-100 text-start border-0 rounded-3 py-2"
                    style={{ backgroundColor: "#eaf6ff" }}
                    onClick={() => goTo("empresas")}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-buildings"></i>
                      <span className="small">Empresas</span>
                    </div>
                    <div className="small text-muted ms-4">
                      Proveedores de los Equipos
                    </div>
                  </button>
                </div>

                <div className="col-6 col-md-3 col-lg-2">
                  <button
                    type="button"
                    className="btn btn-sm w-100 text-start border-0 rounded-3 py-2"
                    style={{ backgroundColor: "#e8f8f2" }}
                    onClick={() => goTo("ubicaciones")}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-geo-alt"></i>
                      <span className="small">Ubicaciones</span>
                    </div>
                    <div className="small text-muted ms-4">
                      Ubicación de los equipos
                    </div>
                  </button>
                </div>

                <div className="col-6 col-md-3 col-lg-2">
                  <button
                    type="button"
                    className="btn btn-sm w-100 text-start border-0 rounded-3 py-2"
                    style={{ backgroundColor: "#fff7e6" }}
                    onClick={() => goTo("responsables")}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-person-badge"></i>
                      <span className="small">Responsables de entrega</span>
                    </div>
                    <div className="small text-muted ms-4">
                      Entregan - recogen Equipos
                    </div>
                  </button>
                </div>

                <div className="col-6 col-md-3 col-lg-2">
                  <button
                    type="button"
                    className="btn btn-sm w-100 text-start border-0 rounded-3 py-2"
                    style={{ backgroundColor: "#f5f5f5" }}
                    onClick={() => goTo("usuarios")}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-people"></i>
                      <span className="small">Usuarios</span>
                    </div>
                    <div className="small text-muted ms-4">
                      Gestión de cuentas
                    </div>
                  </button>
                </div>
              </div>
            </div>


            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6 col-lg-4">
                <div className="border rounded-3 p-3 bg-white h-100">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-file-earmark-check text-success"></i>
                    <span className="small text-muted">
                      Equipos con documento de ingreso
                    </span>
                  </div>
                  <div className="fs-4 fw-semibold">
                    {resumenEquipos.conDocumento}
                  </div>
                  <div className="small text-muted">
                    Trazabilidad documental asegurada.
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-4">
                <div className="border rounded-3 p-3 bg-white h-100">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-file-earmark-exclamation text-warning"></i>
                    <span className="small text-muted">
                      Equipos sin documento cargado
                    </span>
                  </div>
                  <div className="fs-4 fw-semibold">
                    {resumenEquipos.sinDocumento}
                  </div>
                  <div className="small text-muted">
                    Recomendado revisar y adjuntar soporte de ingreso.
                  </div>
                </div>
              </div>
            </div>

            {/* LÍNEA DIVISORA 2 */}
            <hr className="my-3" style={{ opacity: 0.1 }} />

            {/* ÚLTIMOS EQUIPOS REGISTRADOS */}
            <div className="mt-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h3 className="h6 mb-0">Últimos equipos registrados</h3>
                <small className="text-muted">
                  Vista rápida de las últimas altas en el sistema
                </small>
              </div>

              {resumenEquipos.ultimos.length === 0 ? (
                <p className="small text-muted mb-0">
                  Aún no hay equipos registrados en el sistema.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: "60px" }}>ID</th>
                        <th>Equipo</th>
                        <th>Empresa</th>
                        <th>Doc. ingreso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenEquipos.ultimos.map((e) => (
                        <tr key={e.id}>
                          <td>{e.id}</td>
                          <td className="small">
                            <div className="fw-semibold">
                              {e.marca || "—"} {e.modelo || ""}
                            </div>
                            <div className="text-muted text-truncate">
                              {e.descripcion || "Sin descripción"}
                            </div>
                          </td>
                          <td className="small">{nombreEmpresa(e.empresa_id)}</td>
                          <td className="small">
                            {e.doc_ingreso ? (
                              <span className="badge text-bg-light">
                                Sí tiene documento
                              </span>
                            ) : (
                              <span className="badge text-bg-warning-subtle">
                                Pendiente
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
