import sqlite3
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from config.settings import DB_PATH

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes tables for SQLite state persistence."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Signals Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS signals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticker TEXT NOT NULL,
                signal_type TEXT NOT NULL,
                direction TEXT NOT NULL,
                price REAL NOT NULL,
                rsi REAL,
                sma_fast REAL,
                sma_slow REAL,
                target_price REAL,
                stop_loss REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Alert History Table (deduplication)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alert_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticker TEXT NOT NULL,
                signal_type TEXT NOT NULL,
                message TEXT,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()

def should_send_alert(ticker: str, signal_type: str, cooldown_hours: int = 24) -> bool:
    """
    Checks if an alert for this ticker and signal_type was already sent
    within the cooldown window to prevent redundant daily notifications.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        since = (datetime.utcnow() - timedelta(hours=cooldown_hours)).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            SELECT COUNT(*) as count FROM alert_history
            WHERE ticker = ? AND signal_type = ? AND sent_at >= ?
        """, (ticker.upper(), signal_type, since))
        row = cursor.fetchone()
        return row["count"] == 0 if row else True

def record_alert(ticker: str, signal_type: str, message: str):
    """Logs sent alert to SQLite database."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO alert_history (ticker, signal_type, message, sent_at)
            VALUES (?, ?, ?, ?)
        """, (ticker.upper(), signal_type, message, datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")))
        conn.commit()

def save_signal(
    ticker: str,
    signal_type: str,
    direction: str,
    price: float,
    rsi: Optional[float] = None,
    sma_fast: Optional[float] = None,
    sma_slow: Optional[float] = None,
    target_price: Optional[float] = None,
    stop_loss: Optional[float] = None
):
    """Saves evaluated signal to SQLite state."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO signals (ticker, signal_type, direction, price, rsi, sma_fast, sma_slow, target_price, stop_loss)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (ticker.upper(), signal_type, direction, price, rsi, sma_fast, sma_slow, target_price, stop_loss))
        conn.commit()
