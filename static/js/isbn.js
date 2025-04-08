/**
 * Script per la ricerca e la gestione dei ISBN
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elementi DOM
    const isbnInput = document.getElementById('isbn');
    const searchButton = document.getElementById('search-isbn');
    const bookForm = document.getElementById('book-form');
    
    // Se gli elementi non esistono, esci
    if (!isbnInput || !searchButton || !bookForm) return;
    
    // Event listener per la ricerca ISBN
    searchButton.addEventListener('click', function() {
        const isbn = isbnInput.value.trim();
        
        if (isbn.length < 10) {
            showMessage('ISBN non valido. Inserisci almeno 10 caratteri.', 'warning');
            return;
        }
        
        // Mostra indicatore di caricamento
        searchButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Ricerca...';
        searchButton.disabled = true;
        
        // Effettua la richiesta API
        fetch(`/api/isbn/${isbn}`)
            .then(response => response.json())
            .then(data => {
                // Ripristina il pulsante
                searchButton.innerHTML = '<i class="fas fa-search"></i> Cerca';
                searchButton.disabled = false;
                
                if (data.error) {
                    showMessage(data.error, 'warning');
                    return;
                }
                
                // Compila il form con i dati trovati
                fillBookForm(data);
                showMessage('Informazioni sul libro trovate!', 'success');
            })
            .catch(error => {
                console.error('Errore nella ricerca ISBN:', error);
                searchButton.innerHTML = '<i class="fas fa-search"></i> Cerca';
                searchButton.disabled = false;
                showMessage('Errore durante la ricerca. Riprova più tardi.', 'danger');
            });
    });
    
    // Supporto per la lettura tramite scanner di codici a barre
    let barcodeBuffer = '';
    let barcodeTimeout;
    
    // Gestione dell'input rapido da scanner di codici a barre
    document.addEventListener('keypress', function(e) {
        // Se non siamo nella pagina dei libri, esci
        if (!isbnInput) return;
        
        // Controlla se l'evento proviene da un campo di input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            // Se l'evento è in un campo di input diverso dall'ISBN, ignora
            if (e.target !== isbnInput) return;
        }
        
        // Resetta il timeout se esiste
        if (barcodeTimeout) clearTimeout(barcodeTimeout);
        
        // Aggiungi il carattere al buffer
        barcodeBuffer += e.key;
        
        // Imposta un timeout per determinare la fine dell'input
        barcodeTimeout = setTimeout(function() {
            // Verifica se il buffer ha una lunghezza ragionevole per un ISBN
            if (barcodeBuffer.length >= 10 && barcodeBuffer.length <= 13) {
                // Inserisci il valore nel campo ISBN
                isbnInput.value = barcodeBuffer;
                
                // Attiva la ricerca automatica
                searchButton.click();
            }
            
            // Resetta il buffer
            barcodeBuffer = '';
        }, 100);
    });
});

/**
 * Mostra un messaggio di notifica
 * @param {string} message - Messaggio da mostrare
 * @param {string} type - Tipo di messaggio (success, danger, warning, info)
 */
function showMessage(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    
    if (!alertContainer) {
        // Se il container non esiste, crea uno nuovo
        const container = document.createElement('div');
        container.id = 'alert-container';
        container.style.position = 'fixed';
        container.style.top = '10px';
        container.style.right = '10px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    
    // Crea l'alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = 'alert';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Chiudi"></button>
    `;
    
    // Aggiungi l'alert al container
    document.getElementById('alert-container').appendChild(alert);
    
    // Rimuovi automaticamente l'alert dopo 5 secondi
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
    }, 5000);
}

/**
 * Compila il form del libro con i dati ricevuti
 * @param {Object} data - Dati del libro
 */
function fillBookForm(data) {
    // Compila i campi se esistono
    const fields = ['titolo', 'autore', 'editore', 'anno_pubblicazione', 'genere', 'descrizione', 'immagine_url'];
    
    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element && data[field]) {
            element.value = data[field];
        }
    });
    
    // Gestisci l'anteprima dell'immagine
    const imgPreview = document.getElementById('cover-preview');
    if (imgPreview && data.immagine_url) {
        imgPreview.src = data.immagine_url;
        imgPreview.style.display = 'block';
    }
}
