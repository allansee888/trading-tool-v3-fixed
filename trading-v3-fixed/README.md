<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/15a181e9-c694-42a0-a9ce-c3143eda0592

## Run Locally

**Prerequisites:** Node.js 18 or later (Vite 6, tsx, and the Alpaca API routes require Node 18+). Node 14 is not supported. On Windows, use the official installer or [nvm-windows](https://github.com/coreybutler/nvm-windows).

You can run from the **repo root** (`npm install` then `npm run dev`) or from this folder.

1. Install dependencies:
   `npm install`
2. Copy env template and add your keys:
   `copy .env.example .env.local` (Windows) or `cp .env.example .env.local` (macOS/Linux)
3. Set `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, and `GEMINI_API_KEY` in `.env.local`
4. Run the app:
   `npm run dev`
5. Open http://localhost:3000

If you see `'tsx' is not recognized`, run `npm install` first. If port 3000 is busy, stop the other dev server or set `PORT=3001`.
