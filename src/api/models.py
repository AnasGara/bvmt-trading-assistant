from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ─── Auth Models ─────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(default="", max_length=100)

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── Signal Models ───────────────────────────────────────────────────

class SignalOut(BaseModel):
    id: int
    ticker: str
    signal_type: str
    direction: str
    price: float
    rsi: Optional[float] = None
    sma_fast: Optional[float] = None
    sma_slow: Optional[float] = None
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    description: Optional[str] = None
    created_at: Optional[str] = None

class SignalFilter(BaseModel):
    ticker: Optional[str] = None
    signal_type: Optional[str] = None
    direction: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None

class SignalSummary(BaseModel):
    total: int
    today: int
    by_type: Dict[str, int]
    by_direction: Dict[str, int]

class PaginatedSignals(BaseModel):
    signals: List[SignalOut]
    total: int
    page: int
    page_size: int
    total_pages: int


# ─── Market Models ───────────────────────────────────────────────────

class MarketQuote(BaseModel):
    ticker: str
    name: str
    close: float
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    volume: Optional[float] = None
    change_pct: Optional[float] = None
    date: Optional[str] = None

class TickerOverview(BaseModel):
    ticker: str
    name: str
    close: float
    change_pct: Optional[float] = None
    volume: Optional[float] = None
    rsi: Optional[float] = None
    sma_fast: Optional[float] = None
    sma_slow: Optional[float] = None
    latest_signal: Optional[str] = None
    latest_direction: Optional[str] = None

class MarketHistory(BaseModel):
    ticker: str
    data: List[Dict[str, Any]]


# ─── Watchlist Models ────────────────────────────────────────────────

class WatchlistAdd(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=10)

class WatchlistItem(BaseModel):
    id: int
    ticker: str
    added_at: Optional[str] = None


# ─── Screener Models ────────────────────────────────────────────────

class ScreenerRunOut(BaseModel):
    id: int
    started_at: str
    completed_at: Optional[str] = None
    tickers_scanned: int
    signals_found: int
    status: str
    error_message: Optional[str] = None

class ScreenerStatus(BaseModel):
    last_run: Optional[ScreenerRunOut] = None
    next_scheduled: Optional[str] = None
    is_running: bool = False


# ─── Admin Models ────────────────────────────────────────────────────

class AdminStats(BaseModel):
    total_users: int
    total_signals: int
    signals_today: int
    active_tickers: int
    alerts_today: int
    today_by_direction: Dict[str, int]
    top_tickers: List[Dict[str, Any]]

class RoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(user|admin)$")

class SettingsUpdate(BaseModel):
    settings: Dict[str, str]

class AlertHistoryOut(BaseModel):
    id: int
    ticker: str
    signal_type: str
    message: Optional[str] = None
    sent_at: Optional[str] = None


# ─── Cost Calculator Models ─────────────────────────────────────────

class CostRequest(BaseModel):
    entry_price: float = Field(..., gt=0)
    exit_price: float = Field(..., gt=0)
    quantity: int = Field(default=100, gt=0)
    ticker: str = Field(default="EQUITY")
    use_cea: Optional[bool] = None

class CostBreakdown(BaseModel):
    ticker: str
    entry_price: float
    exit_price: float
    quantity: int
    gross_investment: float
    gross_proceeds: float
    buy_fees: float
    sell_fees: float
    total_fees: float
    gross_profit: float
    gross_roi_pct: float
    tax_amount: float
    tax_shield_savings: float
    net_profit: float
    net_roi_pct: float
    is_cea: bool
