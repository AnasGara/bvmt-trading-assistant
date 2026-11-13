import re
import time
import logging
from datetime import datetime
from typing import Optional, Any, List, Dict
import requests
from bs4 import BeautifulSoup
import pandas as pd

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

# In-memory cache for A-Z market listing
_AAZ_CACHE: Dict[str, Any] = {
    "timestamp": 0,
    "data": []
}
CACHE_TTL_SECONDS = 60  # Cache for 1 minute


def clean_french_number(val: Any) -> float:
    """Converts French-formatted numbers ('175,80' or '5 725' or '0.27%') to float."""
    if val is None or pd.isna(val):
        return 0.0
    s = str(val).replace('\xa0', '').replace(' ', '').replace('%', '').strip()
    s = s.replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return 0.0


def fetch_aaz_stocks(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """
    Scrapes the complete A-Z list of all equities listed on the BVMT
    from https://www.ilboursa.com/marches/aaz
    Returns a list of all stocks with live quote, volume, and variation data.
    """
    global _AAZ_CACHE
    now = time.time()
    if not force_refresh and _AAZ_CACHE["data"] and (now - _AAZ_CACHE["timestamp"] < CACHE_TTL_SECONDS):
        return _AAZ_CACHE["data"]

    url = "https://www.ilboursa.com/marches/aaz"
    try:
        response = requests.get(url, headers=HEADERS, timeout=12)
        if response.status_code != 200:
            logger.warning(f"Failed to fetch AAZ list (status {response.status_code})")
            return _AAZ_CACHE["data"]

        soup = BeautifulSoup(response.text, "html.parser")
        table = soup.find("table")
        if not table:
            return _AAZ_CACHE["data"]

        stocks = []
        rows = table.find_all("tr")[1:]  # Skip header row
        for tr in rows:
            tds = tr.find_all("td")
            if len(tds) >= 8:
                a_tag = tds[0].find("a")
                name = tds[0].get_text(strip=True)
                href = a_tag["href"] if a_tag and a_tag.has_attr("href") else ""
                
                # Extract ticker from cotation_<TICKER>
                m = re.search(r'cotation_([A-Za-z0-9_]+)', href)
                ticker = m.group(1).upper() if m else name.upper()

                last_price = clean_french_number(tds[6].get_text(strip=True))
                open_price = clean_french_number(tds[1].get_text(strip=True))
                high_price = clean_french_number(tds[2].get_text(strip=True))
                low_price = clean_french_number(tds[3].get_text(strip=True))
                vol_shares = clean_french_number(tds[4].get_text(strip=True))
                vol_tnd = clean_french_number(tds[5].get_text(strip=True))
                change_pct = clean_french_number(tds[7].get_text(strip=True))

                stocks.append({
                    "ticker": ticker,
                    "name": name,
                    "last": last_price,
                    "open": open_price,
                    "high": high_price,
                    "low": low_price,
                    "volume_shares": int(vol_shares),
                    "volume_tnd": vol_tnd,
                    "change_pct": change_pct,
                    "cotation_url": f"https://www.ilboursa.com/marches/cotation_{ticker}"
                })

        if stocks:
            _AAZ_CACHE["timestamp"] = now
            _AAZ_CACHE["data"] = stocks
            logger.info(f"Successfully cached {len(stocks)} stocks from Ilboursa A-Z")
        return stocks

    except Exception as e:
        logger.error(f"Error fetching AAZ stocks: {e}")
        return _AAZ_CACHE["data"]


def fetch_stock_variations(ticker: str) -> List[Dict[str, Any]]:
    """
    Fetches the historical variation table from https://www.ilboursa.com/marches/cotation_<TICKER>
    Returns variation across 1 week, 1 month, 1er janvier (YTD), 1 year, 3 years, 5 years, etc.
    """
    symbol = ticker.upper().strip()
    url = f"https://www.ilboursa.com/marches/cotation_{symbol}"
    variations = []

    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        if response.status_code != 200:
            return variations

        soup = BeautifulSoup(response.text, "html.parser")
        tables = soup.find_all("table")
        for t in tables:
            headers = [th.get_text(strip=True).lower() for th in t.find_all("th")]
            if any("variation" in h for h in headers) or any("plus haut" in h for h in headers):
                for tr in t.find_all("tr")[1:]:
                    cols = [td.get_text(strip=True) for td in tr.find_all("td")]
                    if len(cols) >= 4:
                        period_name = cols[0]
                        if "1er janvier" in period_name.lower():
                            period_name = "YTD (1er Jan)"
                        variations.append({
                            "period": period_name,
                            "high": clean_french_number(cols[1]),
                            "low": clean_french_number(cols[2]),
                            "variation_pct": clean_french_number(cols[3])
                        })
                break
        return variations
    except Exception as e:
        logger.warning(f"Error fetching variations for {symbol}: {e}")
        return variations


def fetch_equity_history(ticker: str, days: int = 180) -> Optional[pd.DataFrame]:
    """
    Fetches historical OHLCV data for BVMT equities directly from Ilboursa.
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

        if days and len(df) > days:
            df = df.tail(days).reset_index(drop=True)

        return df

    except Exception as e:
        logger.error(f"Error fetching data for {ticker}: {e}")
        return None
