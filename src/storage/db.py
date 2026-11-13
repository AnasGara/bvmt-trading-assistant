import sqlite3
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from config.settings import DB_PATH

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    """Initializes all tables for SQLite state persistence."""
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
                description TEXT,
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

        # Users Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                full_name TEXT NOT NULL DEFAULT '',
                role TEXT NOT NULL DEFAULT 'user',
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # User Watchlist Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_watchlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                ticker TEXT NOT NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, ticker)
            )
        """)

        # Screener Runs Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS screener_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                started_at TIMESTAMP NOT NULL,
                completed_at TIMESTAMP,
                tickers_scanned INTEGER DEFAULT 0,
                signals_found INTEGER DEFAULT 0,
                status TEXT DEFAULT 'running',
                error_message TEXT
            )
        """)

        # App Settings Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Add description column to signals if it doesn't exist
        try:
            cursor.execute("ALTER TABLE signals ADD COLUMN description TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists

        conn.commit()


# ─── Signal Operations ───────────────────────────────────────────────

def should_send_alert(ticker: str, signal_type: str, cooldown_hours: int = 24) -> bool:
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
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO alert_history (ticker, signal_type, message, sent_at)
            VALUES (?, ?, ?, ?)
        """, (ticker.upper(), signal_type, message, datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")))
        conn.commit()

def save_signal(
    ticker: str, signal_type: str, direction: str, price: float,
    rsi: Optional[float] = None, sma_fast: Optional[float] = None,
    sma_slow: Optional[float] = None, target_price: Optional[float] = None,
    stop_loss: Optional[float] = None, description: Optional[str] = None
):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO signals (ticker, signal_type, direction, price, rsi, sma_fast, sma_slow, target_price, stop_loss, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (ticker.upper(), signal_type, direction, price, rsi, sma_fast, sma_slow, target_price, stop_loss, description))
        conn.commit()

def get_signals(
    ticker: Optional[str] = None, signal_type: Optional[str] = None,
    direction: Optional[str] = None, date_from: Optional[str] = None,
    date_to: Optional[str] = None, limit: int = 50, offset: int = 0
) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        conditions = []
        params: list = []

        if ticker:
            conditions.append("ticker = ?")
            params.append(ticker.upper())
        if signal_type:
            conditions.append("signal_type = ?")
            params.append(signal_type)
        if direction:
            conditions.append("direction = ?")
            params.append(direction.upper())
        if date_from:
            conditions.append("created_at >= ?")
            params.append(date_from)
        if date_to:
            conditions.append("created_at <= ?")
            params.append(date_to)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        query = f"SELECT * FROM signals {where} ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

def get_signal_by_id(signal_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM signals WHERE id = ?", (signal_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def get_latest_signals() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT s.* FROM signals s
            INNER JOIN (
                SELECT ticker, MAX(created_at) as max_date FROM signals GROUP BY ticker
            ) latest ON s.ticker = latest.ticker AND s.created_at = latest.max_date
            ORDER BY s.created_at DESC
        """)
        return [dict(row) for row in cursor.fetchall()]

def get_signal_summary() -> Dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT signal_type, COUNT(*) as count FROM signals GROUP BY signal_type")
        by_type = {row["signal_type"]: row["count"] for row in cursor.fetchall()}

        cursor.execute("SELECT direction, COUNT(*) as count FROM signals GROUP BY direction")
        by_direction = {row["direction"]: row["count"] for row in cursor.fetchall()}

        cursor.execute("SELECT COUNT(*) as total FROM signals")
        total = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) as today FROM signals WHERE DATE(created_at) = DATE('now')")
        today = cursor.fetchone()["today"]

        return {"total": total, "today": today, "by_type": by_type, "by_direction": by_direction}

def get_signals_count(
    ticker: Optional[str] = None, signal_type: Optional[str] = None,
    direction: Optional[str] = None, date_from: Optional[str] = None,
    date_to: Optional[str] = None
) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        conditions = []
        params: list = []
        if ticker:
            conditions.append("ticker = ?")
            params.append(ticker.upper())
        if signal_type:
            conditions.append("signal_type = ?")
            params.append(signal_type)
        if direction:
            conditions.append("direction = ?")
            params.append(direction.upper())
        if date_from:
            conditions.append("created_at >= ?")
            params.append(date_from)
        if date_to:
            conditions.append("created_at <= ?")
            params.append(date_to)
        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        cursor.execute(f"SELECT COUNT(*) as count FROM signals {where}", params)
        return cursor.fetchone()["count"]


# ─── User Operations ─────────────────────────────────────────────────

def create_user(email: str, hashed_password: str, full_name: str = "", role: str = "user") -> Optional[int]:
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO users (email, hashed_password, full_name, role) VALUES (?, ?, ?, ?)",
                (email.lower(), hashed_password, full_name, role)
            )
            conn.commit()
            return cursor.lastrowid
        except sqlite3.IntegrityError:
            return None

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email.lower(),))
        row = cursor.fetchone()
        return dict(row) if row else None

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def get_all_users() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC")
        return [dict(row) for row in cursor.fetchall()]

def update_user_role(user_id: int, role: str) -> bool:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET role = ? WHERE id = ?", (role, user_id))
        conn.commit()
        return cursor.rowcount > 0

def delete_user(user_id: int) -> bool:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        return cursor.rowcount > 0

def get_user_count() -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM users")
        return cursor.fetchone()["count"]


# ─── Watchlist Operations ────────────────────────────────────────────

def get_user_watchlist(user_id: int) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM user_watchlist WHERE user_id = ? ORDER BY added_at DESC",
            (user_id,)
        )
        return [dict(row) for row in cursor.fetchall()]

def add_to_watchlist(user_id: int, ticker: str) -> Optional[int]:
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO user_watchlist (user_id, ticker) VALUES (?, ?)",
                (user_id, ticker.upper())
            )
            conn.commit()
            return cursor.lastrowid
        except sqlite3.IntegrityError:
            return None

def remove_from_watchlist(user_id: int, ticker: str) -> bool:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM user_watchlist WHERE user_id = ? AND ticker = ?",
            (user_id, ticker.upper())
        )
        conn.commit()
        return cursor.rowcount > 0


# ─── Screener Run Operations ────────────────────────────────────────

def create_screener_run() -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            "INSERT INTO screener_runs (started_at, status) VALUES (?, 'running')",
            (now,)
        )
        conn.commit()
        return cursor.lastrowid

def complete_screener_run(run_id: int, tickers_scanned: int, signals_found: int, status: str = "completed", error_message: Optional[str] = None):
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            UPDATE screener_runs
            SET completed_at = ?, tickers_scanned = ?, signals_found = ?, status = ?, error_message = ?
            WHERE id = ?
        """, (now, tickers_scanned, signals_found, status, error_message, run_id))
        conn.commit()

def get_screener_runs(limit: int = 20) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM screener_runs ORDER BY started_at DESC LIMIT ?",
            (limit,)
        )
        return [dict(row) for row in cursor.fetchall()]

def get_last_screener_run() -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM screener_runs ORDER BY started_at DESC LIMIT 1")
        row = cursor.fetchone()
        return dict(row) if row else None


# ─── Alert History Operations ────────────────────────────────────────

def get_alert_history(limit: int = 50) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM alert_history ORDER BY sent_at DESC LIMIT ?", (limit,))
        return [dict(row) for row in cursor.fetchall()]


# ─── App Settings Operations ────────────────────────────────────────

def get_app_setting(key: str) -> Optional[str]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        return row["value"] if row else None

def set_app_setting(key: str, value: str):
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
        """, (key, value, now, value, now))
        conn.commit()

def get_all_settings() -> Dict[str, str]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM app_settings")
        return {row["key"]: row["value"] for row in cursor.fetchall()}


# ─── Dashboard Stats ─────────────────────────────────────────────────

def get_dashboard_stats() -> Dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as c FROM users")
        total_users = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM signals WHERE DATE(created_at) = DATE('now')")
        signals_today = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM signals")
        total_signals = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(DISTINCT ticker) as c FROM signals")
        active_tickers = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM alert_history WHERE DATE(sent_at) = DATE('now')")
        alerts_today = cursor.fetchone()["c"]

        cursor.execute("""
            SELECT direction, COUNT(*) as count FROM signals
            WHERE DATE(created_at) = DATE('now') GROUP BY direction
        """)
        today_by_direction = {row["direction"]: row["count"] for row in cursor.fetchall()}

        cursor.execute("""
            SELECT ticker, COUNT(*) as count FROM signals
            GROUP BY ticker ORDER BY count DESC LIMIT 5
        """)
        top_tickers = [{"ticker": row["ticker"], "count": row["count"]} for row in cursor.fetchall()]

        return {
            "total_users": total_users,
            "total_signals": total_signals,
            "signals_today": signals_today,
            "active_tickers": active_tickers,
            "alerts_today": alerts_today,
            "today_by_direction": today_by_direction,
            "top_tickers": top_tickers,
        }
