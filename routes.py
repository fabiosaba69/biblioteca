import os
import json
import csv
from datetime import datetime, timedelta
from flask import render_template, request, redirect, url_for, flash, jsonify, send_file, session
from werkzeug.utils import secure_filename
from sqlalchemy import func, desc, extract
from app import app, db
from models import Libro, Utente, Prestito, ImpostazioneTessera
from utils import parse_txt_file, parse_csv_file
from isbn_service import cerca_libro_per_isbn
from barcode_service import genera_ean13

# Rotte per la home page
@app.route('/')
def index():
    # Statistiche da mostrare nella home
    num_libri = Libro.query.count()
    num_utenti = Utente.query.count()
    num_prestiti_attivi = Prestito.query.filter(Prestito.data_restituzione_effettiva.is_(None)).count()
    prestiti_recenti = Prestito.query.order_by(Prestito.data_prestito.desc()).limit(5).all()
    
    libri_recenti = Libro.query.order_by(Libro.data_inserimento.desc()).limit(5).all()
    
    return render_template('index.html', 
                          num_libri=num_libri, 
                          num_utenti=num_utenti, 
                          num_prestiti_attivi=num_prestiti_attivi,
                          prestiti_recenti=prestiti_recenti,
                          libri_recenti=libri_recenti)

# Gestione Libri
@app.route('/libri')
def libri():
    page = request.args.get('page', 1, type=int)
    per_page = 20
    search = request.args.get('search', '')
    
    if search:
        libri = Libro.query.filter(
            (Libro.titolo.ilike(f'%{search}%')) | 
            (Libro.autore.ilike(f'%{search}%')) | 
            (Libro.isbn.ilike(f'%{search}%'))
        ).order_by(Libro.titolo).paginate(page=page, per_page=per_page)
    else:
        libri = Libro.query.order_by(Libro.titolo).paginate(page=page, per_page=per_page)
    
    return render_template('libri.html', libri=libri, search=search)

@app.route('/libri/nuovo', methods=['GET', 'POST'])
def nuovo_libro():
    if request.method == 'POST':
        isbn = request.form.get('isbn')
        titolo = request.form.get('titolo')
        autore = request.form.get('autore')
        editore = request.form.get('editore')
        anno_pubblicazione = request.form.get('anno_pubblicazione')
        descrizione = request.form.get('descrizione')
        immagine_url = request.form.get('immagine_url')
        
        # Verifica se il libro esiste già
        libro_esistente = Libro.query.filter_by(isbn=isbn).first()
        if libro_esistente:
            flash('Un libro con lo stesso ISBN è già presente nel sistema.', 'warning')
            return redirect(url_for('libri'))
        
        nuovo_libro = Libro(
            isbn=isbn,
            titolo=titolo,
            autore=autore,
            editore=editore,
            anno_pubblicazione=anno_pubblicazione,
            descrizione=descrizione,
            immagine_url=immagine_url
        )
        
        db.session.add(nuovo_libro)
        db.session.commit()
        
        flash('Libro aggiunto con successo!', 'success')
        return redirect(url_for('libri'))
    
    return render_template('libro_dettaglio.html', libro=None)

@app.route('/libri/<int:libro_id>')
def visualizza_libro(libro_id):
    libro = Libro.query.get_or_404(libro_id)
    prestiti = Prestito.query.filter_by(libro_id=libro_id).order_by(Prestito.data_prestito.desc()).all()
    return render_template('libro_dettaglio.html', libro=libro, prestiti=prestiti)

@app.route('/libri/<int:libro_id>/modifica', methods=['GET', 'POST'])
def modifica_libro(libro_id):
    libro = Libro.query.get_or_404(libro_id)
    
    if request.method == 'POST':
        libro.isbn = request.form.get('isbn')
        libro.titolo = request.form.get('titolo')
        libro.autore = request.form.get('autore')
        libro.editore = request.form.get('editore')
        libro.anno_pubblicazione = request.form.get('anno_pubblicazione')
        libro.descrizione = request.form.get('descrizione')
        libro.immagine_url = request.form.get('immagine_url')
        
        db.session.commit()
        flash('Libro aggiornato con successo!', 'success')
        return redirect(url_for('visualizza_libro', libro_id=libro.id))
    
    return render_template('libro_dettaglio.html', libro=libro, modifica=True)

@app.route('/libri/<int:libro_id>/elimina', methods=['POST'])
def elimina_libro(libro_id):
    libro = Libro.query.get_or_404(libro_id)
    
    # Verifica se ci sono prestiti attivi per questo libro
    prestiti_attivi = Prestito.query.filter_by(libro_id=libro_id, data_restituzione_effettiva=None).first()
    if prestiti_attivi:
        flash('Non è possibile eliminare un libro con prestiti attivi!', 'danger')
        return redirect(url_for('visualizza_libro', libro_id=libro_id))
    
    db.session.delete(libro)
    db.session.commit()
    flash('Libro eliminato con successo!', 'success')
    return redirect(url_for('libri'))

@app.route('/libri/importa', methods=['GET', 'POST'])
def importa_libri():
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('Nessun file selezionato', 'danger')
            return redirect(request.url)
        
        file = request.files['file']
        if file.filename == '':
            flash('Nessun file selezionato', 'danger')
            return redirect(request.url)
        
        filename = secure_filename(file.filename)
        filepath = os.path.join('/tmp', filename)
        file.save(filepath)
        
        libri_importati = 0
        libri_esistenti = 0
        
        if filename.endswith('.csv'):
            risultato = parse_csv_file(filepath)
        elif filename.endswith('.txt'):
            risultato = parse_txt_file(filepath)
        else:
            flash('Formato file non supportato. Utilizzare .csv o .txt', 'danger')
            return redirect(request.url)
        
        for libro_data in risultato:
            isbn = libro_data.get('isbn', '').strip()
            if not isbn:
                continue
                
            # Verifica se il libro esiste già
            libro_esistente = Libro.query.filter_by(isbn=isbn).first()
            if libro_esistente:
                libri_esistenti += 1
                continue
            
            # Se non abbiamo abbastanza dati, cerca online
            if 'titolo' not in libro_data or not libro_data['titolo']:
                try:
                    dati_libro = cerca_libro_per_isbn(isbn)
                    if dati_libro:
                        libro_data.update(dati_libro)
                except Exception as e:
                    app.logger.error(f"Errore nella ricerca del libro con ISBN {isbn}: {e}")
            
            # Creiamo il libro con i dati disponibili
            nuovo_libro = Libro(
                isbn=isbn,
                titolo=libro_data.get('titolo', 'Titolo non disponibile'),
                autore=libro_data.get('autore', 'Autore non disponibile'),
                editore=libro_data.get('editore', ''),
                anno_pubblicazione=libro_data.get('anno_pubblicazione', ''),
                descrizione=libro_data.get('descrizione', ''),
                immagine_url=libro_data.get('immagine_url', '')
            )
            
            db.session.add(nuovo_libro)
            libri_importati += 1
        
        db.session.commit()
        flash(f'Importazione completata! {libri_importati} libri importati, {libri_esistenti} libri già esistenti.', 'success')
        return redirect(url_for('libri'))
    
    return render_template('importa_libri.html')

@app.route('/api/isbn/<isbn>')
def cerca_info_libro(isbn):
    try:
        # Prima controlliamo se esiste già nel database
        libro = Libro.query.filter_by(isbn=isbn).first()
        if libro:
            return jsonify({
                'esistente': True,
                'id': libro.id,
                'isbn': libro.isbn,
                'titolo': libro.titolo,
                'autore': libro.autore,
                'editore': libro.editore,
                'anno_pubblicazione': libro.anno_pubblicazione,
                'descrizione': libro.descrizione,
                'immagine_url': libro.immagine_url
            })
        
        # Se non esiste, cerchiamo online
        info_libro = cerca_libro_per_isbn(isbn)
        if info_libro:
            return jsonify({
                'esistente': False,
                **info_libro
            })
        
        return jsonify({'error': 'Libro non trovato'}), 404
    
    except Exception as e:
        app.logger.error(f"Errore nella ricerca del libro con ISBN {isbn}: {e}")
        return jsonify({'error': str(e)}), 500

# Gestione Utenti
@app.route('/utenti')
def utenti():
    page = request.args.get('page', 1, type=int)
    per_page = 20
    search = request.args.get('search', '')
    
    if search:
        utenti = Utente.query.filter(
            (Utente.nome.ilike(f'%{search}%')) | 
            (Utente.cognome.ilike(f'%{search}%')) |
            (Utente.classe.ilike(f'%{search}%')) |
            (Utente.codice.ilike(f'%{search}%'))
        ).order_by(Utente.cognome, Utente.nome).paginate(page=page, per_page=per_page)
    else:
        utenti = Utente.query.order_by(Utente.cognome, Utente.nome).paginate(page=page, per_page=per_page)
    
    return render_template('utenti.html', utenti=utenti, search=search)

@app.route('/utenti/nuovo', methods=['GET', 'POST'])
def nuovo_utente():
    if request.method == 'POST':
        nome = request.form.get('nome')
        cognome = request.form.get('cognome')
        classe = request.form.get('classe')
        
        # Generiamo un codice univoco per l'utente
        current_time = datetime.now()
        code_base = f"U{current_time.strftime('%y%m%d%H%M%S')}"
        codice = genera_ean13(code_base)
        
        nuovo_utente = Utente(
            nome=nome,
            cognome=cognome,
            classe=classe,
            codice=codice
        )
        
        db.session.add(nuovo_utente)
        db.session.commit()
        
        # Creiamo anche un'impostazione tessera predefinita per l'utente
        tessera = ImpostazioneTessera(
            nome=f"Tessera di {cognome} {nome}",
            utente_id=nuovo_utente.id
        )
        
        db.session.add(tessera)
        db.session.commit()
        
        flash('Utente aggiunto con successo!', 'success')
        return redirect(url_for('utenti'))
    
    return render_template('utente_dettaglio.html', utente=None)

@app.route('/utenti/<int:utente_id>')
def visualizza_utente(utente_id):
    utente = Utente.query.get_or_404(utente_id)
    prestiti = Prestito.query.filter_by(utente_id=utente_id).order_by(Prestito.data_prestito.desc()).all()
    return render_template('utente_dettaglio.html', utente=utente, prestiti=prestiti)

@app.route('/utenti/<int:utente_id>/modifica', methods=['GET', 'POST'])
def modifica_utente(utente_id):
    utente = Utente.query.get_or_404(utente_id)
    
    if request.method == 'POST':
        utente.nome = request.form.get('nome')
        utente.cognome = request.form.get('cognome')
        utente.classe = request.form.get('classe')
        
        db.session.commit()
        flash('Utente aggiornato con successo!', 'success')
        return redirect(url_for('visualizza_utente', utente_id=utente.id))
    
    return render_template('utente_dettaglio.html', utente=utente, modifica=True)

@app.route('/utenti/<int:utente_id>/elimina', methods=['POST'])
def elimina_utente(utente_id):
    utente = Utente.query.get_or_404(utente_id)
    
    # Verifica se ci sono prestiti attivi per questo utente
    prestiti_attivi = Prestito.query.filter_by(utente_id=utente_id, data_restituzione_effettiva=None).first()
    if prestiti_attivi:
        flash('Non è possibile eliminare un utente con prestiti attivi!', 'danger')
        return redirect(url_for('visualizza_utente', utente_id=utente_id))
    
    db.session.delete(utente)
    db.session.commit()
    flash('Utente eliminato con successo!', 'success')
    return redirect(url_for('utenti'))

# Gestione Prestiti
@app.route('/prestiti')
def prestiti():
    page = request.args.get('page', 1, type=int)
    per_page = 20
    filter_by = request.args.get('filter', 'all')
    
    query = Prestito.query.join(Libro).join(Utente)
    
    if filter_by == 'active':
        query = query.filter(Prestito.data_restituzione_effettiva.is_(None))
    elif filter_by == 'returned':
        query = query.filter(Prestito.data_restituzione_effettiva.isnot(None))
    elif filter_by == 'overdue':
        query = query.filter(
            Prestito.data_restituzione_effettiva.is_(None),
            Prestito.data_restituzione_prevista < datetime.now()
        )
    
    prestiti = query.order_by(Prestito.data_prestito.desc()).paginate(page=page, per_page=per_page)
    
    return render_template('prestiti.html', prestiti=prestiti, filter_by=filter_by)

@app.route('/prestiti/nuovo', methods=['GET', 'POST'])
def nuovo_prestito():
    if request.method == 'POST':
        libro_id = request.form.get('libro_id')
        utente_id = request.form.get('utente_id')
        durata_giorni = int(request.form.get('durata_giorni', 30))
        
        # Verifica se il libro è disponibile
        libro = Libro.query.get(libro_id)
        if not libro:
            flash('Libro non trovato!', 'danger')
            return redirect(url_for('prestiti'))
        
        if not libro.disponibile:
            flash('Il libro non è disponibile per il prestito!', 'danger')
            return redirect(url_for('prestiti'))
        
        # Verifica se l'utente esiste
        utente = Utente.query.get(utente_id)
        if not utente:
            flash('Utente non trovato!', 'danger')
            return redirect(url_for('prestiti'))
        
        # Calcola la data di restituzione prevista
        data_restituzione_prevista = datetime.now() + timedelta(days=durata_giorni)
        
        nuovo_prestito = Prestito(
            libro_id=libro_id,
            utente_id=utente_id,
            data_prestito=datetime.now(),
            data_restituzione_prevista=data_restituzione_prevista,
            note=request.form.get('note', '')
        )
        
        # Aggiorna lo stato del libro
        libro.disponibile = False
        
        db.session.add(nuovo_prestito)
        db.session.commit()
        
        flash('Prestito registrato con successo!', 'success')
        return redirect(url_for('prestiti'))
    
    libri = Libro.query.filter_by(disponibile=True).order_by(Libro.titolo).all()
    utenti = Utente.query.filter_by(attivo=True).order_by(Utente.cognome, Utente.nome).all()
    
    return render_template('prestiti.html', page='nuovo', libri=libri, utenti=utenti)

@app.route('/prestiti/<int:prestito_id>/restituisci', methods=['POST'])
def restituisci_libro(prestito_id):
    prestito = Prestito.query.get_or_404(prestito_id)
    
    if prestito.data_restituzione_effettiva:
        flash('Questo libro è già stato restituito!', 'warning')
        return redirect(url_for('prestiti'))
    
    prestito.data_restituzione_effettiva = datetime.now()
    
    # Aggiorna lo stato del libro
    libro = Libro.query.get(prestito.libro_id)
    libro.disponibile = True
    
    db.session.commit()
    flash('Restituzione registrata con successo!', 'success')
    return redirect(url_for('prestiti'))

# Statistiche
@app.route('/statistiche')
def statistiche():
    # Statistiche generali
    num_libri = Libro.query.count()
    num_utenti = Utente.query.count()
    num_prestiti_totali = Prestito.query.count()
    num_prestiti_attivi = Prestito.query.filter(Prestito.data_restituzione_effettiva.is_(None)).count()
    num_prestiti_in_ritardo = Prestito.query.filter(
        Prestito.data_restituzione_effettiva.is_(None),
        Prestito.data_restituzione_prevista < datetime.now()
    ).count()
    
    # Utenti più attivi
    utenti_attivi = db.session.query(
        Utente.id, Utente.nome, Utente.cognome, func.count(Prestito.id).label('count')
    ).join(Prestito).group_by(Utente.id).order_by(desc('count')).limit(10).all()
    
    # Libri più prestati
    libri_prestati = db.session.query(
        Libro.id, Libro.titolo, Libro.autore, func.count(Prestito.id).label('count')
    ).join(Prestito).group_by(Libro.id).order_by(desc('count')).limit(10).all()
    
    # Statistiche mensili
    now = datetime.now()
    month_start = datetime(now.year, now.month, 1)
    
    prestiti_mensili = Prestito.query.filter(Prestito.data_prestito >= month_start).count()
    restituzioni_mensili = Prestito.query.filter(Prestito.data_restituzione_effettiva >= month_start).count()
    
    # Dati per il grafico mensile (ultimi 6 mesi)
    labels = []
    data_prestiti = []
    data_restituzioni = []
    
    for i in range(5, -1, -1):
        month = now.month - i
        year = now.year
        while month <= 0:
            month += 12
            year -= 1
        
        month_start = datetime(year, month, 1)
        if month == 12:
            month_end = datetime(year + 1, 1, 1)
        else:
            month_end = datetime(year, month + 1, 1)
        
        month_name = month_start.strftime('%B %Y')
        labels.append(month_name)
        
        count_prestiti = Prestito.query.filter(
            Prestito.data_prestito >= month_start,
            Prestito.data_prestito < month_end
        ).count()
        data_prestiti.append(count_prestiti)
        
        count_restituzioni = Prestito.query.filter(
            Prestito.data_restituzione_effettiva >= month_start,
            Prestito.data_restituzione_effettiva < month_end
        ).count()
        data_restituzioni.append(count_restituzioni)
    
    return render_template('statistiche.html',
                          num_libri=num_libri,
                          num_utenti=num_utenti,
                          num_prestiti_totali=num_prestiti_totali,
                          num_prestiti_attivi=num_prestiti_attivi,
                          num_prestiti_in_ritardo=num_prestiti_in_ritardo,
                          utenti_attivi=utenti_attivi,
                          libri_prestati=libri_prestati,
                          prestiti_mensili=prestiti_mensili,
                          restituzioni_mensili=restituzioni_mensili,
                          labels=labels,
                          data_prestiti=data_prestiti,
                          data_restituzioni=data_restituzioni)

# Gestione Tessere
@app.route('/tessere')
def tessere():
    utenti = Utente.query.order_by(Utente.cognome, Utente.nome).all()
    return render_template('tessere.html', utenti=utenti)

@app.route('/tessere/<int:utente_id>/editor', methods=['GET', 'POST'])
def editor_tessera(utente_id):
    utente = Utente.query.get_or_404(utente_id)
    
    # Ottieni o crea l'impostazione tessera per l'utente
    tessera = ImpostazioneTessera.query.filter_by(utente_id=utente_id).first()
    if not tessera:
        tessera = ImpostazioneTessera(
            nome=f"Tessera di {utente.cognome} {utente.nome}",
            utente_id=utente_id
        )
        db.session.add(tessera)
        db.session.commit()
    
    if request.method == 'POST':
        # Aggiorna le impostazioni della tessera
        data = request.get_json()
        
        tessera.font = data.get('font', tessera.font)
        tessera.dimensione_font = data.get('dimensione_font', tessera.dimensione_font)
        tessera.posizione_logo_x = data.get('posizione_logo_x', tessera.posizione_logo_x)
        tessera.posizione_logo_y = data.get('posizione_logo_y', tessera.posizione_logo_y)
        tessera.posizione_nome_x = data.get('posizione_nome_x', tessera.posizione_nome_x)
        tessera.posizione_nome_y = data.get('posizione_nome_y', tessera.posizione_nome_y)
        tessera.posizione_barcode_x = data.get('posizione_barcode_x', tessera.posizione_barcode_x)
        tessera.posizione_barcode_y = data.get('posizione_barcode_y', tessera.posizione_barcode_y)
        tessera.dimensione_barcode = data.get('dimensione_barcode', tessera.dimensione_barcode)
        tessera.contenuto_aggiuntivo = data.get('contenuto_aggiuntivo', tessera.contenuto_aggiuntivo)
        
        db.session.commit()
        return jsonify({'success': True})
    
    return render_template('editor_tessera.html', utente=utente, tessera=tessera)

@app.route('/tessere/<int:utente_id>/stampa')
def stampa_tessera(utente_id):
    utente = Utente.query.get_or_404(utente_id)
    tessera = ImpostazioneTessera.query.filter_by(utente_id=utente_id).first()
    
    if not tessera:
        tessera = ImpostazioneTessera(
            nome=f"Tessera di {utente.cognome} {utente.nome}",
            utente_id=utente_id
        )
        db.session.add(tessera)
        db.session.commit()
    
    return render_template('editor_tessera.html', utente=utente, tessera=tessera, stampa=True)

@app.context_processor
def utility_processor():
    def get_copyright_year():
        return datetime.now().year
    
    return dict(
        copyright_year=get_copyright_year(),
        author_name="Fabio SABATELLI"
    )
