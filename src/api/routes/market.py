import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from src.api.auth import get_current_user
from src.api.models import MarketQuote, MarketHistory, TickerOverview, CostRequest, CostBreakdown
from config.settings import DEFAULT_WATCHLIST, TICKER_NAMES

logger = logging.getLogger("BVMT_API")

router = APIRouter(prefix="/api/market", tags=["Market Data"])


@router.get("/overview", response_model=list[TickerOverview])
async def market_overview(_user: dict = Depends(get_current_user)):
    """Returns a snapshot of all watched tickers with latest price + signal."""
    from src.data.data_fetcher import fetch_equity_history
    from src.engine.indicators import compute_technical_indicators
    from src.storage.db import get_latest_signals

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
    from src.data.data_fetcher import fetch_equity_history

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
    from src.data.data_fetcher import fetch_equity_history
    from src.engine.indicators import compute_technical_indicators

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
