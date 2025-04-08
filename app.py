import os
import logging

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

# Configurazione logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# Creazione dell'app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "chiave_segreta_predefinita")

# Configurazione del database SQLite
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///biblioteca.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Inizializzazione dell'app con l'estensione
db.init_app(app)

with app.app_context():
    # Importazione dei modelli
    import models  # noqa: F401
    
    # Creazione di tutte le tabelle
    db.create_all()
