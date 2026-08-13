import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_TICKERS = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'SPY'];
const MAX_TICKERS = 10;

export function WatchlistManager() {
  const [tickers, setTickers] = useState<string[]>(DEFAULT_TICKERS);
  const [input, setInput] = useState('');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'watchlist'), (snap) => {
      if (snap.exists() && snap.data().tickers?.length > 0) {
        setTickers(snap.data().tickers);
      }
    });
    return () => unsub();
  }, []);

  const saveWatchlist = async (updated: string[]) => {
    await setDoc(doc(db, 'config', 'watchlist'), { tickers: updated, updated_at: new Date().toISOString() });
  };

  const addTicker = async () => {
    const symbol = input.trim().toUpperCase();
    if (!symbol) return;
    if (tickers.includes(symbol)) {
      toast.error(`${symbol} already in watchlist`);
      return;
    }
    if (tickers.length >= MAX_TICKERS) {
      toast.error(`Max ${MAX_TICKERS} tickers allowed`);
      return;
    }

    setValidating(true);
    try {
      // Validate against Alpaca asset endpoint
      const baseUrl = import.meta.env.VITE_APP_URL || '';
      const res = await fetch(`${baseUrl}/api/validate-ticker?symbol=${symbol}`);
      if (!res.ok) throw new Error('Invalid ticker');
      const data = await res.json();
      if (!data.valid) throw new Error('Ticker not found');

      const updated = [...tickers, symbol];
      setTickers(updated);
      await saveWatchlist(updated);
      setInput('');
      toast.success(`${symbol} added to watchlist`);
    } catch (e) {
      toast.error(`${symbol} not found on Alpaca`);
    } finally {
      setValidating(false);
    }
  };

  const removeTicker = async (symbol: string) => {
    const updated = tickers.filter(t => t !== symbol);
    setTickers(updated);
    await saveWatchlist(updated);
    toast.info(`${symbol} removed from watchlist`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wide">Watchlist</h2>
        <span className="text-[10px] text-slate-500 font-mono">{tickers.length}/{MAX_TICKERS}</span>
      </div>

      <div className="flex space-x-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && addTicker()}
          placeholder="Add ticker (e.g. AMZN)"
          maxLength={6}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 font-mono uppercase focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={addTicker}
          disabled={validating || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-2 rounded flex items-center space-x-1 text-xs font-bold transition-colors"
        >
          {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tickers.map(ticker => (
          <div key={ticker} className="flex items-center space-x-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5">
            <span className="text-xs font-bold text-white font-mono">{ticker}</span>
            <button
              onClick={() => removeTicker(ticker)}
              className="text-slate-500 hover:text-rose-400 transition-colors ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-600 mt-3">
        Changes apply on next WebSocket reconnect. Restart the server to stream new tickers immediately.
      </p>
    </div>
  );
}
