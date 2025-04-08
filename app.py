import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_login import LoginManager
from dotenv import load_dotenv

# Carica le variabili d'ambiente dal file .env
load_dotenv()

class Base(DeclarativeBase):
    pass

# Inizializza l'app Flask
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "chiave_segreta_da_modificare")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)  # Necessario per url_for con https

# Configurazione del database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///biblioteca.db")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Inizializza SQLAlchemy
db = SQLAlchemy(model_class=Base)
db.init_app(app)

# Inizializza LoginManager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Effettua l\'accesso per visualizzare questa pagina.'
login_manager.login_message_category = 'warning'

# Importa i modelli e crea le tabelle
with app.app_context():
    from models import User, Book, Loan, CardTemplate
    from models import ROLE_ADMIN  # Importa il ruolo admin
    db.create_all()
    
    # Verifica la presenza dell'utente admin e lo crea se non esiste
    admin_user = User.query.filter_by(username='admin').first()
    if not admin_user:
        from werkzeug.security import generate_password_hash
        admin_user = User(
            nome='Amministratore',
            cognome='Sistema',
            email='admin@biblioteca.local',
            username='admin',
            password_hash=generate_password_hash('admin'),
            ruolo=ROLE_ADMIN,
            attivo=True
        )
        db.session.add(admin_user)
        db.session.commit()
        app.logger.info('Creato utente admin predefinito')

# Definisci la funzione che carica l'utente per LoginManager
@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.query.get(int(user_id))

# Importa le rotte
from auth_routes import *
from routes import *

# Avvia l'app se il file è eseguito direttamente
if __name__ == '__main__':
    # Ottieni l'indirizzo IP locale per l'accesso LAN
    import socket
    def get_local_ip():
        try:
            # Prova a creare una connessione fittizia per ottenere l'interfaccia di rete predefinita
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return '127.0.0.1'  # Fallback su localhost
    
    host = '0.0.0.0'  # Ascolta su tutte le interfacce di rete
    port = int(os.environ.get('PORT', 5000))
    local_ip = get_local_ip()
    
    print(f"\nServer Biblioteca Scolastica avviato!")
    print(f"- Accesso locale: http://localhost:{port}")
    print(f"- Accesso LAN: http://{local_ip}:{port}")
    print(f"- Credenziali predefinite: username 'admin', password 'admin'")
    print(f"- Premi CTRL+C per terminare il server\n")
    
    app.run(host=host, port=port, debug=False)