import os
import logging

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_login import LoginManager


# Configurazione del logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)
# Creazione dell'app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "chiave_segreta_temporanea")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configurazione del database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///biblioteca.db")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Inizializzazione app con l'estensione
db.init_app(app)

# Configurazione di Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Accedi per visualizzare questa pagina.'
login_manager.login_message_category = 'warning'

@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.query.get(int(user_id))

with app.app_context():
    # Importazione dei modelli
    import models  # noqa: F401

    db.create_all()
    
    # Crea un utente admin di default se non esiste
    from models import User, ROLE_ADMIN
    if not User.query.filter_by(username='admin').first():
        admin = User(
            nome='Amministratore',
            cognome='Sistema',
            email='admin@biblioteca.it',
            username='admin',
            ruolo=ROLE_ADMIN
        )
        admin.set_password('admin')
        db.session.add(admin)
        db.session.commit()
        app.logger.info('Creato utente admin predefinito')
