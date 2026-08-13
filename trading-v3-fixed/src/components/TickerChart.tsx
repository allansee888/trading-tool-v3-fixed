import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { X } from 'lucide-react';

interface TickerChartProps {
  ticker: string;
  onClose: () => void;
}

export function TickerChart({ ticker, onClose }: TickerChartProps) {
  const [candles, setCandles] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'candles', ticker, 'bars'),
      orderBy('t', 'asc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setCandles(snap.docs.map(d => d.data()));
    });
    return () => unsub();
  }, [ticker]);

  useEffect(() => {
    const q = query(
      collection(db, 'signals'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setSignals(snap.docs.map(d => d.data()).filter(s => s.ticker === ticker));
    });
    return () => unsub();
  }, [ticker]);

  // Simple SVG chart renderer
  const renderChart = () => {
    if (candles.length === 0) return null;

    const W = 700, H = 200;
    const prices = candles.map(c => c.close);
    const vwaps = candles.map(c => c.vwap);
    const allPrices = [...prices, ...vwaps].filter(Boolean);
    const minP = Math.min(...allPrices) * 0.999;
    const maxP = Math.max(...allPrices) * 1.001;
    const scaleY = (v: number) => H - ((v - minP) / (maxP - minP)) * H;
    const scaleX = (i: number) => (i / (candles.length - 1)) * W;

    const pricePath = prices.map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)},${scaleY(p).toFixed(1)}`).join(' ');
    const vwapPath = vwaps.map((v, i) => v ? `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}` : '').filter(Boolean).join(' ');

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Price area */}
        <path d={`${pricePath} L${scaleX(candles.length-1)},${H} L0,${H} Z`} fill="url(#priceGrad)" />
        {/* Price line */}
        <path d={pricePath} fill="none" stroke="#6366f1" strokeWidth="1.5" />
        {/* VWAP line */}
        <path d={vwapPath} fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4,2" />
        {/* Signal markers */}
        {signals.map((sig, i) => {
          const idx = candles.findIndex(c => c.t === sig.timestamp);
          if (idx < 0) return null;
          const x = scaleX(idx);
          const y = scaleY(prices[idx]);
          const isBuy = sig.signal.includes('BUY');
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={4} fill={isBuy ? '#22c55e' : '#ef4444'} opacity={sig.signal.includes('STRONG') ? 1 : 0.5} />
              <text x={x} y={isBuy ? y - 8 : y + 14} textAnchor="middle" fontSize="8" fill={isBuy ? '#22c55e' : '#ef4444'}>
                {isBuy ? '▲' : '▼'}
              </text>
            </g>
          );
        })}
        {/* Legend */}
        <g transform="translate(8, 8)">
          <line x1="0" y1="6" x2="16" y2="6" stroke="#6366f1" strokeWidth="1.5" />
          <text x="20" y="10" fontSize="9" fill="#94a3b8">Price</text>
          <line x1="50" y1="6" x2="66" y2="6" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4,2" />
          <text x="70" y="10" fontSize="9" fill="#94a3b8">VWAP</text>
        </g>
      </svg>
    );
  };

  const renderRsi = () => {
    if (signals.length === 0) return null;
    const rsiValues = signals.slice().reverse().map(s => s.rsi).filter(Boolean);
    if (rsiValues.length < 2) return null;
    const W = 700, H = 80;
    const scaleY = (v: number) => H - ((v - 0) / 100) * H;
    const scaleX = (i: number) => (i / (rsiValues.length - 1)) * W;
    const path = rsiValues.map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`).join(' ');
    const y30 = scaleY(30), y70 = scaleY(70);

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <line x1="0" y1={y30} x2={W} y2={y30} stroke="#22c55e" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.5" />
        <line x1="0" y1={y70} x2={W} y2={y70} stroke="#ef4444" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.5" />
        <path d={path} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="4" y={y30 - 3} fontSize="8" fill="#22c55e" opacity="0.7">30</text>
        <text x="4" y={y70 - 3} fontSize="8" fill="#ef4444" opacity="0.7">70</text>
      </svg>
    );
  };

  const renderMacd = () => {
    if (signals.length === 0) return null;
    const data = signals.slice().reverse().filter(s => s.histogram != null);
    if (data.length < 2) return null;
    const W = 700, H = 60;
    const histValues = data.map(s => s.histogram);
    const maxH = Math.max(...histValues.map(Math.abs)) * 1.1 || 1;
    const scaleY = (v: number) => (H / 2) - (v / maxH) * (H / 2);
    const scaleX = (i: number) => (i / (data.length - 1)) * W;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <line x1="0" y1={H/2} x2={W} y2={H/2} stroke="#334155" strokeWidth="0.5" />
        {data.map((s, i) => {
          const x = scaleX(i);
          const y = scaleY(s.histogram);
          const barH = Math.abs(y - H/2);
          return (
            <rect
              key={i}
              x={x - 2} y={Math.min(y, H/2)}
              width={4} height={Math.max(barH, 1)}
              fill={s.histogram >= 0 ? '#22c55e' : '#ef4444'}
              opacity="0.7"
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h2 className="text-sm font-bold text-white">{ticker}</h2>
          <span className="text-[10px] text-slate-500 font-mono uppercase">Last 50 candles · 1min</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-2">
        {candles.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-slate-500 text-xs font-mono">
            Waiting for candle data...
          </div>
        ) : (
          <>
            <div className="h-40">{renderChart()}</div>
            <div className="border-t border-slate-800 pt-2">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase w-12">RSI</span>
                <div className="flex-1 h-16">{renderRsi()}</div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase w-12">MACD</span>
                <div className="flex-1 h-12">{renderMacd()}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
