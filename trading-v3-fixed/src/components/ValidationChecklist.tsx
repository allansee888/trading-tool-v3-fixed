import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, collection, query, getDocs } from 'firebase/firestore';
import { CheckCircle, Circle, ChevronDown, ChevronUp, Rocket } from 'lucide-react';
import { toast } from 'sonner';

const ITEMS = [
  { key: 'five_trading_days', label: 'Ran for minimum 5 trading days' },
  { key: 'twenty_signals', label: 'Minimum 20 signals generated' },
  { key: 'ten_trades', label: 'Minimum 10 trades executed' },
  { key: 'win_rate_55', label: 'Win rate above 55%' },
  { key: 'no_guard_bugs', label: 'No Risk Guard failures due to code bugs' },
  { key: 'loss_limit_ok', label: 'Daily loss limit never triggered unexpectedly' },
  { key: 'ws_reconnect_tested', label: 'WebSocket reconnection tested' },
  { key: 'trades_logged', label: 'All trades logged correctly in Firestore' },
  { key: 'signals_reviewed', label: 'Signal accuracy reviewed manually' },
];

export function ValidationChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState({ signals: 0, trades: 0 });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'validation'), (snap) => {
      if (snap.exists()) setChecked(snap.data());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const sigSnap = await getDocs(collection(db, 'signals'));
        const tradeSnap = await getDocs(query(collection(db, 'trades')));
        setStats({ signals: sigSnap.size, trades: tradeSnap.size });
      } catch (e) {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggle = async (key: string) => {
    const updated = { ...checked, [key]: !checked[key] };
    setChecked(updated);
    await setDoc(doc(db, 'config', 'validation'), updated, { merge: true });
  };

  const completedCount = ITEMS.filter(item => checked[item.key]).length;
  const allDone = completedCount === ITEMS.length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-4 py-3 flex justify-between items-center hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">Paper Trading Validation</h2>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${allDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
            {completedCount}/{ITEMS.length}
          </span>
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronUp className="w-4 h-4 text-slate-500" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {/* Auto stats */}
          <div className="flex space-x-4 text-[10px] font-mono text-slate-500 mb-2 pb-2 border-b border-slate-800">
            <span>Signals recorded: <span className="text-white font-bold">{stats.signals}</span></span>
            <span>Trades recorded: <span className="text-white font-bold">{stats.trades}</span></span>
          </div>

          {ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => toggle(item.key)}
              className="w-full flex items-center space-x-3 text-left group"
            >
              {checked[item.key]
                ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                : <Circle className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
              }
              <span className={`text-sm ${checked[item.key] ? 'text-slate-400 line-through' : 'text-slate-300'}`}>
                {item.label}
              </span>
            </button>
          ))}

          {allDone && (
            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
              <Rocket className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-emerald-400 font-bold text-sm">Ready to Go Live</p>
              <p className="text-emerald-500/70 text-xs mt-1">
                Change ALPACA_BASE_URL to https://api.alpaca.markets to enable live trading
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
