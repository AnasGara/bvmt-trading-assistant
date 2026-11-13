import pandas as pd
from typing import Optional, Dict, Any, List
from src.engine.indicators import compute_technical_indicators
from config.settings import (
    RSI_OVERSOLD,
    RSI_OVERBOUGHT,
    VOLUME_SPIKE_FACTOR,
    SMA_FAST,
    SMA_SLOW
)

def evaluate_signals(ticker: str, df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Evaluates rule-based quantitative trading signals on historical data.
    Returns a list of active signals (if any).
    """
    if df is None or len(df) < 20:
        return []

    data = compute_technical_indicators(df, fast_period=SMA_FAST, slow_period=SMA_SLOW)
    
    # We inspect the latest completed candle and prior candle
    curr = data.iloc[-1]
    prev = data.iloc[-2] if len(data) >= 2 else curr
    
    signals = []
    close_price = float(curr['Close'])
    curr_rsi = float(curr[f'RSI_14'])
    prev_rsi = float(prev[f'RSI_14'])
    
    curr_fast = float(curr[f'SMA_{SMA_FAST}'])
    prev_fast = float(prev[f'SMA_{SMA_FAST}'])
    curr_slow = float(curr[f'SMA_{SMA_SLOW}'])
    prev_slow = float(prev[f'SMA_{SMA_SLOW}'])
    
    curr_vol = float(curr.get('Vol', 0))
    vol_avg = float(curr.get('VOL_SMA_20', 0))

    # 1. Golden Cross (SMA 20 crosses above SMA 50)
    if prev_fast <= prev_slow and curr_fast > curr_slow:
        signals.append({
            "ticker": ticker.upper(),
            "signal_type": "GOLDEN_CROSS",
            "direction": "BUY",
            "price": close_price,
            "rsi": curr_rsi,
            "sma_fast": curr_fast,
            "sma_slow": curr_slow,
            "target_price": round(close_price * 1.06, 3),   # +6% target
            "stop_loss": round(close_price * 0.965, 3),     # -3.5% stop
            "description": f"SMA {SMA_FAST} crossed above SMA {SMA_SLOW} indicating a strong bullish trend reversal."
        })

    # 2. RSI Oversold Bounce (RSI was < 30 and now rising, or RSI < 32)
    elif prev_rsi < RSI_OVERSOLD and curr_rsi >= RSI_OVERSOLD:
        signals.append({
            "ticker": ticker.upper(),
            "signal_type": "OVERSOLD_BOUNCE",
            "direction": "BUY",
            "price": close_price,
            "rsi": curr_rsi,
            "sma_fast": curr_fast,
            "sma_slow": curr_slow,
            "target_price": round(close_price * 1.05, 3),   # +5% target
            "stop_loss": round(close_price * 0.97, 3),      # -3% stop
            "description": f"RSI recovered from oversold territory ({prev_rsi:.1f} -> {curr_rsi:.1f})."
        })

    # 3. Volume Surge Breakout
    elif vol_avg > 0 and curr_vol > (vol_avg * VOLUME_SPIKE_FACTOR) and curr['Close'] > prev['Close'] and curr_rsi < RSI_OVERBOUGHT:
        signals.append({
            "ticker": ticker.upper(),
            "signal_type": "VOLUME_BREAKOUT",
            "direction": "BUY",
            "price": close_price,
            "rsi": curr_rsi,
            "sma_fast": curr_fast,
            "sma_slow": curr_slow,
            "target_price": round(close_price * 1.045, 3),
            "stop_loss": round(close_price * 0.975, 3),
            "description": f"Volume spike ({curr_vol:,.0f} vs avg {vol_avg:,.0f}) with positive price momentum."
        })

    # 4. Death Cross (SMA 20 crosses below SMA 50)
    elif prev_fast >= prev_slow and curr_fast < curr_slow:
        signals.append({
            "ticker": ticker.upper(),
            "signal_type": "DEATH_CROSS",
            "direction": "SELL",
            "price": close_price,
            "rsi": curr_rsi,
            "sma_fast": curr_fast,
            "sma_slow": curr_slow,
            "target_price": round(close_price * 0.94, 3),
            "stop_loss": round(close_price * 1.03, 3),
            "description": f"SMA {SMA_FAST} crossed below SMA {SMA_SLOW} indicating bearish trend continuation."
        })

    # 5. Overbought Caution (RSI > 70)
    elif curr_rsi > RSI_OVERBOUGHT:
        signals.append({
            "ticker": ticker.upper(),
            "signal_type": "OVERBOUGHT_WARNING",
            "direction": "WATCH",
            "price": close_price,
            "rsi": curr_rsi,
            "sma_fast": curr_fast,
            "sma_slow": curr_slow,
            "target_price": None,
            "stop_loss": round(close_price * 0.97, 3),
            "description": f"RSI is overbought at {curr_rsi:.1f}. High probability of mean reversion or pullback."
        })

    return signals
