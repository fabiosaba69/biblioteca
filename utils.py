import os
import random
import base64
import json
import re
import csv
import io
import requests
from urllib.parse import quote_plus
from datetime import datetime
import logging
from PIL import Image
from flask import current_app

def generate_barcode(prefix="2"):
    """
    Genera un codice a barre EAN-13 valido.
    Inizia con il prefisso specificato e calcola la cifra di controllo.
    """
    # Genera 12 cifre casuali (la 13a è il checksum)
    digits = prefix
    for _ in range(11):
        digits += str(random.randint(0, 9))
    
    # Calcola il checksum
    total = 0
    for i, digit in enumerate(digits):
        value = int(digit)
        # Posizioni dispari (0, 2, 4, ...) hanno peso 1, pari hanno peso 3
        total += value * (1 if i % 2 == 0 else 3)
    
    # Il checksum è la cifra che, aggiunta al totale, rende divisibile per 10
    checksum = (10 - (total % 10)) % 10
    
    # Restituisce tutte le 13 cifre
    return digits + str(checksum)

def search_by_isbn(isbn):
    """
    Cerca informazioni su un libro usando l'ISBN.
    Prova diverse API pubbliche e restituisce i dati trovati.
    """
    isbn = isbn.replace('-', '').strip()
    
    # Pulisci l'ISBN da caratteri non validi
    isbn = re.sub(r'[^\dX]', '', isbn)
    
    # Se l'ISBN non è valido, restituisci un oggetto vuoto
    if not isbn:
        return {}
    
    # Lista delle fonti API da provare
    sources = [
        search_openlibrary,
        search_google_books
    ]
    
    # Prova ogni fonte finché non trovi dati
    book_data = {}
    for source in sources:
        try:
            data = source(isbn)
            if data:
                # Unisci i dati trovati con quelli esistenti (priorità ai nuovi dati)
                book_data.update(data)
        except Exception as e:
            current_app.logger.error(f"Errore durante la ricerca ISBN {isbn} su {source.__name__}: {str(e)}")
    
    return book_data

def search_openlibrary(isbn):
    """Cerca un libro su OpenLibrary.org usando l'ISBN"""
    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
    
    response = requests.get(url, timeout=5)
    if response.status_code == 200:
        data = response.json()
        key = f"ISBN:{isbn}"
        
        if key in data:
            book = data[key]
            result = {
                'isbn': isbn,
                'titolo': book.get('title', ''),
                'autore': ', '.join([author.get('name', '') for author in book.get('authors', [])]),
                'editore': ', '.join([publisher for publisher in book.get('publishers', [])]),
                'anno_pubblicazione': book.get('publish_date', '')[:4] if book.get('publish_date') else '',
                'descrizione': book.get('notes', '')
            }
            
            # Prova a ottenere l'URL dell'immagine della copertina
            if 'cover' in book and 'medium' in book['cover']:
                result['immagine_url'] = book['cover']['medium']
            
            return result
    
    return {}

def search_google_books(isbn):
    """Cerca un libro su Google Books API usando l'ISBN"""
    url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}"
    
    response = requests.get(url, timeout=5)
    if response.status_code == 200:
        data = response.json()
        
        if data.get('totalItems', 0) > 0:
            book = data['items'][0]['volumeInfo']
            result = {
                'isbn': isbn,
                'titolo': book.get('title', ''),
                'autore': ', '.join(book.get('authors', [])),
                'editore': book.get('publisher', ''),
                'anno_pubblicazione': book.get('publishedDate', '')[:4] if book.get('publishedDate') else '',
                'genere': ', '.join(book.get('categories', [])),
                'descrizione': book.get('description', '')
            }
            
            # Prova a ottenere l'URL dell'immagine della copertina
            if 'imageLinks' in book and 'thumbnail' in book['imageLinks']:
                result['immagine_url'] = book['imageLinks']['thumbnail']
            
            return result
    
    return {}

def parse_import_file(file_content, delimiter=',', has_header=True):
    """
    Analizza un file di importazione (CSV o TXT) e restituisce un elenco di libri.
    Supporta diversi formati e delimitatori.
    """
    result = []
    
    # Prova a determinare il formato in base al contenuto
    if '\t' in file_content[:1000]:
        # Probabilmente un file TSV
        estimated_delimiter = '\t'
    elif ',' in file_content[:1000]:
        # Probabilmente un file CSV
        estimated_delimiter = ','
    elif ';' in file_content[:1000]:
        # Comune in file CSV europei
        estimated_delimiter = ';'
    else:
        # Usa il delimitatore specificato
        estimated_delimiter = delimiter
    
    # Crea un lettore CSV
    reader = csv.reader(io.StringIO(file_content), delimiter=estimated_delimiter)
    rows = list(reader)
    
    if not rows:
        return []
    
    # Determina i nomi delle colonne
    if has_header:
        header = rows[0]
        data_rows = rows[1:]
    else:
        # Se non c'è intestazione, crea nomi di colonna generici
        header = [f"colonna_{i}" for i in range(len(rows[0]))]
        data_rows = rows
    
    # Mappa le colonne alle proprietà del libro in base ai nomi
    column_mapping = {}
    for i, col_name in enumerate(header):
        col_lower = col_name.lower()
        if 'isbn' in col_lower:
            column_mapping[i] = 'isbn'
        elif 'titolo' in col_lower or 'title' in col_lower or 'nome' in col_lower:
            column_mapping[i] = 'titolo'
        elif 'autore' in col_lower or 'author' in col_lower:
            column_mapping[i] = 'autore'
        elif 'editore' in col_lower or 'publisher' in col_lower:
            column_mapping[i] = 'editore'
        elif 'anno' in col_lower or 'year' in col_lower or 'data' in col_lower:
            column_mapping[i] = 'anno_pubblicazione'
        elif 'genere' in col_lower or 'category' in col_lower:
            column_mapping[i] = 'genere'
        elif 'descr' in col_lower:
            column_mapping[i] = 'descrizione'
        elif 'immag' in col_lower or 'cover' in col_lower or 'url' in col_lower:
            column_mapping[i] = 'immagine_url'
    
    # Processa ogni riga
    for row in data_rows:
        book = {}
        for i, cell in enumerate(row):
            if i in column_mapping and cell.strip():
                book[column_mapping[i]] = cell.strip()
        
        # Includi solo libri che hanno almeno ISBN o titolo
        if book.get('isbn') or book.get('titolo'):
            result.append(book)
    
    return result

def save_base64_image(base64_data, filename):
    """
    Salva un'immagine base64 come file e restituisce il percorso.
    """
    try:
        # Crea la directory se non esiste
        upload_dir = os.path.join(current_app.static_folder, 'uploads')
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir)
        
        # Estrai i dati effettivi dal formato base64
        if ',' in base64_data:
            base64_data = base64_data.split(',', 1)[1]
        
        # Decodifica i dati base64
        image_data = base64.b64decode(base64_data)
        
        # Salva l'immagine
        file_path = os.path.join(upload_dir, filename)
        with open(file_path, 'wb') as f:
            f.write(image_data)
        
        # Restituisci l'URL relativo
        return os.path.join('uploads', filename)
    
    except Exception as e:
        current_app.logger.error(f"Errore nel salvare l'immagine: {str(e)}")
        return None
