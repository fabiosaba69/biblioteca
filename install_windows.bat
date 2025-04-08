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
echo Assicurarsi che PostgreSQL sia installato sul sistema.
echo È possibile scaricare PostgreSQL da: https://www.postgresql.org/download/windows/
echo.

REM Crea ambiente virtuale
echo Creazione ambiente virtuale Python...
python -m venv venv
if %errorlevel% neq 0 (
  echo Errore nella creazione dell'ambiente virtuale.
  pause
  exit /b 1
)

REM Attiva ambiente virtuale e installa dipendenze
echo Attivazione ambiente virtuale e installazione dipendenze...
call venv\Scripts\activate

REM Installa le dipendenze
echo Installazione delle dipendenze Python...
pip install --upgrade pip
pip install Flask==2.3.3 Flask-Login==0.6.2 Flask-SQLAlchemy==3.1.1 Flask-WTF==1.1.1 SQLAlchemy==2.0.21 WTForms==3.0.1 Werkzeug==2.3.7 email-validator==2.0.0 gunicorn==21.2.0 pillow==10.0.0 psycopg2-binary==2.9.7 requests==2.31.0 python-dotenv==1.0.0
if %errorlevel% neq 0 (
  echo Errore nell'installazione delle dipendenze.
  pause
  exit /b 1
)

REM Crea file .env con configurazione di default
echo Creazione file di configurazione...
(
echo # Configurazione Biblioteca Scolastica
echo SECRET_KEY=chiave_segreta_da_modificare
echo # Configurazione Database PostgreSQL
echo # Modifica questi valori con le tue credenziali PostgreSQL
echo DATABASE_URL=postgresql://postgres:password@localhost:5432/biblioteca
) > .env

echo.
echo Creazione file di avvio...
(
echo @echo off
echo call venv\Scripts\activate
echo echo Avvio del server Biblioteca Scolastica...
echo echo Il server sarà accessibile all'indirizzo: http://localhost:5000
echo echo Per accedere da altri dispositivi nella rete LAN, usare: http://[indirizzo-ip-locale]:5000
echo echo Per terminare il server, premere CTRL+C
echo echo.
echo python app.py
) > start_biblioteca.bat

echo.
echo =============================================
echo Installazione completata!
echo =============================================
echo.
echo Per avviare l'applicazione, eseguire il file start_biblioteca.bat
echo.
echo Nota: Assicurarsi di configurare correttamente il database PostgreSQL 
echo modificando il file .env con le proprie credenziali di accesso.
echo.
echo Credenziali predefinite:
echo Username: admin
echo Password: admin
echo.

pause