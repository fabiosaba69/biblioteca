#!/bin/bash

echo "============================================="
echo "Installazione Biblioteca Scolastica per Linux"
echo "============================================="
echo

# Verifica se Python è installato
if ! command -v python3 &> /dev/null; then
    echo "Python3 non trovato. Installarlo con:"
    echo "Ubuntu/Debian: sudo apt update && sudo apt install python3 python3-pip python3-venv"
    echo "Fedora: sudo dnf install python3 python3-pip"
    echo "Arch Linux: sudo pacman -S python python-pip"
    echo
    exit 1
fi

# Verifica versione Python
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "Versione Python rilevata: $PYTHON_VERSION"

# Verifica PostgreSQL
echo
echo "Verifica delle dipendenze di sistema..."
echo
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL non trovato. Installarlo con:"
    echo "Ubuntu/Debian: sudo apt update && sudo apt install postgresql postgresql-contrib"
    echo "Fedora: sudo dnf install postgresql postgresql-server"
    echo "Arch Linux: sudo pacman -S postgresql"
    echo
    echo "Dopo l'installazione, eseguire:"
    echo "Ubuntu/Debian/Fedora: sudo systemctl start postgresql && sudo systemctl enable postgresql"
    echo "Arch Linux: sudo -u postgres initdb -D /var/lib/postgres/data && sudo systemctl start postgresql && sudo systemctl enable postgresql"
    echo
else
    echo "PostgreSQL è installato sul sistema."
fi

# Verifica dipendenze di sviluppo
echo "Assicurarsi che le librerie di sviluppo siano installate:"
echo "Ubuntu/Debian: sudo apt install build-essential libpq-dev python3-dev"
echo "Fedora: sudo dnf install @development-tools libpq-devel python3-devel"
echo "Arch Linux: sudo pacman -S base-devel postgresql-libs"
echo

# Conferma per procedere
read -p "Continuare con l'installazione? (s/n): " conferma
if [[ $conferma != "s" && $conferma != "S" ]]; then
    echo "Installazione annullata."
    exit 0
fi

# Crea ambiente virtuale
echo "Creazione ambiente virtuale Python..."
python3 -m venv venv
if [ $? -ne 0 ]; then
    echo "Errore nella creazione dell'ambiente virtuale."
    exit 1
fi

# Attiva ambiente virtuale e installa dipendenze
echo "Attivazione ambiente virtuale e installazione dipendenze..."
source venv/bin/activate

# Installa le dipendenze
echo "Installazione delle dipendenze Python..."
pip install --upgrade pip
pip install Flask==2.3.3 Flask-Login==0.6.2 Flask-SQLAlchemy==3.1.1 Flask-WTF==1.1.1 SQLAlchemy==2.0.21 WTForms==3.0.1 Werkzeug==2.3.7 email-validator==2.0.0 gunicorn==21.2.0 pillow==10.0.0 psycopg2-binary==2.9.7 requests==2.31.0 python-dotenv==1.0.0
if [ $? -ne 0 ]; then
    echo "Errore nell'installazione delle dipendenze."
    exit 1
fi

# Crea file .env con configurazione di default
echo "Creazione file di configurazione..."
cat > .env << EOL
# Configurazione Biblioteca Scolastica
SECRET_KEY=chiave_segreta_da_modificare
# Configurazione Database PostgreSQL
# Modifica questi valori con le tue credenziali PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/biblioteca
EOL

echo
echo "Creazione file di avvio..."
cat > start_biblioteca.sh << EOL
#!/bin/bash
source venv/bin/activate
echo "Avvio del server Biblioteca Scolastica..."
echo "Il server sarà accessibile all'indirizzo: http://localhost:5000"
echo "Per accedere da altri dispositivi nella rete LAN, usare: http://\$(hostname -I | awk '{print \$1}'):5000"
echo "Per terminare il server, premere CTRL+C"
echo
python3 app.py
EOL

# Rendi lo script eseguibile
chmod +x start_biblioteca.sh

# Guida alla configurazione PostgreSQL
echo "Configurazione del database PostgreSQL:"
echo "1. Accedi a PostgreSQL con: sudo -u postgres psql"
echo "2. Crea un database con: CREATE DATABASE biblioteca;"
echo "3. Crea un utente con: CREATE USER biblioteca_user WITH ENCRYPTED PASSWORD 'password';"
echo "4. Concedi i privilegi con: GRANT ALL PRIVILEGES ON DATABASE biblioteca TO biblioteca_user;"
echo "5. Esci con: \q"
echo "6. Modifica il file .env con le tue credenziali"
echo

echo "============================================="
echo "Installazione completata!"
echo "============================================="
echo
echo "Per avviare l'applicazione, eseguire: ./start_biblioteca.sh"
echo
echo "Nota: Assicurarsi di configurare correttamente il database PostgreSQL"
echo "modificando il file .env con le proprie credenziali di accesso."
echo
echo "Credenziali predefinite:"
echo "Username: admin"
echo "Password: admin"
echo

# Se si desidera lanciare l'app alla fine dell'installazione
read -p "Avviare l'applicazione ora? (s/n): " avvia
if [[ $avvia == "s" || $avvia == "S" ]]; then
    ./start_biblioteca.sh
fi