# **BVMT Trading Assistant Specification**

# **Technical & Financial Architecture Document**

## **System Overview**

The BVMT Trading Assistant is an automated system designed to analyze the Bourse de Tunis (BVMT), generate quantitative and AI-driven trading signals, deliver real-time notifications via Telegram, and compute true net returns after accounting for transaction costs and tax considerations.

```
       +-------------------------------------------------------+

```

       \|             Phase 1: Local Architecture               \|  
       \+---------------------------+---------------------------+  
                                   \|  
         \+-------------------------+-------------------------+  
         \|                         \|                         \|  
         v                         v                         v  
\+------------------+     \+-------------------+     \+-------------------+  
\| Python Alpha     \|     \| Local Scheduler   \|     \| True-Cost         \|  
\| Engine           \|     \| & Alerts          \|     \| Portfolio Logic   \|  
\| \- PyBVMT Data    \|     \| \- OS Cron / Task  \|     \| \- BVMT & Broker   \|  
\| \- pandas-ta      \|     \| \- Telegram Bot API\|     \| \- Net ROI / Fees  \|  
\| \- Rule Screening \|     \| \- SQLite State    \|     \| \- CEA Tax Shield  \|

```
+------------------+     +-------------------+     +-------------------+
```

---

# **Phase 1: MVP (Free & Local)**

Phase 1 focuses on building a zero-cost, fully automated MVP running locally. It replaces paid cloud services and external AI APIs with open-source tools and local execution.

## **Module 1: Rule-Based Alpha Engine**

The Alpha Engine handles market data ingestion, technical analysis computation, and rule-based screening without relying on paid AI services.

### **Data Ingestion Architecture**

* Historical Data: Leverages PyBVMT for long-term historical trends, backtesting quantitative models, and establishing baseline indicators.  
* Real-Time & Intraday Data: Handles live market movements across phases:  
  * Phase 1 (MVP): Relies on delayed intraday polling, taking into account the 15-minute delay inherent to the official public BVMT feed.  
  * Phase 2 (Cloud): Upgrades to institutional real-time feeds (such as the ICE Data API) to support zero-latency execution and instant signal generation.

### **Data Ingestion & Technical Indicators**

* Data Fetching: Utilizes PyBVMT to pull historical OHLCV data for listed Tunis Stock Exchange equities.  
* Technical Analysis: Implements pandas-ta to calculate key technical indicators:  
  * Relative Strength Index (RSI): 14-period RSI to detect overbought (\$RSI \> 70\$) or oversold (\$RSI \< 30\$) conditions.  
  * Moving Average Crossovers: 20-day Simple Moving Average (SMA\_20) and 50-day Simple Moving Average (SMA\_50) to identify trend direction and momentum shifts.  
* Rule-Based Screening: Replaces AI screening with deterministic signals based strictly on quantitative thresholds (e.g., golden crosses, RSI oversold recovery, volume spikes).

## **Module 2: Local Script & Telegram Alerts**

The alerting pipeline runs locally via system scheduled tasks and uses standard Telegram Bot APIs.

| Component | Function / Configuration |
| :---- | :---- |
| OS Cron / Task Scheduler | System cron job configured for 14:30 CET daily market close check (e.g., \`30 14 \* \* 1-5\`). |
| Local Python Runner | Python script executed locally to pull data, compute indicators, evaluate signals, and invoke alerts. |
| SQLite Database | Local \`bvmt\_state.db\` file storing last alert state, previous signal statuses, and price targets. |
| Telegram API | Free Telegram Bot API sending structured Markdown payloads to designated chat IDs. |

# **Phase 2: Cloud Scaling & AI**

In Phase 2, the system transitions to cloud infrastructure and AI-augmented screening for increased scalability and qualitative sentiment analysis.

## **Module 1: Cloud Alpha Engine & AI Stock Screening**

* OpenAI API Integration: Integrates \`gpt-4o\` or structured output models to interpret daily trading metrics alongside market news digests.  
* Screening Criteria: Filters candidates based on technical setups (e.g., golden crosses, bullish divergence) combined with fundamental metrics like Dividend Yield and Price-to-Earnings (P/E) ratios relative to sector averages.

## **Module 2: Serverless Telegram Alerts**

The alerting infrastructure is fully serverless on AWS, ensuring high availability and zero idle costs.

| Component | Function / Configuration |
| :---- | :---- |
| AWS EventBridge | Cron trigger configured for \`cron(30 13 ? \* MON-FRI \*)\` (14:30 CET daily market close check). |
| AWS Lambda | Python 3.11 runtime. Executes the signal engine, evaluates alerts, and calls external APIs. |
| AWS DynamoDB | \`BVMT\_State\` table storing last alert state, previous signal statuses, and target price triggers. |
| Telegram API | Bot API sending structured Markdown payload responses to authorized chat IDs. |

