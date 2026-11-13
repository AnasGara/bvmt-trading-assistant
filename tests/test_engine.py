import unittest
import pandas as pd
from src.finance.cost_model import calculate_trade_cost, compute_side_fees
from src.engine.indicators import compute_technical_indicators, compute_rsi

class TestBVMTEngine(unittest.TestCase):
    
    def test_fee_calculation(self):
        # 100 shares @ 100 TND = 10,000 TND
        gross = 10000.0
        # broker 0.6% = 60, tva 19% on 60 = 11.4, exchange 0.15% = 15 => total = 86.4
        side_fee = compute_side_fees(gross, broker_rate=0.006, exchange_rate=0.0015, tva_rate=0.19)
        self.assertAlmostEqual(side_fee, 86.4, places=2)

    def test_cea_tax_shield(self):
        # Buy @ 100 TND, Sell @ 110 TND (+10%), 100 shares
        cost_cea = calculate_trade_cost(100.0, 110.0, quantity=100, use_cea=True)
        cost_std = calculate_trade_cost(100.0, 110.0, quantity=100, use_cea=False)
        
        self.assertEqual(cost_cea.gross_profit, 1000.0)
        self.assertEqual(cost_cea.tax_amount, 0.0)
        self.assertGreater(cost_cea.tax_shield_savings, 0.0)
        self.assertGreater(cost_cea.net_profit, cost_std.net_profit)

    def test_rsi_and_sma_computation(self):
        prices = [10.0 + (i * 0.5) for i in range(60)]
        df = pd.DataFrame({
            'Close': prices,
            'Open': prices,
            'High': [p + 0.2 for p in prices],
            'Low': [p - 0.2 for p in prices],
            'Vol': [1000 for _ in prices]
        })
        res = compute_technical_indicators(df, fast_period=20, slow_period=50)
        self.assertIn('SMA_20', res.columns)
        self.assertIn('SMA_50', res.columns)
        self.assertIn('RSI_14', res.columns)
        self.assertFalse(res['SMA_20'].isna().all())

if __name__ == '__main__':
    unittest.main()
