# BVMT Trading Assistant (Bourse de Tunis)

An automated quantitative trading assistant, REST API backend, and modern web dashboard for the **Bourse des Valeurs Mobilières de Tunis (BVMT)**. It computes technical indicators, generates alpha signals, calculates true net ROI after broker commissions & CEA tax shield benefits, provides an admin and user dashboard, and delivers real-time notifications via Telegram.

---

## 🚀 Key Features

### 🌐 Frontend Dashboard (UI / UX)
- **Modern Dark Theme**: Financial terminal aesthetics with high-contrast emerald/teal accents, responsive layout, and mobile-friendly drawer.
- **Real-Time Market Status**: Live indicator tracking BVMT trading session hours (Monday–Friday 09:00–14:15 CET).
- **Executive Overview**: Total signals, today's signals, Buy/Sell/Watch distribution charts, and quick-action launcher.
- **Market Screener View**: Ticker cards showing prices, daily percentage change, volume, RSI gauge bars, and active alpha signals.
- **Interactive Signals Feed**: Full historical signals table with type badges, target price, stop-loss, and multi-parameter filters (Ticker, Direction, Signal Type).
- **Personal Watchlist**: Custom watchlist management with instant add/remove of tracked BVMT equities.
- **True-Cost Trade Calculator**: Interactive calculator modeling gross ROI vs net profit accounting for broker fees, TVA, and **Tunisian CEA (0% tax) tax shield savings**.
- **Admin Control Panel**:
  - **User Management**: View registered users, update roles (`user` ↔ `admin`), and delete accounts.
  - **Screener Control**: Trigger manual screener runs in the background, view run execution history and duration metrics.
  - **Alert Audit Log**: Complete history of Telegram alerts dispatched with timestamps.

### ⚡ Backend API (FastAPI)
- **High-Performance Async REST API** built with FastAPI and Pydantic v2.
- **JWT Authentication & RBAC**: Secure JSON Web Token authentication with bcrypt password hashing and role-based permissions (`admin` vs `user`).
- **Interactive API Documentation**: Swagger UI at `/api/docs` and ReDoc at `/api/redoc`.
- **Automated APScheduler**: Built-in cron scheduler running the screening pipeline every weekday at 14:30 CET (13:30 UTC) after market close.
- **Dual Serving**: FastAPI serves both the REST API endpoints (`/api/...`) and the production SPA frontend (`/`).

### 📊 Quantitative Alpha Engine & Cost Model
- **Equities Ingested**: `BIAT`, `SFBT`, `TJARI`, `BT`, `SAH`, `CC`, `TPR`, `OTH`, `ECYCL`, `UIB`, `BNA`, `BH`, `AB`, `ARTES`, `DH`.
- **Alpha Signals**:
  - **Golden Cross**: 20-day SMA crossing above 50-day SMA (Bullish reversal).
  - **RSI Oversold Bounce**: RSI(14) recovering from oversold territory (<30).
  - **Volume Breakout**: Volume > 1.5x 20-day average volume with positive momentum.
  - **Death Cross**: Bearish trend continuation (SMA 20 crossing below SMA 50).
  - **Overbought Warning**: RSI(14) > 70 caution alert.
- **True-Cost Financial Modeling**:
  - Broker Commission: `0.60%`
  - BVMT & STICODEVAM exchange duties: `0.15%`
  - TVA on broker commission: `19%`
  - **CEA (*Compte d'Épargne en Actions*) Tax Shield**: 0% capital gains tax vs standard 10% withholding.
- **Bilingual Telegram Notifications**: Auto-formatted HTML notifications delivered in English and Arabic.

---

## 📁 Project Structure

```
bvmt-assister/
│
├── config/
│   └── settings.py          # Watchlist, fee rates, technical & JWT settings
├── src/
│   ├── api/
│   │   ├── app.py           # FastAPI app, CORS, static mounting & APScheduler
│   │   ├── auth.py          # JWT tokens & bcrypt password hashing
│   │   ├── models.py        # Pydantic schemas (Request/Response validation)
│   │   └── routes/
│   │       ├── admin.py     # Admin stats, user management & settings
│   │       ├── market.py    # Market overview, quotes & cost calculator
│   │       ├── screener.py  # Manual trigger & run history
│   │       ├── signals.py   # Signal queries, filters & pagination
│   │       └── watchlist.py # User watchlist CRUD
│   ├── data/
│   │   └── data_fetcher.py  # Live BVMT OHLCV market data parser
│   ├── engine/
│   │   ├── indicators.py    # RSI, SMA20/50, Volume indicators
│   │   └── screener.py      # Quantitative signal detection
│   ├── finance/
│   │   └── cost_model.py    # True-Cost brokerage, TVA & CEA tax calculator
│   ├── storage/
│   │   └── db.py            # SQLite state persistence & user management
│   └── alerts/
│       └── telegram_bot.py  # Bilingual Telegram HTML notifications
│
├── frontend/
│   └── dist/
│       ├── index.html       # Single-page application UI
│       ├── css/
│       │   └── style.css    # Modern dark design system
│       └── js/
│           ├── api.js       # API client & JWT storage
│           ├── app.js       # App controller & auth navigation
│           └── pages.js     # Reactive page renderers
│
├── tests/
│   ├── test_engine.py       # Engine & finance unit tests
│   └── test_api.py          # API & authentication integration tests
├── .env                     # Configuration credentials
├── run_server.bat           # 1-click Web Dashboard & API launcher
├── run_screener.bat         # 1-click CLI screener script
├── Dockerfile               # Production container definition
├── docker-compose.yml       # Production Compose stack
└── requirements.txt         # Python dependencies
```

---

## ⚡ Quick Start

### 1. Launch the Full Web App & API Server

Double-click `run_server.bat` or run in terminal:

```bash
python -m uvicorn src.api.app:app --host 0.0.0.0 --port 8000 --reload
```

- **Web Dashboard**: [http://localhost:8000](http://localhost:8000)
- **Interactive API Docs (Swagger)**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- **Alternative Docs (ReDoc)**: [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)

### 2. Default Admin Credentials

| Field | Value |
| :--- | :--- |
| **Email** | `admin@bvmt.tn` |
| **Password** | `admin123` |
| **Role** | `admin` (Full access to User Management, Screener Control, and Alerts) |

*You can also register a standard `user` account directly from the frontend login screen.*

---

## 🧪 Testing

To run the complete test suite (unit and integration tests):

```bash
python -m unittest discover tests
```

---

## 🐳 Docker Deployment (Production Ready)

To deploy with Docker Compose:

```bash
docker-compose up -d --build
```

The container includes a built-in healthcheck verifying `/api/health` every 30 seconds.
