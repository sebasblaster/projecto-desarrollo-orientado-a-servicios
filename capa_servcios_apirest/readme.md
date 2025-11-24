# CREAR LA BASE DE DATOS EN XAMPP Control Panel →  MySQL.
CREATE DATABASE flask_api_demo 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_general_ci;

# ------------------------+-------------------+----------------------------+----------------------
# entrar al directorio
cd capa_servcios_apirest

# Crear entorno y acceder
- crear el entorno
python -m venv .venv

# acceder al entorno
.venv\Scripts\Activate.ps1   

# Actualizar el pip install*
python.exe -m pip install --upgrade pip

# Instalar dependencias
pip install -r requirements.txt

# esto en caso de instalar manualmente con pip
pip freeze > requirements.txt