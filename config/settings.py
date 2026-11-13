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
DEFAULT_WATCHLIST = [
    "BIAT",      # Banque Internationale Arabe de Tunisie
    "SFBT",      # Société Frigorifique et Brasserie de Tunis
    "TJARI",     # Attijari Bank
    "BT",        # Banque de Tunisie
    "SAH",       # SAH Lilas
    "CC",        # Carthage Cement
    "TPR",       # Tunisie Profilés Aluminium
    "OTH",       # One Tech Holding
    "ECYCL",     # Euro-Cycles
    "UIB",       # Union Internationale de Banques
    "BNA",       # Banque Nationale Agricole
    "BH",        # BH Bank
    "AB",        # Amen Bank
    "ARTES",     # ARTES
    "DH"         # Délice Holding
]

# Ticker display names
TICKER_NAMES = {
    "BIAT": "Banque Internationale Arabe de Tunisie",
    "SFBT": "Société Frigorifique et Brasserie de Tunis",
    "TJARI": "Attijari Bank",
    "BT": "Banque de Tunisie",
    "SAH": "SAH Lilas",
    "CC": "Carthage Cement",
    "TPR": "Tunisie Profilés Aluminium",
    "OTH": "One Tech Holding",
    "ECYCL": "Euro-Cycles",
    "UIB": "Union Internationale de Banques",
    "BNA": "Banque Nationale Agricole",
    "BH": "BH Bank",
    "AB": "Amen Bank",
    "ARTES": "ARTES Automobiles",
    "DH": "Délice Holding",
}
