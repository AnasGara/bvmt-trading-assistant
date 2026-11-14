import unittest
from fastapi.testclient import TestClient
from src.api.app import app
from src.storage.db import init_db
from src.api.auth import ensure_admin_exists

class TestBVMTAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        ensure_admin_exists()
        cls.client = TestClient(app)

    def test_health(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "healthy")

    def test_auth_login_and_me(self):
        res = self.client.post("/api/auth/login", json={
            "email": "admin@bvmt.tn",
            "password": "admin123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["role"], "admin")

        token = data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        res_me = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(res_me.status_code, 200)
        self.assertEqual(res_me.json()["email"], "admin@bvmt.tn")

    def test_auth_invalid_credentials(self):
        res = self.client.post("/api/auth/login", json={
            "email": "admin@bvmt.tn",
            "password": "wrongpassword"
        })
        self.assertEqual(res.status_code, 401)

    def test_cost_calculator(self):
        res_login = self.client.post("/api/auth/login", json={
            "email": "admin@bvmt.tn",
            "password": "admin123"
        })
        token = res_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = self.client.post("/api/market/cost-calculator", headers=headers, json={
            "entry_price": 50.0,
            "exit_price": 55.0,
            "quantity": 100,
            "ticker": "SFBT",
            "use_cea": True
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["gross_profit"], 500.0)
        self.assertTrue(data["is_cea"])
        self.assertEqual(data["tax_amount"], 0.0)

    def test_signals_summary(self):
        res_login = self.client.post("/api/auth/login", json={
            "email": "admin@bvmt.tn",
            "password": "admin123"
        })
        token = res_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = self.client.get("/api/signals/summary", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertIn("total", res.json())

    def test_admin_stats(self):
        res_login = self.client.post("/api/auth/login", json={
            "email": "admin@bvmt.tn",
            "password": "admin123"
        })
        token = res_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = self.client.get("/api/admin/stats", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertIn("total_users", res.json())

    def test_market_aaz_stocks(self):
        res_login = self.client.post("/api/auth/login", json={
            "email": "admin@bvmt.tn",
            "password": "admin123"
        })
        token = res_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = self.client.get("/api/market/stocks", headers=headers)
        self.assertEqual(res.status_code, 200)
        stocks = res.json()
        self.assertIsInstance(stocks, list)
        self.assertGreater(len(stocks), 50)
        first = stocks[0]
        self.assertIn("ticker", first)
        self.assertIn("last", first)
        self.assertIn("change_pct", first)

    def test_market_stock_detail(self):
        res_login = self.client.post("/api/auth/login", json={
            "email": "admin@bvmt.tn",
            "password": "admin123"
        })
        token = res_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = self.client.get("/api/market/stocks/ATL", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("stock", data)
        self.assertIn("variations", data)
        self.assertIn("history", data)
        self.assertIn("indicators", data)

    def test_delete_and_sort_signals(self):
        res_login = self.client.post("/api/auth/login", json={
            "email": "admin@bvmt.tn",
            "password": "admin123"
        })
        token = res_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Add a test signal
        from src.storage.db import save_signal
        save_signal(ticker="TEST", signal_type="GOLDEN_CROSS", direction="BUY", price=10.5)

        # Get signals sorted
        res_list = self.client.get("/api/signals?sort_order=desc", headers=headers)
        self.assertEqual(res_list.status_code, 200)
        signals = res_list.json()["signals"]
        self.assertGreater(len(signals), 0)
        test_sig = next((s for s in signals if s["ticker"] == "TEST"), None)
        self.assertIsNotNone(test_sig)

        # Delete the test signal
        res_del = self.client.delete(f"/api/signals/{test_sig['id']}", headers=headers)
        self.assertEqual(res_del.status_code, 200)

        # Verify it's gone
        res_check = self.client.get(f"/api/signals/{test_sig['id']}", headers=headers)
        self.assertEqual(res_check.status_code, 404)

    def test_static_files_serving(self):
        res_html = self.client.get("/")
        self.assertEqual(res_html.status_code, 200)
        self.assertIn("BVMT Trading Assistant", res_html.text)
        self.assertIn("react-app.jsx", res_html.text)

        res_css = self.client.get("/css/style.css")
        self.assertEqual(res_css.status_code, 200)

        res_jsx = self.client.get("/js/react-app.jsx")
        self.assertEqual(res_jsx.status_code, 200)

if __name__ == "__main__":
    unittest.main()
