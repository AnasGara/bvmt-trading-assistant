/* ═══════════════════════════════════════════════════════════════════
   BVMT Trading Assistant – API Client
   ═══════════════════════════════════════════════════════════════════ */

const API_BASE = '/api';

class APIClient {
    constructor() {
        this.token = localStorage.getItem('bvmt_token') || null;
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('bvmt_token', token);
        } else {
            localStorage.removeItem('bvmt_token');
        }
    }

    getToken() {
        return this.token;
    }

    isAuthenticated() {
        return !!this.token;
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            if (response.status === 401) {
                this.setToken(null);
                window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
                return null;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || `Request failed (${response.status})`);
            }

            return data;
        } catch (error) {
            if (error.message === 'Failed to fetch') {
                throw new Error('Cannot connect to server. Please ensure backend is running.');
            }
            throw error;
        }
    }

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async del(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // ─── Auth ────────────────────────────────────────────────────

    async login(email, password) {
        const data = await this.post('/auth/login', { email, password });
        if (data && data.access_token) {
            this.setToken(data.access_token);
            window.dispatchEvent(new CustomEvent('auth-changed', { detail: data.user }));
        }
        return data;
    }

    async register(email, password, fullName) {
        const data = await this.post('/auth/register', {
            email, password, full_name: fullName,
        });
        if (data && data.access_token) {
            this.setToken(data.access_token);
            window.dispatchEvent(new CustomEvent('auth-changed', { detail: data.user }));
        }
        return data;
    }

    async getMe() {
        return this.get('/auth/me');
    }

    // ─── Market & Stocks A-Z ─────────────────────────────────────

    async getStocks(refresh = false) {
        return this.get(`/market/stocks${refresh ? '?refresh=true' : ''}`);
    }

    async getStockDetail(ticker, days = 180) {
        return this.get(`/market/stocks/${encodeURIComponent(ticker)}?days=${days}`);
    }

    async getMarketOverview() {
        return this.get('/market/overview');
    }

    async getQuote(ticker) {
        return this.get(`/market/${encodeURIComponent(ticker)}/quote`);
    }

    async getHistory(ticker, days = 180) {
        return this.get(`/market/${encodeURIComponent(ticker)}/history?days=${days}`);
    }

    async calculateCost(data) {
        return this.post('/market/cost-calculator', data);
    }

    // ─── Signals ─────────────────────────────────────────────────

    async getSignals(params = {}) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') query.set(k, v);
        });
        return this.get(`/signals?${query}`);
    }

    async getLatestSignals() {
        return this.get('/signals/latest');
    }

    async getSignalSummary() {
        return this.get('/signals/summary');
    }

    async getSignal(id) {
        return this.get(`/signals/${id}`);
    }

    // ─── Watchlist ───────────────────────────────────────────────

    async getWatchlist() {
        return this.get('/watchlist');
    }

    async addToWatchlist(ticker) {
        return this.post('/watchlist', { ticker });
    }

    async removeFromWatchlist(ticker) {
        return this.del(`/watchlist/${encodeURIComponent(ticker)}`);
    }

    // ─── Admin ───────────────────────────────────────────────────

    async getAdminStats() {
        return this.get('/admin/stats');
    }

    async getAdminUsers() {
        return this.get('/admin/users');
    }

    async updateUserRole(userId, role) {
        return this.put(`/admin/users/${userId}/role`, { role });
    }

    async deleteUser(userId) {
        return this.del(`/admin/users/${userId}`);
    }

    async getAlertHistory() {
        return this.get('/admin/alerts');
    }

    // ─── Screener ────────────────────────────────────────────────

    async runScreener() {
        return this.post('/screener/run', {});
    }

    async getScreenerStatus() {
        return this.get('/screener/status');
    }

    async getScreenerHistory() {
        return this.get('/screener/history');
    }
}

const api = new APIClient();
