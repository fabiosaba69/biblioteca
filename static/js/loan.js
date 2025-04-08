/**
 * Script per la gestione dei prestiti
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elementi DOM
    const userSearchInput = document.getElementById('user-search');
    const userResults = document.getElementById('user-results');
    const selectedUserId = document.getElementById('utente_id');
    const selectedUserInfo = document.getElementById('selected-user-info');
    
    const bookSearchInput = document.getElementById('book-search');
    const bookResults = document.getElementById('book-results');
    const selectedBookId = document.getElementById('libro_id');
    const selectedBookInfo = document.getElementById('selected-book-info');
    
    const barcodeInput = document.getElementById('barcode-input');
    const scanUserBtn = document.getElementById('scan-user');
    const scanBookBtn = document.getElementById('scan-book');
    
    // Supporto per la lettura tramite scanner di codici a barre
    let barcodeBuffer = '';
    let barcodeTimeout;
    
    // Gestione dell'input rapido da scanner di codici a barre
    document.addEventListener('keypress', function(e) {
        // Verifica se siamo nella pagina dei prestiti
        if (!barcodeInput) return;
        
        // Controlla se l'evento proviene da un campo di input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            // Se l'evento è in un campo di input diverso dal barcode, ignora
            if (e.target !== barcodeInput && 
                e.target !== userSearchInput && 
                e.target !== bookSearchInput) {
                return;
            }
        }
        
        // Resetta il timeout se esiste
        if (barcodeTimeout) clearTimeout(barcodeTimeout);
        
        // Aggiungi il carattere al buffer
        barcodeBuffer += e.key;
        
        // Imposta un timeout per determinare la fine dell'input
        barcodeTimeout = setTimeout(function() {
            // Verifica se il buffer ha una lunghezza ragionevole per un codice
            if (barcodeBuffer.length >= 10) {
                // Inserisci il valore nel campo barcode
                barcodeInput.value = barcodeBuffer;
                
                // Controlla se dobbiamo scansionare un utente o un libro
                if (document.activeElement === userSearchInput || 
                    document.querySelector('#scan-user.active')) {
                    processBarcodeUser(barcodeBuffer);
                } else if (document.activeElement === bookSearchInput || 
                           document.querySelector('#scan-book.active')) {
                    processBarcodeBook(barcodeBuffer);
                } else {
                    // Se non è specificato, prova entrambi
                    processBarcodeAuto(barcodeBuffer);
                }
            }
            
            // Resetta il buffer
            barcodeBuffer = '';
        }, 100);
    });
    
    // Event listeners per la ricerca utente
    if (userSearchInput) {
        userSearchInput.addEventListener('input', function() {
            const query = this.value.trim();
            if (query.length >= 3) {
                searchUsers(query);
            } else {
                userResults.innerHTML = '';
            }
        });
    }
    
    // Event listeners per la ricerca libro
    if (bookSearchInput) {
        bookSearchInput.addEventListener('input', function() {
            const query = this.value.trim();
            if (query.length >= 3) {
                searchBooks(query);
            } else {
                bookResults.innerHTML = '';
            }
        });
    }
    
    // Event listeners per i pulsanti di scansione
    if (scanUserBtn) {
        scanUserBtn.addEventListener('click', function() {
            toggleScanMode('user');
        });
    }
    
    if (scanBookBtn) {
        scanBookBtn.addEventListener('click', function() {
            toggleScanMode('book');
        });
    }
    
    /**
     * Attiva/disattiva la modalità di scansione
     * @param {string} mode - Modalità ('user' o 'book')
     */
    function toggleScanMode(mode) {
        if (mode === 'user') {
            scanUserBtn.classList.toggle('active');
            scanBookBtn.classList.remove('active');
            
            if (scanUserBtn.classList.contains('active')) {
                userSearchInput.placeholder = 'Scansiona tessera utente...';
                userSearchInput.focus();
            } else {
                userSearchInput.placeholder = 'Cerca utente per nome o classe...';
            }
        } else {
            scanBookBtn.classList.toggle('active');
            scanUserBtn.classList.remove('active');
            
            if (scanBookBtn.classList.contains('active')) {
                bookSearchInput.placeholder = 'Scansiona codice libro...';
                bookSearchInput.focus();
            } else {
                bookSearchInput.placeholder = 'Cerca libro per titolo o ISBN...';
            }
        }
    }
    
    /**
     * Processa un codice a barre di un utente
     * @param {string} barcode - Codice a barre
     */
    function processBarcodeUser(barcode) {
        fetch(`/api/utente/${barcode}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showMessage('Utente non trovato. Verifica il codice.', 'warning');
                    return;
                }
                
                // Seleziona l'utente
                selectUser(data.id, `${data.nome} ${data.cognome}`, data.classe);
                
                // Focus sul campo successivo
                if (bookSearchInput) {
                    bookSearchInput.focus();
                }
            })
            .catch(error => {
                console.error('Errore nella ricerca utente:', error);
                showMessage('Errore durante la ricerca. Riprova più tardi.', 'danger');
            });
    }
    
    /**
     * Processa un codice a barre di un libro
     * @param {string} barcode - Codice a barre o ISBN
     */
    function processBarcodeBook(barcode) {
        fetch(`/api/libro/${barcode}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showMessage('Libro non trovato. Verifica il codice.', 'warning');
                    return;
                }
                
                // Verifica se il libro è disponibile
                if (!data.disponibile) {
                    showMessage('Questo libro non è disponibile per il prestito.', 'warning');
                    return;
                }
                
                // Seleziona il libro
                selectBook(data.id, data.titolo, data.autore || '');
            })
            .catch(error => {
                console.error('Errore nella ricerca libro:', error);
                showMessage('Errore durante la ricerca. Riprova più tardi.', 'danger');
            });
    }
    
    /**
     * Prova a processare un codice a barre sia come utente che come libro
     * @param {string} barcode - Codice a barre
     */
    function processBarcodeAuto(barcode) {
        // Prova prima come utente
        fetch(`/api/utente/${barcode}`)
            .then(response => response.json())
            .then(data => {
                if (!data.error) {
                    // È un utente
                    selectUser(data.id, `${data.nome} ${data.cognome}`, data.classe);
                    
                    // Focus sul campo del libro
                    if (bookSearchInput) {
                        bookSearchInput.focus();
                    }
                    return;
                }
                
                // Non è un utente, prova come libro
                return fetch(`/api/libro/${barcode}`)
                    .then(response => response.json())
                    .then(bookData => {
                        if (bookData.error) {
                            showMessage('Codice non riconosciuto.', 'warning');
                            return;
                        }
                        
                        // Verifica se il libro è disponibile
                        if (!bookData.disponibile) {
                            showMessage('Questo libro non è disponibile per il prestito.', 'warning');
                            return;
                        }
                        
                        // Seleziona il libro
                        selectBook(bookData.id, bookData.titolo, bookData.autore || '');
                    });
            })
            .catch(error => {
                console.error('Errore nella scansione:', error);
                showMessage('Errore durante la ricerca. Riprova più tardi.', 'danger');
            });
    }
    
    /**
     * Ricerca utenti per nome, cognome o classe
     * @param {string} query - Termine di ricerca
     */
    function searchUsers(query) {
        // In un'applicazione reale, questa sarebbe una chiamata API
        // Per semplicità, supponiamo di avere una lista di utenti nel DOM
        const userList = document.querySelectorAll('#user-list option');
        userResults.innerHTML = '';
        
        let found = false;
        userList.forEach(option => {
            const text = option.textContent.toLowerCase();
            const value = option.value;
            
            if (text.includes(query.toLowerCase())) {
                found = true;
                const div = document.createElement('div');
                div.className = 'list-group-item list-group-item-action';
                div.innerHTML = option.textContent;
                div.addEventListener('click', () => {
                    const parts = option.textContent.split(' - ');
                    selectUser(value, parts[0], parts[1] || '');
                });
                userResults.appendChild(div);
            }
        });
        
        if (!found) {
            userResults.innerHTML = '<div class="list-group-item">Nessun utente trovato</div>';
        }
    }
    
    /**
     * Ricerca libri per titolo o ISBN
     * @param {string} query - Termine di ricerca
     */
    function searchBooks(query) {
        // In un'applicazione reale, questa sarebbe una chiamata API
        // Per semplicità, supponiamo di avere una lista di libri nel DOM
        const bookList = document.querySelectorAll('#book-list option');
        bookResults.innerHTML = '';
        
        let found = false;
        bookList.forEach(option => {
            const text = option.textContent.toLowerCase();
            const value = option.value;
            
            if (text.includes(query.toLowerCase())) {
                found = true;
                const div = document.createElement('div');
                div.className = 'list-group-item list-group-item-action';
                div.innerHTML = option.textContent;
                div.addEventListener('click', () => {
                    const parts = option.textContent.split(' - ');
                    selectBook(value, parts[0], parts[1] || '');
                });
                bookResults.appendChild(div);
            }
        });
        
        if (!found) {
            bookResults.innerHTML = '<div class="list-group-item">Nessun libro trovato</div>';
        }
    }
    
    /**
     * Seleziona un utente
     * @param {string} id - ID dell'utente
     * @param {string} name - Nome completo
     * @param {string} classe - Classe
     */
    function selectUser(id, name, classe) {
        if (selectedUserId) selectedUserId.value = id;
        
        if (selectedUserInfo) {
            selectedUserInfo.innerHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">${name}</h5>
                        <p class="card-text">${classe}</p>
                    </div>
                </div>
            `;
            selectedUserInfo.style.display = 'block';
        }
        
        // Pulisci il campo di ricerca e i risultati
        if (userSearchInput) userSearchInput.value = '';
        if (userResults) userResults.innerHTML = '';
    }
    
    /**
     * Seleziona un libro
     * @param {string} id - ID del libro
     * @param {string} title - Titolo
     * @param {string} author - Autore
     */
    function selectBook(id, title, author) {
        if (selectedBookId) selectedBookId.value = id;
        
        if (selectedBookInfo) {
            selectedBookInfo.innerHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">${title}</h5>
                        <p class="card-text">${author}</p>
                    </div>
                </div>
            `;
            selectedBookInfo.style.display = 'block';
        }
        
        // Pulisci il campo di ricerca e i risultati
        if (bookSearchInput) bookSearchInput.value = '';
        if (bookResults) bookResults.innerHTML = '';
    }
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
