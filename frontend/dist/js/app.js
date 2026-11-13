/* ═══════════════════════════════════════════════════════════════════
   BVMT Trading Assistant – App Controller
   ═══════════════════════════════════════════════════════════════════ */

let currentUser = null;
let currentPage = 'overview';

// ─── Init ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    if (api.isAuthenticated()) {
        try {
            currentUser = await api.getMe();
            showDashboard();
        } catch {
            api.setToken(null);
            showAuth();
        }
    } else {
        showAuth();
    }

    // Enter key handlers
    document.getElementById('login-password')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('reg-password')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleRegister();
    });
});

// ─── Auth ────────────────────────────────────────────────────────────
function showAuth() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
}

function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    if (!email || !password) {
        errorEl.textContent = 'Please fill in all fields';
        errorEl.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    errorEl.classList.add('hidden');

    try {
        const data = await api.login(email, password);
        currentUser = data.user;
        showDashboard();
        showToast('Welcome back!', 'success');
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
}

async function handleRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errorEl = document.getElementById('register-error');
    const btn = document.getElementById('register-btn');

    if (!email || !password) {
        errorEl.textContent = 'Email and password are required';
        errorEl.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    errorEl.classList.add('hidden');

    try {
        const data = await api.register(email, password, name);
        currentUser = data.user;
        showDashboard();
        showToast('Account created successfully!', 'success');
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
}

function handleLogout() {
    api.setToken(null);
    currentUser = null;
    showAuth();
    showToast('Signed out', 'info');
}

// ─── Dashboard ──────────────────────────────────────────────────────
function showDashboard() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');

    // Update user info
    const name = currentUser?.full_name || currentUser?.email || 'User';
    document.getElementById('user-name').textContent = name;
    document.getElementById('user-role').textContent = currentUser?.role || 'user';
    document.getElementById('user-avatar').textContent = (name[0] || 'U').toUpperCase();

    // Show admin nav items
    const isAdmin = currentUser?.role === 'admin';
    document.getElementById('admin-divider').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('admin-label').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('nav-admin-users').style.display = isAdmin ? 'flex' : 'none';
    document.getElementById('nav-admin-screener').style.display = isAdmin ? 'flex' : 'none';
    document.getElementById('nav-admin-alerts').style.display = isAdmin ? 'flex' : 'none';

    // Check market status
    updateMarketStatus();

    // Navigate to default page
    navigate('overview');
}

function updateMarketStatus() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMin = now.getUTCMinutes();
    const day = now.getUTCDay();
    // BVMT: Mon-Fri, ~09:00-14:15 CET (08:00-13:15 UTC)
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = (utcHour > 8 || (utcHour === 8 && utcMin >= 0)) &&
                          (utcHour < 13 || (utcHour === 13 && utcMin <= 15));
    const el = document.getElementById('market-status');
    if (isWeekday && isMarketHours) {
        el.classList.add('open');
        el.querySelector('span:last-child').textContent = 'Market Open';
    } else {
        el.classList.remove('open');
        el.querySelector('span:last-child').textContent = 'Market Closed';
    }
}

// ─── Navigation ─────────────────────────────────────────────────────
function navigate(page) {
    currentPage = page;

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    const titles = {
        overview: 'Dashboard',
        market: 'Market Overview',
        signals: 'Signals',
        watchlist: 'My Watchlist',
        calculator: 'Cost Calculator',
        'admin-users': 'User Management',
        'admin-screener': 'Screener Control',
        'admin-alerts': 'Alert History',
    };
    document.getElementById('page-title').textContent = titles[page] || 'Dashboard';

    // Load page
    const content = document.getElementById('content');
    content.innerHTML = '<div class="loading"><div class="spinner"></div> Loading...</div>';

    switch (page) {
        case 'overview': loadOverviewPage(); break;
        case 'market': loadMarketPage(); break;
        case 'signals': loadSignalsPage(); break;
        case 'watchlist': loadWatchlistPage(); break;
        case 'calculator': loadCalculatorPage(); break;
        case 'admin-users': loadAdminUsersPage(); break;
        case 'admin-screener': loadAdminScreenerPage(); break;
        case 'admin-alerts': loadAdminAlertsPage(); break;
        default: loadOverviewPage();
    }

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
}

function refreshCurrentPage() {
    navigate(currentPage);
}

// ─── Sidebar ────────────────────────────────────────────────────────
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('open');
    } else {
        sidebar.classList.toggle('collapsed');
    }
}

// ─── Toast Notifications ────────────────────────────────────────────
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle' };
    toast.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i> ${escapeHtml(message)}`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = '0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ─── Helpers ────────────────────────────────────────────────────────
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatNumber(n, decimals = 0) {
    if (n === null || n === undefined) return '—';
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatPrice(n) {
    if (n === null || n === undefined) return '—';
    return Number(n).toFixed(3) + ' TND';
}

function formatPct(n) {
    if (n === null || n === undefined) return '—';
    const sign = n >= 0 ? '+' : '';
    return sign + Number(n).toFixed(2) + '%';
}

function directionBadge(dir) {
    const cls = dir === 'BUY' ? 'badge-buy' : dir === 'SELL' ? 'badge-sell' : 'badge-watch';
    const icon = dir === 'BUY' ? '↑' : dir === 'SELL' ? '↓' : '◆';
    return `<span class="badge ${cls}">${icon} ${dir}</span>`;
}

function signalTypeBadge(type) {
    const cls = type.toLowerCase().replace(/\s+/g, '_');
    const labels = {
        'GOLDEN_CROSS': '✦ Golden Cross',
        'OVERSOLD_BOUNCE': '↗ Oversold Bounce',
        'VOLUME_BREAKOUT': '⚡ Volume Breakout',
        'DEATH_CROSS': '✖ Death Cross',
        'OVERBOUGHT_WARNING': '⚠ Overbought',
    };
    return `<span class="signal-type ${cls}">${labels[type] || type}</span>`;
}

function priceChangeClass(val) {
    if (val > 0) return 'price-up';
    if (val < 0) return 'price-down';
    return 'price-flat';
}

function rsiColor(val) {
    if (val > 70) return 'var(--danger)';
    if (val < 30) return 'var(--success)';
    return 'var(--info)';
}

function rsiBarHtml(val) {
    const color = rsiColor(val);
    return `
        <div class="rsi-bar"><div class="rsi-bar-fill" style="width:${Math.min(val, 100)}%;background:${color}"></div></div>
        <div class="rsi-value" style="color:${color}">${val?.toFixed(1) || '—'}</div>
    `;
}

function timeAgo(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}
