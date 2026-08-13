import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';

const DEFAULT_WATCHLIST = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'SPY'];

export function TickerStrip() {
  const [tickerData, setTickerData] = useState<Record<string, any>>({});
  const [dailyOpen, setDailyOpen] = useState<Record<string, number>>({});
  const [streamStatus, setStreamStatus] = useState<string>('connecting');
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);

  // Fetch daily open price from Alpaca for accurate daily change %
  const fetchDailyOpen = async (tickers: string[]) => {
    try {
      const baseUrl = import.meta.env.VITE_APP_URL || '';
      const res = await fetch(`${baseUrl}/api/daily-open?symbols=${tickers.join(',')}`);
      if (res.ok) {
        const data = await res.json();
        setDailyOpen(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    // Listen to watchlist config
    const watchlistUnsub = onSnapshot(doc(db, 'config', 'watchlist'), (snap) => {
      if (snap.exists() && snap.data().tickers?.length > 0) {
        setWatchlist(snap.data().tickers);
      }
    });

    return () => watchlistUnsub();
  }, []);

  useEffect(() => {
    fetchDailyOpen(watchlist);
    // Refresh daily open every 5 minutes
    const interval = setInterval(() => fetchDailyOpen(watchlist), 300000);
    return () => clearInterval(interval);
  }, [watchlist]);

  useEffect(() => {
    const unsubscribes: any[] = [];

    const statusUnsub = onSnapshot(doc(db, 'account', 'stream_status'), (snap) => {
      if (snap.exists()) setStreamStatus(snap.data().status);
    });
    unsubscribes.push(statusUnsub);

    watchlist.forEach(ticker => {
      const q = query(
        collection(db, 'candles', ticker, 'bars'),
        orderBy('t', 'desc'),
        limit(1)
      );
      const unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const latest = snapshot.docs[0].data();
          setTickerData(prev => ({ ...prev, [ticker]: latest }));
        }
      });
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(u => u());
  }, [watchlist]);

  return (
    <div className="bg-slate-950 border-b border-slate-800 flex items-center px-6 py-3 space-x-8 overflow-x-auto shrink-0 z-10">
      <div className="flex items-center space-x-2 border-r border-slate-800 pr-6 shrink-0">
        <div className={`w-2 h-2 rounded-full ${streamStatus === 'streaming' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-amber-500'}`}></div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {streamStatus === 'streaming' ? 'LIVE FEED' : 'CONNECTING...'}
        </span>
      </div>

      <div className="flex space-x-8">
        {watchlist.map(ticker => {
          const data = tickerData[ticker];
          if (!data) return (
            <div key={ticker} className="flex flex-col animate-pulse shrink-0 opacity-50">
              <span className="text-[10px] font-bold text-slate-500">{ticker}</span>
              <span className="text-sm font-mono text-slate-700">---</span>
            </div>
          );

          // Use daily open for accurate % change, fallback to candle open
          const openPrice = dailyOpen[ticker] || data.open;
          const changePct = ((data.close - openPrice) / openPrice) * 100;
          const isPositive = changePct >= 0;

          return (
            <div key={ticker} className="flex flex-col shrink-0 min-w-[80px]">
              <div className="flex items-center justify-between space-x-3">
                <span className="text-[11px] font-bold text-white uppercase tracking-wide">{ticker}</span>
                <span className={`text-[10px] font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? '+' : ''}{changePct.toFixed(2)}%
                </span>
              </div>
              <span className="text-sm font-mono font-medium text-slate-200 mt-0.5">
                ${data.close.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                VWAP ${data.vwap?.toFixed(2) || '--'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
