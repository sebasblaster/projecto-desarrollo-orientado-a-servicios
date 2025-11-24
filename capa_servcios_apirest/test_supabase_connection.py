# pyright: reportMissingImports=false   
# esto es para evitar errores en editores sin soporte completo de Python

import os
from dotenv import load_dotenv
import psycopg

# Cargar variables desde .env
load_dotenv()

# Obtener DSN (para psycopg puro)
dsn = os.getenv("PSYCOPG_DSN")

print("🔍 Probando conexión con Supabase...")
print(f"DSN detectado:\n{dsn}\n")

try:
    # Establecer conexión con Supabase
    with psycopg.connect(dsn) as conn:
        print("✅ Conexión establecida con éxito.")
        
        # Crear un cursor y ejecutar una consulta de prueba
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            version = cur.fetchone()
            print(f"🧠 Versión de PostgreSQL: {version[0]}")

            cur.execute("SELECT current_database(), current_user;")
            db_info = cur.fetchone()
            print(f"📦 Base de datos: {db_info[0]}")
            print(f"👤 Usuario actual: {db_info[1]}")

            # Prueba rápida de tabla (si existe)
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema='public'
                ORDER BY table_name;
            """)
            tablas = [t[0] for t in cur.fetchall()]
            print(f"📋 Tablas encontradas en 'public': {tablas if tablas else '(ninguna)'}")

except Exception as e:
    print("❌ Error al conectar con Supabase:")
    print(e)

