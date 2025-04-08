import requests
import re
import logging
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)

def cerca_libro_per_isbn(isbn):
    """
    Cerca informazioni su un libro utilizzando l'ISBN tramite diverse API pubbliche.
    
    Args:
        isbn (str): Il codice ISBN del libro
    
    Returns:
        dict: Un dizionario con le informazioni del libro o None se non trovato
    """
    # Pulizia dell'ISBN (rimuovi trattini, ecc.)
    isbn = re.sub(r'[^0-9X]', '', isbn)
    
    # Prova prima OpenLibrary
    try:
        libro = cerca_su_openlibrary(isbn)
        if libro:
            return libro
    except Exception as e:
        logger.error(f"Errore durante la ricerca su OpenLibrary: {e}")
    
    # Prova GoogleBooks come fallback
    try:
        libro = cerca_su_googlebooks(isbn)
        if libro:
            return libro
    except Exception as e:
        logger.error(f"Errore durante la ricerca su GoogleBooks: {e}")
    
    # Se entrambe le ricerche falliscono, restituisci un dizionario vuoto
    return None

def cerca_su_openlibrary(isbn):
    """
    Cerca il libro su OpenLibrary.
    """
    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
    response = requests.get(url, timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        if f"ISBN:{isbn}" in data:
            libro_data = data[f"ISBN:{isbn}"]
            
            # Estrai i dati rilevanti
            libro = {
                'isbn': isbn,
                'titolo': libro_data.get('title', ''),
                'autore': ', '.join([author.get('name', '') for author in libro_data.get('authors', [])]),
                'editore': ', '.join([publisher for publisher in libro_data.get('publishers', [])]),
                'anno_pubblicazione': libro_data.get('publish_date', ''),
                'descrizione': '',
            }
            
            # Cerca l'URL dell'immagine della copertina
            if 'cover' in libro_data:
                if 'large' in libro_data['cover']:
                    libro['immagine_url'] = libro_data['cover']['large']
                elif 'medium' in libro_data['cover']:
                    libro['immagine_url'] = libro_data['cover']['medium']
                elif 'small' in libro_data['cover']:
                    libro['immagine_url'] = libro_data['cover']['small']
            
            return libro
    
    return None

def cerca_su_googlebooks(isbn):
    """
    Cerca il libro su Google Books.
    """
    url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}"
    response = requests.get(url, timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        if data.get('totalItems', 0) > 0 and 'items' in data:
            item = data['items'][0]
            volume_info = item.get('volumeInfo', {})
            
            # Estrai i dati rilevanti
            libro = {
                'isbn': isbn,
                'titolo': volume_info.get('title', ''),
                'autore': ', '.join(volume_info.get('authors', [])),
                'editore': volume_info.get('publisher', ''),
                'anno_pubblicazione': volume_info.get('publishedDate', ''),
                'descrizione': volume_info.get('description', ''),
            }
            
            # Cerca l'URL dell'immagine della copertina
            if 'imageLinks' in volume_info:
                if 'thumbnail' in volume_info['imageLinks']:
                    libro['immagine_url'] = volume_info['imageLinks']['thumbnail'].replace('http://', 'https://')
            
            return libro
    
    return None
