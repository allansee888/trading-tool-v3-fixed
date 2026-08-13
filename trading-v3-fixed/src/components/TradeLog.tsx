import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export function TradeLog() {
  const [trades, setTrades] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'trades'), orderBy('timestamp', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrades(data);
    });
    return () => unsub();
  }, []);

  // Fetch closed positions for win rate
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const baseUrl = import.meta.env.VITE_APP_URL || '';
        const res = await fetch(`${baseUrl}/api/portfolio-history`);
        if (res.ok) {
          const data = await res.json();
          setPositions(data);
        }
      } catch (e) {}
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return iso; }
  };

  const executedTrades = trades.filter(t => t.status === 'executed');
  const rejectedTrades = trades.filter(t => t.status === 'rejected');

  // Calculate win rate from buy/sell pairs
  const buys = trades.filter(t => t.status === 'executed' && t.side === 'buy');
  const sells = trades.filter(t => t.status === 'executed' && t.side === 'sell');
  let wins = 0;
  sells.forEach(sell => {
    const matchingBuy = buys.find(b => b.ticker === sell.ticker);
    if (matchingBuy && sell.filled_avg_price && matchingBuy.filled_avg_price) {
      if (sell.filled_avg_price > matchingBuy.filled_avg_price) wins++;
    }
  });
  const winRate = sells.length > 0 ? `${Math.round((wins / sells.length) * 100)}%` : '--%';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden w-full h-[500px]">
      <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <h2 className="text-sm font-bold text-white tracking-wide uppercase">Execution Log</h2>
        <div className="flex space-x-4 text-[10px] font-mono text-slate-400">
          <div className="flex items-center space-x-1">
            <span className="uppercase text-slate-500">Total:</span>
            <span className="text-white font-bold">{trades.length}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="uppercase text-slate-500">Executed:</span>
            <span className="text-emerald-400 font-bold">{executedTrades.length}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="uppercase text-slate-500">Rejected:</span>
            <span className="text-rose-400 font-bold">{rejectedTrades.length}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="uppercase text-slate-500">Win Rate:</span>
            <span className="text-indigo-400 font-bold">{winRate}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="text-xs text-slate-500 uppercase font-mono sticky top-0 bg-slate-900 z-10">
            <tr>
              <th className="px-4 py-3 font-normal border-b border-slate-800">Time</th>
              <th className="px-4 py-3 font-normal border-b border-slate-800">Ticker</th>
              <th className="px-4 py-3 font-normal border-b border-slate-800">Side</th>
              <th className="px-4 py-3 font-normal border-b border-slate-800">Size / Value</th>
              <th className="px-4 py-3 font-normal border-b border-slate-800">Status</th>
              <th className="px-4 py-3 font-normal border-b border-slate-800">Fill Price</th>
              <th className="px-4 py-3 font-normal border-b border-slate-800">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {trades.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-mono text-xs uppercase">
                  No automated trades executed yet...
                </td>
              </tr>
            ) : (
              trades.map((t, i) => (
                <tr key={t.id || i} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{formatDate(t.timestamp)}</td>
                  <td className="px-4 py-3 font-bold text-white">{t.ticker}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${
                      t.side === 'buy'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>{t.side}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-300">
                    {t.qty} <span className="text-slate-600">/</span> ${(t.order_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    {t.status === 'executed'
                      ? <span className="text-emerald-400 text-xs font-bold uppercase">Executed</span>
                      : <span className="text-rose-400 text-xs font-bold uppercase">Rejected</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-300">
                    {t.filled_avg_price ? `$${t.filled_avg_price.toFixed(2)}` : '--'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-[180px]" title={t.rejection_reason || ''}>
                    {t.rejection_reason || '--'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
