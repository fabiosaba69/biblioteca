/**
 * Script per la visualizzazione delle statistiche
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elementi DOM
    const monthlyLoansChart = document.getElementById('monthly-loans-chart');
    const mostLoanedBooksChart = document.getElementById('most-loaned-books-chart');
    const userLoansChart = document.getElementById('user-loans-chart');
    
    // Se gli elementi non esistono, esci
    if (!monthlyLoansChart && !mostLoanedBooksChart && !userLoansChart) return;
    
    // Inizializza i grafici
    initMonthlyLoansChart();
    initMostLoanedBooksChart();
    initUserLoansChart();
    
    /**
     * Inizializza il grafico mensile dei prestiti
     */
    function initMonthlyLoansChart() {
        if (!monthlyLoansChart) return;
        
        // Recupera i dati dal DOM
        const monthlyLoansData = JSON.parse(monthlyLoansChart.getAttribute('data-values') || '[]');
        
        // Nome dei mesi in italiano
        const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", 
                       "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
        
        // Crea il grafico
        new Chart(monthlyLoansChart, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Prestiti',
                    data: monthlyLoansData,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0  // Solo numeri interi
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Prestiti Mensili'
                    }
                }
            }
        });
    }
    
    /**
     * Inizializza il grafico dei libri più prestati
     */
    function initMostLoanedBooksChart() {
        if (!mostLoanedBooksChart) return;
        
        // Recupera i dati dal DOM
        const books = JSON.parse(mostLoanedBooksChart.getAttribute('data-titles') || '[]');
        const counts = JSON.parse(mostLoanedBooksChart.getAttribute('data-counts') || '[]');
        
        // Crea il grafico
        new Chart(mostLoanedBooksChart, {
            type: 'horizontalBar',
            data: {
                labels: books,
                datasets: [{
                    label: 'Prestiti',
                    data: counts,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0  // Solo numeri interi
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Libri Più Prestati'
                    }
                }
            }
        });
    }
    
    /**
     * Inizializza il grafico degli utenti più attivi
     */
    function initUserLoansChart() {
        if (!userLoansChart) return;
        
        // Recupera i dati dal DOM
        const users = JSON.parse(userLoansChart.getAttribute('data-users') || '[]');
        const counts = JSON.parse(userLoansChart.getAttribute('data-counts') || '[]');
        
        // Crea il grafico
        new Chart(userLoansChart, {
            type: 'horizontalBar',
            data: {
                labels: users,
                datasets: [{
                    label: 'Prestiti',
                    data: counts,
                    backgroundColor: 'rgba(153, 102, 255, 0.5)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0  // Solo numeri interi
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Utenti Più Attivi'
                    }
                }
            }
        });
    }
});

/**
 * Funzione per esportare i dati in formato CSV
 * @param {string} type - Tipo di dati da esportare
 */
function exportCSV(type) {
    // Ottieni la data corrente per il nome del file
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    let filename = `biblioteca_${type}_${dateStr}.csv`;
    
    // Recupera i dati dalla tabella corrispondente
    const tableId = `${type}-table`;
    const table = document.getElementById(tableId);
    
    if (!table) {
        showMessage(`Tabella ${type} non trovata.`, 'warning');
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Aggiungi l'intestazione
    const headers = [];
    table.querySelectorAll('thead th').forEach(th => {
        headers.push('"' + th.textContent + '"');
    });
    csvContent += headers.join(',') + '\r\n';
    
    // Aggiungi le righe
    table.querySelectorAll('tbody tr').forEach(tr => {
        const row = [];
        tr.querySelectorAll('td').forEach(td => {
            row.push('"' + td.textContent + '"');
        });
        csvContent += row.join(',') + '\r\n';
    });
    
    // Crea un link di download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    
    // Simula il click sul link
    link.click();
    
    // Rimuovi il link
    document.body.removeChild(link);
}

/**
 * Filtra una tabella di statistiche
 * @param {string} type - Tipo di tabella (loans, books, users)
 */
function filterStats(type) {
    const input = document.getElementById(`${type}-search`);
    const table = document.getElementById(`${type}-table`);
    
    if (!input || !table) return;
    
    const filter = input.value.toUpperCase();
    const rows = table.getElementsByTagName('tr');
    
    for (let i = 1; i < rows.length; i++) {  // Inizia da 1 per saltare l'intestazione
        let show = false;
        const cells = rows[i].getElementsByTagName('td');
        
        for (let j = 0; j < cells.length; j++) {
            const text = cells[j].textContent || cells[j].innerText;
            if (text.toUpperCase().indexOf(filter) > -1) {
                show = true;
                break;
            }
        }
        
        rows[i].style.display = show ? '' : 'none';
    }
}

/**
 * Filtra gli elementi nell'accordion dei prestiti per utente
 */
function filterUserLoans() {
    const input = document.getElementById('user-loans-search');
    const accordionItems = document.querySelectorAll('.user-loan-item');
    
    if (!input || !accordionItems) return;
    
    const filter = input.value.toUpperCase();
    
    accordionItems.forEach(item => {
        const headerButton = item.querySelector('.accordion-button');
        const headerText = headerButton.textContent || headerButton.innerText;
        
        if (headerText.toUpperCase().indexOf(filter) > -1) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

/**
 * Stampa i prestiti di un utente specifico in formato PDF
 * @param {number} userId - ID dell'utente
 * @param {string} userName - Nome dell'utente
 */
function printUserLoans(userId, userName) {
    // Ferma la propagazione dell'evento e previene il comportamento di default
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    // Mostra un messaggio di caricamento
    showMessage('Generazione del PDF in corso...', 'info');
    
    // Recupera i dati dell'utente tramite API
    fetch(`/api/prestiti/utente/${userId}`)
        .then(response => response.json())
        .then(data => {
            // Inizializza jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Aggiungi intestazione
            doc.setFontSize(18);
            doc.text('Biblioteca Scolastica', 105, 15, { align: 'center' });
            doc.setFontSize(14);
            doc.text(`Prestiti dell'utente: ${userName}`, 105, 25, { align: 'center' });
            
            // Aggiungi dettagli utente
            doc.setFontSize(12);
            doc.text(`Classe: ${data.utente.classe || 'N/D'}`, 14, 35);
            
            // Data di generazione
            const oggi = new Date().toLocaleDateString('it-IT');
            doc.text(`Generato il: ${oggi}`, 14, 42);
            
            // Filtra i prestiti attivi e restituiti
            const prestitiAttivi = data.prestiti.filter(p => p.stato === 'In prestito');
            const prestitiRestituiti = data.prestiti.filter(p => p.stato === 'Restituito');
            
            let yPos = 55;
            
            // Sezione prestiti attivi
            if (prestitiAttivi.length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(46, 125, 50);  // Verde
                doc.text('Prestiti Attivi', 14, yPos);
                doc.setTextColor(0, 0, 0);  // Nero
                doc.setFontSize(12);
                
                // Tabella prestiti attivi
                doc.autoTable({
                    startY: yPos + 5,
                    head: [['Titolo', 'Data Prestito', 'Restituzione Prevista']],
                    body: prestitiAttivi.map(prestito => [
                        prestito.libro.titolo,
                        prestito.data_prestito,
                        prestito.data_restituzione_prevista || 'N/D'
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255] },
                    margin: { left: 14, right: 14 }
                });
                
                yPos = doc.lastAutoTable.finalY + 15;
            }
            
            // Sezione prestiti restituiti
            if (prestitiRestituiti.length > 0) {
                // Se la pagina sta diventando troppo piena, aggiungi una nuova pagina
                if (yPos > 230) {
                    doc.addPage();
                    yPos = 20;
                }
                
                doc.setFontSize(14);
                doc.setTextColor(2, 136, 209);  // Azzurro
                doc.text('Prestiti Restituiti', 14, yPos);
                doc.setTextColor(0, 0, 0);  // Nero
                doc.setFontSize(12);
                
                // Tabella prestiti restituiti
                doc.autoTable({
                    startY: yPos + 5,
                    head: [['Titolo', 'Data Prestito', 'Data Restituzione']],
                    body: prestitiRestituiti.map(prestito => [
                        prestito.libro.titolo,
                        prestito.data_prestito,
                        prestito.data_restituzione_effettiva
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [2, 136, 209], textColor: [255, 255, 255] },
                    margin: { left: 14, right: 14 }
                });
            }
            
            // Aggiungi il piè di pagina
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setTextColor(150);
                doc.text(
                    `Pagina ${i} di ${pageCount} - Biblioteca Scolastica - Fabio SABATELLI`,
                    105, 
                    doc.internal.pageSize.height - 10, 
                    { align: 'center' }
                );
            }
            
            // Salva il PDF
            doc.save(`prestiti_${userName.replace(/\s+/g, '_')}.pdf`);
            
            // Mostra un messaggio di conferma
            showMessage('PDF generato con successo!', 'success');
        })
        .catch(error => {
            console.error('Errore nella generazione del PDF:', error);
            showMessage('Errore nella generazione del PDF. Riprova più tardi.', 'danger');
        });
}

/**
 * Stampa un riepilogo dei prestiti di tutti gli utenti
 */
function printAllUserLoans() {
    // Mostra un messaggio di caricamento
    showMessage('Generazione del PDF completo in corso...', 'info');
    
    // Raccogli i dati da tutti gli elementi dell'accordion
    const allUserLoans = [];
    const items = document.querySelectorAll('.user-loan-item');
    
    items.forEach(item => {
        const headerButton = item.querySelector('.accordion-button');
        const userNameElement = headerButton.querySelector('strong');
        const userId = item.querySelector('.accordion-collapse').id.replace('collapse', '');
        
        if (userNameElement) {
            const userName = userNameElement.textContent.trim();
            allUserLoans.push({ id: userId, name: userName });
        }
    });
    
    // Se non ci sono utenti, mostra un messaggio di errore
    if (allUserLoans.length === 0) {
        showMessage('Nessun utente con prestiti trovato', 'warning');
        return;
    }
    
    // Inizializza jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Aggiungi intestazione
    doc.setFontSize(18);
    doc.text('Biblioteca Scolastica', 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Riepilogo Prestiti per Utente', 105, 25, { align: 'center' });
    
    // Data di generazione
    const oggi = new Date().toLocaleDateString('it-IT');
    doc.setFontSize(12);
    doc.text(`Generato il: ${oggi}`, 14, 35);
    
    // Tabella riepilogativa degli utenti
    const usersSummary = Array.from(items).map(item => {
        const headerButton = item.querySelector('.accordion-button');
        const userName = headerButton.querySelector('strong').textContent.trim();
        const activeLoans = headerButton.querySelector('.badge.bg-success').textContent.split(':')[1].trim();
        const returnedLoans = headerButton.querySelector('.badge.bg-info').textContent.split(':')[1].trim();
        return [userName, activeLoans, returnedLoans, (parseInt(activeLoans) + parseInt(returnedLoans)).toString()];
    });
    
    // Aggiungi la tabella riepilogativa
    doc.autoTable({
        startY: 45,
        head: [['Utente', 'Prestiti Attivi', 'Prestiti Restituiti', 'Totale']],
        body: usersSummary,
        theme: 'grid',
        headStyles: { fillColor: [97, 97, 97], textColor: [255, 255, 255] },
        margin: { left: 14, right: 14 }
    });
    
    // Calcola i totali
    const totals = usersSummary.reduce((acc, row) => {
        return [
            'TOTALE',
            acc[1] + parseInt(row[1]),
            acc[2] + parseInt(row[2]),
            acc[3] + parseInt(row[3])
        ];
    }, ['TOTALE', 0, 0, 0]);
    
    // Aggiungi la riga dei totali
    doc.autoTable({
        startY: doc.lastAutoTable.finalY,
        body: [totals],
        theme: 'grid',
        bodyStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
        margin: { left: 14, right: 14 }
    });
    
    // Aggiungi il piè di pagina
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(
            `Pagina ${i} di ${pageCount} - Biblioteca Scolastica - Fabio SABATELLI`,
            105, 
            doc.internal.pageSize.height - 10, 
            { align: 'center' }
        );
    }
    
    // Salva il PDF
    doc.save(`riepilogo_prestiti_${oggi.replace(/\//g, '-')}.pdf`);
    
    // Mostra un messaggio di conferma
    showMessage('PDF riepilogativo generato con successo!', 'success');
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
