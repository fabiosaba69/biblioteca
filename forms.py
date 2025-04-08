from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SelectField, SubmitField, TextAreaField
from wtforms.validators import DataRequired, Email, Length, EqualTo, ValidationError
from models import User, ROLE_ADMIN, ROLE_TEACHER, ROLE_STUDENT

class LoginForm(FlaskForm):
    """Form per il login degli utenti"""
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember_me = BooleanField('Ricordami')
    submit = SubmitField('Accedi')


class RegistrationForm(FlaskForm):
    """Form per la registrazione di nuovi utenti"""
    nome = StringField('Nome', validators=[DataRequired(), Length(min=2, max=100)])
    cognome = StringField('Cognome', validators=[DataRequired(), Length(min=2, max=100)])
    classe = StringField('Classe')
    email = StringField('Email', validators=[DataRequired(), Email()])
    username = StringField('Username', validators=[DataRequired(), Length(min=4, max=64)])
    password = PasswordField('Password', validators=[
        DataRequired(), 
        Length(min=6, message='La password deve essere lunga almeno 6 caratteri')
    ])
    password2 = PasswordField('Ripeti password', validators=[
        DataRequired(), 
        EqualTo('password', message='Le password devono corrispondere')
    ])
    ruolo = SelectField('Ruolo', choices=[
        (ROLE_STUDENT, 'Studente'),
        (ROLE_TEACHER, 'Insegnante'),
        (ROLE_ADMIN, 'Amministratore')
    ], default=ROLE_STUDENT)
    submit = SubmitField('Registrati')
    
    def validate_username(self, username):
        """Verifica che lo username non sia già in uso"""
        user = User.query.filter_by(username=username.data).first()
        if user is not None:
            raise ValidationError('Username già in uso. Scegline un altro.')
            
    def validate_email(self, email):
        """Verifica che l'email non sia già in uso"""
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError('Indirizzo email già registrato.')


class UserEditForm(FlaskForm):
    """Form per la modifica degli utenti"""
    nome = StringField('Nome', validators=[DataRequired(), Length(min=2, max=100)])
    cognome = StringField('Cognome', validators=[DataRequired(), Length(min=2, max=100)])
    classe = StringField('Classe')
    email = StringField('Email', validators=[DataRequired(), Email()])
    ruolo = SelectField('Ruolo', choices=[
        (ROLE_STUDENT, 'Studente'),
        (ROLE_TEACHER, 'Insegnante'), 
        (ROLE_ADMIN, 'Amministratore')
    ])
    attivo = BooleanField('Utente attivo')
    password = PasswordField('Nuova Password (lasciare vuoto per mantenere attuale)')
    password2 = PasswordField('Ripeti Password', validators=[
        EqualTo('password', message='Le password devono corrispondere')
    ])
    submit = SubmitField('Salva Modifiche')

    def __init__(self, original_username, original_email, *args, **kwargs):
        super(UserEditForm, self).__init__(*args, **kwargs)
        self.original_username = original_username
        self.original_email = original_email
        
    def validate_email(self, email):
        if email.data != self.original_email:
            user = User.query.filter_by(email=email.data).first()
            if user is not None:
                raise ValidationError('Indirizzo email già registrato.')