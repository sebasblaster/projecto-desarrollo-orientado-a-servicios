import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    # Usa la URL completa de la variable de entorno (incluye ?sslmode=require)
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")

    # Opcional pero recomendado
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,      # evita conexiones muertas
                                    # Si NO usamos sslmode=require en la URL, descomentamos la línea siguiente, cosa que no aplica aquí:
                                    # "connect_args": {"sslmode": "require"},
    }

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_AS_ASCII = False
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-app1")
