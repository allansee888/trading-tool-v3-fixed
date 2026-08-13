import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { RiskGuard } from './riskGuard';
import { getAlpacaAccount, getAlpacaPositions, placeAlpacaOrder } from './alpacaClient';

export async function executeSignal(signal: any, db: any) {
  const docId = `${signal.ticker}_${signal.timestamp}`;

  // Only act on strong signals
  if (signal.signal !== 'STRONG_BUY' && signal.signal !== 'STRONG_SELL') {
    return;
  }

  const riskGuard = new RiskGuard();

  const logTrade = async (
    status: 'executed' | 'rejected',
    reason: string | null,
    alpacaOrder: any = null,
    qty: number = 0,
    side: 'buy' | 'sell',
    orderValue: number = 0
  ) => {
    // Write to /trades
    await setDoc(doc(db, 'trades', docId), {
      ticker: signal.ticker,
      timestamp: signal.timestamp,
      signal: signal.signal,
      confidence: signal.confidence,
      side,
      qty,
      order_value: orderValue,
      status,
      rejection_reason: reason,
      alpaca_order_id: alpacaOrder ? alpacaOrder.id : null,
      filled_avg_price: alpacaOrder ? parseFloat(alpacaOrder.filled_avg_price || 0) : null,
      rsi: signal.rsi,
      macd_line: signal.macd_line,
      vwap_bias: signal.vwap_bias
    });

    // Update signal doc
    await updateDoc(doc(db, 'signals', docId), {
      executed: status === 'executed',
      execution_status: status,
      rejection_reason: reason
    });
  };

  try {
    const account = await getAlpacaAccount();

    if (signal.signal === 'STRONG_BUY') {
      const portfolioValue = parseFloat(account.portfolio_value);
      const orderValue = portfolioValue * 0.05;
      const qty = Math.floor(orderValue / signal.close);

      if (qty < 1) {
        await logTrade('rejected', 'Insufficient funds for minimum 1 share', null, 0, 'buy', orderValue);
        return;
      }

      const guard = await riskGuard.validate(signal.ticker, orderValue, 'buy');

      if (!guard.approved) {
        await logTrade('rejected', guard.reason, null, qty, 'buy', orderValue);
        return;
      }

      const order = await placeAlpacaOrder({
        symbol: signal.ticker,
        qty,
        side: 'buy',
        type: 'market',
        time_in_force: 'day'
      });

      await logTrade('executed', null, order, qty, 'buy', orderValue);
    } else if (signal.signal === 'STRONG_SELL') {
      const positions = await getAlpacaPositions();
      const position = positions.find((p: any) => p.symbol === signal.ticker);

      if (!position) {
        await logTrade('rejected', `No open position in ${signal.ticker} to sell`, null, 0, 'sell', 0);
        return;
      }

      const qty = parseFloat(position.qty);
      const orderValue = qty * signal.close;

      const order = await placeAlpacaOrder({
        symbol: signal.ticker,
        qty,
        side: 'sell',
        type: 'market',
        time_in_force: 'day'
      });

      await logTrade('executed', null, order, qty, 'sell', orderValue);
    }
  } catch (err: any) {
    console.error('Execution Error:', err);
    await logTrade('rejected', `API Error: ${err.message}`, null, 0, signal.signal === 'STRONG_BUY' ? 'buy' : 'sell', 0);
  }
}
