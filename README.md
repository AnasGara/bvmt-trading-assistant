# BVMT Trading Assistant (Bourse de Tunis)

An automated quantitative trading assistant and screener for the **Bourse des Valeurs Mobilières de Tunis (BVMT)**. It computes technical indicators, generates alpha signals, calculates true net ROI after broker commissions & CEA tax shield benefits, and delivers real-time notifications via Telegram.

---

## 🚀 Features

* **Live Market Ingestion**: Direct historical & daily quote parser fetching OHLCV data for all major BVMT equities (`BIAT`, `SFBT`, `TJARI`, `BT`, `SAH`, `TPR`, `OTH`, `DH`, etc.).
* **Technical Alpha Engine**:
  * **Golden Cross**: 20-day SMA crossing above 50-day SMA (Trend Reversal).
  * **RSI Oversold Bounce**: RSI(14) recovering from oversold conditions (<30).
  * **Volume Breakout**: Volume > 1.5x 20-day average volume with positive momentum.
  * **Overbought Warning**: RSI(14) > 70 caution alert.
* **True-Cost Financial Logic**:
  * Broker Commission (default: `0.60%`)
  * BVMT & STICODEVAM exchange fees (`0.15%`)
  * TVA on brokerage commission (`19%`)
  * **CEA (*Compte d'Épargne en Actions*) Tax Shield**: 0% capital gains tax vs standard 10% withholding.
* **SQLite State Persistence (`bvmt_state.db`)**: Tracks signals and avoids duplicate alerts within 24 hours.
* **Telegram Delivery**: Instant push alerts with target prices, stop-loss levels, and net returns.

---

## 📁 Project Structure

```
bvmt-assister/
│
├── config/
│   └── settings.py          # Watchlist, fee rates, technical parameters
├── src/
│   ├── data/
│   │   └── data_fetcher.py  # Live BVMT OHLCV market data parser
│   ├── engine/
│   │   ├── indicators.py    # RSI, SMA20/50, Volume indicators
│   │   └── screener.py      # Quantitative signal detection
│   ├── finance/
│   │   └── cost_model.py    # True-Cost brokerage, TVA & CEA tax calculator
│   ├── storage/
│   │   └── db.py            # SQLite state manager & alert deduplication
│   └── alerts/
│       └── telegram_bot.py  # Telegram HTML notification dispatcher
│
├── tests/
│   └── test_engine.py       # Unit test suite
├── .env                     # Bot token, Chat ID, and fee configuration
├── main.py                  # Screener entrypoint
├── run_screener.bat         # 1-click execution script for Windows
└── requirements.txt
```

---

## ⚙️ Configuration (`.env`)

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

BROKER_FEE_PCT=0.006          # 0.6% standard broker fee
EXCHANGE_FEE_PCT=0.0015       # 0.15% BVMT duties
TVA_PCT=0.19                  # 19% TVA on commission
USE_CEA_TAX_SHIELD=true       # true = CEA account (0% tax)
```

---

## 🧪 Running Manually

Double-click `run_screener.bat` or run:

```bash
python main.py
```

To run tests:
```bash
python -m unittest discover tests
```

---

## ⏰ Automated Daily Scheduling (Windows Task Scheduler)

BVMT closes around 14:15 CET, with fixings finalized by **14:30 CET**. To run automatically Monday to Friday:

1. Open **Windows Task Scheduler** (`taskschd.msc`).
2. Click **Create Basic Task...**
3. Name: `BVMT Trading Screener`
4. Trigger: **Weekly** -> Select **Monday to Friday** at **14:30**.
5. Action: **Start a program** -> Browse to `run_screener.bat`.
6. Finish.
