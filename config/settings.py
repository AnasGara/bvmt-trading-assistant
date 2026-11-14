import os
from pathlib import Path
from dotenv import load_dotenv

# Base Directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(BASE_DIR / ".env")

# Telegram Configuration
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# Database
DB_PATH = BASE_DIR / "bvmt_state.db"

# Financial & Broker Fee Settings (Tunis Stock Exchange standards)
BROKER_FEE_PCT = float(os.getenv("BROKER_FEE_PCT", "0.006"))         # 0.6% Broker commission
EXCHANGE_FEE_PCT = float(os.getenv("EXCHANGE_FEE_PCT", "0.0015"))    # 0.15% BVMT + STICODEVAM fee
TVA_PCT = float(os.getenv("TVA_PCT", "0.19"))                         # 19% TVA on broker commission
USE_CEA_TAX_SHIELD = os.getenv("USE_CEA_TAX_SHIELD", "true").lower() in ("true", "1", "yes")
STANDARD_TAX_RATE = 0.10                                              # 10% Capital gains tax if non-CEA

# Technical Engine Settings
RSI_PERIOD = int(os.getenv("RSI_PERIOD", "14"))
RSI_OVERSOLD = float(os.getenv("RSI_OVERSOLD", "30"))
RSI_OVERBOUGHT = float(os.getenv("RSI_OVERBOUGHT", "70"))
SMA_FAST = int(os.getenv("SMA_FAST", "20"))
SMA_SLOW = int(os.getenv("SMA_SLOW", "50"))
VOLUME_SPIKE_FACTOR = float(os.getenv("VOLUME_SPIKE_FACTOR", "1.5"))

# JWT Authentication
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "bvmt-secret-key-change-in-production-2024")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))

# Admin Defaults
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@bvmt.tn")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

# Default Watchlist of major liquid equities on BVMT (Ilboursa tickers)
# Includes all 43 actively traded liquid stocks of the Bourse de Tunis
DEFAULT_WATCHLIST = [
    # Banques & Services Financiers
    "BIAT",      # Banque Internationale Arabe de Tunisie
    "TJARI",     # Attijari Bank
    "BT",        # Banque de Tunisie
    "BNA",       # Banque Nationale Agricole
    "UIB",       # Union Internationale de Banques
    "BH",        # BH Bank
    "AB",        # Amen Bank
    "ATB",       # Arab Tunisian Bank
    "BTE",       # Banque de Tunisie et des Emirats
    "STB",       # Société Tunisienne de Banque
    # Leasing & Factoring
    "ATL",       # Arab Tunisian Lease
    "TJL",       # Attijari Leasing
    "CIL",       # Compagnie Internationale de Leasing
    "HL",        # Hannibal Lease
    # Assurances & Réassurance
    "AST",       # Assurances Maghrebia
    "ASSMA",     # Maghrebia Vie
    "BHASS",     # BH Assurance
    "TRE",       # Société Tunisienne de Réassurance
    # Agroalimentaire & Boissons
    "SFBT",      # Société Frigorifique et Brasserie de Tunis
    "DH",        # Délice Holding
    "LNDOR",     # Land'Or
    # Biens de Consommation & Pharmacie
    "SAH",       # SAH Lilas
    "ECYCL",     # Euro-Cycles
    "SAM",       # SAM
    "NBL",       # New Body Line
    # Bâtiment & Matériaux de Construction
    "CC",        # Carthage Cement
    "TPR",       # Tunisie Profilés Aluminium
    "SOMOC",     # Somocer
    # Holdings & Industrie
    "OTH",       # One Tech Holding
    "PGH",       # Poulina Group Holding
    "SIAME",     # SIAME
    "ICF",       # Industries Chimiques du Fluor
    "STPAP",     # SOTIPAPIER
    "AL",        # Air Liquide Tunisie
    "ASSAD",     # Accumulateur Assad
    "CELL",      # Cellcom
    "MPBS",      # Manufacture de Panneaux Bois du Sud
    # Automobile & Équipement
    "ARTES",     # ARTES Automobiles
    "CITY",      # City Cars
    "NAKL",      # Ennakl Automobiles
    "STA",       # Société Tunisienne d'Automobiles
    # Distribution & Transport
    "MAG",       # Magasin Général
    "TAIR",      # Tunisair
]

# Ticker display names
TICKER_NAMES = {
    "BIAT": "Banque Internationale Arabe de Tunisie",
    "TJARI": "Attijari Bank",
    "BT": "Banque de Tunisie",
    "BNA": "Banque Nationale Agricole",
    "UIB": "Union Internationale de Banques",
    "BH": "BH Bank",
    "AB": "Amen Bank",
    "ATB": "Arab Tunisian Bank",
    "BTE": "Banque de Tunisie et des Emirats",
    "STB": "Société Tunisienne de Banque",
    "ATL": "Arab Tunisian Lease",
    "TJL": "Attijari Leasing",
    "CIL": "Compagnie Internationale de Leasing",
    "HL": "Hannibal Lease",
    "AST": "Assurances Maghrebia",
    "ASSMA": "Maghrebia Vie",
    "BHASS": "BH Assurance",
    "TRE": "Société Tunisienne de Réassurance",
    "SFBT": "Société Frigorifique et Brasserie de Tunis",
    "DH": "Délice Holding",
    "LNDOR": "Land'Or",
    "SAH": "SAH Lilas",
    "ECYCL": "Euro-Cycles",
    "SAM": "SAM",
    "NBL": "New Body Line",
    "CC": "Carthage Cement",
    "TPR": "Tunisie Profilés Aluminium",
    "SOMOC": "Somocer",
    "OTH": "One Tech Holding",
    "PGH": "Poulina Group Holding",
    "SIAME": "SIAME",
    "ICF": "Industries Chimiques du Fluor",
    "STPAP": "SOTIPAPIER",
    "AL": "Air Liquide Tunisie",
    "ASSAD": "Accumulateur Assad",
    "CELL": "Cellcom",
    "MPBS": "Manufacture de Panneaux Bois du Sud",
    "ARTES": "ARTES Automobiles",
    "CITY": "City Cars",
    "NAKL": "Ennakl Automobiles",
    "STA": "Société Tunisienne d'Automobiles",
    "MAG": "Magasin Général",
    "TAIR": "Tunisair",
}
