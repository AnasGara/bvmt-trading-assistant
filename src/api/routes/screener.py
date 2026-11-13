import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks

from src.api.auth import get_admin_user, get_current_user
from src.api.models import ScreenerRunOut, ScreenerStatus
from src.storage.db import (
    get_screener_runs, get_last_screener_run,
    create_screener_run, complete_screener_run, save_signal
)
from config.settings import DEFAULT_WATCHLIST, USE_CEA_TAX_SHIELD

logger = logging.getLogger("BVMT_API")

# Track if screener is currently running
_screener_running = False

router = APIRouter(prefix="/api/screener", tags=["Screener"])


def _run_screening_task(run_id: int):
    """Background task that runs the full screening pipeline."""
    global _screener_running
    _screener_running = True
    total_signals = 0
    tickers_scanned = 0

    try:
        from src.data.data_fetcher import fetch_equity_history
        from src.engine.screener import evaluate_signals
        from src.finance.cost_model import calculate_trade_cost

        for ticker in DEFAULT_WATCHLIST:
            try:
                df = fetch_equity_history(ticker, days=180)
                tickers_scanned += 1
                if df is None or df.empty:
                    continue

                signals = evaluate_signals(ticker, df)
                for signal in signals:
                    total_signals += 1
                    save_signal(
                        ticker=signal["ticker"],
                        signal_type=signal["signal_type"],
                        direction=signal["direction"],
                        price=signal["price"],
                        rsi=signal.get("rsi"),
                        sma_fast=signal.get("sma_fast"),
                        sma_slow=signal.get("sma_slow"),
                        target_price=signal.get("target_price"),
                        stop_loss=signal.get("stop_loss"),
                        description=signal.get("description"),
                    )
            except Exception as e:
                logger.error(f"Error screening {ticker}: {e}")

        complete_screener_run(run_id, tickers_scanned, total_signals, status="completed")
    except Exception as e:
        logger.error(f"Screener run {run_id} failed: {e}")
        complete_screener_run(run_id, tickers_scanned, total_signals, status="failed", error_message=str(e))
    finally:
        _screener_running = False


@router.post("/run", response_model=ScreenerRunOut)
async def trigger_screener(background_tasks: BackgroundTasks, _user: dict = Depends(get_admin_user)):
    global _screener_running
    if _screener_running:
        raise HTTPException(status_code=409, detail="Screener is already running")

    run_id = create_screener_run()
    background_tasks.add_task(_run_screening_task, run_id)

    from src.storage.db import get_connection
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM screener_runs WHERE id = ?", (run_id,))
        row = dict(cursor.fetchone())

    return ScreenerRunOut(**row)


@router.get("/status", response_model=ScreenerStatus)
async def screener_status(_user: dict = Depends(get_current_user)):
    last = get_last_screener_run()
    return ScreenerStatus(
        last_run=ScreenerRunOut(**last) if last else None,
        next_scheduled="14:30 CET (Mon-Fri)",
        is_running=_screener_running
    )


@router.get("/history", response_model=List[ScreenerRunOut])
async def screener_history(_user: dict = Depends(get_current_user)):
    runs = get_screener_runs(limit=50)
    return [ScreenerRunOut(**r) for r in runs]
