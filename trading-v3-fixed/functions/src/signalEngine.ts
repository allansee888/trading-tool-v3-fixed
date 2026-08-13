import { doc, setDoc } from 'firebase/firestore';
import { executeSignal } from './executor';

export async function processSignal(ticker: string, timestamp: string, candles: any[], db: any, config: any = {}) {
  if (!candles || candles.length === 0) return;

  const rsiOversold = config.rsi_oversold ?? 30;
  const rsiOverbought = config.rsi_overbought ?? 70;
  const macdFast = config.macd_fast ?? 12;
  const macdSlow = config.macd_slow ?? 26;
  const macdSignalPeriod = config.macd_signal ?? 9;
  const minCandlesRsi = 15;
  const minCandlesMacd = macdSlow + macdSignalPeriod;

  const current = candles[candles.length - 1];
  const vwap_bias = current.close > current.vwap ? 'bullish' : 'bearish';

  // RSI
  let rsi: number | null = null;
  let rsi_signal = 'neutral';
  let prev_rsi_val = 0;

  if (candles.length >= minCandlesRsi) {
    let avg_gain = 0, avg_loss = 0;
    for (let i = 1; i <= 14; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change > 0) avg_gain += change;
      else avg_loss += Math.abs(change);
    }
    avg_gain /= 14;
    avg_loss /= 14;

    let current_rsi = 100 - (100 / (1 + (avg_gain / (avg_loss || 0.0001))));
    prev_rsi_val = current_rsi;

    for (let i = 15; i < candles.length; i++) {
      prev_rsi_val = current_rsi;
      const change = candles[i].close - candles[i - 1].close;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;
      avg_gain = (avg_gain * 13 + gain) / 14;
      avg_loss = (avg_loss * 13 + loss) / 14;
      current_rsi = 100 - (100 / (1 + (avg_gain / (avg_loss || 0.0001))));
    }

    rsi = current_rsi;
    rsi_signal =
      rsi < rsiOversold && prev_rsi_val >= rsiOversold ? 'buy' :
      rsi > rsiOverbought && prev_rsi_val <= rsiOverbought ? 'sell' :
      'neutral';
  }

  // MACD
  let macd_line: number | null = null;
  let signal_line: number | null = null;
  let histogram: number | null = null;
  let macd_signal = 'neutral';

  if (candles.length >= minCandlesMacd) {
    const calcEma = (data: number[], p: number) => {
      const k = 2 / (p + 1);
      let ema = data[0];
      const res = [ema];
      for (let i = 1; i < data.length; i++) {
        ema = data[i] * k + ema * (1 - k);
        res.push(ema);
      }
      return res;
    };

    const closes = candles.map(c => c.close);
    const ema12 = calcEma(closes, macdFast);
    const ema26 = calcEma(closes, macdSlow);
    const macdLines = closes.map((_, i) => ema12[i] - ema26[i]);
    const signalLines = calcEma(macdLines, macdSignalPeriod);

    macd_line = macdLines[macdLines.length - 1];
    signal_line = signalLines[signalLines.length - 1];
    const prev_macd = macdLines[macdLines.length - 2];
    const prev_signal = signalLines[signalLines.length - 2];
    histogram = macd_line - signal_line;

    macd_signal =
      macd_line > signal_line && prev_macd <= prev_signal ? 'buy' :
      macd_line < signal_line && prev_macd >= prev_signal ? 'sell' :
      'neutral';
  }

  const signals = [vwap_bias, rsi_signal, macd_signal];
  const buy_count = signals.filter(s => s === 'bullish' || s === 'buy').length;
  const sell_count = signals.filter(s => s === 'bearish' || s === 'sell').length;
  const confidence = Math.round((Math.max(buy_count, sell_count) / 3) * 100);

  const final_signal =
    buy_count === 3 ? 'STRONG_BUY' :
    buy_count === 2 ? 'WEAK_BUY' :
    sell_count === 3 ? 'STRONG_SELL' :
    sell_count === 2 ? 'WEAK_SELL' :
    'HOLD';

  const signalData = {
    ticker, timestamp, signal: final_signal, confidence,
    vwap: current.vwap, vwap_bias,
    rsi, rsi_signal, macd_line, signal_line,
    histogram, macd_signal,
    close: current.close, executed: false
  };

  await setDoc(doc(db, 'signals', `${ticker}_${timestamp}`), signalData);
  await executeSignal(signalData, db);
}
