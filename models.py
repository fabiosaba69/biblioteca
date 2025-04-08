from datetime import datetime
from app import db

class Libro(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    isbn = db.Column(db.String(20), unique=True, nullable=False)
    titolo = db.Column(db.String(255), nullable=False)
    autore = db.Column(db.String(255), nullable=False)
    editore = db.Column(db.String(255), nullable=True)
    anno_pubblicazione = db.Column(db.String(10), nullable=True)
    descrizione = db.Column(db.Text, nullable=True)
    immagine_url = db.Column(db.String(500), nullable=True)
    data_inserimento = db.Column(db.DateTime, default=datetime.now)
    disponibile = db.Column(db.Boolean, default=True)
    
    prestiti = db.relationship('Prestito', backref='libro', lazy=True, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Libro {self.titolo}>'

class Utente(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    cognome = db.Column(db.String(100), nullable=False)
    classe = db.Column(db.String(20), nullable=True)  # Es. "1A", "5B"
    codice = db.Column(db.String(20), unique=True, nullable=False)  # Codice per il barcode EAN-13
    data_registrazione = db.Column(db.DateTime, default=datetime.now)
    attivo = db.Column(db.Boolean, default=True)
    
    prestiti = db.relationship('Prestito', backref='utente', lazy=True, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Utente {self.cognome} {self.nome}>'
    
    @property
    def nome_completo(self):
        return f"{self.cognome} {self.nome}"

class Prestito(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    libro_id = db.Column(db.Integer, db.ForeignKey('libro.id'), nullable=False)
    utente_id = db.Column(db.Integer, db.ForeignKey('utente.id'), nullable=False)
    data_prestito = db.Column(db.DateTime, default=datetime.now)
    data_restituzione_prevista = db.Column(db.DateTime, nullable=False)
    data_restituzione_effettiva = db.Column(db.DateTime, nullable=True)
    note = db.Column(db.Text, nullable=True)
    
    def __repr__(self):
        return f'<Prestito {self.id}>'
    
    @property
    def in_corso(self):
        return self.data_restituzione_effettiva is None
    
    @property
    def in_ritardo(self):
        if self.in_corso and datetime.now() > self.data_restituzione_prevista:
            return True
        return False

class ImpostazioneTessera(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    utente_id = db.Column(db.Integer, db.ForeignKey('utente.id'), nullable=True)
    font = db.Column(db.String(100), default="Arial")
    dimensione_font = db.Column(db.Integer, default=14)
    posizione_logo_x = db.Column(db.Integer, default=20)
    posizione_logo_y = db.Column(db.Integer, default=20)
    posizione_nome_x = db.Column(db.Integer, default=20)
    posizione_nome_y = db.Column(db.Integer, default=100)
    posizione_barcode_x = db.Column(db.Integer, default=20)
    posizione_barcode_y = db.Column(db.Integer, default=150)
    dimensione_barcode = db.Column(db.Integer, default=2)
    contenuto_aggiuntivo = db.Column(db.Text, nullable=True)
    
    utente = db.relationship('Utente', backref=db.backref('tessera', uselist=False))
    
    def __repr__(self):
        return f'<ImpostazioneTessera {self.nome}>'
