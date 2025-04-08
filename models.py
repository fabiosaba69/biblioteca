from datetime import datetime
from app import db
from flask_login import UserMixin

class User(UserMixin, db.Model):
    __tablename__ = 'utenti'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    cognome = db.Column(db.String(100), nullable=False)
    classe = db.Column(db.String(10))
    email = db.Column(db.String(120), unique=True)
    barcode = db.Column(db.String(13), unique=True)
    data_registrazione = db.Column(db.DateTime, default=datetime.utcnow)
    prestiti = db.relationship('Loan', backref='utente', lazy=True)
    
    def __repr__(self):
        return f'<Utente {self.nome} {self.cognome}>'


class Book(db.Model):
    __tablename__ = 'libri'
    
    id = db.Column(db.Integer, primary_key=True)
    isbn = db.Column(db.String(13), unique=True, nullable=False)
    titolo = db.Column(db.String(200), nullable=False)
    autore = db.Column(db.String(200))
    editore = db.Column(db.String(100))
    anno_pubblicazione = db.Column(db.String(4))
    genere = db.Column(db.String(100))
    descrizione = db.Column(db.Text)
    immagine_url = db.Column(db.String(500))
    disponibile = db.Column(db.Boolean, default=True)
    data_registrazione = db.Column(db.DateTime, default=datetime.utcnow)
    prestiti = db.relationship('Loan', backref='libro', lazy=True)
    
    def __repr__(self):
        return f'<Libro {self.titolo}>'


class Loan(db.Model):
    __tablename__ = 'prestiti'
    
    id = db.Column(db.Integer, primary_key=True)
    utente_id = db.Column(db.Integer, db.ForeignKey('utenti.id'), nullable=False)
    libro_id = db.Column(db.Integer, db.ForeignKey('libri.id'), nullable=False)
    data_prestito = db.Column(db.DateTime, default=datetime.utcnow)
    data_restituzione_prevista = db.Column(db.DateTime)
    data_restituzione_effettiva = db.Column(db.DateTime)
    nota = db.Column(db.Text)
    
    def __repr__(self):
        return f'<Prestito {self.id}>'


class CardTemplate(db.Model):
    __tablename__ = 'modelli_tessera'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    contenuto = db.Column(db.Text, nullable=False)  # JSON con le configurazioni della tessera
    predefinito = db.Column(db.Boolean, default=False)
    data_creazione = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ModelloTessera {self.nome}>'
