import os
import json
import uuid
import csv
import io
from datetime import datetime, timedelta
import requests
from flask import render_template, request, redirect, url_for, flash, jsonify, session, send_file, abort
from flask_login import login_required, current_user
from app import app, db
from models import User, Book, Loan, CardTemplate, ROLE_ADMIN, ROLE_TEACHER, ROLE_STUDENT
from utils import generate_barcode, search_by_isbn, parse_import_file, save_base64_image

# Decoratore per verificare se l'utente è un insegnante
def teacher_required(f):
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_teacher():
            flash('Accesso negato: richiesti privilegi di insegnante', 'danger')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# Decoratore per verificare se l'utente è un amministratore
def admin_required(f):
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_admin():
            flash('Accesso negato: richiesti privilegi di amministratore', 'danger')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# Context processor per variabili globali nei templates
@app.context_processor
def inject_global_vars():
    return {
        'current_year': datetime.utcnow().year
    }

@app.route('/')
def index():
    """Pagina principale del sistema di gestione biblioteca"""
    total_books = Book.query.count()
    total_users = User.query.count()
    active_loans = Loan.query.filter(Loan.data_restituzione_effettiva == None).count()
    overdue_loans = Loan.query.filter(
        Loan.data_restituzione_effettiva == None,
        Loan.data_restituzione_prevista < datetime.utcnow()
    ).count()
    
    recent_books = Book.query.order_by(Book.data_registrazione.desc()).limit(5).all()
    recent_loans = Loan.query.order_by(Loan.data_prestito.desc()).limit(5).all()
    
    return render_template('index.html', 
                          total_books=total_books, 
                          total_users=total_users,
                          active_loans=active_loans,
                          overdue_loans=overdue_loans,
                          recent_books=recent_books,
                          recent_loans=recent_loans)

# ---- GESTIONE LIBRI ----

@app.route('/libri')
@login_required
def books():
    """Visualizza e gestisce l'elenco dei libri"""
    search_term = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)
    per_page = 20
    
    if search_term:
        books = Book.query.filter(
            (Book.titolo.ilike(f'%{search_term}%')) | 
            (Book.autore.ilike(f'%{search_term}%')) | 
            (Book.isbn.ilike(f'%{search_term}%'))
        ).order_by(Book.titolo).paginate(page=page, per_page=per_page, error_out=False)
    else:
        books = Book.query.order_by(Book.titolo).paginate(page=page, per_page=per_page, error_out=False)
    
    return render_template('books.html', books=books, search_term=search_term)

@app.route('/libri/aggiungi', methods=['GET', 'POST'])
@teacher_required
def add_book():
    """Aggiunge un nuovo libro al database"""
    if request.method == 'POST':
        isbn = request.form.get('isbn')
        titolo = request.form.get('titolo')
        autore = request.form.get('autore')
        editore = request.form.get('editore')
        anno_pubblicazione = request.form.get('anno_pubblicazione')
        genere = request.form.get('genere')
        descrizione = request.form.get('descrizione')
        immagine_url = request.form.get('immagine_url')
        
        # Salva l'immagine base64 se fornita
        image_data = request.form.get('image_data')
        if image_data and image_data.startswith('data:image'):
            filename = f"book_{uuid.uuid4().hex}.png"
            saved_path = save_base64_image(image_data, filename)
            if saved_path:
                immagine_url = saved_path
        
        # Verifica se il libro esiste già
        existing_book = Book.query.filter_by(isbn=isbn).first()
        if existing_book:
            flash('Un libro con questo ISBN è già presente nel sistema', 'warning')
            return redirect(url_for('books'))
        
        book = Book(
            isbn=isbn,
            titolo=titolo,
            autore=autore,
            editore=editore,
            anno_pubblicazione=anno_pubblicazione,
            genere=genere,
            descrizione=descrizione,
            immagine_url=immagine_url
        )
        
        db.session.add(book)
        db.session.commit()
        
        flash('Libro aggiunto con successo!', 'success')
        return redirect(url_for('books'))
        
    return render_template('books.html', form_mode="add")

@app.route('/libri/<int:id>/modifica', methods=['GET', 'POST'])
@teacher_required
def edit_book(id):
    """Modifica un libro esistente"""
    book = Book.query.get_or_404(id)
    
    if request.method == 'POST':
        book.isbn = request.form.get('isbn')
        book.titolo = request.form.get('titolo')
        book.autore = request.form.get('autore')
        book.editore = request.form.get('editore')
        book.anno_pubblicazione = request.form.get('anno_pubblicazione')
        book.genere = request.form.get('genere')
        book.descrizione = request.form.get('descrizione')
        
        image_data = request.form.get('image_data')
        if image_data and image_data.startswith('data:image'):
            filename = f"book_{uuid.uuid4().hex}.png"
            saved_path = save_base64_image(image_data, filename)
            if saved_path:
                book.immagine_url = saved_path
        elif request.form.get('immagine_url'):
            book.immagine_url = request.form.get('immagine_url')
        
        db.session.commit()
        flash('Libro aggiornato con successo!', 'success')
        return redirect(url_for('books'))
        
    return render_template('books.html', book=book, form_mode="edit")

@app.route('/libri/<int:id>/elimina', methods=['POST'])
@teacher_required
def delete_book(id):
    """Elimina un libro dal database"""
    book = Book.query.get_or_404(id)
    
    # Verifica se il libro ha prestiti attivi
    active_loans = Loan.query.filter_by(libro_id=id, data_restituzione_effettiva=None).first()
    if active_loans:
        flash('Impossibile eliminare il libro: ci sono prestiti attivi', 'danger')
        return redirect(url_for('books'))
    
    db.session.delete(book)
    db.session.commit()
    
    flash('Libro eliminato con successo', 'success')
    return redirect(url_for('books'))

@app.route('/api/isbn/<isbn>')
def get_isbn_info(isbn):
    """API per ottenere informazioni da un ISBN"""
    book_info = search_by_isbn(isbn)
    return jsonify(book_info)

@app.route('/importa', methods=['GET', 'POST'])
@teacher_required
def import_books():
    """Importazione di libri da file CSV o TXT"""
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('Nessun file selezionato', 'danger')
            return redirect(request.url)
            
        file = request.files['file']
        if file.filename == '':
            flash('Nessun file selezionato', 'danger')
            return redirect(request.url)
            
        if file:
            file_content = file.read().decode('utf-8', errors='replace')
            delimiter = request.form.get('delimiter', ',')
            has_header = 'has_header' in request.form
            
            try:
                imported_books = parse_import_file(file_content, delimiter, has_header)
                
                success_count = 0
                error_count = 0
                duplicate_count = 0
                
                for book_data in imported_books:
                    # Controlla se il libro esiste già
                    existing_book = Book.query.filter_by(isbn=book_data.get('isbn')).first()
                    if existing_book:
                        duplicate_count += 1
                        continue
                        
                    # Se l'ISBN è presente, cerca informazioni online
                    if book_data.get('isbn'):
                        online_data = search_by_isbn(book_data.get('isbn'))
                        # Unisce i dati online con i dati del file
                        if online_data:
                            book_data = {**online_data, **{k: v for k, v in book_data.items() if v}}
                    
                    # Crea il libro
                    try:
                        book = Book(
                            isbn=book_data.get('isbn', ''),
                            titolo=book_data.get('titolo', 'Sconosciuto'),
                            autore=book_data.get('autore', ''),
                            editore=book_data.get('editore', ''),
                            anno_pubblicazione=book_data.get('anno_pubblicazione', ''),
                            genere=book_data.get('genere', ''),
                            descrizione=book_data.get('descrizione', ''),
                            immagine_url=book_data.get('immagine_url', '')
                        )
                        db.session.add(book)
                        success_count += 1
                    except Exception as e:
                        app.logger.error(f"Errore durante l'importazione del libro: {str(e)}")
                        error_count += 1
                
                db.session.commit()
                flash(f'Importazione completata: {success_count} libri importati, {duplicate_count} duplicati, {error_count} errori', 'info')
                return redirect(url_for('books'))
                
            except Exception as e:
                flash(f'Errore durante l\'elaborazione del file: {str(e)}', 'danger')
                return redirect(request.url)
                
    return render_template('import.html')

# ---- GESTIONE UTENTI ----

# Rimuoviamo questa funzione dato che già definita in auth_routes.py
# Questa è duplicata della funzione users_list in auth_routes.py
# @app.route('/utenti-lista')
# @teacher_required
# def users_list():
#     """Visualizza e gestisce l'elenco degli utenti"""
#     search_term = request.args.get('q', '')
#     page = request.args.get('page', 1, type=int)
#     per_page = 20
#     
#     if search_term:
#         users = User.query.filter(
#             (User.nome.ilike(f'%{search_term}%')) | 
#             (User.cognome.ilike(f'%{search_term}%')) |
#             (User.classe.ilike(f'%{search_term}%')) |
#             (User.barcode.ilike(f'%{search_term}%'))
#         ).order_by(User.cognome, User.nome).paginate(page=page, per_page=per_page, error_out=False)
#     else:
#         users = User.query.order_by(User.cognome, User.nome).paginate(page=page, per_page=per_page, error_out=False)
#     
#     return render_template('users.html', users=users, search_term=search_term)

@app.route('/utenti/aggiungi', methods=['GET', 'POST'])
@teacher_required
def add_user():
    """Aggiunge un nuovo utente al database"""
    if request.method == 'POST':
        nome = request.form.get('nome')
        cognome = request.form.get('cognome')
        classe = request.form.get('classe')
        email = request.form.get('email')
        
        # Genera un codice a barre EAN-13 univoco
        while True:
            barcode = generate_barcode()
            if not User.query.filter_by(barcode=barcode).first():
                break
        
        user = User(
            nome=nome,
            cognome=cognome,
            classe=classe,
            email=email,
            barcode=barcode
        )
        
        db.session.add(user)
        db.session.commit()
        
        flash('Utente aggiunto con successo!', 'success')
        return redirect(url_for('users_list'))
        
    return render_template('users.html', form_mode="add")

# Commentata per evitare duplicazione con la funzione in auth_routes.py
# @app.route('/utenti/<int:id>/modifica', methods=['GET', 'POST'])
# @teacher_required
# def edit_user_route(id):
#     """Modifica un utente esistente"""
#     user = User.query.get_or_404(id)
#     
#     if request.method == 'POST':
#         user.nome = request.form.get('nome')
#         user.cognome = request.form.get('cognome')
#         user.classe = request.form.get('classe')
#         user.email = request.form.get('email')
#         
#         # Se è stato richiesto un nuovo barcode
#         if 'generate_new_barcode' in request.form:
#             while True:
#                 barcode = generate_barcode()
#                 if not User.query.filter_by(barcode=barcode).first():
#                     break
#             user.barcode = barcode
#         
#         db.session.commit()
#         flash('Utente aggiornato con successo!', 'success')
#         return redirect(url_for('users_list'))
#         
#     return render_template('users.html', user=user, form_mode="edit")

# Commentata per evitare duplicazione con auth_routes.py
# @app.route('/utenti/<int:id>/elimina', methods=['POST'])
# @teacher_required
# def delete_user_route(id):
#     """Elimina un utente dal database"""
#     user = User.query.get_or_404(id)
#     
#     # Verifica se l'utente ha prestiti attivi
#     active_loans = Loan.query.filter_by(utente_id=id, data_restituzione_effettiva=None).first()
#     if active_loans:
#         flash('Impossibile eliminare l\'utente: ci sono prestiti attivi', 'danger')
#         return redirect(url_for('users_list'))
#     
#     db.session.delete(user)
#     db.session.commit()
#     
#     flash('Utente eliminato con successo', 'success')
#     return redirect(url_for('users_list'))

@app.route('/utenti/<int:id>/tessera')
@login_required
def user_card(id):
    """Visualizza la tessera di un utente"""
    user = User.query.get_or_404(id)
    templates = CardTemplate.query.all()
    default_template = CardTemplate.query.filter_by(predefinito=True).first()
    
    if not default_template and templates:
        default_template = templates[0]
    
    return render_template('card_editor.html', user=user, templates=templates, default_template=default_template)

# ---- GESTIONE PRESTITI ----

@app.route('/prestiti')
@login_required
def loans():
    """Visualizza e gestisce l'elenco dei prestiti"""
    status = request.args.get('status', 'all')
    search_term = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)
    per_page = 20
    
    query = Loan.query.join(User).join(Book)
    
    # Ottieni il tempo corrente per confronti in template
    current_time = datetime.utcnow()
    
    if status == 'active':
        query = query.filter(Loan.data_restituzione_effettiva == None)
    elif status == 'returned':
        query = query.filter(Loan.data_restituzione_effettiva != None)
    elif status == 'overdue':
        query = query.filter(
            Loan.data_restituzione_effettiva == None,
            Loan.data_restituzione_prevista < current_time
        )
    
    if search_term:
        query = query.filter(
            (User.nome.ilike(f'%{search_term}%')) | 
            (User.cognome.ilike(f'%{search_term}%')) |
            (Book.titolo.ilike(f'%{search_term}%')) |
            (Book.isbn.ilike(f'%{search_term}%'))
        )
    
    loans = query.order_by(Loan.data_prestito.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    return render_template('loans.html', loans=loans, status=status, search_term=search_term, current_time=current_time)

@app.route('/prestiti/aggiungi', methods=['GET', 'POST'])
@teacher_required
def add_loan():
    """Aggiunge un nuovo prestito"""
    if request.method == 'POST':
        utente_id = request.form.get('utente_id')
        libro_id = request.form.get('libro_id')
        giorni_prestito = int(request.form.get('giorni_prestito', 30))
        nota = request.form.get('nota', '')
        
        # Verifica se l'utente e il libro esistono
        user = User.query.get(utente_id)
        book = Book.query.get(libro_id)
        
        if not user or not book:
            flash('Utente o libro non trovato', 'danger')
            return redirect(url_for('loans'))
        
        # Verifica se il libro è disponibile
        if not book.disponibile:
            flash('Il libro non è disponibile per il prestito', 'danger')
            return redirect(url_for('loans'))
        
        # Calcola la data di restituzione prevista
        data_restituzione_prevista = datetime.utcnow() + timedelta(days=giorni_prestito)
        
        loan = Loan(
            utente_id=utente_id,
            libro_id=libro_id,
            data_restituzione_prevista=data_restituzione_prevista,
            nota=nota
        )
        
        # Aggiorna lo stato del libro
        book.disponibile = False
        
        db.session.add(loan)
        db.session.commit()
        
        flash('Prestito registrato con successo!', 'success')
        return redirect(url_for('loans'))
        
    # Ottieni la lista di utenti e libri per i menu a discesa
    users = User.query.order_by(User.cognome, User.nome).all()
    available_books = Book.query.filter_by(disponibile=True).order_by(Book.titolo).all()
    current_time = datetime.utcnow()
    
    return render_template('loans.html', users=users, available_books=available_books, form_mode="add", current_time=current_time)

@app.route('/prestiti/<int:id>/restituisci', methods=['POST'])
@teacher_required
def return_loan(id):
    """Registra la restituzione di un prestito"""
    loan = Loan.query.get_or_404(id)
    
    if loan.data_restituzione_effettiva:
        flash('Questo prestito è già stato restituito', 'warning')
        return redirect(url_for('loans'))
    
    loan.data_restituzione_effettiva = datetime.utcnow()
    loan.libro.disponibile = True
    
    db.session.commit()
    
    flash('Restituzione registrata con successo!', 'success')
    return redirect(url_for('loans'))

@app.route('/prestiti/<int:id>/elimina', methods=['POST'])
@teacher_required
def delete_loan(id):
    """Elimina un prestito dal database"""
    loan = Loan.query.get_or_404(id)
    
    # Se il prestito è attivo, rendi il libro nuovamente disponibile
    if not loan.data_restituzione_effettiva:
        loan.libro.disponibile = True
    
    db.session.delete(loan)
    db.session.commit()
    
    flash('Prestito eliminato con successo', 'success')
    return redirect(url_for('loans'))

# ---- GESTIONE TESSERE ----

@app.route('/modelli-tessera')
@teacher_required
def card_templates():
    """Visualizza e gestisce i modelli di tessera"""
    templates = CardTemplate.query.all()
    return render_template('card_editor.html', templates=templates, mode="templates")

@app.route('/modelli-tessera/aggiungi', methods=['POST'])
@teacher_required
def add_template():
    """Aggiunge un nuovo modello di tessera"""
    nome = request.form.get('nome')
    contenuto = request.form.get('contenuto')
    predefinito = 'predefinito' in request.form
    
    # Se questo è impostato come predefinito, rimuovi il flag dagli altri
    if predefinito:
        CardTemplate.query.filter_by(predefinito=True).update({'predefinito': False})
    
    template = CardTemplate(
        nome=nome,
        contenuto=contenuto,
        predefinito=predefinito
    )
    
    db.session.add(template)
    db.session.commit()
    
    flash('Modello di tessera salvato con successo!', 'success')
    return redirect(url_for('card_templates'))

@app.route('/modelli-tessera/<int:id>/modifica', methods=['POST'])
@teacher_required
def edit_template(id):
    """Modifica un modello di tessera esistente"""
    template = CardTemplate.query.get_or_404(id)
    
    template.nome = request.form.get('nome')
    template.contenuto = request.form.get('contenuto')
    predefinito = 'predefinito' in request.form
    
    # Se questo è impostato come predefinito, rimuovi il flag dagli altri
    if predefinito and not template.predefinito:
        CardTemplate.query.filter_by(predefinito=True).update({'predefinito': False})
    
    template.predefinito = predefinito
    
    db.session.commit()
    
    flash('Modello di tessera aggiornato con successo!', 'success')
    return redirect(url_for('card_templates'))

@app.route('/modelli-tessera/<int:id>/elimina', methods=['POST'])
@teacher_required
def delete_template(id):
    """Elimina un modello di tessera"""
    template = CardTemplate.query.get_or_404(id)
    
    db.session.delete(template)
    db.session.commit()
    
    flash('Modello di tessera eliminato con successo', 'success')
    return redirect(url_for('card_templates'))

# ---- STATISTICHE ----

@app.route('/statistiche')
@login_required
def statistics():
    """Visualizza le statistiche della biblioteca"""
    # Statistiche generali
    total_books = Book.query.count()
    total_users = User.query.count()
    total_loans = Loan.query.count()
    active_loans = Loan.query.filter(Loan.data_restituzione_effettiva == None).count()
    
    # Libri più prestati
    most_loaned_books = db.session.query(
        Book, db.func.count(Loan.id).label('loan_count')
    ).join(Loan).group_by(Book.id).order_by(db.desc('loan_count')).limit(10).all()
    
    # Utenti più attivi
    most_active_users = db.session.query(
        User, db.func.count(Loan.id).label('loan_count')
    ).join(Loan).group_by(User.id).order_by(db.desc('loan_count')).limit(10).all()
    
    # Statistiche per mese
    current_year = datetime.utcnow().year
    monthly_loans = []
    for month in range(1, 13):
        count = Loan.query.filter(
            db.extract('year', Loan.data_prestito) == current_year,
            db.extract('month', Loan.data_prestito) == month
        ).count()
        monthly_loans.append(count)
    
    return render_template('stats.html', 
                          total_books=total_books,
                          total_users=total_users,
                          total_loans=total_loans,
                          active_loans=active_loans,
                          most_loaned_books=most_loaned_books,
                          most_active_users=most_active_users,
                          monthly_loans=monthly_loans)

# ---- API ----

@app.route('/api/libro/<isbn>')
@login_required
def get_book_by_isbn(isbn):
    """API per ottenere un libro dal database tramite ISBN"""
    book = Book.query.filter_by(isbn=isbn).first()
    if book:
        return jsonify({
            'id': book.id,
            'isbn': book.isbn,
            'titolo': book.titolo,
            'autore': book.autore,
            'editore': book.editore,
            'anno_pubblicazione': book.anno_pubblicazione,
            'disponibile': book.disponibile
        })
    return jsonify({'error': 'Libro non trovato'}), 404

@app.route('/api/utente/<barcode>')
@login_required
def get_user_by_barcode(barcode):
    """API per ottenere un utente dal database tramite barcode"""
    user = User.query.filter_by(barcode=barcode).first()
    if user:
        return jsonify({
            'id': user.id,
            'nome': user.nome,
            'cognome': user.cognome,
            'classe': user.classe,
            'barcode': user.barcode
        })
    return jsonify({'error': 'Utente non trovato'}), 404

@app.route('/api/prestiti/utente/<int:user_id>')
@login_required
def get_loans_by_user(user_id):
    """API per ottenere i prestiti di un utente"""
    user = User.query.get_or_404(user_id)
    loans = Loan.query.filter_by(utente_id=user_id).all()
    
    result = []
    for loan in loans:
        result.append({
            'id': loan.id,
            'libro': {
                'id': loan.libro.id,
                'titolo': loan.libro.titolo,
                'isbn': loan.libro.isbn
            },
            'data_prestito': loan.data_prestito.strftime('%d/%m/%Y'),
            'data_restituzione_prevista': loan.data_restituzione_prevista.strftime('%d/%m/%Y') if loan.data_restituzione_prevista else None,
            'data_restituzione_effettiva': loan.data_restituzione_effettiva.strftime('%d/%m/%Y') if loan.data_restituzione_effettiva else None,
            'stato': 'Restituito' if loan.data_restituzione_effettiva else 'In prestito'
        })
    
    return jsonify({
        'utente': {
            'id': user.id,
            'nome': user.nome,
            'cognome': user.cognome,
            'classe': user.classe
        },
        'prestiti': result
    })

@app.route('/api/modello-tessera/<int:id>')
@login_required
def get_card_template(id):
    """API per ottenere un modello di tessera"""
    template = CardTemplate.query.get_or_404(id)
    return jsonify({
        'id': template.id,
        'nome': template.nome,
        'contenuto': json.loads(template.contenuto),
        'predefinito': template.predefinito
    })
