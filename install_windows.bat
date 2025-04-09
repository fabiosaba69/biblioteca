
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
    echo PostgreSQL non trovato. Per installarlo:
    echo 1. Scaricare PostgreSQL da https://www.postgresql.org/download/windows/
    echo 2. Durante l'installazione:
    echo    - Annotare la password dell'utente postgres
    echo    - Mantenere la porta default 5432
    echo    - Installare tutti i componenti proposti
    echo.
    pause
    exit /b 1
)

REM Aggiorna pip
echo Aggiornamento pip...
python -m pip install --upgrade pip

REM Installa i requisiti
echo Installazione dipendenze Python...
python -m pip install ^
    Flask==2.3.3 ^
    Flask-Login==0.6.2 ^
    Flask-SQLAlchemy==3.1.1 ^
    Flask-WTF==1.1.1 ^
    SQLAlchemy==2.0.21 ^
    WTForms==3.0.1 ^
    Werkzeug==2.3.7 ^
    email-validator==2.0.0 ^
    gunicorn==21.2.0 ^
    pillow==10.0.0 ^
    psycopg2-binary==2.9.7 ^
    requests==2.31.0 ^
    python-dotenv==1.0.0

if %errorlevel% neq 0 (
    echo Errore nell'installazione delle dipendenze Python.
    pause
    exit /b 1
)

REM Crea file .env se non esiste
if not exist .env (
    echo Creazione file di configurazione .env...
    echo # Configurazione Biblioteca Scolastica > .env
    echo SECRET_KEY=chiave_segreta_da_modificare >> .env
    echo # Database PostgreSQL >> .env
    echo DATABASE_URL=postgresql://postgres:password@localhost:5432/biblioteca >> .env
)

REM Crea file batch di avvio
echo @echo off > start_biblioteca.bat
echo echo Avvio Biblioteca Scolastica... >> start_biblioteca.bat
echo echo Server disponibile su: >> start_biblioteca.bat
echo echo - Locale: http://localhost:5000 >> start_biblioteca.bat
echo echo - Rete LAN: http://%%COMPUTERNAME%%:5000 >> start_biblioteca.bat
echo echo Per terminare premere CTRL+C >> start_biblioteca.bat
echo. >> start_biblioteca.bat
echo python app.py >> start_biblioteca.bat

echo.
echo =============================================
echo Installazione completata!
echo =============================================
echo.
echo Operazioni da eseguire:
echo 1. Creare il database 'biblioteca' in PostgreSQL
echo 2. Modificare il file .env con:
echo    - Una chiave segreta sicura
echo    - Le credenziali corrette del database
echo.
echo Per avviare l'applicazione: start_biblioteca.bat
echo.
echo Credenziali predefinite:
echo Username: admin
echo Password: admin
echo.
pause
