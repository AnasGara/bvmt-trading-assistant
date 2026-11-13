import re
import logging
from datetime import datetime
from typing import Optional, Any
import requests
from bs4 import BeautifulSoup
import pandas as pd

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

def clean_french_number(val: Any) -> float:
    """Converts French-formatted numbers ('175,80' or '5 725') to float."""
    if val is None or pd.isna(val):
        return 0.0
    s = str(val).replace('\xa0', '').replace(' ', '').replace('%', '').strip()
    s = s.replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return 0.0

def fetch_equity_history(ticker: str, days: int = 180) -> Optional[pd.DataFrame]:
    """
    Fetches real-time & historical OHLCV data for BVMT equities directly from Ilboursa.
    Standardizes output to DataFrame with columns: ['Date', 'Close', 'Open', 'Low', 'High', 'Vol']
    sorted chronologically (oldest to newest).
    """
    symbol = ticker.upper().strip()
    url = f"https://www.ilboursa.com/marches/historiques/{symbol}"
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=12)
        if response.status_code != 200:
            logger.warning(f"Failed to fetch {symbol} from {url} (status {response.status_code})")
            return None
            
        soup = BeautifulSoup(response.text, 'html.parser')
        table = soup.find('table', {'id': 'tblhistos'})
        if not table:
            logger.warning(f"Historical table not found for {symbol}")
            return None

        rows = []
        for tr in table.find_all('tr'):
            cols = [td.get_text(strip=True) for td in tr.find_all(['td', 'th'])]
            if cols:
                rows.append(cols)

        if len(rows) < 2:
            return None

        headers = rows[0]
        data_rows = rows[1:]

        # Map headers
        col_indices = {}
        for idx, h in enumerate(headers):
            h_clean = h.lower()
            if 'date' in h_clean:
                col_indices['Date'] = idx
            elif 'cl' in h_clean: # Clôture
                col_indices['Close'] = idx
            elif 'ouv' in h_clean: # Ouverture
                col_indices['Open'] = idx
            elif 'bas' in h_clean: # Plus bas
                col_indices['Low'] = idx
            elif 'haut' in h_clean: # Plus haut
                col_indices['High'] = idx
            elif 'titres' in h_clean or 'volume' in h_clean:
                if 'Vol' not in col_indices:
                    col_indices['Vol'] = idx

        parsed = []
        for r in data_rows:
            if len(r) <= max(col_indices.values()):
                continue
            item = {}
            for col_name, idx in col_indices.items():
                raw_val = r[idx]
                if col_name == 'Date':
                    item['Date'] = raw_val
                else:
                    item[col_name] = clean_french_number(raw_val)
            parsed.append(item)

        df = pd.DataFrame(parsed)
        if df.empty:
            return None

        df['Date'] = pd.to_datetime(df['Date'], format='%d/%m/%Y', errors='coerce')
        df = df.dropna(subset=['Date', 'Close'])
        df = df.sort_values('Date').reset_index(drop=True)

        return df

    except Exception as e:
        logger.error(f"Error fetching data for {ticker}: {e}")
        return None
