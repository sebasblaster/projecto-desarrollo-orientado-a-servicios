// src/components/EquiposList.jsx
import { useEffect, useState } from "react";
import {
  listarEquipos,
  crearEquipo,
  actualizarEquipo,
  eliminarEquipo,
  listarEmpresas,
  listarResponsables,
  listarUbicaciones,
  listarUsuarios,
  obtenerEnumsEquipos,
  subirArchivo, //  usamos el endpoint /api/upload
  buildFileUrl, 
} from "../api/client";

const EMPTY_FORM = {
  tipo: "",
  categoria: "",
  marca: "",
  modelo: "",
  serie: "",
  descripcion: "",
  empresa_id: "",
  responsable_entrega_id: "",
  ubicacion_id: "",
  usuario_autoriza_id: "",
  registrado_por_id: "",
  estado: "",
  condicion: "",
  doc_ingreso: "",
  observaciones: "",
};

export function EquiposList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [empresas, setEmpresas] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [enums, setEnums] = useState({
    tipos: [],
    categorias: [],
    estados: [],
    condiciones: [],
  });

  const [filters, setFilters] = useState({
    tipo: "",
    estado: "",
    texto: "",
  });

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Estado para manejo de upload de documento
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // ====================================
  // CARGA INICIAL + FILTROS
  // ====================================
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [equipos, emps, resps, ubis, usrs, meta] = await Promise.all([
        listarEquipos(filters),
        listarEmpresas(""),
        listarResponsables(),
        listarUbicaciones(""),
        listarUsuarios(),
        obtenerEnumsEquipos(),
      ]);
      setItems(equipos);
      setEmpresas(emps);
      setResponsables(resps);
      setUbicaciones(ubis);
      setUsuarios(usrs);
      setEnums(meta);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar equipos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    load();
  };

  // ====================================
  // MODAL NUEVO / EDITAR
  // ====================================
  const openNewModal = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      tipo: enums.tipos[0] || "",
      categoria: enums.categorias[0] || "",
      estado: enums.estados[0] || "",
      condicion: enums.condiciones[0] || "",
    });
    setUploadError("");
    setShowModal(true);
  };

  const openEditModal = (eq) => {
    setEditing(eq);
    setForm({
      tipo: eq.tipo || "",
      categoria: eq.categoria || "",
      marca: eq.marca || "",
      modelo: eq.modelo || "",
      serie: eq.serie || "",
      descripcion: eq.descripcion || "",
      empresa_id: eq.empresa_id || "",
      responsable_entrega_id: eq.responsable_entrega_id || "",
      ubicacion_id: eq.ubicacion_id || "",
      usuario_autoriza_id: eq.usuario_autoriza_id || "",
      registrado_por_id: eq.registrado_por_id || "",
      estado: eq.estado || "",
      condicion: eq.condicion || "",
      doc_ingreso: eq.doc_ingreso || "",
      observaciones: eq.observaciones || "",
    });
    setUploadError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving || uploading) return;
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setUploadError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ====================================
  // SUBIR ARCHIVO DE DOCUMENTO DE INGRESO
  // ====================================
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setUploading(true);
    try {
      const res = await subirArchivo(file);
      if (res?.file) {
        setForm((prev) => ({ ...prev, doc_ingreso: res.file }));
      } else {
        setUploadError("No se recibió la ruta del archivo desde el servidor.");
      }
    } catch (err) {
      console.error(err);
      setUploadError(err.message || "Error al subir el archivo de ingreso.");
    } finally {
      setUploading(false);
      // Permitir volver a seleccionar el mismo archivo si se desea
      e.target.value = "";
    }
  };

  // ====================================
  // GUARDAR (CREAR / ACTUALIZAR)
  // ====================================
  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !form.tipo ||
      !form.categoria ||
      !form.empresa_id ||
      !form.responsable_entrega_id ||
      !form.ubicacion_id ||
      !form.registrado_por_id
    ) {
      setError(
        "Tipo, categoría, empresa, responsable, ubicación y usuario que registra son obligatorios."
      );
      return;
    }

    if (uploading) {
      setError("Espera a que termine la carga del documento antes de guardar.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tipo: form.tipo,
        categoria: form.categoria,
        marca: form.marca.trim() || null,
        modelo: form.modelo.trim() || null,
        serie: form.serie.trim() || null,
        descripcion: form.descripcion.trim() || null,
        empresa_id: Number(form.empresa_id),
        responsable_entrega_id: Number(form.responsable_entrega_id),
        ubicacion_id: Number(form.ubicacion_id),
        usuario_autoriza_id: form.usuario_autoriza_id
          ? Number(form.usuario_autoriza_id)
          : null,
        registrado_por_id: Number(form.registrado_por_id),
        estado: form.estado || enums.estados[0],
        condicion: form.condicion || enums.condiciones[0],
        doc_ingreso: form.doc_ingreso.trim() || null,
        observaciones: form.observaciones.trim() || null,
      };

      if (editing) {
        await actualizarEquipo(editing.id, payload);
      } else {
        await crearEquipo(payload);
      }

      await load();
      closeModal();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar equipo.");
    } finally {
      setSaving(false);
    }
  };

  // ====================================
  // ELIMINAR
  // ====================================
  const handleDelete = async (eq) => {
    if (!window.confirm(`¿Eliminar el equipo "${eq.marca} ${eq.modelo}"?`))
      return;

    setDeletingId(eq.id);
    setError("");
    try {
      await eliminarEquipo(eq.id);
      await load();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al eliminar equipo.");
    } finally {
      setDeletingId(null);
    }
  };

  // ====================================
  // HELPERS NOMBRE
  // ====================================
  const nombreEmpresa = (id) =>
    empresas.find((e) => e.id === id)?.nombre || "—";
  const nombreResp = (id) =>
    responsables.find((r) => r.id === id)?.nombre || "—";
  const nombreUbic = (id) =>
    ubicaciones.find((u) => u.id === id)?.nombre || "—";
  const nombreUsuario = (id) =>
    usuarios.find((u) => u.id === id)?.nombre_completo || "—";

  // ====================================
  // RENDER
  // ====================================
  return (
    <>
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="h6 mb-0">Equipos externos</h2>
              <small className="text-muted">
                Equipos tecnológicos y biomédicos registrados en el HSRT
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

          {/* Filtros */}
          <form className="row g-2 mb-3" onSubmit={handleSearchSubmit}>
            <div className="col-12 col-md-4 col-lg-3">
              <select
                name="tipo"
                className="form-select form-select-sm"
                value={filters.tipo}
                onChange={handleFilterChange}
              >
                <option value="">Tipo (todos)</option>
                {enums.tipos.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4 col-lg-3">
              <select
                name="estado"
                className="form-select form-select-sm"
                value={filters.estado}
                onChange={handleFilterChange}
              >
                <option value="">Estado (todos)</option>
                {enums.estados.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4 col-lg-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  name="texto"
                  className="form-control form-control-sm"
                  placeholder="Buscar por marca, modelo, serie, descripción…"
                  value={filters.texto}
                  onChange={handleFilterChange}
                />
              </div>
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
                    <th style={{ width: "60px" }}>ID</th>
                    <th>Tipo</th>
                    <th>Equipo</th>
                    <th>Serie</th>
                    <th>Empresa</th>
                    <th>Responsable</th>
                    <th>Ubicación</th>
                    <th>Autoriza</th>
                    <th>Registrado por</th>
                    <th>Doc.</th>
                    <th>Estado</th>
                    <th>Condición</th>
                    <th style={{ width: "120px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((e) => (
                    <tr key={e.id}>
                      <td>{e.id}</td>
                      <td className="small text-uppercase">{e.tipo}</td>
                      <td className="small">
                        <div className="fw-semibold">
                          {e.marca || "—"} {e.modelo || ""}
                        </div>
                        <div className="text-muted">
                          {e.descripcion || "Sin descripción"}
                        </div>
                      </td>
                      <td className="small">{e.serie || "—"}</td>
                      <td className="small">{nombreEmpresa(e.empresa_id)}</td>
                      <td className="small">
                        {nombreResp(e.responsable_entrega_id)}
                      </td>
                      <td className="small">{nombreUbic(e.ubicacion_id)}</td>
                      <td className="small">
                        {e.usuario_autoriza_id
                          ? nombreUsuario(e.usuario_autoriza_id)
                          : "—"}
                      </td>
                      <td className="small">
                        {nombreUsuario(e.registrado_por_id)}
                      </td>
                      <td className="small text-center">
                        {e.doc_ingreso ? (
                          <a
                            href={buildFileUrl(e.doc_ingreso)} 
                            target="_blank"
                            rel="noreferrer"
                            title="Ver documento de ingreso"
                          >
                            <i className="bi bi-file-earmark-text"></i>
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span className="badge text-bg-light text-uppercase">
                          {e.estado}
                        </span>
                      </td>
                      <td>
                        <span className="badge text-bg-light text-uppercase">
                          {e.condicion}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => openEditModal(e)}
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
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
                      <td colSpan="13" className="text-center text-muted small">
                        No hay equipos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CRUD */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={closeModal}
        >
          <div
            className="modal-dialog modal-xl modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title mb-0">
                  {editing ? "Editar equipo" : "Nuevo equipo"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeModal}
                  disabled={saving || uploading}
                ></button>
              </div>

              <form onSubmit={handleSave} noValidate>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-3">
                      <label className="form-label form-label-sm">
                        Tipo *
                      </label>
                      <select
                        name="tipo"
                        className="form-select form-select-sm text-uppercase"
                        value={form.tipo}
                        onChange={handleChange}
                      >
                        <option value="">Selecciona…</option>
                        {enums.tipos.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label form-label-sm">
                        Categoría *
                      </label>
                      <select
                        name="categoria"
                        className="form-select form-select-sm text-uppercase"
                        value={form.categoria}
                        onChange={handleChange}
                      >
                        <option value="">Selecciona…</option>
                        {enums.categorias.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label form-label-sm">
                        Estado *
                      </label>
                      <select
                        name="estado"
                        className="form-select form-select-sm text-uppercase"
                        value={form.estado}
                        onChange={handleChange}
                      >
                        {enums.estados.map((e) => (
                          <option key={e} value={e}>
                            {e}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label form-label-sm">
                        Condición *
                      </label>
                      <select
                        name="condicion"
                        className="form-select form-select-sm text-uppercase"
                        value={form.condicion}
                        onChange={handleChange}
                      >
                        {enums.condiciones.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label form-label-sm">Marca</label>
                      <input
                        type="text"
                        name="marca"
                        className="form-control form-control-sm"
                        value={form.marca}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label form-label-sm">Modelo</label>
                      <input
                        type="text"
                        name="modelo"
                        className="form-control form-control-sm"
                        value={form.modelo}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label form-label-sm">Serie</label>
                      <input
                        type="text"
                        name="serie"
                        className="form-control form-control-sm"
                        value={form.serie}
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

                    <div className="col-md-6">
                      <label className="form-label form-label-sm">
                        Empresa *
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

                    <div className="col-md-6">
                      <label className="form-label form-label-sm">
                        Responsable de entrega *
                      </label>
                      <select
                        name="responsable_entrega_id"
                        className="form-select form-select-sm"
                        value={form.responsable_entrega_id}
                        onChange={handleChange}
                      >
                        <option value="">Selecciona…</option>
                        {responsables.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label form-label-sm">
                        Ubicación *
                      </label>
                      <select
                        name="ubicacion_id"
                        className="form-select form-select-sm"
                        value={form.ubicacion_id}
                        onChange={handleChange}
                      >
                        <option value="">Selecciona…</option>
                        {ubicaciones.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label form-label-sm">
                        Usuario que registra *
                      </label>
                      <select
                        name="registrado_por_id"
                        className="form-select form-select-sm"
                        value={form.registrado_por_id}
                        onChange={handleChange}
                      >
                        <option value="">Selecciona…</option>
                        {usuarios.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nombre_completo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label form-label-sm">
                        Usuario que autoriza
                      </label>
                      <select
                        name="usuario_autoriza_id"
                        className="form-select form-select-sm"
                        value={form.usuario_autoriza_id}
                        onChange={handleChange}
                      >
                        <option value="">(Opcional)</option>
                        {usuarios.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nombre_completo}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* DOCUMENTO DE INGRESO: ruta + upload */}
                    <div className="col-md-6">
                      <label className="form-label form-label-sm">
                        Documento ingreso
                      </label>

                      {/* Campo de texto que muestra la ruta en BD */}
                      <div className="input-group input-group-sm mb-1">
                        <span className="input-group-text">
                          <i className="bi bi-file-earmark-arrow-up"></i>
                        </span>
                        <input
                          type="text"
                          name="doc_ingreso"
                          className="form-control form-control-sm"
                          value={form.doc_ingreso}
                          onChange={handleChange}
                          placeholder="/uploads/archivo.pdf"
                        />
                      </div>

                      {/* Input de archivo para subir nuevo doc_ingreso */}
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <input
                          type="file"
                          className="form-control form-control-sm"
                          onChange={handleFileChange}
                          accept=".pdf,.png,.jpg,.jpeg"
                          disabled={uploading}
                        />
                        {uploading && (
                          <span
                            className="spinner-border spinner-border-sm"
                            role="status"
                          ></span>
                        )}
                      </div>

                      {uploadError && (
                        <div className="form-text text-danger">
                          {uploadError}
                        </div>
                      )}

                      {form.doc_ingreso && !uploadError && (
                        <div className="form-text">
                          Actual:{" "}
                          <a
                            href={buildFileUrl(form.doc_ingreso)}  
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver documento
                          </a>
                        </div>
                      )}
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
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={closeModal}
                    disabled={saving || uploading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm"
                    disabled={saving || uploading}
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
