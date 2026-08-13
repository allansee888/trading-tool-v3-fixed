import { Express, Request, Response } from 'express';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Client in Backend
let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));
} catch (e) {}

const fbApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);

export function setupAlpacaRoutes(app: Express) {
  const getHeaders = () => {
    const key = process.env.ALPACA_API_KEY;
    const secret = process.env.ALPACA_SECRET_KEY;

    if (!key || !secret) {
      throw new Error('Alpaca API credentials missing.');
    }

    return {
      'APCA-API-KEY-ID': key,
      'APCA-API-SECRET-KEY': secret,
    };
  };

  const getBaseUrl = () => {
    let url = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';
    if (url.endsWith('/v2')) {
      url = url.slice(0, -3);
    }
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    return url;
  };

  app.get('/api/account', async (req: Request, res: Response) => {
    try {
      const headers = getHeaders();
      const url = `${getBaseUrl()}/v2/account`;
      console.log('Fetching:', url);
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Alpaca /account error:', errorText);
        if (response.status === 401) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        return res.status(response.status).json({ error: 'Alpaca API error', details: errorText });
      }

      const account = await response.json();

      // Write snapshot to Firestore
      await setDoc(doc(db, 'account', 'snapshot'), {
        portfolio_value: parseFloat(account.portfolio_value || 0),
        buying_power: parseFloat(account.buying_power || 0),
        cash: parseFloat(account.cash || 0),
        status: account.status,
        last_updated: serverTimestamp()
      }, { merge: true });

      res.json({
        balance: account.cash,
        buying_power: account.buying_power,
        portfolio_value: account.portfolio_value,
        equity: account.equity,
        last_equity: account.last_equity,
        status: account.status,
        currency: account.currency
      });

    } catch (error: any) {
      if (error.message === 'Alpaca API credentials missing.') {
          return res.status(401).json({ error: 'Invalid credentials' });
      }
      console.error('Error fetching account:', error);
      res.status(500).json({ error: 'Network error or Alpaca unavailable', details: error.message, stack: error.stack });
    }
  });

  app.get('/api/positions', async (req: Request, res: Response) => {
    try {
      const headers = getHeaders();
      const response = await fetch(`${getBaseUrl()}/v2/positions`, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Alpaca /positions error:', errorText);
        return res.status(response.status).json({ error: 'Alpaca API error' });
      }

      const positions = await response.json();
      const mappedPositions = positions.map((p: any) => ({
        symbol: p.symbol,
        qty: p.qty,
        market_value: p.market_value,
        unrealized_pl: p.unrealized_pl,
        unrealized_plpc: p.unrealized_plpc,
        avg_entry_price: p.avg_entry_price,
        current_price: p.current_price
      }));

      res.json(mappedPositions);

    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch positions' });
    }
  });

  app.get('/api/orders', async (req: Request, res: Response) => {
    try {
      const headers = getHeaders();
      const response = await fetch(`${getBaseUrl()}/v2/orders?status=all&limit=20`, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Alpaca /orders error:', errorText);
        return res.status(response.status).json({ error: 'Alpaca API error' });
      }

      const orders = await response.json();
      const mappedOrders = orders.map((o: any) => ({
        status: o.status,
        symbol: o.symbol,
        qty: o.qty,
        filled_avg_price: o.filled_avg_price
      }));

      res.json(mappedOrders);

    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  app.get('/api/clock', async (req: Request, res: Response) => {
    try {
      const headers = getHeaders();
      const response = await fetch(`${getBaseUrl()}/v2/clock`, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Alpaca /clock error:', errorText);
        return res.status(response.status).json({ error: 'Alpaca API error' });
      }
      const clock = await response.json();
      res.json(clock);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch clock' });
    }
  });
}

// Appended routes for v2

export function setupAlpacaRoutesV2(app: Express) {
  const getHeaders = () => {
    const key = process.env.ALPACA_API_KEY;
    const secret = process.env.ALPACA_SECRET_KEY;
    if (!key || !secret) throw new Error('Alpaca API credentials missing.');
    return { 'APCA-API-KEY-ID': key, 'APCA-API-SECRET-KEY': secret };
  };

  const getBaseUrl = () => {
    let url = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';
    if (url.endsWith('/v2')) url = url.slice(0, -3);
    if (url.endsWith('/')) url = url.slice(0, -1);
    return url;
  };

  // Daily open prices for ticker strip accurate % change
  app.get('/api/daily-open', async (req: Request, res: Response) => {
    try {
      const symbols = (req.query.symbols as string || '').split(',').filter(Boolean);
      if (symbols.length === 0) return res.json({});

      const dataUrl = process.env.ALPACA_DATA_URL || 'https://data.alpaca.markets';
      const result: Record<string, number> = {};

      await Promise.all(symbols.map(async (symbol) => {
        try {
          const today = new Date().toISOString().split('T')[0];
          const url = `${dataUrl}/v2/stocks/${symbol}/bars?timeframe=1Day&start=${today}&limit=1`;
          const r = await fetch(url, { headers: getHeaders() });
          if (r.ok) {
            const data = await r.json();
            if (data.bars?.[0]) result[symbol] = data.bars[0].o;
          }
        } catch (e) {}
      }));

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch daily open' });
    }
  });

  // Validate ticker against Alpaca asset list
  app.get('/api/validate-ticker', async (req: Request, res: Response) => {
    try {
      const symbol = (req.query.symbol as string || '').toUpperCase();
      if (!symbol) return res.json({ valid: false });

      const r = await fetch(`${getBaseUrl()}/v2/assets/${symbol}`, { headers: getHeaders() });
      if (!r.ok) return res.json({ valid: false });

      const asset = await r.json();
      res.json({ valid: asset.tradable === true, name: asset.name });
    } catch (err: any) {
      res.json({ valid: false });
    }
  });

  // Portfolio history for win rate
  app.get('/api/portfolio-history', async (req: Request, res: Response) => {
    try {
      const r = await fetch(`${getBaseUrl()}/v2/account/portfolio/history?period=1M&timeframe=1D`, { headers: getHeaders() });
      if (!r.ok) return res.json([]);
      const data = await r.json();
      res.json(data);
    } catch (err: any) {
      res.json([]);
    }
  });
}
