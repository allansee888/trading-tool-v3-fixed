import WebSocket from 'ws';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, query, orderBy, getDocs, deleteDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { processSignal } from './signalEngine';

let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));
} catch (e) {}

// Reuse existing Firebase app if already initialized (avoids duplicate app error)
const fbApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);

export const DEFAULT_WATCHLIST = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'SPY'];

async function getWatchlist(): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, 'config', 'watchlist'));
    if (snap.exists() && snap.data().tickers?.length > 0) {
      return snap.data().tickers;
    }
  } catch (e) {}
  return DEFAULT_WATCHLIST;
}

export function startAlpacaStream() {
  const key = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_SECRET_KEY;

  if (!key || !secret) {
    console.error('Alpaca credentials missing. Cannot start WebSocket.');
    return;
  }

  let ws: WebSocket;
  let reconnectTimeout: NodeJS.Timeout;
  let retryCount = 0;
  let currentWatchlist: string[] = DEFAULT_WATCHLIST;

  const connect = async () => {
    currentWatchlist = await getWatchlist();
    ws = new WebSocket('wss://stream.data.alpaca.markets/v2/iex');

    ws.on('open', () => {
      console.log('Alpaca WebSocket connected. Authenticating...');
      ws.send(JSON.stringify({ action: 'auth', key, secret }));
    });

    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const messages = JSON.parse(data.toString());
        for (const msg of messages) {
          if (msg.T === 'success' && msg.msg === 'authenticated') {
            console.log('Authenticated. Subscribing to:', currentWatchlist);
            retryCount = 0;
            ws.send(JSON.stringify({ action: 'subscribe', bars: currentWatchlist }));
          } else if (msg.T === 'subscription') {
            console.log('Subscriptions active:', msg);
            await setDoc(doc(db, 'account', 'stream_status'), {
              tickers: currentWatchlist,
              status: 'streaming',
              last_updated: new Date().toISOString()
            }, { merge: true });
          } else if (msg.T === 'b') {
            await saveCandle(msg.S, msg);
          } else if (msg.T === 'error') {
            console.error('Alpaca WS error:', msg);
          }
        }
      } catch (err) {
        console.error('Error processing WS message:', err);
      }
    });

    ws.on('close', () => {
      console.log('Alpaca WebSocket disconnected.');
      setDoc(doc(db, 'account', 'stream_status'), {
        status: 'disconnected',
        last_updated: new Date().toISOString()
      }, { merge: true }).catch(console.error);
      scheduleReconnect();
    });

    ws.on('error', (err) => {
      console.error('Alpaca WebSocket error:', err);
      ws.close();
    });
  };

  const scheduleReconnect = () => {
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
    console.log(`Reconnecting in ${delay}ms...`);
    retryCount++;
    clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(connect, delay);
  };

  const saveCandle = async (ticker: string, bar: any) => {
    try {
      const timestamp = bar.t;
      const candleData = {
        open: bar.o, high: bar.h, low: bar.l,
        close: bar.c, volume: bar.v, vwap: bar.vw,
        timestamp, t: timestamp
      };

      await setDoc(doc(db, 'candles', ticker, 'bars', timestamp), candleData);

      const q = query(collection(db, 'candles', ticker, 'bars'), orderBy('t', 'desc'));
      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(d => d.data()).reverse();

      const configSnap = await getDoc(doc(db, 'config', 'strategy'));
      const strategyConfig = configSnap.exists() ? configSnap.data() : {};

      await processSignal(ticker, timestamp, history, db, strategyConfig);

      if (snapshot.size > 50) {
        const toDelete = snapshot.docs.slice(50);
        for (const d of toDelete) await deleteDoc(d.ref);
      }
    } catch (err) {
      console.error(`Error saving candle for ${ticker}:`, err);
    }
  };

  connect();
}
