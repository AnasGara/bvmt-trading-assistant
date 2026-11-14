# 📈 BVMT Trading Assistant (Bourse de Tunis)

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.11+"/>
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18"/>
  <img src="https://img.shields.io/badge/Chart.js-4.4-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white" alt="Chart.js"/>
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/Telegram-Bot%20Alerts-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License"/>
</p>

An automated, quantitative trading assistant, REST API backend, and responsive web dashboard designed for the **Bourse des Valeurs Mobilières de Tunis (BVMT)**.

The platform scrapes real-time quotes from [Ilboursa](https://www.ilboursa.com), computes quantitative technical indicators (RSI, SMA 20/50, Volume Breakouts), screens all listed equities simultaneously, simulates true net ROI under the Tunisian **CEA (*Compte d'Épargne en Actions*) tax shield**, delivers personalized multi-user **Telegram alerts**, and provides an executive web dashboard with full mobile support.

---

## 🌟 Key Features

### 1. 📊 Cote Officielle A-Z (All 90 Listed Stocks)
- **Direct Ilboursa Scraper**: Live market feed capturing all 90 listed equities from `https://www.ilboursa.com/marches/aaz`.
- **Market Breadth Summary**: Real-time counter of stocks in rise (*Hausses*), drop (*Baisses*), and flat (*Inchangées*).
- **Search & Filter Tabs**: Instant filtering by ticker, company name, or category (*Toutes, Hausses, Baisses, Titres Échangés*).
- **Sortable Columns**: Sort by symbol, quotation, change %, or traded volume.

### 2. 📈 Interactive Stock Detail Modal with Chart & Variations
- **Dynamic Chart.js Visualizer**: Gradient price line with short-term (SMA 20) and medium-term (SMA 50) moving average overlays.
- **Timeframe Selector**: 1 Month (1M), 3 Months (3M), 6 Months (6M), 1 Year (1Y).
- **Historical Variations Matrix**: Scrapes `cotation_<TICKER>` variation tables across **1 Week, 1 Month, YTD, 1 Year, 3 Years, 5 Years, and 10 Years**.
- **1-Click Actions**: Direct links to Ilboursa, instant Add/Remove from Watchlist, and CEA Trade Simulator pre-filler.

### 3. 🤖 Quantitative Alpha Screener
- **Simultaneous Multi-Stock Screening**: Analyzes all equities independently; multiple stocks can be recommended concurrently if technical criteria trigger.
- **Automated Mon–Fri Execution**: Integrated APScheduler triggers automatically at **14:30 CET** (post BVMT session close).
- **Alpha Signals Detected**:
  - `GOLDEN_CROSS`: 20-day SMA crossing above 50-day SMA (Bullish reversal).
  - `OVERSOLD_BOUNCE`: RSI(14) rebounding from oversold zone (< 30).
  - `VOLUME_BREAKOUT`: Volume surge > 1.5× 20-day average volume with upward price action.
  - `DEATH_CROSS`: Bearish cross (SMA 20 falling below SMA 50).
  - `OVERBOUGHT_WARNING`: RSI(14) > 70 caution indicator.

### 4. 📅 Date-Grouped Recommendations & Management
- **Date Classification**: Group recommendations chronologically by date (`📅 Aujourd'hui`, `📅 Hier`, `📅 Date...`) with count badges, or toggle to a flat table view.
- **Sorting Toggle**: Switch between *Plus récent d'abord* (descending) and *Plus ancien d'abord* (ascending).
- **Deletion Controls**: Single-click trash button to remove obsolete signals, and a bulk **"Vider les Recommandations"** button.

### 5. 📱 Personalized Multi-User Telegram Alerts
- **Self-Service Configuration**: Each user can configure their **Full Name, Phone Number, and Telegram Chat ID** directly in their profile.
- **Live Test Message**: One-click verification button (`/api/auth/telegram-test`) delivering an instant test ping to the user's Telegram.
- **Broadcast on Screener Runs**: Automated screener runs broadcast signals directly to all users who have enabled Telegram notifications.
- **Interactive Guide**: Built-in 4-step setup instructions linking to `@userinfobot`.

### 6. 💰 True-Cost Financial Engine & CEA Tax Shield
Calculates realistic net gains after Tunisian banking and tax deductions:
- **Brokerage Commission**: `0.60%`
- **Exchange Fees (BVMT / STICODEVAM)**: `0.15%`
- **TVA on Commissions**: `19%`
- **CEA Advantage**: Models **0% capital gains tax** under the *Compte d'Épargne en Actions* regime vs the standard **10% withholding tax**, showing exact tax savings in TND.

### 7. 📱 Mobile-First Responsive Design
- **Bottom Navigation Bar**: Fixed mobile bottom bar ($\le 768\text{px}$) for single-thumb switching between *Accueil, Cote A-Z, Signaux, Favoris, and Telegram*.
- **Drawer Sidebar**: Sliding navigation drawer with blurred backdrop overlay (`.sidebar-backdrop`) and dedicated close button.
- **Adaptive Column Scaling**: Tables automatically hide non-critical columns on smartphones (`.col-hide-md` and `.col-hide-sm`) to keep essential stock metrics clear and readable.
- **Touch-Friendly & iOS Zoom Safe**: Minimum 16px font sizes prevent unwanted auto-zooming on iOS Safari.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph External["External Services"]
        IL["Ilboursa.com (Market Data & Variations)"]
        TG["Telegram Bot API"]
    end

    subgraph Backend["FastAPI Backend (src/api)"]
        APP["app.py (FastAPI App & Static Server)"]
        AUTH["auth.py (JWT & Bcrypt)"]
        SCHED["APScheduler (Mon-Fri 14:30 CET)"]
        
        subgraph Engine["Quantitative Engine"]
            SCR["screener.py"]
            IND["indicators.py (RSI, SMA20/50)"]
            COST["cost_model.py (Brokerage & CEA Tax)"]
            FETCH["data_fetcher.py (Ilboursa Scraper & Cache)"]
        end

        subgraph Storage["Persistence (SQLite)"]
            DB[("bvmt_state.db\nUsers, Signals, Watchlist, Alerts")]
        end
    end

    subgraph Frontend["React 18 SPA (frontend/dist)"]
        DASH["Executive Dashboard (Overview)"]
        AAZ["Cote A-Z (90 Stocks)"]
        MODAL["Stock Detail Modal + Chart.js"]
        SIG["Date-Grouped Signals"]
        CALC["CEA Cost Calculator"]
        PROF["User Profile & Telegram Config"]
        ADMIN["Admin Management"]
    end

    IL -->|Scrapes A-Z & Cotations| FETCH
    FETCH --> SCR
    SCR --> IND
    SCR --> COST
    SCR --> DB
    SCHED -->|Scheduled Execution| SCR
    SCR -->|Broadcasts Signals| TG
    APP --> AUTH
    APP --> Storage
    Frontend <-->|REST API (JWT Bearer)| APP
```

---

## 📁 Repository Structure

```
bvmt-assister/
│
├── config/
│   └── settings.py          # Watchlist, fee rates, technical & JWT settings
│
├── src/
│   ├── api/
│   │   ├── app.py           # FastAPI app, static file serving, APScheduler lifespan
│   │   ├── auth.py          # Direct bcrypt hashing, JWT token issue/verify
│   │   ├── models.py        # Pydantic v2 schemas for all requests/responses
│   │   └── routes/
│   │       ├── admin.py     # Admin metrics, user role management, alert history
│   │       ├── market.py    # A-Z stocks endpoint, stock detail, CEA cost calculator
│   │       ├── screener.py  # Background screener runner & run history
│   │       ├── signals.py   # Signal queries, date filters, single & bulk deletion
│   │       └── watchlist.py # User watchlist CRUD (supports all 90 tickers)
│   ├── data/
│   │   └── data_fetcher.py  # Scrapes Ilboursa A-Z, cotation variations & OHLCV history
│   ├── engine/
│   │   ├── indicators.py    # RSI(14), SMA 20, SMA 50 calculation
│   │   └── screener.py      # Quantitative signal detection rules
│   ├── finance/
│   │   └── cost_model.py    # Broker commission, TVA, and CEA tax calculations
│   ├── storage/
│   │   └── db.py            # SQLite schema migrations, user management & signals
│   └── alerts/
│       └── telegram_bot.py  # Telegram Bot API message dispatching
│
├── frontend/
│   └── dist/
│       ├── index.html       # HTML5 mount point (React 18, Babel, Chart.js, FontAwesome)
│       ├── css/
│       │   └── style.css    # Responsive dark financial theme & mobile rules
│       └── js/
│           ├── api.js       # Asynchronous API client with Bearer token handling
│           └── react-app.jsx # Full React 18 component tree
│
├── tests/
│   ├── test_engine.py       # Engine, indicators & finance unit tests
│   └── test_api.py          # FastAPI endpoints, auth & market integration tests
│
├── .env                     # Environment variables & secrets
├── Dockerfile               # Production multi-stage Docker container
├── docker-compose.yml       # Docker Compose service definition with healthcheck
├── render.yaml              # $0 Free-tier deployment blueprint for Render.com
├── run.py                   # Production Python entrypoint with dynamic $PORT binding
├── run_server.bat           # 1-Click Windows server launcher
├── run_screener.bat         # 1-Click CLI screener runner
└── requirements.txt         # Pinned Python package dependencies
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+ (recommended 3.11)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/yourusername/bvmt-assister.git
cd bvmt-assister

# Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file in the project root (or edit the existing one):
```ini
# Application Secrets
SECRET_KEY=your-super-secret-jwt-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Admin Default Account
ADMIN_EMAIL=admin@bvmt.tn
ADMIN_PASSWORD=admin123

# Telegram Bot Integration (Optional for local testing)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_DEFAULT_CHAT_ID=your_chat_id_here
```

### 3. Launch the Server

**On Windows (1-Click)**:
Double-click `run_server.bat` or run:
```bash
python run.py
```

**Using Uvicorn directly**:
```bash
python -m uvicorn src.api.app:app --host 0.0.0.0 --port 8000 --reload
```

- **Web Dashboard**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger API Docs**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- **ReDoc Documentation**: [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)

---

## 🤖 Telegram Notifications Setup Guide

To receive automated notifications for your account:

1. **Start the Bot**: Open Telegram and search for your configured bot (or the shared bot), then press **Start**.
2. **Find your Chat ID**: Start a chat with [`@userinfobot`](https://t.me/userinfobot) on Telegram to get your numeric Chat ID (e.g. `123456789`).
3. **Configure in App**:
   - Log into the BVMT Trading Assistant.
   - Click on your avatar or navigate to **Profil & Telegram**.
   - Enter your **Nom**, **Téléphone**, and paste your **Chat ID**.
   - Check **Activer les notifications Telegram** and click **Enregistrer mon Profil**.
4. **Test the Connection**: Click **Envoyer un Message de Test** to verify instant message delivery.

---

## 🌐 Zero-Dollar ($0) Cloud Deployment Guide

### Why Render.com / VPS instead of Vercel?
| Requirement | Vercel Serverless | Render.com (Web Service) | VPS / Docker |
| :--- | :--- | :--- | :--- |
| **Cost** | Free | **$0 (Free Tier)** | \$3–\$5/mo |
| **Persistent SQLite (`bvmt_state.db`)** | ❌ Wiped on spin-down | ✅ Preserved during runtime | ✅ Full control |
| **Cron Scheduler (14:30 CET)** | ❌ Needs external cron | ✅ Native in-process APScheduler | ✅ In-process or host cron |
| **Scraper Timeout Limit** | ❌ 10–15s max | ✅ No strict timeout | ✅ Unlimited |

### Deploy on Render.com in 3 Minutes:
1. Push your repository to **GitHub**.
2. Go to [Render.com](https://dashboard.render.com/) and click **New → Blueprint**.
3. Select your GitHub repository. Render automatically reads [render.yaml](file:///render.yaml):
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python run.py`
4. Set your environment variables (`SECRET_KEY`, `ADMIN_PASSWORD`, etc.) in the Render dashboard.
5. Click **Apply**. Your app is live with free SSL!

---

## 🐳 Docker Deployment

Deploy in production using Docker Compose:

```bash
# Build and run containers in detached mode
docker-compose up -d --build

# View container logs
docker-compose logs -f

# Check health status
docker-compose ps
```

The container automatically checks `/api/health` every 30 seconds.

---

## 🧪 Testing

The repository contains 14 unit and integration tests covering data extraction, indicator calculations, CEA tax shield math, authentication, and REST endpoints:

```bash
python -m unittest discover tests
```

Output:
```
Ran 14 tests in 6.2s
OK
```

---

## 🔌 API Reference Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token | No |
| `GET` | `/api/auth/me` | Current authenticated user info | Bearer JWT |
| `PUT` | `/api/auth/profile` | Update profile (Name, phone, Telegram Chat ID) | Bearer JWT |
| `POST` | `/api/auth/telegram-test` | Dispatch live test alert to user's Telegram | Bearer JWT |
| `GET` | `/api/market/stocks` | Scraped list of all 90 listed equities from Ilboursa A-Z | Bearer JWT |
| `GET` | `/api/market/stocks/{ticker}` | Stock quote, historical variations & OHLCV history | Bearer JWT |
| `POST` | `/api/market/cost-calculator` | Compute brokerage fees and CEA tax shield benefit | Bearer JWT |
| `GET` | `/api/signals` | Paginated & filtered signals (`sort_order=asc\|desc`) | Bearer JWT |
| `DELETE` | `/api/signals/{id}` | Delete a specific recommendation | Bearer JWT |
| `DELETE` | `/api/signals` | Bulk delete all recommendations | Bearer JWT |
| `GET` | `/api/watchlist` | Retrieve user's tracked tickers | Bearer JWT |
| `POST` | `/api/watchlist` | Add a ticker to user watchlist | Bearer JWT |
| `DELETE` | `/api/watchlist/{ticker}` | Remove a ticker from watchlist | Bearer JWT |
| `POST` | `/api/screener/run` | Trigger background market screening | Admin only |
| `GET` | `/api/admin/stats` | Executive administration statistics | Admin only |
| `GET` | `/api/health` | Service health status | No |

---

## ⚖️ Disclaimer

*This application is an educational and quantitative analysis tool. It does not constitute financial, investment, or legal advice. Trading on the Bourse de Tunis (BVMT) involves risks of capital loss. Historical indicator performance does not guarantee future market returns.*

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
