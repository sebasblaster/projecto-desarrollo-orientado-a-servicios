# app1_api_fullstack/app.py
import os
import secrets
import io
from functools import wraps
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename

from flask import Flask, jsonify, request, render_template, send_from_directory
from flask import send_file, make_response
from config import Config
from models import (
    db,
    EmpresaExterna,
    Ubicacion,
    ResponsableEntrega,
    Usuario,
    Equipo,
)
from flask_cors import CORS
from sqlalchemy import or_


# ========================================================
# Configuración de carpeta de uploads (en servidor - local)
# ========================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # crea la carpeta si no existe con esta línea

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}

# para verificar extensiones permitidas
def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# para crear la app y configurar todo
def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    # Config para uploads
    app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB máx

    # CORS para exponer APIs a otros clientes (JS, React, RN, etc.)
    # Permitimos explícitamente OPTIONS y algunos headers comunes para preflight
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-User-Id", "X-User-Role", "X-Client"],
        supports_credentials=True,
    )

    # Simple permission decorator based on headers provided by clients
    # Clients must send: X-User-Id, X-User-Role, X-Client ("python" | "react")
    def require_action(action: str):
        """Decorator to require permission for an action: 'create','read','update','delete'"""

        def decorator(f):
            @wraps(f)
            def wrapper(*args, **kwargs):
                role = (request.headers.get("X-User-Role") or "").lower()
                client = (request.headers.get("X-Client") or "").lower()
                # permission matrix
                # client 'python': admin -> CRUD, user -> read+update
                # client 'react' : admin -> CRUD, user -> update+delete
                allowed = False
                if client == "python":
                    if role == "admin":
                        allowed = True
                    elif role == "user":
                        if action in ("read", "update"):
                            allowed = True
                elif client == "react":
                    if role == "admin":
                        allowed = True
                    elif role == "user":
                        if action in ("update", "delete"):
                            allowed = True
                else:
                    # default conservative: only allow read for everyone
                    if action == "read":
                        allowed = True

                if not allowed:
                    return (jsonify({"error": "No autorizado para esta acción"}), 403)

                return f(*args, **kwargs)

            return wrapper

        return decorator

    # ========================================================
    # CREACIÓN DE TABLAS + SEMILLAS
    # ========================================================
    with app.app_context():
        db.create_all()

        # ------------ Empresas externas ------------
        if EmpresaExterna.query.count() == 0:
            e1 = EmpresaExterna(
                nit="900123456-1",
                nombre="ACME Servicios Tecnológicos SAS",
                telefono="3001234567",
                email="contacto@acme.test",
                direccion="Calle 10 # 20-30",
                contacto_principal="Juan Pérez",
            )
            e2 = EmpresaExterna(
                nit="901987654-2",
                nombre="BioServicios Médicos SAS",
                telefono="3019876543",
                email="soporte@bioservicios.test",
                direccion="Carrera 15 # 45-60",
                contacto_principal="Ana Gómez",
            )
            db.session.add_all([e1, e2])
            db.session.flush()  # para tener IDs

        # ------------ Ubicaciones ------------
        if Ubicacion.query.count() == 0:
            u1 = Ubicacion( # ubicaciones de ejemplo
                codigo="SOPORTE",
                nombre="Sala de Soporte",
                descripcion="Área de soporte técnico",
            )
            u2 = Ubicacion( # ubicaciones de ejemplo
                codigo="CARDIO",
                nombre="Servicio de Cardiología",
                descripcion="Sala de procedimientos de cardiología",
            )
            db.session.add_all([u1, u2])
            db.session.flush()

        # ------------ Usuarios ------------
        if Usuario.query.count() == 0:
            admin = Usuario( # usuario admin de ejemplo
                username="admin",
                nombre_completo="Administrador HSRT",
                email="admin@hsrt.test",
                rol="admin",
            )
            admin.set_password("admin123")  # contraseña de prueba

            user = Usuario( # usuario user de ejemplo
                username="user",
                nombre_completo="Usuario Operativo",
                email="user@hsrt.test",
                rol="user",
            )
            user.set_password("user123")

            db.session.add_all([admin, user])
            db.session.flush()

        # ------------ Responsables de entrega ------------
        if ResponsableEntrega.query.count() == 0:
            acme = EmpresaExterna.query.filter_by(
                nombre="ACME Servicios Tecnológicos SAS"
            ).first()
            bio = EmpresaExterna.query.filter_by(
                nombre="BioServicios Médicos SAS"
            ).first()

            r1 = ResponsableEntrega( # responsables de entrega de ejemplo
                documento="123456789",
                nombre="Técnico ACME Principal",
                telefono="3000000001",
                email="tecnico1@acme.test",
                empresa_id=acme.id if acme else None,
                observaciones="Responsable de la mayoría de ingresos de TI.",
            )
            r2 = ResponsableEntrega( # responsables de entrega de ejemplo
                documento="987654321",
                nombre="Técnico Biomédico 1",
                telefono="3000000002",
                email="tecnico1@bioservicios.test",
                empresa_id=bio.id if bio else None,
            )
            db.session.add_all([r1, r2])
            db.session.flush()

        # ------------ Equipos (seed de ejemplo) ------------
        if Equipo.query.count() == 0:
            empresa_acme = EmpresaExterna.query.filter_by(
                nombre="ACME Servicios Tecnológicos SAS"
            ).first()
            empresa_bio = EmpresaExterna.query.filter_by(
                nombre="BioServicios Médicos SAS"
            ).first()
            resp_acme = ResponsableEntrega.query.filter_by(
                documento="123456789"
            ).first()
            resp_bio = ResponsableEntrega.query.filter_by(
                documento="987654321"
            ).first()
            admin = Usuario.query.filter_by(username="admin").first()
            u_soporte = Ubicacion.query.filter_by(codigo="SOPORTE").first()
            u_cardio = Ubicacion.query.filter_by(codigo="CARDIO").first()

            db.session.add_all( # equipos de ejemplo para ingreso inicial
                [
                    Equipo(
                        tipo="tecnologico",
                        categoria="computo",
                        marca="Dell",
                        modelo="Latitude 5440",
                        serie="DL-5440-ACME-001",
                        descripcion="Equipo portátil para pruebas de sistemas.",
                        # Nueva ficha técnica cargada desde /uploads/
                        doc_ingreso="/uploads/proof.pdf",
                        empresa_id=empresa_acme.id if empresa_acme else None,
                        responsable_entrega_id=resp_acme.id if resp_acme else None,
                        ubicacion_id=u_soporte.id if u_soporte else None,
                        usuario_autoriza_id=admin.id if admin else None,
                        registrado_por_id=admin.id if admin else None,
                        estado="autorizado",
                        condicion="operativo",
                        observaciones="Ingreso inicial.",
                    ),
                    Equipo(
                        tipo="biomedico",
                        categoria="biomedico",
                        marca="GE",
                        modelo="MAC 2000",
                        serie="GE-MAC2K-BIO-001",
                        descripcion="Equipo biomédico en evaluación.",
                        # Segunda ficha técnica usando proof.png
                        doc_ingreso="/uploads/proof.png",
                        empresa_id=empresa_bio.id if empresa_bio else None,
                        responsable_entrega_id=resp_bio.id if resp_bio else None,
                        ubicacion_id=u_cardio.id if u_cardio else None,
                        usuario_autoriza_id=None,  # aún sin autorización
                        registrado_por_id=admin.id if admin else None,
                        estado="en_revision",
                        condicion="averiado",
                        observaciones="Pendiente diagnóstico.",
                    ),
                ]
            )


        db.session.commit()

    # ========================================================
    # VISTAS SSR (JINJA)
    # ========================================================
    @app.get("/") # página de inicio con estadísticas
    def home():
        total_equipos = Equipo.query.count()
        total_empresas = EmpresaExterna.query.count()
        total_responsables = ResponsableEntrega.query.count()
        total_ubicaciones = Ubicacion.query.count()
        total_usuarios = Usuario.query.count()
        return render_template(
            "index.html",
            total_equipos=total_equipos,
            total_empresas=total_empresas,
            total_responsables=total_responsables,
            total_ubicaciones=total_ubicaciones,
            total_usuarios=total_usuarios,
        )

    @app.get("/equipos") # página de equipos
    def equipos_page():
        equipos = Equipo.query.order_by(Equipo.id.desc()).all()
        return render_template("equipos.html", equipos=equipos)

    @app.get("/responsables") # página de responsables de entrega
    def responsables_page():
        responsables = (
            ResponsableEntrega.query.order_by(ResponsableEntrega.nombre.asc()).all()
        )
        return render_template("responsables.html", responsables=responsables)

    @app.get("/empresas") # página de empresas externas
    def empresas_page():
        empresas = EmpresaExterna.query.order_by(EmpresaExterna.nombre.asc()).all()
        return render_template("empresas.html", empresas=empresas)

    @app.get("/ubicaciones") # página de ubicaciones
    def ubicaciones_page():
        ubicaciones = Ubicacion.query.order_by(Ubicacion.nombre.asc()).all()
        return render_template("ubicaciones.html", ubicaciones=ubicaciones)

    # ========================================================
    # ENDPOINTS PARA ARCHIVOS SUBIDOS
    # ========================================================
    @app.post("/api/upload") # endpoint para subir archivos
    def api_upload():
        """
        Sube un archivo (pdf / imagen) y devuelve la ruta pública.
        Campo esperado: file (multipart/form-data)
        """
        if "file" not in request.files:
            return jsonify({"error": "No se envió ningún archivo bajo 'file'"}), 400

        file = request.files["file"]

        if file.filename == "":
            return jsonify({"error": "El archivo no tiene nombre"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": "Tipo de archivo no permitido"}), 400

        filename = secure_filename(file.filename)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        final_name = f"{timestamp}_{filename}"

        save_path = os.path.join(app.config["UPLOAD_FOLDER"], final_name)
        file.save(save_path)

        public_url = f"/uploads/{final_name}"
        return jsonify({"ok": True, "file": public_url}), 201

    @app.get("/uploads/<path:filename>") # endpoint para servir archivos subidos
    def uploaded_file(filename):
        """
        Sirve archivos subidos desde la carpeta uploads.
        """
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    # ========================================================
    # APIs – EMPRESAS
    # ========================================================
    @require_action("read")
    @app.get("/api/empresas") # endpoint para listar empresas
    def api_empresas_listar():
        q = EmpresaExterna.query
        texto = (request.args.get("q") or "").strip()
        if texto:
            like = f"%{texto}%"
            q = q.filter(
                or_(
                    EmpresaExterna.nombre.ilike(like),
                    EmpresaExterna.nit.ilike(like),
                    EmpresaExterna.email.ilike(like),
                )
            )
        items = q.order_by(EmpresaExterna.nombre.asc()).all()
        return jsonify([e.to_dict() for e in items])

    @require_action("create")
    @app.post("/api/empresas") # endpoint para crear empresa
    def api_empresas_crear():
        data = request.get_json(silent=True) or {}
        nit = (data.get("nit") or "").strip()
        nombre = (data.get("nombre") or "").strip()
        if not nit or not nombre:
            return jsonify({"error": "nit y nombre son obligatorios"}), 400

        existe = EmpresaExterna.query.filter_by(nit=nit).first()
        if existe:
            return jsonify({"error": "La empresa con ese NIT ya existe"}), 409

        e = EmpresaExterna(
            nit=nit,
            nombre=nombre,
            telefono=(data.get("telefono") or None),
            email=(data.get("email") or None),
            direccion=(data.get("direccion") or None),
            contacto_principal=(data.get("contacto_principal") or None),
            activo=bool(data.get("activo", True)),
        )
        db.session.add(e)
        db.session.commit()
        return jsonify(e.to_dict()), 201

    @require_action("update")
    @app.put("/api/empresas/<int:eid>") # endpoint para actualizar empresa
    def api_empresas_actualizar(eid):
        e = EmpresaExterna.query.get_or_404(eid)
        data = request.get_json(silent=True) or {}

        if "nit" in data:
            nit = (data.get("nit") or "").strip()
            if nit:
                choque = EmpresaExterna.query.filter(
                    EmpresaExterna.nit == nit, EmpresaExterna.id != eid
                ).first()
                if choque:
                    return jsonify({"error": "Otra empresa ya usa ese NIT"}), 409
                e.nit = nit

        for field in ["nombre", "telefono", "email", "direccion", "contacto_principal"]:
            if field in data:
                val = (data.get(field) or "").strip()
                setattr(e, field, val or None)

        if "activo" in data:
            e.activo = bool(data.get("activo"))

        db.session.commit()
        return jsonify(e.to_dict())

    @require_action("delete")
    @app.delete("/api/empresas/<int:eid>") # endpoint para eliminar empresa
    def api_empresas_eliminar(eid):
        e = EmpresaExterna.query.get_or_404(eid)
        db.session.delete(e)
        db.session.commit()
        return jsonify({"ok": True})

    # ========================================================
    # APIs – UBICACIONES
    # ========================================================
    @require_action("read")
    @app.get("/api/ubicaciones") # endpoint para listar ubicaciones
    def api_ubicaciones_listar():
        q = Ubicacion.query
        texto = (request.args.get("q") or "").strip()
        if texto:
            like = f"%{texto}%"
            q = q.filter(
                or_(Ubicacion.nombre.ilike(like), Ubicacion.codigo.ilike(like))
            )
        items = q.order_by(Ubicacion.nombre.asc()).all()
        return jsonify([u.to_dict() for u in items])

    @require_action("create")
    @app.post("/api/ubicaciones") # endpoint para crear ubicación
    def api_ubicaciones_crear():
        data = request.get_json(silent=True) or {}
        codigo = (data.get("codigo") or "").strip()
        nombre = (data.get("nombre") or "").strip()

        if not codigo or not nombre:
            return jsonify({"error": "codigo y nombre son obligatorios"}), 400

        existe = Ubicacion.query.filter_by(codigo=codigo).first()
        if existe:
            return jsonify({"error": "Ya existe una ubicación con ese código"}), 409

        u = Ubicacion(
            codigo=codigo,
            nombre=nombre,
            descripcion=(data.get("descripcion") or None),
            activo=bool(data.get("activo", True)),
        )
        db.session.add(u)
        db.session.commit()
        return jsonify(u.to_dict()), 201

    @require_action("update")
    @app.put("/api/ubicaciones/<int:uid>")
    def api_ubicaciones_actualizar(uid):
        u = Ubicacion.query.get_or_404(uid)
        data = request.get_json(silent=True) or {}

        if "codigo" in data:
            codigo = (data.get("codigo") or "").strip()
            if codigo:
                choque = Ubicacion.query.filter(
                    Ubicacion.codigo == codigo, Ubicacion.id != uid
                ).first()
                if choque:
                    return jsonify({"error": "Otra ubicación ya usa ese código"}), 409
                u.codigo = codigo

        for field in ["nombre", "descripcion"]:
            if field in data:
                val = (data.get(field) or "").strip()
                setattr(u, field, val or None)

        if "activo" in data:
            u.activo = bool(data.get("activo"))

        db.session.commit()
        return jsonify(u.to_dict())

    @app.delete("/api/ubicaciones/<int:uid>")
    def api_ubicaciones_eliminar(uid):
        u = Ubicacion.query.get_or_404(uid)
        db.session.delete(u)
        db.session.commit()
        return jsonify({"ok": True})

    # ========================================================
    # APIs – RESPONSABLES DE ENTREGA
    # ========================================================
    @require_action("read")
    @app.get("/api/responsables-entrega")
    def api_responsables_listar():
        q = ResponsableEntrega.query
        texto = (request.args.get("q") or "").strip()
        documento = (request.args.get("documento") or "").strip()

        if documento:
            q = q.filter(ResponsableEntrega.documento == documento)

        if texto:
            like = f"%{texto}%"
            q = q.filter(
                or_(
                    ResponsableEntrega.nombre.ilike(like),
                    ResponsableEntrega.documento.ilike(like),
                    ResponsableEntrega.email.ilike(like),
                    ResponsableEntrega.telefono.ilike(like),
                )
            )

        items = q.order_by(ResponsableEntrega.nombre.asc()).all()
        return jsonify([r.to_dict() for r in items])

    @require_action("read")
    @app.get("/api/responsables-entrega/by-documento/<string:documento>")
    def api_responsables_por_documento(documento):
        r = ResponsableEntrega.query.filter_by(
            documento=documento.strip()
        ).first_or_404()
        return jsonify(r.to_dict())

    @require_action("create")
    @app.post("/api/responsables-entrega")
    def api_responsables_crear():
        data = request.get_json(silent=True) or {}
        nombre = (data.get("nombre") or "").strip()
        documento = (data.get("documento") or "").strip()
        empresa_id = data.get("empresa_id")

        if not nombre or not documento or not empresa_id:
            return jsonify(
                {"error": "nombre, documento y empresa_id son obligatorios"}
            ), 400

        EmpresaExterna.query.get_or_404(int(empresa_id))

        existe = ResponsableEntrega.query.filter_by(documento=documento).first()
        if existe:
            return jsonify({"error": "documento ya existe para otro responsable"}), 409

        r = ResponsableEntrega(
            documento=documento,
            nombre=nombre,
            empresa_id=int(empresa_id),
            telefono=(data.get("telefono") or None),
            email=(data.get("email") or None),
            activo=bool(data.get("activo", True)),
            observaciones=(data.get("observaciones") or None),
        )
        db.session.add(r)
        db.session.commit()
        return jsonify(r.to_dict()), 201

    @require_action("update")
    @app.put("/api/responsables-entrega/<int:rid>")
    def api_responsables_actualizar(rid):
        r = ResponsableEntrega.query.get_or_404(rid)
        data = request.get_json(silent=True) or {}

        if "documento" in data:
            documento = (data.get("documento") or "").strip()
            if documento:
                choque = ResponsableEntrega.query.filter(
                    ResponsableEntrega.documento == documento,
                    ResponsableEntrega.id != rid,
                ).first()
                if choque:
                    return jsonify({"error": "documento ya existe para otro responsable"}), 409
                r.documento = documento

        if "empresa_id" in data and data["empresa_id"]:
            EmpresaExterna.query.get_or_404(int(data["empresa_id"]))
            r.empresa_id = int(data["empresa_id"])

        for field in ["nombre", "telefono", "email", "observaciones"]:
            if field in data:
                val = (data.get(field) or "").strip()
                setattr(r, field, val or None)

        if "activo" in data:
            r.activo = bool(data.get("activo"))

        db.session.commit()
        return jsonify(r.to_dict())

    @require_action("delete")
    @app.delete("/api/responsables-entrega/<int:rid>")
    def api_responsables_eliminar(rid):
        r = ResponsableEntrega.query.get_or_404(rid)
        db.session.delete(r)
        db.session.commit()
        return jsonify({"ok": True})

    # ========================================================
    # APIs – USUARIOS (CRUD para gestión desde el cliente)
    # ========================================================
    @require_action("read")
    @app.get("/api/usuarios")
    def api_usuarios_listar():
        """
        Lista todos los usuarios. (Solo datos básicos, sin hashes).
        Soporta filtro opcional: ?role=admin|user y búsqueda ?q=texto
        """
        q = Usuario.query
        role_filter = (request.args.get("role") or "").strip().lower()
        text_q = (request.args.get("q") or "").strip()

        if role_filter in {"admin", "user"}:
            q = q.filter(Usuario.rol == role_filter)

        if text_q:
            like = f"%{text_q}%"
            q = q.filter(
                or_(
                    Usuario.username.ilike(like),
                    Usuario.nombre_completo.ilike(like),
                    Usuario.email.ilike(like),
                )
            )

        usuarios = q.order_by(Usuario.id.asc()).all()
        return jsonify([u.to_dict() for u in usuarios])

    @require_action("read")
    @app.get("/api/usuarios/<int:uid>")
    def api_usuarios_detalle(uid):
        """
        Devuelve un usuario por ID.
        """
        u = Usuario.query.get_or_404(uid)
        return jsonify(u.to_dict())

    @require_action("create")
    @app.post("/api/usuarios")
    def api_usuarios_crear():
        """
        Crea un nuevo usuario.
        Espera JSON: { username, nombre_completo, email, password, rol }
        """
        data = request.get_json(silent=True) or {}

        username = (data.get("username") or "").strip()
        nombre_completo = (data.get("nombre_completo") or "").strip()
        email = (data.get("email") or "").strip() or None
        password = (data.get("password") or "").strip()
        rol = (data.get("rol") or "user").strip()

        if not username or not nombre_completo or not password:
            return jsonify({
                "error": "username, nombre_completo y password son obligatorios"
            }), 400

        if rol not in {"admin", "user"}:
            return jsonify({"error": "rol debe ser 'admin' o 'user'"}), 400

        # Validar unicidad
        if Usuario.query.filter_by(username=username).first():
            return jsonify({"error": "Ya existe un usuario con ese username"}), 409

        if email and Usuario.query.filter_by(email=email).first():
            return jsonify({"error": "Ya existe un usuario con ese email"}), 409

        u = Usuario(
            username=username,
            nombre_completo=nombre_completo,
            email=email,
            rol=rol,
            activo=True,
        )
        u.set_password(password)

        db.session.add(u)
        db.session.commit()

        return jsonify(u.to_dict()), 201

    @require_action("update")
    @app.put("/api/usuarios/<int:uid>")
    def api_usuarios_actualizar(uid):
        """
        Actualiza un usuario existente.
        Permite cambiar: username, nombre_completo, email, rol, activo, password.
        """
        u = Usuario.query.get_or_404(uid)
        data = request.get_json(silent=True) or {}

        if "username" in data:
            username = (data.get("username") or "").strip()
            if username:
                choque = Usuario.query.filter(
                    Usuario.username == username,
                    Usuario.id != uid
                ).first()
                if choque:
                    return jsonify({"error": "Otro usuario ya usa ese username"}), 409
                u.username = username

        if "nombre_completo" in data:
            nombre = (data.get("nombre_completo") or "").strip()
            u.nombre_completo = nombre or u.nombre_completo

        if "email" in data:
            email = (data.get("email") or "").strip() or None
            if email:
                choque = Usuario.query.filter(
                    Usuario.email == email,
                    Usuario.id != uid
                ).first()
                if choque:
                    return jsonify({"error": "Otro usuario ya usa ese email"}), 409
            u.email = email

        if "rol" in data:
            rol = (data.get("rol") or "").strip()
            if rol and rol in {"admin", "user"}:
                u.rol = rol

        if "activo" in data:
            u.activo = bool(data.get("activo"))

        if "password" in data:
            password = (data.get("password") or "").strip()
            if password:
                u.set_password(password)

        db.session.commit()
        return jsonify(u.to_dict())

    @require_action("delete")
    @app.delete("/api/usuarios/<int:uid>")
    def api_usuarios_eliminar(uid):
        """
        Elimina un usuario por ID.
        (En un sistema real, podríamos marcar 'activo=False' en vez de borrar).
        """
        u = Usuario.query.get_or_404(uid)
        db.session.delete(u)
        db.session.commit()
        return jsonify({"ok": True})


    # ============================================================
    # LOGIN – API para clientes externos (APP2, APP3, APP4)
    # ============================================================
    @app.post("/api/auth/login")
    def api_auth_login():
        data = request.get_json() or {}
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()

        if not username or not password:
            return jsonify({"error": "Usuario y contraseña requeridos"}), 400

        usuario = Usuario.query.filter_by(username=username).first()

        if not usuario or not usuario.check_password(password):
            return jsonify({"error": "Credenciales inválidas"}), 401

        # Importante: NO devolver password ni hash
        return jsonify({
            "id": usuario.id,
            "username": usuario.username,
            "nombre_completo": usuario.nombre_completo,
            "email": usuario.email,
            "rol": usuario.rol,
        }), 200


    # ============================================================
    # RECUPERACIÓN DE CONTRASEÑA (RESET)
    # ============================================================

    @app.post("/api/auth/request-reset")
    def api_auth_request_reset():
        """
        Recibe un identificador (username o email) y genera un token de
        restablecimiento para ese usuario, con fecha de expiración.
        JSON esperado: { "identifier": "admin" }  # username o email
        """
        data = request.get_json() or {}
        identifier = (data.get("identifier") or "").strip()

        if not identifier:
            return jsonify({"error": "identifier (usuario o correo) es requerido"}), 400

        # Buscar por username o email
        usuario = Usuario.query.filter(
            or_(Usuario.username == identifier, Usuario.email == identifier)
        ).first()

        if not usuario:
            # devolvemos 404 claro.
            # 200 con mensaje genérico.
            return jsonify({"error": "No se encontró un usuario con ese identificador"}), 404

        # Generar token seguro y expiración
        token = secrets.token_urlsafe(32) # 32 equivale a 256 bits, para generar token seguro de caracteres URL-safe, son 43 caracteres aprox.
        expires_at = datetime.utcnow() + timedelta(minutes=30) # utcnow + 30 minutos, tiempo limitado

        usuario.reset_token = token
        usuario.reset_expires = expires_at
        db.session.commit()

        return jsonify({
            "ok": True,
            "message": "Se generó un token de restablecimiento.",
            "token": token,
            "expires_at": expires_at.isoformat()
        }), 200

    @app.get("/api/auth/validate-reset-token")
    def api_auth_validate_reset_token():
        """
        Valida si un token de reset es válido y no ha expirado.
        Parámetro: ?token=...
        """
        token = (request.args.get("token") or "").strip()
        if not token:
            return jsonify({"error": "Token requerido"}), 400

        usuario = Usuario.query.filter_by(reset_token=token).first()
        if not usuario:
            return jsonify({"error": "Token inválido"}), 404

        if not usuario.reset_expires or usuario.reset_expires < datetime.utcnow():
            return jsonify({"error": "Token expirado"}), 400

        return jsonify({"ok": True}), 200

    @app.post("/api/auth/reset-password")
    def api_auth_reset_password():
        """
        Cambia la contraseña usando un token válido.
        JSON esperado: { "token": "...", "password": "nueva" }
        """
        data = request.get_json() or {}
        token = (data.get("token") or "").strip()
        new_password = (data.get("password") or "").strip()

        if not token or not new_password:
            return jsonify({"error": "Token y nueva contraseña son requeridos"}), 400

        usuario = Usuario.query.filter_by(reset_token=token).first()
        if not usuario:
            return jsonify({"error": "Token inválido"}), 404

        if not usuario.reset_expires or usuario.reset_expires < datetime.utcnow():
            return jsonify({"error": "Token expirado"}), 400

        # Cambiar contraseña
        usuario.set_password(new_password)
        usuario.reset_token = None
        usuario.reset_expires = None
        db.session.commit()

        return jsonify({"ok": True, "message": "Contraseña actualizada correctamente."}), 200


    # ==========================================================
    # METADATOS / ENUMS (para ayudar al cliente a poblar selects)
    # ==========================================================
    @app.get("/api/meta/usuarios/enums")
    def api_meta_usuarios_enums():
        """Devuelve enums relacionados con usuarios (roles, estados)."""
        return jsonify({
            "roles": ["admin", "user"],
            "estados": ["activo", "inactivo"],
        })

    @app.get("/api/meta/equipos/enums")
    def api_meta_equipos_enums():
        """Devuelve enums relacionados con equipos (tipos, estados, categorias, condiciones)."""
        return jsonify({
            "tipos": ["tecnologico", "biomedico"],
            "estados": ["ingresado", "en_revision", "autorizado", "rechazado"],
            "categorias": ["computo", "impresion", "red", "biomedico", "otro"],
            "condiciones": ["operativo", "averiado", "desconocido"],
        })



    # ========================================================
    # APIs – EQUIPOS
    # ========================================================
    @require_action("read")
    @app.get("/api/equipos")
    def api_equipos_listar():
        q = Equipo.query

        tipo = (request.args.get("tipo") or "").strip().lower()
        estado = (request.args.get("estado") or "").strip().lower()
        texto = (request.args.get("q") or "").strip()

        empresa_id = request.args.get("empresa_id")
        responsable_id = request.args.get("responsable_entrega_id")
        ubicacion_id = request.args.get("ubicacion_id")
        usuario_autoriza_id = request.args.get("usuario_autoriza_id")
        registrado_por_id = request.args.get("registrado_por_id")

        if tipo in {"biomedico", "tecnologico"}:
            q = q.filter(Equipo.tipo == tipo)
        if estado:
            q = q.filter(Equipo.estado == estado)
        if empresa_id:
            q = q.filter(Equipo.empresa_id == int(empresa_id))
        if responsable_id:
            q = q.filter(Equipo.responsable_entrega_id == int(responsable_id))
        if ubicacion_id:
            q = q.filter(Equipo.ubicacion_id == int(ubicacion_id))
        if usuario_autoriza_id:
            q = q.filter(Equipo.usuario_autoriza_id == int(usuario_autoriza_id))
        if registrado_por_id:
            q = q.filter(Equipo.registrado_por_id == int(registrado_por_id))

        if texto:
            like = f"%{texto}%"
            q = q.filter(
                or_(
                    Equipo.categoria.ilike(like),
                    Equipo.marca.ilike(like),
                    Equipo.modelo.ilike(like),
                    Equipo.serie.ilike(like),
                    Equipo.descripcion.ilike(like),
                )
            )

        items = q.order_by(Equipo.id.desc()).all()
        return jsonify([e.to_dict() for e in items])

    @require_action("read")
    @app.get("/api/equipos/<int:eid>")
    def api_equipos_detalle(eid):
        e = Equipo.query.get_or_404(eid)
        return jsonify(e.to_dict())

    @require_action("create")
    @app.post("/api/equipos")
    def api_equipos_crear():
        data = request.get_json(silent=True) or {}

        tipo = (data.get("tipo") or "").strip().lower()
        categoria = (data.get("categoria") or "").strip().lower()

        empresa_id = data.get("empresa_id")
        responsable_id = data.get("responsable_entrega_id")
        ubicacion_id = data.get("ubicacion_id")
        registrado_por_id = data.get("registrado_por_id")

        if tipo not in {"tecnologico", "biomedico"}:
            return jsonify({"error": "tipo debe ser 'tecnologico' o 'biomedico'"}), 400

        categorias_validas = {"computo", "impresion", "red", "biomedico", "otro"}
        if categoria not in categorias_validas:
            return jsonify(
                {"error": f"categoria debe ser una de {sorted(categorias_validas)}"}
            ), 400

        if not all([empresa_id, responsable_id, ubicacion_id, registrado_por_id]):
            return jsonify(
                {
                    "error": "empresa_id, responsable_entrega_id, ubicacion_id y registrado_por_id son requeridos"
                }
            ), 400

        EmpresaExterna.query.get_or_404(int(empresa_id))
        ResponsableEntrega.query.get_or_404(int(responsable_id))
        Ubicacion.query.get_or_404(int(ubicacion_id))
        Usuario.query.get_or_404(int(registrado_por_id))

        usuario_autoriza_id = data.get("usuario_autoriza_id")
        if usuario_autoriza_id:
            Usuario.query.get_or_404(int(usuario_autoriza_id))

        e = Equipo(
            tipo=tipo,
            categoria=categoria,
            marca=(data.get("marca") or None),
            modelo=(data.get("modelo") or None),
            serie=(data.get("serie") or None),
            descripcion=(data.get("descripcion") or None),
            doc_ingreso=(data.get("doc_ingreso") or None),
            empresa_id=int(empresa_id),
            responsable_entrega_id=int(responsable_id),
            ubicacion_id=int(ubicacion_id),
            usuario_autoriza_id=int(usuario_autoriza_id)
            if usuario_autoriza_id
            else None,
            registrado_por_id=int(registrado_por_id),
            estado=(data.get("estado") or "ingresado"),
            condicion=(data.get("condicion") or "desconocido"),
            observaciones=(data.get("observaciones") or None),
        )

        db.session.add(e)
        db.session.commit()
        return jsonify(e.to_dict()), 201

    @require_action("update")
    @app.put("/api/equipos/<int:eid>")
    def api_equipos_actualizar(eid):
        e = Equipo.query.get_or_404(eid)
        data = request.get_json(silent=True) or {}

        if "tipo" in data:
            tipo = (data.get("tipo") or "").strip().lower()
            if tipo not in {"tecnologico", "biomedico"}:
                return jsonify({"error": "tipo inválido"}), 400
            e.tipo = tipo

        if "categoria" in data:
            categoria = (data.get("categoria") or "").strip().lower()
            categorias_validas = {"computo", "impresion", "red", "biomedico", "otro"}
            if categoria not in categorias_validas:
                return jsonify(
                    {
                        "error": f"categoria debe ser una de {sorted(categorias_validas)}"
                    }
                ), 400
            e.categoria = categoria

        for field in [
            "marca",
            "modelo",
            "serie",
            "descripcion",
            "doc_ingreso",
            "observaciones",
        ]:
            if field in data:
                val = (data.get(field) or "").strip()
                setattr(e, field, val or None)

        if "estado" in data:
            e.estado = (data.get("estado") or e.estado).strip()

        if "condicion" in data:
            e.condicion = (data.get("condicion") or e.condicion).strip()

        if "empresa_id" in data and data["empresa_id"]:
            EmpresaExterna.query.get_or_404(int(data["empresa_id"]))
            e.empresa_id = int(data["empresa_id"])

        if "responsable_entrega_id" in data and data["responsable_entrega_id"]:
            ResponsableEntrega.query.get_or_404(int(data["responsable_entrega_id"]))
            e.responsable_entrega_id = int(data["responsable_entrega_id"])

        if "ubicacion_id" in data and data["ubicacion_id"]:
            Ubicacion.query.get_or_404(int(data["ubicacion_id"]))
            e.ubicacion_id = int(data["ubicacion_id"])

        if "usuario_autoriza_id" in data:
            uid = data.get("usuario_autoriza_id")
            if uid:
                Usuario.query.get_or_404(int(uid))
                e.usuario_autoriza_id = int(uid)
            else:
                e.usuario_autoriza_id = None

        if "registrado_por_id" in data and data["registrado_por_id"]:
            Usuario.query.get_or_404(int(data["registrado_por_id"]))
            e.registrado_por_id = int(data["registrado_por_id"])

        db.session.commit()
        return jsonify(e.to_dict())

    @require_action("delete")
    @app.delete("/api/equipos/<int:eid>")
    def api_equipos_eliminar(eid):
        e = Equipo.query.get_or_404(eid)
        db.session.delete(e)
        db.session.commit()
        return jsonify({"ok": True})

    # ========================================================
    # REPORTES (PDF / EXCEL)
    # ========================================================
    @require_action("read")
    @app.get("/api/reports/<string:entity>")
    def api_reports(entity):
        fmt = (request.args.get("format") or "pdf").lower()

        if entity not in ("empresas", "equipos", "usuarios"):
            return jsonify({"error": "Entidad no soportada para reportes"}), 400

        rows = []
        columns = []
        if entity == "empresas":
            items = EmpresaExterna.query.order_by(EmpresaExterna.nombre.asc()).all()
            columns = ["id", "nit", "nombre", "contacto_principal", "telefono", "email", "activo"]
            rows = [[getattr(i, c) for c in columns] for i in items]

        elif entity == "usuarios":
            items = Usuario.query.order_by(Usuario.id.asc()).all()
            columns = ["id", "username", "nombre_completo", "email", "rol", "activo"]
            rows = [[getattr(i, c) for c in columns] for i in items]

        elif entity == "equipos":
            items = Equipo.query.order_by(Equipo.id.asc()).all()
            # minimal fields for equipos
            columns = ["id", "tag", "tipo", "estado", "empresa_id", "ubicacion_id"]
            rows = [[getattr(i, c) for c in columns] for i in items]

        # Build DataFrame for Excel
        df = pd.DataFrame(rows, columns=columns)

        if fmt in ("xlsx", "excel"):
            # Create an Excel file in memory with some basic styling
            buf = io.BytesIO()
            with pd.ExcelWriter(buf, engine="xlsxwriter") as writer:
                df.to_excel(writer, index=False, sheet_name=entity)
                workbook = writer.book
                worksheet = writer.sheets[entity]

                # Header format: purple background, white bold text
                header_format = workbook.add_format({
                    'bold': True,
                    'font_color': '#ffffff',
                    'bg_color': '#6f42c1',
                    'align': 'center'
                })

                for col_num, value in enumerate(df.columns.values):
                    worksheet.write(0, col_num, value, header_format)
                    # set a reasonable column width
                    max_len = max(df[value].astype(str).map(len).max(), len(value))
                    worksheet.set_column(col_num, col_num, max(12, min(40, max_len + 2)))

            buf.seek(0)
            filename = f"report_{entity}.xlsx"
            return send_file(buf, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', as_attachment=True, download_name=filename)

        # PDF generation with reportlab (enhanced styling)
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=letter, rightMargin=24, leftMargin=24, topMargin=24, bottomMargin=24)

        styles = getSampleStyleSheet()
        title_style = styles['Heading1']
        title_style.textColor = colors.HexColor('#6f42c1')
        title_style.fontSize = 16

        subtitle = Paragraph(f"Reporte: {entity.capitalize()} - {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", styles['Normal'])

        data = [columns] + rows
        table = Table(data, hAlign='LEFT')
        # Table style: purple header, white header text, zebra rows, subtle grid
        table_style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6f42c1')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ])

        # zebra rows
        for i in range(1, len(data)):
            if i % 2 == 0:
                table_style.add('BACKGROUND', (0, i), (-1, i), colors.HexColor('#f7f1ff'))

        table.setStyle(table_style)
        elements = [Paragraph(f"Reporte: {entity.capitalize()}", title_style), Spacer(1, 8), subtitle, Spacer(1, 12), table]
        doc.build(elements)
        buf.seek(0)
        filename = f"report_{entity}.pdf"
        # return as a proper file response
        return send_file(buf, mimetype='application/pdf', as_attachment=True, download_name=filename)

    return app


app = create_app()

if __name__ == "__main__":
    # App1 en puerto 5000
    app.run(host="0.0.0.0", port=5000, debug=True)
