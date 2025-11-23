// src/components/UsuariosList.jsx
import { useEffect, useState } from "react";
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  obtenerEnumsUsuarios,
  descargarReporte,
} from "../api/client";

const EMPTY_FORM = {
  username: "",
  nombre_completo: "",
  email: "",
  rol: "",
  password: "",
  activo: true,
};

export function UsuariosList() {
  const [items, setItems] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("hsrt_user") || "null");
    } catch (e) {
      return null;
    }
  })();
  const myRole = (currentUser?.rol || "").toLowerCase();
  const canCreate = myRole === "admin";
  const canEdit = myRole === "admin" || myRole === "user";
  const canDelete = myRole === "admin" || myRole === "user";

  const load = async (search = "") => {
    setLoading(true);
    setError("");
    try {
      const [users, meta] = await Promise.all([
        listarUsuarios({ q: search }),
        obtenerEnumsUsuarios(),
      ]);
      setItems(users || []);
      setRoles(meta?.roles || []);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const [q, setQ] = useState("");

  const openNewModal = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (u) => {
    setEditing(u);
    setForm({
      username: u.username || "",
      nombre_completo: u.nombre_completo || "",
      email: u.email || "",
      rol: u.rol || "",
      password: "",
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
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.username.trim() || !form.nombre_completo.trim()) {
      setError("Username y nombre completo son obligatorios.");
      return;
    }
    if (!editing && !form.password.trim()) {
      setError("La contraseña es obligatoria para nuevos usuarios.");
      return;
    }
    if (!form.rol) {
      setError("Selecciona un rol.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        username: form.username.trim(),
        nombre_completo: form.nombre_completo.trim(),
        email: form.email.trim() || null,
        rol: form.rol,
        activo: !!form.activo,
      };
      if (form.password.trim()) payload.password = form.password.trim();

      if (editing) await actualizarUsuario(editing.id, payload);
      else await crearUsuario(payload);

      await load(q);
      closeModal();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Error al guardar usuario.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`¿Eliminar al usuario "${u.username}"?`)) return;
    setDeletingId(u.id);
    setError("");
    try {
      await eliminarUsuario(u.id);
      await load(q);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Error al eliminar usuario.");
    } finally {
      setDeletingId(null);
    }
  };

  const doDownload = async (format) => {
    try {
      const blob = await descargarReporte("usuarios", format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_usuarios.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Error descargando reporte");
    }
  };

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h2 className="h6 mb-0">Usuarios del sistema</h2>
            <small className="text-muted">Cuentas autorizadas para acceder al cliente HSRT</small>
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="badge rounded-pill text-bg-light">{items.length} registros</span>
            {canCreate && (
              <button type="button" className="btn-primary-like btn-sm" onClick={openNewModal}>
                <i className="bi bi-plus-lg me-1"></i>Nuevo
              </button>
            )}

                  <form className="row g-2 mb-0" onSubmit={(e) => { e.preventDefault(); load(q); }}>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text"><i className="bi bi-search"></i></span>
                      <input type="text" className="form-control form-control-sm" placeholder="Buscar por username, nombre o email..." value={q} onChange={(e) => setQ(e.target.value)} />
                      <button className="btn btn-sm btn-outline-primary-like" type="submit">Aplicar</button>
                    </div>
                  </form>

                  <div className="btn-group btn-group-sm" role="group">
                    <button type="button" className="btn-outline-primary-like" onClick={() => doDownload("pdf")}>📄 PDF</button>
                    <button type="button" className="btn-outline-primary-like" onClick={() => doDownload("xlsx")}>XLSX</button>
                  </div>
          </div>
        </div>

        {loading && <p className="text-muted mb-0">Cargando…</p>}
        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

        {!loading && !error && (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ width: "70px" }}>ID</th>
                  <th>Username</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Activo</th>
                  <th style={{ width: "120px" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted small">No hay usuarios registrados.</td>
                  </tr>
                )}
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.nombre_completo}</td>
                    <td className="small">{u.email || "—"}</td>
                    <td><span className="badge text-bg-light text-uppercase">{u.rol}</span></td>
                    <td>{u.activo ? <span className="badge bg-success-subtle text-success">Sí</span> : <span className="badge bg-secondary-subtle text-secondary">No</span>}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        {canEdit && (
                          <button type="button" className="btn btn-outline-secondary" onClick={() => openEditModal(u)}><i className="bi bi-pencil-square"></i></button>
                        )}
                        {canDelete && (
                          <button type="button" className="btn btn-outline-danger" disabled={deletingId === u.id} onClick={() => handleDelete(u)}>
                            {deletingId === u.id ? <span className="spinner-border spinner-border-sm" role="status"></span> : <i className="bi bi-trash"></i>}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={closeModal}>
            <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title mb-0">{editing ? "Editar usuario" : "Nuevo usuario"}</h5>
                  <button type="button" className="btn-close" onClick={closeModal} disabled={saving}></button>
                </div>
                <form onSubmit={handleSave} noValidate>
                  <div className="modal-body">
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label form-label-sm">Username <span className="text-danger">*</span></label>
                        <input type="text" name="username" className="form-control form-control-sm" value={form.username} onChange={handleChange} />
                      </div>
                      <div className="col-md-8">
                        <label className="form-label form-label-sm">Nombre completo <span className="text-danger">*</span></label>
                        <input type="text" name="nombre_completo" className="form-control form-control-sm" value={form.nombre_completo} onChange={handleChange} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label form-label-sm">Email</label>
                        <input type="email" name="email" className="form-control form-control-sm" value={form.email} onChange={handleChange} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label form-label-sm">Rol <span className="text-danger">*</span></label>
                        <select name="rol" className="form-select form-select-sm text-uppercase" value={form.rol} onChange={handleChange}>
                          <option value="">Selecciona…</option>
                          {roles.map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label form-label-sm">Contraseña{editing ? " (opcional)" : " *"}</label>
                        <input type="password" name="password" className="form-control form-control-sm" value={form.password} onChange={handleChange} />
                      </div>
                      <div className="col-12">
                        <div className="form-check form-switch">
                          <input className="form-check-input" type="checkbox" id="usuarioActivo" name="activo" checked={form.activo} onChange={handleChange} />
                          <label className="form-check-label small" htmlFor="usuarioActivo">Usuario activo</label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeModal} disabled={saving}>Cancelar</button>
                    <button type="submit" className="btn btn-sm" disabled={saving} style={{ backgroundColor: "#6f42c1", borderColor: "#6f42c1", color: "white" }}>
                      {saving ? (
                        <span><span className="spinner-border spinner-border-sm me-1" role="status"></span>Guardando…</span>
                      ) : (
                        <span><i className="bi bi-save me-1"></i>Guardar</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
