
@echo off
echo =============================================
echo Installazione Biblioteca Scolastica per Windows
echo =============================================
echo.

REM Verifica se Python è installato
python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo Python non trovato. Installare Python 3.8 o superiore da:
    echo https://www.python.org/downloads/
    echo Assicurarsi di selezionare "Add Python to PATH" durante l'installazione.
    echo.
    pause
    exit /b 1
)

REM Verifica la versione di Python
for /f "tokens=2" %%I in ('python --version 2^>^&1') do set "PYTHON_VERSION=%%I"
echo Versione Python rilevata: %PYTHON_VERSION%

REM Verifica PostgreSQL
echo.
echo Verifica delle dipendenze di sistema...
echo.
psql --version > nul 2>&1
if %errorlevel% neq 0 (
    echo PostgreSQL non trovato. Installare PostgreSQL da:
    echo https://www.postgresql.org/download/windows/
    echo.
    echo Dopo l'installazione, assicurarsi che:
    echo 1. PostgreSQL sia stato aggiunto al PATH di sistema
    echo 2. Il servizio PostgreSQL sia in esecuzione
    echo 3. Sia stata impostata una password per l'utente postgres
    echo.
    pause
    exit /b 1
)

REM Installa le dipendenze
echo Installazione delle dipendenze Python...
python -m pip install --upgrade pip

REM Installa i pacchetti necessari uno alla volta per gestire meglio gli errori
for %%p in (
    Flask==2.3.3 
    Flask-Login==0.6.2 
    Flask-SQLAlchemy==3.1.1 
    Flask-WTF==1.1.1 
    SQLAlchemy==2.0.21 
    WTForms==3.0.1 
    Werkzeug==2.3.7 
    email-validator==2.0.0 
    gunicorn==21.2.0 
    pillow==10.0.0 
    psycopg2-binary==2.9.7 
    requests==2.31.0 
    python-dotenv==1.0.0
) do (
    echo Installazione %%p...
    python -m pip install %%p
    if %errorlevel% neq 0 (
        echo Errore nell'installazione di %%p
        pause
        exit /b 1
    )
)

REM Crea file .env se non esiste
if not exist .env (
    echo Creazione file di configurazione...
    (
        echo # Configurazione Biblioteca Scolastica
        echo SECRET_KEY=chiave_segreta_da_modificare
        echo # Configurazione Database PostgreSQL
        echo # Modifica questi valori con le tue credenziali PostgreSQL
        echo DATABASE_URL=postgresql://postgres:password@localhost:5432/biblioteca
    ) > .env
)

REM Crea file di avvio se non esiste
if not exist start_biblioteca.bat (
    echo Creazione file di avvio...
    (
        echo @echo off
        echo echo Avvio del server Biblioteca Scolastica...
        echo echo Il server sara' accessibile all'indirizzo: http://localhost:5000
        echo echo Per accedere da altri dispositivi nella rete LAN, usare: http://[indirizzo-ip-locale]:5000
        echo echo Per terminare il server, premere CTRL+C
        echo echo.
        echo python app.py
        echo pause
    ) > start_biblioteca.bat
)

echo.
echo =============================================
echo Installazione completata con successo!
echo =============================================
echo.
echo Per avviare l'applicazione:
echo 1. Modifica il file .env con le tue credenziali PostgreSQL
echo 2. Esegui start_biblioteca.bat
echo.
echo Credenziali predefinite:
echo Username: admin
echo Password: admin
echo.
echo Premi un tasto per chiudere...
pause
