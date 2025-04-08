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
    
    // Elementi per anteprima prestito
    const previewLoanBtn = document.getElementById('preview-loan-btn');
    const loanPreviewContainer = document.getElementById('loan-preview-container');
    const previewUserDetails = document.getElementById('preview-user-details');
    const previewBookDetails = document.getElementById('preview-book-details');
    const previewLoanDuration = document.getElementById('preview-loan-duration');
    const previewReturnDate = document.getElementById('preview-return-date');
    const previewLoanNotes = document.getElementById('preview-loan-notes');
    const saveLoanBtn = document.getElementById('save-loan-btn');
    
    // Dati utente e libro selezionati
    let selectedUserData = null;
    let selectedBookData = null;
    
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
    
    // Event listener per il pulsante di anteprima
    if (previewLoanBtn) {
        previewLoanBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showLoanPreview();
        });
    }
    
    // Event listener per il pulsante di salvataggio
    if (saveLoanBtn) {
        saveLoanBtn.addEventListener('click', function(e) {
            // Prima di inviare il form, verifica che tutti i dati necessari siano presenti
            if (!selectedUserId.value || !selectedBookId.value) {
                e.preventDefault();
                showMessage('Seleziona sia un utente che un libro prima di salvare il prestito', 'warning');
                return false;
            }
            
            // Se l'anteprima non è visibile, mostrala prima di procedere
            if (loanPreviewContainer && loanPreviewContainer.style.display === 'none') {
                e.preventDefault();
                if (showLoanPreview()) {
                    showMessage('Verifica i dati nell\'anteprima e clicca nuovamente su "Registra Prestito"', 'info');
                }
                return false;
            }
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
        
        // Ottieni dati completi dell'utente
        fetch(`/api/utente/dettaglio/${id}`)
            .then(response => response.json())
            .then(data => {
                // Salva i dati completi dell'utente
                selectedUserData = data;
                
                if (selectedUserInfo) {
                    selectedUserInfo.innerHTML = `
                        <div class="card mb-3">
                            <div class="card-body">
                                <h5 class="card-title">${name}</h5>
                                <p class="card-text">${classe || ''}</p>
                            </div>
                        </div>
                    `;
                    selectedUserInfo.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Errore nel recupero dettagli utente:', error);
                // Usa comunque i dati di base se non è possibile recuperare i dettagli
                if (selectedUserInfo) {
                    selectedUserInfo.innerHTML = `
                        <div class="card mb-3">
                            <div class="card-body">
                                <h5 class="card-title">${name}</h5>
                                <p class="card-text">${classe || ''}</p>
                            </div>
                        </div>
                    `;
                    selectedUserInfo.style.display = 'block';
                }
            });
        
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
        
        // Ottieni dati completi del libro
        fetch(`/api/libro/dettaglio/${id}`)
            .then(response => response.json())
            .then(data => {
                // Salva i dati completi del libro
                selectedBookData = data;
                
                if (selectedBookInfo) {
                    selectedBookInfo.innerHTML = `
                        <div class="card mb-3">
                            <div class="card-body">
                                <h5 class="card-title">${title}</h5>
                                <p class="card-text">${author || ''}</p>
                            </div>
                        </div>
                    `;
                    selectedBookInfo.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Errore nel recupero dettagli libro:', error);
                // Usa comunque i dati di base se non è possibile recuperare i dettagli
                if (selectedBookInfo) {
                    selectedBookInfo.innerHTML = `
                        <div class="card mb-3">
                            <div class="card-body">
                                <h5 class="card-title">${title}</h5>
                                <p class="card-text">${author || ''}</p>
                            </div>
                        </div>
                    `;
                    selectedBookInfo.style.display = 'block';
                }
            });
        
        // Pulisci il campo di ricerca e i risultati
        if (bookSearchInput) bookSearchInput.value = '';
        if (bookResults) bookResults.innerHTML = '';
    }
    
    /**
     * Mostra l'anteprima del prestito
     */
    function showLoanPreview() {
        // Verifica se utente e libro sono stati selezionati
        if (!selectedUserId.value || !selectedBookId.value) {
            showMessage('Seleziona sia un utente che un libro prima di procedere', 'warning');
            return false;
        }
        
        // Recupera durata prestito e note
        const loanDuration = document.getElementById('giorni_prestito').value;
        const loanNotes = document.getElementById('nota').value;
        
        // Calcola data restituzione prevista
        const today = new Date();
        const returnDate = new Date();
        returnDate.setDate(today.getDate() + parseInt(loanDuration));
        const formattedReturnDate = returnDate.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        // Ottieni i nomi utente e libro dai dati salvati o dalle card
        let userName = '';
        let userClass = '';
        let userInfo = '';
        
        if (selectedUserData) {
            userName = `${selectedUserData.nome} ${selectedUserData.cognome}`;
            userClass = selectedUserData.classe || '';
            userInfo = `
                <p><strong>Nome:</strong> ${userName}</p>
                <p><strong>Classe:</strong> ${userClass}</p>
                <p><strong>Email:</strong> ${selectedUserData.email || ''}</p>
                <p><strong>Barcode:</strong> ${selectedUserData.barcode || ''}</p>
            `;
        } else {
            const userCard = document.querySelector('#selected-user-info .card-title');
            const userClassElem = document.querySelector('#selected-user-info .card-text');
            if (userCard) userName = userCard.textContent;
            if (userClassElem) userClass = userClassElem.textContent;
            userInfo = `
                <p><strong>Nome:</strong> ${userName}</p>
                <p><strong>Classe:</strong> ${userClass}</p>
            `;
        }
        
        let bookTitle = '';
        let bookAuthor = '';
        let bookInfo = '';
        
        if (selectedBookData) {
            bookTitle = selectedBookData.titolo;
            bookAuthor = selectedBookData.autore || '';
            bookInfo = `
                <p><strong>Titolo:</strong> ${bookTitle}</p>
                <p><strong>Autore:</strong> ${bookAuthor}</p>
                <p><strong>Editore:</strong> ${selectedBookData.editore || ''}</p>
                <p><strong>ISBN:</strong> ${selectedBookData.isbn || ''}</p>
            `;
        } else {
            const bookCard = document.querySelector('#selected-book-info .card-title');
            const bookAuthorElem = document.querySelector('#selected-book-info .card-text');
            if (bookCard) bookTitle = bookCard.textContent;
            if (bookAuthorElem) bookAuthor = bookAuthorElem.textContent;
            bookInfo = `
                <p><strong>Titolo:</strong> ${bookTitle}</p>
                <p><strong>Autore:</strong> ${bookAuthor}</p>
            `;
        }
        
        // Aggiorna l'anteprima
        previewUserDetails.innerHTML = userInfo;
        previewBookDetails.innerHTML = bookInfo;
        previewLoanDuration.textContent = loanDuration;
        previewReturnDate.textContent = formattedReturnDate;
        previewLoanNotes.textContent = loanNotes || '-';
        
        // Mostra il container dell'anteprima
        loanPreviewContainer.style.display = 'block';
        
        // Scorri alla sezione di anteprima
        loanPreviewContainer.scrollIntoView({ behavior: 'smooth' });
        
        return true;
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
