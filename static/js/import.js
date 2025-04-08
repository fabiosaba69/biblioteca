/**
 * Script per l'importazione di libri da file CSV/TXT
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elementi DOM
    const importForm = document.getElementById('import-form');
    const fileInput = document.getElementById('import-file');
    const previewButton = document.getElementById('preview-button');
    const previewContainer = document.getElementById('preview-container');
    const previewTable = document.getElementById('preview-table');
    const delimiterSelect = document.getElementById('delimiter');
    
    // Se gli elementi non esistono, esci
    if (!importForm || !fileInput) return;
    
    // Event listener per l'anteprima
    if (previewButton) {
        previewButton.addEventListener('click', function(e) {
            e.preventDefault();
            previewImport();
        });
    }
    
    // Event listener per il cambio di file
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            // Reset anteprima quando si cambia file
            if (previewContainer) {
                previewContainer.style.display = 'none';
            }
        });
    }
    
    /**
     * Genera un'anteprima dei dati importati
     */
    function previewImport() {
        const file = fileInput.files[0];
        if (!file) {
            showMessage('Seleziona un file da importare', 'warning');
            return;
        }
        
        const delimiter = delimiterSelect.value;
        const hasHeader = document.getElementById('has-header').checked;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            
            // Analizza il contenuto
            let rows = [];
            if (delimiter === 'auto') {
                // Cerca di rilevare automaticamente il delimitatore
                const delimiters = [',', ';', '\t'];
                let maxColumns = 0;
                let bestDelimiter = ',';
                
                for (const d of delimiters) {
                    const lines = content.split('\n');
                    const test = lines[0].split(d);
                    if (test.length > maxColumns) {
                        maxColumns = test.length;
                        bestDelimiter = d;
                    }
                }
                
                rows = parseCSV(content, bestDelimiter);
                // Aggiorna il selettore
                delimiterSelect.value = bestDelimiter === '\t' ? 'tab' : bestDelimiter;
            } else {
                const actualDelimiter = delimiter === 'tab' ? '\t' : delimiter;
                rows = parseCSV(content, actualDelimiter);
            }
            
            if (rows.length === 0) {
                showMessage('Il file è vuoto o non ha un formato valido', 'warning');
                return;
            }
            
            // Genera l'anteprima nella tabella
            createPreviewTable(rows, hasHeader);
            
            // Mostra il container dell'anteprima
            previewContainer.style.display = 'block';
        };
        
        reader.readAsText(file);
    }
    
    /**
     * Analizza un contenuto CSV/TXT
     * @param {string} content - Contenuto del file
     * @param {string} delimiter - Delimitatore
     * @returns {Array} - Array di righe
     */
    function parseCSV(content, delimiter) {
        const rows = [];
        const lines = content.split(/\r\n|\n/);
        
        for (let i = 0; i < lines.length; i++) {
            // Ignora righe vuote
            if (lines[i].trim() === '') continue;
            
            const row = [];
            let inQuotes = false;
            let currentValue = '';
            
            for (let j = 0; j < lines[i].length; j++) {
                const char = lines[i][j];
                
                if (char === '"' && (j === 0 || lines[i][j - 1] !== '\\')) {
                    inQuotes = !inQuotes;
                } else if (char === delimiter && !inQuotes) {
                    row.push(currentValue.trim());
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
            
            // Aggiungi l'ultimo valore
            row.push(currentValue.trim());
            rows.push(row);
        }
        
        return rows;
    }
    
    /**
     * Crea una tabella di anteprima
     * @param {Array} rows - Array di righe
     * @param {boolean} hasHeader - Indica se la prima riga è un'intestazione
     */
    function createPreviewTable(rows, hasHeader) {
        if (!previewTable) return;
        
        // Pulisci la tabella
        previewTable.innerHTML = '';
        
        // Limita a 10 righe per l'anteprima
        const previewRows = rows.slice(0, 10);
        
        // Crea l'intestazione della tabella
        let thead = document.createElement('thead');
        let headerRow = document.createElement('tr');
        
        if (hasHeader && previewRows.length > 0) {
            // Usa la prima riga come intestazione
            previewRows[0].forEach(cell => {
                let th = document.createElement('th');
                th.textContent = cell;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            previewTable.appendChild(thead);
            
            // Rimuovi la prima riga dai dati
            previewRows.shift();
        } else {
            // Crea intestazioni generiche
            for (let i = 0; i < (previewRows[0] ? previewRows[0].length : 0); i++) {
                let th = document.createElement('th');
                th.textContent = `Colonna ${i + 1}`;
                headerRow.appendChild(th);
            }
            thead.appendChild(headerRow);
            previewTable.appendChild(thead);
        }
        
        // Crea il corpo della tabella
        let tbody = document.createElement('tbody');
        
        previewRows.forEach(row => {
            let tr = document.createElement('tr');
            row.forEach(cell => {
                let td = document.createElement('td');
                td.textContent = cell;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        
        previewTable.appendChild(tbody);
        
        // Aggiungi informazioni sul totale
        const totalInfo = document.getElementById('total-rows-info');
        if (totalInfo) {
            totalInfo.textContent = `Totale righe nel file: ${rows.length}${hasHeader ? ' (inclusa intestazione)' : ''}`;
        }
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
