// src/components/UbicacionesList.jsx
import { useEffect, useState } from "react";
import {
  listarUbicaciones,
  crearUbicacion,
  actualizarUbicacion,
  eliminarUbicacion,
} from "../api/client";

const EMPTY_FORM = {
  codigo: "",
  nombre: "",
  descripcion: "",
  activo: true,
};

export function UbicacionesList() {
  const [items, setItems] = useState([]);
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
      const data = await listarUbicaciones(search);
      setItems(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar ubicaciones");
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

  const openEditModal = (u) => {
    setEditing(u);
    setForm({
      codigo: u.codigo || "",
      nombre: u.nombre || "",
      descripcion: u.descripcion || "",
      activo: u.activo ?? true,
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

    if (!form.codigo.trim() || !form.nombre.trim()) {
      setError("Código y nombre son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        activo: !!form.activo,
      };

      if (editing) {
        await actualizarUbicacion(editing.id, payload);
      } else {
        await crearUbicacion(payload);
      }

      await load(q);
      closeModal();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar ubicación.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`¿Eliminar la ubicación "${u.nombre}"?`)) return;

    setDeletingId(u.id);
    setError("");
    try {
      await eliminarUbicacion(u.id);
      await load(q);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al eliminar ubicación.");
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
              <h2 className="h6 mb-0">Ubicaciones</h2>
              <small className="text-muted">
                Áreas y servicios donde se ubican los equipos
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
                Nueva
              </button>
            </div>
          </div>

          {/* Filtro */}
          <form className="row g-2 mb-3" onSubmit={handleSearchSubmit}>
            <div className="col-12 col-md-6 col-lg-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Buscar por nombre o código…"
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
                    <th style={{ width: "80px" }}>ID</th>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th>Activo</th>
                    <th style={{ width: "120px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>
                        <span className="badge text-bg-light">{u.codigo}</span>
                      </td>
                      <td>{u.nombre}</td>
                      <td className="small text-muted">
                        {u.descripcion || "—"}
                      </td>
                      <td>
                        {u.activo ? (
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
                            onClick={() => openEditModal(u)}
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            disabled={deletingId === u.id}
                            onClick={() => handleDelete(u)}
                          >
                            {deletingId === u.id ? (
                              <span
                                className="spinner-border spinner-border-sm"
                                role="status"
                                aria-hidden="true"
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
                      <td colSpan="6" className="text-center text-muted small">
                        No hay ubicaciones registradas.
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
            className="modal-dialog modal-md modal-dialog-centered"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title mb-0">
                  {editing ? "Editar ubicación" : "Nueva ubicación"}
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
                        Código <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="codigo"
                        className="form-control form-control-sm"
                        value={form.codigo}
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

                    <div className="col-12">
                      <label className="form-label form-label-sm">
                        Descripción
                      </label>
                      <textarea
                        name="descripcion"
                        rows="2"
                        className="form-control form-control-sm"
                        value={form.descripcion}
                        onChange={handleChange}
                      ></textarea>
                    </div>

                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="ubicacionActiva"
                          name="activo"
                          checked={form.activo}
                          onChange={handleChange}
                        />
                        <label
                          className="form-check-label small"
                          htmlFor="ubicacionActiva"
                        >
                          Ubicación activa
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
