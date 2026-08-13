import { useEffect, useState, useCallback } from 'react';
import { ConnectionStatus } from './ConnectionStatus';
import { SignalFeed } from './SignalFeed';
import { TradeLog } from './TradeLog';
import { WatchlistManager } from './WatchlistManager';
import { StrategyConfig } from './StrategyConfig';
import { TickerChart } from './TickerChart';
import { ValidationChecklist } from './ValidationChecklist';
import { AccountSnapshot, Position, Order } from '../types';
import { RefreshCw } from 'lucide-react';

type Tab = 'overview' | 'signals' | 'config';

export function AccountDashboard() {
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedChart, setSelectedChart] = useState<string | null>(null);

  const fetchAccountData = useCallback(async () => {
    setIsRefreshing(true);
    setErrorMessage('');
    try {
      const baseUrl = import.meta.env.VITE_APP_URL || '';
      const [accRes, posRes, ordRes] = await Promise.all([
        fetch(`${baseUrl}/api/account`),
        fetch(`${baseUrl}/api/positions`),
        fetch(`${baseUrl}/api/orders`),
      ]);

      if (!accRes.ok) {
        const err = await accRes.json().catch(() => ({}));
        throw new Error(err.error || 'Network error');
      }

      setAccount(await accRes.json());
      setPositions(await posRes.json());
      setOrders(await ordRes.json());
      setStatus('connected');
      setLastSync(new Date());
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message === 'Invalid credentials' ? 'Invalid API credentials.' : 'Alpaca unavailable, retrying...');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAccountData();
    const interval = setInterval(fetchAccountData, 30000);
    return () => clearInterval(interval);
  }, [fetchAccountData]);

  const fmt = (val: any) => {
    if (val === undefined || val === null) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(val));
  };

  const dailyPnl = account ? parseFloat(account.equity as any) - parseFloat(account.last_equity as any) : 0;
  const dailyPct = account && parseFloat(account.last_equity as any) > 0
    ? (dailyPnl / parseFloat(account.last_equity as any)) * 100 : 0;

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'signals', label: 'Signals & Trades' },
    { key: 'config', label: 'Config' },
  ];

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-6 flex flex-col space-y-5 overflow-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              ALPACA CONNECT <span className="text-slate-500 font-medium text-sm ml-2">v2.0.0</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">VWAP · RSI · MACD · AUTO-EXECUTION</p>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <ConnectionStatus status={status} message={errorMessage} lastSync={lastSync} />
          <button
            onClick={fetchAccountData}
            disabled={isRefreshing}
            className="bg-slate-800 hover:bg-slate-700 text-slate-100 px-4 py-2 rounded text-xs font-semibold transition-colors flex items-center space-x-2 border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
        </div>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Portfolio Value', value: fmt(account?.portfolio_value) },
          { label: 'Buying Power', value: fmt(account?.buying_power) },
          { label: 'Cash Balance', value: fmt(account?.balance) },
          {
            label: 'Daily P&L',
            value: fmt(dailyPnl),
            sub: `${dailyPnl >= 0 ? '+' : ''}${dailyPct.toFixed(2)}%`,
            color: dailyPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
          },
          {
            label: 'Account Status',
            value: account?.status || 'UNKNOWN',
            color: account?.status === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-200'
          },
        ].map((card, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{card.label}</span>
            <div className={`text-xl font-bold mt-2 ${card.color || 'text-white'}`}>{card.value}</div>
            {card.sub && <div className={`text-xs mt-0.5 ${card.color}`}>{card.sub}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-slate-800">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'text-white border-indigo-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Chart */}
          {selectedChart && (
            <TickerChart ticker={selectedChart} onClose={() => setSelectedChart(null)} />
          )}

          {/* Positions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase">Open Positions</h2>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase">{positions.length} Active</span>
            </div>
            <div className="overflow-auto">
              {positions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono">No open positions</div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="text-xs text-slate-500 uppercase font-mono sticky top-0 bg-slate-900">
                    <tr>
                      {['Symbol', 'Qty', 'Entry Price', 'Current Price', 'Unrealized P/L'].map(h => (
                        <th key={h} className="px-4 py-3 font-normal border-b border-slate-800">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {positions.map((pos, i) => (
                      <tr key={i} className="hover:bg-slate-800/50 cursor-pointer" onClick={() => setSelectedChart(pos.symbol)}>
                        <td className="px-4 py-4 font-bold text-indigo-400">{pos.symbol}</td>
                        <td className="px-4 py-4 text-slate-300">{pos.qty}</td>
                        <td className="px-4 py-4 text-slate-300">{fmt(pos.avg_entry_price)}</td>
                        <td className="px-4 py-4 text-slate-300">{fmt(pos.current_price)}</td>
                        <td className={`px-4 py-4 font-medium ${parseFloat(pos.unrealized_pl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {fmt(pos.unrealized_pl)} <span className="text-xs opacity-75">({(parseFloat(pos.unrealized_plpc) * 100).toFixed(2)}%)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white uppercase">Recent Orders</h2>
            </div>
            <div className="overflow-auto">
              {orders.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono">No recent orders</div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="text-xs text-slate-500 uppercase font-mono sticky top-0 bg-slate-900">
                    <tr>
                      {['Symbol', 'Qty', 'Status', 'Avg Price'].map(h => (
                        <th key={h} className="px-4 py-3 font-normal border-b border-slate-800">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {orders.map((ord, i) => (
                      <tr key={i} className="hover:bg-slate-800/50">
                        <td className="px-4 py-4 font-bold text-white">{ord.symbol}</td>
                        <td className="px-4 py-4 text-slate-300">{ord.qty}</td>
                        <td className="px-4 py-4">
                          <span className={`text-[10px] font-bold uppercase ${ord.status === 'filled' || ord.status === 'accepted' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {ord.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-400">{ord.filled_avg_price ? fmt(ord.filled_avg_price) : '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <ValidationChecklist />
        </div>
      )}

      {activeTab === 'signals' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SignalFeed />
          <TradeLog />
        </div>
      )}

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <WatchlistManager />
          <StrategyConfig />
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 pt-4 flex justify-between items-center shrink-0">
        <div className="flex space-x-6 text-[11px] text-slate-500 font-medium">
          {['FIRESTORE: OK', 'FUNCTIONS: OK'].map(label => (
            <div key={label} className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
              <span>{label}</span>
            </div>
          ))}
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-indigo-500' : 'bg-rose-500'}`}></span>
            <span>ALPACA-API: {status.toUpperCase()}</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-500 font-mono uppercase">
          LAST UPDATED: {lastSync ? lastSync.toISOString().replace('T', ' ').substring(0, 19) + ' UTC' : 'NEVER'}
        </div>
      </footer>
    </div>
  );
}
