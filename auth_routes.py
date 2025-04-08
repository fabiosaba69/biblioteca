from flask import render_template, flash, redirect, url_for, request
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.urls import urlsplit
from datetime import datetime
from app import app, db
from models import User, ROLE_ADMIN, ROLE_TEACHER, ROLE_STUDENT
from forms import LoginForm, RegistrationForm, UserEditForm
from utils import generate_barcode

# Variabile globale per i template
@app.context_processor
def inject_now():
    return {'now': datetime.utcnow}

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Pagina di login"""
    # Se l'utente è già loggato, redirect alla home
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        
        # Verifica se l'utente esiste e se la password è corretta
        if user is None or not user.check_password(form.password.data):
            flash('Username o password non validi', 'danger')
            return redirect(url_for('login'))
        
        # Verifica se l'utente è attivo
        if not user.attivo:
            flash('Account disattivato. Contatta l\'amministratore.', 'warning')
            return redirect(url_for('login'))
        
        # Login dell'utente
        login_user(user, remember=form.remember_me.data)
        
        # Redirect alla pagina richiesta (o alla home)
        next_page = request.args.get('next')
        if not next_page or urlsplit(next_page).netloc != '':
            next_page = url_for('index')
        
        flash(f'Benvenuto, {user.nome}!', 'success')
        return redirect(next_page)
    
    return render_template('auth/login.html', form=form)

@app.route('/logout')
def logout():
    """Logout utente"""
    logout_user()
    flash('Hai effettuato il logout con successo', 'info')
    return redirect(url_for('index'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    """Registrazione nuovo utente"""
    try:
        # Solo gli admin possono registrare nuovi utenti con ruoli specifici
        # Gli altri possono solo registrarsi come studenti
        if current_user.is_authenticated and not current_user.is_admin():
            flash('Non hai i permessi per accedere a questa pagina', 'danger')
            return redirect(url_for('index'))
        
        form = RegistrationForm()
        
        # Se l'utente non è admin, imposta il ruolo studente
        if not current_user.is_authenticated or not current_user.is_admin():
            form.ruolo.data = ROLE_STUDENT
        
        if form.validate_on_submit():
            # Verifica se username o email esistono già
            if User.query.filter_by(username=form.username.data).first():
                flash('Username già in uso', 'danger')
                return render_template('auth/register.html', form=form)
                
            if User.query.filter_by(email=form.email.data).first():
                flash('Email già registrata', 'danger')
                return render_template('auth/register.html', form=form)
            
            # Genera un codice a barre EAN-13 univoco con max 3 tentativi
            barcode = None
            for _ in range(3):
                try:
                    temp_barcode = generate_barcode()
                    if not User.query.filter_by(barcode=temp_barcode).first():
                        barcode = temp_barcode
                        break
                except Exception as e:
                    app.logger.error(f"Errore generazione barcode: {str(e)}")
                    
            if not barcode:
                flash('Errore nella generazione del codice utente. Riprova.', 'danger')
                return render_template('auth/register.html', form=form)
            
            try:
                # Crea il nuovo utente
                user = User(
                    nome=form.nome.data,
                    cognome=form.cognome.data,
                    classe=form.classe.data,
                    email=form.email.data,
                    username=form.username.data,
                    ruolo=form.ruolo.data,
                    barcode=barcode,
                    attivo=True
                )
                user.set_password(form.password.data)
                
                db.session.add(user)
                db.session.commit()
                
                flash('Registrazione completata con successo!', 'success')
                
                # Se non è autenticato, fa il login diretto
                if not current_user.is_authenticated:
                    login_user(user)
                    return redirect(url_for('index'))
                
                return redirect(url_for('users_list'))
                
            except Exception as e:
                db.session.rollback()
                app.logger.error(f"Errore registrazione utente: {str(e)}")
                flash('Errore durante la registrazione. Riprova.', 'danger')
                return render_template('auth/register.html', form=form)
                
        return render_template('auth/register.html', form=form)
        
    except Exception as e:
        app.logger.error(f"Errore generico registrazione: {str(e)}")
        flash('Si è verificato un errore. Riprova più tardi.', 'danger')
        return redirect(url_for('index'))
    
    return render_template('auth/register.html', form=form)

@app.route('/utenti')
@login_required
def users_list():
    """Visualizza e gestisce l'elenco degli utenti"""
    # Solo admin e insegnanti possono vedere la lista utenti
    if not current_user.is_teacher():
        flash('Non hai i permessi per accedere a questa pagina', 'danger')
        return redirect(url_for('index'))
    
    search_term = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)
    per_page = 20
    
    if search_term:
        users = User.query.filter(
            (User.nome.ilike(f'%{search_term}%')) | 
            (User.cognome.ilike(f'%{search_term}%')) |
            (User.classe.ilike(f'%{search_term}%')) |
            (User.username.ilike(f'%{search_term}%')) |
            (User.email.ilike(f'%{search_term}%'))
        ).order_by(User.cognome, User.nome).paginate(page=page, per_page=per_page, error_out=False)
    else:
        users = User.query.order_by(User.cognome, User.nome).paginate(page=page, per_page=per_page, error_out=False)
    
    return render_template('auth/users_list.html', users=users, search_term=search_term)

@app.route('/utenti/<int:id>/modifica', methods=['GET', 'POST'])
@login_required
def edit_user(id):
    """Modifica un utente esistente"""
    user = User.query.get_or_404(id)
    
    # Solo admin possono modificare altri utenti
    # Gli utenti possono modificare solo il proprio profilo
    if current_user.id != user.id and not current_user.is_admin():
        flash('Non hai i permessi per modificare questo utente', 'danger')
        return redirect(url_for('users_list'))
    
    form = UserEditForm(user.username, user.email)
    
    # Solo gli admin possono cambiare il ruolo e lo stato attivo
    if not current_user.is_admin():
        del form.ruolo
        del form.attivo
    
    if request.method == 'GET':
        form.nome.data = user.nome
        form.cognome.data = user.cognome
        form.classe.data = user.classe
        form.email.data = user.email
        if current_user.is_admin():
            form.ruolo.data = user.ruolo
            form.attivo.data = user.attivo
    
    if form.validate_on_submit():
        user.nome = form.nome.data
        user.cognome = form.cognome.data
        user.classe = form.classe.data
        user.email = form.email.data
        
        # Solo gli admin possono cambiare il ruolo e lo stato attivo
        if current_user.is_admin():
            user.ruolo = form.ruolo.data
            user.attivo = form.attivo.data
        
        # Aggiorna la password solo se ne è stata inserita una nuova
        if form.password.data:
            user.set_password(form.password.data)
        
        db.session.commit()
        flash('Profilo aggiornato con successo!', 'success')
        
        if current_user.id == user.id:
            return redirect(url_for('index'))
        else:
            return redirect(url_for('users_list'))
    
    return render_template('auth/edit_user.html', user=user, form=form)

@app.route('/utenti/<int:id>/elimina', methods=['POST'])
@login_required
def delete_user(id):
    """Elimina un utente dal database"""
    # Solo admin possono eliminare utenti
    if not current_user.is_admin():
        flash('Non hai i permessi per eliminare utenti', 'danger')
        return redirect(url_for('users_list'))
    
    user = User.query.get_or_404(id)
    
    # Impedisce l'auto-eliminazione
    if current_user.id == user.id:
        flash('Non puoi eliminare il tuo account', 'danger')
        return redirect(url_for('users_list'))
    
    # Verifica se l'utente ha prestiti attivi
    active_loans = user.prestiti.filter_by(data_restituzione_effettiva=None).first()
    if active_loans:
        flash('Impossibile eliminare l\'utente: ci sono prestiti attivi', 'danger')
        return redirect(url_for('users_list'))
    
    db.session.delete(user)
    db.session.commit()
    
    flash('Utente eliminato con successo', 'success')
    return redirect(url_for('users_list'))