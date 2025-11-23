# api_client.py
import os
import requests
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

APP1_URL = os.getenv("APP1_URL", "http://127.0.0.1:5000")

# Session used to persist auth headers from this client
SESSION = requests.Session()

def set_auth(user: Optional[dict], client: str = "python") -> None:
    """Set headers to be sent to the API for role-based access control."""
    if not user:
        clear_auth()
        return
    headers = {
        "X-User-Id": str(user.get("id", "")),
        "X-User-Role": str((user.get("rol") or "").lower()),
        "X-Client": client,
    }
    SESSION.headers.update(headers)

def clear_auth() -> None:
    for h in ("X-User-Id", "X-User-Role", "X-Client"):
        SESSION.headers.pop(h, None)


class ServiceAPIError(Exception):
    pass


def _url(path: str) -> str:
    return f"{APP1_URL.rstrip('/')}{path}"


# ==========================
# AUTENTICACIÓN / USUARIOS
# ==========================

def login_usuario(username: str, password: str) -> dict: # tenemos que retornar datos del usuario
    """
    Llama a un endpoint de login en la capa de servicios.

    IMPORTANTE:
    Esto asume que en App1 tenemos el endpoint:
      POST /api/auth/login  -> { username, password }
    que responde 200 con datos del usuario  o 401.
    """
    resp = SESSION.post(
        _url("/api/auth/login"),
        json={"username": username, "password": password},
        timeout=10,
    )
    if resp.status_code == 200:
        return resp.json()
    elif resp.status_code == 401:
        raise ServiceAPIError("Credenciales inválidas")
    else:
        raise ServiceAPIError(f"Error en login: {resp.status_code} {resp.text}")


# nos sirve para pedir el reset del password
def solicitar_reset_password(identifier: str) -> dict: 
    """
    Pide a la API que genere un token de reset para username o email.
    JSON: { "identifier": "admin" }
    """
    resp = SESSION.post(
        _url("/api/auth/request-reset"),
        json={"identifier": identifier},
        timeout=10,
    )
    if resp.status_code in (200, 201):
        return resp.json()
    raise ServiceAPIError(f"Error al solicitar reset: {resp.status_code} {resp.text}")

# nos sirve para validar el token recibido en el email
def validar_reset_token(token: str) -> dict:
    resp = SESSION.get(
        _url("/api/auth/validate-reset-token"),
        params={"token": token},
        timeout=10,
    )
    if resp.status_code == 200:
        return resp.json()
    raise ServiceAPIError(f"Token inválido o expirado: {resp.status_code} {resp.text}")

# nos sirve para restablecer la contraseña usando el token
def resetear_password(token: str, new_password: str) -> dict:
    resp = SESSION.post(
        _url("/api/auth/reset-password"),
        json={"token": token, "password": new_password},
        timeout=10,
    )
    if resp.status_code == 200:
        return resp.json()
    raise ServiceAPIError(f"Error al restablecer contraseña: {resp.status_code} {resp.text}")


# nos sirve para gestionar usuarios (CRUD)
def listar_usuarios() -> list[dict]:
    resp = SESSION.get(_url("/api/usuarios"), timeout=10)
    if resp.status_code == 200:
        return resp.json()
    raise ServiceAPIError(f"Error al listar usuarios: {resp.status_code} {resp.text}")

# nos sirve para obtener un usuario por su id
def obtener_usuario(uid: int) -> dict:
    resp = SESSION.get(_url(f"/api/usuarios/{uid}"), timeout=10)
    if resp.status_code == 200:
        return resp.json()
    raise ServiceAPIError(f"Error al obtener usuario: {resp.status_code} {resp.text}")


def crear_usuario(data: dict) -> dict:
    """
    data = {
      "username": str,
      "nombre_completo": str,
      "email": str | None,
      "password": str,
      "rol": "admin" | "user"
    }
    """
    resp = SESSION.post(_url("/api/usuarios"), json=data, timeout=10)
    if resp.status_code in (200, 201):
        return resp.json()
    raise ServiceAPIError(f"Error al crear usuario: {resp.status_code} {resp.text}")


def actualizar_usuario(uid: int, data: dict) -> dict:
    resp = SESSION.put(_url(f"/api/usuarios/{uid}"), json=data, timeout=10)
    if resp.status_code == 200:
        return resp.json()
    raise ServiceAPIError(f"Error al actualizar usuario: {resp.status_code} {resp.text}")


def eliminar_usuario(uid: int) -> None:
    resp = SESSION.delete(_url(f"/api/usuarios/{uid}"), timeout=10)
    if resp.status_code in (200, 204):
        return
    if resp.status_code == 404:
        raise ServiceAPIError("Usuario no encontrado")
    raise ServiceAPIError(f"Error al eliminar usuario: {resp.status_code} {resp.text}")


# ==========================
# EMPRESAS
# ==========================

def listar_empresas(q: str = "") -> list[dict]:
    params = {}
    if q:
        params["q"] = q
    resp = SESSION.get(_url("/api/empresas"), params=params, timeout=10)
    if resp.status_code == 200:
        return resp.json()
    raise ServiceAPIError(f"Error al listar empresas: {resp.status_code} {resp.text}")


# CRUD para empresas desde el cliente
def crear_empresa(data: dict) -> dict:
    """
    Crea una empresa externa en la capa de servicios.
    data: { nit, nombre, telefono?, email?, direccion?, contacto_principal?, activo? }
    """
    resp = SESSION.post(_url("/api/empresas"), json=data, timeout=10)
    if resp.status_code in (200, 201):
        return resp.json()
    raise ServiceAPIError(f"Error al crear empresa: {resp.status_code} {resp.text}")


def actualizar_empresa(eid: int, data: dict) -> dict:
    resp = SESSION.put(_url(f"/api/empresas/{eid}"), json=data, timeout=10)
    if resp.status_code == 200:
        return resp.json()
    raise ServiceAPIError(f"Error al actualizar empresa: {resp.status_code} {resp.text}")


def eliminar_empresa(eid: int) -> None:
    resp = SESSION.delete(_url(f"/api/empresas/{eid}"), timeout=10)
    if resp.status_code in (200, 204):
        return
    if resp.status_code == 404:
        raise ServiceAPIError("Empresa no encontrada")
    raise ServiceAPIError(f"Error al eliminar empresa: {resp.status_code} {resp.text}")


# ==========================
# UBICACIONES
# ==========================

def listar_ubicaciones(q: str = "") -> list[dict]:
    params = {}
    if q:
        params["q"] = q
    resp = SESSION.get(_url("/api/ubicaciones"), params=params, timeout=10)
    if resp.status_code == 200:
        return resp.json()
    raise ServiceAPIError(f"Error al listar ubicaciones: {resp.status_code} {resp.text}")


# CRUD ubicaciones
def crear_ubicacion(data: dict) -> dict:
    """
    Crea una ubicación.
    data: { codigo, nombre, descripcion?, activo? }
    """
    resp = SESSION.post(_url("/api/ubicaciones"), json=data, timeout=10)
    if resp.status_code in (200, 201):
        return resp.json()
    raise ServiceAPIError(f"Error al crear ubicación: {resp.status_code} {resp.text}")


def actualizar_ubicacion(uid: int, data: dict) -> dict:
    resp = SESSION.put(_url(f"/api/ubicaciones/{uid}"), json=data, timeout=10)
    if resp.status_code == 200:
        return resp.json()
    raise ServiceAPIError(f"Error al actualizar ubicación: {resp.status_code} {resp.text}")


def eliminar_ubicacion(uid: int) -> None:
    resp = SESSION.delete(_url(f"/api/ubicaciones/{uid}"), timeout=10)
    if resp.status_code in (200, 204):
        return
    if resp.status_code == 404:
        raise ServiceAPIError("Ubicación no encontrada")
    raise ServiceAPIError(f"Error al eliminar ubicación: {resp.status_code} {resp.text}")


# ==========================
# RESPONSABLES DE ENTREGA
# ==========================

def listar_responsables(q: str = "", documento: str = "") -> list[dict]:
    params = {}
    if q:
        params["q"] = q
    if documento:
        params["documento"] = documento
    resp = SESSION.get(_url("/api/responsables-entrega"), params=params, timeout=10)
    if resp.status_code == 200:
        return resp.json()
    raise ServiceAPIError(f"Error al listar responsables: {resp.status_code} {resp.text}")


def obtener_responsable_por_documento(documento: str) -> dict:
    resp = SESSION.get(_url(f"/api/responsables-entrega/by-documento/{documento}"), timeout=10)
    if resp.status_code == 200:
        return resp.json()
    if resp.status_code == 404:
        raise ServiceAPIError("Responsable no encontrado")
    raise ServiceAPIError(f"Error al obtener responsable: {resp.status_code} {resp.text}")


def crear_responsable(data: dict) -> dict:
    """
    Crea un responsable de entrega.
    data: { documento, nombre, empresa_id, telefono?, email?, activo?, observaciones? }
    """
    resp = SESSION.post(_url("/api/responsables-entrega"), json=data, timeout=10)
    if resp.status_code in (200, 201):
        return resp.json()
    raise ServiceAPIError(f"Error al crear responsable: {resp.status_code} {resp.text}")


def actualizar_responsable(rid: int, data: dict) -> dict:
    resp = SESSION.put(_url(f"/api/responsables-entrega/{rid}"), json=data, timeout=10)
    if resp.status_code == 200:
        return resp.json()
    raise ServiceAPIError(f"Error al actualizar responsable: {resp.status_code} {resp.text}")


def eliminar_responsable(rid: int) -> None:
    resp = SESSION.delete(_url(f"/api/responsables-entrega/{rid}"), timeout=10)
    if resp.status_code in (200, 204):
        return
    if resp.status_code == 404:
        raise ServiceAPIError("Responsable no encontrado")
    raise ServiceAPIError(f"Error al eliminar responsable: {resp.status_code} {resp.text}")


# ==========================
# EQUIPOS
# ==========================

def listar_equipos(
    tipo: str = "",
    estado: str = "",
    texto: str = "",
) -> list[dict]:
    params = {}
    if tipo:
        params["tipo"] = tipo
    if estado:
        params["estado"] = estado
    if texto:
        params["q"] = texto

    resp = SESSION.get(_url("/api/equipos"), params=params, timeout=10)
    if resp.status_code == 200:
        return resp.json()
    raise ServiceAPIError(f"Error al listar equipos: {resp.status_code} {resp.text}")


def obtener_equipo(eid: int) -> dict:
    resp = SESSION.get(_url(f"/api/equipos/{eid}"), timeout=10)
    if resp.status_code == 200:
        return resp.json()
    if resp.status_code == 404:
        raise ServiceAPIError("Equipo no encontrado")
    raise ServiceAPIError(f"Error al obtener equipo: {resp.status_code} {resp.text}")


def crear_equipo(data: dict) -> dict:
    """
    Crea un equipo en la capa de servicios.
    data: campos aceptados por /api/equipos (tipo, categoria, empresa_id, responsable_entrega_id, ubicacion_id, registrado_por_id, etc.)
    """
    resp = SESSION.post(_url("/api/equipos"), json=data, timeout=15)
    if resp.status_code in (200, 201):
        return resp.json()
    raise ServiceAPIError(f"Error al crear equipo: {resp.status_code} {resp.text}")


def actualizar_equipo(eid: int, data: dict) -> dict:
    resp = SESSION.put(_url(f"/api/equipos/{eid}"), json=data, timeout=15)
    if resp.status_code == 200:
        return resp.json()
    raise ServiceAPIError(f"Error al actualizar equipo: {resp.status_code} {resp.text}")


def eliminar_equipo(eid: int) -> None:
    resp = SESSION.delete(_url(f"/api/equipos/{eid}"), timeout=10)
    if resp.status_code in (200, 204):
        return
    if resp.status_code == 404:
        raise ServiceAPIError("Equipo no encontrado")
    raise ServiceAPIError(f"Error al eliminar equipo: {resp.status_code} {resp.text}")
