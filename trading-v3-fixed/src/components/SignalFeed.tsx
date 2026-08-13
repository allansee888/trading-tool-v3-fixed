import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export function SignalFeed() {
  const [signals, setSignals] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const q = query(collection(db, 'signals'), orderBy('timestamp', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSignals(data);
    });
    return () => unsub();
  }, []);

  const filtered = signals.filter(s => {
    if (filter === 'ALL') return true;
    if (filter === 'BUY') return s.signal.includes('BUY');
    if (filter === 'SELL') return s.signal.includes('SELL');
    if (filter === 'STRONG') return s.signal.includes('STRONG');
    return true;
  });

  const getSignalBadge = (sig: string) => {
    if (sig === 'STRONG_BUY') return <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded uppercase tracking-wider">Strong Buy</span>;
    if (sig === 'WEAK_BUY') return <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500/80 border border-emerald-500/20 text-[10px] font-bold rounded uppercase tracking-wider">Weak Buy</span>;
    if (sig === 'STRONG_SELL') return <span className="px-2 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold rounded uppercase tracking-wider">Strong Sell</span>;
    if (sig === 'WEAK_SELL') return <span className="px-2 py-1 bg-rose-500/10 text-rose-500/80 border border-rose-500/20 text-[10px] font-bold rounded uppercase tracking-wider">Weak Sell</span>;
    return <span className="px-2 py-1 bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold rounded uppercase tracking-wider">Hold</span>;
  };

  const getConfidenceColor = (pct: number) => {
    if (pct >= 90) return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
    if (pct >= 60) return 'bg-emerald-500/60';
    if (pct >= 40) return 'bg-slate-500';
    return 'bg-rose-500/60';
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden w-full h-[500px]">
      <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <div className="flex items-center space-x-3">
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">Algorithmic Signals</h2>
          <div className="flex space-x-2">
            {['ALL', 'BUY', 'SELL', 'STRONG'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-[10px] font-bold rounded transition-colors uppercase ${
                  filter === f ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Engine Active</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="text-xs text-slate-500 uppercase font-mono sticky top-0 bg-slate-900 z-10">
            <tr>
              <th className="px-4 py-3 font-normal border-b border-slate-800">Time</th>
              <th className="px-4 py-3 font-normal border-b border-slate-800">Ticker</th>
              <th className="px-4 py-3 font-normal border-b border-slate-800">Signal</th>
              <th className="px-4 py-3 font-normal border-b border-slate-800">Confidence</th>
              <th className="px-4 py-3 font-normal border-b border-slate-800">VWAP Bias</th>
              <th className="px-4 py-3 font-normal border-b border-slate-800">RSI (14)</th>
              <th className="px-4 py-3 font-normal border-b border-slate-800 text-right">MACD Hist</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-mono text-xs uppercase">
                  No signals detected... waiting for stream data
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => (
                <tr key={s.id || i} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{formatDate(s.timestamp)}</td>
                  <td className="px-4 py-3 font-bold text-white">{s.ticker}</td>
                  <td className="px-4 py-3">{getSignalBadge(s.signal)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden w-16">
                        <div className={`h-full ${getConfidenceColor(s.confidence)}`} style={{ width: `${s.confidence}%` }}></div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{s.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={s.vwap_bias === 'bullish' ? 'text-emerald-400' : 'text-rose-400'}>
                      {s.vwap_bias.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-300">
                    {s.rsi ? s.rsi.toFixed(2) : '--'}
                  </td>
                  <td className={`px-4 py-3 text-xs font-mono text-right ${s.histogram > 0 ? 'text-emerald-400' : s.histogram < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {s.histogram ? s.histogram.toFixed(4) : '--'}
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
