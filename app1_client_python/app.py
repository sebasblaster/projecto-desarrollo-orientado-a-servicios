# app.py (cliente)
import os
import requests
from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    flash,
)
from dotenv import load_dotenv

from api_client import (
    ServiceAPIError,
    login_usuario,
    set_auth,
    listar_empresas,
    listar_ubicaciones,
    listar_responsables,
    listar_equipos,
    listar_usuarios,
    obtener_usuario,
    crear_usuario,
    actualizar_usuario,
    eliminar_usuario,
    solicitar_reset_password,  
    validar_reset_token,       
    resetear_password,         
    crear_empresa,
    actualizar_empresa,
    eliminar_empresa,
        crear_ubicacion,
        actualizar_ubicacion,
        eliminar_ubicacion,
        obtener_responsable_por_documento,
        crear_responsable,
        actualizar_responsable,
        eliminar_responsable,
        listar_equipos,
        obtener_equipo,
        crear_equipo,
        actualizar_equipo,
        eliminar_equipo,
)


load_dotenv()


def create_app():
    app = Flask(__name__)

    # =====================
    # Configuración Flask (sesión por defecto)
    # =====================
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-app2")


    # =====================
    # Config reCAPTCHA v3
    # =====================
    app.config["RECAPTCHA_SITE_KEY"] = os.getenv("RECAPTCHA_SITE_KEY", "")
    app.config["RECAPTCHA_SECRET_KEY"] = os.getenv("RECAPTCHA_SECRET_KEY", "")

    # Exponer el site key a las plantillas Jinja
    app.jinja_env.globals["RECAPTCHA_SITE_KEY"] = app.config["RECAPTCHA_SITE_KEY"]


    # =====================
    # Helpers de sesión
    # =====================
    def is_logged_in() -> bool:
        return "user" in session

    def current_user():
        return session.get("user")

    def login_required(view_func):
        from functools import wraps

        @wraps(view_func)
        def wrapper(*args, **kwargs):
            if not is_logged_in():
                flash("Debes iniciar sesión primero.", "warning")
                return redirect(url_for("login"))
            return view_func(*args, **kwargs)

        return wrapper

    def admin_required(view_func):
        from functools import wraps

        @wraps(view_func)
        def wrapper(*args, **kwargs):
            if not is_logged_in():
                flash("Debes iniciar sesión primero.", "warning")
                return redirect(url_for("login"))

            user = current_user() or {}
            if user.get("rol") != "admin":
                flash("No tienes permisos para acceder a esta sección.", "danger")
                return redirect(url_for("dashboard"))

            return view_func(*args, **kwargs)

        return wrapper

    app.jinja_env.globals["current_user"] = current_user
    app.jinja_env.globals["is_logged_in"] = is_logged_in


    # =====================
    # Helper reCAPTCHA v3
    # =====================
    def verify_recaptcha(token: str, remote_ip: str | None = None) -> bool:
        """
        Valida el token de reCAPTCHA v3 contra la API de Google.
        Retorna True si:
          - success == True
          - score >= 0.5
          - action == "login"
        """
        secret = app.config.get("RECAPTCHA_SECRET_KEY", "")
        if not secret:
            # Si no hay secreto configurado, por seguridad bloqueamos
            return False

        try:
            payload = {
                "secret": secret,
                "response": token,
            }
            if remote_ip:
                payload["remoteip"] = remote_ip

            r = requests.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data=payload,
                timeout=5,
            )
            data = r.json()
            # data típico: {"success": True, "score": 0.9, "action": "login", ...}
            if not data.get("success"):
                return False

            score = data.get("score", 0.0)
            action = data.get("action", "")

            # Verificamos acción y umbral de score
            if action != "login":
                return False

            if score < 0.5:
                return False

            return True
        except Exception:
            # En caso de error con Google, mejor bloquear el login
            return False

    # Hacemos disponible el helper en el ámbito de la app si lo quieres usar en otros sitios
    app.verify_recaptcha = verify_recaptcha



    # =====================
    # Evitar cache del navegador (para botón atrás)
    # =====================
    @app.after_request
    def add_no_cache_headers(response):
        """
        Fuerza al navegador a no cachear las páginas,
        evitando que se vean vistas restringidas al usar 'atrás'
        después de cerrar sesión.
        """
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

    # =====================
    # Rutas
    # =====================

    @app.route("/")
    def index():
        if not is_logged_in():
            return redirect(url_for("login"))
        return redirect(url_for("dashboard"))

        # -----------------------------
    # LOGIN
    # -----------------------------
    @app.route("/login", methods=["GET", "POST"])
    def login():
        # Si ya hay sesión y el usuario intenta ir al login (por atrás o directo),
        # lo mandamos al dashboard
        if is_logged_in():
            return redirect(url_for("dashboard"))

        if request.method == "POST":
            username = request.form.get("username", "").strip()
            password = request.form.get("password", "").strip()
            recaptcha_token = request.form.get("g-recaptcha-response", "").strip()

            if not username or not password:
                flash("Usuario y contraseña son obligatorios.", "danger")
                return redirect(url_for("login"))

            # ==============================
            # Validar reCAPTCHA v3 primero
            # ==============================
            if not recaptcha_token:
                flash("No se pudo verificar reCAPTCHA. Inténtalo de nuevo.", "danger")
                return redirect(url_for("login"))

            if not app.verify_recaptcha(recaptcha_token, request.remote_addr):
                flash(
                    "No se pudo validar que eres un usuario legítimo (reCAPTCHA). "
                    "Por favor inténtalo nuevamente.",
                    "danger",
                )
                return redirect(url_for("login"))

            # Si reCAPTCHA pasa, seguimos con el login normal
            try:
                user_data = login_usuario(username, password)
                session["user"] = user_data  # dict retornado por la API
                try:
                    set_auth(user_data, "python")
                except Exception:
                    pass
                flash(
                    f"Bienvenido, {user_data.get('nombre_completo', username)}",
                    "success",
                )
                return redirect(url_for("dashboard"))
            except ServiceAPIError as e:
                flash(str(e), "danger")
            except Exception as e:
                flash(f"Error inesperado: {e}", "danger")

        # GET
        return render_template("login.html")


    @app.route("/logout")
    def logout():
        # Limpia la sesión
        session.clear()
        try:
            set_auth(None)
        except Exception:
            pass
        flash("Sesión cerrada correctamente.", "info")
        return redirect(url_for("login"))

    # =====================
    # Olvidé mi contraseña (REAL, con API)
    # =====================

    @app.route("/forgot-password", methods=["GET", "POST"])
    def forgot_password():
        """
        Paso 1: el usuario ingresa su username o email.
        Pedimos a la API que genere un token real y lo usamos
        para armar el enlace (que mostramos en modo demo).
        """
        if request.method == "POST":
            identifier = request.form.get("identifier", "").strip()
            if not identifier:
                flash("Debes ingresar tu usuario o correo.", "danger")
                return redirect(url_for("forgot_password"))

            try:
                data = solicitar_reset_password(identifier)
                token = data.get("token")
                expires_at = data.get("expires_at")

                # Guardamos en sesión para la vista de "previsualización de correo"
                session["reset_preview"] = {
                    "identifier": identifier,
                    "token": token,
                    "expires_at": expires_at,
                }
                return redirect(url_for("forgot_password_preview"))
            except ServiceAPIError as e:
                flash(str(e), "danger")
            except Exception as e:
                flash(f"Error inesperado: {e}", "danger")

        return render_template("forgot_password.html")

    @app.route("/forgot-password/preview")
    def forgot_password_preview():
        """
        Muestra una especie de 'correo' local con el enlace real
        usando el token generado por la API.
        """
        info = session.get("reset_preview")
        if not info:
            flash("No hay una solicitud de restablecimiento en curso.", "warning")
            return redirect(url_for("forgot_password"))

        reset_link = url_for("reset_password", token=info["token"], _external=True)
        return render_template(
            "forgot_password_preview.html",
            identifier=info["identifier"],
            reset_link=reset_link,
            expires_at=info.get("expires_at"),
        )

    @app.route("/reset-password/<token>", methods=["GET", "POST"])
    def reset_password(token):
        """
        Paso 2: el usuario abre el enlace /reset-password/<token>
        Validamos el token contra la API y permitimos cambiar la contraseña.
        """
        token = (token or "").strip()
        if not token:
            flash("Token inválido.", "danger")
            return redirect(url_for("login"))

        if request.method == "GET":
            try:
                validar_reset_token(token)
            except ServiceAPIError as e:
                flash(str(e), "danger")
                return redirect(url_for("login"))
            except Exception as e:
                flash(f"Error inesperado: {e}", "danger")
                return redirect(url_for("login"))

            return render_template("reset_password.html", token=token)

        # POST: cambiar contraseña
        password = request.form.get("password", "").strip()
        confirm = request.form.get("password_confirm", "").strip()

        if not password or not confirm:
            flash("Debes ingresar y confirmar la nueva contraseña.", "danger")
            return redirect(url_for("reset_password", token=token))

        if password != confirm:
            flash("Las contraseñas no coinciden.", "danger")
            return redirect(url_for("reset_password", token=token))

        try:
            resetear_password(token, password)
            flash("Contraseña actualizada correctamente. Ahora puedes iniciar sesión.", "success")
            session.pop("reset_preview", None)
            return redirect(url_for("login"))
        except ServiceAPIError as e:
            flash(str(e), "danger")
        except Exception as e:
            flash(f"Error inesperado: {e}", "danger")

        return redirect(url_for("reset_password", token=token))

    # -----------------------------
    # DASHBOARD
    # -----------------------------
    @app.route("/dashboard")
    @login_required
    def dashboard():
        """
        Vista principal: muestra algunos totales básicos consumiendo la API.
        """
        try:
            empresas = listar_empresas()
            ubicaciones = listar_ubicaciones()
            responsables = listar_responsables()
            equipos = listar_equipos()
            # resumen de usuarios en dashboard
            usuarios = []
            try:
                usuarios = listar_usuarios()
            except ServiceAPIError:
                usuarios = []
        except ServiceAPIError as e:
            flash(str(e), "danger")
            empresas = ubicaciones = responsables = equipos = []
            usuarios = []

        return render_template(
            "dashboard.html",
            empresas=empresas,
            ubicaciones=ubicaciones,
            responsables=responsables,
            equipos=equipos,
            usuarios=usuarios,
        )

    # -----------------------------
    # EMPRESAS (vista cliente)
    # -----------------------------
    @app.route("/empresas")
    @login_required
    def empresas_view():
        q = request.args.get("q", "").strip()
        try:
            empresas = listar_empresas(q=q)
        except ServiceAPIError as e:
            flash(str(e), "danger")
            empresas = []
        return render_template("empresas.html", empresas=empresas, q=q)


    @app.route("/empresas/create", methods=["POST"])
    @login_required
    @admin_required
    def empresas_create():
        # campos del formulario
        form = request.form
        data = {
            "nit": (form.get("nit") or "").strip(),
            "nombre": (form.get("nombre") or "").strip(),
            "telefono": (form.get("telefono") or None) or None,
            "email": (form.get("email") or None) or None,
            "direccion": (form.get("direccion") or None) or None,
            "contacto_principal": (form.get("contacto_principal") or None) or None,
            "activo": bool(form.get("activo", "on")),
        }

        # Validación mínima
        if not data["nit"] or not data["nombre"]:
            flash("NIT y nombre son obligatorios.", "danger")
            return redirect(url_for("empresas_view"))

        try:
            crear_empresa(data)
            flash("Empresa creada correctamente.", "success")
        except ServiceAPIError as e:
            flash(str(e), "danger")
        except Exception as e:
            flash(f"Error inesperado: {e}", "danger")

        return redirect(url_for("empresas_view"))


    @app.route("/empresas/<int:eid>/edit", methods=["POST"])
    @login_required
    @admin_required
    def empresas_edit(eid: int):
        form = request.form
        data = {}
        for field in ["nit", "nombre", "telefono", "email", "direccion", "contacto_principal"]:
            if field in form:
                val = (form.get(field) or "").strip()
                data[field] = val or None
        if "activo" in form:
            data["activo"] = bool(form.get("activo"))

        try:
            actualizar_empresa(eid, data)
            flash("Empresa actualizada.", "success")
        except ServiceAPIError as e:
            flash(str(e), "danger")
        except Exception as e:
            flash(f"Error inesperado: {e}", "danger")

        return redirect(url_for("empresas_view"))


    @app.route("/empresas/<int:eid>/delete", methods=["POST"])
    @login_required
    @admin_required
    def empresas_delete(eid: int):
        try:
            eliminar_empresa(eid)
            flash("Empresa eliminada.", "success")
        except ServiceAPIError as e:
            flash(str(e), "danger")
        except Exception as e:
            flash(f"Error inesperado: {e}", "danger")

        return redirect(url_for("empresas_view"))


    # -----------------------------
    # UBICACIONES (vista cliente)
    # -----------------------------
    @app.route("/ubicaciones")
    @login_required
    def ubicaciones_view():
        q = request.args.get("q", "").strip()
        try:
            ubicaciones = listar_ubicaciones(q=q)
        except ServiceAPIError as e:
            flash(str(e), "danger")
            ubicaciones = []
        return render_template("ubicaciones.html", ubicaciones=ubicaciones, q=q)


    @app.route("/ubicaciones/create", methods=["POST"])
    @login_required
    @admin_required
    def ubicaciones_create():
        form = request.form
        data = {
            "codigo": (form.get("codigo") or "").strip(),
            "nombre": (form.get("nombre") or "").strip(),
            "descripcion": (form.get("descripcion") or None) or None,
            "activo": bool(form.get("activo", "on")),
        }
        if not data["codigo"] or not data["nombre"]:
            flash("Código y nombre son obligatorios.", "danger")
            return redirect(url_for("ubicaciones_view"))

        try:
            crear_ubicacion(data)
            flash("Ubicación creada correctamente.", "success")
        except ServiceAPIError as e:
            flash(str(e), "danger")
        except Exception as e:
            flash(f"Error inesperado: {e}", "danger")

        return redirect(url_for("ubicaciones_view"))


    @app.route("/ubicaciones/<int:uid>/edit", methods=["POST"])
    @login_required
    @admin_required
    def ubicaciones_edit(uid: int):
        form = request.form
        data = {}
        for field in ["codigo", "nombre", "descripcion"]:
            if field in form:
                val = (form.get(field) or "").strip()
                data[field] = val or None
        if "activo" in form:
            data["activo"] = bool(form.get("activo"))

        try:
            actualizar_ubicacion(uid, data)
            flash("Ubicación actualizada.", "success")
        except ServiceAPIError as e:
            flash(str(e), "danger")
        except Exception as e:
            flash(f"Error inesperado: {e}", "danger")

        return redirect(url_for("ubicaciones_view"))


    @app.route("/ubicaciones/<int:uid>/delete", methods=["POST"])
    @login_required
    @admin_required
    def ubicaciones_delete(uid: int):
        try:
            eliminar_ubicacion(uid)
            flash("Ubicación eliminada.", "success")
        except ServiceAPIError as e:
            flash(str(e), "danger")
        except Exception as e:
            flash(f"Error inesperado: {e}", "danger")

        return redirect(url_for("ubicaciones_view"))


    # -----------------------------
    # RESPONSABLES DE ENTREGA (vista cliente)
    # -----------------------------
    @app.route("/responsables")
    @login_required
    def responsables_view():
        q = request.args.get("q", "").strip()
        try:
            responsables = listar_responsables(q=q)
            empresas = listar_empresas()
        except ServiceAPIError as e:
            flash(str(e), "danger")
            responsables = []
            empresas = []
        return render_template("responsables.html", responsables=responsables, empresas=empresas, q=q)


    @app.route("/responsables/create", methods=["POST"])
    @login_required
    @admin_required
    def responsables_create():
        form = request.form
        data = {
            "documento": (form.get("documento") or "").strip(),
            "nombre": (form.get("nombre") or "").strip(),
            "empresa_id": form.get("empresa_id"),
            "telefono": (form.get("telefono") or None) or None,
            "email": (form.get("email") or None) or None,
            "observaciones": (form.get("observaciones") or None) or None,
            "activo": bool(form.get("activo", "on")),
        }
        if not data["documento"] or not data["nombre"] or not data["empresa_id"]:
            flash("Documento, nombre y empresa son obligatorios.", "danger")
            return redirect(url_for("responsables_view"))

        try:
            crear_responsable(data)
            flash("Responsable creado correctamente.", "success")
        except ServiceAPIError as e:
            flash(str(e), "danger")
        except Exception as e:
            flash(f"Error inesperado: {e}", "danger")

        return redirect(url_for("responsables_view"))


    @app.route("/responsables/<int:rid>/edit", methods=["POST"])
    @login_required
    @admin_required
    def responsables_edit(rid: int):
        form = request.form
        data = {}
        for field in ["documento", "nombre", "telefono", "email", "observaciones", "empresa_id"]:
            if field in form:
                val = (form.get(field) or "").strip()
                data[field] = val or None
        if "activo" in form:
            data["activo"] = bool(form.get("activo"))

        try:
            actualizar_responsable(rid, data)
            flash("Responsable actualizado.", "success")
        except ServiceAPIError as e:
            flash(str(e), "danger")
        except Exception as e:
            flash(f"Error inesperado: {e}", "danger")

        return redirect(url_for("responsables_view"))


    @app.route("/responsables/<int:rid>/delete", methods=["POST"])
    @login_required
    @admin_required
    def responsables_delete(rid: int):
        try:
            eliminar_responsable(rid)
            flash("Responsable eliminado.", "success")
        except ServiceAPIError as e:
            flash(str(e), "danger")
        except Exception as e:
            flash(f"Error inesperado: {e}", "danger")

        return redirect(url_for("responsables_view"))


    # -----------------------------
    # EQUIPOS (vista cliente)
    # -----------------------------
    @app.route("/equipos")
    @login_required
    def equipos_view():
        q = request.args.get("q", "").strip()
        try:
            equipos = listar_equipos(texto=q)
            empresas = listar_empresas()
            responsables = listar_responsables()
            ubicaciones = listar_ubicaciones()
            usuarios = []
            try:
                usuarios = listar_usuarios()
            except ServiceAPIError:
                usuarios = []
        except ServiceAPIError as e:
            flash(str(e), "danger")
            equipos = []
            empresas = responsables = ubicaciones = usuarios = []

        return render_template(
            "equipos.html",
            equipos=equipos,
            empresas=empresas,
            responsables=responsables,
            ubicaciones=ubicaciones,
            usuarios=usuarios,
            q=q,
        )


    @app.route("/equipos/create", methods=["POST"])
    @login_required
    @admin_required
    def equipos_create():
        form = request.form
        # Construir payload mínimo requerido por la API
        data = {
            "tipo": (form.get("tipo") or "tecnologico").strip(),
            "categoria": (form.get("categoria") or "computo").strip(),
            "marca": (form.get("marca") or None) or None,
            "modelo": (form.get("modelo") or None) or None,
            "serie": (form.get("serie") or None) or None,
            "descripcion": (form.get("descripcion") or None) or None,
            "empresa_id": form.get("empresa_id"),
            "responsable_entrega_id": form.get("responsable_entrega_id"),
            "ubicacion_id": form.get("ubicacion_id"),
            # registrado_por_id: intentamos usar current_user().id si existe
            "registrado_por_id": (current_user().get("id") if current_user() else None),
        }

        # Validación mínima
        if not data["empresa_id"] or not data["responsable_entrega_id"] or not data["ubicacion_id"]:
            flash("Empresa, responsable y ubicación son obligatorios.", "danger")
            return redirect(url_for("equipos_view"))

        try:
            crear_equipo(data)
            flash("Equipo creado correctamente.", "success")
        except ServiceAPIError as e:
            flash(str(e), "danger")
        except Exception as e:
            flash(f"Error inesperado: {e}", "danger")

        return redirect(url_for("equipos_view"))


    @app.route("/equipos/<int:eid>/edit", methods=["POST"])
    @login_required
    @admin_required
    def equipos_edit(eid: int):
        form = request.form
        data = {}
        for field in [
            "tipo",
            "categoria",
            "marca",
            "modelo",
            "serie",
            "descripcion",
            "empresa_id",
            "responsable_entrega_id",
            "ubicacion_id",
            "usuario_autoriza_id",
            "estado",
            "condicion",
        ]:
            if field in form:
                val = (form.get(field) or "").strip()
                data[field] = val or None

        try:
            actualizar_equipo(eid, data)
            flash("Equipo actualizado.", "success")
        except ServiceAPIError as e:
            flash(str(e), "danger")
        except Exception as e:
            flash(f"Error inesperado: {e}", "danger")

        return redirect(url_for("equipos_view"))


    @app.route("/equipos/<int:eid>/delete", methods=["POST"])
    @login_required
    @admin_required
    def equipos_delete(eid: int):
        try:
            eliminar_equipo(eid)
            flash("Equipo eliminado.", "success")
        except ServiceAPIError as e:
            flash(str(e), "danger")
        except Exception as e:
            flash(f"Error inesperado: {e}", "danger")

        return redirect(url_for("equipos_view"))

    # -----------------------------
    # USUARIOS (CRUD desde cliente)
    # -----------------------------
    @app.route("/usuarios")
    @login_required
    @admin_required
    def usuarios_list():
        try:
            usuarios = listar_usuarios()
        except ServiceAPIError as e:
            flash(str(e), "danger")
            usuarios = []

        return render_template("usuarios_list.html", usuarios=usuarios)

    @app.route("/usuarios/new", methods=["POST"])
    @login_required
    @admin_required
    def usuario_create():
        # Esta ruta solo se usa vía modal (POST)
        username = request.form.get("username", "").strip()
        nombre_completo = request.form.get("nombre_completo", "").strip()
        email = request.form.get("email", "").strip() or None
        password = request.form.get("password", "").strip()
        rol = request.form.get("rol", "user").strip()

        if not username or not nombre_completo or not password:
            flash("Usuario, nombre completo y contraseña son obligatorios.", "danger")
            return redirect(url_for("usuarios_list"))

        try:
            crear_usuario({
                "username": username,
                "nombre_completo": nombre_completo,
                "email": email,
                "password": password,
                "rol": rol,
            })
            flash("Usuario creado correctamente.", "success")
        except ServiceAPIError as e:
            flash(str(e), "danger")
        except Exception as e:
            flash(f"Error inesperado: {e}", "danger")

        return redirect(url_for("usuarios_list"))

    @app.route("/usuarios/<int:uid>/edit", methods=["POST"])
    @login_required
    @admin_required
    def usuario_edit(uid):
        # Esta ruta solo se usa vía modal (POST)
        username = request.form.get("username", "").strip()
        nombre_completo = request.form.get("nombre_completo", "").strip()
        email = request.form.get("email", "").strip() or None
        rol = request.form.get("rol", "user").strip()
        password = request.form.get("password", "").strip()

        data = {
            "username": username,
            "nombre_completo": nombre_completo,
            "email": email,
            "rol": rol,
        }
        if password:
            data["password"] = password

        try:
            actualizar_usuario(uid, data)
            flash("Usuario actualizado correctamente.", "success")
        except ServiceAPIError as e:
            flash(str(e), "danger")
        except Exception as e:
            flash(f"Error inesperado: {e}", "danger")

        return redirect(url_for("usuarios_list"))

    @app.route("/usuarios/<int:uid>/delete", methods=["POST"])
    @login_required
    @admin_required
    def usuario_delete(uid):
        try:
            eliminar_usuario(uid)
            flash("Usuario eliminado correctamente.", "info")
        except ServiceAPIError as e:
            flash(str(e), "danger")
        except Exception as e:
            flash(f"Error inesperado: {e}", "danger")

        return redirect(url_for("usuarios_list"))

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5100, debug=True)
