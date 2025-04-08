import csv
import re

def parse_txt_file(filepath):
    """
    Analizza un file di testo con dati relativi ai libri.
    Ogni riga dovrebbe contenere informazioni sul libro separate da delimitatori come '|', ';', o tabulazioni.
    
    Returns:
        list: Lista di dizionari con i dati dei libri
    """
    risultati = []
    
    with open(filepath, 'r', encoding='utf-8') as file:
        lines = file.readlines()
        
        # Proviamo a capire quale delimitatore viene utilizzato
        delimiters = ['|', ';', '\t', ',']
        delimiter_counts = {d: 0 for d in delimiters}
        
        for line in lines[:10]:  # Esaminiamo le prime 10 righe
            for d in delimiters:
                delimiter_counts[d] += line.count(d)
        
        # Scegliamo il delimitatore più frequente
        delimiter = max(delimiter_counts, key=delimiter_counts.get)
        
        # Se non abbiamo trovato un delimitatore, usiamo gli spazi
        if delimiter_counts[delimiter] == 0:
            delimiter = None  # Split cercherà gli spazi bianchi
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            parts = line.split(delimiter) if delimiter else line.split()
            libro = {}
            
            # Cerchiamo di identificare le parti basandoci su pattern comuni
            for part in parts:
                part = part.strip()
                
                # ISBN: sequenza di 10 o 13 cifre, a volte con trattini
                if re.match(r'^(?:\d[\d-]{8,16}\d)$', part):
                    isbn = re.sub(r'[^0-9X]', '', part)  # Rimuove tutti i caratteri non numerici e 'X'
                    libro['isbn'] = isbn
                
                # Anno: 4 cifre che sembrano un anno
                elif re.match(r'^(19|20)\d{2}$', part):
                    libro['anno_pubblicazione'] = part
                
                # Se non abbiamo ancora un titolo, assumiamo che sia una stringa lunga
                elif 'titolo' not in libro and len(part) > 10:
                    libro['titolo'] = part
                
                # Altrimenti, potrebbe essere un autore
                elif 'autore' not in libro and len(part) > 3:
                    libro['autore'] = part
                
                # O un editore
                elif 'editore' not in libro and len(part) > 3:
                    libro['editore'] = part
            
            # Verifichiamo che ci sia almeno un ISBN
            if 'isbn' in libro:
                risultati.append(libro)
    
    return risultati

def parse_csv_file(filepath):
    """
    Analizza un file CSV con dati relativi ai libri.
    
    Returns:
        list: Lista di dizionari con i dati dei libri
    """
    risultati = []
    
    with open(filepath, 'r', encoding='utf-8') as file:
        # Proviamo a rilevare il dialetto del CSV
        dialect = csv.Sniffer().sniff(file.read(1024))
        file.seek(0)
        
        reader = csv.reader(file, dialect)
        headers = next(reader, None)
        
        # Se non abbiamo intestazioni, creiamo nomi di campo generici
        if not headers:
            headers = [f'field{i}' for i in range(10)]
        
        # Standardizziamo i nomi delle colonne
        normalized_headers = []
        for header in headers:
            header = header.lower().strip()
            if 'isbn' in header:
                normalized_headers.append('isbn')
            elif 'titolo' in header or 'title' in header:
                normalized_headers.append('titolo')
            elif 'autore' in header or 'author' in header:
                normalized_headers.append('autore')
            elif 'editore' in header or 'publisher' in header:
                normalized_headers.append('editore')
            elif 'anno' in header or 'year' in header:
                normalized_headers.append('anno_pubblicazione')
            elif 'descr' in header:
                normalized_headers.append('descrizione')
            elif 'image' in header or 'foto' in header or 'cover' in header:
                normalized_headers.append('immagine_url')
            else:
                normalized_headers.append(header)
        
        for row in reader:
            if not any(row):  # Salta righe vuote
                continue
            
            libro = {}
            for i, value in enumerate(row):
                if i < len(normalized_headers):
                    libro[normalized_headers[i]] = value.strip()
            
            # Verifichiamo che ci sia almeno un ISBN
            if 'isbn' in libro and libro['isbn']:
                risultati.append(libro)
    
    return risultati
