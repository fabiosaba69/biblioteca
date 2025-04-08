# Biblioteca Scolastica

Sistema informatico avanzato per la gestione bibliotecaria scolastica, ottimizzato per le biblioteche delle scuole primarie italiane con funzionalità innovative di catalogazione e gestione dei prestiti.

## Caratteristiche Principali

- **Gestione Utenti**: Registrazione e autenticazione con ruoli (amministratore, insegnante, studente)
- **Catalogazione Libri**: Ricerca automatica di informazioni tramite ISBN
- **Gestione Prestiti**: Prestito e restituzione dei libri con tracciamento dello stato
- **Tessere Utente**: Generazione e stampa di tessere personalizzate con codice a barre EAN-13
- **Statistiche**: Visualizzazione e monitoraggio di prestiti e attività
- **Report PDF**: Generazione di report di prestiti stampabili
- **Interfaccia Responsive**: Utilizzabile da dispositivi diversi

## Requisiti di Sistema

- Python 3.8 o superiore
- PostgreSQL 12 o superiore
- Connessione Internet (per la ricerca ISBN)

## Installazione

### Windows

1. Scarica o clona questo repository sul tuo computer
2. Esegui il file `install_windows.bat` facendo doppio clic
3. Segui le istruzioni visualizzate durante l'installazione
4. Configura il file `.env` con le credenziali del tuo database PostgreSQL
5. Avvia l'applicazione con `start_biblioteca.bat`

### Linux

1. Scarica o clona questo repository sul tuo computer
2. Rendi eseguibile lo script di installazione: `chmod +x install_linux.sh`
3. Esegui lo script: `./install_linux.sh`
4. Segui le istruzioni visualizzate durante l'installazione
5. Configura il file `.env` con le credenziali del tuo database PostgreSQL
6. Avvia l'applicazione con `./start_biblioteca.sh`

## Accesso all'Applicazione

Dopo l'avvio, l'applicazione sarà accessibile all'indirizzo:
- http://localhost:5000 (accesso locale)
- http://[indirizzo-ip-locale]:5000 (accesso via LAN)

### Credenziali Predefinite
- Username: `admin`
- Password: `admin`

## Configurazione del Database

Il sistema è configurato di default per utilizzare PostgreSQL. Durante l'installazione verrà creato un file `.env` dove potrai inserire le tue credenziali di accesso:

```
SECRET_KEY=chiave_segreta_da_modificare
DATABASE_URL=postgresql://postgres:password@localhost:5432/biblioteca
```

## Utilizzo in Rete LAN

L'applicazione è configurata per funzionare in rete LAN. Quando viene avviata, lo script mostra automaticamente:
- L'indirizzo locale (localhost)
- L'indirizzo IP locale per l'accesso da altri dispositivi nella stessa rete

## Funzionalità Principali

1. **Ricerca Libri per ISBN**: Scansione o digitazione del codice per ottenere automaticamente informazioni su autore, titolo, editore, ecc.
2. **Gestione Prestiti**: Interfaccia intuitiva per prestito e restituzione con scansione barcode
3. **Tessere Utente**: Editor avanzato per personalizzare e stampare tessere con codice a barre EAN-13
4. **Report e Statistiche**: Generazione PDF dei prestiti attivi e restituiti per utente o complessivi

## Stack Tecnologico

- **Backend**: Python/Flask
- **Database**: PostgreSQL
- **Frontend**: HTML5/CSS3/JavaScript/Bootstrap
- **Librerie Principali**: Flask-SQLAlchemy, Flask-Login, Flask-WTF, jsPDF

## Copyright

© 2025 Fabio SABATELLI - Tutti i diritti riservati