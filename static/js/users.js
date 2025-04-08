/**
 * Script per la gestione degli utenti e stampa dei prestiti
 */
document.addEventListener('DOMContentLoaded', function() {
    // Bottone per la stampa di tutti i prestiti
    const printAllLoansButton = document.getElementById('print-all-loans');
    if (printAllLoansButton) {
        printAllLoansButton.addEventListener('click', printAllLoans);
    }
});

/**
 * Stampa i prestiti di un utente specifico in formato PDF
 * @param {number} userId - ID dell'utente
 * @param {string} userName - Nome dell'utente
 */
function printUserLoans(userId, userName) {
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
 * Stampa un elenco di tutti i libri prestati e restituiti
 */
function printAllLoans() {
    // Mostra un messaggio di caricamento
    showMessage('Generazione del report completo dei prestiti in corso...', 'info');
    
    // Chiamata all'API per ottenere tutti i prestiti
    fetch('/api/prestiti/tutti')
        .then(response => response.json())
        .then(data => {
            // Inizializza jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Aggiungi intestazione
            doc.setFontSize(18);
            doc.text('Biblioteca Scolastica', 105, 15, { align: 'center' });
            doc.setFontSize(14);
            doc.text('Riepilogo Completo Prestiti', 105, 25, { align: 'center' });
            
            // Data di generazione
            const oggi = new Date().toLocaleDateString('it-IT');
            doc.setFontSize(12);
            doc.text(`Generato il: ${oggi}`, 14, 35);
            
            let yPos = 45;
            
            // Filtra i prestiti attivi e restituiti
            const prestitiAttivi = data.prestiti.filter(p => p.stato === 'In prestito');
            const prestitiRestituiti = data.prestiti.filter(p => p.stato === 'Restituito');
            
            // Sezione prestiti attivi
            if (prestitiAttivi.length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(46, 125, 50);  // Verde
                doc.text('Libri Attualmente Prestati', 14, yPos);
                doc.setTextColor(0, 0, 0);  // Nero
                doc.setFontSize(12);
                
                // Tabella prestiti attivi
                doc.autoTable({
                    startY: yPos + 5,
                    head: [['Libro', 'Utente', 'Classe', 'Data Prestito', 'Restituzione Prevista']],
                    body: prestitiAttivi.map(prestito => [
                        prestito.libro.titolo,
                        `${prestito.utente.cognome} ${prestito.utente.nome}`,
                        prestito.utente.classe || 'N/D',
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
                if (yPos > 200) {
                    doc.addPage();
                    yPos = 20;
                }
                
                doc.setFontSize(14);
                doc.setTextColor(2, 136, 209);  // Azzurro
                doc.text('Libri Restituiti', 14, yPos);
                doc.setTextColor(0, 0, 0);  // Nero
                doc.setFontSize(12);
                
                // Tabella prestiti restituiti
                doc.autoTable({
                    startY: yPos + 5,
                    head: [['Libro', 'Utente', 'Classe', 'Data Prestito', 'Data Restituzione']],
                    body: prestitiRestituiti.map(prestito => [
                        prestito.libro.titolo,
                        `${prestito.utente.cognome} ${prestito.utente.nome}`,
                        prestito.utente.classe || 'N/D',
                        prestito.data_prestito,
                        prestito.data_restituzione_effettiva
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [2, 136, 209], textColor: [255, 255, 255] },
                    margin: { left: 14, right: 14 }
                });
            }
            
            // Aggiungi statistiche riepilogative
            doc.addPage();
            doc.setFontSize(14);
            doc.text('Statistiche Riepilogative', 105, 20, { align: 'center' });
            doc.setFontSize(12);
            
            // Statistiche generali
            doc.text('Informazioni Generali:', 14, 35);
            doc.text(`Totale Prestiti: ${data.prestiti.length}`, 14, 45);
            doc.text(`Libri Attualmente Prestati: ${prestitiAttivi.length}`, 14, 55);
            doc.text(`Libri Restituiti: ${prestitiRestituiti.length}`, 14, 65);
            
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
            doc.save(`report_prestiti_completo_${oggi.replace(/\//g, '-')}.pdf`);
            
            // Mostra un messaggio di conferma
            showMessage('Report completo dei prestiti generato con successo!', 'success');
        })
        .catch(error => {
            console.error('Errore nella generazione del report:', error);
            showMessage('Errore nella generazione del report. Riprova più tardi.', 'danger');
        });
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