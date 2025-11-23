// src/components/EmpresasList.jsx
import { useEffect, useState } from "react";
import {
  listarEmpresas,
  crearEmpresa,
  actualizarEmpresa,
  eliminarEmpresa,
  descargarReporte,
} from "../api/client";

// current logged user (stored in localStorage by App.jsx)
const currentUser = (() => {
  try {
    return JSON.parse(localStorage.getItem("hsrt_user") || "null");
  } catch (e) {
    return null;
  }
})();
const role = (currentUser?.rol || "").toLowerCase();
const canCreateGlobal = role === "admin"; // in React client only admin can create
const canEditGlobal = role === "admin" || role === "user"; // both can edit
const canDeleteGlobal = role === "admin" || role === "user"; // both can delete

const EMPTY_FORM = {
  nit: "",
  nombre: "",
  telefono: "",
  email: "",
  direccion: "",
  contacto_principal: "",
  activo: true,
};

export function EmpresasList() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // empresa o null
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // =========================
  // Carga de empresas
  // =========================
  async function load(search = "") {
    setLoading(true);
    setError("");
    try {
      const data = await listarEmpresas(search);
      setItems(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar empresas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    load(q);
  };

  // =========================
  // Modal: abrir / cerrar
  // =========================
  const openNewModal = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (empresa) => {
    setEditing(empresa);
    setForm({
      nit: empresa.nit || "",
      nombre: empresa.nombre || "",
      telefono: empresa.telefono || "",
      email: empresa.email || "",
      direccion: empresa.direccion || "",
      contacto_principal: empresa.contacto_principal || "",
      activo: empresa.activo ?? true,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  // =========================
  // Manejo de formulario
  // =========================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.nit.trim() || !form.nombre.trim()) {
      setError("NIT y nombre son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nit: form.nit.trim(),
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        direccion: form.direccion.trim() || null,
        contacto_principal: form.contacto_principal.trim() || null,
        activo: !!form.activo,
      };

      if (editing) {
        await actualizarEmpresa(editing.id, payload);
      } else {
        await crearEmpresa(payload);
      }

      await load(q);
      closeModal();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar empresa.");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // Eliminar
  // =========================
  const handleDelete = async (empresa) => {
    if (!window.confirm(`¿Eliminar la empresa "${empresa.nombre}"?`)) {
      return;
    }

    setDeletingId(empresa.id);
    setError("");
    try {
      await eliminarEmpresa(empresa.id);
      await load(q);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al eliminar empresa.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="card shadow-sm border-0">
        <div className="card-body">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="h6 mb-0">Empresas externas</h2>
              <small className="text-muted">
                Proveedores de servicios tecnológicos y biomédicos
              </small>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge rounded-pill text-bg-light">
                {items.length} registros
              </span>
              {canCreateGlobal && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={openNewModal}
                  style={{
                    backgroundColor: "#6f42c1",
                    borderColor: "#6f42c1",
                    color: "white",
                  }}
                >
                  <i className="bi bi-plus-lg me-1"></i>
                  Nueva
                </button>
              )}

              {/* Report buttons */}
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={async () => {
                    try {
                      const blob = await descargarReporte("empresas", "pdf");
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "report_empresas.pdf";
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error(err);
                      alert(err.message || "Error descargando reporte PDF");
                    }
                  }}
                >
                  📄 PDF
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={async () => {
                    try {
                      const blob = await descargarReporte("empresas", "xlsx");
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "report_empresas.xlsx";
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error(err);
                      alert(err.message || "Error descargando reporte Excel");
                    }
                  }}
                >
                  XLSX
                </button>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <form className="row g-2 mb-3" onSubmit={handleSearchSubmit}>
            <div className="col-12 col-md-6 col-lg-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Buscar por nombre, NIT, contacto…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-auto">
              <button
                type="submit"
                className="btn btn-sm btn-outline-secondary"
              >
                Aplicar filtro
              </button>
            </div>
          </form>

          {/* Estado / errores */}
          {loading && <p className="text-muted mb-0">Cargando…</p>}
          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}

          {/* Tabla */}
          {!loading && !error && (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ width: "80px" }}>ID</th>
                    <th>NIT</th>
                    <th>Nombre</th>
                    <th>Contacto</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Activo</th>
                    <th style={{ width: "120px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((e) => (
                    <tr key={e.id}>
                      <td>{e.id}</td>
                      <td className="small">{e.nit}</td>
                      <td>{e.nombre}</td>
                      <td className="small">
                        {e.contacto_principal || "—"}
                      </td>
                      <td className="small">{e.telefono || "—"}</td>
                      <td className="small">{e.email || "—"}</td>
                      <td>
                        {e.activo ? (
                          <span className="badge bg-success-subtle text-success">
                            Sí
                          </span>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary">
                            No
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          {canEditGlobal && (
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => openEditModal(e)}
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                          )}
                          {canDeleteGlobal && (
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              disabled={deletingId === e.id}
                              onClick={() => handleDelete(e)}
                            >
                              {deletingId === e.id ? (
                                <span
                                  className="spinner-border spinner-border-sm"
                                  role="status"
                                  aria-hidden="true"
                                ></span>
                              ) : (
                                <i className="bi bi-trash"></i>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center text-muted small">
                        No hay empresas registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CREAR / EDITAR */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={closeModal}
        >
          <div
            className="modal-dialog modal-lg modal-dialog-centered"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title mb-0">
                  {editing ? "Editar empresa" : "Nueva empresa externa"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeModal}
                  disabled={saving}
                ></button>
              </div>
              <form onSubmit={handleSave} noValidate>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label form-label-sm">
                        NIT <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="nit"
                        className="form-control form-control-sm"
                        value={form.nit}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-8">
                      <label className="form-label form-label-sm">
                        Nombre <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="nombre"
                        className="form-control form-control-sm"
                        value={form.nombre}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label form-label-sm">
                        Teléfono
                      </label>
                      <input
                        type="text"
                        name="telefono"
                        className="form-control form-control-sm"
                        value={form.telefono}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label form-label-sm">Email</label>
                      <input
                        type="email"
                        name="email"
                        className="form-control form-control-sm"
                        value={form.email}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label form-label-sm">
                        Dirección
                      </label>
                      <input
                        type="text"
                        name="direccion"
                        className="form-control form-control-sm"
                        value={form.direccion}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label form-label-sm">
                        Contacto principal
                      </label>
                      <input
                        type="text"
                        name="contacto_principal"
                        className="form-control form-control-sm"
                        value={form.contacto_principal}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="empresaActiva"
                          name="activo"
                          checked={form.activo}
                          onChange={handleChange}
                        />
                        <label
                          className="form-check-label small"
                          htmlFor="empresaActiva"
                        >
                          Empresa activa para nuevos ingresos
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm"
                    disabled={saving}
                    style={{
                      backgroundColor: "#6f42c1",
                      borderColor: "#6f42c1",
                      color: "white",
                    }}
                  >
                    {saving ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-1"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Guardando…
                      </>
                    ) : (
                      <>
                        <i className="bi bi-save me-1"></i>
                        Guardar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
