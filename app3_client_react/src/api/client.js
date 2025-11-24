// src/api/client.js. en esta tenemos los helpers para llamar a la API Flask (llamamos a este archivo desde los componentes React)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"; 

// Auth headers that must be set after login
let authHeaders = {};

export function setAuth(user, client = "react") {
  if (!user) return;
  authHeaders = {
    "X-User-Id": String(user.id || ""),
    "X-User-Role": String((user.rol || "").toLowerCase()),
    "X-Client": client,
  };
}

export function clearAuth() {
  authHeaders = {};
}

export class ServiceAPIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ServiceAPIError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Construye la URL completa a un archivo servido por Flask.
 * - Si viene una URL absoluta (http/https), la retorna tal cual.
 * - Si viene algo como "/uploads/file.pdf" o "uploads/file.pdf"
 *   la pega al API_URL (http://localhost:5000).
 */
export function buildFileUrl(path) {
  if (!path) return "";
  // Si ya es absoluta, no la tocamos
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = API_URL.replace(/\/$/, "");
  const cleaned = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleaned}`;
}

/**
 * Helper genérico para llamadas a la API Flask
 * - path: string (ej: "/api/empresas")
 * - options: fetch options (method, headers, body, etc.)
 */
export async function apiFetch(path, options = {}) {
  const url = `${API_URL.replace(/\/$/, "")}${path}`;

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    headers: {
      ...defaultHeaders,
      ...authHeaders,
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || `Error HTTP ${response.status}`;
    throw new ServiceAPIError(message, response.status, data);
  }

  return data;
}

/* ==========================
 * AUTENTICACIÓN / USUARIOS
 * ========================== */

export async function loginUsuario(username, password) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

// Descargar reportes (devuelve Blob). entity: empresas|usuarios|equipos, format: pdf|xlsx
export async function descargarReporte(entity, format = "pdf") {
  const url = `${API_URL.replace(/\/$/, "")}/api/reports/${entity}?format=${encodeURIComponent(
    format
  )}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...authHeaders,
    },
  });

  if (!res.ok) {
    let data = null;
    try {
      data = await res.json();
    } catch {}
    const message = data?.error || `Error HTTP ${res.status}`;
    throw new Error(message);
  }

  const blob = await res.blob();
  return blob;
}

export async function solicitarResetPassword(identifier) {
  return apiFetch("/api/auth/request-reset", {
    method: "POST",
    body: JSON.stringify({ identifier }),
  });
}

export async function validarResetToken(token) {
  return apiFetch(
    `/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`
  );
}

export async function resetearPassword(token, newPassword) {
  return apiFetch("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password: newPassword }),
  });
}

/* ==========================
 * USUARIOS (CRUD)
 * ========================== */

export async function listarUsuarios({ q = "", role = "" } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (role) params.set("role", role);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`/api/usuarios${qs}`);
}

export async function obtenerUsuario(uid) {
  return apiFetch(`/api/usuarios/${uid}`);
}

export async function crearUsuario(data) {
  return apiFetch("/api/usuarios", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function actualizarUsuario(uid, data) {
  return apiFetch(`/api/usuarios/${uid}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function eliminarUsuario(uid) {
  return apiFetch(`/api/usuarios/${uid}`, {
    method: "DELETE",
  });
}

/* ==========================
 * EMPRESAS
 * ========================== */

export async function listarEmpresas(q = "") {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiFetch(`/api/empresas${query}`);
}

export async function crearEmpresa(data) {
  return apiFetch("/api/empresas", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function actualizarEmpresa(eid, data) {
  return apiFetch(`/api/empresas/${eid}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function eliminarEmpresa(eid) {
  return apiFetch(`/api/empresas/${eid}`, {
    method: "DELETE",
  });
}

/* ==========================
 * UBICACIONES
 * ========================== */

export async function listarUbicaciones(q = "") {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiFetch(`/api/ubicaciones${query}`);
}

export async function crearUbicacion(data) {
  return apiFetch("/api/ubicaciones", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function actualizarUbicacion(uid, data) {
  return apiFetch(`/api/ubicaciones/${uid}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function eliminarUbicacion(uid) {
  return apiFetch(`/api/ubicaciones/${uid}`, {
    method: "DELETE",
  });
}

/* ==========================
 * RESPONSABLES DE ENTREGA
 * ========================== */

export async function listarResponsables({ q = "", documento = "" } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (documento) params.set("documento", documento);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`/api/responsables-entrega${qs}`);
}

export async function crearResponsable(data) {
  return apiFetch("/api/responsables-entrega", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function actualizarResponsable(rid, data) {
  return apiFetch(`/api/responsables-entrega/${rid}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function eliminarResponsable(rid) {
  return apiFetch(`/api/responsables-entrega/${rid}`, {
    method: "DELETE",
  });
}

/* ==========================
 * EQUIPOS
 * ========================== */

export async function listarEquipos(filters = {}) {
  const params = new URLSearchParams();
  const {
    tipo,
    estado,
    texto,
    empresa_id,
    responsable_entrega_id,
    ubicacion_id,
    usuario_autoriza_id,
    registrado_por_id,
  } = filters;

  if (tipo) params.set("tipo", tipo);
  if (estado) params.set("estado", estado);
  if (texto) params.set("q", texto);
  if (empresa_id) params.set("empresa_id", empresa_id);
  if (responsable_entrega_id)
    params.set("responsable_entrega_id", responsable_entrega_id);
  if (ubicacion_id) params.set("ubicacion_id", ubicacion_id);
  if (usuario_autoriza_id)
    params.set("usuario_autoriza_id", usuario_autoriza_id);
  if (registrado_por_id) params.set("registrado_por_id", registrado_por_id);

  const qs = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`/api/equipos${qs}`);
}

export async function obtenerEquipo(eid) {
  return apiFetch(`/api/equipos/${eid}`);
}

export async function crearEquipo(data) {
  return apiFetch("/api/equipos", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function actualizarEquipo(eid, data) {
  return apiFetch(`/api/equipos/${eid}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function eliminarEquipo(eid) {
  return apiFetch(`/api/equipos/${eid}`, {
    method: "DELETE",
  });
}

/* ==========================
 * METADATOS / ENUMS
 * ========================== */

export async function obtenerEnumsEquipos() {
  return apiFetch("/api/meta/equipos/enums");
}

export async function obtenerEnumsUsuarios() {
  return apiFetch("/api/meta/usuarios/enums");
}

/* ==========================
 * UPLOADS (ARCHIVOS)
 * ========================== */

export async function subirArchivo(file) {
  if (!file) {
    throw new ServiceAPIError("No se recibió archivo para subir");
  }

  const url = `${API_URL.replace(/\/$/, "")}/api/upload`;
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
    // NO ponemos Content-Type: lo maneja el navegador para multipart/form-data
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || `Error HTTP ${response.status}`;
    throw new ServiceAPIError(message, response.status, data);
  }

  return data;
}
