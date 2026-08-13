export interface AccountSnapshot {
  balance: number;
  buying_power: number;
  portfolio_value: number;
  equity: number;
  last_equity: number;
  status: string;
  currency: string;
}

export interface Position {
  symbol: string;
  qty: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  avg_entry_price: string;
  current_price: string;
}

export interface Order {
  status: string;
  symbol: string;
  qty: string;
  filled_avg_price: string | null;
}

export interface MarketClock {
  is_open: boolean;
  next_open: string;
  next_close: string;
}
