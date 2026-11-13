import pandas as pd
from typing import Dict, Any

def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """
    Computes Relative Strength Index (RSI) using standard Wilder's smoothing.
    """
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    
    avg_gain = gain.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    
    rs = avg_gain / avg_loss.replace(0, float('nan'))
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return rsi.fillna(50.0)

def compute_technical_indicators(df: pd.DataFrame, fast_period: int = 20, slow_period: int = 50, rsi_period: int = 14) -> pd.DataFrame:
    """
    Calculates technical indicators for a given BVMT equity DataFrame.
    Expected columns: ['Close', 'Open', 'High', 'Low', 'Vol']
    """
    data = df.copy()
    
    # Ensure numeric columns
    for col in ['Close', 'Open', 'High', 'Low', 'Vol']:
        if col in data.columns:
            data[col] = pd.to_numeric(data[col], errors='coerce')
    
    # Moving Averages
    data[f'SMA_{fast_period}'] = data['Close'].rolling(window=fast_period, min_periods=1).mean()
    data[f'SMA_{slow_period}'] = data['Close'].rolling(window=slow_period, min_periods=1).mean()
    
    # RSI
    data[f'RSI_{rsi_period}'] = compute_rsi(data['Close'], period=rsi_period)
    
    # Volume Average & Spikes
    if 'Vol' in data.columns:
        data['VOL_SMA_20'] = data['Vol'].rolling(window=20, min_periods=1).mean()
    else:
        data['VOL_SMA_20'] = 0.0

    return data
