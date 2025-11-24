// src/components/ResponsablesList.jsx
import { useEffect, useState } from "react";
import {
  listarResponsables,
  crearResponsable,
  actualizarResponsable,
  eliminarResponsable,
  listarEmpresas,
} from "../api/client";

const EMPTY_FORM = {
  documento: "",
  nombre: "",
  telefono: "",
  email: "",
  empresa_id: "",
  observaciones: "",
  activo: true,
};

export function ResponsablesList() {
  const [items, setItems] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function load(search = "") {
    setLoading(true);
    setError("");
    try {
      const [resp, emps] = await Promise.all([
        listarResponsables({ q: search }),
        listarEmpresas(""),
      ]);
      setItems(resp);
      setEmpresas(emps);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar responsables");
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

  const openNewModal = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (r) => {
    setEditing(r);
    setForm({
      documento: r.documento || "",
      nombre: r.nombre || "",
      telefono: r.telefono || "",
      email: r.email || "",
      empresa_id: r.empresa_id || "",
      observaciones: r.observaciones || "",
      activo: r.activo ?? true,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

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

    if (!form.documento.trim() || !form.nombre.trim() || !form.empresa_id) {
      setError("Documento, nombre y empresa son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        documento: form.documento.trim(),
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        empresa_id: Number(form.empresa_id),
        observaciones: form.observaciones.trim() || null,
        activo: !!form.activo,
      };

      if (editing) {
        await actualizarResponsable(editing.id, payload);
      } else {
        await crearResponsable(payload);
      }

      await load(q);
      closeModal();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar responsable.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`¿Eliminar al responsable "${r.nombre}"?`)) return;

    setDeletingId(r.id);
    setError("");
    try {
      await eliminarResponsable(r.id);
      await load(q);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al eliminar responsable.");
    } finally {
      setDeletingId(null);
    }
  };

  const empresaName = (empresa_id) => {
    const found = empresas.find((e) => e.id === empresa_id);
    return found ? found.nombre : "—";
  };

  return (
    <>
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="h6 mb-0">Responsables de entrega</h2>
              <small className="text-muted">
                Técnicos que entregan o recogen los equipos
              </small>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge rounded-pill text-bg-light">
                {items.length} registros
              </span>
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
                Nuevo
              </button>
            </div>
          </div>

          <form className="row g-2 mb-3" onSubmit={handleSearchSubmit}>
            <div className="col-12 col-md-6 col-lg-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Buscar por nombre, documento, correo…"
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

          {loading && <p className="text-muted mb-0">Cargando…</p>}
          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ width: "70px" }}>ID</th>
                    <th>Documento</th>
                    <th>Nombre</th>
                    <th>Empresa</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Activo</th>
                    <th style={{ width: "120px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td className="small">{r.documento}</td>
                      <td>{r.nombre}</td>
                      <td className="small">{empresaName(r.empresa_id)}</td>
                      <td className="small">{r.telefono || "—"}</td>
                      <td className="small">{r.email || "—"}</td>
                      <td>
                        {r.activo ? (
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
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => openEditModal(r)}
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            disabled={deletingId === r.id}
                            onClick={() => handleDelete(r)}
                          >
                            {deletingId === r.id ? (
                              <span
                                className="spinner-border spinner-border-sm"
                                role="status"
                              ></span>
                            ) : (
                              <i className="bi bi-trash"></i>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center text-muted small">
                        No hay responsables registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title mb-0">
                  {editing ? "Editar responsable" : "Nuevo responsable"}
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
                        Documento <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="documento"
                        className="form-control form-control-sm"
                        value={form.documento}
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

                    <div className="col-md-6">
                      <label className="form-label form-label-sm">
                        Empresa <span className="text-danger">*</span>
                      </label>
                      <select
                        name="empresa_id"
                        className="form-select form-select-sm"
                        value={form.empresa_id}
                        onChange={handleChange}
                      >
                        <option value="">Selecciona…</option>
                        {empresas.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label form-label-sm">
                        Observaciones
                      </label>
                      <textarea
                        name="observaciones"
                        rows="2"
                        className="form-control form-control-sm"
                        value={form.observaciones}
                        onChange={handleChange}
                      ></textarea>
                    </div>

                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="responsableActivo"
                          name="activo"
                          checked={form.activo}
                          onChange={handleChange}
                        />
                        <label
                          className="form-check-label small"
                          htmlFor="responsableActivo"
                        >
                          Responsable activo
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
