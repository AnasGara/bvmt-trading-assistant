/* ═══════════════════════════════════════════════════════════════════
   BVMT Trading Assistant – Page Renderers
   ═══════════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════════
// OVERVIEW / DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════
async function loadOverviewPage() {
    const content = document.getElementById('content');
    try {
        const [summary, latest] = await Promise.all([
            api.getSignalSummary(),
            api.getLatestSignals(),
        ]);

        const buyCount = summary.by_direction?.BUY || 0;
        const sellCount = summary.by_direction?.SELL || 0;
        const watchCount = summary.by_direction?.WATCH || 0;

        content.innerHTML = `
            <div class="fade-in">
                <!-- Stats Row -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon green"><i class="fas fa-chart-line"></i></div>
                        <div>
                            <div class="stat-value">${formatNumber(summary.total)}</div>
                            <div class="stat-label">Total Signals</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon blue"><i class="fas fa-bolt"></i></div>
                        <div>
                            <div class="stat-value">${formatNumber(summary.today)}</div>
                            <div class="stat-label">Signals Today</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon green"><i class="fas fa-arrow-up"></i></div>
                        <div>
                            <div class="stat-value">${formatNumber(buyCount)}</div>
                            <div class="stat-label">Buy Signals</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon red"><i class="fas fa-arrow-down"></i></div>
                        <div>
                            <div class="stat-value">${formatNumber(sellCount)}</div>
                            <div class="stat-label">Sell Signals</div>
                        </div>
                    </div>
                </div>

                <!-- Signal Breakdown -->
                <div class="grid-2">
                    <!-- Signal Types Distribution -->
                    <div class="card">
                        <div class="card-header">
                            <div class="card-title"><i class="fas fa-chart-pie"></i> Signal Distribution</div>
                        </div>
                        <div>
                            ${Object.entries(summary.by_type || {}).map(([type, count]) => `
                                <div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border-color)">
                                    <div>${signalTypeBadge(type)}</div>
                                    <div style="display:flex;align-items:center;gap:0.75rem">
                                        <div style="width:120px;height:6px;background:var(--bg-elevated);border-radius:3px;overflow:hidden">
                                            <div style="height:100%;width:${Math.min((count / Math.max(summary.total, 1)) * 100, 100)}%;background:var(--accent);border-radius:3px"></div>
                                        </div>
                                        <span style="font-weight:700;font-size:0.85rem;min-width:32px;text-align:right">${count}</span>
                                    </div>
                                </div>
                            `).join('') || '<div class="empty-state"><p>No signal data yet</p></div>'}
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="card">
                        <div class="card-header">
                            <div class="card-title"><i class="fas fa-rocket"></i> Quick Actions</div>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:0.75rem">
                            <button class="btn btn-outline btn-full" onclick="navigate('market')">
                                <i class="fas fa-chart-bar"></i> View Market Overview
                            </button>
                            <button class="btn btn-outline btn-full" onclick="navigate('signals')">
                                <i class="fas fa-bolt"></i> Browse All Signals
                            </button>
                            <button class="btn btn-outline btn-full" onclick="navigate('calculator')">
                                <i class="fas fa-calculator"></i> Calculate Trade Costs
                            </button>
                            <button class="btn btn-outline btn-full" onclick="navigate('watchlist')">
                                <i class="fas fa-star"></i> Manage Watchlist
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Latest Signals -->
                <div class="card" style="margin-top:1.5rem">
                    <div class="card-header">
                        <div class="card-title"><i class="fas fa-bolt"></i> Latest Signals</div>
                        <button class="btn btn-sm btn-outline" onclick="navigate('signals')">View All</button>
                    </div>
                    ${latest.length > 0 ? `
                        <div class="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Ticker</th>
                                        <th>Signal</th>
                                        <th>Direction</th>
                                        <th>Price</th>
                                        <th>RSI</th>
                                        <th>Target</th>
                                        <th>Stop Loss</th>
                                        <th>Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${latest.slice(0, 10).map(s => `
                                        <tr>
                                            <td><span class="ticker-tag">${s.ticker}</span></td>
                                            <td>${signalTypeBadge(s.signal_type)}</td>
                                            <td>${directionBadge(s.direction)}</td>
                                            <td style="font-weight:600">${formatPrice(s.price)}</td>
                                            <td style="width:100px">${rsiBarHtml(s.rsi)}</td>
                                            <td>${s.target_price ? formatPrice(s.target_price) : '—'}</td>
                                            <td>${s.stop_loss ? formatPrice(s.stop_loss) : '—'}</td>
                                            <td style="color:var(--text-muted);font-size:0.8rem">${timeAgo(s.created_at)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="empty-state">
                            <i class="fas fa-satellite-dish"></i>
                            <h3>No signals yet</h3>
                            <p>Run the screener to generate trading signals</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error loading dashboard</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
}


// ═══════════════════════════════════════════════════════════════════
// MARKET OVERVIEW PAGE
// ═══════════════════════════════════════════════════════════════════
async function loadMarketPage() {
    const content = document.getElementById('content');
    try {
        const data = await api.getMarketOverview();

        if (!data || data.length === 0) {
            content.innerHTML = `
                <div class="fade-in">
                    <div class="empty-state">
                        <i class="fas fa-chart-bar"></i>
                        <h3>No market data available</h3>
                        <p>Market data will appear after the screener runs. The data source (Ilboursa) may also be temporarily unavailable.</p>
                    </div>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="fade-in">
                <div class="market-grid">
                    ${data.map(t => `
                        <div class="market-card">
                            ${t.latest_direction ? `
                                <div class="market-card-signal">
                                    ${directionBadge(t.latest_direction)}
                                </div>
                            ` : ''}
                            <div class="market-card-header">
                                <span class="market-card-ticker">${t.ticker}</span>
                                <span class="${priceChangeClass(t.change_pct)}" style="font-weight:700;font-size:0.9rem">
                                    ${formatPct(t.change_pct)}
                                </span>
                            </div>
                            <div class="market-card-name">${escapeHtml(t.name)}</div>
                            <div class="market-card-price">${formatPrice(t.close)}</div>
                            <div class="market-card-meta">
                                <span><i class="fas fa-chart-area"></i> RSI: ${t.rsi?.toFixed(1) || '—'}</span>
                                <span><i class="fas fa-exchange-alt"></i> Vol: ${formatNumber(t.volume)}</span>
                                ${t.latest_signal ? `<span>${signalTypeBadge(t.latest_signal)}</span>` : ''}
                            </div>
                            <div style="margin-top:0.75rem">
                                ${rsiBarHtml(t.rsi)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error loading market data</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
}


// ═══════════════════════════════════════════════════════════════════
// SIGNALS PAGE
// ═══════════════════════════════════════════════════════════════════
let signalFilters = { page: 1 };

async function loadSignalsPage() {
    const content = document.getElementById('content');
    try {
        const data = await api.getSignals(signalFilters);

        content.innerHTML = `
            <div class="fade-in">
                <!-- Filters -->
                <div class="filter-bar">
                    <select id="filter-direction" onchange="applySignalFilter()">
                        <option value="">All Directions</option>
                        <option value="BUY" ${signalFilters.direction === 'BUY' ? 'selected' : ''}>BUY</option>
                        <option value="SELL" ${signalFilters.direction === 'SELL' ? 'selected' : ''}>SELL</option>
                        <option value="WATCH" ${signalFilters.direction === 'WATCH' ? 'selected' : ''}>WATCH</option>
                    </select>
                    <select id="filter-type" onchange="applySignalFilter()">
                        <option value="">All Types</option>
                        <option value="GOLDEN_CROSS" ${signalFilters.signal_type === 'GOLDEN_CROSS' ? 'selected' : ''}>Golden Cross</option>
                        <option value="OVERSOLD_BOUNCE" ${signalFilters.signal_type === 'OVERSOLD_BOUNCE' ? 'selected' : ''}>Oversold Bounce</option>
                        <option value="VOLUME_BREAKOUT" ${signalFilters.signal_type === 'VOLUME_BREAKOUT' ? 'selected' : ''}>Volume Breakout</option>
                        <option value="DEATH_CROSS" ${signalFilters.signal_type === 'DEATH_CROSS' ? 'selected' : ''}>Death Cross</option>
                        <option value="OVERBOUGHT_WARNING" ${signalFilters.signal_type === 'OVERBOUGHT_WARNING' ? 'selected' : ''}>Overbought Warning</option>
                    </select>
                    <input type="text" id="filter-ticker" placeholder="Filter by ticker..." value="${signalFilters.ticker || ''}"
                           onkeydown="if(event.key==='Enter')applySignalFilter()" style="max-width:160px">
                    <button class="btn btn-sm btn-outline" onclick="clearSignalFilters()">
                        <i class="fas fa-times"></i> Clear
                    </button>
                    <span style="color:var(--text-muted);font-size:0.8rem;margin-left:auto">${formatNumber(data.total)} results</span>
                </div>

                <!-- Table -->
                ${data.signals.length > 0 ? `
                    <div class="card">
                        <div class="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Ticker</th>
                                        <th>Signal Type</th>
                                        <th>Direction</th>
                                        <th>Price</th>
                                        <th>RSI</th>
                                        <th>SMA 20/50</th>
                                        <th>Target</th>
                                        <th>Stop Loss</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.signals.map(s => `
                                        <tr>
                                            <td><span class="ticker-tag">${s.ticker}</span></td>
                                            <td>${signalTypeBadge(s.signal_type)}</td>
                                            <td>${directionBadge(s.direction)}</td>
                                            <td style="font-weight:600">${formatPrice(s.price)}</td>
                                            <td style="width:90px">${rsiBarHtml(s.rsi)}</td>
                                            <td style="font-size:0.82rem;color:var(--text-secondary)">${s.sma_fast?.toFixed(3) || '—'} / ${s.sma_slow?.toFixed(3) || '—'}</td>
                                            <td class="price-up">${s.target_price ? formatPrice(s.target_price) : '—'}</td>
                                            <td class="price-down">${s.stop_loss ? formatPrice(s.stop_loss) : '—'}</td>
                                            <td style="color:var(--text-muted);font-size:0.8rem">${timeAgo(s.created_at)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <!-- Pagination -->
                        ${data.total_pages > 1 ? `
                            <div class="pagination">
                                <button onclick="changeSignalPage(${data.page - 1})" ${data.page <= 1 ? 'disabled' : ''}>
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                ${generatePagination(data.page, data.total_pages)}
                                <button onclick="changeSignalPage(${data.page + 1})" ${data.page >= data.total_pages ? 'disabled' : ''}>
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>No signals found</h3>
                        <p>Try adjusting your filters or run the screener</p>
                    </div>
                `}
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error loading signals</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
}

function applySignalFilter() {
    signalFilters.direction = document.getElementById('filter-direction')?.value || '';
    signalFilters.signal_type = document.getElementById('filter-type')?.value || '';
    signalFilters.ticker = document.getElementById('filter-ticker')?.value?.trim() || '';
    signalFilters.page = 1;
    loadSignalsPage();
}

function clearSignalFilters() {
    signalFilters = { page: 1 };
    loadSignalsPage();
}

function changeSignalPage(page) {
    signalFilters.page = page;
    loadSignalsPage();
}

function generatePagination(current, total) {
    let pages = [];
    const range = 2;
    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= current - range && i <= current + range)) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== '...') {
            pages.push('...');
        }
    }
    return pages.map(p => {
        if (p === '...') return '<span style="color:var(--text-muted);padding:0 0.3rem">…</span>';
        return `<button class="${p === current ? 'active' : ''}" onclick="changeSignalPage(${p})">${p}</button>`;
    }).join('');
}


// ═══════════════════════════════════════════════════════════════════
// WATCHLIST PAGE
// ═══════════════════════════════════════════════════════════════════
const AVAILABLE_TICKERS = ['BIAT','SFBT','TJARI','BT','SAH','CC','TPR','OTH','ECYCL','UIB','BNA','BH','AB','ARTES','DH'];

async function loadWatchlistPage() {
    const content = document.getElementById('content');
    try {
        const items = await api.getWatchlist();
        const watchedTickers = items.map(i => i.ticker);
        const available = AVAILABLE_TICKERS.filter(t => !watchedTickers.includes(t));

        content.innerHTML = `
            <div class="fade-in">
                <!-- Add to watchlist -->
                <div class="card" style="margin-bottom:1.5rem">
                    <div class="card-header">
                        <div class="card-title"><i class="fas fa-plus-circle"></i> Add Ticker</div>
                    </div>
                    <div style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap">
                        ${available.length > 0 ? available.map(t => `
                            <button class="btn btn-sm btn-outline" onclick="addToWatchlist('${t}')">
                                <i class="fas fa-plus"></i> ${t}
                            </button>
                        `).join('') : '<span style="color:var(--text-muted);font-size:0.85rem">All tickers are in your watchlist</span>'}
                    </div>
                </div>

                <!-- Watchlist -->
                ${items.length > 0 ? `
                    <div class="watchlist-grid">
                        ${items.map(item => `
                            <div class="watchlist-card">
                                <div>
                                    <span class="ticker-tag" style="font-size:1.1rem">${item.ticker}</span>
                                    <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.25rem">
                                        Added ${timeAgo(item.added_at)}
                                    </div>
                                </div>
                                <button class="btn btn-sm btn-danger" onclick="removeFromWatchlist('${item.ticker}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-star"></i>
                        <h3>Your watchlist is empty</h3>
                        <p>Add tickers above to start tracking them</p>
                    </div>
                `}
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
}

async function addToWatchlist(ticker) {
    try {
        await api.addToWatchlist(ticker);
        showToast(`${ticker} added to watchlist`, 'success');
        loadWatchlistPage();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function removeFromWatchlist(ticker) {
    try {
        await api.removeFromWatchlist(ticker);
        showToast(`${ticker} removed from watchlist`, 'info');
        loadWatchlistPage();
    } catch (err) {
        showToast(err.message, 'error');
    }
}


// ═══════════════════════════════════════════════════════════════════
// COST CALCULATOR PAGE
// ═══════════════════════════════════════════════════════════════════
function loadCalculatorPage() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="fade-in">
            <div class="card">
                <div class="card-header">
                    <div class="card-title"><i class="fas fa-calculator"></i> True-Cost Trade Calculator</div>
                </div>
                <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1.25rem">
                    Calculate net returns after BVMT broker fees, TVA, exchange duties, and CEA tax shield benefits.
                </p>
                <div class="calc-grid">
                    <div class="form-group">
                        <label>Ticker</label>
                        <select id="calc-ticker">
                            ${AVAILABLE_TICKERS.map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Quantity (shares)</label>
                        <input type="number" id="calc-qty" value="100" min="1">
                    </div>
                    <div class="form-group">
                        <label>Entry Price (TND)</label>
                        <input type="number" id="calc-entry" step="0.001" placeholder="e.g. 50.000">
                    </div>
                    <div class="form-group">
                        <label>Exit Price (TND)</label>
                        <input type="number" id="calc-exit" step="0.001" placeholder="e.g. 55.000">
                    </div>
                    <div class="form-group" style="display:flex;align-items:center;gap:0.75rem;padding-top:1.5rem">
                        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;margin:0">
                            <input type="checkbox" id="calc-cea" checked style="width:auto">
                            <span>CEA Tax Shield (0% capital gains)</span>
                        </label>
                    </div>
                    <div style="padding-top:1.5rem">
                        <button class="btn btn-primary" onclick="runCalculation()">
                            <i class="fas fa-chart-pie"></i> Calculate
                        </button>
                    </div>
                </div>
                <div id="calc-results"></div>
            </div>
        </div>
    `;
}

async function runCalculation() {
    const ticker = document.getElementById('calc-ticker').value;
    const quantity = parseInt(document.getElementById('calc-qty').value);
    const entry = parseFloat(document.getElementById('calc-entry').value);
    const exit = parseFloat(document.getElementById('calc-exit').value);
    const useCea = document.getElementById('calc-cea').checked;
    const resultsEl = document.getElementById('calc-results');

    if (!entry || !exit || !quantity) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    try {
        const r = await api.calculateCost({ entry_price: entry, exit_price: exit, quantity, ticker, use_cea: useCea });
        const profitClass = r.net_profit >= 0 ? 'positive' : 'negative';

        resultsEl.innerHTML = `
            <div class="calc-result fade-in">
                <h3 style="margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem">
                    <span class="ticker-tag">${r.ticker}</span> Trade Analysis
                    ${r.is_cea ? '<span class="calc-cea-badge"><i class="fas fa-shield-alt"></i> CEA Tax Shield</span>' : ''}
                </h3>
                <div class="grid-2">
                    <div>
                        <div class="calc-result-row">
                            <span class="calc-result-label">Gross Investment</span>
                            <span class="calc-result-value">${formatPrice(r.gross_investment)}</span>
                        </div>
                        <div class="calc-result-row">
                            <span class="calc-result-label">Gross Proceeds</span>
                            <span class="calc-result-value">${formatPrice(r.gross_proceeds)}</span>
                        </div>
                        <div class="calc-result-row">
                            <span class="calc-result-label">Gross Profit</span>
                            <span class="calc-result-value ${r.gross_profit >= 0 ? 'positive' : 'negative'}">${formatPrice(r.gross_profit)}</span>
                        </div>
                        <div class="calc-result-row">
                            <span class="calc-result-label">Gross ROI</span>
                            <span class="calc-result-value ${r.gross_roi_pct >= 0 ? 'positive' : 'negative'}">${formatPct(r.gross_roi_pct)}</span>
                        </div>
                    </div>
                    <div>
                        <div class="calc-result-row">
                            <span class="calc-result-label">Buy Fees</span>
                            <span class="calc-result-value">${formatPrice(r.buy_fees)}</span>
                        </div>
                        <div class="calc-result-row">
                            <span class="calc-result-label">Sell Fees</span>
                            <span class="calc-result-value">${formatPrice(r.sell_fees)}</span>
                        </div>
                        <div class="calc-result-row">
                            <span class="calc-result-label">Total Fees</span>
                            <span class="calc-result-value" style="color:var(--warning)">${formatPrice(r.total_fees)}</span>
                        </div>
                        <div class="calc-result-row">
                            <span class="calc-result-label">Tax ${r.is_cea ? '(Exempt)' : '(10%)'}</span>
                            <span class="calc-result-value">${formatPrice(r.tax_amount)}</span>
                        </div>
                    </div>
                </div>
                <div style="margin-top:1rem;padding:1rem;background:var(--bg-card);border-radius:var(--radius-sm);text-align:center">
                    <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.3rem">Net Profit / Net ROI</div>
                    <div style="font-size:1.5rem;font-weight:800" class="${profitClass}">
                        ${formatPrice(r.net_profit)} <span style="font-size:1rem">(${formatPct(r.net_roi_pct)})</span>
                    </div>
                    ${r.is_cea && r.tax_shield_savings > 0 ? `
                        <div style="margin-top:0.5rem;font-size:0.8rem;color:var(--success)">
                            <i class="fas fa-shield-alt"></i> CEA saved you ${formatPrice(r.tax_shield_savings)} in taxes
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    } catch (err) {
        showToast(err.message, 'error');
    }
}


// ═══════════════════════════════════════════════════════════════════
// ADMIN – USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════
async function loadAdminUsersPage() {
    const content = document.getElementById('content');
    try {
        const users = await api.getAdminUsers();

        content.innerHTML = `
            <div class="fade-in">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title"><i class="fas fa-users"></i> All Users (${users.length})</div>
                    </div>
                    <div class="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Email</th>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map(u => `
                                    <tr>
                                        <td style="color:var(--text-muted)">#${u.id}</td>
                                        <td style="font-weight:600">${escapeHtml(u.email)}</td>
                                        <td>${escapeHtml(u.full_name || '—')}</td>
                                        <td>
                                            <select class="role-select" onchange="changeUserRole(${u.id}, this.value)"
                                                    ${u.id === currentUser.id ? 'disabled' : ''}>
                                                <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
                                                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                                            </select>
                                        </td>
                                        <td>
                                            <span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">
                                                ${u.is_active ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td style="color:var(--text-muted);font-size:0.8rem">${timeAgo(u.created_at)}</td>
                                        <td>
                                            ${u.id !== currentUser.id ? `
                                                <button class="btn btn-sm btn-danger" onclick="deleteUserConfirm(${u.id}, '${escapeHtml(u.email)}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            ` : '<span style="color:var(--text-muted);font-size:0.75rem">You</span>'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
}

async function changeUserRole(userId, role) {
    try {
        await api.updateUserRole(userId, role);
        showToast(`Role updated to ${role}`, 'success');
    } catch (err) {
        showToast(err.message, 'error');
        loadAdminUsersPage();
    }
}

async function deleteUserConfirm(userId, email) {
    if (!confirm(`Delete user "${email}"? This cannot be undone.`)) return;
    try {
        await api.deleteUser(userId);
        showToast('User deleted', 'success');
        loadAdminUsersPage();
    } catch (err) {
        showToast(err.message, 'error');
    }
}


// ═══════════════════════════════════════════════════════════════════
// ADMIN – SCREENER CONTROL
// ═══════════════════════════════════════════════════════════════════
async function loadAdminScreenerPage() {
    const content = document.getElementById('content');
    try {
        const [status, history] = await Promise.all([
            api.getScreenerStatus(),
            api.getScreenerHistory(),
        ]);

        content.innerHTML = `
            <div class="fade-in">
                <!-- Status Card -->
                <div class="screener-status-card">
                    <div class="screener-status-icon ${status.is_running ? 'running' : 'idle'}">
                        <i class="fas ${status.is_running ? 'fa-cog fa-spin' : 'fa-power-off'}"></i>
                    </div>
                    <div style="flex:1">
                        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:0.25rem">
                            ${status.is_running ? 'Screener Running...' : 'Screener Idle'}
                        </h3>
                        <div style="font-size:0.85rem;color:var(--text-muted)">
                            ${status.last_run ? `Last run: ${timeAgo(status.last_run.started_at)} · ${status.last_run.signals_found} signals found` : 'Never run'}
                        </div>
                        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem">
                            Next scheduled: ${status.next_scheduled || 'Not scheduled'}
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="triggerScreener()" ${status.is_running ? 'disabled' : ''}>
                        <i class="fas fa-play"></i> Run Now
                    </button>
                </div>

                <!-- History -->
                <div class="card">
                    <div class="card-header">
                        <div class="card-title"><i class="fas fa-history"></i> Run History</div>
                    </div>
                    ${history.length > 0 ? `
                        <div class="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Run ID</th>
                                        <th>Status</th>
                                        <th>Tickers</th>
                                        <th>Signals</th>
                                        <th>Started</th>
                                        <th>Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${history.map(r => {
                                        let duration = '—';
                                        if (r.started_at && r.completed_at) {
                                            const ms = new Date(r.completed_at) - new Date(r.started_at);
                                            duration = ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(1)}s`;
                                        }
                                        const statusBadge = r.status === 'completed' ? 'badge-success' :
                                                           r.status === 'running' ? 'badge-info' : 'badge-danger';
                                        return `
                                            <tr>
                                                <td style="color:var(--text-muted)">#${r.id}</td>
                                                <td><span class="badge ${statusBadge}">${r.status}</span></td>
                                                <td>${r.tickers_scanned}</td>
                                                <td style="font-weight:700">${r.signals_found}</td>
                                                <td style="font-size:0.82rem">${timeAgo(r.started_at)}</td>
                                                <td style="color:var(--text-muted);font-size:0.82rem">${duration}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="empty-state">
                            <i class="fas fa-robot"></i>
                            <h3>No runs yet</h3>
                            <p>Click "Run Now" to start the first screening</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
}

async function triggerScreener() {
    try {
        await api.runScreener();
        showToast('Screener started! This may take a minute...', 'success');
        setTimeout(() => loadAdminScreenerPage(), 2000);
    } catch (err) {
        showToast(err.message, 'error');
    }
}


// ═══════════════════════════════════════════════════════════════════
// ADMIN – ALERT HISTORY
// ═══════════════════════════════════════════════════════════════════
async function loadAdminAlertsPage() {
    const content = document.getElementById('content');
    try {
        const alerts = await api.getAlertHistory();

        content.innerHTML = `
            <div class="fade-in">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title"><i class="fas fa-bell"></i> Telegram Alert History (${alerts.length})</div>
                    </div>
                    ${alerts.length > 0 ? `
                        <div class="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Ticker</th>
                                        <th>Signal Type</th>
                                        <th>Sent At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${alerts.map(a => `
                                        <tr>
                                            <td style="color:var(--text-muted)">#${a.id}</td>
                                            <td><span class="ticker-tag">${a.ticker}</span></td>
                                            <td>${signalTypeBadge(a.signal_type)}</td>
                                            <td style="color:var(--text-muted);font-size:0.82rem">${timeAgo(a.sent_at)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="empty-state">
                            <i class="fas fa-bell-slash"></i>
                            <h3>No alerts sent yet</h3>
                            <p>Alerts are dispatched via Telegram when signals are detected</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
}
