# models.py
from flask_sqlalchemy import SQLAlchemy # para la base de datos
from datetime import datetime # para timestamps, es decir, fechas y horas
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy() # para la base de datos

# ============================================================
# 1) EMPRESAS EXTERNAS
# ============================================================
class EmpresaExterna(db.Model):
    __tablename__ = "empresas_externas"

    id = db.Column(db.Integer, primary_key=True)
    nit = db.Column(db.String(30), nullable=False, unique=True, index=True)  # NIT único
    nombre = db.Column(db.String(180), nullable=False, index=True)
    telefono = db.Column(db.String(60), nullable=True)
    email = db.Column(db.String(180), nullable=True)
    direccion = db.Column(db.String(255), nullable=True)
    contacto_principal = db.Column(db.String(180), nullable=True)
    activo = db.Column(db.Boolean, nullable=False, default=True)

    creado_en = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    actualizado_en = db.Column(
        db.DateTime, nullable=False,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    def to_dict(self):
        return {
            "id": self.id,
            "nit": self.nit,
            "nombre": self.nombre,
            "telefono": self.telefono,
            "email": self.email,
            "direccion": self.direccion,
            "contacto_principal": self.contacto_principal,
            "activo": self.activo,
            "creado_en": self.creado_en.isoformat() if self.creado_en else None,
            "actualizado_en": self.actualizado_en.isoformat() if self.actualizado_en else None,
        }

# ============================================================
# 2) UBICACIONES (a dónde va el equipo que ingresa)
# ============================================================
class Ubicacion(db.Model):
    __tablename__ = "ubicaciones"

    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(30), nullable=False, unique=True, index=True)
    nombre = db.Column(db.String(180), nullable=False, index=True)
    descripcion = db.Column(db.Text, nullable=True)
    activo = db.Column(db.Boolean, nullable=False, default=True)

    creado_en = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    actualizado_en = db.Column(
        db.DateTime, nullable=False,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    def to_dict(self):
        return {
            "id": self.id,
            "codigo": self.codigo,
            "nombre": self.nombre,
            "descripcion": self.descripcion,
            "activo": self.activo,
            "creado_en": self.creado_en.isoformat() if self.creado_en else None,
            "actualizado_en": self.actualizado_en.isoformat() if self.actualizado_en else None,
        }

# ============================================================
# 3) RESPONSABLES DE ENTREGA (asociados a empresa externa)
#    documento (cédula, etc.) es único
# ============================================================
class ResponsableEntrega(db.Model):
    __tablename__ = "responsables_entrega"

    id = db.Column(db.Integer, primary_key=True)

    # antes codigo_responsable + documento, ahora SOLO documento único
    documento = db.Column(
        db.String(30),
        nullable=False,
        unique=True,
        index=True
    )

    nombre = db.Column(db.String(180), nullable=False, index=True)
    telefono = db.Column(db.String(60), nullable=True)
    email = db.Column(db.String(180), nullable=True)
    activo = db.Column(db.Boolean, nullable=False, default=True)
    observaciones = db.Column(db.Text, nullable=True)

    # FK a empresa externa
    empresa_id = db.Column(
        db.Integer,
        db.ForeignKey("empresas_externas.id"),
        nullable=False,
        index=True
    )
    empresa = db.relationship(
        "EmpresaExterna",
        backref=db.backref("responsables_entrega", lazy=True)
    )

    creado_en = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    actualizado_en = db.Column(
        db.DateTime, nullable=False,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    def to_dict(self):
        return {
            "id": self.id,
            "documento": self.documento,
            "nombre": self.nombre,
            "telefono": self.telefono,
            "email": self.email,
            "activo": self.activo,
            "observaciones": self.observaciones,
            "empresa_id": self.empresa_id,
            "empresa": self.empresa.to_dict() if self.empresa else None,
            "creado_en": self.creado_en.isoformat() if self.creado_en else None,
            "actualizado_en": self.actualizado_en.isoformat() if self.actualizado_en else None,
        }

# ============================================================
# 4) USUARIOS (autorizan el ingreso, login, reset de contraseña)
# ============================================================
class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False, unique=True, index=True)
    nombre_completo = db.Column(db.String(180), nullable=False)
    email = db.Column(db.String(180), nullable=True, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)

    rol = db.Column(
        db.Enum("admin", "user", name="usuario_rol_enum"),
        nullable=False,
        default="user",
        index=True
    )

    activo = db.Column(db.Boolean, nullable=False, default=True)

    # Para recuperación de contraseña
    reset_token = db.Column(db.String(255), nullable=True, index=True) # token seguro para reset de password
    reset_expires = db.Column(db.DateTime, nullable=True)  # fecha/hora de expiración

    creado_en = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    actualizado_en = db.Column(
        db.DateTime, nullable=False,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "nombre_completo": self.nombre_completo,
            "email": self.email,
            "rol": self.rol,
            "activo": self.activo,
            # normalmente no expondríamos reset_token / reset_expires en un API público
            "creado_en": self.creado_en.isoformat() if self.creado_en else None,
            "actualizado_en": self.actualizado_en.isoformat() if self.actualizado_en else None,
        }

# ============================================================
# 5) EQUIPOS
# ============================================================
class Equipo(db.Model):
    __tablename__ = "equipos"

    id = db.Column(db.Integer, primary_key=True)

    tipo = db.Column(
        db.Enum("tecnologico", "biomedico", name="equipo_tipo_enum"),
        nullable=False,
        default="tecnologico",
    )

    categoria = db.Column(
        db.Enum(
            "computo",
            "impresion",
            "red",
            "biomedico",
            "otro",
            name="equipo_categoria_enum",
        ),
        nullable=False,
        default="computo",
        index=True,
    )

    marca = db.Column(db.String(120), nullable=True)
    modelo = db.Column(db.String(120), nullable=True)
    serie = db.Column(db.String(120), nullable=True, index=True, unique=True)
    descripcion = db.Column(db.Text, nullable=True)

    # Documento de ingreso (pdf/imagen – guardamos la ruta o nombre de archivo)
    doc_ingreso = db.Column(db.String(255), nullable=True)

    fecha_ingreso = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    fecha_salida = db.Column(db.DateTime, nullable=True)

    estado = db.Column(
        db.Enum("ingresado", "en_revision", "autorizado", "rechazado", "retirado",
                name="equipo_estado_enum"),
        nullable=False,
        default="ingresado",
        index=True,
    )

    condicion = db.Column(
        db.Enum("operativo", "averiado", "contaminado", "desconocido",
                name="equipo_condicion_enum"),
        nullable=False,
        default="desconocido",
    )

    # FK a empresa externa
    empresa_id = db.Column(
        db.Integer,
        db.ForeignKey("empresas_externas.id"),
        nullable=False,
        index=True
    )
    empresa = db.relationship(
        "EmpresaExterna",
        backref=db.backref("equipos", lazy=True)
    )

    # FK a responsable de entrega
    responsable_entrega_id = db.Column(
        db.Integer,
        db.ForeignKey("responsables_entrega.id"),
        nullable=False,
        index=True
    )
    responsable_entrega = db.relationship(
        "ResponsableEntrega",
        backref=db.backref("equipos", lazy=True)
    )

    # FK a ubicación
    ubicacion_id = db.Column(
        db.Integer,
        db.ForeignKey("ubicaciones.id"),
        nullable=False,
        index=True
    )
    ubicacion = db.relationship(
        "Ubicacion",
        backref=db.backref("equipos", lazy=True)
    )

    # Usuario que autoriza el ingreso (puede ser nulo mientras está en revisión)
    usuario_autoriza_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=True,
        index=True
    )
    usuario_autoriza = db.relationship(
        "Usuario",
        foreign_keys=[usuario_autoriza_id],
        backref=db.backref("equipos_autorizados", lazy=True)
    )

    # Usuario admin que registra el equipo (huella id del creador)
    registrado_por_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=False,
        index=True
    )
    usuario_registra = db.relationship(
        "Usuario",
        foreign_keys=[registrado_por_id],
        backref=db.backref("equipos_registrados", lazy=True)
    )

    observaciones = db.Column(db.Text, nullable=True)

    creado_en = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    actualizado_en = db.Column(
        db.DateTime, nullable=False,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    __table_args__ = (
        db.UniqueConstraint("serie", name="uq_equipo_serie"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "tipo": self.tipo,
            "categoria": self.categoria,
            "marca": self.marca,
            "modelo": self.modelo,
            "serie": self.serie,
            "descripcion": self.descripcion,
            "doc_ingreso": self.doc_ingreso,
            "fecha_ingreso": self.fecha_ingreso.isoformat() if self.fecha_ingreso else None,
            "fecha_salida": self.fecha_salida.isoformat() if self.fecha_salida else None,
            "estado": self.estado,
            "condicion": self.condicion,

            "empresa_id": self.empresa_id,
            "empresa": self.empresa.to_dict() if self.empresa else None,

            "responsable_entrega_id": self.responsable_entrega_id,
            "responsable_entrega": (
                self.responsable_entrega.to_dict()
                if self.responsable_entrega else None
            ),

            "ubicacion_id": self.ubicacion_id,
            "ubicacion": self.ubicacion.to_dict() if self.ubicacion else None,

            "usuario_autoriza_id": self.usuario_autoriza_id,
            "usuario_autoriza": (
                self.usuario_autoriza.to_dict()
                if self.usuario_autoriza else None
            ),

            "registrado_por_id": self.registrado_por_id,
            "observaciones": self.observaciones,
            "creado_en": self.creado_en.isoformat() if self.creado_en else None,
            "actualizado_en": self.actualizado_en.isoformat() if self.actualizado_en else None,
        }
