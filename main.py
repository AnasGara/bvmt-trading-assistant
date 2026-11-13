import os
import sys
import logging
from typing import List

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("BVMT_Assistant")

from config.settings import DEFAULT_WATCHLIST, USE_CEA_TAX_SHIELD
from src.storage.db import init_db, should_send_alert, record_alert, save_signal
from src.data.data_fetcher import fetch_equity_history
from src.engine.screener import evaluate_signals
from src.finance.cost_model import calculate_trade_cost
from src.alerts.telegram_bot import send_telegram_message, format_signal_message

def run_screener(tickers: List[str] = None, send_alerts: bool = True):
    """
    Executes the automated daily screening workflow:
    1. Fetches market data for BVMT equities
    2. Runs technical indicator analysis
    3. Screens for alpha signals (Golden Cross, Oversold, Volume spikes)
    4. Computes True-Cost net returns & CEA tax advantages
    5. Stores state in SQLite and dispatches Telegram notifications
    """
    init_db()
    watchlist = tickers or DEFAULT_WATCHLIST
    logger.info(f"Starting BVMT Screening for {len(watchlist)} tickers: {', '.join(watchlist)}")
    
    total_signals_found = 0

    for ticker in watchlist:
        try:
            logger.info(f"Analyzing {ticker.upper()}...")
            df = fetch_equity_history(ticker, days=180)
            if df is None or df.empty:
                logger.warning(f"Could not retrieve historical data for {ticker.upper()}")
                continue
                
            signals = evaluate_signals(ticker, df)
            
            for signal in signals:
                total_signals_found += 1
                logger.info(f"==> Signal detected: {signal['ticker']} -> {signal['signal_type']} ({signal['direction']}) at {signal['price']:.3f} TND")
                
                # Financial True-Cost calculation
                cost_info = None
                if signal.get("target_price"):
                    cost_info = calculate_trade_cost(
                        entry_price=signal["price"],
                        exit_price=signal["target_price"],
                        quantity=100,
                        ticker=signal["ticker"],
                        use_cea=USE_CEA_TAX_SHIELD
                    )
                
                # Persist to SQLite
                save_signal(
                    ticker=signal["ticker"],
                    signal_type=signal["signal_type"],
                    direction=signal["direction"],
                    price=signal["price"],
                    rsi=signal.get("rsi"),
                    sma_fast=signal.get("sma_fast"),
                    sma_slow=signal.get("sma_slow"),
                    target_price=signal.get("target_price"),
                    stop_loss=signal.get("stop_loss")
                )
                
                # Telegram Alerting
                if send_alerts:
                    if should_send_alert(signal["ticker"], signal["signal_type"]):
                        message = format_signal_message(signal, cost_info)
                        success = send_telegram_message(message)
                        if success:
                            logger.info(f"Telegram alert delivered for {signal['ticker']}")
                            record_alert(signal["ticker"], signal["signal_type"], message)
                        else:
                            logger.warning(f"Telegram alert delivery skipped or failed for {signal['ticker']}")
                    else:
                        logger.info(f"Alert for {signal['ticker']} ({signal['signal_type']}) was recently sent; skipping duplicate.")
                        
        except Exception as e:
            logger.error(f"Error processing {ticker}: {e}")

    logger.info(f"Screening complete. Total signals evaluated: {total_signals_found}")

if __name__ == "__main__":
    run_screener()
