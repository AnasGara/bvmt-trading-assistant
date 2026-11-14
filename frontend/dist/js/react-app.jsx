/* ═══════════════════════════════════════════════════════════════════
   BVMT Trading Assistant – React 18 Application
   Component Architecture with Chart.js & Ilboursa A-Z Integration
   ═══════════════════════════════════════════════════════════════════ */

const { useState, useEffect, useRef, useMemo } = React;

// ─── Formatting Utilities ────────────────────────────────────────────
const formatPrice = (v) => (v != null && !isNaN(v) ? `${Number(v).toFixed(3)} TND` : '—');
const formatPct = (v) => {
    if (v == null || isNaN(v)) return '—';
    const n = Number(v);
    return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
};
const formatNumber = (v) => (v != null && !isNaN(v) ? Number(v).toLocaleString('fr-TN') : '—');
const timeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'à l\'instant';
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    return `il y a ${Math.floor(diff / 86400)} j`;
};

// ─── Direction & Signal Badges ───────────────────────────────────────
const DirectionBadge = ({ direction }) => {
    const dir = direction?.toUpperCase();
    if (dir === 'BUY') {
        return <span className="badge badge-buy"><i className="fas fa-arrow-up"></i> ACHAT</span>;
    }
    if (dir === 'SELL') {
        return <span className="badge badge-sell"><i className="fas fa-arrow-down"></i> VENTE</span>;
    }
    return <span className="badge badge-watch"><i className="fas fa-eye"></i> OBSERVER</span>;
};

const SignalBadge = ({ type }) => {
    if (!type) return null;
    const labels = {
        GOLDEN_CROSS: { text: '✦ Croisement Doré', cls: 'golden_cross' },
        OVERSOLD_BOUNCE: { text: '↗ Rebond Survente', cls: 'oversold_bounce' },
        VOLUME_BREAKOUT: { text: '⚡ Cassure Volume', cls: 'volume_breakout' },
        DEATH_CROSS: { text: '✖ Croisement Baissier', cls: 'death_cross' },
        OVERBOUGHT_WARNING: { text: '⚠ Alerte Surachat', cls: 'overbought_warning' },
    };
    const item = labels[type] || { text: type, cls: 'info' };
    return <span className={`signal-type ${item.cls}`}>{item.text}</span>;
};

const VariationBadge = ({ pct }) => {
    const n = Number(pct || 0);
    const cls = n > 0 ? 'badge-buy' : n < 0 ? 'badge-sell' : 'badge-watch';
    return <span className={`badge ${cls}`}>{formatPct(n)}</span>;
};

// ─── Interactive Stock Graph Component ──────────────────────────────
const StockGraph = ({ history = [], days = 180, onDaysChange }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (!chartRef.current || !history || history.length === 0) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const labels = history.map((h) => h.date);
        const closes = history.map((h) => h.close);
        const sma20 = history.map((h) => h.sma_20 || null);
        const sma50 = history.map((h) => h.sma_50 || null);

        const ctx = chartRef.current.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 320);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Cours (Clôture)',
                        data: closes,
                        borderColor: '#10b981',
                        backgroundColor: gradient,
                        borderWidth: 2.2,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        fill: true,
                        tension: 0.15,
                    },
                    {
                        label: 'SMA 20 (Court terme)',
                        data: sma20,
                        borderColor: '#3b82f6',
                        borderWidth: 1.5,
                        borderDash: [4, 4],
                        pointRadius: 0,
                        fill: false,
                        tension: 0.1,
                    },
                    {
                        label: 'SMA 50 (Moyen terme)',
                        data: sma50,
                        borderColor: '#f59e0b',
                        borderWidth: 1.5,
                        borderDash: [2, 2],
                        pointRadius: 0,
                        fill: false,
                        tension: 0.1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 11 },
                            boxWidth: 14,
                            padding: 12,
                        },
                    },
                    tooltip: {
                        backgroundColor: '#1a2332',
                        borderColor: '#2a3f5a',
                        borderWidth: 1,
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        padding: 10,
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(3)} TND`,
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(30, 48, 72, 0.4)' },
                        ticks: {
                            color: '#64748b',
                            font: { size: 10 },
                            maxTicksLimit: 8,
                        },
                    },
                    y: {
                        grid: { color: 'rgba(30, 48, 72, 0.4)' },
                        ticks: {
                            color: '#64748b',
                            font: { size: 10 },
                            callback: (v) => `${v.toFixed(2)} DT`,
                        },
                    },
                },
            },
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [history]);

    return (
        <div className="stock-graph-container">
            <div className="graph-header">
                <div className="graph-title">
                    <i className="fas fa-chart-area"></i> Graphique d'Évolution & Moyennes Mobiles
                </div>
                <div className="timeframe-buttons">
                    {[
                        { label: '1M', days: 30 },
                        { label: '3M', days: 90 },
                        { label: '6M', days: 180 },
                        { label: '1A', days: 365 },
                    ].map((tf) => (
                        <button
                            key={tf.label}
                            className={`tf-btn ${days === tf.days ? 'active' : ''}`}
                            onClick={() => onDaysChange(tf.days)}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="graph-canvas-wrapper" style={{ height: '320px', position: 'relative' }}>
                <canvas ref={chartRef}></canvas>
            </div>
        </div>
    );
};

// ─── Stock Detail Modal ──────────────────────────────────────────────
const StockDetailModal = ({ ticker, onClose, onSimulateTrade, watchlist = [], onToggleWatchlist }) => {
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState(null);
    const [error, setError] = useState(null);
    const [days, setDays] = useState(180);

    const isWatched = watchlist.some((w) => w.ticker === ticker);

    const loadData = async (selectedDays) => {
        try {
            setLoading(true);
            setError(null);
            const data = await api.getStockDetail(ticker, selectedDays);
            setDetail(data);
        } catch (err) {
            setError(err.message || 'Impossible de charger les données du titre.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (ticker) {
            loadData(days);
        }
    }, [ticker, days]);

    if (!ticker) return null;

    const stock = detail?.stock;
    const variations = detail?.variations || [];
    const history = detail?.history || [];
    const indicators = detail?.indicators || {};
    const signal = detail?.signal;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title-box">
                        <div className="modal-ticker-row">
                            <span className="modal-ticker">{ticker}</span>
                            {stock?.change_pct != null && (
                                <span className={`modal-change-badge ${stock.change_pct >= 0 ? 'up' : 'down'}`}>
                                    {formatPct(stock.change_pct)}
                                </span>
                            )}
                            {signal && <DirectionBadge direction={signal.direction} />}
                        </div>
                        <h2 className="modal-name">{stock?.name || ticker}</h2>
                    </div>
                    <div className="modal-header-actions">
                        <a
                            href={stock?.cotation_url || `https://www.ilboursa.com/marches/cotation_${ticker}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline"
                            title="Voir sur Ilboursa"
                        >
                            <i className="fas fa-external-link-alt"></i> Ilboursa
                        </a>
                        <button
                            className={`btn btn-sm ${isWatched ? 'btn-danger' : 'btn-outline'}`}
                            onClick={() => onToggleWatchlist(ticker)}
                        >
                            <i className={`fas ${isWatched ? 'fa-star' : 'fa-star'}`}></i>{' '}
                            {isWatched ? 'Retirer' : 'Favoris'}
                        </button>
                        <button className="btn-close-modal" onClick={onClose}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div className="modal-body">
                    {loading && (
                        <div className="loading" style={{ minHeight: '300px' }}>
                            <div className="spinner"></div> Chargement des données d'Ilboursa...
                        </div>
                    )}

                    {error && (
                        <div className="empty-state">
                            <i className="fas fa-exclamation-triangle"></i>
                            <h3>Erreur de chargement</h3>
                            <p>{error}</p>
                            <button className="btn btn-outline" style={{ marginTop: '1rem' }} onClick={() => loadData(days)}>
                                Réessayer
                            </button>
                        </div>
                    )}

                    {!loading && !error && stock && (
                        <div className="fade-in">
                            {/* Top Stats Banner */}
                            <div className="stock-kpi-grid">
                                <div className="kpi-card">
                                    <div className="kpi-label">Dernier Cours</div>
                                    <div className="kpi-value highlight">{formatPrice(stock.last)}</div>
                                </div>
                                <div className="kpi-card">
                                    <div className="kpi-label">Ouverture</div>
                                    <div className="kpi-value">{formatPrice(stock.open)}</div>
                                </div>
                                <div className="kpi-card">
                                    <div className="kpi-label">+ Haut du jour</div>
                                    <div className="kpi-value text-up">{formatPrice(stock.high)}</div>
                                </div>
                                <div className="kpi-card">
                                    <div className="kpi-label">+ Bas du jour</div>
                                    <div className="kpi-value text-down">{formatPrice(stock.low)}</div>
                                </div>
                                <div className="kpi-card">
                                    <div className="kpi-label">Volume (Titres)</div>
                                    <div className="kpi-value">{formatNumber(stock.volume_shares)}</div>
                                </div>
                                <div className="kpi-card">
                                    <div className="kpi-label">Capitaux (TND)</div>
                                    <div className="kpi-value">{formatNumber(stock.volume_tnd)} DT</div>
                                </div>
                            </div>

                            {/* Active Recommendation Card (if present) */}
                            {signal && (
                                <div className="signal-callout-card">
                                    <div className="signal-callout-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <i className="fas fa-bullhorn" style={{ color: '#10b981' }}></i>
                                            <strong>Recommandation Algorithmique Détectée</strong>
                                        </div>
                                        <SignalBadge type={signal.signal_type} />
                                    </div>
                                    <p className="signal-callout-desc">{signal.description}</p>
                                    <div className="signal-callout-meta">
                                        <div>
                                            <span>Objectif estimé : </span>
                                            <strong style={{ color: '#10b981' }}>{formatPrice(signal.target_price)}</strong>
                                        </div>
                                        <div>
                                            <span>Stop-Loss suggéré : </span>
                                            <strong style={{ color: '#ef4444' }}>{formatPrice(signal.stop_loss)}</strong>
                                        </div>
                                        <div>
                                            <span>Détecté : </span>
                                            <span style={{ color: '#94a3b8' }}>{timeAgo(signal.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Chart Area */}
                            <StockGraph history={history} days={days} onDaysChange={setDays} />

                            {/* Indicators & Variations Layout */}
                            <div className="grid-2" style={{ marginTop: '1.5rem' }}>
                                {/* Variation Data Matrix from Ilboursa */}
                                <div className="card">
                                    <div className="card-header">
                                        <div className="card-title">
                                            <i className="fas fa-history"></i> Variations Historiques (Ilboursa)
                                        </div>
                                    </div>
                                    {variations.length > 0 ? (
                                        <div className="table-wrapper">
                                            <table className="compact-table">
                                                <thead>
                                                    <tr>
                                                        <th>Période</th>
                                                        <th>+ Haut</th>
                                                        <th>+ Bas</th>
                                                        <th>Variation</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {variations.map((v, idx) => (
                                                        <tr key={idx}>
                                                            <td style={{ fontWeight: 600 }}>{v.period}</td>
                                                            <td>{formatPrice(v.high)}</td>
                                                            <td>{formatPrice(v.low)}</td>
                                                            <td>
                                                                <VariationBadge pct={v.variation_pct} />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="empty-state" style={{ padding: '1.5rem' }}>
                                            <p>Tableau de variations non disponible pour cette valeur.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Technical Analysis Summary & Trade Simulator */}
                                <div className="card">
                                    <div className="card-header">
                                        <div className="card-title">
                                            <i className="fas fa-sliders-h"></i> Indicateurs Techniques & Simulation
                                        </div>
                                    </div>
                                    <div className="indicator-summary">
                                        <div className="indicator-row">
                                            <span>RSI (14 jours) :</span>
                                            <span
                                                style={{
                                                    fontWeight: 700,
                                                    color:
                                                        indicators.rsi > 70
                                                            ? '#ef4444'
                                                            : indicators.rsi < 30
                                                            ? '#10b981'
                                                            : '#3b82f6',
                                                }}
                                            >
                                                {indicators.rsi != null ? indicators.rsi : '—'}{' '}
                                                {indicators.rsi > 70
                                                    ? '(Suracheté)'
                                                    : indicators.rsi < 30
                                                    ? '(Survendu)'
                                                    : '(Neutre)'}
                                            </span>
                                        </div>
                                        <div className="indicator-row">
                                            <span>Moyenne Mobile SMA 20 :</span>
                                            <span style={{ fontWeight: 600 }}>{formatPrice(indicators.sma_20)}</span>
                                        </div>
                                        <div className="indicator-row">
                                            <span>Moyenne Mobile SMA 50 :</span>
                                            <span style={{ fontWeight: 600 }}>{formatPrice(indicators.sma_50)}</span>
                                        </div>
                                        <div className="indicator-row">
                                            <span>Tendance Trend SMA 20/50 :</span>
                                            <span
                                                style={{
                                                    fontWeight: 700,
                                                    color:
                                                        indicators.sma_20 > indicators.sma_50
                                                            ? '#10b981'
                                                            : '#ef4444',
                                                }}
                                            >
                                                {indicators.sma_20 > indicators.sma_50 ? 'Haussière (Bullish)' : 'Baissière (Bearish)'}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                                            Simulez le gain net réel avec compte CEA (0% impôt) pour ce titre :
                                        </div>
                                        <button
                                            className="btn btn-primary btn-full"
                                            onClick={() => {
                                                onClose();
                                                onSimulateTrade({
                                                    ticker: stock.ticker,
                                                    entry: stock.last,
                                                    exit: (stock.last * 1.06).toFixed(3),
                                                });
                                            }}
                                        >
                                            <i className="fas fa-calculator"></i> Calculer les Frais & Gain Net (CEA)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Stocks A-Z Catalog View ─────────────────────────────────────────
const StocksAAZView = ({ onSelectStock, watchlist = [], onToggleWatchlist }) => {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL'); // ALL, GAINERS, LOSERS, ACTIVE
    const [sortBy, setSortBy] = useState('ticker'); // ticker, name, last, change_pct, volume
    const [sortOrder, setSortOrder] = useState('asc');

    const loadStocks = async (refresh = false) => {
        try {
            setLoading(true);
            const data = await api.getStocks(refresh);
            setStocks(data || []);
        } catch (err) {
            console.error('Failed to load A-Z stocks:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStocks();
    }, []);

    const watchedSet = useMemo(() => new Set(watchlist.map((w) => w.ticker)), [watchlist]);

    // Filtering & Sorting
    const filteredStocks = useMemo(() => {
        let list = [...stocks];

        // Search query
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
        }

        // Category
        if (filterCategory === 'GAINERS') {
            list = list.filter((s) => s.change_pct > 0);
        } else if (filterCategory === 'LOSERS') {
            list = list.filter((s) => s.change_pct < 0);
        } else if (filterCategory === 'ACTIVE') {
            list = list.filter((s) => s.volume_shares > 0);
        }

        // Sort
        list.sort((a, b) => {
            let valA = a[sortBy];
            let valB = b[sortBy];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return list;
    }, [stocks, search, filterCategory, sortBy, sortOrder]);

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const gainersCount = stocks.filter((s) => s.change_pct > 0).length;
    const losersCount = stocks.filter((s) => s.change_pct < 0).length;
    const neutralCount = stocks.filter((s) => s.change_pct === 0).length;

    return (
        <div className="fade-in">
            {/* Top Market Bar */}
            <div className="aaz-header-bar">
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                        <i className="fas fa-list-ul" style={{ color: '#10b981', marginRight: '0.5rem' }}></i>
                        Cote Officielle de la Bourse de Tunis (A-Z)
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                        Liste complète des {stocks.length} sociétés cotées extraite en direct d'Ilboursa. Cliquez sur un titre pour ouvrir son graphique et son tableau de variations.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button className="btn btn-sm btn-outline" onClick={() => loadStocks(true)}>
                        <i className="fas fa-sync-alt"></i> Actualiser
                    </button>
                    <a
                        href="https://www.ilboursa.com/marches/aaz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline"
                    >
                        <i className="fas fa-external-link-alt"></i> Source Ilboursa
                    </a>
                </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="market-breadth-row">
                <div className="breadth-pill up">
                    <i className="fas fa-arrow-up"></i> {gainersCount} En Hausse
                </div>
                <div className="breadth-pill down">
                    <i className="fas fa-arrow-down"></i> {losersCount} En Baisse
                </div>
                <div className="breadth-pill flat">
                    <i className="fas fa-minus"></i> {neutralCount} Inchangées
                </div>
                <div className="breadth-pill total">
                    <i className="fas fa-building"></i> {stocks.length} Valeurs
                </div>
            </div>

            {/* Controls Bar: Search & Category Filter */}
            <div className="aaz-controls-bar">
                <div className="search-box">
                    <i className="fas fa-search"></i>
                    <input
                        type="text"
                        placeholder="Rechercher par symbole ou raison sociale (ex: ATL, BIAT, SAH...)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="clear-search-btn" onClick={() => setSearch('')}>
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>

                <div className="category-pills">
                    {[
                        { id: 'ALL', label: 'Toutes' },
                        { id: 'GAINERS', label: 'Hausses' },
                        { id: 'LOSERS', label: 'Baisses' },
                        { id: 'ACTIVE', label: 'Titres Échangés' },
                    ].map((cat) => (
                        <button
                            key={cat.id}
                            className={`cat-pill ${filterCategory === cat.id ? 'active' : ''}`}
                            onClick={() => setFilterCategory(cat.id)}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="loading" style={{ minHeight: '300px' }}>
                    <div className="spinner"></div> Chargement du marché A-Z...
                </div>
            ) : filteredStocks.length === 0 ? (
                <div className="empty-state">
                    <i className="fas fa-search"></i>
                    <h3>Aucune valeur trouvée</h3>
                    <p>Modifiez votre filtre ou terme de recherche.</p>
                </div>
            ) : (
                <div className="card">
                    <div className="table-wrapper">
                        <table className="interactive-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>Fav</th>
                                    <th onClick={() => handleSort('ticker')} className="sortable-th">
                                        Symbole {sortBy === 'ticker' && (sortOrder === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleSort('name')} className="sortable-th">
                                        Valeur {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleSort('last')} className="sortable-th text-right">
                                        Dernier {sortBy === 'last' && (sortOrder === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleSort('change_pct')} className="sortable-th text-center">
                                        Variation {sortBy === 'change_pct' && (sortOrder === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th className="text-right">Ouverture</th>
                                    <th className="text-right">+ Haut</th>
                                    <th className="text-right">+ Bas</th>
                                    <th onClick={() => handleSort('volume_shares')} className="sortable-th text-right">
                                        Volume (Titres) {sortBy === 'volume_shares' && (sortOrder === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th className="text-right">Volume (DT)</th>
                                    <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStocks.map((stock) => {
                                    const isFav = watchedSet.has(stock.ticker);
                                    return (
                                        <tr
                                            key={stock.ticker}
                                            className="stock-row"
                                            onClick={() => onSelectStock(stock.ticker)}
                                        >
                                            <td onClick={(e) => { e.stopPropagation(); onToggleWatchlist(stock.ticker); }}>
                                                <i className={`fas fa-star fav-icon ${isFav ? 'active' : ''}`}></i>
                                            </td>
                                            <td>
                                                <span className="ticker-tag">{stock.ticker}</span>
                                            </td>
                                            <td>
                                                <div className="stock-cell-name">{stock.name}</div>
                                            </td>
                                            <td className="text-right font-bold">{formatPrice(stock.last)}</td>
                                            <td className="text-center">
                                                <VariationBadge pct={stock.change_pct} />
                                            </td>
                                            <td className="text-right">{formatPrice(stock.open)}</td>
                                            <td className="text-right text-up">{formatPrice(stock.high)}</td>
                                            <td className="text-right text-down">{formatPrice(stock.low)}</td>
                                            <td className="text-right font-mono">{formatNumber(stock.volume_shares)}</td>
                                            <td className="text-right font-mono">{formatNumber(stock.volume_tnd)}</td>
                                            <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    className="btn btn-sm btn-outline"
                                                    onClick={() => onSelectStock(stock.ticker)}
                                                    title="Voir graphique et variations"
                                                >
                                                    <i className="fas fa-chart-line"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Dashboard Overview Component ───────────────────────────────────
const DashboardOverview = ({ onNavigate, onSelectStock }) => {
    const [summary, setSummary] = useState(null);
    const [latest, setLatest] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const [sum, lat] = await Promise.all([api.getSignalSummary(), api.getLatestSignals()]);
            setSummary(sum);
            setLatest(lat || []);
        } catch (err) {
            console.error('Error loading summary:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDeleteSignal = async (id, symbol) => {
        if (!confirm(`Supprimer la recommandation pour ${symbol} ?`)) return;
        try {
            await api.deleteSignal(id);
            loadData();
        } catch (err) {
            alert(err.message || 'Erreur');
        }
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div> Chargement du tableau de bord...
            </div>
        );
    }

    const buyCount = summary?.by_direction?.BUY || 0;
    const sellCount = summary?.by_direction?.SELL || 0;
    const watchCount = summary?.by_direction?.WATCH || 0;

    return (
        <div className="fade-in">
            {/* KPI Cards */}
            <div className="stats-grid">
                <div className="stat-card" onClick={() => onNavigate('signals')}>
                    <div className="stat-icon green">
                        <i className="fas fa-chart-line"></i>
                    </div>
                    <div>
                        <div className="stat-value">{summary?.total || 0}</div>
                        <div className="stat-label">Signaux Totaux Générés</div>
                    </div>
                </div>
                <div className="stat-card" onClick={() => onNavigate('signals')}>
                    <div className="stat-icon blue">
                        <i className="fas fa-bolt"></i>
                    </div>
                    <div>
                        <div className="stat-value">{summary?.today || 0}</div>
                        <div className="stat-label">Signaux Détectés Aujourd'hui</div>
                    </div>
                </div>
                <div className="stat-card" onClick={() => onNavigate('signals')}>
                    <div className="stat-icon green">
                        <i className="fas fa-arrow-up"></i>
                    </div>
                    <div>
                        <div className="stat-value">{buyCount}</div>
                        <div className="stat-label">Recommandations d'Achat</div>
                    </div>
                </div>
                <div className="stat-card" onClick={() => onNavigate('signals')}>
                    <div className="stat-icon red">
                        <i className="fas fa-arrow-down"></i>
                    </div>
                    <div>
                        <div className="stat-value">{sellCount}</div>
                        <div className="stat-label">Alertes de Vente</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Market Guide */}
            <div className="grid-2">
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fas fa-rocket"></i> Accès Rapide aux Fonctionnalités
                        </div>
                    </div>
                    <div className="quick-actions-grid">
                        <button className="quick-btn" onClick={() => onNavigate('stocks')}>
                            <i className="fas fa-list-ul"></i>
                            <div>
                                <strong>Cote Complète A-Z</strong>
                                <span>Explorer les 90 actions BVMT</span>
                            </div>
                        </button>
                        <button className="quick-btn" onClick={() => onNavigate('signals')}>
                            <i className="fas fa-bolt"></i>
                            <div>
                                <strong>Recommandations Alpha</strong>
                                <span>Signaux avec cours cibles & stop</span>
                            </div>
                        </button>
                        <button className="quick-btn" onClick={() => onNavigate('calculator')}>
                            <i className="fas fa-calculator"></i>
                            <div>
                                <strong>Calculateur Frais & CEA</strong>
                                <span>Économie d'impôt 0% vs 10%</span>
                            </div>
                        </button>
                        <button className="quick-btn" onClick={() => onNavigate('watchlist')}>
                            <i className="fas fa-star"></i>
                            <div>
                                <strong>Mes Titres Suivis</strong>
                                <span>Portefeuille & alertes ciblées</span>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fas fa-info-circle"></i> Fonctionnement de l'Assistant
                        </div>
                    </div>
                    <div className="assistant-guide">
                        <div className="guide-item">
                            <span className="guide-num">1</span>
                            <div>
                                <strong>Génération Automatique Multi-Titres :</strong>
                                <p>
                                    L'algorithme analyse l'ensemble des titres chaque jour à <strong>14:30 CET</strong> et peut recommander <strong>plusieurs actions en même temps</strong> dès qu'elles valident les critères techniques.
                                </p>
                            </div>
                        </div>
                        <div className="guide-item">
                            <span className="guide-num">2</span>
                            <div>
                                <strong>Protection Fiscale CEA :</strong>
                                <p>
                                    Chaque signal calcule le rendement net réel après commission de courtage (0.6%), TVA (19%) et exonération d'impôt sur les plus-values (Compte Épargne en Actions).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Signals Table */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                    <div className="card-title">
                        <i className="fas fa-bullhorn"></i> Dernières Recommandations Détectées
                    </div>
                    <button className="btn btn-sm btn-outline" onClick={() => onNavigate('signals')}>
                        Voir Tout
                    </button>
                </div>
                {latest.length > 0 ? (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Symbole</th>
                                    <th>Signal</th>
                                    <th>Action</th>
                                    <th>Cours Signal</th>
                                    <th>RSI</th>
                                    <th>Objectif</th>
                                    <th>Stop-Loss</th>
                                    <th>Date</th>
                                    <th>Détail</th>
                                </tr>
                            </thead>
                            <tbody>
                                {latest.slice(0, 8).map((s) => (
                                    <tr key={s.id}>
                                        <td>
                                            <span className="ticker-tag" style={{ cursor: 'pointer' }} onClick={() => onSelectStock(s.ticker)}>
                                                {s.ticker}
                                            </span>
                                        </td>
                                        <td>
                                            <SignalBadge type={s.signal_type} />
                                        </td>
                                        <td>
                                            <DirectionBadge direction={s.direction} />
                                        </td>
                                        <td style={{ fontWeight: 700 }}>{formatPrice(s.price)}</td>
                                        <td>{s.rsi ? s.rsi.toFixed(1) : '—'}</td>
                                        <td className="text-up font-bold">{s.target_price ? formatPrice(s.target_price) : '—'}</td>
                                        <td className="text-down">{s.stop_loss ? formatPrice(s.stop_loss) : '—'}</td>
                                        <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{timeAgo(s.created_at)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                                                <button className="btn btn-sm btn-outline" onClick={() => onSelectStock(s.ticker)} title="Graphique">
                                                    <i className="fas fa-chart-line"></i>
                                                </button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteSignal(s.id, s.ticker)} title="Supprimer la recommandation">
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <i className="fas fa-satellite-dish"></i>
                        <h3>Aucun signal récent</h3>
                        <p>Lancez le screener depuis le menu d'administration pour analyser la cote.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Signals Feed View ──────────────────────────────────────────────
const SignalsView = ({ onSelectStock, onSimulateTrade }) => {
    const [signals, setSignals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [direction, setDirection] = useState('');
    const [signalType, setSignalType] = useState('');
    const [ticker, setTicker] = useState('');
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (plus récent) ou 'asc' (plus ancien)
    const [groupByDate, setGroupByDate] = useState(true); // Regroupement chronologique
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const loadSignals = async () => {
        try {
            setLoading(true);
            const res = await api.getSignals({
                direction: direction || undefined,
                signal_type: signalType || undefined,
                ticker: ticker || undefined,
                sort_order: sortOrder,
                page,
                page_size: 25,
            });
            setSignals(res.signals || []);
            setTotalPages(res.total_pages || 1);
            setTotalCount(res.total || 0);
        } catch (err) {
            console.error('Error loading signals:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSignals();
    }, [direction, signalType, sortOrder, page]);

    const handleDeleteSignal = async (id, symbol) => {
        if (!confirm(`Supprimer la recommandation #${id} pour ${symbol} ?`)) return;
        try {
            await api.deleteSignal(id);
            loadSignals();
        } catch (err) {
            alert(err.message || 'Erreur lors de la suppression.');
        }
    };

    const handleClearAll = async () => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer TOUTES les recommandations ? Cette action est irréversible.')) return;
        try {
            await api.clearSignals();
            loadSignals();
        } catch (err) {
            alert(err.message || 'Erreur lors de la suppression.');
        }
    };

    // Grouping signals by date
    const groupedSignals = useMemo(() => {
        if (!groupByDate) return null;
        const groups = {};
        signals.forEach((s) => {
            const dateKey = s.created_at ? s.created_at.slice(0, 10) : 'Autre';
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(s);
        });
        return groups;
    }, [signals, groupByDate]);

    const formatDateHeader = (dateStr) => {
        if (!dateStr || dateStr === 'Autre') return 'Date Non Spécifiée';
        try {
            const d = new Date(dateStr + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const formatted = d.toLocaleDateString('fr-TN', options);

            if (d.toDateString() === today.toDateString()) {
                return `📅 Aujourd'hui — ${formatted}`;
            }
            if (d.toDateString() === yesterday.toDateString()) {
                return `📅 Hier — ${formatted}`;
            }
            return `📅 ${formatted}`;
        } catch {
            return dateStr;
        }
    };

    const renderSignalRow = (s) => (
        <tr key={s.id}>
            <td>
                <span
                    className="ticker-tag"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectStock(s.ticker)}
                >
                    {s.ticker}
                </span>
            </td>
            <td>
                <SignalBadge type={s.signal_type} />
            </td>
            <td>
                <DirectionBadge direction={s.direction} />
            </td>
            <td style={{ fontWeight: 700 }}>{formatPrice(s.price)}</td>
            <td>{s.rsi ? s.rsi.toFixed(1) : '—'}</td>
            <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {s.sma_fast?.toFixed(3) || '—'} / {s.sma_slow?.toFixed(3) || '—'}
            </td>
            <td className="text-up font-bold">
                {s.target_price ? formatPrice(s.target_price) : '—'}
            </td>
            <td className="text-down">
                {s.stop_loss ? formatPrice(s.stop_loss) : '—'}
            </td>
            <td>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    {s.created_at ? s.created_at.slice(0, 16).replace('T', ' ') : '—'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {timeAgo(s.created_at)}
                </div>
            </td>
            <td>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                        className="btn btn-sm btn-outline"
                        title="Voir graphique et cotation"
                        onClick={() => onSelectStock(s.ticker)}
                    >
                        <i className="fas fa-chart-line"></i>
                    </button>
                    <button
                        className="btn btn-sm btn-outline"
                        title="Simuler frais et gain net"
                        onClick={() =>
                            onSimulateTrade({
                                ticker: s.ticker,
                                entry: s.price,
                                exit: s.target_price || (s.price * 1.05).toFixed(3),
                            })
                        }
                    >
                        <i className="fas fa-calculator"></i>
                    </button>
                    <button
                        className="btn btn-sm btn-danger"
                        title="Supprimer cette recommandation"
                        onClick={() => handleDeleteSignal(s.id, s.ticker)}
                    >
                        <i className="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    );

    return (
        <div className="fade-in">
            {/* Top Toolbar */}
            <div className="aaz-header-bar">
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                        <i className="fas fa-bolt" style={{ color: '#10b981', marginRight: '0.5rem' }}></i>
                        Recommandations & Signaux Classés par Date
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                        Historique complet des signaux algorithmiques générés. Vous pouvez classer par date et supprimer les signaux.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                        className={`btn btn-sm ${groupByDate ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setGroupByDate(!groupByDate)}
                        title="Activer/désactiver le groupement par journée"
                    >
                        <i className="fas fa-calendar-alt"></i> {groupByDate ? 'Groupé par Date' : 'Vue Liste'}
                    </button>
                    <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        title="Inverser l'ordre chronologique"
                    >
                        <i className={`fas fa-sort-amount-${sortOrder === 'desc' ? 'down' : 'up'}`}></i>{' '}
                        {sortOrder === 'desc' ? 'Plus Récent D\'abord' : 'Plus Ancien D\'abord'}
                    </button>
                    {totalCount > 0 && (
                        <button className="btn btn-sm btn-danger" onClick={handleClearAll} title="Purger toutes les recommandations">
                            <i className="fas fa-trash-alt"></i> Vider les Recommandations
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
                <select value={direction} onChange={(e) => { setDirection(e.target.value); setPage(1); }}>
                    <option value="">Toutes les Actions (Achat / Vente / Observer)</option>
                    <option value="BUY">ACHAT (Signaux Haussiers)</option>
                    <option value="SELL">VENTE (Signaux Baissiers)</option>
                    <option value="WATCH">OBSERVER (Surachat / Prudence)</option>
                </select>

                <select value={signalType} onChange={(e) => { setSignalType(e.target.value); setPage(1); }}>
                    <option value="">Tous les Types de Signaux</option>
                    <option value="GOLDEN_CROSS">Croisement Doré (SMA 20 &gt; 50)</option>
                    <option value="OVERSOLD_BOUNCE">Rebond RSI en Survente</option>
                    <option value="VOLUME_BREAKOUT">Cassure Forte avec Volume</option>
                    <option value="DEATH_CROSS">Croisement Baissier (SMA 20 &lt; 50)</option>
                    <option value="OVERBOUGHT_WARNING">Alerte Surachat (RSI &gt; 70)</option>
                </select>

                <input
                    type="text"
                    placeholder="Filtrer par symbole..."
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && loadSignals()}
                    style={{ width: '160px' }}
                />

                <button className="btn btn-sm btn-outline" onClick={loadSignals}>
                    <i className="fas fa-search"></i> Filtrer
                </button>

                <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#94a3b8' }}>
                    {totalCount} recommandation(s)
                </span>
            </div>

            {loading ? (
                <div className="loading">
                    <div className="spinner"></div> Chargement des signaux...
                </div>
            ) : signals.length === 0 ? (
                <div className="empty-state">
                    <i className="fas fa-filter"></i>
                    <h3>Aucune recommandation trouvée</h3>
                    <p>Aucun signal ne correspond à vos filtres ou les signaux ont été effacés.</p>
                </div>
            ) : groupByDate && groupedSignals ? (
                /* Grouped by Date View */
                <div className="date-grouped-container">
                    {Object.entries(groupedSignals).map(([dateKey, list]) => (
                        <div key={dateKey} className="card date-group-card" style={{ marginBottom: '1.5rem' }}>
                            <div className="card-header date-group-header">
                                <div className="card-title" style={{ fontSize: '1rem', color: '#10b981' }}>
                                    {formatDateHeader(dateKey)}
                                </div>
                                <span className="badge badge-info">{list.length} recommandation(s)</span>
                            </div>
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Symbole</th>
                                            <th>Type de Signal</th>
                                            <th>Direction</th>
                                            <th>Prix Signal</th>
                                            <th>RSI</th>
                                            <th>SMA 20 / 50</th>
                                            <th>Objectif Cible</th>
                                            <th>Stop-Loss</th>
                                            <th>Date & Heure</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {list.map(renderSignalRow)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Flat Table View */
                <div className="card">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Symbole</th>
                                    <th>Type de Signal</th>
                                    <th>Direction</th>
                                    <th>Prix Signal</th>
                                    <th>RSI</th>
                                    <th>SMA 20 / 50</th>
                                    <th>Objectif Cible</th>
                                    <th>Stop-Loss</th>
                                    <th>Date & Heure</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {signals.map(renderSignalRow)}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            <span>
                                Page {page} sur {totalPages}
                            </span>
                            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Watchlist View ──────────────────────────────────────────────────
const WatchlistView = ({ watchlist = [], onSelectStock, onToggleWatchlist, onNavigate }) => {
    return (
        <div className="fade-in">
            <div className="aaz-header-bar">
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                        <i className="fas fa-star" style={{ color: '#f59e0b', marginRight: '0.5rem' }}></i>
                        Mes Titres Suivis ({watchlist.length})
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                        Accès direct à vos valeurs favorites pour surveiller leurs cotations et signaux.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => onNavigate('stocks')}>
                    <i className="fas fa-plus"></i> Ajouter depuis la cote A-Z
                </button>
            </div>

            {watchlist.length === 0 ? (
                <div className="empty-state">
                    <i className="fas fa-star"></i>
                    <h3>Votre liste de favoris est vide</h3>
                    <p>Consultez la cote A-Z et cliquez sur l'étoile ou "Favoris" pour suivre des actions.</p>
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => onNavigate('stocks')}>
                        Explorer la Cote A-Z
                    </button>
                </div>
            ) : (
                <div className="watchlist-grid">
                    {watchlist.map((item) => (
                        <div key={item.ticker} className="watchlist-card" onClick={() => onSelectStock(item.ticker)}>
                            <div>
                                <span className="ticker-tag" style={{ fontSize: '1.2rem' }}>
                                    {item.ticker}
                                </span>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                    Ajouté {timeAgo(item.added_at)}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); onSelectStock(item.ticker); }}>
                                    <i className="fas fa-chart-line"></i> Graphique
                                </button>
                                <button
                                    className="btn btn-sm btn-danger"
                                    onClick={(e) => { e.stopPropagation(); onToggleWatchlist(item.ticker); }}
                                    title="Supprimer des favoris"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Cost Calculator View ───────────────────────────────────────────
const CalculatorView = ({ initialParams = {} }) => {
    const [ticker, setTicker] = useState(initialParams.ticker || 'ATL');
    const [quantity, setQuantity] = useState(100);
    const [entryPrice, setEntryPrice] = useState(initialParams.entry || 14.5);
    const [exitPrice, setExitPrice] = useState(initialParams.exit || 15.5);
    const [useCea, setUseCea] = useState(true);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const calculate = async () => {
        try {
            setLoading(true);
            const res = await api.calculateCost({
                ticker: ticker.toUpperCase(),
                quantity: Number(quantity),
                entry_price: Number(entryPrice),
                exit_price: Number(exitPrice),
                use_cea: useCea,
            });
            setResult(res);
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        calculate();
    }, [ticker, quantity, entryPrice, exitPrice, useCea]);

    return (
        <div className="fade-in">
            <div className="card">
                <div className="card-header">
                    <div className="card-title">
                        <i className="fas fa-calculator"></i> Simulateur Financier & Bouclier Fiscal CEA
                    </div>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Modélisation exacte des frais de négociation BVMT (Courtier 0.60%, TVA 19%, Bourse 0.15%) et comparaison du régime standard (10% d'impôt) versus le Compte Épargne en Actions (<strong>0% d'impôt</strong>).
                </p>

                <div className="calc-grid">
                    <div className="form-group">
                        <label>Symbole Titre</label>
                        <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} />
                    </div>
                    <div className="form-group">
                        <label>Quantité (Nombre d'actions)</label>
                        <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Cours d'Achat (TND)</label>
                        <input type="number" step="0.001" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Cours de Vente Cible (TND)</label>
                        <input type="number" step="0.001" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} />
                    </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={useCea} onChange={(e) => setUseCea(e.target.checked)} style={{ width: 'auto' }} />
                        <span style={{ fontWeight: 600, color: '#10b981' }}>
                            <i className="fas fa-shield-alt"></i> Activer le Régime CEA (0% Impôt sur la Plus-Value)
                        </span>
                    </label>
                </div>

                {result && (
                    <div className="calc-result fade-in" style={{ marginTop: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                                Résumé Financier pour <span className="ticker-tag">{result.ticker}</span>
                            </h3>
                            {result.is_cea ? (
                                <span className="badge badge-success">
                                    <i className="fas fa-check-circle"></i> Compte CEA (Exonéré d'impôt)
                                </span>
                            ) : (
                                <span className="badge badge-warning">
                                    <i className="fas fa-exclamation-circle"></i> Régime Standard (10% Retenue)
                                </span>
                            )}
                        </div>

                        <div className="grid-2">
                            <div>
                                <div className="calc-result-row">
                                    <span className="calc-result-label">Montant Investi (Achat Brut)</span>
                                    <span className="calc-result-value">{formatPrice(result.gross_investment)}</span>
                                </div>
                                <div className="calc-result-row">
                                    <span className="calc-result-label">Produit Brut de Vente</span>
                                    <span className="calc-result-value">{formatPrice(result.gross_proceeds)}</span>
                                </div>
                                <div className="calc-result-row">
                                    <span className="calc-result-label">Gain Brut (Avant Frais)</span>
                                    <span className={`calc-result-value ${result.gross_profit >= 0 ? 'positive' : 'negative'}`}>
                                        {formatPrice(result.gross_profit)} ({formatPct(result.gross_roi_pct)})
                                    </span>
                                </div>
                            </div>

                            <div>
                                <div className="calc-result-row">
                                    <span className="calc-result-label">Frais Aller-Retour (Courtage + BVMT + TVA)</span>
                                    <span className="calc-result-value" style={{ color: '#f59e0b' }}>
                                        {formatPrice(result.total_fees)}
                                    </span>
                                </div>
                                <div className="calc-result-row">
                                    <span className="calc-result-label">Impôt Prélevé</span>
                                    <span className="calc-result-value">{formatPrice(result.tax_amount)}</span>
                                </div>
                                {result.is_cea && (
                                    <div className="calc-result-row">
                                        <span className="calc-result-label">Économie d'Impôt Grâce au CEA</span>
                                        <span className="calc-result-value positive">
                                            +{formatPrice(result.tax_shield_savings)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#111827', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>PROFIT NET FINAL EN POCHE</div>
                            <div
                                style={{
                                    fontSize: '2rem',
                                    fontWeight: 800,
                                    color: result.net_profit >= 0 ? '#10b981' : '#ef4444',
                                }}
                            >
                                {formatPrice(result.net_profit)}{' '}
                                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>({formatPct(result.net_roi_pct)})</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Profile & Telegram Notifications View ─────────────────────────
const ProfileTelegramView = ({ user, onUpdateUser }) => {
    const [fullName, setFullName] = useState(user.full_name || '');
    const [phone, setPhone] = useState(user.telegram_phone || '');
    const [chatId, setChatId] = useState(user.telegram_chat_id || '');
    const [enabled, setEnabled] = useState(user.telegram_enabled ?? true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        setMessage(null);
        setError(null);
        try {
            const updated = await api.updateProfile({
                full_name: fullName,
                telegram_phone: phone,
                telegram_chat_id: chatId,
                telegram_enabled: enabled,
            });
            onUpdateUser(updated);
            setMessage('Vos informations et paramètres Telegram ont été enregistrés avec succès !');
        } catch (err) {
            setError(err.message || 'Erreur lors de l\'enregistrement.');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        if (!chatId.trim()) {
            setError('Veuillez entrer votre Telegram Chat ID ci-dessous avant d\'envoyer un test.');
            return;
        }
        setTesting(true);
        setMessage(null);
        setError(null);
        try {
            // Auto save first if modified
            await api.updateProfile({
                full_name: fullName,
                telegram_phone: phone,
                telegram_chat_id: chatId,
                telegram_enabled: enabled,
            });
            const res = await api.testTelegram(chatId.trim());
            setMessage(res.detail || 'Message Telegram envoyé avec succès ! Vérifiez votre application Telegram.');
        } catch (err) {
            setError(err.message || 'Impossible d\'envoyer le message Telegram.');
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="fade-in">
            <div className="grid-2">
                {/* Configuration Form Card */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fab fa-telegram-plane" style={{ color: '#0088cc' }}></i> Paramètres de Notifications Telegram
                        </div>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                        Configurez votre nom, numéro et identifiant Telegram pour recevoir instantanément chaque recommandation d'achat, de vente ou alerte sur les valeurs de la BVMT.
                    </p>

                    <form onSubmit={handleSave}>
                        <div className="form-group">
                            <label><i className="fas fa-user"></i> Nom Complet / Identité</label>
                            <input
                                type="text"
                                placeholder="Ex: Mohamed Ben Ali"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label><i className="fas fa-phone"></i> Numéro de Téléphone (Mobile)</label>
                            <input
                                type="tel"
                                placeholder="Ex: +216 98 123 456"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                <i className="fab fa-telegram"></i> Telegram Chat ID (Identifiant Numérique)
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: 5969495647"
                                value={chatId}
                                onChange={(e) => setChatId(e.target.value.trim())}
                            />
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
                                Vous ne connaissez pas votre Chat ID ? Suivez le guide pratique sur la droite 👉
                            </div>
                        </div>

                        <div className="form-group" style={{ paddingTop: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={(e) => setEnabled(e.target.checked)}
                                    style={{ width: 'auto' }}
                                />
                                <span style={{ fontWeight: 600, color: enabled ? '#10b981' : '#94a3b8' }}>
                                    {enabled ? '✅ Notifications Telegram Actives' : '⏸️ Notifications Telegram Suspendues'}
                                </span>
                            </label>
                        </div>

                        {message && (
                            <div className="form-success" style={{ marginBottom: '1rem', background: 'rgba(16,185,129,0.12)', border: '1px solid #10b981', color: '#10b981', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                                <i className="fas fa-check-circle"></i> {message}
                            </div>
                        )}

                        {error && (
                            <div className="form-error" style={{ marginBottom: '1rem' }}>
                                <i className="fas fa-exclamation-triangle"></i> {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                <i className="fas fa-save"></i> {saving ? 'Enregistrement...' : 'Enregistrer mes Paramètres'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={handleTest}
                                disabled={testing || !chatId}
                                title="Envoie un message de test sur votre Telegram"
                            >
                                <i className={`fab fa-telegram-plane ${testing ? 'fa-spin' : ''}`}></i>{' '}
                                {testing ? 'Envoi...' : 'Tester la Réception Telegram'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Step-by-Step Telegram Guide Card */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">
                            <i className="fas fa-book-open" style={{ color: '#10b981' }}></i> Guide : Trouver son Telegram Chat ID en 30s
                        </div>
                    </div>

                    <div className="telegram-guide-steps">
                        <div className="telegram-step-item">
                            <div className="step-circle">1</div>
                            <div className="step-content">
                                <strong>Démarrer le Bot Telegram du Service</strong>
                                <p>
                                    Ouvrez Telegram et recherchez le bot ou cliquez ci-dessous pour démarrer la conversation et autoriser l'envoi d'alertes :
                                </p>
                                <a
                                    href="https://t.me/userinfobot"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-sm btn-outline"
                                    style={{ marginTop: '0.4rem', borderColor: '#0088cc', color: '#0088cc' }}
                                >
                                    <i className="fab fa-telegram"></i> Ouvrir le Bot Telegram
                                </a>
                            </div>
                        </div>

                        <div className="telegram-step-item">
                            <div className="step-circle">2</div>
                            <div className="step-content">
                                <strong>Obtenir votre identifiant numérique unique (Chat ID)</strong>
                                <p>
                                    Dans Telegram, ouvrez le bot officiel <code>@userinfobot</code> ou <code>@RawDataBot</code> et envoyez <code>/start</code>. Le bot vous répond immédiatement avec votre <strong>Id</strong> (un nombre comme <code>5969495647</code>).
                                </p>
                                <a
                                    href="https://t.me/userinfobot"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-sm btn-outline"
                                    style={{ marginTop: '0.4rem' }}
                                >
                                    <i className="fas fa-id-card"></i> Ouvrir @userinfobot
                                </a>
                            </div>
                        </div>

                        <div className="telegram-step-item">
                            <div className="step-circle">3</div>
                            <div className="step-content">
                                <strong>Coller le Chat ID & Enregistrer</strong>
                                <p>
                                    Copiez votre numéro <strong>Id</strong>, collez-le dans le champ <em>Telegram Chat ID</em> sur la gauche, puis cliquez sur <strong>Enregistrer mes Paramètres</strong>.
                                </p>
                            </div>
                        </div>

                        <div className="telegram-step-item">
                            <div className="step-circle">4</div>
                            <div className="step-content">
                                <strong>Valider avec le bouton de test</strong>
                                <p>
                                    Cliquez sur <strong>Tester la Réception Telegram</strong>. Vous recevrez instantanément une notification de bienvenue sur votre téléphone !
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '1.25rem', padding: '0.9rem', background: 'var(--bg-elevated)', borderRadius: '8px', fontSize: '0.8rem', color: '#94a3b8' }}>
                        <i className="fas fa-shield-alt" style={{ color: '#10b981', marginRight: '0.4rem' }}></i>
                        <strong>100% Gratuit & Sécurisé :</strong> Les notifications sont délivrées via l'API officielle de Telegram sans aucun intermédiaire tiers.
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Admin Users View ────────────────────────────────────────────────
const AdminUsersView = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await api.getAdminUsers();
            setUsers(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleRole = async (userId, role) => {
        try {
            await api.updateUserRole(userId, role);
            loadUsers();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDelete = async (userId, email) => {
        if (!confirm(`Supprimer l'utilisateur ${email} ?`)) return;
        try {
            await api.deleteUser(userId);
            loadUsers();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="fade-in card">
            <div className="card-header">
                <div className="card-title">
                    <i className="fas fa-users-cog"></i> Gestion des Utilisateurs ({users.length})
                </div>
            </div>
            {loading ? (
                <div className="loading"><div className="spinner"></div> Chargement...</div>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Email</th>
                                <th>Nom Complet</th>
                                <th>Rôle</th>
                                <th>Statut</th>
                                <th>Inscription</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td style={{ color: '#64748b' }}>#{u.id}</td>
                                    <td style={{ fontWeight: 600 }}>{u.email}</td>
                                    <td>{u.full_name || '—'}</td>
                                    <td>
                                        <select
                                            className="role-select"
                                            value={u.role}
                                            onChange={(e) => handleRole(u.id, e.target.value)}
                                        >
                                            <option value="user">Utilisateur</option>
                                            <option value="admin">Administrateur</option>
                                        </select>
                                    </td>
                                    <td>
                                        <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                                            {u.is_active ? 'Actif' : 'Bloqué'}
                                        </span>
                                    </td>
                                    <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{timeAgo(u.created_at)}</td>
                                    <td>
                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id, u.email)}>
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// ─── Admin Screener View ─────────────────────────────────────────────
const AdminScreenerView = () => {
    const [status, setStatus] = useState(null);
    const [history, setHistory] = useState([]);
    const [triggering, setTriggering] = useState(false);

    const loadData = async () => {
        try {
            const [st, hist] = await Promise.all([api.getScreenerStatus(), api.getScreenerHistory()]);
            setStatus(st);
            setHistory(hist || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const triggerRun = async () => {
        try {
            setTriggering(true);
            await api.runScreener();
            alert('Screener démarré en arrière-plan !');
            setTimeout(loadData, 2000);
        } catch (err) {
            alert(err.message);
        } finally {
            setTriggering(false);
        }
    };

    return (
        <div className="fade-in">
            <div className="screener-status-card">
                <div className={`screener-status-icon ${status?.is_running ? 'running' : 'idle'}`}>
                    <i className={`fas ${status?.is_running ? 'fa-cog fa-spin' : 'fa-robot'}`}></i>
                </div>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                        {status?.is_running ? 'Scan Quantitatif en Cours...' : 'Moteur de Screening en Veille'}
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                        Planification automatique : <strong>14:30 CET (Lundi à Vendredi)</strong> après clôture BVMT.
                    </p>
                    {status?.last_run && (
                        <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.25rem' }}>
                            Dernier scan : {timeAgo(status.last_run.started_at)} ({status.last_run.signals_found} signaux générés)
                        </div>
                    )}
                </div>
                <button className="btn btn-primary" onClick={triggerRun} disabled={triggering || status?.is_running}>
                    <i className="fas fa-play"></i> Lancer le Scan Maintenant
                </button>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="card-title">
                        <i className="fas fa-history"></i> Historique des Exécutions du Screener
                    </div>
                </div>
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Scan #</th>
                                <th>Statut</th>
                                <th>Titres Analysés</th>
                                <th>Signaux Détectés</th>
                                <th>Démarré</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((r) => (
                                <tr key={r.id}>
                                    <td style={{ color: '#64748b' }}>#{r.id}</td>
                                    <td>
                                        <span className={`badge ${r.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td>{r.tickers_scanned}</td>
                                    <td style={{ fontWeight: 700 }}>{r.signals_found}</td>
                                    <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{timeAgo(r.started_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ─── Admin Alerts View ───────────────────────────────────────────────
const AdminAlertsView = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getAlertHistory()
            .then((d) => setAlerts(d || []))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="fade-in card">
            <div className="card-header">
                <div className="card-title">
                    <i className="fas fa-bell"></i> Historique des Alertes Telegram Envoyées ({alerts.length})
                </div>
            </div>
            {loading ? (
                <div className="loading"><div className="spinner"></div> Chargement...</div>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Titre</th>
                                <th>Type de Signal</th>
                                <th>Date d'Envoi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alerts.map((a) => (
                                <tr key={a.id}>
                                    <td style={{ color: '#64748b' }}>#{a.id}</td>
                                    <td><span className="ticker-tag">{a.ticker}</span></td>
                                    <td><SignalBadge type={a.signal_type} /></td>
                                    <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{timeAgo(a.sent_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// ─── Main Root Component ────────────────────────────────────────────
const App = () => {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [page, setPage] = useState('overview'); // Tableau de Bord est la page d'atterrissage principale
    const [selectedTicker, setSelectedTicker] = useState(null);
    const [calculatorParams, setCalculatorParams] = useState({});
    const [watchlist, setWatchlist] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Auth forms
    const [authMode, setAuthMode] = useState('login'); // login | register
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authName, setAuthName] = useState('');
    const [authError, setAuthError] = useState('');
    const [submittingAuth, setSubmittingAuth] = useState(false);

    // Check current auth
    const checkAuth = async () => {
        if (!api.isAuthenticated()) {
            setUser(null);
            setAuthLoading(false);
            return;
        }
        try {
            const me = await api.getMe();
            setUser(me);
            loadWatchlist();
        } catch {
            api.setToken(null);
            setUser(null);
        } finally {
            setAuthLoading(false);
        }
    };

    const loadWatchlist = async () => {
        try {
            const list = await api.getWatchlist();
            setWatchlist(list || []);
        } catch (e) {
            console.error('Watchlist fetch error:', e);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthError('');
        setSubmittingAuth(true);
        try {
            const res = await api.login(authEmail, authPassword);
            setUser(res.user);
            loadWatchlist();
        } catch (err) {
            setAuthError(err.message || 'Identifiants incorrects');
        } finally {
            setSubmittingAuth(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setAuthError('');
        setSubmittingAuth(true);
        try {
            const res = await api.register(authEmail, authPassword, authName);
            setUser(res.user);
            loadWatchlist();
        } catch (err) {
            setAuthError(err.message || 'Échec de l\'inscription');
        } finally {
            setSubmittingAuth(false);
        }
    };

    const handleLogout = () => {
        api.setToken(null);
        setUser(null);
    };

    const handleToggleWatchlist = async (ticker) => {
        const isWatched = watchlist.some((w) => w.ticker === ticker);
        try {
            if (isWatched) {
                await api.removeFromWatchlist(ticker);
            } else {
                await api.addToWatchlist(ticker);
            }
            loadWatchlist();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleSimulateTrade = (params) => {
        setCalculatorParams(params);
        setPage('calculator');
    };

    if (authLoading) {
        return (
            <div className="auth-screen">
                <div className="loading"><div className="spinner"></div> Démarrage de l'application...</div>
            </div>
        );
    }

    // Auth screen if not logged in
    if (!user) {
        return (
            <div className="auth-screen">
                <div className="auth-background"><div className="auth-grid"></div></div>
                <div className="auth-card fade-in">
                    <div className="auth-logo">
                        <div className="logo-icon"><i className="fas fa-chart-line"></i></div>
                        <h1>BVMT Assistant</h1>
                        <p className="auth-subtitle">Intelligence Boursière · Bourse de Tunis</p>
                    </div>

                    {authMode === 'login' ? (
                        <form onSubmit={handleLogin} className="auth-form">
                            <h2>Connexion</h2>
                            <div className="form-group">
                                <label><i className="fas fa-envelope"></i> Email</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="admin@bvmt.tn"
                                    value={authEmail}
                                    onChange={(e) => setAuthEmail(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label><i className="fas fa-lock"></i> Mot de passe</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={authPassword}
                                    onChange={(e) => setAuthPassword(e.target.value)}
                                />
                            </div>
                            {authError && <div className="form-error">{authError}</div>}
                            <button type="submit" className="btn btn-primary btn-full" disabled={submittingAuth}>
                                <i className="fas fa-sign-in-alt"></i> Se Connecter
                            </button>
                            <p className="auth-switch">
                                Nouveau ? <a href="#" onClick={() => { setAuthMode('register'); setAuthError(''); }}>Créer un compte</a>
                            </p>
                            <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: '#64748b', textAlign: 'center' }}>
                                Démo Admin : <code>admin@bvmt.tn</code> / <code>admin123</code>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="auth-form">
                            <h2>Créer un Compte</h2>
                            <div className="form-group">
                                <label><i className="fas fa-user"></i> Nom Complet</label>
                                <input
                                    type="text"
                                    placeholder="Nom & Prénom"
                                    value={authName}
                                    onChange={(e) => setAuthName(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label><i className="fas fa-envelope"></i> Email</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="vous@exemple.tn"
                                    value={authEmail}
                                    onChange={(e) => setAuthEmail(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label><i className="fas fa-lock"></i> Mot de passe</label>
                                <input
                                    type="password"
                                    required
                                    minLength="6"
                                    placeholder="Min 6 caractères"
                                    value={authPassword}
                                    onChange={(e) => setAuthPassword(e.target.value)}
                                />
                            </div>
                            {authError && <div className="form-error">{authError}</div>}
                            <button type="submit" className="btn btn-primary btn-full" disabled={submittingAuth}>
                                <i className="fas fa-user-plus"></i> Créer mon Compte
                            </button>
                            <p className="auth-switch">
                                Déjà inscrit ? <a href="#" onClick={() => { setAuthMode('login'); setAuthError(''); }}>Connexion</a>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    const isAdmin = user.role === 'admin';

    return (
        <div className="dashboard">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <i className="fas fa-chart-line"></i>
                        <span>BVMT</span>
                    </div>
                    <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <i className="fas fa-bars"></i>
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <a
                        href="#"
                        className={`nav-item ${page === 'overview' ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); setPage('overview'); setSidebarOpen(false); }}
                    >
                        <i className="fas fa-th-large"></i>
                        <span>Tableau de Bord</span>
                    </a>
                    <a
                        href="#"
                        className={`nav-item ${page === 'stocks' ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); setPage('stocks'); setSidebarOpen(false); }}
                    >
                        <i className="fas fa-list-ul"></i>
                        <span>Cote A-Z (90 Titres)</span>
                    </a>
                    <a
                        href="#"
                        className={`nav-item ${page === 'signals' ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); setPage('signals'); setSidebarOpen(false); }}
                    >
                        <i className="fas fa-bolt"></i>
                        <span>Recommandations</span>
                    </a>
                    <a
                        href="#"
                        className={`nav-item ${page === 'watchlist' ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); setPage('watchlist'); setSidebarOpen(false); }}
                    >
                        <i className="fas fa-star"></i>
                        <span>Mes Favoris ({watchlist.length})</span>
                    </a>
                    <a
                        href="#"
                        className={`nav-item ${page === 'calculator' ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); setPage('calculator'); setSidebarOpen(false); }}
                    >
                        <i className="fas fa-calculator"></i>
                        <span>Calculateur CEA</span>
                    </a>
                    <a
                        href="#"
                        className={`nav-item ${page === 'profile' ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); setPage('profile'); setSidebarOpen(false); }}
                    >
                        <i className="fab fa-telegram-plane"></i>
                        <span>Profil & Telegram</span>
                    </a>

                    {isAdmin && (
                        <>
                            <div className="nav-divider"></div>
                            <div className="nav-label">Administration</div>
                            <a
                                href="#"
                                className={`nav-item ${page === 'admin-users' ? 'active' : ''}`}
                                onClick={(e) => { e.preventDefault(); setPage('admin-users'); setSidebarOpen(false); }}
                            >
                                <i className="fas fa-users-cog"></i>
                                <span>Utilisateurs</span>
                            </a>
                            <a
                                href="#"
                                className={`nav-item ${page === 'admin-screener' ? 'active' : ''}`}
                                onClick={(e) => { e.preventDefault(); setPage('admin-screener'); setSidebarOpen(false); }}
                            >
                                <i className="fas fa-robot"></i>
                                <span>Contrôle Screener</span>
                            </a>
                            <a
                                href="#"
                                className={`nav-item ${page === 'admin-alerts' ? 'active' : ''}`}
                                onClick={(e) => { e.preventDefault(); setPage('admin-alerts'); setSidebarOpen(false); }}
                            >
                                <i className="fas fa-bell"></i>
                                <span>Alertes Telegram</span>
                            </a>
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info" style={{ cursor: 'pointer' }} onClick={() => setPage('profile')}>
                        <div className="user-avatar">{(user.full_name || user.email)[0].toUpperCase()}</div>
                        <div className="user-details">
                            <span className="user-name">{user.full_name || user.email}</span>
                            <span className="user-role">{user.role}</span>
                        </div>
                    </div>
                    <button className="btn-icon" onClick={handleLogout} title="Déconnexion">
                        <i className="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </aside>

            {/* Main Content Pane */}
            <main className="main-content">
                <header className="top-bar">
                    <div className="top-bar-left">
                        <button className="sidebar-toggle-mobile" onClick={() => setSidebarOpen(true)}>
                            <i className="fas fa-bars"></i>
                        </button>
                        <h2>
                            {page === 'overview' && 'Tableau de Bord Exécutif'}
                            {page === 'stocks' && 'Cote Officielle des Actions BVMT (A-Z)'}
                            {page === 'signals' && 'Flux des Signaux & Recommandations'}
                            {page === 'watchlist' && 'Mes Actions Favorites'}
                            {page === 'calculator' && 'Simulateur de Frais & Avantage Fiscal CEA'}
                            {page === 'profile' && 'Configuration Profil & Notifications Telegram'}
                            {page === 'admin-users' && 'Administration des Comptes'}
                            {page === 'admin-screener' && 'Planificateur & Contrôle Screener'}
                            {page === 'admin-alerts' && 'Historique des Notifications Telegram'}
                        </h2>
                    </div>

                    <div className="top-bar-right">
                        {user.telegram_chat_id && user.telegram_enabled ? (
                            <div
                                className="market-status open"
                                style={{ cursor: 'pointer', background: 'rgba(16, 185, 129, 0.12)', borderColor: '#10b981' }}
                                onClick={() => setPage('profile')}
                                title="Notifications Telegram configurées"
                            >
                                <i className="fab fa-telegram-plane" style={{ color: '#10b981' }}></i>
                                <span style={{ color: '#10b981' }}>Telegram Actif</span>
                            </div>
                        ) : (
                            <div
                                className="market-status"
                                style={{ cursor: 'pointer', borderColor: '#f59e0b', color: '#f59e0b' }}
                                onClick={() => setPage('profile')}
                                title="Cliquez pour configurer vos alertes Telegram"
                            >
                                <i className="fab fa-telegram-plane"></i>
                                <span>Configurer Telegram</span>
                            </div>
                        )}
                        <div className="market-status open">
                            <span className="status-dot"></span>
                            <span>Bourse de Tunis · Connecté</span>
                        </div>
                    </div>
                </header>

                <div className="content">
                    {page === 'overview' && (
                        <DashboardOverview
                            onNavigate={(p) => setPage(p)}
                            onSelectStock={(t) => setSelectedTicker(t)}
                        />
                    )}
                    {page === 'stocks' && (
                        <StocksAAZView
                            onSelectStock={(t) => setSelectedTicker(t)}
                            watchlist={watchlist}
                            onToggleWatchlist={handleToggleWatchlist}
                        />
                    )}
                    {page === 'signals' && (
                        <SignalsView
                            onSelectStock={(t) => setSelectedTicker(t)}
                            onSimulateTrade={handleSimulateTrade}
                        />
                    )}
                    {page === 'watchlist' && (
                        <WatchlistView
                            watchlist={watchlist}
                            onSelectStock={(t) => setSelectedTicker(t)}
                            onToggleWatchlist={handleToggleWatchlist}
                            onNavigate={(p) => setPage(p)}
                        />
                    )}
                    {page === 'calculator' && <CalculatorView initialParams={calculatorParams} />}
                    {page === 'profile' && (
                        <ProfileTelegramView
                            user={user}
                            onUpdateUser={(updated) => setUser(updated)}
                        />
                    )}
                    {page === 'admin-users' && <AdminUsersView />}
                    {page === 'admin-screener' && <AdminScreenerView />}
                    {page === 'admin-alerts' && <AdminAlertsView />}
                </div>
            </main>

            {/* Interactive Stock Detail Modal */}
            {selectedTicker && (
                <StockDetailModal
                    ticker={selectedTicker}
                    onClose={() => setSelectedTicker(null)}
                    onSimulateTrade={handleSimulateTrade}
                    watchlist={watchlist}
                    onToggleWatchlist={handleToggleWatchlist}
                />
            )}
        </div>
    );
};

// Mount React Root
const rootEl = document.getElementById('root');
if (rootEl) {
    const root = ReactDOM.createRoot(rootEl);
    root.render(<App />);
}
