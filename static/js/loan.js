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
    
    // Aggiunge un alert con tutte le informazioni di debug relative al barcode
    function debugBarcode(barcode) {
        console.log('DEBUG: Codice barcode rilevato:', barcode);
        
        // Aggiungi un campo di input nascosto per mantenere il barcode per debug
        let debugInput = document.getElementById('debug-barcode');
        if (!debugInput) {
            debugInput = document.createElement('input');
            debugInput.type = 'hidden';
            debugInput.id = 'debug-barcode';
            document.body.appendChild(debugInput);
        }
        debugInput.value = barcode;
    }
    
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
                // Debug barcode
                debugBarcode(barcodeBuffer);
                
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
        // Mostra un messaggio di caricamento
        showMessage('Ricerca utente con barcode in corso...', 'info');
        
        // Prima prova con l'API di ricerca diretta per barcode
        fetch(`/api/search/utente-barcode?barcode=${encodeURIComponent(barcode)}`)
            .then(response => {
                if (!response.ok && response.status !== 404) {
                    throw new Error(`Errore HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.id) {
                    // Abbiamo trovato l'utente con l'API diretta
                    showMessage(`Barcode riconosciuto come utente: ${data.nome} ${data.cognome}`, 'success');
                    
                    // Seleziona l'utente
                    selectUser(data.id, `${data.nome} ${data.cognome}`, data.classe);
                    
                    // Focus sul campo successivo
                    if (bookSearchInput) {
                        bookSearchInput.focus();
                    }
                    return;
                }
                
                // Se non trovato con l'API diretta, prova con l'API di ricerca generale
                return fetch(`/api/search/utenti?barcode=${encodeURIComponent(barcode)}`)
                    .then(response => response.json())
                    .then(users => {
                        if (users && users.length > 0) {
                            const user = users[0]; // Prendi il primo utente trovato
                            showMessage(`Barcode riconosciuto come utente: ${user.nome} ${user.cognome}`, 'success');
                            
                            // Seleziona l'utente
                            selectUser(user.id, `${user.nome} ${user.cognome}`, user.classe);
                            
                            // Focus sul campo successivo
                            if (bookSearchInput) {
                                bookSearchInput.focus();
                            }
                            return;
                        }
                        
                        // Se non è stato trovato nessun utente
                        showMessage(`Utente non trovato con barcode ${barcode}. Verifica il codice della tessera.`, 'warning');
                    });
            })
            .catch(error => {
                console.error('Errore nella ricerca utente:', error);
                showMessage(`Errore durante la ricerca con barcode ${barcode}. Riprova più tardi.`, 'danger');
            });
    }
    
    /**
     * Processa un codice a barre di un libro
     * @param {string} barcode - Codice a barre o ISBN
     */
    function processBarcodeBook(barcode) {
        // Mostra un messaggio di caricamento
        showMessage('Ricerca libro con barcode in corso...', 'info');
        
        // Prima prova la ricerca con l'API dedicata per barcode
        fetch(`/api/search/libro-barcode?barcode=${encodeURIComponent(barcode)}`)
            .then(response => {
                if (!response.ok && response.status !== 404) {
                    throw new Error(`Errore HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && !data.error && data.id) {
                    // Verifica se il libro è disponibile
                    if (!data.disponibile) {
                        showMessage(`Libro "${data.titolo}" trovato ma non disponibile per il prestito.`, 'warning');
                        return;
                    }
                    
                    // Mostra un messaggio di successo
                    showMessage(`Barcode riconosciuto come libro: ${data.titolo}`, 'success');
                    
                    // Seleziona il libro
                    selectBook(data.id, data.titolo, data.autore || '');
                    return;
                }
                
                // Fallback all'API di ricerca libri generale
                return fetch(`/api/search/libri?barcode=${encodeURIComponent(barcode)}`)
                    .then(response => response.json())
                    .then(books => {
                        if (books && books.length > 0) {
                            const book = books[0]; // Prendi il primo libro trovato
                            showMessage(`Barcode riconosciuto come libro: ${book.titolo}`, 'success');
                            
                            // Seleziona il libro
                            selectBook(book.id, book.titolo, book.autore || '');
                            return;
                        }
                        
                        // Fallback all'API originale se le altre non hanno trovato risultati
                        return fetch(`/api/libro/${barcode}`)
                            .then(response => response.json())
                            .then(oldData => {
                                if (oldData.error) {
                                    showMessage(`Libro non trovato con codice ${barcode}. Verifica il codice.`, 'warning');
                                    return;
                                }
                                
                                // Verifica se il libro è disponibile
                                if (!oldData.disponibile) {
                                    showMessage(`Libro "${oldData.titolo}" trovato ma non disponibile per il prestito.`, 'warning');
                                    return;
                                }
                                
                                // Mostra un messaggio di successo
                                showMessage(`Barcode riconosciuto come libro: ${oldData.titolo}`, 'success');
                                
                                // Seleziona il libro
                                selectBook(oldData.id, oldData.titolo, oldData.autore || '');
                            });
                    });
            })
            .catch(error => {
                console.error('Errore nella ricerca libro:', error);
                showMessage(`Errore durante la ricerca con barcode ${barcode}. Riprova più tardi.`, 'danger');
            });
    }
    
    /**
     * Prova a processare un codice a barre sia come utente che come libro
     * @param {string} barcode - Codice a barre
     */
    function processBarcodeAuto(barcode) {
        // Mostra un messaggio di caricamento
        showMessage('Scansione codice a barre in corso...', 'info');
        
        // Prova prima come utente con l'API di ricerca generale - Nuova implementazione prioritaria
        fetch(`/api/search/utenti?barcode=${encodeURIComponent(barcode)}`)
            .then(response => response.json())
            .then(users => {
                if (users && users.length > 0) {
                    // È un utente trovato dalla ricerca generale
                    const user = users[0];
                    showMessage(`Barcode riconosciuto come utente: ${user.nome} ${user.cognome}`, 'success');
                    selectUser(user.id, `${user.nome} ${user.cognome}`, user.classe);
                    
                    // Focus sul campo del libro
                    if (bookSearchInput) {
                        bookSearchInput.focus();
                    }
                    return;
                }
                
                // Fallback: Prova con l'API di ricerca utente specifica
                return fetch(`/api/search/utente-barcode?barcode=${encodeURIComponent(barcode)}`)
                    .then(response => {
                        if (!response.ok && response.status !== 404) {
                            throw new Error(`Errore HTTP: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (data && data.id) {
                            // È un utente trovato con l'API diretta
                            showMessage(`Barcode riconosciuto come utente: ${data.nome} ${data.cognome}`, 'success');
                            selectUser(data.id, `${data.nome} ${data.cognome}`, data.classe);
                            
                            // Focus sul campo del libro
                            if (bookSearchInput) {
                                bookSearchInput.focus();
                            }
                            return;
                        }
                        
                        // Non è un utente, prova come libro con la nuova API di ricerca per barcode
                        return fetch(`/api/search/libro-barcode?barcode=${encodeURIComponent(barcode)}`)
                            .then(response => {
                                if (!response.ok && response.status !== 404) {
                                    throw new Error(`Errore HTTP: ${response.status}`);
                                }
                                return response.json();
                            })
                            .then(bookData => {
                                if (bookData && !bookData.error && bookData.id) {
                                    // Verifica se il libro è disponibile
                                    if (!bookData.disponibile) {
                                        showMessage(`Libro trovato ma non disponibile: ${bookData.titolo}`, 'warning');
                                        return;
                                    }
                                    
                                    // Seleziona il libro
                                    showMessage(`Barcode riconosciuto come libro: ${bookData.titolo}`, 'success');
                                    selectBook(bookData.id, bookData.titolo, bookData.autore || '');
                                    return;
                                }
                                
                                // Prova con l'API di ricerca libri generale
                                return fetch(`/api/search/libri?barcode=${encodeURIComponent(barcode)}`)
                                    .then(response => response.json())
                                    .then(books => {
                                        if (books && books.length > 0) {
                                            const book = books[0]; // Prendi il primo libro trovato
                                            showMessage(`Barcode riconosciuto come libro: ${book.titolo}`, 'success');
                                            
                                            // Seleziona il libro
                                            selectBook(book.id, book.titolo, book.autore || '');
                                            return;
                                        }
                                        
                                        // Fallback all'API originale se le altre non hanno trovato risultati
                                        return fetch(`/api/libro/${barcode}`)
                                            .then(response => response.json())
                                            .then(oldData => {
                                                if (oldData.error) {
                                                    showMessage(`Codice ${barcode} non riconosciuto come utente né come libro.`, 'warning');
                                                    return;
                                                }
                                                
                                                // Verifica se il libro è disponibile
                                                if (!oldData.disponibile) {
                                                    showMessage(`Libro trovato ma non disponibile: ${oldData.titolo}`, 'warning');
                                                    return;
                                                }
                                                
                                                // Seleziona il libro
                                                showMessage(`Barcode riconosciuto come libro: ${oldData.titolo}`, 'success');
                                                selectBook(oldData.id, oldData.titolo, oldData.autore || '');
                                            });
                                    });
                            });
                    });
            })
            .catch(error => {
                console.error('Errore nella scansione:', error);
                showMessage(`Errore durante la scansione del codice ${barcode}. Riprova più tardi.`, 'danger');
            });
    }
    
    /**
     * Ricerca utenti per nome, cognome o classe
     * @param {string} query - Termine di ricerca
     */
    function searchUsers(query) {
        // Se sembra un barcode (solo numeri e lungo 13 caratteri)
        if (/^\d+$/.test(query) && query.length >= 12) {
            // Prova a cercarlo come barcode
            processBarcodeUser(query);
            return;
        }
        
        // Mostra un indicatore di caricamento
        userResults.innerHTML = '<div class="list-group-item text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> Ricerca in corso...</div>';
        
        // Chiamata all'API di ricerca utenti
        fetch(`/api/search/utenti?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                userResults.innerHTML = '';
                
                if (data.length === 0) {
                    userResults.innerHTML = '<div class="list-group-item text-center">Nessun utente trovato</div>';
                    return;
                }
                
                // Crea un elemento per ciascun utente trovato
                data.forEach(user => {
                    const div = document.createElement('div');
                    div.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
                    
                    const userInfo = document.createElement('div');
                    userInfo.innerHTML = `<strong>${user.nome} ${user.cognome}</strong>`;
                    if (user.classe) {
                        userInfo.innerHTML += `<br><small>Classe: ${user.classe}</small>`;
                    }
                    if (user.barcode) {
                        userInfo.innerHTML += `<br><small class="text-muted">Barcode: ${user.barcode}</small>`;
                    }
                    div.appendChild(userInfo);
                    
                    // Bottone per selezionare l'utente
                    const selectBtn = document.createElement('button');
                    selectBtn.className = 'btn btn-sm btn-primary';
                    selectBtn.innerHTML = '<i class="fas fa-check"></i>';
                    selectBtn.title = 'Seleziona utente';
                    selectBtn.addEventListener('click', () => {
                        selectUser(user.id, `${user.nome} ${user.cognome}`, user.classe || '');
                    });
                    div.appendChild(selectBtn);
                    
                    // Al click sull'intero div, seleziona l'utente
                    div.addEventListener('click', () => {
                        selectUser(user.id, `${user.nome} ${user.cognome}`, user.classe || '');
                    });
                    
                    userResults.appendChild(div);
                });
            })
            .catch(error => {
                console.error('Errore durante la ricerca utenti:', error);
                userResults.innerHTML = '<div class="list-group-item text-danger">Errore durante la ricerca</div>';
            });
    }
    
    /**
     * Ricerca libri per titolo o ISBN
     * @param {string} query - Termine di ricerca
     */
    function searchBooks(query) {
        // Se sembra un ISBN o barcode (solo numeri e lungo)
        if (/^\d+$/.test(query) && query.length >= 10) {
            // Prova a cercarlo come ISBN/barcode
            processBarcodeBook(query);
            return;
        }
        
        // Mostra un indicatore di caricamento
        bookResults.innerHTML = '<div class="list-group-item text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> Ricerca in corso...</div>';
        
        // Chiamata all'API di ricerca libri
        fetch(`/api/search/libri?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                bookResults.innerHTML = '';
                
                if (data.length === 0) {
                    bookResults.innerHTML = '<div class="list-group-item text-center">Nessun libro trovato</div>';
                    return;
                }
                
                // Crea un elemento per ciascun libro trovato
                data.forEach(book => {
                    const div = document.createElement('div');
                    div.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
                    
                    const bookInfo = document.createElement('div');
                    bookInfo.innerHTML = `<strong>${book.titolo}</strong>`;
                    if (book.autore) {
                        bookInfo.innerHTML += `<br><small>${book.autore}</small>`;
                    }
                    if (book.isbn) {
                        bookInfo.innerHTML += `<br><small class="text-muted">ISBN: ${book.isbn}</small>`;
                    }
                    div.appendChild(bookInfo);
                    
                    // Bottone per selezionare il libro
                    const selectBtn = document.createElement('button');
                    selectBtn.className = 'btn btn-sm btn-primary';
                    selectBtn.innerHTML = '<i class="fas fa-check"></i>';
                    selectBtn.title = 'Seleziona libro';
                    selectBtn.addEventListener('click', () => {
                        selectBook(book.id, book.titolo, book.autore || '');
                    });
                    div.appendChild(selectBtn);
                    
                    // Al click sull'intero div, seleziona il libro
                    div.addEventListener('click', () => {
                        selectBook(book.id, book.titolo, book.autore || '');
                    });
                    
                    bookResults.appendChild(div);
                });
            })
            .catch(error => {
                console.error('Errore durante la ricerca libri:', error);
                bookResults.innerHTML = '<div class="list-group-item text-danger">Errore durante la ricerca</div>';
            });
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
                
                // Aggiorna il campo di ricerca con il nome dell'utente selezionato
                if (userSearchInput) {
                    userSearchInput.value = name;
                    userSearchInput.setAttribute('data-selected-id', id);
                    userSearchInput.setAttribute('data-selected-name', name);
                    // Aggiungi una classe che indica che il campo contiene un valore selezionato
                    userSearchInput.classList.add('has-selected-value');
                }
                
                if (selectedUserInfo) {
                    selectedUserInfo.innerHTML = `
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h5 class="card-title">${name}</h5>
                                        <p class="card-text mb-0">${classe || ''}</p>
                                        ${data.barcode ? `<small class="text-muted">Barcode: ${data.barcode}</small>` : ''}
                                    </div>
                                    <span class="badge bg-success">Utente Selezionato</span>
                                </div>
                            </div>
                        </div>
                    `;
                    selectedUserInfo.style.display = 'block';
                }
                
                // Mostra un messaggio di conferma
                showMessage(`Utente "${name}" selezionato con successo!`, 'success');
            })
            .catch(error => {
                console.error('Errore nel recupero dettagli utente:', error);
                // Usa comunque i dati di base se non è possibile recuperare i dettagli
                if (userSearchInput) {
                    userSearchInput.value = name;
                    userSearchInput.setAttribute('data-selected-id', id);
                    userSearchInput.setAttribute('data-selected-name', name);
                    userSearchInput.classList.add('has-selected-value');
                }
                
                if (selectedUserInfo) {
                    selectedUserInfo.innerHTML = `
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h5 class="card-title">${name}</h5>
                                        <p class="card-text">${classe || ''}</p>
                                    </div>
                                    <span class="badge bg-success">Utente Selezionato</span>
                                </div>
                            </div>
                        </div>
                    `;
                    selectedUserInfo.style.display = 'block';
                }
                
                // Mostra un messaggio di conferma
                showMessage(`Utente "${name}" selezionato con successo!`, 'success');
            });
        
        // Pulisci i risultati
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
                
                // Aggiorna il campo di ricerca con il titolo del libro selezionato
                if (bookSearchInput) {
                    bookSearchInput.value = title;
                    bookSearchInput.setAttribute('data-selected-id', id);
                    bookSearchInput.setAttribute('data-selected-title', title);
                    // Aggiungi una classe che indica che il campo contiene un valore selezionato
                    bookSearchInput.classList.add('has-selected-value');
                }
                
                if (selectedBookInfo) {
                    selectedBookInfo.innerHTML = `
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h5 class="card-title">${title}</h5>
                                        <p class="card-text mb-0">${author || ''}</p>
                                        ${data.isbn ? `<small class="text-muted">ISBN: ${data.isbn}</small>` : ''}
                                    </div>
                                    <span class="badge bg-success">Libro Selezionato</span>
                                </div>
                            </div>
                        </div>
                    `;
                    selectedBookInfo.style.display = 'block';
                }
                
                // Mostra un messaggio di conferma
                showMessage(`Libro "${title}" selezionato con successo!`, 'success');
            })
            .catch(error => {
                console.error('Errore nel recupero dettagli libro:', error);
                // Usa comunque i dati di base se non è possibile recuperare i dettagli
                if (bookSearchInput) {
                    bookSearchInput.value = title;
                    bookSearchInput.setAttribute('data-selected-id', id);
                    bookSearchInput.setAttribute('data-selected-title', title);
                    bookSearchInput.classList.add('has-selected-value');
                }
                
                if (selectedBookInfo) {
                    selectedBookInfo.innerHTML = `
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h5 class="card-title">${title}</h5>
                                        <p class="card-text">${author || ''}</p>
                                    </div>
                                    <span class="badge bg-success">Libro Selezionato</span>
                                </div>
                            </div>
                        </div>
                    `;
                    selectedBookInfo.style.display = 'block';
                }
                
                // Mostra un messaggio di conferma
                showMessage(`Libro "${title}" selezionato con successo!`, 'success');
            });
        
        // Pulisci i risultati
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
