import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query

from src.api.auth import get_current_user
from src.api.models import MarketQuote, MarketHistory, TickerOverview, CostRequest, CostBreakdown
from src.data.data_fetcher import fetch_aaz_stocks, fetch_stock_variations, fetch_equity_history
from src.engine.indicators import compute_technical_indicators
from src.storage.db import get_latest_signals
from config.settings import DEFAULT_WATCHLIST, TICKER_NAMES

logger = logging.getLogger("BVMT_API")

router = APIRouter(prefix="/api/market", tags=["Market Data"])


@router.get("/stocks", response_model=List[Dict[str, Any]])
async def list_aaz_stocks(
    refresh: bool = Query(False),
    _user: dict = Depends(get_current_user)
):
    """
    Returns the complete list of all stocks traded on BVMT from Ilboursa A-Z
    (https://www.ilboursa.com/marches/aaz)
    """
    stocks = fetch_aaz_stocks(force_refresh=refresh)
    return stocks


@router.get("/stocks/{ticker}")
async def get_stock_detail(
    ticker: str,
    days: int = Query(180, ge=14, le=365),
    _user: dict = Depends(get_current_user)
):
    """
    Returns full stock details including:
    - Current quote metrics (open, high, low, last, volume, variation)
    - Historical variation table (1 week, 1 month, YTD, 1 year, 3 years, 5 years)
    - OHLCV price history & technical indicators (SMA20, SMA50, RSI14)
    - Latest active trading signal (if any)
    """
    symbol = ticker.upper().strip()

    # 1. Look up live quote from A-Z list
    all_stocks = fetch_aaz_stocks()
    quote = next((s for s in all_stocks if s["ticker"].upper() == symbol), None)

    # 2. Historical variations
    variations = fetch_stock_variations(symbol)

    # 3. OHLCV history with indicators
    df = fetch_equity_history(symbol, days=days)
    history_records = []
    current_rsi = None
    current_sma_fast = None
    current_sma_slow = None

    if df is not None and not df.empty:
        data = compute_technical_indicators(df)
        for _, row in data.iterrows():
            history_records.append({
                "date": str(row.get("Date", ""))[:10],
                "close": round(float(row["Close"]), 3),
                "open": round(float(row.get("Open", 0)), 3),
                "high": round(float(row.get("High", 0)), 3),
                "low": round(float(row.get("Low", 0)), 3),
                "volume": float(row.get("Vol", 0)),
                "rsi": round(float(row.get("RSI_14", 0)), 1),
                "sma_20": round(float(row.get("SMA_20", 0)), 3),
                "sma_50": round(float(row.get("SMA_50", 0)), 3),
            })
        latest_row = data.iloc[-1]
        current_rsi = round(float(latest_row.get("RSI_14", 0)), 1)
        current_sma_fast = round(float(latest_row.get("SMA_20", 0)), 3)
        current_sma_slow = round(float(latest_row.get("SMA_50", 0)), 3)

        if not quote:
            # Fallback quote from history if not in A-Z table
            prev_close = float(data.iloc[-2]["Close"]) if len(data) >= 2 else float(latest_row["Close"])
            close_price = float(latest_row["Close"])
            chg = ((close_price - prev_close) / prev_close * 100) if prev_close > 0 else 0.0
            quote = {
                "ticker": symbol,
                "name": TICKER_NAMES.get(symbol, symbol),
                "last": round(close_price, 3),
                "open": round(float(latest_row.get("Open", 0)), 3),
                "high": round(float(latest_row.get("High", 0)), 3),
                "low": round(float(latest_row.get("Low", 0)), 3),
                "volume_shares": int(latest_row.get("Vol", 0)),
                "volume_tnd": 0.0,
                "change_pct": round(chg, 2),
                "cotation_url": f"https://www.ilboursa.com/marches/cotation_{symbol}"
            }

    if not quote and not history_records:
        raise HTTPException(status_code=404, detail=f"Stock '{symbol}' not found on BVMT")

    # 4. Check active signals
    latest_signals = {s["ticker"]: s for s in get_latest_signals()}
    sig = latest_signals.get(symbol)

    return {
        "stock": quote,
        "variations": variations,
        "indicators": {
            "rsi": current_rsi,
            "sma_20": current_sma_fast,
            "sma_50": current_sma_slow,
        },
        "signal": sig,
        "history": history_records
    }


@router.get("/overview", response_model=list[TickerOverview])
async def market_overview(_user: dict = Depends(get_current_user)):
    """Returns a snapshot of watched tickers with latest price + signal."""
    latest_signals = {s["ticker"]: s for s in get_latest_signals()}
    results = []

    for ticker in DEFAULT_WATCHLIST:
        try:
            df = fetch_equity_history(ticker, days=60)
            if df is None or df.empty:
                continue

            data = compute_technical_indicators(df)
            curr = data.iloc[-1]
            prev = data.iloc[-2] if len(data) >= 2 else curr

            close = float(curr["Close"])
            prev_close = float(prev["Close"])
            change_pct = ((close - prev_close) / prev_close * 100) if prev_close > 0 else 0.0

            sig = latest_signals.get(ticker.upper())
            results.append(TickerOverview(
                ticker=ticker.upper(),
                name=TICKER_NAMES.get(ticker.upper(), ticker),
                close=round(close, 3),
                change_pct=round(change_pct, 2),
                volume=float(curr.get("Vol", 0)),
                rsi=round(float(curr.get("RSI_14", 0)), 1),
                sma_fast=round(float(curr.get("SMA_20", 0)), 3),
                sma_slow=round(float(curr.get("SMA_50", 0)), 3),
                latest_signal=sig["signal_type"] if sig else None,
                latest_direction=sig["direction"] if sig else None,
            ))
        except Exception as e:
            logger.warning(f"Error fetching overview for {ticker}: {e}")

    return results


@router.get("/{ticker}/quote", response_model=MarketQuote)
async def get_quote(ticker: str, _user: dict = Depends(get_current_user)):
    df = fetch_equity_history(ticker, days=10)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"No data available for {ticker.upper()}")

    curr = df.iloc[-1]
    prev = df.iloc[-2] if len(df) >= 2 else curr
    close = float(curr["Close"])
    prev_close = float(prev["Close"])
    change_pct = ((close - prev_close) / prev_close * 100) if prev_close > 0 else 0.0

    return MarketQuote(
        ticker=ticker.upper(),
        name=TICKER_NAMES.get(ticker.upper(), ticker.upper()),
        close=round(close, 3),
        open=round(float(curr.get("Open", 0)), 3),
        high=round(float(curr.get("High", 0)), 3),
        low=round(float(curr.get("Low", 0)), 3),
        volume=float(curr.get("Vol", 0)),
        change_pct=round(change_pct, 2),
        date=str(curr.get("Date", ""))
    )


@router.get("/{ticker}/history", response_model=MarketHistory)
async def get_history(
    ticker: str,
    days: int = Query(180, ge=7, le=365),
    _user: dict = Depends(get_current_user)
):
    df = fetch_equity_history(ticker, days=days)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"No historical data for {ticker.upper()}")

    data = compute_technical_indicators(df)
    records = []
    for _, row in data.iterrows():
        records.append({
            "date": str(row.get("Date", "")),
            "close": round(float(row["Close"]), 3),
            "open": round(float(row.get("Open", 0)), 3),
            "high": round(float(row.get("High", 0)), 3),
            "low": round(float(row.get("Low", 0)), 3),
            "volume": float(row.get("Vol", 0)),
            "rsi": round(float(row.get("RSI_14", 0)), 1),
            "sma_20": round(float(row.get("SMA_20", 0)), 3),
            "sma_50": round(float(row.get("SMA_50", 0)), 3),
        })

    return MarketHistory(ticker=ticker.upper(), data=records)


@router.post("/cost-calculator", response_model=CostBreakdown)
async def calculate_cost(req: CostRequest, _user: dict = Depends(get_current_user)):
    from src.finance.cost_model import calculate_trade_cost
    result = calculate_trade_cost(
        entry_price=req.entry_price,
        exit_price=req.exit_price,
        quantity=req.quantity,
        ticker=req.ticker,
        use_cea=req.use_cea
    )
    return CostBreakdown(
        ticker=result.ticker,
        entry_price=result.entry_price,
        exit_price=result.exit_price,
        quantity=result.quantity,
        gross_investment=result.gross_investment,
        gross_proceeds=result.gross_proceeds,
        buy_fees=result.buy_fees,
        sell_fees=result.sell_fees,
        total_fees=result.total_fees,
        gross_profit=result.gross_profit,
        gross_roi_pct=result.gross_roi_pct,
        tax_amount=result.tax_amount,
        tax_shield_savings=result.tax_shield_savings,
        net_profit=result.net_profit,
        net_roi_pct=result.net_roi_pct,
        is_cea=result.is_cea,
    )
