import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from src.storage.db import init_db
from src.api.auth import router as auth_router, ensure_admin_exists
from src.api.routes.signals import router as signals_router
from src.api.routes.screener import router as screener_router
from src.api.routes.market import router as market_router
from src.api.routes.admin import router as admin_router
from src.api.routes.watchlist import router as watchlist_router

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("BVMT_API")


@asynccontextmanager
async def lifespan(application: FastAPI):
    # ── Startup ──
    logger.info("🚀 BVMT Trading Assistant API starting up...")
    init_db()
    ensure_admin_exists()

    scheduler = None
    # Schedule daily screening at 14:30 CET (13:30 UTC)
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

        scheduler = BackgroundScheduler()

        def scheduled_screening():
            logger.info("⏰ Running scheduled daily screening...")
            from src.storage.db import create_screener_run, complete_screener_run, save_signal
            from src.data.data_fetcher import fetch_equity_history
            from src.engine.screener import evaluate_signals
            from config.settings import DEFAULT_WATCHLIST

            run_id = create_screener_run()
            total_signals = 0
            tickers_scanned = 0
            try:
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
                        logger.error(f"Screener error for {ticker}: {e}")
                complete_screener_run(run_id, tickers_scanned, total_signals, "completed")
                logger.info(f"✅ Screening completed: {tickers_scanned} tickers, {total_signals} signals")
            except Exception as e:
                complete_screener_run(run_id, tickers_scanned, total_signals, "failed", str(e))

        scheduler.add_job(
            scheduled_screening,
            CronTrigger(hour=13, minute=30, day_of_week="mon-fri"),
            id="daily_screening",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("📅 Daily screening scheduled for 14:30 CET (Mon-Fri)")
    except Exception as e:
        logger.warning(f"Scheduler setup skipped: {e}")

    logger.info("✅ BVMT API ready")
    yield
    # ── Shutdown ──
    logger.info("🛑 BVMT API shutting down...")
    try:
        scheduler.shutdown(wait=False)
    except Exception:
        pass


# ─── App Factory ─────────────────────────────────────────────────────

app = FastAPI(
    title="BVMT Trading Assistant",
    description="Automated quantitative trading assistant for the Bourse de Tunis (BVMT). "
                "Technical analysis, signal screening, cost calculation with CEA tax shield, and Telegram alerts.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(signals_router)
app.include_router(screener_router)
app.include_router(market_router)
app.include_router(admin_router)
app.include_router(watchlist_router)


# ─── Error Handlers ──────────────────────────────────────────────────

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": "Resource not found"})

@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ─── Health Check ────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "BVMT Trading Assistant",
        "version": "1.0.0",
    }


# ─── Serve Frontend Static Files ────────────────────────────────────

FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
