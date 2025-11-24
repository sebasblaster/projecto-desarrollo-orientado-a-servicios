# carpeta del cliente
cd app1_client_python

# Crear entorno virtual
python -m venv .venv
.venv\Scripts\activate

# Instalar dependencias del cliente
pip install --upgrade pip
pip install -r requirements.txt

# Ejecutar el cliente
python app.py

