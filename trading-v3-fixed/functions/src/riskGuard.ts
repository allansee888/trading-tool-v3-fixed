import { getAlpacaAccount, getAlpacaPositions } from './alpacaClient';

export class RiskGuard {
  // Check 1 — Max position size
  async checkPositionSize(ticker: string, orderValue: number): Promise<boolean> {
    const account = await getAlpacaAccount();
    const maxAllowed = parseFloat(account.portfolio_value) * 0.10;
    return orderValue <= maxAllowed;
  }

  // Check 2 — Daily loss limit
  async checkDailyLossLimit(): Promise<boolean> {
    const account = await getAlpacaAccount();
    const equity = parseFloat(account.equity);
    const lastEquity = parseFloat(account.last_equity);
    if (!lastEquity || lastEquity === 0) return true; // prevent NaN
    const dailyLoss = equity - lastEquity;
    const lossPercent = (dailyLoss / lastEquity) * 100;
    return lossPercent > -5;
  }

  // Check 3 — Max open positions
  async checkMaxPositions(): Promise<boolean> {
    const positions = await getAlpacaPositions();
    return positions.length < 5;
  }

  // Check 4 — No duplicate position
  async checkNoDuplicate(ticker: string): Promise<boolean> {
    const positions = await getAlpacaPositions();
    return !positions.find((p: any) => p.symbol === ticker);
  }

  // Master check
  async validate(ticker: string, orderValue: number, side: 'buy' | 'sell'): Promise<{ approved: boolean, reason: string | null }> {
    if (side === 'buy') {
      if (!await this.checkDailyLossLimit()) {
        return { approved: false, reason: 'Daily loss limit reached — trading halted' };
      }
      if (!await this.checkMaxPositions()) {
        return { approved: false, reason: 'Max open positions reached (5)' };
      }
      if (!await this.checkNoDuplicate(ticker)) {
        return { approved: false, reason: `Already holding position in ${ticker}` };
      }
      if (!await this.checkPositionSize(ticker, orderValue)) {
        return { approved: false, reason: 'Order exceeds 10% max position size' };
      }
    }
    return { approved: true, reason: null };
  }
}
