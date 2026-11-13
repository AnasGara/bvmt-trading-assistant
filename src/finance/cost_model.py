from dataclasses import dataclass
from typing import Optional
from config.settings import (
    BROKER_FEE_PCT,
    EXCHANGE_FEE_PCT,
    TVA_PCT,
    USE_CEA_TAX_SHIELD,
    STANDARD_TAX_RATE
)

@dataclass
class TradeCostBreakdown:
    ticker: str
    entry_price: float
    exit_price: float
    quantity: int
    gross_investment: float
    gross_proceeds: float
    buy_fees: float
    sell_fees: float
    total_fees: float
    gross_profit: float
    gross_roi_pct: float
    tax_amount: float
    tax_shield_savings: float
    net_profit: float
    net_roi_pct: float
    is_cea: bool

def compute_side_fees(gross_amount: float, broker_rate: float = BROKER_FEE_PCT, exchange_rate: float = EXCHANGE_FEE_PCT, tva_rate: float = TVA_PCT) -> float:
    """
    Computes single-side fees (buy or sell) on Tunis Stock Exchange:
    - Broker Commission = gross * broker_rate
    - TVA on Broker Commission = commission * tva_rate (19%)
    - BVMT & STICODEVAM fee = gross * exchange_rate (0.15%)
    """
    broker_fee = gross_amount * broker_rate
    tva = broker_fee * tva_rate
    exchange_fee = gross_amount * exchange_rate
    return broker_fee + tva + exchange_fee

def calculate_trade_cost(
    entry_price: float,
    exit_price: float,
    quantity: int = 100,
    ticker: str = "EQUITY",
    use_cea: Optional[bool] = None
) -> TradeCostBreakdown:
    """
    Computes the true net return of a trade considering:
    1. Broker commission & TVA
    2. BVMT exchange duties
    3. Tunisian CEA (Compte d'Épargne en Actions) tax exemptions vs 10% standard capital gains tax
    """
    if use_cea is None:
        use_cea = USE_CEA_TAX_SHIELD

    gross_investment = entry_price * quantity
    gross_proceeds = exit_price * quantity
    gross_profit = gross_proceeds - gross_investment
    gross_roi_pct = ((exit_price - entry_price) / entry_price) * 100 if entry_price > 0 else 0.0

    buy_fees = compute_side_fees(gross_investment)
    sell_fees = compute_side_fees(gross_proceeds)
    total_fees = buy_fees + sell_fees

    net_before_tax = gross_profit - total_fees

    # CEA Tax Shield Logic:
    # Under Tunisian tax law, capital gains on securities held within a CEA account
    # are completely tax-exempt, saving the standard 10% capital gains withholding tax.
    if net_before_tax > 0:
        standard_tax = net_before_tax * STANDARD_TAX_RATE
        if use_cea:
            tax_amount = 0.0
            tax_shield_savings = standard_tax
        else:
            tax_amount = standard_tax
            tax_shield_savings = 0.0
    else:
        tax_amount = 0.0
        tax_shield_savings = 0.0

    net_profit = net_before_tax - tax_amount
    total_cost_basis = gross_investment + buy_fees
    net_roi_pct = (net_profit / total_cost_basis) * 100 if total_cost_basis > 0 else 0.0

    return TradeCostBreakdown(
        ticker=ticker.upper(),
        entry_price=round(entry_price, 3),
        exit_price=round(exit_price, 3),
        quantity=quantity,
        gross_investment=round(gross_investment, 3),
        gross_proceeds=round(gross_proceeds, 3),
        buy_fees=round(buy_fees, 3),
        sell_fees=round(sell_fees, 3),
        total_fees=round(total_fees, 3),
        gross_profit=round(gross_profit, 3),
        gross_roi_pct=round(gross_roi_pct, 2),
        tax_amount=round(tax_amount, 3),
        tax_shield_savings=round(tax_shield_savings, 3),
        net_profit=round(net_profit, 3),
        net_roi_pct=round(net_roi_pct, 2),
        is_cea=use_cea
    )
