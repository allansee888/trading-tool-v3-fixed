# Trading Tool v3

The app lives in **`trading-v3-fixed/`**. You can run it from the repo root or from that folder.

## Quick start (Windows)

**Requires Node.js 18 or later** (Node 14 will not work with Vite 6 / tsx).

```powershell
# From repo root (recommended after git clone):
npm install
npm run dev

# Or from the app folder:
cd trading-v3-fixed
npm install
npm run dev
```

Then open http://localhost:3000

## Environment

Copy the example env file and add your keys:

```powershell
cd trading-v3-fixed
copy .env.example .env.local
```

Set at least `ALPACA_API_KEY` and `ALPACA_SECRET_KEY` for market data. Without them the server still starts, but the Alpaca WebSocket stream is disabled.
