import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULTS = {
  rsi_oversold: 30,
  rsi_overbought: 70,
  macd_fast: 12,
  macd_slow: 26,
  macd_signal: 9,
  position_size_pct: 5,
  max_positions: 5,
  daily_loss_limit_pct: 5,
};

export function StrategyConfig() {
  const [config, setConfig] = useState(DEFAULTS);
  const [saved, setSaved] = useState(true);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'strategy'), (snap) => {
      if (snap.exists()) {
        setConfig(prev => ({ ...prev, ...snap.data() }));
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const w: string[] = [];
    if (config.rsi_oversold > 40) w.push('RSI oversold threshold is aggressive (>40)');
    if (config.rsi_overbought < 60) w.push('RSI overbought threshold is aggressive (<60)');
    if (config.position_size_pct > 15) w.push('Position size >15% is high risk');
    if (config.daily_loss_limit_pct > 10) w.push('Daily loss limit >10% is dangerous');
    if (config.max_positions > 8) w.push('More than 8 positions reduces focus');
    setWarnings(w);
  }, [config]);

  const update = (key: string, val: number) => {
    setConfig(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  };

  const save = async () => {
    await setDoc(doc(db, 'config', 'strategy'), { ...config, updated_at: new Date().toISOString() });
    setSaved(true);
    toast.success('Strategy config saved — applies on next candle');
  };

  const reset = () => {
    setConfig(DEFAULTS);
    setSaved(false);
  };

  const Slider = ({ label, field, min, max, step = 1, unit = '' }: any) => (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-xs text-slate-400 uppercase tracking-wide">{label}</label>
        <span className="text-xs font-mono text-white font-bold">{(config as any)[field]}{unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={(config as any)[field]}
        onChange={e => update(field, parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-500"
      />
      <div className="flex justify-between text-[10px] text-slate-600 font-mono">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wide">Strategy Config</h2>
        <div className="flex space-x-2">
          <button onClick={reset} className="text-[10px] text-slate-500 hover:text-slate-300 uppercase tracking-wide transition-colors">
            Reset
          </button>
          <button
            onClick={save}
            disabled={saved}
            className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
          >
            <Save className="w-3 h-3" />
            <span>{saved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">RSI Settings</p>
          <Slider label="RSI Oversold" field="rsi_oversold" min={20} max={45} />
          <Slider label="RSI Overbought" field="rsi_overbought" min={55} max={80} />
        </div>

        <div className="space-y-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">MACD Settings</p>
          <Slider label="Fast EMA" field="macd_fast" min={8} max={20} />
          <Slider label="Slow EMA" field="macd_slow" min={20} max={35} />
          <Slider label="Signal Line" field="macd_signal" min={5} max={15} />
        </div>

        <div className="space-y-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Risk Settings</p>
          <Slider label="Position Size" field="position_size_pct" min={1} max={20} unit="%" />
          <Slider label="Max Open Positions" field="max_positions" min={1} max={10} />
          <Slider label="Daily Loss Limit" field="daily_loss_limit_pct" min={1} max={15} unit="%" />
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-center space-x-2 text-amber-400 text-xs">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
