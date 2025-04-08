import re
import random

def genera_ean13(code_base=None):
    """
    Genera un codice EAN-13 valido.
    
    Args:
        code_base (str, optional): Base del codice, deve essere una stringa numerica
                                  di 12 cifre o meno. Se più corta, verrà riempita.
                                  
    Returns:
        str: Codice EAN-13 valido
    """
    # Se non viene fornita una base, ne genera una casuale
    if not code_base:
        code_base = ''.join([str(random.randint(0, 9)) for _ in range(12)])
    
    # Pulisce la base da caratteri non numerici
    code_base = re.sub(r'[^0-9]', '', code_base)
    
    # Assicura che la base sia lunga 12 caratteri
    if len(code_base) < 12:
        # Aggiunge zeri a sinistra fino a 12 caratteri
        code_base = code_base.zfill(12)
    elif len(code_base) > 12:
        # Tronca la base a 12 caratteri
        code_base = code_base[:12]
    
    # Calcola la cifra di controllo per EAN-13
    somma_pari = sum([int(code_base[i]) for i in range(0, 12, 2)])
    somma_dispari = sum([int(code_base[i]) * 3 for i in range(1, 12, 2)])
    
    check_digit = (10 - ((somma_pari + somma_dispari) % 10)) % 10
    
    # Restituisce il codice EAN-13 completo
    return code_base + str(check_digit)

def valida_ean13(code):
    """
    Verifica se un codice EAN-13 è valido.
    
    Args:
        code (str): Codice EAN-13 da verificare
        
    Returns:
        bool: True se il codice è valido, False altrimenti
    """
    if not code or len(code) != 13 or not code.isdigit():
        return False
    
    somma_pari = sum([int(code[i]) for i in range(0, 12, 2)])
    somma_dispari = sum([int(code[i]) * 3 for i in range(1, 12, 2)])
    
    check_digit = (10 - ((somma_pari + somma_dispari) % 10)) % 10
    
    return int(code[-1]) == check_digit
