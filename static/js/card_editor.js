/**
 * Editore di tessere utente - Versione avanzata
 * Supporta: trascinamento, rotazione, ridimensionamento, caricamento immagini personalizzate
 * e personalizzazione del barcode EAN13
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elementi DOM
    const cardEditor = document.getElementById('card-editor');
    
    // Se l'editor non esiste, esci
    if (!cardEditor) return;
    
    // Carica i modelli di tessera
    initCardEditor();
    
    // Elementi dell'editor
    const cardContainer = document.getElementById('card-container');
    const templateSelector = document.getElementById('template-selector');
    const saveTemplateBtn = document.getElementById('save-template');
    const printCardBtn = document.getElementById('print-card');
    const newTemplateBtn = document.getElementById('new-template');
    const templateNameInput = document.getElementById('template-name');
    const defaultTemplateCheck = document.getElementById('default-template');
    
    // Elementi per il caricamento di immagini
    const imageDropzone = document.getElementById('imageDropzone');
    const imageUpload = document.getElementById('imageUpload');
    const addCustomImageBtn = document.getElementById('addCustomImage');
    let uploadedImageData = null;

    // Configura il caricamento delle immagini
    if (imageDropzone && imageUpload) {
        // Event listener per il click sulla dropzone
        imageDropzone.addEventListener('click', function() {
            imageUpload.click();
        });

        // Event listener per il drag and drop
        imageDropzone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });

        imageDropzone.addEventListener('dragleave', function() {
            this.classList.remove('dragover');
        });

        imageDropzone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            
            if (e.dataTransfer.files.length) {
                handleImageUpload(e.dataTransfer.files[0]);
            }
        });

        // Event listener per la selezione del file
        imageUpload.addEventListener('change', function() {
            if (this.files.length) {
                handleImageUpload(this.files[0]);
            }
        });

        // Aggiungi immagine alla tessera
        if (addCustomImageBtn) {
            addCustomImageBtn.addEventListener('click', function() {
                if (uploadedImageData) {
                    addCustomImageToCard(uploadedImageData);
                    // Chiudi la modale
                    const modal = bootstrap.Modal.getInstance(document.getElementById('customImageModal'));
                    if (modal) modal.hide();
                }
            });
        }
    }
    
    // Event listener per il cambio di modello
    if (templateSelector) {
        templateSelector.addEventListener('change', function() {
            loadTemplate(this.value);
        });
    }
    
    // Event listener per il salvataggio del modello
    if (saveTemplateBtn) {
        saveTemplateBtn.addEventListener('click', function() {
            saveTemplate();
        });
    }
    
    // Event listener per la stampa della tessera
    if (printCardBtn) {
        printCardBtn.addEventListener('click', function() {
            printCard();
        });
    }
    
    // Event listener per la creazione di un nuovo modello
    if (newTemplateBtn) {
        newTemplateBtn.addEventListener('click', function() {
            createNewTemplate();
        });
    }
    
    // Aggiungi gestione del click sul container per deselezionare tutto
    if (cardContainer) {
        cardContainer.addEventListener('click', function(e) {
            if (e.target === this) {
                // Deseleziona tutti gli elementi
                document.querySelectorAll('.card-element.selected').forEach(el => {
                    el.classList.remove('selected');
                });
                
                // Resetta il pannello delle proprietà
                const propertiesPanel = document.getElementById('properties-panel');
                if (propertiesPanel) {
                    propertiesPanel.innerHTML = `<p class="text-center text-muted my-5">
                        Seleziona un elemento sulla tessera per modificarne le proprietà
                    </p>`;
                }
            }
        });
    }
    
    // Gestione modale per caricamento immagini
    document.querySelectorAll('[data-bs-toggle="modal"]').forEach(button => {
        if (button.getAttribute('data-bs-target') === '#customImageModal') {
            button.addEventListener('click', function() {
                // Resetta lo stato della modale
                const imagePreview = document.getElementById('imagePreview');
                const previewImage = document.getElementById('previewImage');
                const addCustomImageBtn = document.getElementById('addCustomImage');
                
                if (imagePreview) imagePreview.classList.add('d-none');
                if (previewImage) previewImage.src = '';
                if (addCustomImageBtn) addCustomImageBtn.disabled = true;
                uploadedImageData = null;
            });
        }
    });
});

/**
 * Gestisce il caricamento di un'immagine
 * @param {File} file - File immagine caricato
 */
function handleImageUpload(file) {
    // Verifica se è un'immagine
    if (!file.type.match('image.*')) {
        showMessage('Per favore, seleziona un file immagine valido (JPG, PNG, SVG)', 'warning');
        return;
    }
    
    // Verifica la dimensione (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showMessage('L\'immagine è troppo grande. Seleziona un\'immagine fino a 2MB', 'warning');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        // Memorizza l'immagine caricata
        uploadedImageData = e.target.result;
        
        // Mostra l'anteprima
        const imagePreview = document.getElementById('imagePreview');
        const previewImage = document.getElementById('previewImage');
        const addCustomImageBtn = document.getElementById('addCustomImage');
        
        if (imagePreview) imagePreview.classList.remove('d-none');
        if (previewImage) previewImage.src = uploadedImageData;
        if (addCustomImageBtn) addCustomImageBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

/**
 * Aggiunge un'immagine personalizzata alla tessera
 * @param {string} imageData - Immagine in formato base64
 */
function addCustomImageToCard(imageData) {
    addCardElement('customImage', {
        src: imageData,
        width: 100,
        height: 100,
        x: 20,
        y: 20
    });
    
    // Salva lo stato
    saveCardState();
    
    // Mostra un messaggio di conferma
    showMessage('Immagine aggiunta alla tessera', 'success');
}

/**
 * Inizializza l'editore di tessere
 */
function initCardEditor() {
    const cardContainer = document.getElementById('card-container');
    if (!cardContainer) return;
    
    // Carica il modello predefinito o crea uno nuovo
    loadTemplate();
    
    // Abilita l'interazione con gli elementi della tessera
    setupInteractJS();
}

/**
 * Configura la libreria interact.js per l'interazione drag-n-drop
 */
function setupInteractJS() {
    // Seleziona gli elementi trascinabili
    interact('.card-element').draggable({
        inertia: true,
        modifiers: [
            interact.modifiers.restrictRect({
                restriction: '#card-container',
                endOnly: true
            })
        ],
        autoScroll: true,
        listeners: {
            move: dragMoveListener,
            end: function (event) {
                // Salva lo stato quando termina il trascinamento
                saveCardState();
            }
        }
    }).resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        restrictEdges: {
            outer: '#card-container',
            endOnly: true
        },
        restrictSize: {
            min: { width: 30, height: 30 }
        },
        inertia: true,
        listeners: {
            move: resizeMoveListener,
            end: function (event) {
                // Salva lo stato quando termina il ridimensionamento
                saveCardState();
            }
        }
    });
    
    // Abilita la rotazione degli elementi (solo per logo e immagini)
    interact('.card-image').gesturable({
        listeners: {
            move: rotateElement
        }
    });
}

/**
 * Gestisce il movimento durante il trascinamento
 */
function dragMoveListener(event) {
    const target = event.target;
    
    // Mantieni le coordinate x e y dell'elemento
    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
    
    // Aggiorna la posizione dell'elemento
    target.style.transform = `translate(${x}px, ${y}px)`;
    
    // Memorizza le coordinate
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
}

/**
 * Gestisce il movimento durante il ridimensionamento
 */
function resizeMoveListener(event) {
    const target = event.target;
    const x = (parseFloat(target.getAttribute('data-x')) || 0);
    const y = (parseFloat(target.getAttribute('data-y')) || 0);
    
    // Aggiorna le dimensioni dell'elemento
    target.style.width = event.rect.width + 'px';
    target.style.height = event.rect.height + 'px';
    
    // Aggiorna la posizione se cambiano i bordi superiore/sinistro
    target.style.transform = `translate(${x + event.deltaRect.left}px, ${y + event.deltaRect.top}px)`;
    
    // Memorizza le nuove coordinate
    target.setAttribute('data-x', x + event.deltaRect.left);
    target.setAttribute('data-y', y + event.deltaRect.top);
}

/**
 * Gestisce la rotazione dell'elemento
 */
function rotateElement(event) {
    const target = event.target;
    const currentAngle = parseFloat(target.getAttribute('data-angle') || 0);
    
    // Aggiorna la rotazione
    const newAngle = currentAngle + event.da;
    target.style.transform = `translate(${target.getAttribute('data-x') || 0}px, ${target.getAttribute('data-y') || 0}px) rotate(${newAngle}deg)`;
    
    // Memorizza il nuovo angolo
    target.setAttribute('data-angle', newAngle);
}

/**
 * Carica un modello di tessera
 * @param {number} templateId - ID del modello da caricare
 */
function loadTemplate(templateId) {
    const cardContainer = document.getElementById('card-container');
    if (!cardContainer) return;
    
    // Se non è specificato un templateId, carica il modello predefinito
    if (!templateId) {
        // Controlla se c'è un elemento data-default-template
        const defaultTemplate = document.getElementById('card-editor').getAttribute('data-default-template');
        if (defaultTemplate) {
            templateId = defaultTemplate;
        } else {
            // Crea un modello base se non ce ne sono di predefiniti
            createDefaultTemplate();
            return;
        }
    }
    
    // Recupera il modello dal server
    fetch(`/api/modello-tessera/${templateId}`)
        .then(response => response.json())
        .then(template => {
            // Imposta il nome del modello ed eventuali altre proprietà
            document.getElementById('template-name').value = template.nome;
            document.getElementById('default-template').checked = template.predefinito;
            document.getElementById('template-id').value = template.id;
            
            // Pulisci il container
            cardContainer.innerHTML = '';
            
            // Ricostruisci gli elementi del modello
            if (template.contenuto) {
                const elements = Array.isArray(template.contenuto) ? template.contenuto : [template.contenuto];
                
                elements.forEach(element => {
                    addCardElement(element.type, element);
                });
            }
            
            // Riattiva l'interazione
            setupInteractJS();
        })
        .catch(error => {
            console.error('Errore durante il caricamento del modello:', error);
            showMessage('Errore durante il caricamento del modello', 'danger');
            createDefaultTemplate();
        });
}

/**
 * Crea un modello di tessera predefinito
 */
function createDefaultTemplate() {
    const cardContainer = document.getElementById('card-container');
    if (!cardContainer) return;
    
    // Pulisci il container
    cardContainer.innerHTML = '';
    
    // Aggiungi elementi predefiniti
    // Logo
    addCardElement('logo', {
        src: '/static/img/default_logo.svg',
        width: 100,
        height: 100,
        x: 20,
        y: 20
    });
    
    // Nome scuola
    addCardElement('text', {
        content: 'SCUOLA PRIMARIA',
        fontSize: 16,
        fontFamily: 'Arial',
        color: '#000000',
        x: 150,
        y: 30
    });
    
    // Nome utente
    addCardElement('text', {
        content: 'NOME UTENTE',
        fontSize: 20,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#000000',
        x: 150,
        y: 70
    });
    
    // Classe
    addCardElement('text', {
        content: 'CLASSE',
        fontSize: 16,
        fontFamily: 'Arial',
        color: '#000000',
        x: 150,
        y: 100
    });
    
    // Barcode
    addCardElement('barcode', {
        code: '2000000000000',
        width: 250,
        height: 80,
        x: 75,
        y: 150
    });
    
    // ID Tessera
    addCardElement('text', {
        content: 'ID: 00000',
        fontSize: 12,
        fontFamily: 'Arial',
        color: '#000000',
        x: 150,
        y: 240
    });
    
    // Imposta i campi del form
    document.getElementById('template-name').value = 'Modello predefinito';
    document.getElementById('default-template').checked = true;
    document.getElementById('template-id').value = '';
    
    // Riattiva l'interazione
    setupInteractJS();
}

/**
 * Aggiunge un elemento alla tessera
 * @param {string} type - Tipo di elemento (text, logo, barcode)
 * @param {Object} properties - Proprietà dell'elemento
 */
function addCardElement(type, properties = {}) {
    const cardContainer = document.getElementById('card-container');
    if (!cardContainer) return;
    
    let element;
    
    switch (type) {
        case 'text':
            element = document.createElement('div');
            element.className = 'card-element card-text';
            element.textContent = properties.content || 'Testo';
            element.style.fontSize = (properties.fontSize || 16) + 'px';
            element.style.fontFamily = properties.fontFamily || 'Arial';
            element.style.fontWeight = properties.fontWeight || 'normal';
            element.style.color = properties.color || '#000000';
            element.setAttribute('data-type', 'text');
            break;
            
        case 'logo':
            element = document.createElement('img');
            element.className = 'card-element card-image';
            element.src = properties.src || '/static/img/default_logo.svg';
            element.style.width = (properties.width || 100) + 'px';
            element.style.height = (properties.height || 100) + 'px';
            element.setAttribute('data-type', 'logo');
            break;
            
        case 'barcode':
            element = document.createElement('svg');
            element.className = 'card-element card-barcode';
            element.style.width = (properties.width || 200) + 'px';
            element.style.height = (properties.height || 80) + 'px';
            element.setAttribute('data-type', 'barcode');
            element.setAttribute('data-code', properties.code || '0000000000000');
            
            // Estrai eventuali proprietà specifiche del barcode
            const barcodeOptions = {
                format: "EAN13",
                lineColor: properties.lineColor || "#000000",
                width: properties.barWidth || 2,
                height: properties.barHeight || 60,
                displayValue: properties.showText !== false,
                fontSize: properties.fontSize || 12,
                textMargin: properties.textMargin || 2,
                font: properties.font || "monospace",
                text: properties.text || undefined, // Testo personalizzato opzionale
                background: properties.background || "#ffffff",
                margin: properties.margin || 10
            };
            
            // Genera il codice a barre usando JsBarcode
            try {
                JsBarcode(element, properties.code || '0000000000000', barcodeOptions);
                
                // Aggiungi tooltip con il valore del barcode
                const tooltip = document.createElement('span');
                tooltip.className = 'card-element-tooltip';
                tooltip.textContent = 'Barcode: ' + (properties.code || '0000000000000');
                element.appendChild(tooltip);
            } catch (e) {
                console.error('Errore nella generazione del barcode:', e);
                // Fallback in caso di errore
                element.textContent = 'Errore barcode';
            }
            break;
            
        case 'customImage':
            element = document.createElement('img');
            element.className = 'card-element card-image';
            element.src = properties.src || '/static/img/default_logo.svg';
            element.style.width = (properties.width || 100) + 'px';
            element.style.height = (properties.height || 100) + 'px';
            element.setAttribute('data-type', 'customImage');
            
            // Aggiungi maniglia di rotazione per l'immagine
            const rotateHandle = document.createElement('div');
            rotateHandle.className = 'card-rotate-handle';
            rotateHandle.title = 'Trascina per ruotare';
            
            // Aggiungi tooltip
            const tooltip = document.createElement('span');
            tooltip.className = 'card-element-tooltip';
            tooltip.textContent = 'Immagine personalizzata';
            element.appendChild(tooltip);
            
            // Imposta gestione rotazione manuale se specificata
            if (properties.angle) {
                element.setAttribute('data-angle', properties.angle);
                // Aggiorna lo stile per includere la rotazione
                if (properties.x !== undefined && properties.y !== undefined) {
                    element.style.transform = `translate(${properties.x}px, ${properties.y}px) rotate(${properties.angle}deg)`;
                }
            }
            
            break;
            
        default:
            return;
    }
    
    // Imposta posizione se specificata
    if (properties.x !== undefined && properties.y !== undefined) {
        element.style.transform = `translate(${properties.x}px, ${properties.y}px)`;
        element.setAttribute('data-x', properties.x);
        element.setAttribute('data-y', properties.y);
    }
    
    // Imposta angolo se specificato
    if (properties.angle !== undefined) {
        element.style.transform += ` rotate(${properties.angle}deg)`;
        element.setAttribute('data-angle', properties.angle);
    }
    
    // Aggiungi l'elemento al container
    cardContainer.appendChild(element);
    
    // Al click seleziona l'elemento per la modifica
    element.addEventListener('click', function(e) {
        e.stopPropagation();
        selectElement(this);
    });
}

/**
 * Seleziona un elemento per la modifica
 * @param {HTMLElement} element - Elemento da selezionare
 */
function selectElement(element) {
    // Rimuovi la selezione dagli altri elementi
    document.querySelectorAll('.card-element.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Seleziona questo elemento
    element.classList.add('selected');
    
    // Mostra le proprietà nell'editor
    showElementProperties(element);
}

/**
 * Mostra le proprietà dell'elemento selezionato nell'editor
 * @param {HTMLElement} element - Elemento selezionato
 */
function showElementProperties(element) {
    const propertiesPanel = document.getElementById('properties-panel');
    if (!propertiesPanel) return;
    
    const type = element.getAttribute('data-type');
    
    // Pulisci il pannello delle proprietà
    propertiesPanel.innerHTML = '';
    
    // Proprietà diverse in base al tipo di elemento
    switch (type) {
        case 'text':
            propertiesPanel.innerHTML = `
                <div class="mb-3">
                    <label for="text-content" class="form-label">Testo</label>
                    <input type="text" class="form-control" id="text-content" value="${element.textContent}">
                </div>
                <div class="mb-3">
                    <label for="text-font-size" class="form-label">Dimensione (px)</label>
                    <input type="number" class="form-control" id="text-font-size" value="${parseInt(element.style.fontSize)}">
                </div>
                <div class="mb-3">
                    <label for="text-font-family" class="form-label">Font</label>
                    <select class="form-select" id="text-font-family">
                        <option value="Arial" ${element.style.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
                        <option value="Times New Roman" ${element.style.fontFamily === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
                        <option value="Courier New" ${element.style.fontFamily === 'Courier New' ? 'selected' : ''}>Courier New</option>
                        <option value="Georgia" ${element.style.fontFamily === 'Georgia' ? 'selected' : ''}>Georgia</option>
                        <option value="Verdana" ${element.style.fontFamily === 'Verdana' ? 'selected' : ''}>Verdana</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="text-font-weight" class="form-label">Stile</label>
                    <select class="form-select" id="text-font-weight">
                        <option value="normal" ${element.style.fontWeight === 'normal' ? 'selected' : ''}>Normale</option>
                        <option value="bold" ${element.style.fontWeight === 'bold' ? 'selected' : ''}>Grassetto</option>
                        <option value="italic" ${element.style.fontStyle === 'italic' ? 'selected' : ''}>Corsivo</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="text-color" class="form-label">Colore</label>
                    <input type="color" class="form-control" id="text-color" value="${element.style.color}">
                </div>
                <button class="btn btn-danger btn-sm" onclick="removeSelectedElement()">Rimuovi</button>
            `;
            
            // Event listener per aggiornare il testo in tempo reale
            document.getElementById('text-content').addEventListener('input', function() {
                element.textContent = this.value;
                saveCardState();
            });
            
            document.getElementById('text-font-size').addEventListener('input', function() {
                element.style.fontSize = this.value + 'px';
                saveCardState();
            });
            
            document.getElementById('text-font-family').addEventListener('change', function() {
                element.style.fontFamily = this.value;
                saveCardState();
            });
            
            document.getElementById('text-font-weight').addEventListener('change', function() {
                if (this.value === 'italic') {
                    element.style.fontWeight = 'normal';
                    element.style.fontStyle = 'italic';
                } else {
                    element.style.fontWeight = this.value;
                    element.style.fontStyle = 'normal';
                }
                saveCardState();
            });
            
            document.getElementById('text-color').addEventListener('input', function() {
                element.style.color = this.value;
                saveCardState();
            });
            break;
            
        case 'logo':
            propertiesPanel.innerHTML = `
                <div class="mb-3">
                    <label for="logo-url" class="form-label">URL Immagine</label>
                    <input type="text" class="form-control" id="logo-url" value="${element.src}">
                </div>
                <div class="mb-3">
                    <label for="logo-width" class="form-label">Larghezza (px)</label>
                    <input type="number" class="form-control" id="logo-width" value="${parseInt(element.style.width)}">
                </div>
                <div class="mb-3">
                    <label for="logo-height" class="form-label">Altezza (px)</label>
                    <input type="number" class="form-control" id="logo-height" value="${parseInt(element.style.height)}">
                </div>
                <div class="mb-3">
                    <label class="form-label">Carica immagine</label>
                    <input type="file" class="form-control" id="logo-upload" accept="image/*">
                </div>
                <button class="btn btn-danger btn-sm" onclick="removeSelectedElement()">Rimuovi</button>
            `;
            
            // Event listener per aggiornare l'immagine
            document.getElementById('logo-url').addEventListener('change', function() {
                element.src = this.value;
                saveCardState();
            });
            
            document.getElementById('logo-width').addEventListener('input', function() {
                element.style.width = this.value + 'px';
                saveCardState();
            });
            
            document.getElementById('logo-height').addEventListener('input', function() {
                element.style.height = this.value + 'px';
                saveCardState();
            });
            
            // Gestisci l'upload dell'immagine
            document.getElementById('logo-upload').addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        element.src = event.target.result;
                        document.getElementById('logo-url').value = event.target.result;
                        saveCardState();
                    };
                    reader.readAsDataURL(file);
                }
            });
            break;
            
        case 'barcode':
            propertiesPanel.innerHTML = `
                <div class="mb-3">
                    <label for="barcode-value" class="form-label">Codice EAN-13</label>
                    <input type="text" class="form-control" id="barcode-value" value="${element.getAttribute('data-code')}">
                    <small class="form-text text-muted">Inserisci 12-13 cifre, l'ultima sarà calcolata automaticamente</small>
                </div>
                <div class="mb-3">
                    <label for="barcode-width" class="form-label">Larghezza (px)</label>
                    <input type="number" class="form-control" id="barcode-width" value="${parseInt(element.style.width)}">
                </div>
                <div class="mb-3">
                    <label for="barcode-height" class="form-label">Altezza (px)</label>
                    <input type="number" class="form-control" id="barcode-height" value="${parseInt(element.style.height)}">
                </div>
                <div class="mb-3">
                    <label for="barcode-bar-width" class="form-label">Spessore barre</label>
                    <input type="number" class="form-control" id="barcode-bar-width" min="1" max="4" value="2">
                </div>
                <div class="mb-3">
                    <label for="barcode-color" class="form-label">Colore barre</label>
                    <input type="color" class="form-control" id="barcode-color" value="#000000">
                </div>
                <div class="mb-3 form-check">
                    <input type="checkbox" class="form-check-input" id="barcode-display-value" checked>
                    <label class="form-check-label" for="barcode-display-value">Mostra codice</label>
                </div>
                <div class="mb-3">
                    <label for="barcode-font-size" class="form-label">Dimensione testo (px)</label>
                    <input type="number" class="form-control" id="barcode-font-size" min="8" max="20" value="12">
                </div>
                <div class="row mb-3">
                    <div class="col">
                        <button class="btn btn-sm btn-outline-primary w-100" id="barcode-user-code">Codice Utente</button>
                    </div>
                    <div class="col">
                        <button class="btn btn-sm btn-outline-primary w-100" id="barcode-generate">Genera Nuovo</button>
                    </div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="removeSelectedElement()">Rimuovi</button>
            `;
            
            // Event listener per aggiornare il codice a barre
            document.getElementById('barcode-value').addEventListener('input', function() {
                updateBarcode(element);
            });
            
            document.getElementById('barcode-width').addEventListener('input', function() {
                element.style.width = this.value + 'px';
                saveCardState();
            });
            
            document.getElementById('barcode-height').addEventListener('input', function() {
                element.style.height = this.value + 'px';
                saveCardState();
            });
            
            // Event listener per proprietà avanzate del barcode
            document.getElementById('barcode-bar-width').addEventListener('change', function() {
                updateBarcode(element);
            });
            
            document.getElementById('barcode-color').addEventListener('input', function() {
                updateBarcode(element);
            });
            
            document.getElementById('barcode-display-value').addEventListener('change', function() {
                updateBarcode(element);
            });
            
            document.getElementById('barcode-font-size').addEventListener('change', function() {
                updateBarcode(element);
            });
            
            // Event listener per il pulsante "Codice Utente"
            document.getElementById('barcode-user-code').addEventListener('click', function() {
                const userData = document.getElementById('user-data');
                if (userData) {
                    const barcode = userData.getAttribute('data-barcode');
                    if (barcode) {
                        document.getElementById('barcode-value').value = barcode;
                        updateBarcode(element);
                    } else {
                        showMessage('Utente senza codice a barre assegnato', 'warning');
                    }
                } else {
                    showMessage('Nessun utente selezionato', 'warning');
                }
            });
            
            // Event listener per il pulsante "Genera Nuovo"
            document.getElementById('barcode-generate').addEventListener('click', function() {
                // Genera un nuovo codice EAN-13 casuale (prefisso 200 + 9 cifre + check digit)
                let code = '200';
                for (let i = 0; i < 9; i++) {
                    code += Math.floor(Math.random() * 10);
                }
                document.getElementById('barcode-value').value = code;
                updateBarcode(element);
            });
            break;
            
        case 'customImage':
            propertiesPanel.innerHTML = `
                <div class="mb-3">
                    <label class="form-label">Immagine</label>
                    <div class="text-center mb-2">
                        <img src="${element.src}" class="img-fluid border rounded" style="max-height: 100px;">
                    </div>
                </div>
                <div class="mb-3">
                    <label for="image-width" class="form-label">Larghezza (px)</label>
                    <input type="number" class="form-control" id="image-width" value="${parseInt(element.style.width)}">
                </div>
                <div class="mb-3">
                    <label for="image-height" class="form-label">Altezza (px)</label>
                    <input type="number" class="form-control" id="image-height" value="${parseInt(element.style.height)}">
                </div>
                <div class="mb-3">
                    <label for="image-angle" class="form-label">Rotazione (gradi)</label>
                    <input type="number" class="form-control" id="image-angle" value="${parseFloat(element.getAttribute('data-angle') || 0)}">
                </div>
                <div class="mb-3">
                    <label class="form-label">Sostituisci immagine</label>
                    <input type="file" class="form-control" id="image-upload" accept="image/*">
                </div>
                <button class="btn btn-danger btn-sm" onclick="removeSelectedElement()">Rimuovi</button>
            `;
            
            // Event listener per aggiornare l'immagine
            document.getElementById('image-width').addEventListener('input', function() {
                element.style.width = this.value + 'px';
                saveCardState();
            });
            
            document.getElementById('image-height').addEventListener('input', function() {
                element.style.height = this.value + 'px';
                saveCardState();
            });
            
            document.getElementById('image-angle').addEventListener('input', function() {
                const angle = parseFloat(this.value) || 0;
                element.setAttribute('data-angle', angle);
                const x = parseFloat(element.getAttribute('data-x') || 0);
                const y = parseFloat(element.getAttribute('data-y') || 0);
                element.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
                saveCardState();
            });
            
            // Gestisci l'upload dell'immagine
            document.getElementById('image-upload').addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        element.src = event.target.result;
                        // Aggiorna l'anteprima
                        const preview = propertiesPanel.querySelector('img');
                        if (preview) preview.src = event.target.result;
                        saveCardState();
                    };
                    reader.readAsDataURL(file);
                }
            });
            break;
    }
}

/**
 * Rimuove l'elemento selezionato
 */
function removeSelectedElement() {
    const selectedElement = document.querySelector('.card-element.selected');
    if (selectedElement) {
        selectedElement.remove();
        document.getElementById('properties-panel').innerHTML = '';
        saveCardState();
    }
}

/**
 * Aggiunge un nuovo elemento alla tessera
 * @param {string} type - Tipo di elemento da aggiungere
 */
function addNewElement(type) {
    // Gestisci il caso speciale per l'upload di immagini personalizzate
    if (type === 'customImage') {
        // Apri il modal per il caricamento dell'immagine
        const imageModal = new bootstrap.Modal(document.getElementById('customImageModal'));
        imageModal.show();
        return;
    }
    
    // Per tutti gli altri tipi di elementi
    addCardElement(type);
    saveCardState();
}

/**
 * Salva lo stato attuale della tessera
 */
function saveCardState() {
    // Viene chiamato ogni volta che viene apportata una modifica
    // per permettere il salvataggio del modello
}

/**
 * Crea un nuovo modello vuoto
 */
function createNewTemplate() {
    const cardContainer = document.getElementById('card-container');
    if (!cardContainer) return;
    
    // Pulisci il container
    cardContainer.innerHTML = '';
    
    // Imposta i campi del form
    document.getElementById('template-name').value = 'Nuovo modello';
    document.getElementById('default-template').checked = false;
    document.getElementById('template-id').value = '';
    
    // Riattiva l'interazione
    setupInteractJS();
}

/**
 * Salva il modello di tessera
 */
function saveTemplate() {
    const templateName = document.getElementById('template-name').value;
    const defaultTemplate = document.getElementById('default-template').checked;
    const templateId = document.getElementById('template-id').value;
    
    if (!templateName) {
        showMessage('Inserisci un nome per il modello', 'warning');
        return;
    }
    
    // Raccogli tutti gli elementi della tessera
    const elements = [];
    document.querySelectorAll('.card-element').forEach(el => {
        const type = el.getAttribute('data-type');
        const x = parseFloat(el.getAttribute('data-x') || 0);
        const y = parseFloat(el.getAttribute('data-y') || 0);
        const angle = parseFloat(el.getAttribute('data-angle') || 0);
        
        let element = {
            type: type,
            x: x,
            y: y,
            angle: angle
        };
        
        // Proprietà specifiche per ogni tipo
        switch (type) {
            case 'text':
                element.content = el.textContent;
                element.fontSize = parseInt(el.style.fontSize);
                element.fontFamily = el.style.fontFamily;
                element.fontWeight = el.style.fontWeight;
                element.color = el.style.color;
                break;
                
            case 'logo':
                element.src = el.src;
                element.width = parseInt(el.style.width);
                element.height = parseInt(el.style.height);
                break;
                
            case 'barcode':
                element.code = el.getAttribute('data-code');
                element.width = parseInt(el.style.width);
                element.height = parseInt(el.style.height);
                break;
        }
        
        elements.push(element);
    });
    
    // Prepara i dati da inviare
    const formData = new FormData();
    formData.append('nome', templateName);
    formData.append('contenuto', JSON.stringify(elements));
    if (defaultTemplate) {
        formData.append('predefinito', 'on');
    }
    
    // Determina l'URL in base a se è un nuovo modello o un aggiornamento
    let url, method;
    if (templateId) {
        url = `/modelli-tessera/${templateId}/modifica`;
        method = 'POST';
    } else {
        url = '/modelli-tessera/aggiungi';
        method = 'POST';
    }
    
    // Invia i dati al server
    fetch(url, {
        method: method,
        body: formData
    })
    .then(response => {
        if (response.ok) {
            showMessage('Modello salvato con successo!', 'success');
            // Ricarica la pagina per aggiornare la lista dei modelli
            setTimeout(() => window.location.reload(), 1000);
        } else {
            showMessage('Errore durante il salvataggio del modello', 'danger');
        }
    })
    .catch(error => {
        console.error('Errore durante il salvataggio:', error);
        showMessage('Errore durante il salvataggio', 'danger');
    });
}

/**
 * Stampa la tessera attuale
 */
function printCard() {
    const cardContainer = document.getElementById('card-container');
    if (!cardContainer) return;
    
    // Crea un clone del container per la stampa
    const printContainer = cardContainer.cloneNode(true);
    
    // Crea un iframe nascosto per la stampa
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    document.body.appendChild(iframe);
    
    // Scrivi il contenuto dell'iframe
    iframe.contentDocument.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Stampa Tessera</title>
            <style>
                body { margin: 0; padding: 0; }
                .print-card {
                    width: 85.60mm;  /* Larghezza standard tessera */
                    height: 53.98mm;  /* Altezza standard tessera */
                    background-color: #fff;
                    position: relative;
                    overflow: hidden;
                    page-break-inside: avoid;
                }
                .card-element {
                    position: absolute;
                }
            </style>
        </head>
        <body>
            <div class="print-card">${printContainer.innerHTML}</div>
        </body>
        </html>
    `);
    
    iframe.contentDocument.close();
    
    // Stampa il contenuto dell'iframe
    setTimeout(() => {
        iframe.contentWindow.print();
        
        // Rimuovi l'iframe dopo la stampa
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    }, 500);
}

/**
 * Aggiorna un barcode con nuove impostazioni
 * @param {HTMLElement} element - L'elemento barcode da aggiornare
 */
function updateBarcode(element) {
    if (!element || element.getAttribute('data-type') !== 'barcode') return;
    
    // Ottieni i valori dai controlli
    const valueInput = document.getElementById('barcode-value');
    const barWidthInput = document.getElementById('barcode-bar-width');
    const colorInput = document.getElementById('barcode-color');
    const displayValueCheck = document.getElementById('barcode-display-value');
    const fontSizeInput = document.getElementById('barcode-font-size');
    
    if (!valueInput) return;
    
    let code = valueInput.value.replace(/[^\d]/g, '');
    
    // Se il codice è troppo corto, completa con zeri
    if (code.length < 12) {
        code = code.padEnd(12, '0');
    }
    
    // Estrai i valori degli altri campi
    const barWidth = barWidthInput ? parseInt(barWidthInput.value) || 2 : 2;
    const lineColor = colorInput ? colorInput.value : '#000000';
    const displayValue = displayValueCheck ? displayValueCheck.checked : true;
    const fontSize = fontSizeInput ? parseInt(fontSizeInput.value) || 12 : 12;
    
    // Configurazione per JsBarcode
    const options = {
        format: "EAN13",
        lineColor: lineColor,
        width: barWidth,
        height: 60,
        displayValue: displayValue,
        fontSize: fontSize,
        font: "monospace",
        textMargin: 2,
        valid: function(valid) {
            if (!valid) {
                showMessage('Codice EAN-13 non valido', 'warning');
            }
        }
    };
    
    try {
        // Genera il codice a barre
        JsBarcode(element, code, options);
        element.setAttribute('data-code', code);
        
        // Aggiorna tooltip
        const tooltip = element.querySelector('.card-element-tooltip');
        if (tooltip) {
            tooltip.textContent = 'Barcode: ' + code;
        }
        
        saveCardState();
    } catch (e) {
        console.error("Errore nella generazione del barcode:", e);
        showMessage('Errore nella generazione del codice a barre', 'danger');
    }
}

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
