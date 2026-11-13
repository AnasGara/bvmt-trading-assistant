import requests
import logging
import html
from typing import Optional, Dict, Any
from config.settings import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

TICKER_NAMES = {
    "BIAT": ("Banque Internationale Arabe de Tunisie", "بنك تونس العربي الدولي"),
    "SFBT": ("Société Frigorifique et Brasserie de Tunis", "شركة صنع المشروبات بتونس"),
    "TJARI": ("Attijari Bank", "التجاري بنك"),
    "BT": ("Banque de Tunisie", "بنك تونس"),
    "SAH": ("SAH Lilas", "سيلكودال (ليلاس)"),
    "CC": ("Carthage Cement", "إسمنت قرطاج"),
    "TPR": ("Tunisie Profilés Aluminium", "تونيزي بروفيليه ألمنيوم"),
    "OTH": ("One Tech Holding", "ون تيك القابضة"),
    "ECYCL": ("Euro-Cycles", "أورو-سيكل"),
    "UIB": ("Union Internationale de Banques", "الاتحاد الدولي للبنوك"),
    "BNA": ("Banque Nationale Agricole", "البنك الوطني الفلاحي"),
    "BH": ("BH Bank", "بنك الإسكان"),
    "AB": ("Amen Bank", "بنك الأمان"),
    "ARTES": ("ARTES Automobiles", "أرتيس للسيارات"),
    "DH": ("Délice Holding", "دليس القابضة"),
}

SIGNAL_METADATA = {
    "GOLDEN_CROSS": {
        "en_type": "Golden Cross (Bullish Reversal)",
        "ar_type": "تقاطع ذهبي صاعد",
        "en_desc": "Fast SMA (20) crossed above Slow SMA (50), indicating a strong bullish trend reversal.",
        "ar_desc": "تقاطع المتوسط المتحرك السريع (20) فوق البطيء (50) مؤشراً على بداية مسار صعودي قوي."
    },
    "OVERSOLD_BOUNCE": {
        "en_type": "Oversold Bounce (RSI Recovery)",
        "ar_type": "ارتداد من ذروة البيع",
        "en_desc": "RSI recovered from oversold levels (< 30), signaling renewed buying momentum.",
        "ar_desc": "ارتداد إيجابي لمؤشر RSI من منطقة ذروة البيع واستعادة الزخم الصعودي."
    },
    "VOLUME_BREAKOUT": {
        "en_type": "Volume Breakout (Momentum Surge)",
        "ar_type": "اختراق مع ارتفاع أحجام التداول",
        "en_desc": "Volume surged above 1.5x average with positive price momentum.",
        "ar_desc": "ارتفاع غير معتاد في أحجام التداول مترافقاً مع حركة سعرية إيجابية."
    },
    "DEATH_CROSS": {
        "en_type": "Death Cross (Bearish Trend)",
        "ar_type": "تقاطع هبوطي",
        "en_desc": "Fast SMA (20) crossed below Slow SMA (50), signaling bearish continuation.",
        "ar_desc": "تقاطع سلبي للمتوسطات المتحركة ينذر باستمرار الاتجاه الهابط."
    },
    "OVERBOUGHT_WARNING": {
        "en_type": "Overbought Caution (RSI > 70)",
        "ar_type": "تنبيه تشبع شرائي (RSI مرتفع)",
        "en_desc": "RSI is in overbought territory (> 70). Elevated probability of pullback or profit taking.",
        "ar_desc": "مؤشر RSI تجاوز مستوى 70، مما يشير إلى تشبع شرائي واحتمالية حدوث تصحيح أو جني أرباح."
    }
}

ACTION_TRANSLATION = {
    "BUY": ("BUY 🟢", "شراء 🟢"),
    "SELL": ("SELL 🔴", "بيع 🔴"),
    "WATCH": ("WATCH 🟡", "متابعة / حذر 🟡")
}

def send_telegram_message(message: str, chat_id: Optional[str] = None, parse_mode: str = "HTML") -> bool:
    """
    Sends a formatted message to the user via Telegram Bot API using HTML format.
    """
    target_chat_id = chat_id or TELEGRAM_CHAT_ID
    if not target_chat_id:
        logger.warning("No Telegram Chat ID found.")
        return False

    url = f"{TELEGRAM_API_BASE}/sendMessage"
    payload = {
        "chat_id": str(target_chat_id),
        "text": message,
        "parse_mode": parse_mode
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        result = response.json()
        if result.get("ok"):
            return True
        else:
            logger.error(f"Telegram API error: {result}")
            return False
    except Exception as e:
        logger.error(f"Failed to deliver Telegram message: {e}")
        return False

def format_signal_message(signal: Dict[str, Any], cost_info: Optional[Any] = None) -> str:
    """
    Formats a quantitative trading signal into a single bilingual (English + Arabic) notification.
    """
    ticker = signal['ticker'].upper()
    name_tuple = TICKER_NAMES.get(ticker, (ticker, ticker))
    name_en, name_ar = name_tuple[0], name_tuple[1]
    
    direction_code = signal['direction']
    sig_type_code = signal['signal_type']
    
    action_en, action_ar = ACTION_TRANSLATION.get(direction_code, (direction_code, direction_code))
    
    meta = SIGNAL_METADATA.get(sig_type_code, {
        "en_type": sig_type_code,
        "ar_type": sig_type_code,
        "en_desc": signal.get('description', ''),
        "ar_desc": signal.get('description', '')
    })
    
    direction_emoji = "🟢" if direction_code == "BUY" else ("🔴" if direction_code == "SELL" else "🟡")
    
    price = signal['price']
    rsi = signal.get('rsi', 0.0)
    sma_fast = signal.get('sma_fast', 0.0)
    sma_slow = signal.get('sma_slow', 0.0)
    target = signal.get('target_price')
    stop = signal.get('stop_loss')

    lines = [
        f"{direction_emoji} <b>BVMT SIGNAL ALERT | إشارة تداول بورصة تونس</b>",
        f"🏛️ <b>{html.escape(ticker)} — {html.escape(name_en)}</b>",
        f"🇹🇳 <i>{html.escape(name_ar)}</i>",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
        "🇬🇧 <b>ENGLISH</b>",
        f"• <b>Action:</b> <code>{html.escape(action_en)}</code>",
        f"• <b>Signal:</b> <code>{html.escape(meta['en_type'])}</code>",
        f"• <b>Current Price:</b> <code>{price:.3f} TND</code>",
        f"• <b>RSI (14):</b> <code>{rsi:.1f}</code>",
        f"• <b>SMA (20 / 50):</b> <code>{sma_fast:.3f} / {sma_slow:.3f}</code>"
    ]
    
    if target:
        lines.append(f"• <b>Target Price:</b> <code>{target:.3f} TND</code>")
    if stop:
        lines.append(f"• <b>Stop Loss:</b> <code>{stop:.3f} TND</code>")
        
    if meta['en_desc']:
        lines.append(f"💡 <i>{html.escape(meta['en_desc'])}</i>")

    if cost_info:
        cea_en = f"Exempt 🛡️ (Saved {cost_info.tax_shield_savings:.3f} TND)" if cost_info.is_cea else f"Tax: {cost_info.tax_amount:.3f} TND"
        lines.extend([
            "📊 <b>Financial Analysis (True-Cost):</b>",
            f"• <b>Gross ROI:</b> <code>{cost_info.gross_roi_pct:+.2f}%</code> | <b>Net ROI:</b> <code>{cost_info.net_roi_pct:+.2f}%</code>",
            f"• <b>Roundtrip Fees:</b> <code>{cost_info.total_fees:.3f} TND</code> (Broker & duties)",
            f"• <b>CEA Tax Shield:</b> <code>{cea_en}</code>"
        ])

    lines.extend([
        "",
        "───────────────────────────",
        "",
        "🇹🇳 <b>العربية (ARABIC)</b>",
        f"• <b>الإجراء:</b> <code>{html.escape(action_ar)}</code>",
        f"• <b>نوع الإشارة:</b> <code>{html.escape(meta['ar_type'])}</code>",
        f"• <b>السعر الحالي:</b> <code>{price:.3f} د.ت</code>",
        f"• <b>مؤشر القوة (RSI 14):</b> <code>{rsi:.1f}</code>",
        f"• <b>المتوسطات SMA (20/50):</b> <code>{sma_fast:.3f} / {sma_slow:.3f}</code>"
    ]
    )

    if target:
        lines.append(f"• <b>الهدف المتوقع:</b> <code>{target:.3f} د.ت</code>")
    if stop:
        lines.append(f"• <b>وقف الخسارة:</b> <code>{stop:.3f} د.ت</code>")
        
    if meta['ar_desc']:
        lines.append(f"💡 <i>{html.escape(meta['ar_desc'])}</i>")

    if cost_info:
        cea_ar = f"معفى من الضريبة 🛡️ (توفير {cost_info.tax_shield_savings:.3f} د.ت)" if cost_info.is_cea else f"الضريبة: {cost_info.tax_amount:.3f} د.ت"
        lines.extend([
            "📊 <b>التحليل المالي والربح الصافي:</b>",
            f"• <b>العائد الإجمالي:</b> <code>{cost_info.gross_roi_pct:+.2f}%</code> | <b>العائد الصافي:</b> <code>{cost_info.net_roi_pct:+.2f}%</code>",
            f"• <b>مجموع المصاريف:</b> <code>{cost_info.total_fees:.3f} د.ت</code> (عمولة الوسيط والبورصة)",
            f"• <b>حساب الأسهم CEA:</b> <code>{cea_ar}</code>"
        ])

    lines.extend([
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "🤖 <i>BVMT Trading Assistant | المساعد الآلي لبورصة تونس</i>"
    ])

    return "\n".join(lines)
