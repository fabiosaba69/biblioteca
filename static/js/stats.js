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
